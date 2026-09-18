#Requires -Version 5.1
<#
.SYNOPSIS
    Prove Ingestion Center upload, job poll, tick, and department isolation.
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Base = "http://127.0.0.1:8080"
$Temp = $env:TEMP
$loginA = Join-Path $Temp "idochive-ingest-a.json"
$loginB = Join-Path $Temp "idochive-ingest-b.json"
$cookieA = Join-Path $Temp "idochive-ingest-a.txt"
$cookieB = Join-Path $Temp "idochive-ingest-b.txt"
$pngPath = Join-Path $Temp "idochive-ingest-unit14.png"
Set-Content -Path $loginA -Value '{"email":"records.officer@nia.example","password":"ChangeMePilot!"}' -NoNewline
Set-Content -Path $loginB -Value '{"email":"records.other@nia.example","password":"ChangeMePilot!"}' -NoNewline
[IO.File]::WriteAllBytes(
    $pngPath,
    [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==")
)

function Invoke-Json {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Cookie = "",
        [string]$BodyFile = "",
        [string[]]$Form = @(),
        [int[]]$Expect = @(200, 201)
    )
    $out = Join-Path $Temp ("idochive-ingest-" + [guid]::NewGuid().ToString() + ".json")
    $args = @("-sS", "-o", $out, "-w", "%{http_code}", "-X", $Method, $Url)
    if ($Cookie) {
        $args = @("-b", $Cookie, "-c", $Cookie) + $args
    }
    if ($BodyFile) {
        $args = @("-H", "Content-Type: application/json", "--data-binary", "@$BodyFile") + $args
    }
    if ($Form.Count) {
        $args = $Form + $args
    }
    $code = & curl.exe @args
    $text = ""
    if (Test-Path $out) {
        $text = Get-Content $out -Raw -ErrorAction SilentlyContinue
        Remove-Item $out -ErrorAction SilentlyContinue
    }
    if ($Expect -notcontains [int]$code) {
        throw "Expected HTTP $($Expect -join ',') from $Method $Url, got $code`n$text"
    }
    return @{ Code = [int]$code; Text = "$text" }
}

function Read-JobStream {
    param(
        [string]$Cookie = "",
        [int]$Seconds = 4
    )
    $out = Join-Path $Temp ("idochive-sse-" + [guid]::NewGuid().ToString() + ".txt")
    $hdr = Join-Path $Temp ("idochive-sse-" + [guid]::NewGuid().ToString() + ".hdr")
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

function Get-ContractVersion {
    param($Object)
    if ($null -eq $Object) { return "" }
    if ($Object.PSObject.Properties.Name -contains "contractVersion") {
        return [string]$Object.contractVersion
    }
    if ($Object.PSObject.Properties.Name -contains "CONTRACTVERSION") {
        return [string]$Object.CONTRACTVERSION
    }
    return ""
}

function Assert-JobContractV1 {
    param([string]$JsonText)
    $data = $JsonText | ConvertFrom-Json
    if ((Get-ContractVersion $data) -ne "1") {
        throw "Jobs envelope missing contractVersion 1."
    }
    if ($null -eq $data.items) {
        throw "Jobs envelope missing items."
    }
    $counts = $data.counts
    foreach ($name in @("active", "review", "ready")) {
        $value = $counts.$name
        if ($null -eq $value) {
            $value = $counts.($name.ToUpper())
        }
        if ($null -eq $value) {
            throw "Jobs envelope missing counts.$name."
        }
    }
    $required = @("id", "documentId", "fileName", "state", "label", "message", "overallProgress", "currentPage", "totalPages")
    foreach ($item in @($data.items)) {
        foreach ($field in $required) {
            $ok = $item.PSObject.Properties.Name | Where-Object { $_ -eq $field -or $_ -eq $field.ToUpper() }
            if (-not $ok) {
                throw "Job item missing required field $field."
            }
        }
    }
}

function New-TestPdf {
    param(
        [string]$Path,
        [int]$PageCount = 3
    )
    $nl = "`n"
    $objects = @()
    $pageIds = 3..(2 + $PageCount)
    $fontId = 3 + $PageCount
    $firstContentId = $fontId + 1
    $kids = ($pageIds | ForEach-Object { "$_ 0 R" }) -join " "
    $objects += "<< /Type /Catalog /Pages 2 0 R >>"
    $objects += "<< /Type /Pages /Kids [$kids] /Count $PageCount >>"
    foreach ($pageIndex in 0..($PageCount - 1)) {
        $contentId = $firstContentId + $pageIndex
        $objects += "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 $fontId 0 R >> >> /Contents $contentId 0 R >>"
    }
    $objects += "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    foreach ($page in 1..$PageCount) {
        $stream = "BT /F1 36 Tf 72 650 Td (iDocHive OCR progress page $page) Tj ET"
        $objects += "<< /Length $($stream.Length) >>$nl" + "stream$nl$stream$nl" + "endstream"
    }

    $builder = New-Object Text.StringBuilder
    [void]$builder.Append("%PDF-1.4$nl")
    $offsets = @(0)
    for ($index = 0; $index -lt $objects.Count; $index++) {
        $offsets += [Text.Encoding]::ASCII.GetByteCount($builder.ToString())
        [void]$builder.Append("$($index + 1) 0 obj$nl$($objects[$index])$nl" + "endobj$nl")
    }
    $xref = [Text.Encoding]::ASCII.GetByteCount($builder.ToString())
    [void]$builder.Append("xref$nl" + "0 $($objects.Count + 1)$nl" + "0000000000 65535 f $nl")
    foreach ($offset in $offsets[1..($offsets.Count - 1)]) {
        [void]$builder.Append(("{0:D10} 00000 n " -f $offset) + $nl)
    }
    [void]$builder.Append("trailer$nl<< /Size $($objects.Count + 1) /Root 1 0 R >>$nl" + "startxref$nl$xref$nl" + "%%EOF$nl")
    [IO.File]::WriteAllText($Path, $builder.ToString(), [Text.Encoding]::ASCII)
}

