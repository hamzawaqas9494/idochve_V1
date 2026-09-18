# Restores documents and versions from a backup dump into schema restore_verify,
# checks counts and blob files, then drops that schema.
# Never drops or rewrites the live public tables or the live blob directory.
# Optional full-database restore runs only when IDOCHIVE_DB_ADMIN_USER can CREATE DATABASE.
param(
    [string]$BackupDir = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib.ps1")

$envValues = Read-IdochiveEnv
$liveName = $envValues.IDOCHIVE_DB_NAME
$verifyName = "idochive_restore_verify"
$schema = "restore_verify"

$backupsRoot = Join-Path (Get-ProductRoot) "app\storage\backups"
if (-not $BackupDir) {
    $latest = Get-ChildItem $backupsRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName "postgres.dump") } |
        Sort-Object Name -Descending |
        Select-Object -First 1
    if (-not $latest) {
        throw "No backup folder with postgres.dump was found. Run product/ops/backup.ps1 first."
    }
    $BackupDir = $latest.FullName
}

$dump = Join-Path $BackupDir "postgres.dump"
$manifestPath = Join-Path $BackupDir "manifest.json"
$blobCopy = Join-Path $BackupDir "blobs"
if (-not (Test-Path $dump)) {
    throw "postgres.dump is missing from $BackupDir"
}
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$liveBefore = Get-LiveInventory -EnvValues $envValues

$bin = Find-PostgresBin
$pgRestore = Join-Path $bin "pg_restore.exe"
$toc = & $pgRestore -l $dump
if ($LASTEXITCODE -ne 0) {
    throw "pg_restore could not list the dump."
}
$tocText = ($toc | Out-String)
if ($tocText -notmatch "TABLE DATA public documents" -or $tocText -notmatch "TABLE DATA public document_versions") {
    throw "Dump TOC is missing documents or document_versions table data."
}
$dumpHasVector = $tocText -match "EXTENSION vector"

$workDir = Join-Path $backupsRoot ".verify-work"
if (Test-Path $workDir) {
    Remove-Item $workDir -Recurse -Force
}
New-Item -ItemType Directory -Path $workDir | Out-Null

function Get-TableDataSql([string]$TableName) {
    $outFile = Join-Path $workDir "$TableName.sql"
    & $pgRestore -a -t $TableName -f $outFile $dump
    if ($LASTEXITCODE -gt 1) {
        throw "pg_restore -t $TableName failed."
    }
    $sql = Get-Content $outFile -Raw
    return $sql.Replace("COPY public.$TableName", "COPY $schema.$TableName")
}

Invoke-IdochiveSql -EnvValues $envValues -Database $liveName -Sql "DROP SCHEMA IF EXISTS $schema CASCADE; CREATE SCHEMA $schema;" | Out-Null
Invoke-IdochiveSql -EnvValues $envValues -Database $liveName -Sql @"
CREATE TABLE $schema.documents AS TABLE public.documents WITH NO DATA;
CREATE TABLE $schema.document_versions AS TABLE public.document_versions WITH NO DATA;
"@ | Out-Null

$docsSql = Get-TableDataSql "documents"
$versSql = Get-TableDataSql "document_versions"
Set-Content -Path (Join-Path $workDir "load.sql") -Value ($docsSql + "`n" + $versSql) -Encoding utf8

$psql = Join-Path $bin "psql.exe"
Use-PostgresPassword -EnvValues $envValues
try {
    & $psql -h $envValues.IDOCHIVE_DB_HOST -p $envValues.IDOCHIVE_DB_PORT -U $envValues.IDOCHIVE_DB_USER -d $liveName -v ON_ERROR_STOP=1 -f (Join-Path $workDir "load.sql") | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to load restored table data into $schema."
    }
} finally {
    Clear-PostgresPassword
}

$restored = Invoke-IdochiveSql -EnvValues $envValues -Database $liveName -Sql @"
SELECT
    (SELECT count(*) FROM $schema.documents) || '|' ||
    (SELECT count(*) FROM $schema.document_versions);
"@
$restoredParts = ([string]$restored).Trim().Split("|")
$restoredDocs = [int]$restoredParts[0]
$restoredVers = [int]$restoredParts[1]
$restoredKeys = @(Invoke-IdochiveSql -EnvValues $envValues -Database $liveName -Sql "SELECT blob_key FROM $schema.document_versions ORDER BY blob_key;" | ForEach-Object { $_.Trim() } | Where-Object { $_ })

