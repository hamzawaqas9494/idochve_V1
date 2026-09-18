# Unit 01 spec: Sovereign Foundation (Release 1)

## Goal

Define what Release 1 must prove before any department pilot is accepted. This file is an acceptance spec. It does not authorize implementation by itself.

Source: `idochive.md` Section 51 Release 1, Section 36 must-have items that belong in the foundation, and Section 38 steps 1–4 and 10–14 without RAG.

## Design

Release 1 is a governed document system of record with intake, OCR, validation, versioning, approval, keyword/metadata search, and audit. It runs in a customer-controlled pilot (Compose + CommandBox). It does not require a public AI API. It does not include semantic RAG until Release 2.

The React UI follows `context/ui-context.md`. The ColdFusion API is the security boundary.

## In scope

- Organization hierarchy and RBAC at API and query time
- SAML or OIDC (or an approved pilot identity path) and AD/LDAP where required
- Document repository and metadata
- Bulk upload and controlled batch ingestion
- Encrypted original storage (immutable blob)
- OCR engine gateway and human validation queues
- Versioning and lock-after-approval
- Immutable approval and comment history
- Keyword and metadata search with permission filtering
- Append-only audit log for access, ingest, workflow, and administration
- Backup and restore
- Pilot install documentation for the delivery team

## Out of scope for Release 1

- Embeddings, hybrid RAG, source-grounded Q&A
- Model registry and prompt policy
- Public SaaS and signup
- Mobile application
- Published performance claims
- Marketing website changes

## Implementation notes (for the future code units)

### ColdFusion

- REST resources for identity context, documents, ingest jobs, tasks, search, and audit
- Authorize before query construction
- Enqueue OCR; do not block HTTP on engine runtime

### PostgreSQL + pgvector

- Release 1 can enable the pgvector extension so Release 2 does not migrate the database family
- Release 1 search does not require embeddings to be populated
- All document rows remain in PostgreSQL

### React

- Screens: Home dashboard, Documents, Search, Workflows/Tasks, Audit, Administration
- Synthetic labels only until APIs exist
- English and Arabic strings in locale files

### Deploy

- Lucee 6 + CommandBox + PostgreSQL + object storage in Compose
- Signed-update design is documented; full air-gap packaging may land with Release 4

## Exit criteria (from Section 51)

Release 1 is accepted only when all of the following are true:

1. One paid-pilot-style acceptance plan can be executed on a controlled collection (even if the first run is internal/synthetic).
2. Permission tests pass: unauthorized users cannot read, search, or export another department’s records.
3. A backup restore test passes on the pilot topology.
4. Product documentation supports independent installation by the delivery team without the original engineer present.

## Additional verification

- [x] Original blob remains immutable after OCR and metadata edits
- [x] Low-confidence OCR enters a human validation queue
- [x] `pending_review` / `approved` / `rejected` / `changes_requested` exist as workflow states
- [x] Audit events cannot be edited by application users
- [x] No production path calls a public AI API
- [x] No MySQL dependency
- [x] A backup restore test passes on the pilot topology (Unit 7; schema `restore_verify`, live counts unchanged)
- [x] Air-gapped notes state no required internet egress for production use of the already-installed pilot (`product/docs/install.md`)
- [x] Permission tests: other department cannot read, search, ask, or export (Unit 13; `scripts/permission-tests.ps1`)

## Dependencies

None for this documentation file. Future code units depend on Unit 00 docs and then Units 1–7 in `00-build-plan.md`.
