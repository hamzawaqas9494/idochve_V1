# Code Standards

## General

- Keep modules single-purpose.
- Fix root causes. Do not layer workarounds.
- Do not mix marketing runtime with product-application code.
- One system boundary per unit.

## TypeScript

- Strict mode is required.
- Do not use `any`.
- Validate unknown external input at the form boundary with Zod.

## React / Vite

- Function components and hooks only.
- Keep user-facing strings in locale files.
- Lazy-load heavy diagrams and the video modal.
- Prefer CSS for microinteractions. Use Motion only for pipeline, sticky process, and topology.

## Styling

- Use CSS custom property tokens. No hardcoded hex in components.
- Use logical CSS for RTL.
- Respect `prefers-reduced-motion`.

## Forms

- Validate before submit.
- Never show success unless a real 2xx is received.
- If `VITE_FORM_ENDPOINT` is unset, disable submit and point to `business@idochive.com`.
- Do not accept confidential file uploads.

## Data and Storage

- Website has no database.
- Product diagrams must name PostgreSQL + pgvector.
- Encrypted originals belong in object storage in product diagrams, not in the database node.

## File Organization

- `src/pages/` — routes
- `src/components/` — shared UI
- `src/diagrams/` — SVG and interactive visuals
- `src/mockups/` — synthetic product chrome
- `src/locales/` — EN/AR copy
- `src/lib/` — seo, schema, utilities