$copiedBlobs = @(Get-ChildItem $blobCopy -File -Filter "*.bin" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name)
$absentAtBackup = @($restoredKeys | Where-Object { $copiedBlobs -notcontains $_ })
$missingCopied = @($copiedBlobs | Where-Object { -not (Test-Path (Join-Path $blobCopy $_)) })

Invoke-IdochiveSql -EnvValues $envValues -Database $liveName -Sql "DROP SCHEMA IF EXISTS $schema CASCADE;" | Out-Null
Remove-Item $workDir -Recurse -Force

$liveAfter = Get-LiveInventory -EnvValues $envValues
if ($liveAfter.DocumentCount -ne $liveBefore.DocumentCount -or $liveAfter.VersionCount -ne $liveBefore.VersionCount) {
    throw "Live inventory changed during restore verify. Aborting without treating this as a pass."
}

$fullDbRestored = $false
$adminUser = $envValues.IDOCHIVE_DB_ADMIN_USER
if ($adminUser) {
    Use-PostgresPassword -EnvValues $envValues -User $adminUser
    try {
        & $psql -h $envValues.IDOCHIVE_DB_HOST -p $envValues.IDOCHIVE_DB_PORT -U $adminUser -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$verifyName' AND pid <> pg_backend_pid();" | Out-Null
        & $psql -h $envValues.IDOCHIVE_DB_HOST -p $envValues.IDOCHIVE_DB_PORT -U $adminUser -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $verifyName;" | Out-Null
        & $psql -h $envValues.IDOCHIVE_DB_HOST -p $envValues.IDOCHIVE_DB_PORT -U $adminUser -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $verifyName;" | Out-Null
        & $pgRestore -h $envValues.IDOCHIVE_DB_HOST -p $envValues.IDOCHIVE_DB_PORT -U $adminUser -d $verifyName --no-owner --no-acl $dump
        if ($LASTEXITCODE -le 1) {
            $fullDbRestored = $true
        }
        & $psql -h $envValues.IDOCHIVE_DB_HOST -p $envValues.IDOCHIVE_DB_PORT -U $adminUser -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $verifyName;" | Out-Null
    } finally {
        Clear-PostgresPassword
    }
}

$ok = ($restoredDocs -eq [int]$manifest.documentCount) -and
    ($restoredVers -eq [int]$manifest.versionCount) -and
    ($copiedBlobs.Count -eq [int]$manifest.blobCount) -and
    ($missingCopied.Count -eq 0) -and
    $dumpHasVector

$evidence = [ordered]@{
    verifiedAt            = (Get-Date).ToString("o")
    backupDir             = $BackupDir.Replace("\", "/")
    liveDatabase          = $liveName
    method                = "schema_restore_verify"
    schemaDropped         = $true
    fullDatabaseTried     = [bool]$adminUser
    fullDatabaseRestored  = $fullDbRestored
    liveDocumentCount     = $liveAfter.DocumentCount
    restoredDocumentCount = $restoredDocs
    restoredVersionCount  = $restoredVers
    missingCopiedBlobCount = $missingCopied.Count
    absentAtBackupCount   = $absentAtBackup.Count
    dumpHasPgvector       = $dumpHasVector
    passed                = $ok
}
$evidencePath = Join-Path $backupsRoot "last-restore-verify.json"
$evidence | ConvertTo-Json -Depth 4 | Set-Content -Path $evidencePath -Encoding utf8

$status = if ($ok) { "verified" } else { "failed" }
$jobId = Add-BackupJobRow `
    -EnvValues $envValues `
    -Kind "restore_verify" `
    -Status $status `
    -ArchiveDir $BackupDir `
    -DocumentCount $restoredDocs `
    -VersionCount $restoredVers `
    -BlobCount $copiedBlobs.Count `
    -DetailJson '{"method":"schema_restore_verify"}'
Add-BackupAudit -EnvValues $envValues -EventType "backup.restore_verified" -EntityId $jobId -DetailJson (@{
    passed = $ok
    archiveDir = $BackupDir.Replace("\", "/")
    liveDocumentCount = $liveAfter.DocumentCount
} | ConvertTo-Json -Compress)

if (-not $ok) {
    throw "Restore verify failed. See $evidencePath"
}

Write-Output "restore_verify_ok live_documents=$($liveAfter.DocumentCount) restored_documents=$restoredDocs restored_versions=$restoredVers blobs=$($copiedBlobs.Count) absent_at_backup=$($absentAtBackup.Count)"
