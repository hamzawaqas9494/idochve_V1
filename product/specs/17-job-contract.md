# Unit 17 spec: Job and document JSON contract v1

## Goal

Freeze the authenticated JSON envelopes for ingestion jobs and document create/list so a later adapter (Node edge, tests, UI) can depend on named fields. ColdFusion remains the API. Document bytes stay off this JSON.

## Contract version

Envelope field `contractVersion` is the string `"1"`. Additive optional fields are allowed. Removing or renaming a required field requires `"2"` and a migration note.

## `GET /api/jobs.cfm?filter=all|active|review|ready`

Authenticated. Same org/department rule as `DocumentService.listForUser`.

Required envelope:

- `contractVersion` — `"1"`
- `items` — array of job rows
- `counts.active`, `counts.review`, `counts.ready` — numbers
- `canTick` — boolean

Optional envelope:

- `queue.engine`, `queue.available`, `queue.depth`

Required on every item (values may be JSON null):

- `id`
- `documentId`
- `fileName`
- `state`
- `label`
- `message`
- `overallProgress`
- `currentPage`
- `totalPages`

`estimatedSeconds` may be null until at least one OCR page has a measured duration.

Page progress: when `state` is `ocr_processing` and `totalPages` is a positive number, `message` uses `Reading page N of M` and `overallProgress` stays in the OCR band (40–75).

## `GET /api/documents.cfm`

Required envelope: `contractVersion` `"1"`, `documents` array. Each document has `id` and `title`.

## `POST /api/documents.cfm`

Required envelope: `contractVersion` `"1"`, `id` (first stored document), `state`, optional `documents` array of `{ id, state }`.

## Out of scope

GraphQL, RabbitMQ, Node, tus. ColdFusion SSE for jobs is Unit 21. Resumable CF chunks are Unit 22.
