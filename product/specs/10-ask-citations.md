# Unit 10 spec: Source-grounded Q&A

## Goal

Let an authorized user ask a question over records they may already search. The API retrieves authorized chunks first, answers from a local generate model when present, and otherwise returns an extractive citation-only answer. Every answer stays `pending_review` until a human decides.

Source: `idochive.md` Section 5.5, Section 38 steps 15–17, Section 51 Release 2 (source-grounded Q&A, `pending_review` AI, citation audit). No public AI API. No prompt-policy editor.

## Design

`AskService` applies the same organization and department predicates as search, then takes at most five authorized chunks (keyword plus cosine, distance under 0.42). Empty retrieval returns the permission-safe sentence and stores nothing.

When local Ollama `qwen2.5:3b` (or `IDOCHIVE_GENERATE_MODEL`) is available, `ModelGateway.generate` writes a grounded answer. If generate is down, the answer is extractive: a short refusal to invent, plus citation titles. Both modes persist `ai_requests`, `ai_responses`, and `citations`. Response state is `pending_review`.

Audit `ask.completed` and `ask.decided` include request id, model id, citation document ids, and `authorizedCount`. Chunk text is not written to audit detail. Encrypted originals are not rewritten.

## In scope

- `POST /api/ask.cfm` `{ question }`
- `GET /api/ask.cfm` recent asks and pending reviews the caller may see
- `POST /api/ask.cfm` `{ id, state }` for reviewers
- Intelligence UI
- Health `generate.available`
- Local generate or extractive fallback

## Out of scope

- Prompt-policy editor and eval sets
- Classification and structured extraction
- OpenSearch, LangGraph, public AI APIs
- Marketing website

## APIs

- `POST /api/ask.cfm` `{ question }`
  - `emptyReason` / `emptyMessage` when retrieval is empty
  - otherwise `item` with answer, `mode`, `state`, `citations[]` (document id + title + rank)
- `GET /api/ask.cfm` — `{ items }`
- `POST /api/ask.cfm` `{ id, state }` — `approved` | `rejected` | `changes_requested`

## Verify when this unit is done

- [x] An ask that matches an authorized title cites only authorized documents
- [x] A nonsense ask returns the safe empty message
- [x] A stored answer starts as `pending_review` and can be decided
- [x] Unauthenticated ask is 401
- [x] No public AI API is required
