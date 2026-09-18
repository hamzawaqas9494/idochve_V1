# Architecture Context

## Stack

| Layer | Technology | Role |
| --- | --- | --- |
| Marketing framework | Vite + React + TypeScript | Public website runtime only |
| Marketing UI | Tailwind CSS + CSS tokens | Layout, theme, responsive design |
| Routing | React Router | Localized marketing routes |
| Copy | i18next + JSON locales | English and Arabic strings |
| Motion | Motion + CSS transitions | Pipeline, diagrams, microinteractions |
| Form validation | Zod | Qualification form boundary |
| SEO | react-helmet-async + static prerender | Titles, OG, JSON-LD |
| Product UI (later, not this repo) | Vue 3 + Inertia | Customer-facing product application |
| Product application (later) | Laravel | System and policy control plane |
| Product database (later) | PostgreSQL + pgvector | System of record and embeddings |

## System Boundaries

- `src/pages/` — marketing routes only
- `src/components/` — reusable marketing UI
- `src/diagrams/` — architecture and topology visuals
- `src/mockups/` — synthetic product chrome
- `src/locales/` — all user-facing copy
- `context/` — agent operating system
- `idochive.md` — product truth; do not treat as code to rewrite

## Storage Model

Website:

- Static locale JSON for copy
- Form submissions POST to `VITE_FORM_ENDPOINT` only when configured
- No website database

Product (diagrams and later build only):

- **PostgreSQL**: documents, metadata, versions, permissions, workflows, approvals, audit events, model registry
- **pgvector**: chunk embeddings for semantic and hybrid retrieval
- **Object storage**: encrypted original files
- **Redis**: cache and queues
- **OpenSearch**: optional enterprise full-text expansion

## Auth and Access Model

- The marketing site has no user accounts and no sign-up.
- Product authentication (SAML/OIDC, query-time RBAC) is described and mocked, not implemented here.

## Invariants

1. Do not publish claims absent from `idochive.md` Sections 31 and 63.
2. Do not show public SaaS, signup, free trial, or student positioning.
3. Do not label the product UI as React. Product UI is Vue 3 / Inertia.
4. Do not show MySQL as current. Database layer is PostgreSQL + pgvector.
5. Do not connect air-gapped diagrams to the public internet.
6. Do not show a fake form success when no backend is configured.
7. Do not publish ISO 42001 as certified, or PDPL/NCA as automatic compliance.
8. Do not claim a HUMAIN partnership.
