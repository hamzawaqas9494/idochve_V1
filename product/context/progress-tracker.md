# Product Progress Tracker

Update this file after every meaningful change.

## Current Phase

- Unit D complete; A–F complete on ColdFusion

## Current Goal

- ColdFusion + React + PostgreSQL + pgvector pilot running locally

## Completed

- Stack override: ColdFusion + React + PostgreSQL + pgvector (no Laravel)
- Docs: context files and Release 1 specs
- Unit 1–4: shell, identity, documents, OCR gateway with local Tesseract
- Local PostgreSQL `idochive` with `001`–`013` SQL and pgvector
- CommandBox on 127.0.0.1:8080 with webroot `product/app`
- Unit 5: lock-after-approval, replacement versions, immutable comments, Workflows UI
- Unit 6: permission-aware keyword/metadata search, permission-safe empty state, Search UI
- Unit 7: pg_dump + blob backup, restore-verify (schema `restore_verify`), Backup UI
- Unit 8: local Ollama `nomic-embed-text`, `chunk_embeddings` vector(768), embed jobs off the HTTP thread
- Unit 9: hybrid search (RBAC first, ILIKE + cosine RRF, semantic checkbox)
- Unit 10: Intelligence ask, citations, extractive fallback, `pending_review`
- Unit 11: versioned prompt policies, classify/extract jobs, Intelligence review lists
- Unit 12: `scripts/setup-dev.ps1` (idempotent env, SQL, npm, CommandBox start)
- Unit 13: `GET /api/export.cfm`, other-department user, `scripts/permission-tests.ps1`, `product/docs/install.md`
- Unit 14: Ingestion Center (`GET /api/jobs.cfm`, drop/auto-upload, mapped job states, Process next)
- Unit 15: shadcn product chrome, Ingestion Center table/context menu, `job_controls` pause/start/cancel/remove
- Unit 16: Redis job lists, CommandBox worker, health queue, optional Compose Redis
- OCR page progress: `ocr_progress` sidecar (do not ALTER `ingest_jobs`). PDFs are rasterized with `pdftoppm` then OCR'd page by page. Images are `totalPages` 1. Jobs API returns `currentPage` / `totalPages` and measured ETA after the first page. Health reports `ocr.rasterizer`.
- Windows Poppler pilot: portable 26.02.0 at `product/tools/poppler-windows/poppler-26.02.0/Library/bin/pdftoppm.exe`; `setup-dev.ps1 -Install -WithOcr` provisions it without administrator rights.
- Three-page PDF proof: generated fixture observed live pages `0, 1, 2`, monotonic progress in the 40–75% OCR band, measured ETA after page 1, `totalPages = 3`, final completion, department isolation, and zero remaining `idochive-pdf-*` temp directories.
- Unit 17 (baseline): `AuditService.listForUser()` scopes `GET /api/audit.cfm` by organization and department (`security_admin` / `auditor` / `platform_operator` still see all departments in-org). `Application.cfc` CORS allowlist via `IDOCHIVE_CORS_ORIGINS`. `.cursor/rules/idochive-core.mdc` installed. No GraphQL, RabbitMQ, or Node edge.
- Unit A: `contractVersion` `"1"` on jobs and documents JSON. Spec `product/specs/17-job-contract.md`.
- Unit B: `BlobStore.cfc` writes AES-256-GCM (`IDG1` + IV). Decrypt uses GCM for that prefix and AES-ECB for legacy files. Spec `product/specs/18-blob-gcm.md`.
- Unit C: `POST /api/jobs/tick.cfm` returns `processed: false` and wakes `cfthread`. Spec `product/specs/19-tick-not-ocr.md`.
- Unit D: `GET /api/viewer.cfm` and `GET /api/viewer/page.cfm` after RBAC. Spec `product/specs/20-document-viewer.md`.
- Unit E: `GET /api/jobs/stream.cfm` emits `event: jobs` with contract v1 JSON. Spec `product/specs/21-job-sse.md`.
- Unit F: resumable PDF/image upload (`upload_sessions`, `/api/uploads.cfm`). Spec `product/specs/22-resumable-upload.md`.