function Get-OcrTempDirectories {
    $roots = @($Temp)
    foreach ($box in @(
            (Get-Command box -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
            "D:\box\box.exe"
        )) {
        if ($box -and (Test-Path $box)) {
            $roots += Join-Path (Split-Path $box -Parent) "home\server"
        }
    }
    return @(
        $roots |
            Select-Object -Unique |
            Where-Object { Test-Path $_ } |
            ForEach-Object { Get-ChildItem $_ -Directory -Filter "idochive-pdf-*" -Recurse -ErrorAction SilentlyContinue }
    )
}

Write-Host "Unauthenticated jobs..."
$unauth = Invoke-Json -Method GET -Url "$Base/api/jobs.cfm" -Expect @(401)
if ($unauth.Text -notmatch "Authentication required") {
    throw "Unauthenticated jobs did not return the API auth message."
}
Write-Host "Unauthenticated job stream..."
$unauthStream = Invoke-Json -Method GET -Url "$Base/api/jobs/stream.cfm?filter=all" -Expect @(401)
if ($unauthStream.Text -notmatch "Authentication required") {
    throw "Unauthenticated job stream did not return the API auth message."
}
Write-Host "Unauthenticated control..."
$unauthControl = Join-Path $Temp "idochive-ingest-unauth-control.json"
Set-Content -Path $unauthControl -Value '{"documentId":"11111111-1111-1111-1111-111111111111","action":"pause"}' -NoNewline
$unauthC = Invoke-Json -Method POST -Url "$Base/api/jobs/control.cfm" -BodyFile $unauthControl -Expect @(401)
if ($unauthC.Text -notmatch "Authentication required") {
    throw "Unauthenticated control did not return the API auth message."
}
Write-Host "Unauthenticated uploads..."
$unauthUp = Join-Path $Temp "idochive-ingest-unauth-upload.json"
Set-Content -Path $unauthUp -Value '{"filename":"x.png","mimeType":"image/png","byteSize":70,"chunkSize":32}' -NoNewline
$unauthU = Invoke-Json -Method POST -Url "$Base/api/uploads.cfm" -BodyFile $unauthUp -Expect @(401)
if ($unauthU.Text -notmatch "Authentication required") {
    throw "Unauthenticated upload start did not return the API auth message."
}

if (Test-Path $cookieA) { Remove-Item $cookieA }
if (Test-Path $cookieB) { Remove-Item $cookieB }

Write-Host "Login officers..."
Invoke-Json -Method POST -Url "$Base/api/session.cfm" -Cookie $cookieA -BodyFile $loginA | Out-Null
Invoke-Json -Method POST -Url "$Base/api/session.cfm" -Cookie $cookieB -BodyFile $loginB | Out-Null

$title = "unit14-ingest-" + [guid]::NewGuid().ToString().Substring(0, 8) + ".png"
Write-Host "Upload $title without a submit step..."
$upload = Invoke-Json -Method POST -Url "$Base/api/documents.cfm" -Cookie $cookieA -Form @(
    "-F", "file=@$pngPath;filename=$title;type=image/png",
    "-F", "classCode=project_report",
    "-F", "languageCode=en"
)
if ($upload.Text -notmatch '"id"') {
    throw "Upload did not return a document id.`n$($upload.Text)"
}
$uploadData = $upload.Text | ConvertFrom-Json
if ((Get-ContractVersion $uploadData) -ne "1") {
    throw "Upload envelope missing contractVersion 1."
}

Write-Host "Poll jobs..."
$jobsA = Invoke-Json -Method GET -Url "$Base/api/jobs.cfm?filter=all" -Cookie $cookieA
Assert-JobContractV1 $jobsA.Text
if ($jobsA.Text -notmatch [regex]::Escape($title)) {
    throw "Officer A jobs did not include the uploaded file."
}
if ($jobsA.Text -notmatch '"canTick"\s*:\s*true') {
    throw "records_officer should be allowed to Process next."
}
if ($jobsA.Text -notmatch "Queued for OCR|Reading document|Needs validation|Identifying|Extracting|Ready and searchable|Original secured") {
    throw "Job row did not use a mapped Ingestion Center label."
}

Write-Host "Job stream..."
$streamA = Read-JobStream -Cookie $cookieA
if ($streamA.Headers -notmatch "(?i)text/event-stream") {
    throw "Job stream did not use text/event-stream."
}
if ($streamA.Text -notmatch "event:\s*jobs") {
    throw "Job stream did not emit a jobs event."
}
if ($streamA.Text -notmatch '"contractVersion"\s*:\s*"1"') {
    throw "Job stream missing contractVersion 1."
}
if ($streamA.Text -notmatch [regex]::Escape($title)) {
    throw "Officer A job stream did not include the uploaded file."
}
if ($streamA.Text -match "IDG1|storage/blobs") {
    throw "Job stream included blob storage bytes or keys."
}

Write-Host "Resumable upload..."
$resumeTitle = "unit22-resume-" + [guid]::NewGuid().ToString().Substring(0, 8) + ".png"
$pngBytes = [IO.File]::ReadAllBytes($pngPath)
$chunkSize = 32
$startBody = Join-Path $Temp "idochive-ingest-resume-start.json"
Set-Content -Path $startBody -Value ("{`"filename`":`"$resumeTitle`",`"mimeType`":`"image/png`",`"byteSize`":$($pngBytes.Length),`"chunkSize`":$chunkSize,`"classCode`":`"project_report`",`"languageCode`":`"en`"}") -NoNewline
$started = Invoke-Json -Method POST -Url "$Base/api/uploads.cfm" -Cookie $cookieA -BodyFile $startBody -Expect @(201)
$startedData = $started.Text | ConvertFrom-Json
$uploadId = [string]$startedData.id
if (-not $uploadId) {
    throw "Resumable start did not return an upload id.`n$($started.Text)"
}
$earlyFile = Join-Path $Temp "idochive-ingest-resume-early.json"
Set-Content -Path $earlyFile -Value ("{`"uploadId`":`"$uploadId`"}") -NoNewline
$partial = Invoke-Json -Method POST -Url "$Base/api/uploads/complete.cfm" -Cookie $cookieA -BodyFile $earlyFile -Expect @(400)
if ($partial.Text -notmatch "Not every chunk") {
    throw "Incomplete assemble did not fail.`n$($partial.Text)"
}
$offset = 0
$index = 0
while ($offset -lt $pngBytes.Length) {
    $take = [Math]::Min($chunkSize, $pngBytes.Length - $offset)
    $partPath = Join-Path $Temp ("idochive-resume-part-" + $index + ".bin")
    [IO.File]::WriteAllBytes($partPath, $pngBytes[$offset..($offset + $take - 1)])
    $chunkResp = Invoke-Json -Method POST -Url "$Base/api/uploads/chunk.cfm" -Cookie $cookieA -Form @(
        "-F", "uploadId=$uploadId",
        "-F", "index=$index",
        "-F", "chunk=@$partPath;filename=part$index.bin;type=application/octet-stream"
    )
    if ($chunkResp.Text -notmatch '"receivedCount"') {
        throw "Chunk $index did not report receivedCount.`n$($chunkResp.Text)"
    }
    $offset += $take
    $index++
}
$status = Invoke-Json -Method GET -Url "$Base/api/uploads.cfm?uploadId=$uploadId" -Cookie $cookieA
if ($status.Text -notmatch '"receivedCount"\s*:\s*' + $index) {
    throw "Status did not show all chunks received."
}
# Resume path: send chunk 0 again, then complete.
$part0 = Join-Path $Temp "idochive-resume-part-0.bin"
$again = Invoke-Json -Method POST -Url "$Base/api/uploads/chunk.cfm" -Cookie $cookieA -Form @(
    "-F", "uploadId=$uploadId",
    "-F", "index=0",
    "-F", "chunk=@$part0;filename=part0.bin;type=application/octet-stream"
)
if ($again.Code -ne 200) {
    throw "Replaying chunk 0 should succeed for resume."
}
$done = Invoke-Json -Method POST -Url "$Base/api/uploads/complete.cfm" -Cookie $cookieA -BodyFile $earlyFile -Expect @(200)
$doneData = $done.Text | ConvertFrom-Json
if ((Get-ContractVersion $doneData) -ne "1" -or -not $doneData.id) {
    throw "Resumable complete did not return a document id."
}
$jobsResume = Invoke-Json -Method GET -Url "$Base/api/jobs.cfm?filter=all" -Cookie $cookieA
if ($jobsResume.Text -notmatch [regex]::Escape($resumeTitle)) {
    throw "Resumable complete did not appear in jobs."
}

Write-Host "Process next..."
$tick = Invoke-Json -Method POST -Url "$Base/api/jobs/tick.cfm" -Cookie $cookieA
$tickData = $tick.Text | ConvertFrom-Json
if ($tickData.processed -eq $true) {
    throw "Tick must not process OCR on the HTTP request."
}
if ("$($tickData.message)" -notmatch "background worker") {
    throw "Tick did not report that work runs in the background worker."
}
$jobsAfter = Invoke-Json -Method GET -Url "$Base/api/jobs.cfm?filter=all" -Cookie $cookieA
if ($jobsAfter.Text -notmatch [regex]::Escape($title)) {
    throw "Job disappeared after tick."
}
if ($jobsAfter.Text -notmatch '"totalPages"\s*:\s*1') {
    throw "Image OCR did not report totalPages 1. Apply product/db/013_ocr_progress.sql."
}

Write-Host "Authorized viewer..."
$docId = [string]$uploadData.id
$unauthView = Invoke-Json -Method GET -Url "$Base/api/viewer.cfm?documentId=$docId" -Expect @(401)
if ($unauthView.Text -notmatch "Authentication required") {
    throw "Unauthenticated viewer did not return the API auth message."
}
$viewA = Invoke-Json -Method GET -Url "$Base/api/viewer.cfm?documentId=$docId" -Cookie $cookieA
$viewAData = $viewA.Text | ConvertFrom-Json
if ((Get-ContractVersion $viewAData) -ne "1") {
    throw "Viewer envelope missing contractVersion 1."
}
if ([int]$viewAData.totalPages -lt 1) {
    throw "Viewer did not report totalPages."
}
$pageOut = Join-Path $Temp "idochive-viewer-page.bin"
$pageCode = & curl.exe -sS -o $pageOut -w "%{http_code}" -b $cookieA -c $cookieA "$Base/api/viewer/page.cfm?documentId=$docId&page=1"
if ([int]$pageCode -ne 200) {
    throw "Officer A image preview expected 200, got $pageCode"
}
if (-not (Test-Path $pageOut) -or ((Get-Item $pageOut).Length -lt 8)) {
    throw "Officer A image preview wrote no bytes."
}
$viewB = Invoke-Json -Method GET -Url "$Base/api/viewer.cfm?documentId=$docId" -Cookie $cookieB -Expect @(404)
if ($viewB.Text -notmatch "Document was not found") {
    throw "Officer B viewer did not use the permission-safe 404 copy."
}

Write-Host "Health rasterizer..."
$healthOcr = Invoke-Json -Method GET -Url "$Base/api/health.cfm" -Cookie $cookieA
if ($healthOcr.Text -notmatch '"rasterizer"') {
    throw "Health did not report an OCR rasterizer."
}

Write-Host "Live three-page PDF progress..."
$pdfPath = Join-Path $Temp "idochive-ocr-progress.pdf"
New-TestPdf -Path $pdfPath -PageCount 3
$pdfTitle = "ocr-progress-" + [guid]::NewGuid().ToString().Substring(0, 8) + ".pdf"
$pdfUpload = Invoke-Json -Method POST -Url "$Base/api/documents.cfm" -Cookie $cookieA -Form @(
    "-F", "file=@$pdfPath;filename=$pdfTitle;type=application/pdf",
    "-F", "classCode=project_report",
    "-F", "languageCode=en"
)
$pdfId = [regex]::Match($pdfUpload.Text, '"id"\s*:\s*"([0-9a-fA-F-]{36})"').Groups[1].Value
if (-not $pdfId) {
    throw "Could not read PDF document id."
}

# Pause immediately so the test controls when page OCR starts. A running worker
# observes the command between pages and returns the job to queued state.
$pdfPauseFile = Join-Path $Temp "idochive-pdf-pause.json"
Set-Content -Path $pdfPauseFile -Value ("{`"documentId`":`"$pdfId`",`"action`":`"pause`"}") -NoNewline
Invoke-Json -Method POST -Url "$Base/api/jobs/control.cfm" -Cookie $cookieA -BodyFile $pdfPauseFile | Out-Null
$pauseDeadline = (Get-Date).AddSeconds(30)
do {
    $paused = (Invoke-Json -Method GET -Url "$Base/api/jobs.cfm?filter=all" -Cookie $cookieA).Text | ConvertFrom-Json
    $pausedRow = $paused.items | Where-Object { $_.documentId -eq $pdfId } | Select-Object -First 1
    if ($pausedRow -and $pausedRow.state -eq "paused") { break }
    Start-Sleep -Milliseconds 200
} while ((Get-Date) -lt $pauseDeadline)
if (-not $pausedRow -or $pausedRow.state -ne "paused") {
    throw "PDF job did not reach paused state before the live-progress test."
}

$pdfStartFile = Join-Path $Temp "idochive-pdf-start.json"
Set-Content -Path $pdfStartFile -Value ("{`"documentId`":`"$pdfId`",`"action`":`"start`"}") -NoNewline
$startOutput = Join-Path $Temp "idochive-pdf-start-output.json"
$startJob = Start-Job -ScriptBlock {
    param($Base, $Cookie, $Body, $Output)
    & curl.exe -sS -b $Cookie -H "Content-Type: application/json" --data-binary "@$Body" -o $Output -w "%{http_code}" "$Base/api/jobs/control.cfm"
} -ArgumentList $Base, $cookieA, $pdfStartFile, $startOutput

$observedPages = New-Object System.Collections.Generic.List[int]
$sawMeasuredEta = $false
$pdfFinished = $false
$ocrDeadline = (Get-Date).AddSeconds(120)
do {
    $poll = (Invoke-Json -Method GET -Url "$Base/api/jobs.cfm?filter=all" -Cookie $cookieA).Text | ConvertFrom-Json
    $pdfRow = $poll.items | Where-Object { $_.documentId -eq $pdfId } | Select-Object -First 1
    if ($pdfRow -and $pdfRow.state -eq "ocr_processing" -and $pdfRow.totalPages -eq 3) {
        $page = [int]$pdfRow.currentPage
        if ($observedPages.Count -and $page -lt $observedPages[$observedPages.Count - 1]) {
            throw "PDF currentPage moved backward."
        }
        if (-not $observedPages.Count -or $page -ne $observedPages[$observedPages.Count - 1]) {
            $observedPages.Add($page)
        }
        if ($page -gt 0 -and $pdfRow.message -ne "Reading page $page of 3") {
            throw "PDF progress message did not match the measured page."
        }
        if ([int]$pdfRow.overallProgress -lt 40 -or [int]$pdfRow.overallProgress -gt 75) {
            throw "PDF OCR progress escaped the 40-75 percent OCR band."
        }
        if ($page -gt 0 -and $page -lt 3 -and $null -ne $pdfRow.estimatedSeconds) {
            $sawMeasuredEta = $true
        }
    }
    if ($pdfRow -and $pdfRow.state -ne "queued" -and $pdfRow.state -ne "paused" -and $pdfRow.state -ne "ocr_processing") {
        $pdfFinished = $true
        break
    }
    Start-Sleep -Milliseconds 150
} while ((Get-Date) -lt $ocrDeadline)

Wait-Job $startJob -Timeout 10 | Out-Null
$startCode = Receive-Job $startJob
Remove-Job $startJob -Force
if ([int]$startCode -ne 200) {
    $startText = ""
    if (Test-Path $startOutput) {
        $startText = Get-Content $startOutput -Raw
    }
    throw "PDF start/OCR returned HTTP $startCode.`n$startText"
}
if (-not $pdfFinished) {
    throw "PDF OCR did not finish within 120 seconds."
}
if ($observedPages.Count -lt 2) {
    throw "Did not observe at least two distinct live PDF page values. Observed: $($observedPages -join ', ')"
}
if (-not $sawMeasuredEta) {
    throw "PDF OCR never exposed a measured remaining time after a completed page."
}
Write-Host "Observed live PDF pages: $($observedPages -join ', ')"
$pdfFinal = (Invoke-Json -Method GET -Url "$Base/api/jobs.cfm?filter=all" -Cookie $cookieA).Text | ConvertFrom-Json
$pdfFinalRow = $pdfFinal.items | Where-Object { $_.documentId -eq $pdfId } | Select-Object -First 1
if (-not $pdfFinalRow -or $pdfFinalRow.state -eq "ocr_processing" -or $pdfFinalRow.totalPages -ne 3) {
    throw "PDF job did not finish with totalPages 3."
}
if (Get-OcrTempDirectories) {
    throw "Rasterized PDF temp directories were not cleaned up."
}

Write-Host "PDF viewer page jump..."
$pdfView = Invoke-Json -Method GET -Url "$Base/api/viewer.cfm?documentId=$pdfId" -Cookie $cookieA
$pdfViewData = $pdfView.Text | ConvertFrom-Json
if ([int]$pdfViewData.totalPages -ne 3) {
    throw "PDF viewer totalPages was not 3."
}
$pdfPageOut = Join-Path $Temp "idochive-viewer-pdf-page.bin"
$pdfPageCode = & curl.exe -sS -o $pdfPageOut -w "%{http_code}" -b $cookieA -c $cookieA "$Base/api/viewer/page.cfm?documentId=$pdfId&page=2"
if ([int]$pdfPageCode -ne 200) {
    throw "PDF page 2 preview expected 200, got $pdfPageCode"
}
if ((Get-Item $pdfPageOut).Length -lt 8) {
    throw "PDF page 2 preview wrote no bytes."
}
$badPage = Invoke-Json -Method GET -Url "$Base/api/viewer/page.cfm?documentId=$pdfId&page=99" -Cookie $cookieA -Expect @(400)
if ($badPage.Text -notmatch "That page is not in this document") {
    throw "Out-of-range preview did not return a page error."
}

Write-Host "Job control pause/start/cancel/remove..."
$controlTitle = "unit15-control-" + [guid]::NewGuid().ToString().Substring(0, 8) + ".png"
$controlUpload = Invoke-Json -Method POST -Url "$Base/api/documents.cfm" -Cookie $cookieA -Form @(
    "-F", "file=@$pngPath;filename=$controlTitle;type=image/png",
    "-F", "classCode=project_report",
    "-F", "languageCode=en"
)
$controlId = [regex]::Match($controlUpload.Text, '"id"\s*:\s*"([0-9a-fA-F-]{36})"').Groups[1].Value
if (-not $controlId) {
    throw "Could not read control document id."
}
$pauseFile = Join-Path $Temp "idochive-ingest-pause.json"
Set-Content -Path $pauseFile -Value ("{`"documentId`":`"$controlId`",`"action`":`"pause`"}") -NoNewline
$pause = Invoke-Json -Method POST -Url "$Base/api/jobs/control.cfm" -Cookie $cookieA -BodyFile $pauseFile -Expect @(200, 400)
if ($pause.Code -eq 200) {
    $pausedJobs = Invoke-Json -Method GET -Url "$Base/api/jobs.cfm?filter=all" -Cookie $cookieA
    if ($pausedJobs.Text -notmatch "Paused") {
        throw "Pause succeeded but jobs did not show Paused."
    }
    $startFile = Join-Path $Temp "idochive-ingest-start.json"
    Set-Content -Path $startFile -Value ("{`"documentId`":`"$controlId`",`"action`":`"start`"}") -NoNewline
    Invoke-Json -Method POST -Url "$Base/api/jobs/control.cfm" -Cookie $cookieA -BodyFile $startFile | Out-Null
}

