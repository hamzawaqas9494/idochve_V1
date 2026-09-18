---
name: idochive-shadcn
description: Build iDocHive product UI with shadcn/ui, design tokens, and honest job-control APIs. Use when editing product/ui pages, adding components, or wiring Ingestion Center actions.
---

# iDocHive shadcn/ui

## Scope

Use this skill only for `product/ui`. Do not copy marketing `src/`, Ghost AI, Clerk, or Next.js patterns.

## Tokens

Map every color to `product/context/ui-context.md` variables. No raw hex in components.

- Navy chrome: `--navy-950`, `--navy-900`
- Actions: `--blue-600`, `--teal-600`, `--violet-600`
- Status: `--success`, `--amber`, `--danger`
- Surfaces: `--paper-50`, `--white`, `--border`, `--ink`, `--muted`

Icons are lucide-react stroke icons only. No robots or decorative AI art.

## Components

Add primitives under `product/ui/src/components/ui`. Import with `@/`. Keep 44px targets on new controls. Respect `prefers-reduced-motion`. Pair color with a text label.

## Jobs

Job actions call `POST /api/jobs/control.cfm` with `pause|start|cancel|remove`. Never invent page counts, ETAs, or pause-during-OCR. Ready uses export download. Needs validation opens Validation. Subscribe to `GET /api/jobs/stream.cfm`; fall back to `GET /api/jobs.cfm`. Do not tick on poll or on SSE. Files 64 KiB and larger use `POST /api/uploads.cfm` chunks; smaller files still post to `/api/documents.cfm`.

Redis is the approved queue. Kafka and other brokers are out of scope for the pilot.
