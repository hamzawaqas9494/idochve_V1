#Requires -Version 5.1
<#
.SYNOPSIS
    Prepare the iDocHive marketing site and local product pilot on Windows.

.PARAMETER Install
    Use winget to install missing Node, CommandBox, or PostgreSQL.

.PARAMETER WithOcr
    With -Install, also install Tesseract (eng/ara when available) and portable Poppler.

.PARAMETER WithModels
    With -Install, also install Ollama and pull nomic-embed-text and qwen2.5:3b.

.PARAMETER SkipStart
    Do not start CommandBox.
#>
param(
    [switch]$Install,
    [switch]$WithOcr,
    [switch]$WithModels,
    [switch]$SkipStart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "..\product\ops\lib.ps1")

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$ProductApp = Join-Path $RepoRoot "product\app"
$ProductUi = Join-Path $RepoRoot "product\ui"
$DbDir = Join-Path $RepoRoot "product\db"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message"
}

function Find-Winget {
    $fromPath = Get-Command winget -ErrorAction SilentlyContinue
    if ($fromPath) {
        return $fromPath.Source
    }
    $fallback = Join-Path $env:LOCALAPPDATA "Microsoft\WindowsApps\winget.exe"
    if (Test-Path $fallback) {
        return $fallback
    }
    return ""
}

function Find-Node {
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    foreach ($candidate in @(
            "${env:ProgramFiles}\nodejs\node.exe",
            "${env:ProgramFiles(x86)}\nodejs\node.exe"
        )) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }
    return ""
}

function Test-NodeVersion {
    param([string]$NodeExe)
    if (-not $NodeExe) {
        return $false
    }
    $raw = & $NodeExe --version 2>$null
    if ($raw -match "v(\d+)") {
        return [int]$Matches[1] -ge 20
    }
    return $false
}

function Find-Npm {
    param([string]$NodeExe)
    $cmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    if ($NodeExe) {
        $sibling = Join-Path (Split-Path $NodeExe -Parent) "npm.cmd"
        if (Test-Path $sibling) {
            return $sibling
        }
    }
    return ""
}

function Find-Box {
    $cmd = Get-Command box -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    foreach ($candidate in @(
            "d:\box\box.exe",
            "${env:ProgramFiles}\CommandBox\box.exe",
            "${env:LOCALAPPDATA}\CommandBox\box.exe"
        )) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }
    return ""
}

function Find-Tesseract {
    $cmd = Get-Command tesseract -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    $default = "${env:ProgramFiles}\Tesseract-OCR\tesseract.exe"
    if (Test-Path $default) {
        return $default
    }
    return ""
}

function Find-PdfToPpm {
    $cmd = Get-Command pdftoppm -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    $localRoot = Join-Path $RepoRoot "product\tools\poppler-windows"
    if (Test-Path $localRoot) {
        $local = Get-ChildItem $localRoot -Filter "pdftoppm.exe" -Recurse -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($local) {
            return $local.FullName
        }
    }
    foreach ($candidate in @(
            "${env:ProgramFiles}\poppler\Library\bin\pdftoppm.exe",
            "${env:ProgramFiles}\poppler\bin\pdftoppm.exe",
            "C:\poppler\Library\bin\pdftoppm.exe",
            "C:\poppler\bin\pdftoppm.exe"
        )) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }
    return ""
}

function Install-PopplerPortable {
    $version = "26.02.0-0"
    $url = "https://github.com/oschwartz10612/poppler-windows/releases/download/v$version/Release-$version.zip"
    $expectedSha256 = "993E4A94376ED712FAFC7058D724EA0B943D118BBD2305CD9ED55174EB85CDA5"
    $tools = Join-Path $RepoRoot "product\tools"
    $zip = Join-Path $tools "poppler-windows.zip"
    $destination = Join-Path $tools "poppler-windows"
    New-Item -ItemType Directory -Force -Path $tools | Out-Null
    Write-Host "Downloading portable Poppler $version..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    $actualSha256 = (Get-FileHash $zip -Algorithm SHA256).Hash
    if ($actualSha256 -ne $expectedSha256) {
        Remove-Item $zip -Force
        throw "Poppler download checksum did not match the pinned release."
    }
    if (Test-Path $destination) {
        Remove-Item $destination -Recurse -Force
    }
    Expand-Archive -Path $zip -DestinationPath $destination -Force
    Remove-Item $zip -Force
    $binary = Find-PdfToPpm
    if (-not $binary) {
        throw "Poppler downloaded, but pdftoppm.exe was not found."
    }
    return $binary
}

