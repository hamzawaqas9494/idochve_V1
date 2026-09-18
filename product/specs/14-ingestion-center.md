# Unit 14 spec: Ingestion Center

## Goal

A records officer uploads files once. The UI starts secure storage immediately, then shows Upload → OCR → Classify → Validate → Ready from real job rows. Class and language are optional preferences, not required before drop.

Source: Ingestion Center brief. Uses existing Tesseract, `ingest_jobs`, classify/extract, and Validation. No public AI API.

## Design

`GET /api/jobs.cfm` derives one row per latest document version. Progress is weighted from completed stages only. Page counts stay null. The UI polls; it does not tick on poll. `POST /api/jobs/tick.cfm` stays the worker.

Upload starts on file or folder selection. Defaults remain `project_report` and `en` unless the officer opens Processing preferences.

## In scope

- Job list API with RBAC and filters `all|active|review|ready`
- Ingestion Center drop zone and auto-upload
- Friendly state labels
- Process next for roles that may tick
- Download on Ready rows (existing export)

## Out of scope

- Office, ZIP, email unpack
- Resumable chunks, SSE, page-level OCR
- Pause, cancel, priority, engine picker
- Threat scan, password PDF, duplicate UX

## APIs

- `GET /api/jobs.cfm?filter=all|active|review|ready`
  - Authenticated. Same org/department rule as `DocumentService.listForUser`.
  - One derived row per latest document version. No new table.
  - `items`: `id`, `documentId`, `fileName`, `byteSize`, `state`, `label`, `message`, `overallProgress`, `currentPage`, `totalPages`, `detectedLanguage`, `nextAction`
  - Progress from completed stages only: stored 40, OCR result 75, classify result 85, extract result 95, ready 100. Page counts are always null.
  - `counts`: active, review, ready
  - `canTick`: true for records_officer, document_controller, approver, security_admin
- `POST /api/jobs/tick.cfm` stays the worker. The UI never ticks on poll.

## Verify when this unit is done

- [x] Upload starts without Submit
- [x] Job appears; tick updates state from `GET /api/jobs.cfm`
- [x] Needs validation opens Validation
- [x] Other department does not see the job
- [x] Unauthenticated jobs return 401
- [x] No public AI API is required
