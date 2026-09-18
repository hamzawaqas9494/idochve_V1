# iDocHive Cursor Start Guide

## Purpose

This pack turns the Six-File Context System into an execution control layer for the partially built iDocHive repository. It gives Cursor the target product, architecture, UI, standards, workflow, and verified progress state without asking the agent to rewrite working code.

## Install the Files

Place the files in the project root using this structure:

```text
your-project/
  .cursor/
    rules/
      idochive-core.mdc
  context/
    project-overview.md
    architecture.md
    ui-context.md
    code-standards.md
    ai-workflow-rules.md
    progress-tracker.md
  AGENTS.md
  CLAUDE.md
  CURSOR-START-HERE.md
```

Keep existing source, package files, migrations, deployment files, and git history unchanged when installing this pack.

## Prepare Cursor

1. Open the real project root in Cursor.
2. Allow codebase indexing to finish.
3. Confirm `.cursor/rules/idochive-core.mdc` appears under Cursor project rules.
4. Keep the rule set to Always Apply.
5. Open a new Agent conversation in Plan mode.
6. Paste the Phase 0 prompt below.
7. Review the audit before authorizing runtime changes.
8. Use Cursor Auto for implementation only after approving one vertical slice.
9. Commit each completed and verified unit separately.

## Phase 0 Prompt for Cursor Plan Mode

```text
You are working inside an existing, partially built iDocHive repository.

Read and follow .cursor/rules/idochive-core.mdc.
Read the six files under context in their required order.
Read AGENTS.md if present.

This first task is an evidence-based current-state audit. Do not modify runtime code, dependencies, database schema, infrastructure, or generated files.

Inspect the repository and determine:

1. Repository structure, workspaces, languages, runtimes, package manager, and lockfiles.
2. Current frontend framework, routes, UI library, state management, upload flow, document viewer, search, validation, workflows, and audit screens.
3. Current Node.js, ColdFusion, Lucee, Java, Python, Laravel, Vue, or other backend modules.
4. Current authentication, authorization, tenant, department, classification, and role enforcement.
5. Current database, schema, migrations, object storage, cache, queue, workers, realtime, OCR, extraction, search, and AI integrations.
6. Existing Docker, Kubernetes, CI, tests, logging, metrics, tracing, secrets, backup, and air-gap assets.
7. Working, partial, duplicated, legacy, unsafe, missing, and dead code.
8. Current commands for install, lint, type check, unit tests, integration tests, build, and local startup.

Run existing read-only or non-mutating checks where safe. Do not install new packages during this audit.

For every finding, cite the exact repository path and relevant symbol, configuration key, or script.

Produce:

A. An executive summary.
B. A current architecture map.
C. A target-gap matrix with Keep, Adapt, Replace, or Defer status.
D. Security and data-sovereignty gaps.
E. Performance, reliability, scalability, and maintainability gaps.
F. Risks related to the zero-file to one-million-page daily workload envelope.
G. A dependency and license inventory.
H. A proposed migration sequence made of small vertical slices.
I. The first recommended implementation unit with affected files, tests, rollback, and acceptance criteria.
J. Open decisions requiring owner approval.

Update context/progress-tracker.md only with verified repository facts and the proposed next unit. Do not claim any feature works unless source evidence and a test or runnable check support the claim.

Stop after presenting the audit and migration plan. Wait for approval before implementation.
```

## Prompt to Convert the Audit into a Build Plan

Use this after reviewing Phase 0:

```text
Use the approved Phase 0 audit and the six context files.

Create a phased migration plan. Preserve working behavior. Use a strangler migration instead of a rewrite.

For each phase, include:

1. User or operator outcome.
2. Existing modules retained.
3. Modules adapted or replaced.
4. Contracts and data migrations.
5. Security controls.
6. Failure and rollback path.
7. Tests and observability.
8. Acceptance criteria.
9. Estimated implementation complexity: S, M, L, or XL.
10. Dependencies on earlier phases.

Use this target order unless repository evidence requires a safer sequence:

Phase 1: baseline stabilization and shared contracts.
Phase 2: one-file resumable ingestion vertical slice.
Phase 3: RabbitMQ, page jobs, OCR Gateway, and real progress.
Phase 4: human validation and atomic search publication.
Phase 5: permission-aware search, document preview, page jump, and citations.
Phase 6: folder, manifest, connector, and archive-scale ingestion.
Phase 7: KEDA scaling, backpressure, load testing, and capacity evidence.
Phase 8: sovereign production hardening, offline installation, HA, backup, DR, and SIEM.

Do not install every target component at once. Introduce infrastructure only when an approved vertical slice uses it.

Write the plan to specs/0001-migration-plan.md. Update context/progress-tracker.md. Stop before runtime implementation.
```

## Prompt for Each Implementation Unit

```text
Read the six context files and the approved current spec.

Implement only the next incomplete unit in context/progress-tracker.md.

Before editing, report:

1. Goal.
2. Current code evidence.
3. Files to change.
4. Contract or migration impact.
5. Security and authorization checks.
6. Failure, retry, and rollback behavior.
7. Tests to run.

Then implement the smallest complete vertical slice.

Rules:

- Preserve unrelated behavior.
- Do not rewrite working modules.
- Do not add unapproved public-cloud dependencies.
- Do not send document bytes through GraphQL or RabbitMQ.
- Do not place durable truth only in Valkey.
- Do not run OCR in request threads.
- Do not fake progress.
- Keep all workers idempotent.
- Enforce tenant, department, role, and document policy before data access.

After implementation:

1. Review the diff.
2. Run formatting, lint, type checks, focused tests, integration tests, and production build relevant to the change.
3. Report exact pass, fail, or not-run status.
4. Update context/progress-tracker.md.
5. Update other context files only when a decision changed.
6. Stop. Do not begin the next unit.
```

## First Recommended Vertical Slice

After the audit, prefer one document from browser selection to visible persisted status:

```text
React upload row
  -> Uppy and Tus
  -> tusd quarantine object
  -> signed completion hook
  -> Node.js policy validation
  -> PostgreSQL document, job, audit, and outbox transaction
  -> GraphQL query and SSE status
  -> shadcn/ui queue row
```

This slice proves UI, security, upload, storage, database, outbox, and realtime contracts before OCR infrastructure enters the critical path.

## Second Vertical Slice

Process the accepted document through one real OCR path:

```text
PostgreSQL outbox
  -> RabbitMQ
  -> document inspection
  -> trusted-text decision
  -> page splitting
  -> OCR Gateway
  -> PaddleOCR or Tesseract
  -> normalized page result
  -> persisted progress
  -> GraphQL SSE
  -> validation or ready state
```

Prove duplicate delivery, worker restart, page retry, dead-letter recovery, and real progress before adding bulk autoscaling.

## Git Discipline

Use one branch for architecture migration. Use one commit per verified unit. Suggested commit sequence:

```text
docs(context): install iDocHive six-file control system
docs(audit): record current repository architecture
chore(contracts): establish versioned document job contracts
feat(ingestion): add resumable single-document intake
feat(processing): add idempotent page OCR pipeline
feat(validation): add governed review and approval
feat(search): add authorized location-aware retrieval
perf(bulk): add queue scaling and backpressure
chore(airgap): add offline production evidence pack
```

Never combine unrelated refactors with a feature migration commit.