function Find-Ollama {
    $cmd = Get-Command ollama -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }
    foreach ($candidate in @(
            "${env:LOCALAPPDATA}\Programs\Ollama\ollama.exe",
            "${env:ProgramFiles}\Ollama\ollama.exe"
        )) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }
    return ""
}

function Install-WingetPackage {
    param(
        [string]$Id,
        [string]$Label
    )
    $winget = Find-Winget
    if (-not $winget) {
        throw "winget was not found. Install $Label by hand or add winget to PATH."
    }
    Write-Host "Installing $Label ($Id)..."
    & $winget install --id $Id --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        throw "winget failed to install $Label. Approve the installer or install it by hand."
    }
}

function Ensure-EnvFile {
    param(
        [string]$Example,
        [string]$Destination
    )
    if (Test-Path $Destination) {
        Write-Host "Keeping existing $(Split-Path $Destination -Leaf)"
        return
    }
    Copy-Item $Example $Destination
    Write-Host "Created $(Split-Path $Destination -Leaf) from example"
}

function Set-EnvValueIfEmpty {
    param(
        [string]$Path,
        [string]$Key,
        [string]$Value
    )
    if (-not (Test-Path $Path)) {
        return
    }
    $lines = @(Get-Content $Path)
    $found = $false
    $empty = $false
    $updated = foreach ($line in $lines) {
        if ($line -match "^\s*$([regex]::Escape($Key))\s*=") {
            $found = $true
            $current = ($line -split "=", 2)[1].Trim()
            if (-not $current) {
                $empty = $true
                "$Key=$Value"
            } else {
                $line
            }
        } else {
            $line
        }
    }
    if ($empty) {
        Set-Content -Path $Path -Value $updated -Encoding utf8
        Write-Host "Set $Key in $(Split-Path $Path -Leaf) (was empty)"
    } elseif (-not $found) {
        Add-Content -Path $Path -Value "$Key=$Value"
    }
}

