# Unit 05 spec: Versioning, approval, and immutable comments

## Goal

Let an authorized reviewer approve, reject, or request changes on a document version. Approved records lock. Comments and approval history are append-only. Encrypted originals stay immutable.

Source: `idochive.md` Section 36 workflow, Section 38 steps 10–14, Section 52 data rules. Stack remains ColdFusion + React + PostgreSQL + pgvector.

## Design

Each ingest or replacement version starts a `workflow_tasks` row in `pending_review`. An approver (or records officer / security admin) records a decision with optional comment. `approved` sets `documents.locked` and writes `approved_by` / `decided_at`. Locked documents cannot receive a new version. `changes_requested` or `rejected` leave the document unlocked so a new encrypted version can be stored; older versions and blobs are not overwritten.

Comments are insert-only. The API has no update or delete for comments or audit events.

## In scope

- Latest workflow state on the document list
- Task inbox: `pending_review` items the caller may see
- Decisions: `approved` | `rejected` | `changes_requested`
- Lock-after-approval
- New version only when unlocked and the latest decision is not `approved`
- Immutable `document_comments`
- Audit: `workflow.approved`, `workflow.rejected`, `workflow.changes_requested`, `workflow.commented`, `version.created`

## Out of scope

- Delegation, SLA timers, e-signature
- Keyword search (Unit 6)
- Backup/restore (Unit 7)
- RAG, embeddings, `pending_review` AI
- Marketing website

## APIs

- `GET /api/documents.cfm` — include `workflowState`, `locked`, `openTaskId`
- `POST /api/documents.cfm` — existing ingest; reject if used as a version on a locked id
- `POST /api/versions.cfm` — `{ documentId }` plus `file`; creates version N+1 and a new `pending_review` task
- `GET /api/tasks.cfm` — open tasks
- `POST /api/tasks.cfm` — `{ id, state, comment }`
- `GET /api/comments.cfm?documentId=` — append-only history
- `POST /api/comments.cfm` — `{ documentId, body }`

## Verify when this unit is done

- [x] Approve a pending document; it is locked; a new version is refused
- [x] Request changes; a new version is stored as v2; v1 blob is unchanged
- [x] Comments can be added and listed; they cannot be edited through the API
- [x] Audit events append for decisions and comments
- [x] No public AI API is required
