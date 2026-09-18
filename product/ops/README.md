# Pilot backup and restore

These scripts back up the local CommandBox pilot: PostgreSQL `idochive` plus encrypted originals under `product/app/storage/blobs`. Docker is not required. Two-site disaster recovery is out of scope.

Connection settings come from `product/app/.env` (`IDOCHIVE_DB_*`). Scripts never print the database password.

If `CREATE DATABASE` is denied for the app role, set `IDOCHIVE_DB_ADMIN_USER` and `IDOCHIVE_DB_ADMIN_PASSWORD` in `.env` for verify and live restore only.

## Backup

```
pwsh -File product/ops/backup.ps1
```

Creates `product/app/storage/backups/<timestamp>/` with `postgres.dump`, a `blobs` copy, and `manifest.json`. Records `backup_jobs` and `backup.created`.

## Restore test (safe)

```
pwsh -File product/ops/restore-verify.ps1
```

Restores `documents` and `document_versions` from the latest dump into schema `restore_verify`, checks counts and blob keys, writes `product/app/storage/backups/last-restore-verify.json`, then drops the schema. Live `public` tables are not replaced. If `IDOCHIVE_DB_ADMIN_USER` can create databases, the script also restores into `idochive_restore_verify` and drops that database.

## Live restore (destructive)

Use only after an outage decision. This drops the live database.

```
pwsh -File product/ops/restore-live.ps1 -BackupDir product/app/storage/backups/<timestamp> -ConfirmPhrase "REPLACE LIVE IDOCHIVE"
```

Restart CommandBox after a live restore so the datasource reconnects.
