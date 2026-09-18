# Product Code Standards

These rules apply when implementation starts. This docs pass does not create application code.

## General

- Keep ColdFusion policy code and React presentation separate.
- Fix root causes. Do not layer workarounds.
- One spec unit at a time.
- User-facing strings are locale-ready for English and Arabic from the first UI unit.

## ColdFusion

- Prefer Lucee 6 locally via CommandBox. Keep Adobe ColdFusion differences behind a small compatibility note, not forked business logic.
- Expose versioned REST resources. One resource family per CFC module.
- Validate and authorize before any mutation or retrieval.
- Return consistent JSON error shapes. Do not leak secrets or SQL in errors.
- Do not run OCR or model inference inside the request thread.
- Use parameterized queries only. No string-concatenated SQL.
- Write an audit event for ingest, access, search, inference, approval, export, and admin changes.

## React

- TypeScript strict mode. No `any`.
- Function components. Talk to ColdFusion APIs only.
- No raw SQL, no direct PostgreSQL drivers, no embedded credentials.
- Validate unknown API payloads at the UI boundary (Zod or equivalent).
- Use CSS tokens from `ui-context.md`. No raw hex in components.
- Logical CSS for RTL (`ps` / `pe`, `start` / `end`).
- Respect `prefers-reduced-motion`.

## Data

- Metadata and relationships belong in PostgreSQL.
- Embeddings belong in pgvector and must reference a document version.
- Large originals belong in object storage.
- Do not store large binaries in PostgreSQL.
- Do not use MySQL.

## Testing expectations (Release 1)

- Role-matrix permission tests
- Search filtering tests
- Backup restore test
- No critical unresolved vulnerability at release
