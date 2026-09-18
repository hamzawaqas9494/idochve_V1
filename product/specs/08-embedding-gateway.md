# Unit 08 spec: Embedding gateway

## Goal

Write approved chunk embeddings into pgvector through an internal model gateway. Embedding runs off the HTTP thread. No public AI API is used. Keyword search stays unchanged.

Source: `idochive.md` Section 5.5, Section 38 step 7, Section 51 Release 2 (embedding and vector retrieval only). Hybrid search and source-grounded Q&A are Units 9–10.

## Design

OCR already stores `document_chunks.content` without vectors. `document_chunks.embedding` is `vector(1536)` and is owned with the older tables; this unit does not ALTER it.

A new `chunk_embeddings` table stores `vector(768)` rows for Ollama `nomic-embed-text`. `embed_jobs` queues work. `POST /api/jobs/tick.cfm` processes one OCR job if queued, otherwise one embed job.

`ModelGateway` calls only `127.0.0.1` (or `IDOCHIVE_OLLAMA`). If Ollama or the model is missing, jobs fail with a safe message. There is no OpenAI or other public fallback.

Audit records `embedding.completed` and `embedding.failed` with model id and job id. Chunk text is not written to the audit detail.

## In scope

- `models` / `model_versions` seed for `nomic-embed-text` (kind `embedding`, dim 768)
- `chunk_embeddings` and `embed_jobs`
- Local Ollama embed adapter
- Enqueue after accepted or corrected OCR text
- Backfill chunks that have content and no vector
- Health `embedding.available`
- Home status line

## Out of scope

- Hybrid search (Unit 9)
- Source-grounded Q&A / Intelligence page (Unit 10)
- Classification, extraction, prompt-policy editor
- Public AI APIs
- ALTER of `documents` or `document_chunks`
- Marketing website

## APIs

- `POST /api/jobs/tick.cfm` — OCR first, then one embed job
- `GET /api/health.cfm` — add `embedding` without changing `publicAiApiRequired: false`

## Verify when this unit is done

- [x] `007_embeddings.sql` applied; `document_chunks.embedding` is unused
- [x] One known English chunk receives a 768-d vector
- [x] A second tick does not rewrite that vector
- [x] Keyword search still returns a known title without using embeddings
- [x] Health reports `embedding.available` when Ollama and `nomic-embed-text` are local
- [x] No production path calls a public AI API
