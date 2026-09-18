# Unit 21 spec: ColdFusion job progress SSE

## Goal

The Ingestion Center receives authorized job progress over `text/event-stream` so the UI does not need a 5 second poll. Events reuse job contract v1. Document bytes, blob keys, and OCR full text are never streamed. GraphQL is not used.

## Design

`GET /api/jobs/stream.cfm?filter=all` authenticates, snapshots org/department/tick rights, then queries `JobService.listForUser` on a timer. Each change is one `event: jobs` with the same JSON envelope as `GET /api/jobs.cfm`. Unchanged snapshots send an SSE comment keepalive. The request ends after about 30 seconds so the browser reconnects. `sessionCommit()` runs after the snapshot so the stream does not hold the session lock for uploads and job control.

## In scope

- SSE endpoint on ColdFusion
- Ingestion Center `EventSource` with poll fallback
- Permission and ingestion assertions (401, other-department isolation, no blob bytes)

## Out of scope

- GraphQL SSE, Valkey pub/sub, Node edge, RabbitMQ
- Streaming preview images or originals
