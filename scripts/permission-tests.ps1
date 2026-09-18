#Requires -Version 5.1
<#
.SYNOPSIS
    Prove another department cannot read, search, ask, or export records.officer documents.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Base = "http://127.0.0.1:8080"
$Temp = $env:TEMP
$loginA = Join-Path $Temp "idochive-perm-a.json"
$loginB = Join-Path $Temp "idochive-perm-b.json"
$cookieA = Join-Path $Temp "idochive-perm-a.txt"
$cookieB = Join-Path $Temp "idochive-perm-b.txt"
Set-Content -Path $loginA -Value '{"email":"records.officer@nia.example","password":"ChangeMePilot!"}' -NoNewline
Set-Content -Path $loginB -Value '{"email":"records.other@nia.example","password":"ChangeMePilot!"}' -NoNewline

function Invoke-Json {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Cookie = "",
        [string]$BodyFile = "",
        [int[]]$Expect = @(200)
    )
    $out = Join-Path $Temp ("idochive-perm-" + [guid]::NewGuid().ToString() + ".json")
    $args = @("-sS", "-o", $out, "-w", "%{http_code}", "-X", $Method, $Url)
    if ($Cookie) {
        $args = @("-b", $Cookie, "-c", $Cookie) + $args
    }
    if ($BodyFile) {
        $args = @("-H", "Content-Type: application/json", "--data-binary", "@$BodyFile") + $args
    }
    $code = & curl.exe @args
    $text = ""
    if (Test-Path $out) {
        $text = Get-Content $out -Raw -ErrorAction SilentlyContinue
        Remove-Item $out -ErrorAction SilentlyContinue
    }
    if ($Expect -notcontains [int]$code) {
        throw "Expected HTTP $($Expect -join ',') from $Method $Url, got $code"
    }
    return @{ Code = [int]$code; Text = "$text" }
}

function Read-JobStream {
    param(
        [string]$Cookie = "",
        [int]$Seconds = 4
    )
    $out = Join-Path $Temp ("idochive-perm-sse-" + [guid]::NewGuid().ToString() + ".txt")
    $hdr = Join-Path $Temp ("idochive-perm-sse-" + [guid]::NewGuid().ToString() + ".hdr")
    $args = @("-s", "-N", "--max-time", "$Seconds", "-D", $hdr, "-o", $out, "-w", "%{http_code}", "$Base/api/jobs/stream.cfm?filter=all")
    if ($Cookie) {
        $args = @("-b", $Cookie, "-c", $Cookie) + $args
    }
    $code = & curl.exe @args
    $text = ""
    $headers = ""
    if (Test-Path $out) {
        $text = Get-Content $out -Raw -ErrorAction SilentlyContinue
        Remove-Item $out -ErrorAction SilentlyContinue
    }
    if (Test-Path $hdr) {
        $headers = Get-Content $hdr -Raw -ErrorAction SilentlyContinue
        Remove-Item $hdr -ErrorAction SilentlyContinue
    }
    return @{ Code = [int]$code; Text = "$text"; Headers = "$headers" }
}

Write-Host "Unauthenticated export..."
$unauth = Invoke-Json -Method GET -Url "$Base/api/export.cfm?documentId=11111111-1111-1111-1111-111111111111" -Expect @(401)
if ($unauth.Text -notmatch "Authentication required") {
    throw "Unauthenticated export did not return the API auth message."
}

Write-Host "Unauthenticated jobs..."
$unauthJobs = Invoke-Json -Method GET -Url "$Base/api/jobs.cfm" -Expect @(401)
if ($unauthJobs.Text -notmatch "Authentication required") {
    throw "Unauthenticated jobs did not return the API auth message."
}
Write-Host "Unauthenticated job stream..."
$unauthStream = Invoke-Json -Method GET -Url "$Base/api/jobs/stream.cfm?filter=all" -Expect @(401)
if ($unauthStream.Text -notmatch "Authentication required") {
    throw "Unauthenticated job stream did not return the API auth message."
}
Write-Host "Unauthenticated uploads..."
$unauthUp = Join-Path $Temp "idochive-perm-unauth-upload.json"
Set-Content -Path $unauthUp -Value '{"filename":"x.png","mimeType":"image/png","byteSize":70,"chunkSize":32}' -NoNewline
$unauthU = Invoke-Json -Method POST -Url "$Base/api/uploads.cfm" -BodyFile $unauthUp -Expect @(401)
if ($unauthU.Text -notmatch "Authentication required") {
    throw "Unauthenticated upload start did not return the API auth message."
}

