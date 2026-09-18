# Unit 22 spec: Resumable ColdFusion upload

## Goal

An authorized user can upload a PDF or image in chunks, retry missing chunks, then assemble once. ColdFusion remains the API edge. tus, Uppy, and Node are not used. Encrypted originals are written only after the file is complete.

## Design

`upload_sessions` holds metadata. Chunk files live under `product/app/storage/uploads/{id}/` as `{index}.part`. `POST /api/uploads.cfm` starts a session. `POST /api/uploads/chunk.cfm` stores one chunk. `GET /api/uploads.cfm?uploadId=` reports `receivedIndexes`. `POST /api/uploads/complete.cfm` concatenates parts and calls `DocumentService.create`. Other users receive the 404 copy `Upload was not found.`

## In scope

- PDF and image MIME allowlist
- Chunk size 32 bytes–1 MiB, file size cap 100 MiB
- Ingestion Center uses chunked upload for files 64 KiB and larger
- Existing `POST /api/documents.cfm` multipart remains for small files and current tests

## Out of scope

- tus protocol, Node edge, Office/ZIP/email, threat scan