function Invoke-SqlFile {
    param(
        [hashtable]$EnvValues,
        [string]$Database,
        [string]$FilePath,
        [string]$User = ""
    )
    $bin = Find-PostgresBin
    $psql = Join-Path $bin "psql.exe"
    if (-not $User) {
        $User = $EnvValues.IDOCHIVE_DB_USER
    }
    Use-PostgresPassword -EnvValues $EnvValues -User $User
    try {
        $null = & $psql `
            -h $EnvValues.IDOCHIVE_DB_HOST `
            -p $EnvValues.IDOCHIVE_DB_PORT `
            -U $User `
            -d $Database `
            -v ON_ERROR_STOP=1 `
            -q `
            -f $FilePath
        if ($LASTEXITCODE -ne 0) {
            throw "psql failed applying $(Split-Path $FilePath -Leaf)."
        }
    } finally {
        Clear-PostgresPassword
    }
}

function Test-SqlConnect {
    param(
        [hashtable]$EnvValues,
        [string]$Database,
        [string]$User
    )
    try {
        $null = Invoke-IdochiveSql -EnvValues $EnvValues -Database $Database -User $User -Sql "SELECT 1;"
        return $true
    } catch {
        return $false
    }
}

function Get-CreateRoleSql {
    param(
        [string]$UserName,
        [string]$Password
    )
    $safeUser = $UserName.Replace('"', "")
    $safePass = $Password.Replace("'", "''")
    return @"
DO `$`$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$safeUser') THEN
        CREATE ROLE "$safeUser" LOGIN PASSWORD '$safePass';
    END IF;
END
`$`$;
"@
}

function Ensure-Database {
    param([hashtable]$EnvValues)

    $appUser = $EnvValues.IDOCHIVE_DB_USER
    $appDb = $EnvValues.IDOCHIVE_DB_NAME
    if (Test-SqlConnect -EnvValues $EnvValues -Database $appDb -User $appUser) {
        Write-Host "Connected to $appDb as $appUser"
        return
    }

    $adminCandidates = @()
    if ($EnvValues.IDOCHIVE_DB_ADMIN_USER) {
        $adminCandidates += $EnvValues.IDOCHIVE_DB_ADMIN_USER
    }
    $adminCandidates += "postgres"

    $admin = ""
    foreach ($candidate in $adminCandidates) {
        if (Test-SqlConnect -EnvValues $EnvValues -Database "postgres" -User $candidate) {
            $admin = $candidate
            break
        }
    }
    if (-not $admin) {
        throw "Cannot connect as $appUser or a superuser. Set IDOCHIVE_DB_PASSWORD or IDOCHIVE_DB_ADMIN_USER / IDOCHIVE_DB_ADMIN_PASSWORD in product/app/.env. The password is not printed."
    }

    Write-Host "Creating role and database if they are missing (using $admin)"
    Invoke-IdochiveSql -EnvValues $EnvValues -Database "postgres" -User $admin -Sql (Get-CreateRoleSql -UserName $appUser -Password $EnvValues.IDOCHIVE_DB_PASSWORD) | Out-Null
    $exists = Invoke-IdochiveSql -EnvValues $EnvValues -Database "postgres" -User $admin -Sql "SELECT datname FROM pg_database WHERE datname = '$($appDb.Replace("'", "''"))';"
    if (-not "$exists".Trim()) {
        Invoke-IdochiveSql -EnvValues $EnvValues -Database "postgres" -User $admin -Sql "CREATE DATABASE `"$($appDb.Replace('"', ''))`" OWNER `"$($appUser.Replace('"', ''))`";" | Out-Null
    }
    Invoke-IdochiveSql -EnvValues $EnvValues -Database $appDb -User $admin -Sql "GRANT ALL ON SCHEMA public TO `"$($appUser.Replace('"', ''))`"; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO `"$($appUser.Replace('"', ''))`";" | Out-Null

    if (-not (Test-SqlConnect -EnvValues $EnvValues -Database $appDb -User $appUser)) {
        throw "Created the database but $appUser still cannot connect. Check IDOCHIVE_DB_PASSWORD. The password is not printed."
    }
}

function Test-SchemaSentinel {
    param(
        [hashtable]$EnvValues,
        [string]$FileName
    )
    $sql = switch -Wildcard ($FileName) {
        "001_*" { "SELECT extname FROM pg_extension WHERE extname = 'vector';" }
        "002_*" { "SELECT 1 FROM information_schema.tables WHERE table_name = 'users';" }
        "003_*" { "SELECT 1 FROM information_schema.tables WHERE table_name = 'documents';" }
        "004_*" { "SELECT 1 FROM information_schema.tables WHERE table_name = 'ingest_jobs';" }
        "005_*" { "SELECT 1 FROM information_schema.tables WHERE table_name = 'document_locks';" }
        "006_*" { "SELECT 1 FROM information_schema.tables WHERE table_name = 'backup_jobs';" }
        "007_*" { "SELECT 1 FROM information_schema.tables WHERE table_name = 'chunk_embeddings';" }
        "008_*" { "SELECT 1 FROM pg_indexes WHERE indexname = 'chunk_embeddings_cosine_idx';" }
        "009_*" { "SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_requests';" }
        "010_*" { "SELECT 1 FROM information_schema.tables WHERE table_name = 'prompt_policies';" }
        "011_*" { "SELECT 1 FROM users WHERE email = 'records.other@nia.example';" }
        "012_*" { "SELECT 1 FROM information_schema.tables WHERE table_name = 'job_controls';" }
        "014_*" { "SELECT 1 FROM information_schema.tables WHERE table_name = 'upload_sessions';" }
        default { "SELECT 1;" }
    }
    $row = Invoke-IdochiveSql -EnvValues $EnvValues -Database $EnvValues.IDOCHIVE_DB_NAME -Sql $sql
    return [bool]"$row".Trim()
}

