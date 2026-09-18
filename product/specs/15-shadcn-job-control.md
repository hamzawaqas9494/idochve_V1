# Unit 15 spec: shadcn shell and job control

## Goal

The product chrome uses shadcn/ui with iDocHive tokens. Ingestion Center matches the mockup with honest data. Pause, start, cancel, and remove are real APIs against `job_controls`. Encrypted originals stay immutable. No public AI API.

## Design

Do not ALTER `ingest_jobs`. Control state lives in `job_controls`. Workers skip `paused`, `cancelled`, and `removed`. Start resumes and prefers that document on the next claim. Page counts and ETAs stay null.

## In scope

- `job_controls` table and `POST /api/jobs/control.cfm`
- Mapped Paused / Cancelled states; removed rows hidden
- shadcn product shell and Ingestion Center table + context menu
- Project skill `.cursor/skills/idochive-shadcn`

## Out of scope

- Redis worker (Unit 16)
- Office, ZIP, email, page-level OCR, SSE
- Document viewer
- Pause during an in-flight Tesseract request

## APIs

- `POST /api/jobs/control.cfm` `{ documentId, action }` where action is `pause|start|cancel|remove`
  - 401 unauthenticated
  - 404 if missing or other department
  - Ready / needs_validation / approved cannot be removed

## Verify when this unit is done

- [x] Pause is skipped by the next FIFO tick
- [x] Start processes or resumes that document
- [x] Cancel skips workers; blob remains
- [x] Remove hides the job; Ready is refused
- [x] Unauthenticated control is 401
- [x] Other department is 404
