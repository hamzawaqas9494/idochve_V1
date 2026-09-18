CREATE TABLE IF NOT EXISTS backup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kind TEXT NOT NULL CHECK (kind IN ('backup', 'restore_verify')),
    status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'verified')),
    archive_dir TEXT NOT NULL,
    document_count INTEGER,
    version_count INTEGER,
    blob_count INTEGER,
    detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS backup_jobs_started_idx ON backup_jobs (started_at DESC);

COMMENT ON TABLE backup_jobs IS 'Pilot backup and restore-verify jobs. Two-site DR is out of scope for Release 1.';