function Ensure-Schema {
    param([hashtable]$EnvValues)
    $files = Get-ChildItem $DbDir -Filter "*.sql" | Sort-Object Name
    foreach ($file in $files) {
        Write-Host "Applying $($file.Name)"
        try {
            Invoke-SqlFile -EnvValues $EnvValues -Database $EnvValues.IDOCHIVE_DB_NAME -FilePath $file.FullName
        } catch {
            if ($file.Name -like "001_*") {
                throw "PostgreSQL is reachable but pgvector is not available. Install the vector extension on this server, then re-run. winget cannot install pgvector."
            }
            if (Test-SchemaSentinel -EnvValues $EnvValues -FileName $file.Name) {
                Write-Host "  $($file.Name) already applied (index or comment may be owned by another role). Continuing."
                continue
            }
            throw
        }
    }
    $vector = Invoke-IdochiveSql -EnvValues $EnvValues -Database $EnvValues.IDOCHIVE_DB_NAME -Sql "SELECT extname FROM pg_extension WHERE extname = 'vector';"
    if (-not "$vector".Trim()) {
        throw "The vector extension is not installed. Install pgvector, then re-run. winget cannot install pgvector."
    }
}

function Invoke-Npm {
    param(
        [string]$Npm,
        [string]$WorkingDirectory,
        [string[]]$NpmArgs
    )
    Push-Location $WorkingDirectory
    try {
        & $Npm @NpmArgs
        if ($LASTEXITCODE -ne 0) {
            throw "npm $($NpmArgs -join ' ') failed in $WorkingDirectory"
        }
    } finally {
        Pop-Location
    }
}

# --- tools ---
Write-Step "Checking developer tools"

$node = Find-Node
if (-not (Test-NodeVersion $node)) {
    if ($Install) {
        Install-WingetPackage -Id "OpenJS.NodeJS.LTS" -Label "Node.js LTS"
        $node = Find-Node
        if (-not (Test-NodeVersion $node)) {
            throw "Node.js 20+ is still missing after install. Open a new terminal and re-run."
        }
    } else {
        throw "Node.js 20+ is required. Re-run with -Install or install Node LTS."
    }
}
Write-Host "Node: $(& $node --version)"

$npm = Find-Npm -NodeExe $node
if (-not $npm) {
    throw "npm was not found next to Node.js."
}

$box = Find-Box
if (-not $box) {
    if ($Install) {
        Install-WingetPackage -Id "OrtusSolutions.CommandBox" -Label "CommandBox"
        $box = Find-Box
        if (-not $box) {
            throw "CommandBox is still missing after install. Open a new terminal and re-run, or place box.exe on PATH."
        }
    } else {
        throw "CommandBox is required. Re-run with -Install or install CommandBox (box on PATH, or d:\box\box.exe)."
    }
}
Write-Host "CommandBox: $box"

try {
    $null = Find-PostgresBin
} catch {
    if ($Install) {
        Install-WingetPackage -Id "PostgreSQL.PostgreSQL.17" -Label "PostgreSQL"
        $null = Find-PostgresBin
    } else {
        throw "PostgreSQL client tools were not found. Re-run with -Install or install PostgreSQL 16+ with pgvector."
    }
}
Write-Host "psql: $(Join-Path (Find-PostgresBin) 'psql.exe')"

if ($Install -and $WithOcr) {
    if (-not (Find-Tesseract)) {
        Install-WingetPackage -Id "UB-Mannheim.TesseractOCR" -Label "Tesseract"
    }
    if (-not (Find-PdfToPpm)) {
        $null = Install-PopplerPortable
    }
}
$tesseract = Find-Tesseract
if ($tesseract) {
    Write-Host "Tesseract: $tesseract"
} else {
    Write-Host "Tesseract: not installed (OCR jobs will wait). Use -Install -WithOcr"
}
$pdftoppm = Find-PdfToPpm
if ($pdftoppm) {
    Write-Host "PDF rasterizer: $pdftoppm"
} else {
    Write-Host "PDF rasterizer: not installed (image OCR works; PDF OCR requires Poppler). Use -Install -WithOcr"
}

