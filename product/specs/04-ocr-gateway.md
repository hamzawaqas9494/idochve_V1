# Unit 04 spec: Bulk ingest and OCR gateway

## Goal

Add controlled batch intake, a pluggable OCR engine gateway, and a human validation queue for low-confidence or empty extraction. Encrypted originals stay immutable. OCR does not run on the HTTP request thread.

Source: `idochive.md` Section 5.2, Section 36 must-haves for OCR and validation queues, Section 38 steps 4–5 without classification, embeddings, or RAG. Stack override remains ColdFusion + React + PostgreSQL + pgvector.

## Design

After Unit 3 stores an encrypted original, ColdFusion enqueues an `ingest_jobs` row and returns. A worker claims one queued job, decrypts the blob to a temporary file, calls the OCR gateway, stores derived text, and deletes the temp file. Mean word confidence below 70, or empty text, enters `needs_validation`. A records officer, document controller, or approver can submit corrected text. The original blob is never overwritten.

The default engine is local Tesseract. The gateway is an adapter so a later engine can replace the CLI without changing ingest or validation APIs. No public AI API is used.

## In scope

- Multi-file ingest: one encrypted document and version 1 per file
- `ingest_jobs` queue with `queued | running | completed | failed`
- `OcrGateway` with a Tesseract adapter (`eng`, `ara`, or `eng+ara`)
- `ocr_results` and `ocr_validations`
- Department-scoped validation list and correction API
- Health reports `ocr.engine` and `ocr.available`
- Audit events for OCR completion, validation routing, failure, and correction
- Optional `document_chunks` content only when OCR is accepted or corrected (no embeddings)

## Out of scope

- Classification, extraction, summarization, or translation models
- pgvector embeddings, hybrid RAG, source-grounded Q&A
- Lock-after-approval and immutable comments (Unit 5)
- Keyword / metadata search (Unit 6)
- Redis, Docker, or a required public network path
- Marketing website changes
- Published OCR accuracy claims

## APIs

- `POST /api/documents.cfm` — existing single upload; also accepts multiple `file` parts
- `GET /api/ocr.cfm` — `needs_validation` rows the caller may see
- `POST /api/ocr.cfm` — `{ id, correctedText }` from an authorized reviewer
- `POST /api/jobs/tick.cfm` — process one queued job (authenticated)
- `GET /api/health.cfm` — add `ocr` without changing `publicAiApiRequired: false`

## Verify when this unit is done

- [x] `004_ocr.sql` applied; originals remain encrypted after OCR
- [x] Upload enqueue leaves jobs `queued`; tick writes `ocr_results`
- [x] Empty or low-confidence text appears on the Validation page
- [x] Correction writes `ocr_validations` and does not change `blob_key`
- [x] Health shows Tesseract available (`ocr.available: true`)
- [x] No production path calls a public AI API
