# Destructive recovery onto the live database. This unit does not run this script.
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupDir,
    [string]$ConfirmPhrase = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "lib.ps1")

if ($ConfirmPhrase -ne "REPLACE LIVE IDOCHIVE") {
    throw "Refusing live restore. Re-run with -ConfirmPhrase 'REPLACE LIVE IDOCHIVE' after a documented outage decision."
}

$envValues = Read-IdochiveEnv
$dump = Join-Path $BackupDir "postgres.dump"
$blobCopy = Join-Path $BackupDir "blobs"
if (-not (Test-Path $dump)) {
    throw "postgres.dump is missing from $BackupDir"
}

$bin = Find-PostgresBin
$adminUser = Get-AdminUser -EnvValues $envValues
$psql = Join-Path $bin "psql.exe"
$pgRestore = Join-Path $bin "pg_restore.exe"
$liveName = $envValues.IDOCHIVE_DB_NAME
$blobDir = Join-Path (Get-ProductRoot) "app\storage\blobs"

Write-Output "Stopping connections and replacing $liveName from $BackupDir"

Use-PostgresPassword -EnvValues $envValues -User $adminUser
try {
    & $psql -h $envValues.IDOCHIVE_DB_HOST -p $envValues.IDOCHIVE_DB_PORT -U $adminUser -d postgres -v ON_ERROR_STOP=1 -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$liveName' AND pid <> pg_backend_pid();" | Out-Null
    & $psql -h $envValues.IDOCHIVE_DB_HOST -p $envValues.IDOCHIVE_DB_PORT -U $adminUser -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $liveName;" | Out-Null
    & $psql -h $envValues.IDOCHIVE_DB_HOST -p $envValues.IDOCHIVE_DB_PORT -U $adminUser -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $liveName;" | Out-Null
    & $pgRestore -h $envValues.IDOCHIVE_DB_HOST -p $envValues.IDOCHIVE_DB_PORT -U $adminUser -d $liveName --no-owner --no-acl $dump
    if ($LASTEXITCODE -gt 1) {
        throw "pg_restore failed."
    }
} finally {
    Clear-PostgresPassword
}

if (Test-Path $blobDir) {
    Get-ChildItem $blobDir -File -Filter "*.bin" | Remove-Item -Force
} else {
    New-Item -ItemType Directory -Path $blobDir -Force | Out-Null
}
Copy-Item -Path (Join-Path $blobCopy "*") -Destination $blobDir -Force
Write-Output "live_restore_ok database=$liveName blobs=$blobDir"