if ($Install -and $WithModels) {
    if (-not (Find-Ollama)) {
        Install-WingetPackage -Id "Ollama.Ollama" -Label "Ollama"
    }
    $ollama = Find-Ollama
    if ($ollama) {
        Write-Host "Pulling local models (no public AI API)..."
        & $ollama pull nomic-embed-text
        & $ollama pull qwen2.5:3b
    }
}
$ollama = Find-Ollama
if ($ollama) {
    Write-Host "Ollama: $ollama"
} else {
    Write-Host "Ollama: not installed (embed/generate stay unavailable). Use -Install -WithModels"
}

# --- env ---
Write-Step "Preparing environment files"
Ensure-EnvFile -Example (Join-Path $RepoRoot ".env.example") -Destination (Join-Path $RepoRoot ".env")
Ensure-EnvFile -Example (Join-Path $ProductApp ".env.example") -Destination (Join-Path $ProductApp ".env")
Set-EnvValueIfEmpty -Path (Join-Path $ProductApp ".env") -Key "IDOCHIVE_DB_PASSWORD" -Value "idochive_dev_only"
Set-EnvValueIfEmpty -Path (Join-Path $ProductApp ".env") -Key "IDOCHIVE_TESSDATA" -Value ""
Set-EnvValueIfEmpty -Path (Join-Path $ProductApp ".env") -Key "IDOCHIVE_PDFTOPPM" -Value ""
Set-EnvValueIfEmpty -Path (Join-Path $ProductApp ".env") -Key "IDOCHIVE_BLOB_KEY" -Value ""
Set-EnvValueIfEmpty -Path (Join-Path $ProductApp ".env") -Key "IDOCHIVE_REDIS_HOST" -Value "127.0.0.1"
Set-EnvValueIfEmpty -Path (Join-Path $ProductApp ".env") -Key "IDOCHIVE_REDIS_PORT" -Value "6379"
Set-EnvValueIfEmpty -Path (Join-Path $ProductApp ".env") -Key "IDOCHIVE_REDIS_PASSWORD" -Value ""
Set-EnvValueIfEmpty -Path (Join-Path $ProductApp ".env") -Key "IDOCHIVE_CORS_ORIGINS" -Value "http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:5173,http://localhost:5173"
if ($tesseract) {
    Set-EnvValueIfEmpty -Path (Join-Path $ProductApp ".env") -Key "IDOCHIVE_TESSERACT" -Value $tesseract
}
if ($pdftoppm) {
    Set-EnvValueIfEmpty -Path (Join-Path $ProductApp ".env") -Key "IDOCHIVE_PDFTOPPM" -Value $pdftoppm
}

$envValues = Read-IdochiveEnv

# --- database ---
Write-Step "Preparing PostgreSQL"
Ensure-Database -EnvValues $envValues
Ensure-Schema -EnvValues $envValues

# --- npm ---
Write-Step "Installing and building UIs"
Invoke-Npm -Npm $npm -WorkingDirectory $RepoRoot -NpmArgs @("install")
Invoke-Npm -Npm $npm -WorkingDirectory $ProductUi -NpmArgs @("install")
Invoke-Npm -Npm $npm -WorkingDirectory $ProductUi -NpmArgs @("run", "build")

# --- server ---
if (-not $SkipStart) {
    Write-Step "Starting CommandBox"
    Push-Location $RepoRoot
    try {
        & $box server start
    } catch {
        Write-Host "CommandBox start reported: $($_.Exception.Message)"
    } finally {
        Pop-Location
    }
    Start-Sleep -Seconds 3
    try {
        $health = Invoke-WebRequest -Uri "http://127.0.0.1:8080/api/health.cfm" -UseBasicParsing -TimeoutSec 20
        Write-Host "Health HTTP $($health.StatusCode)"
    } catch {
        Write-Host "Health is not reachable yet. Open http://127.0.0.1:8080/api/health.cfm after CommandBox finishes starting."
    }
}

Write-Host ""
Write-Host "Product:  http://127.0.0.1:8080/"
Write-Host "Health:   http://127.0.0.1:8080/api/health.cfm"
Write-Host "Pilot:    records.officer@nia.example"
Write-Host "Website:  npm run dev   (from the repository root)"
Write-Host "No public AI API is required."
