# Unit 07 spec: Backup and restore

## Goal

Give the delivery team a repeatable backup of the pilot system of record and encrypted originals, plus a restore test that does not replace the live database. A passing restore test is a Release 1 acceptance gate.

Source: `idochive.md` Section 36 backup and restore, Section 51 Release 1 exit (“Restore test passes”), Section 52 `BackupJob`. Two-site disaster recovery stays in Release 4.

## Design

A backup is a timestamped folder under `product/app/storage/backups/`:

1. PostgreSQL custom-format dump of the live `idochive` database
2. Copy of `product/app/storage/blobs`
3. `manifest.json` with counts only (no secrets, no other-department hints)

`product/ops/backup.ps1` writes the folder and a `backup_jobs` row. `product/ops/restore-verify.ps1` restores `documents` and `document_versions` from that dump into a throwaway schema `restore_verify`, checks counts and blob keys, then drops the schema. Live `public` tables and the live blob directory are not replaced.

The `idochive` role cannot `CREATE DATABASE` on this pilot. When `IDOCHIVE_DB_ADMIN_USER` is set and can create databases, the script also restores the full dump into `idochive_restore_verify` and drops that database.

`product/ops/restore-live.ps1` is documented for a real recovery. It refuses to run unless the operator passes an explicit confirmation phrase. This unit does not execute a live replace.

The ColdFusion API lists jobs. It does not run `pg_dump` or drop databases on an HTTP request.

## In scope

- Pilot backup of PostgreSQL + encrypted blobs
- Manifest with document, version, and blob counts
- Non-destructive restore verification into schema `restore_verify` (full database restore when an admin role can create `idochive_restore_verify`)
- `backup_jobs` rows and `backup.created` / `backup.restore_verified` audit events
- Backup status UI
- Operator runbook in `product/ops/README.md`

## Out of scope

- Two-site disaster recovery
- Customer backup-platform connectors
- One-click restore from the browser
- Published RPO or RTO figures
- Docker or Compose packaging
- RAG, embeddings, public AI APIs
- Marketing website

## APIs

- `GET /api/backup.cfm`
  - `jobs`: recent `backup_jobs` rows
  - `live`: current document, version, and blob counts on the running pilot

## Operator commands

```
pwsh -File product/ops/backup.ps1
pwsh -File product/ops/restore-verify.ps1
```

Live replace (manual recovery only):

```
pwsh -File product/ops/restore-live.ps1 -ConfirmPhrase "REPLACE LIVE IDOCHIVE"
```

## Verify when this unit is done

- [x] `backup.ps1` creates a dump, blob copy, and manifest
- [x] `restore-verify.ps1` restores dump rows into `restore_verify` and then drops that schema
- [x] Live `idochive` document count is unchanged after verify
- [x] Restored versions have matching encrypted blob files
- [x] `backup.created` and `backup.restore_verified` appear in the audit log
- [x] The verify script never requires a public AI API
