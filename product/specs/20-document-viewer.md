# Unit 20 spec: Authorized document viewer

## Goal

An authorized user can open a document they already may list, jump to a page, and read source excerpts. Preview bytes come from ColdFusion after RBAC. Encrypted originals stay immutable. No GraphQL. No document bytes on the job bus.

## Design

`GET /api/viewer.cfm` returns metadata and citations after `DocumentService.canAccess`. `GET /api/viewer/page.cfm` decrypts the original, rasterizes one PDF page with `pdftoppm` (150 DPI), or streams an image original. Other-department and missing ids use the export 404 copy. Audit `document.viewed` and `document.previewed`.

## In scope

- Viewer route `/documents/{id}?page=`
- Page jump and citations panel
- Links from All Documents, Search, Intelligence citations, and Ingestion View record
- Permission tests

## Out of scope

- GraphQL, SSE, tus, Node edge
- Office/ZIP/email preview
- Storing decrypted files in `www/`
