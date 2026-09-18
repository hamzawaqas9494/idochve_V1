# iDocHive Product Overview

## One-sentence definition

iDocHive converts sensitive enterprise documents and archives into governed, permission-aware, searchable, and AI-ready organizational knowledge inside the customer’s controlled environment.

## Who it is for

Government CIOs and CISOs, records and archive directors, construction document-control leaders, legal and compliance owners, and systems integrators delivering on-premise, private, sovereign-cloud, or air-gapped deployments.

It is not for students, individual users, or public self-service signup.

## Core user flow

1. An authorized user or service uploads or bulk-imports a document into a controlled collection.
2. The encrypted original is stored immutably in customer-controlled object storage.
3. OCR, classification, and extraction run through internal gateways. Low-confidence results enter human validation.
4. Metadata, versions, and permissions are written to PostgreSQL. Approved embeddings go to pgvector.
5. An authorized user searches or asks a question. Retrieval applies RBAC at query time.
6. Answers include citations to authorized sources only.
7. High-impact outputs stay in `pending_review` until a human approves, rejects, or requests changes.
8. Access, inference, approval, and export events are append-only audit records.

## Goals

1. Keep documents, models, keys, prompts, responses, and audit events inside the customer boundary.
2. Enforce permissions in the ColdFusion API and retrieval path, not only in the React UI.
3. Return source-grounded answers or a safe refusal.
4. Support Arabic and English document processing as a priority.
5. Install as a department pilot with a documented path to air-gapped production.

## Features

### Release 1 — sovereign foundation (in scope for the first build, not this docs pass)

- Organization, department, section, designation, group, and user model
- SAML or OIDC, plus Active Directory or LDAP where required
- RBAC at API and query time
- Document repository, metadata, versioning
- Bulk ingest and controlled batch intake
- Encrypted original storage
- OCR engine gateway
- Human validation queues
- Workflow approval and lock-after-approval
- Immutable comments and approval history
- Keyword and metadata search
- Append-only audit log
- Backup and restore
- Docker Compose / CommandBox pilot package

### Release 2 and later (out of scope until specified)

- Classification and structured extraction pipelines
- pgvector embeddings, hybrid search, source-grounded Q&A
- Model registry, prompt policy, `pending_review` AI state
- SIEM connector, customer-managed keys, two-site DR
- Mobile application, public SaaS, self-service signup

## Scope

### In scope for this documentation pass

- Product context files and architecture specs only
- Stack: ColdFusion + React + PostgreSQL + pgvector

### Out of scope

- Application code
- Marketing website changes
- Public multi-tenant SaaS
- Sign up, register, free trial
- Named customers, revenue, pipeline, or internal prices
- HUMAIN partnership claims
- Published QPS, latency, or OCR accuracy figures

## Success criteria for this docs pass

1. A new session can resume from `product/AGENTS.md` without guessing the stack.
2. Storage, auth, and invariants are explicit.
3. Release 1 acceptance is written so implementation can start from specs, not from vibe.
