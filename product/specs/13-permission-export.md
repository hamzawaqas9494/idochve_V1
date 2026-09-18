# Unit 13 spec: Permission-checked export and Release 1 leftover

## Goal

Unauthorized users cannot read, search, or export another department’s records. A second-department pilot user exists so that can be proven. Delivery-team install notes exist. Compose stays optional and does not use MinIO.

Source: `idochive.md` Section 51 Release 1 exit. Backup restore already passed. No eval set. No published accuracy.

## Design

`GET /api/export.cfm?documentId=` uses the same org/department rule as `DocumentService.listForUser`. If the document is missing or not authorized, the API returns 404 and “Document was not found.” It does not say whether another department holds the file.

The original is decrypted only into a temp file, streamed, then deleted. The on-disk `.bin` is not rewritten. Audit writes `document.exported` with the document id only.

`records.other@nia.example` belongs to a second department in the same organization.

## In scope

- Seed department and other-department officer
- Permission-checked original download
- Documents UI download for authorized rows
- `scripts/permission-tests.ps1`
- `product/docs/install.md`
- Optional Compose: PostgreSQL + pgvector only

## Out of scope

- Bulk ZIP export
- SAML / SIEM
- Making Compose the default
- Customer-labeled eval set

## APIs

- `GET /api/export.cfm?documentId=`
  - 401 when unauthenticated
  - 404 when unauthorized or missing
  - 200 file stream when authorized

## Verify when this unit is done

- [x] Officer A can export one of their documents
- [x] Officer B list/search/ask do not include A’s titles
- [x] Officer B exporting A’s id gets 404
- [x] Unauthenticated export is 401
- [x] On-disk blob is still the encrypted `.bin`
