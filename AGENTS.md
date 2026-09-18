# iDocHive Project Instructions

Read these canonical context files before planning or editing:

1. `context/project-overview.md`
2. `context/architecture.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

This repository is partially built. Inspect current code before proposing changes. Preserve working behavior. Use keep, adapt, replace, and defer decisions. Migrate one vertical slice at a time.

The first session performs Phase 0 audit only. Do not edit runtime code until the audit and first unit receive approval.

Non-negotiable product constraints:

- Sovereign and air-gapped production.
- No required public AI, OCR, storage, telemetry, identity, or license call.
- Workload envelope from zero or one file per day to one million pages per day after benchmark acceptance.
- PostgreSQL and object storage preserve durable truth.
- RabbitMQ distributes reliable work.
- Valkey stores reconstructable cache and realtime fan-out only.
- Node.js owns the API edge, uploads, outbox dispatch, and GraphQL SSE.
- ColdFusion or Lucee owns approved existing business rules and legacy integration.
- Python workers own preprocessing, OCR, extraction, and embeddings.
- Authorization occurs before retrieval and delivery.
- Originals remain encrypted and immutable.
- Policy-controlled output requires human approval and source citations.

Update `context/progress-tracker.md` after every meaningful change.