if (Test-Path $cookieA) { Remove-Item $cookieA }
if (Test-Path $cookieB) { Remove-Item $cookieB }

Write-Host "Login officer A..."
Invoke-Json -Method POST -Url "$Base/api/session.cfm" -Cookie $cookieA -BodyFile $loginA | Out-Null
Write-Host "Login officer B..."
Invoke-Json -Method POST -Url "$Base/api/session.cfm" -Cookie $cookieB -BodyFile $loginB | Out-Null

$listA = Invoke-Json -Method GET -Url "$Base/api/documents.cfm" -Cookie $cookieA
if ($listA.Text -notmatch '"id"') {
    throw "Officer A has no documents to export. Ingest one document as records.officer@nia.example and re-run."
}
$docId = [regex]::Match($listA.Text, '"id"\s*:\s*"([0-9a-fA-F-]{36})"').Groups[1].Value
$title = [regex]::Match($listA.Text, '"title"\s*:\s*"([^"]+)"').Groups[1].Value
if (-not $docId) {
    throw "Could not read a document id from officer A's list."
}
Write-Host "Officer A document $docId"

Write-Host "Officer B must not see officer A's upload session..."
$startBody = Join-Path $Temp "idochive-perm-upload-start.json"
Set-Content -Path $startBody -Value '{"filename":"perm-resume.png","mimeType":"image/png","byteSize":70,"chunkSize":32,"classCode":"project_report","languageCode":"en"}' -NoNewline
$started = Invoke-Json -Method POST -Url "$Base/api/uploads.cfm" -Cookie $cookieA -BodyFile $startBody -Expect @(201)
$sessionId = [regex]::Match($started.Text, '"id"\s*:\s*"([0-9a-fA-F-]{36})"').Groups[1].Value
if (-not $sessionId) {
    throw "Could not read upload session id."
}
$bUpload = Invoke-Json -Method GET -Url "$Base/api/uploads.cfm?uploadId=$sessionId" -Cookie $cookieB -Expect @(404)
if ($bUpload.Text -notmatch "Upload was not found") {
    throw "Officer B upload status did not use the permission-safe 404 copy."
}

$exportOut = Join-Path $Temp "idochive-perm-export.bin"
$code = & curl.exe -sS -o $exportOut -w "%{http_code}" -b $cookieA -c $cookieA "$Base/api/export.cfm?documentId=$docId"
if ([int]$code -ne 200) {
    throw "Officer A export expected 200, got $code"
}
if (-not (Test-Path $exportOut) -or ((Get-Item $exportOut).Length -lt 1)) {
    throw "Officer A export did not write a file."
}
Remove-Item $exportOut -ErrorAction SilentlyContinue

Write-Host "Unauthenticated viewer..."
$unauthView = Invoke-Json -Method GET -Url "$Base/api/viewer.cfm?documentId=$docId" -Expect @(401)
if ($unauthView.Text -notmatch "Authentication required") {
    throw "Unauthenticated viewer did not return the API auth message."
}
$viewA = Invoke-Json -Method GET -Url "$Base/api/viewer.cfm?documentId=$docId" -Cookie $cookieA
if ($viewA.Text -notmatch [regex]::Escape($docId)) {
    throw "Officer A viewer did not return the document id."
}
$viewPage = Join-Path $Temp "idochive-perm-view.bin"
$viewCode = & curl.exe -sS -o $viewPage -w "%{http_code}" -b $cookieA -c $cookieA "$Base/api/viewer/page.cfm?documentId=$docId&page=1"
if ([int]$viewCode -ne 200) {
    throw "Officer A preview expected 200, got $viewCode"
}
Remove-Item $viewPage -ErrorAction SilentlyContinue
$viewB = Invoke-Json -Method GET -Url "$Base/api/viewer.cfm?documentId=$docId" -Cookie $cookieB -Expect @(404)
if ($viewB.Text -notmatch "Document was not found") {
    throw "Officer B viewer did not use the permission-safe 404 copy."
}
$pageB = Invoke-Json -Method GET -Url "$Base/api/viewer/page.cfm?documentId=$docId&page=1" -Cookie $cookieB -Expect @(404)
if ($pageB.Text -notmatch "Document was not found") {
    throw "Officer B preview did not use the permission-safe 404 copy."
}

