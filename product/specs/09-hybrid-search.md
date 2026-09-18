# Unit 09 spec: Hybrid search

## Goal

Let an authorized user optionally include semantic matches with keyword search. Organization and department filters run before both ILIKE and vector ranks. An empty result must not reveal whether other departments hold matching records.

Source: `idochive.md` Section 38 steps 15–17, Section 52 “permissions resolve before search results.” Embeddings come from Unit 8 `chunk_embeddings`. No generation. No public AI API.

## Design

Default search stays the Unit 6 keyword path. `semantic=1` plus a keyword embeds the query through the local Ollama gateway and fuses keyword ranks with cosine ranks using reciprocal rank fusion (`k = 60`). Vector comparison uses only `chunk_embeddings` inside the authorized document set. Cosine distance above 0.42 is not a semantic hit.

If the local embedder is unavailable, the API returns keyword results and `semanticApplied: false`. The request does not fail and does not call a public model.

Empty copy is unchanged: “No authorized records match.” Audit `search.executed` includes `authorizedCount` and `semantic` only.

## In scope

- Optional `semantic=1` on `GET /api/search.cfm`
- RBAC-first hybrid ranking
- `matchType`: `keyword` | `semantic` | `hybrid`
- Search UI checkbox when `embedding.available`
- Cosine index on `chunk_embeddings` if the `idochive` role can create it

## Out of scope

- Source-grounded Q&A / Intelligence page (Unit 10)
- `pending_review` AI
- OpenSearch
- Public AI APIs
- ALTER of `document_chunks`
- Marketing website

## APIs

- `GET /api/search.cfm?q=&classCode=&languageCode=&semantic=`
  - `semanticApplied`: whether query embedding and fusion ran
  - `results[].matchType` when rows are present
  - Same empty reasons as Unit 6

## Verify when this unit is done

- [x] Keyword-only search still returns a known authorized title
- [x] Semantic=1 on a known authorized title still returns that document
- [x] A nonsense query returns the safe empty message
- [x] Unauthenticated search is 401
- [x] No public AI API is required
