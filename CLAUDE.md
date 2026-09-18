# iDocHive Agent Entry Point

This repository contains a partially built iDocHive application. Preserve working behavior and migrate incrementally.

Before planning or editing, read these files in order:

1. `context/project-overview.md`
2. `context/architecture.md`
3. `context/ui-context.md`
4. `context/code-standards.md`
5. `context/ai-workflow-rules.md`
6. `context/progress-tracker.md`

Then inspect the source files, package manifests, build scripts, migrations, tests, and deployment files related to the task.

Never treat target architecture as proof of current implementation.

For the first migration session:

- Perform Phase 0 current-state audit only.
- Make no runtime-code changes.
- Classify each major area as keep, adapt, replace, or defer.
- Cite repository paths for every finding.
- Run existing checks without changing dependencies where safe.
- Update `context/progress-tracker.md` with verified facts.
- Present the smallest safe vertical slice for approval.

Non-negotiable constraints:

- Sovereign and air-gapped production.
- No required public AI, OCR, storage, telemetry, or licensing dependency.
- Workload range from zero or one file per day to one million pages per day after benchmark acceptance.
- Authorization before retrieval, preview, download, export, and realtime delivery.
- Immutable encrypted originals, human approval, citations, and complete audit evidence.
- No full rewrite.
- No document bytes through GraphQL or RabbitMQ.
- No long-running OCR or queue work in HTTP or ColdFusion request threads.

Update `context/progress-tracker.md` after every meaningful change. Update the relevant context file before continuing when implementation changes scope, architecture, UI rules, or standards.
