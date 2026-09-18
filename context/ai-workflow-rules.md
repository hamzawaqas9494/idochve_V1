# AI Workflow Rules

## Approach

Build this project incrementally using a spec-driven workflow. Context files and `idochive.md` define what to build. Implement against those specs. Do not infer or invent product behavior.

## Scoping Rules

- Work on one feature unit at a time.
- Prefer small, verifiable increments.
- Do not combine unrelated system boundaries in a single step.
- Do not start the Laravel product application in this repository.

## When to Split Work

Split if a step combines page content with new infrastructure, or if a change cannot be verified quickly.

## Handling Missing Requirements

- Do not invent customers, prices, partnerships, certifications, or performance numbers.
- If a claim is ambiguous, resolve it against `idochive.md` Sections 31 and 63.
- If a requirement is missing, add it as an open question in `progress-tracker.md`.

## Protected Files

Do not modify unless explicitly instructed:

- `idochive.md`
- `README.md` (method playbook, not product copy)
- Generated lockfile contents except via package install

## Keeping Docs in Sync

Update the relevant context file when architecture, storage, conventions, or scope change.

## Before Moving to the Next Unit

1. The current unit works within its defined scope.
2. No invariant in `architecture.md` was violated.
3. `progress-tracker.md` reflects the completed work.
4. The production build passes.
