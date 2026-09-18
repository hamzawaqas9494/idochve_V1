# Product AI Workflow Rules

## Approach

Build incrementally against specs. `idochive.md` and `product/context/` define the system. Do not invent product behavior.

This pass is documentation only. Do not generate ColdFusion, React, SQL, or Docker files unless the user explicitly asks to implement a numbered unit.

## Scoping rules

- Work on one spec unit at a time.
- Do not mix marketing-site changes with product work.
- Do not install a package until the unit that first needs it.
- Do not start Release 2 RAG work before Release 1 foundation exists.

## When to split work

Split if a step combines UI, schema, and background workers, or if it cannot be verified quickly.

## Missing requirements

- Do not invent customers, prices, partnerships, certifications, or performance numbers.
- If a claim is ambiguous, resolve it against `idochive.md` Sections 31 and 63.
- If a requirement is missing, add it to `progress-tracker.md` before continuing.

## Protected files

Do not modify unless explicitly instructed:

- `idochive.md`
- Root `README.md` (playbook, not product copy)
- Root marketing `src/` and website `context/`
- This plan’s commercial or customer sections in `idochive.md`

## Docs in sync

If a future implementation changes stack, storage, or scope, update `architecture.md` and `progress-tracker.md` in the same session.

## Before moving to the next unit

1. The current unit matches its spec.
2. No invariant in `architecture.md` was violated.
3. `progress-tracker.md` is current.
4. For code units: the agreed build or test command passes.