## In Progress

- None

## Next Up

- Later: customer-supplied labeled eval set (do not invent one)
- Later ingest units: Office/ZIP/email, threat scan
- Later website pass: replace Vue 3 / Laravel labels with ColdFusion + React
- Root `README.md` is the local setup and company-requirements guide (Ghost AI playbook removed)
- Windows bootstrap: `pwsh -File scripts/setup-dev.ps1` (or `powershell -File` on Windows PowerShell 5.1). Re-run kept existing `.env`, applied SQL without dropping data, health 200. `winget` still cannot install pgvector.
- Delivery install: `product/docs/install.md`. Optional Compose is Postgres + pgvector only.

## Open Questions

- Adobe ColdFusion vs Lucee for a specific tender

## Architecture Decisions

- Laravel is not used on this track
- Pilot identity is local email/password until SAML/OIDC is wired
- Encrypted originals are stored under `app/storage/blobs` in the pilot
- New blob writes are AES-GCM; legacy AES-ECB files remain readable
- Resumable uploads store chunk files under `app/storage/uploads`; PostgreSQL holds session metadata only
- Lock state lives in `document_locks` (the `idochive` role cannot ALTER `documents`)
- Comments are insert-only; PUT/PATCH/DELETE are rejected
- Approved records cannot receive a new version; `changes_requested` and `rejected` can
- Pilot backup is `pg_dump` plus `storage/blobs`; dumps stay under `storage/backups` (gitignored)
- Restore verify uses schema `restore_verify` because the `idochive` role cannot CREATE DATABASE
- Live restore requires `-ConfirmPhrase "REPLACE LIVE IDOCHIVE"`; two-site DR is Release 4
- Embeddings live in `chunk_embeddings` (768-d). Do not ALTER postgres-owned `document_chunks.embedding`
- Embedding and later generation use local Ollama only. No public AI API fallback
- Hybrid search fuses keyword and cosine ranks (RRF k=60). Cosine distance >= 0.42 is not a semantic hit
- Ask answers start as `pending_review`. Local `qwen2.5:3b` generate when available; otherwise extractive citations. No public AI API
- Prompt text lives in `prompt_policy_versions`. Classify and extract run on tick and stay `pending_review` until a reviewer decides
- Ingestion Center job rows are derived from ingest/OCR/classify/extract/workflow. Upload progress is transferred bytes. OCR progress is pages stored in `ocr_progress` (do not ALTER `ingest_jobs`). Live queue updates use `GET /api/jobs/stream.cfm`; the UI does not tick on SSE or poll.
- Pause, start, cancel, and remove live in `job_controls` (do not ALTER `ingest_jobs`). Encrypted originals stay on remove.
- Redis is the approved job list. PostgreSQL remains the system of record. Kafka is not used in the pilot. `POST /api/jobs/tick.cfm` wakes the background worker; it does not run OCR on the HTTP thread.
- Authorized document preview is ColdFusion after RBAC (`/api/viewer.cfm`, `/api/viewer/page.cfm`). One PDF page may be rasterized on the request at 150 DPI; OCR still stays on the worker.
- Browser CORS is an allowlist (`IDOCHIVE_CORS_ORIGINS`). The API does not echo unknown Origins.

## Session Notes

