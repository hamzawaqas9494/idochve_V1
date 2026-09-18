# Unit 06 spec: Keyword and metadata search

## Goal

Let an authorized user search titles, classes, language, and OCR text. The ColdFusion API applies organization and department filters at query time. An empty result must not reveal whether other departments hold matching records.

Source: `idochive.md` Section 36 search, Section 38 steps 15–16, Section 52 “permissions resolve before search results.” No embeddings. No public AI API.

## Design

`SearchService` builds one parameterized query. RBAC predicates are applied before keyword or metadata predicates. Results come only from `documents` the caller may already list. OCR text is read from `document_chunks.content` when present. pgvector columns stay unused.

The empty state copy is always permission-safe: “No authorized records match.” Never return a global hit count.

Every search writes `search.executed` to the append-only audit log.

## In scope

- Keyword match on title, document class, and chunk text
- Metadata filters: class code, language code
- Same org/department (or can-see-all) rule as the document list
- Permission-safe empty payload
- Search UI
- Audit of the query string and authorized result count

## Out of scope

- Semantic / hybrid / RAG retrieval
- OpenSearch
- Cross-department hit hints
- Backup/restore (Unit 7)
- Marketing website

## APIs

- `GET /api/search.cfm?q=&classCode=&languageCode=`
  - `results`: authorized rows
  - `emptyReason`: `enter_query` or `no_authorized_matches` when `results` is empty
  - `emptyMessage`: permission-safe sentence

## Verify when this unit is done

- [x] A known title in the caller’s department is returned
- [x] A nonsense query returns the safe empty message and no extra counts
- [x] `search.executed` appears in the audit log
- [x] No embeddings are written
- [x] No public AI API is required