$bFile = Join-Path $Temp "idochive-ingest-b-control.json"
Set-Content -Path $bFile -Value ("{`"documentId`":`"$controlId`",`"action`":`"pause`"}") -NoNewline
$bControl = Invoke-Json -Method POST -Url "$Base/api/jobs/control.cfm" -Cookie $cookieB -BodyFile $bFile -Expect @(404)
if ($bControl.Text -notmatch "Document was not found") {
    throw "Officer B control did not use the permission-safe 404 copy."
}

$removeTitle = "unit15-remove-" + [guid]::NewGuid().ToString().Substring(0, 8) + ".png"
$removeUpload = Invoke-Json -Method POST -Url "$Base/api/documents.cfm" -Cookie $cookieA -Form @(
    "-F", "file=@$pngPath;filename=$removeTitle;type=image/png",
    "-F", "classCode=project_report",
    "-F", "languageCode=en"
)
$removeId = [regex]::Match($removeUpload.Text, '"id"\s*:\s*"([0-9a-fA-F-]{36})"').Groups[1].Value
$cancelFile = Join-Path $Temp "idochive-ingest-cancel.json"
Set-Content -Path $cancelFile -Value ("{`"documentId`":`"$removeId`",`"action`":`"cancel`"}") -NoNewline
Invoke-Json -Method POST -Url "$Base/api/jobs/control.cfm" -Cookie $cookieA -BodyFile $cancelFile | Out-Null
$removeFile = Join-Path $Temp "idochive-ingest-remove.json"
Set-Content -Path $removeFile -Value ("{`"documentId`":`"$removeId`",`"action`":`"remove`"}") -NoNewline
Invoke-Json -Method POST -Url "$Base/api/jobs/control.cfm" -Cookie $cookieA -BodyFile $removeFile | Out-Null
$afterRemove = Invoke-Json -Method GET -Url "$Base/api/jobs.cfm?filter=all" -Cookie $cookieA
if ($afterRemove.Text.Contains($removeTitle)) {
    throw "Removed job was still listed."
}

Write-Host "Other department isolation..."
$jobsB = Invoke-Json -Method GET -Url "$Base/api/jobs.cfm?filter=all" -Cookie $cookieB
if ($jobsB.Text.Contains($title)) {
    throw "Officer B jobs included officer A's upload."
}
$streamB = Read-JobStream -Cookie $cookieB
if ($title -and $streamB.Text.Contains($title)) {
    throw "Officer B job stream included officer A's upload."
}

$health = Invoke-Json -Method GET -Url "$Base/api/health.cfm" -Cookie $cookieA
if ($health.Text -match '"publicAiApiRequired"\s*:\s*true') {
    throw "Health reported a public AI API is required."
}

Write-Host "Ingestion Center tests passed."
