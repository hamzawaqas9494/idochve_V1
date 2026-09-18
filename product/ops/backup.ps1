# Creates a timestamped PostgreSQL + blob backup. Does not change live data.
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib.ps1")

$envValues = Read-IdochiveEnv
$bin = Find-PostgresBin
$pgDump = Join-Path $bin "pg_dump.exe"
$inventory = Get-LiveInventory -EnvValues $envValues
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveDir = Join-Path (Get-ProductRoot) "app\storage\backups\$stamp"
New-Item -ItemType Directory -Path (Join-Path $archiveDir "blobs") -Force | Out-Null

Use-PostgresPassword -EnvValues $envValues
try {
    & $pgDump `
        -h $envValues.IDOCHIVE_DB_HOST `
        -p $envValues.IDOCHIVE_DB_PORT `
        -U $envValues.IDOCHIVE_DB_USER `
        -d $envValues.IDOCHIVE_DB_NAME `
        -Fc `
        -f (Join-Path $archiveDir "postgres.dump")
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed."
    }
} finally {
    Clear-PostgresPassword
}

if (Test-Path $inventory.BlobDir) {
    Copy-Item -Path (Join-Path $inventory.BlobDir "*.bin") -Destination (Join-Path $archiveDir "blobs") -Force
}

$copied = @(Get-ChildItem (Join-Path $archiveDir "blobs") -File -Filter "*.bin" -ErrorAction SilentlyContinue)
$manifest = [ordered]@{
    createdAt      = (Get-Date).ToString("o")
    database       = $envValues.IDOCHIVE_DB_NAME
    host           = $envValues.IDOCHIVE_DB_HOST
    documentCount  = $inventory.DocumentCount
    versionCount   = $inventory.VersionCount
    blobCount      = $copied.Count
    pgvector       = $inventory.Pgvector
    blobKeys       = @($inventory.BlobKeys)
}
$manifestPath = Join-Path $archiveDir "manifest.json"
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Path $manifestPath -Encoding utf8

$jobId = Add-BackupJobRow `
    -EnvValues $envValues `
    -Kind "backup" `
    -Status "succeeded" `
    -ArchiveDir $archiveDir `
    -DocumentCount $inventory.DocumentCount `
    -VersionCount $inventory.VersionCount `
    -BlobCount $copied.Count `
    -DetailJson '{"pgvector":true}'
Add-BackupAudit -EnvValues $envValues -EventType "backup.created" -EntityId $jobId -DetailJson (@{
    archiveDir = $archiveDir.Replace("\", "/")
    documentCount = $inventory.DocumentCount
    versionCount = $inventory.VersionCount
    blobCount = $copied.Count
} | ConvertTo-Json -Compress)

Write-Output "backup_ok archive=$archiveDir documents=$($inventory.DocumentCount) versions=$($inventory.VersionCount) blobs=$($copied.Count)"
