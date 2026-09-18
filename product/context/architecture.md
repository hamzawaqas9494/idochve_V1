# iDocHive Product Architecture

## Stack override

`idochive.md` Sections 8 and 37 preferred Laravel + Vue 3 / Inertia. This product track uses:

| Layer | Technology | Role |
| --- | --- | --- |
| Experience | React + TypeScript + shadcn/ui | Search, viewer, workflow inbox, administration |
| Application and policy | ColdFusion (Lucee 6 + CommandBox default; Adobe ColdFusion alternate) | APIs, RBAC, workflow, audit enforcement |
| Document intelligence | OCR gateway (Tesseract default; pluggable) | Text and layout extraction |
| Knowledge and AI (Release 2+) | Internal model gateway; orchestration stays inside the boundary | Embeddings, retrieval, generation |
| Database | PostgreSQL | System of record |
| Vectors | pgvector | Chunk embeddings; default vector store |
| Files | Customer-controlled S3-compatible or approved file storage | Immutable encrypted originals |
| Cache / queue | Redis | Job list and cache; not the system of record |
| Search expansion | OpenSearch | Only when enterprise full-text scale requires it |
| Pilot runtime | CommandBox + local PostgreSQL (Compose optional) | Department pilot |
| Pilot backup | `pg_dump` + encrypted blob copy via `product/ops` | Restore verify; not two-site DR |
| Enterprise runtime | Customer VMs, K3s, or Kubernetes | HA profiles |
| Observability | Customer SIEM / Prometheus / OpenTelemetry | Logs, metrics, traces |

MySQL is legacy. Do not use it.

A dedicated vector database is an exception, used only when scale justifies leaving pgvector.

## Logical flow

```
React UI → ColdFusion API → PostgreSQL + pgvector
                         → Redis job lists (when available)
                         → Object storage
                         → OCR gateway (CommandBox worker; tick is fallback)
                         → Internal model gateway (Release 2+)
                         → Hybrid retrieval (permissions first)
```

## System boundaries

When code exists, keep these folders (names may be refined in the first implementation spec):

- `product/app/` — ColdFusion application, CFCs, REST resources
- `product/ui/` — React + shadcn experience only
- `product/db/` — PostgreSQL migrations, pgvector setup
- `product/ops/` — Pilot backup and restore-verify scripts (no Docker required)
- `product/deploy/` — Compose, CommandBox, air-gap package notes
- Website root — marketing site only; no product APIs

ColdFusion owns authorization, ingestion, workflow, and audit writes. React never talks to PostgreSQL directly and never bypasses RBAC.

- The built React app lives in `product/app/www`. CommandBox serves it from `/` via `spa.cfm`, with the same include under route folders (`/documents/ingestion`, `/search`, `/validation`, `/documents/{id}`, and the other primary nav paths) so browser refresh does not 404. `/api/` stays ColdFusion.
- Authorized preview is `GET /api/viewer.cfm` (JSON metadata and citations) and `GET /api/viewer/page.cfm` (one page image after RBAC). Document bytes do not go through GraphQL or RabbitMQ.
- Job progress SSE is `GET /api/jobs/stream.cfm` (`event: jobs`, contract v1 JSON). No document bytes. `GET /api/jobs.cfm` remains for one-shot refresh.
- Resumable PDF/image upload is ColdFusion (`/api/uploads.cfm`, chunk, complete). tus and Node are not used. Encrypted originals are written only after assemble.

## Storage model

**PostgreSQL (system of record)**

- Organization, site, office, department, section, designation, user, group, role, permission
- Document, DocumentVersion, DocumentClass, metadata schemas and values
- OCR, classification, and extraction result records
- Workflow definitions and instances, tasks, approvals, comments
- AI request/response and citation records (when AI ships)
- Model and prompt-policy registry (`prompt_policies` / `prompt_policy_versions`; ask, classify, and extract load the active body by code)
- Append-only AuditEvent
- Retention, legal hold, shares, connectors, update packages, backup jobs
- `job_controls` sidecar for pause / start / cancel / remove (do not ALTER `ingest_jobs`)
- `ocr_progress` sidecar for live OCR page counts (do not ALTER `ingest_jobs`)

**pgvector**

- Chunk embeddings for semantic and hybrid retrieval
- Always linked to a specific document version
- Lives in the same customer-controlled database boundary as the metadata
- Pilot embeddings are `chunk_embeddings.embedding vector(768)` for Ollama `nomic-embed-text`. The older `document_chunks.embedding vector(1536)` column stays unused (do not ALTER it)

**Object / file storage**

- Encrypted original blobs (immutable)
- Processed derivatives as needed
- Not a substitute for the PostgreSQL record

**Redis**

- Job lists `idochive:jobs` and `idochive:jobs:next`, plus cache
- Not a substitute for PostgreSQL job rows
- Pilot may run without Redis; `POST /api/jobs/tick.cfm` wakes the CommandBox background worker. It does not run OCR on the HTTP thread.

**OpenSearch (optional)**

- Enterprise full-text expansion, not the system of record

## Auth and access model

- Users authenticate through SAML or OIDC. Active Directory or LDAP where required.
- Multi-factor authentication is provided by the identity provider.
- ColdFusion resolves organization, department, group, designation, and record permissions on every mutation and every search or AI retrieval.
- The React UI hides unauthorized actions for usability. It is not the security boundary.
- Restricted collections never enter retrieval context.
- Service accounts are least-privilege and audited.
- The marketing website has no product login.

## AI and background work

- Public AI APIs are not required in production and must not be a production dependency.
- Inference is asynchronous and queue-based.
- High-impact outputs are stored as `pending_review` until an authorized human decides.
- Customer content is not used for training without explicit authorization.
- Long-running OCR and model work must not run inside an HTTP request thread.

## Deployment patterns

- Department pilot: limited collection, named users, measurable acceptance, Compose + CommandBox.
- Enterprise private: customer-controlled HA, identity, SIEM, backup.
- Sovereign air-gapped: no production internet egress, signed offline updates, customer-controlled keys and models, primary and DR sites.

## Invariants

1. Do not publish claims absent from `idochive.md` Sections 31 and 63.
2. Do not ship public SaaS, signup, free trial, or student positioning.
3. Do not revert this track to Laravel + Vue unless the product owner cancels the override.
4. Do not use MySQL. The database layer is PostgreSQL + pgvector.
5. Do not connect air-gapped production to the public internet.
6. Do not call public AI APIs from production paths.
7. Enforce RBAC in ColdFusion at API and query time.
8. High-impact AI or workflow outputs remain `pending_review` until human approval.
9. Audit events are append-only and not editable by application users.
10. Original blobs are immutable. Every derived result links to a document version.
11. Permissions are resolved before search results or AI context are constructed.
12. Do not claim ISO 42001 certified, or automatic PDPL/NCA compliance.
13. Do not claim a HUMAIN partnership.
14. QPS, latency, user, and OCR accuracy figures are targets until a signed benchmark exists.