- Pilot user: records.officer@nia.example / ChangeMePilot!
- Product UI is served from CommandBox at `/`
- Workflows page decides pending_review tasks
- Search page: GET `/api/search.cfm` with optional `semantic=1`; org/department filters before keywords and vectors; empty copy never reveals other departments
- Backup page lists jobs; restore is operator-only. Latest verify: 12 documents / 9 versions restored, live count unchanged, 1 version blob already missing before backup
- Intelligence page: POST `/api/ask.cfm`. Verified extractive citation to “Approve lock test”, nonsense refuse, approve from `pending_review`
- Unit 11: `policy.used` wrote `ask_grounded` version `88888888-8888-8888-8888-888888888802`; classification and extraction results started `pending_review`; extraction JSON approved and left the pending list. Tick used local generate only. `publicAiApiRequired` remains false.
- Unit 13: `scripts/permission-tests.ps1` passed. Officer A exported a document; officer B list/search/ask did not include it; B export of A’s id returned 404; unauthenticated export returned 401.
- Unit 14: `scripts/ingestion-tests.ps1` passed. Upload appeared in `GET /api/jobs.cfm`; tick kept the row; officer B did not see it; unauthenticated jobs returned 401. `scripts/permission-tests.ps1` also covers jobs 401 and other-department isolation. Product UI rebuilt to `product/app/www`.
- Units 15–16: Ingestion tests cover unauthenticated control 401, other-department 404, pause/start, cancel/remove hide. Permission tests still pass. Product UI rebuilt with shadcn. Redis is optional; health reports queue availability.
- Ingestion Center (`/documents/ingestion`): navy sidebar, header search, dropzone, processing defaults/preferences Sheet, queue table, job details Sheet. All Documents is `listDocuments`. CommandBox serves the SPA from `spa.cfm` plus route folders so `/documents/ingestion` returns 200.
- Ingestion uploads are real: `uploadDocument()` posts each original with XHR so the bar and remaining time come from transferred bytes, files upload one at a time with a queue position, dropped folders are walked with `webkitGetAsEntry`, and only PDF/image formats Tesseract accepts are allowed. Queue rows come from `GET /api/jobs.cfm` every 5s via `useIngestionJobs`; row actions call `POST /api/jobs/control.cfm`. Typecheck, ESLint, build, ingestion tests, and permission tests pass. A three-file batch listed all three rows.
- OCR page progress: worker rasterizes PDFs with pdftoppm, OCRs each page, upserts `ocr_progress`. Images report `totalPages` 1. Health includes `ocr.rasterizer`. ETA is measured only after the first page finishes.
- PDF verification: `scripts/ingestion-tests.ps1` generates a customer-data-free three-page PDF and passes live progress, ETA, cleanup, final-state, and department-isolation assertions. Headless Chrome opened `/documents/ingestion/` and found the accessible `page 3 of 3` progress label. Trailing-slash routes are normalized by the SPA.
- Owner chose security baseline (J.1). `scripts/permission-tests.ps1` passed: unauthenticated audit 401, officer B audit omits officer A's document id, CORS does not echo `https://evil.example`, and `http://127.0.0.1:8080` is allowed.
- Unit A: `scripts/ingestion-tests.ps1` asserts `contractVersion` 1 on upload and job list envelopes and required job item fields.
- Unit B: ingestion and permission tests passed after GCM writes; officer A export still works for pre-existing ECB blobs.
- Unit C: CommandBox restarted so the worker idle loop honors `tickRequested`. `scripts/ingestion-tests.ps1` asserts tick `processed` is not true and the message mentions the background worker. `scripts/permission-tests.ps1` passed. Out of C: `jobs/control.cfm` start without Redis can still OCR on the HTTP thread.
- Unit D: viewer metadata and one-page preview after RBAC. Image preview 200, PDF page 2 200, page 99 400, other department 404, unauthenticated 401. Product UI rebuilt.
- Unit E: job SSE 401 when anonymous, officer B stream omits officer A titles, officer A stream includes the upload and contractVersion 1, no blob keys. Poll fallback remains if EventSource fails.
- Unit F: `014_resumable_uploads.sql` applied. Incomplete assemble 400, replayed chunk 0 succeeds, complete appears in jobs. Officer B cannot read officer A's upload session. Product UI rebuilt.
