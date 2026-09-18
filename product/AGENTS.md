## iDocHive Product Building Context

This directory specifies the **iDocHive product application**, not the marketing website.

Stack override (do not revert to Laravel + Vue 3 / Inertia unless the product owner explicitly cancels this decision):

- React experience layer
- ColdFusion application and policy plane (Lucee 6 + CommandBox default; Adobe ColdFusion alternate)
- PostgreSQL + pgvector database layer

Read the following files in order before implementing or making any architectural decision:

1. `../idochive.md` — product definition, claims, security, and confidentiality
2. `context/project-overview.md` — what we are building and what is out of scope
3. `context/architecture.md` — stack, boundaries, storage, auth, invariants
4. `context/ui-context.md` — product UI tokens and layout
5. `context/code-standards.md` — ColdFusion and React conventions
6. `context/ai-workflow-rules.md` — spec-driven rules
7. `context/progress-tracker.md` — current phase
8. `specs/00-build-plan.md` — unit order
9. `specs/01-sovereign-foundation.md` — Release 1 acceptance

Update `context/progress-tracker.md` after each meaningful change.

Do not invent customers, prices, partnerships, certifications, or performance claims.
Do not start coding until a unit spec exists and the user asks to implement it.
Do not modify the marketing website unless explicitly instructed.
Use `../README.md` for local setup. Do not treat `../templates/` or Ghost AI playbooks as product requirements.
