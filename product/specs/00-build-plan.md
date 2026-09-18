# Unit 00: Product Build Plan

## Goal

Record the implementation order for the iDocHive product track so future sessions do not mix the marketing site, Ghost AI examples, or the retired Laravel + Vue baseline.

This unit is documentation only.

## Stack

- React + TypeScript experience
- ColdFusion application and policy (Lucee 6 + CommandBox default)
- PostgreSQL + pgvector
- Customer-controlled object storage for encrypted originals

## Units

0. **Docs** — complete.
1. **Runtime shell** — coded: Compose + Lucee health + React shell. Start with Docker when available.
2. **Identity and RBAC** — coded: pilot local login, org/department/roles, API session checks. SAML/OIDC still later.
3. **Document repository** — coded: metadata, version 1, encrypted immutable original, pending_review, audit.
4. **Bulk ingest and OCR gateway** — coded: multi-file ingest, Tesseract gateway, validation queue. Install local Tesseract to process jobs.
5. **Versioning, approval, audit** — coded: lock-after-approval, new versions after changes, immutable comments.
6. **Keyword and metadata search** — coded: permission-aware ILIKE on title, class, and OCR chunks; permission-safe empty state.
7. **Backup and restore** — coded: pg_dump + blob backup, non-destructive restore verify, Backup UI.
8. **Embedding gateway** — coded: local Ollama `nomic-embed-text`, `chunk_embeddings` vector(768), jobs off the HTTP thread.
9. **Hybrid search** — coded: RBAC-first keyword + cosine RRF, Search UI semantic toggle.
10. **Source-grounded Q&A** — coded: Intelligence ask, citations, local generate or extractive fallback, `pending_review`.
11. **Prompt policy, classification, extraction** — coded: versioned policies in PostgreSQL, classify/extract jobs off the HTTP thread, `pending_review` until a human decides. Customer-supplied eval set still later.
12. **Windows developer bootstrap** — coded: `scripts/setup-dev.ps1` prepares env, SQL, UI build, and CommandBox. pgvector is not installed by winget.
13. **Permission export** — coded: authorized original download, other-department officer, permission tests, install notes. Compose optional (Postgres only).
14. **Ingestion Center** — coded: derived job list API, drop/auto-upload, mapped Upload → Ready states, Process next. No Office/ZIP, resumable chunks, or WebSockets.
15. **shadcn + job control** — coded: product chrome on shadcn, `job_controls`, pause/start/cancel/remove, Ingestion Center table and context menu.
16. **Redis queue and worker** — coded: Redis lists when available, CommandBox worker off the user HTTP thread, tick remains the degraded drain.

## Ordering rules

- Dependencies first.
- Authorization before document features.
- ColdFusion APIs before React wiring for each capability.
- UI shells may use synthetic data only until the matching API exists.
- Do not install RAG or model-serving packages in Units 1–7.

## Verify when this docs unit is done

- [x] `product/README.md` and `product/AGENTS.md` state the stack override
- [x] Six context files exist
- [x] Release 1 acceptance is written in `01-sovereign-foundation.md`
- [x] No application code was added in this pass