$listB = Invoke-Json -Method GET -Url "$Base/api/documents.cfm" -Cookie $cookieB
if ($title -and $listB.Text.Contains($title)) {
    throw "Officer B list included officer A's title."
}

$q = [uri]::EscapeDataString($title)
$searchB = Invoke-Json -Method GET -Url "$Base/api/search.cfm?q=$q" -Cookie $cookieB
if ($title -and $searchB.Text.Contains($title)) {
    throw "Officer B search included officer A's title."
}
if ($searchB.Text -notmatch "No authorized records match") {
    Write-Host "Officer B search empty-state copy was not required (query may have been empty)."
}

$askFile = Join-Path $Temp "idochive-perm-ask.json"
Set-Content -Path $askFile -Value ("{`"question`":`"What is " + ($title -replace '"','') + "?`"}") -NoNewline
$askB = Invoke-Json -Method POST -Url "$Base/api/ask.cfm" -Cookie $cookieB -BodyFile $askFile
if ($askB.Text.Contains($docId)) {
    throw "Officer B ask cited officer A's document id."
}

$exportB = Invoke-Json -Method GET -Url "$Base/api/export.cfm?documentId=$docId" -Cookie $cookieB -Expect @(404)
if ($exportB.Text -notmatch "Document was not found") {
    throw "Officer B export did not use the permission-safe 404 copy."
}
if ($exportB.Text -match "department") {
    throw "Officer B export mentioned another department."
}

Write-Host "Officer B jobs must not include officer A's title..."
$jobsB = Invoke-Json -Method GET -Url "$Base/api/jobs.cfm?filter=all" -Cookie $cookieB
if ($title -and $jobsB.Text.Contains($title)) {
    throw "Officer B jobs included officer A's title."
}
Write-Host "Officer B job stream must not include officer A's title..."
$streamB = Read-JobStream -Cookie $cookieB
if ($streamB.Text -notmatch "event:\s*jobs") {
    throw "Officer B job stream did not emit a jobs event."
}
if ($title -and $streamB.Text.Contains($title)) {
    throw "Officer B job stream included officer A's title."
}

Write-Host "Unauthenticated audit..."
$unauthAudit = Invoke-Json -Method GET -Url "$Base/api/audit.cfm" -Expect @(401)
if ($unauthAudit.Text -notmatch "Authentication required") {
    throw "Unauthenticated audit did not return the API auth message."
}

Write-Host "Officer B audit must not include officer A's document..."
$auditA = Invoke-Json -Method GET -Url "$Base/api/audit.cfm" -Cookie $cookieA
if ($auditA.Text -notmatch [regex]::Escape($docId)) {
    throw "Officer A audit did not include the exported document id."
}
$auditB = Invoke-Json -Method GET -Url "$Base/api/audit.cfm" -Cookie $cookieB
if ($auditB.Text.Contains($docId)) {
    throw "Officer B audit included officer A's document id."
}

Write-Host "CORS allowlist..."
$deniedHeaders = Join-Path $Temp "idochive-perm-cors-denied.txt"
$allowedHeaders = Join-Path $Temp "idochive-perm-cors-allowed.txt"
& curl.exe -sS -D $deniedHeaders -o NUL -H "Origin: https://evil.example" "$Base/api/health.cfm" | Out-Null
$deniedText = Get-Content $deniedHeaders -Raw -ErrorAction SilentlyContinue
if ("$deniedText" -match "(?i)Access-Control-Allow-Origin:\s*https://evil\.example") {
    throw "CORS echoed an origin that is not on the allowlist."
}
& curl.exe -sS -D $allowedHeaders -o NUL -H "Origin: http://127.0.0.1:8080" "$Base/api/health.cfm" | Out-Null
$allowedText = Get-Content $allowedHeaders -Raw -ErrorAction SilentlyContinue
if ("$allowedText" -notmatch "(?i)Access-Control-Allow-Origin:\s*http://127\.0\.0\.1:8080") {
    throw "CORS did not allow the pilot origin."
}
Remove-Item $deniedHeaders, $allowedHeaders -ErrorAction SilentlyContinue

Write-Host "Permission tests passed."
Write-Host "No public AI API is required."
