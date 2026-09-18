Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ProductRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Read-IdochiveEnv {
    $values = @{
        IDOCHIVE_DB_HOST = "127.0.0.1"
        IDOCHIVE_DB_PORT = "5432"
        IDOCHIVE_DB_NAME = "idochive"
        IDOCHIVE_DB_USER = "idochive"
        IDOCHIVE_DB_PASSWORD = "idochive_dev_only"
        IDOCHIVE_DB_ADMIN_USER = ""
        IDOCHIVE_DB_ADMIN_PASSWORD = ""
    }
    $envFile = Join-Path (Get-ProductRoot) "app\.env"
    if (Test-Path $envFile) {
        Get-Content $envFile | ForEach-Object {
            $line = $_.Trim()
            if (-not $line -or $line.StartsWith("#") -or $line.StartsWith(";")) {
                return
            }
            $eq = $line.IndexOf("=")
            if ($eq -lt 1) {
                return
            }
            $key = $line.Substring(0, $eq).Trim()
            $val = $line.Substring($eq + 1).Trim()
            if ($values.ContainsKey($key)) {
                $values[$key] = $val
            }
        }
    }
    return $values
}

function Find-PostgresBin {
    $names = @("pg_dump.exe", "pg_restore.exe", "psql.exe", "createdb.exe", "dropdb.exe")
    $fromPath = Get-Command pg_dump -ErrorAction SilentlyContinue
    if ($fromPath) {
        return (Split-Path $fromPath.Source -Parent)
    }
    $roots = @(
        "${env:ProgramFiles}\PostgreSQL",
        "${env:ProgramFiles(x86)}\PostgreSQL"
    )
    foreach ($root in $roots) {
        if (-not (Test-Path $root)) {
            continue
        }
        $hit = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName "bin" } |
            Where-Object { Test-Path (Join-Path $_ "pg_dump.exe") } |
            Select-Object -First 1
        if ($hit) {
            return $hit
        }
    }
    throw "PostgreSQL client tools were not found. Install PostgreSQL or add pg_dump to PATH."
}

function Use-PostgresPassword {
    param(
        [hashtable]$EnvValues,
        [string]$User = ""
    )
    $useAdmin = $User -and $EnvValues.IDOCHIVE_DB_ADMIN_USER -and ($User -eq $EnvValues.IDOCHIVE_DB_ADMIN_USER)
    if ($useAdmin -and $EnvValues.IDOCHIVE_DB_ADMIN_PASSWORD) {
        $env:PGPASSWORD = $EnvValues.IDOCHIVE_DB_ADMIN_PASSWORD
    } else {
        $env:PGPASSWORD = $EnvValues.IDOCHIVE_DB_PASSWORD
    }
}

function Clear-PostgresPassword {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

function Invoke-IdochiveSql {
    param(
        [hashtable]$EnvValues,
        [string]$Database,
        [string]$Sql,
        [string]$User = ""
    )
    $bin = Find-PostgresBin
    $psql = Join-Path $bin "psql.exe"
    if (-not $User) {
        $User = $EnvValues.IDOCHIVE_DB_USER
    }
    Use-PostgresPassword -EnvValues $EnvValues -User $User
    $sqlFile = Join-Path ([System.IO.Path]::GetTempPath()) ("idochive-sql-" + [guid]::NewGuid().ToString() + ".sql")
    Set-Content -Path $sqlFile -Value $Sql -Encoding utf8
    try {
        $output = & $psql `
            -h $EnvValues.IDOCHIVE_DB_HOST `
            -p $EnvValues.IDOCHIVE_DB_PORT `
            -U $User `
            -d $Database `
            -v ON_ERROR_STOP=1 `
            -q `
            -t `
            -A `
            -f $sqlFile
        if ($LASTEXITCODE -ne 0) {
            throw "psql failed for database $Database."
        }
        return ($output | Where-Object { $_ -ne $null })
    } finally {
        Remove-Item $sqlFile -ErrorAction SilentlyContinue
        Clear-PostgresPassword
    }
}

function Get-LiveInventory {
    param([hashtable]$EnvValues)
    $blobDir = Join-Path (Get-ProductRoot) "app\storage\blobs"
    $counts = Invoke-IdochiveSql -EnvValues $EnvValues -Database $EnvValues.IDOCHIVE_DB_NAME -Sql @"
SELECT
    (SELECT count(*) FROM documents) || '|' ||
    (SELECT count(*) FROM document_versions) || '|' ||
    (SELECT count(*) FROM pg_extension WHERE extname = 'vector');
"@
    $parts = ([string]$counts).Trim().Split("|")
    $blobKeys = Invoke-IdochiveSql -EnvValues $EnvValues -Database $EnvValues.IDOCHIVE_DB_NAME -Sql "SELECT blob_key FROM document_versions ORDER BY blob_key;"
    $diskBlobs = @()
    if (Test-Path $blobDir) {
        $diskBlobs = @(Get-ChildItem $blobDir -File -Filter "*.bin" | Select-Object -ExpandProperty Name)
    }
    return [pscustomobject]@{
        DocumentCount = [int]$parts[0]
        VersionCount  = [int]$parts[1]
        Pgvector      = ([int]$parts[2] -gt 0)
        BlobKeys      = @($blobKeys | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        DiskBlobs     = $diskBlobs
        BlobDir       = $blobDir
    }
}

function Add-BackupJobRow {
    param(
        [hashtable]$EnvValues,
        [string]$Kind,
        [string]$Status,
        [string]$ArchiveDir,
        [int]$DocumentCount,
        [int]$VersionCount,
        [int]$BlobCount,
        [string]$DetailJson = "{}"
    )
    $id = Invoke-IdochiveSql -EnvValues $EnvValues -Database $EnvValues.IDOCHIVE_DB_NAME -Sql @"
INSERT INTO backup_jobs (
    kind, status, archive_dir, document_count, version_count, blob_count, detail, finished_at
) VALUES (
    '$Kind',
    '$Status',
    '$($ArchiveDir.Replace('\', '/'))',
    $DocumentCount,
    $VersionCount,
    $BlobCount,
    '$($DetailJson.Replace("'", "''"))'::jsonb,
    now()
) RETURNING id;
"@
    $text = ([string]$id)
    if ($text -match "([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})") {
        return $Matches[1]
    }
    throw "backup_jobs insert did not return an id."
}

function Add-BackupAudit {
    param(
        [hashtable]$EnvValues,
        [string]$EventType,
        [string]$EntityId,
        [string]$DetailJson = "{}"
    )
    $entitySql = "NULL"
    if ($EntityId) {
        $entitySql = "CAST('$EntityId' AS uuid)"
    }
    Invoke-IdochiveSql -EnvValues $EnvValues -Database $EnvValues.IDOCHIVE_DB_NAME -Sql @"
INSERT INTO audit_events (actor_id, event_type, entity_type, entity_id, detail)
VALUES (NULL, '$EventType', 'backup', $entitySql, '$($DetailJson.Replace("'", "''"))'::jsonb);
"@ | Out-Null
}

function Get-AdminUser {
    param([hashtable]$EnvValues)
    if ($EnvValues.IDOCHIVE_DB_ADMIN_USER) {
        return $EnvValues.IDOCHIVE_DB_ADMIN_USER
    }
    return $EnvValues.IDOCHIVE_DB_USER
}
