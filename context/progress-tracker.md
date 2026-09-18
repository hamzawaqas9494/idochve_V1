# Progress Tracker

Update this file after every meaningful implementation change.

## Current Phase

- Unit D complete; A–F complete on ColdFusion

## Current Goal

- Keep ColdFusion as the API edge; A–F program, stop after each letter

## Completed

### Marketing website (root `src/`)

- Five-page bilingual Vite + React + TypeScript + Tailwind site: Home, How It Works, Deployment, Government, Book, Privacy
- Header, footer, language switcher, SEO, locales EN/AR
- Form validates and stays disabled without `VITE_FORM_ENDPOINT`
- Root `package.json` scripts: `dev`, `build`, `preview`

### Product application (source evidence under `product/`)

- ColdFusion/Lucee CommandBox API in `product/app/api/` (JSON `.cfm` endpoints) and services in `product/app/idochive/*.cfc`
- React 19 + Vite + shadcn/ui SPA in `product/ui/`; built assets served from `product/app/www`
- PostgreSQL + pgvector migrations `product/db/001`–`013`
- Session RBAC in `AuthService.cfc`; department-scoped document, search, ask, export, and job queries in the corresponding services
- Multipart upload: `product/ui/src/api.ts` `uploadDocument` → `POST /api/documents.cfm` → `IngestService.enqueue`
- Job list: `GET /api/jobs.cfm`; live progress `GET /api/jobs/stream.cfm` (SSE); UI falls back to 5000 ms poll
- OCR: `OcrGateway.cfc` (Tesseract), `PdfRasterizer.cfc` (`pdftoppm`), `ocr_progress` sidecar (`013_ocr_progress.sql`)
- Optional Redis job lists: `JobQueue.cfc`, `RedisClient.cfc`; Compose in `product/deploy/docker-compose.yml` (Postgres + Redis only)
- Background loop: `Application.cfc` `startBackgroundWorker` (`cfthread`); `POST /api/jobs/tick.cfm` sets `tickRequested` and does not call `JobWorker.processAvailable()`
- Authorized viewer: `GET /api/viewer.cfm` and `GET /api/viewer/page.cfm` after department RBAC; UI route `/documents/{id}`
- Encrypted local blobs: `BlobStore.cfc` AES-256-GCM (`IDG1` prefix) for new writes; AES-ECB decrypt for legacy files under `product/app/storage/blobs`
- Hybrid search and ask: `SearchService.cfc`, `AskService.cfc`; local Ollama via `ModelGateway.cfc`
- Integration scripts exist (not re-run in this Phase 0 session): `scripts/ingestion-tests.ps1`, `scripts/permission-tests.ps1`, `scripts/setup-dev.ps1`

### Explicitly absent (do not treat as implemented)

- GraphQL, GraphQL SSE, RabbitMQ, Valkey, tusd, Uppy, Python workers, Node API edge, Kubernetes/Helm, CI workflows, LICENSE file, SAML/OIDC

## In Progress

- None

## Next Up

- A–F complete on ColdFusion
- Not in A–F: Node, GraphQL, RabbitMQ, Python, Kubernetes

## Open Questions

- **J.1** Resolved: first unit is security baseline (not Node/tus)
- **J.2** Keep Lucee as API edge for the next N units vs introduce Node immediately
- **J.3** Adobe ColdFusion vs Lucee for a specific tender
- **J.4** Whether marketing copy may name ColdFusion + React (locales/diagrams still describe Laravel/Vue)
- **J.5** Whether root `context/` stays marketing-only and product agents read `product/context/` only
- Traction sentence omitted (marketing)
- Form endpoint unset
- Demo video not supplied
- Full SPDX/license inventory not produced in Phase 0

## Architecture Decisions

- This repository contains two applications: marketing (root `src/`) and product (`product/`)
- Target stack in root `AGENTS.md` / `idochive-cursor-context-pack` is a strangler destination, not current runtime
- Verified product runtime: ColdFusion/Lucee + React + PostgreSQL + pgvector (see `product/context/architecture.md`)
- Root `context/architecture.md` still states Laravel + Vue as later product UI; that is **stale relative to product code** and is an open copy/context decision (J.4 / J.5), not a new runtime change
- Marketing: Vite + React + TypeScript + Tailwind; no public SaaS or signup
- Production constraints remain: sovereign/air-gapped path, no required public AI, authorization before retrieval, PostgreSQL as durable truth

## Session Notes

- Phase 0 evidence: repository inspection of `product/app`, `product/ui`, `product/db`, `src/`, `scripts/`, `product/deploy/docker-compose.yml`
- J.1 approved as security baseline. Audit and CORS shipped. Unit A: `contractVersion` `"1"` on `GET/POST /api/documents.cfm` and `GET /api/jobs.cfm`. Spec: `product/specs/17-job-contract.md`.
- Context mismatch remains: `CLAUDE.md` and root `context/` describe marketing; `AGENTS.md` describes target Node/RabbitMQ/Valkey/Python; product code is CF + React (J.4 / J.5)
- Unit B: AES-256-GCM writes with ECB dual-read. Spec `product/specs/18-blob-gcm.md`.
- Unit C: `POST /api/jobs/tick.cfm` sets `tickRequested` and returns `processed: false`. Spec `product/specs/19-tick-not-ocr.md`. Job start without Redis on `jobs/control.cfm` can still run OCR on the HTTP thread (out of C).
- Unit D: authorized viewer at `/documents/{id}` with page jump and citations. Spec `product/specs/20-document-viewer.md`. Ingestion and permission tests passed.
- Unit E: `GET /api/jobs/stream.cfm` streams authorized job JSON. Spec `product/specs/21-job-sse.md`. UI uses EventSource with poll fallback.
- Unit F: chunked ColdFusion upload for PDFs and images. Encrypted originals are written only after assemble.
- Source of truth for product claims in `idochive.md` Sections 31 and 63 remains; do not invent certifications or scale numbers
