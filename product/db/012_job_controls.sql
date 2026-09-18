CREATE TABLE IF NOT EXISTS job_controls (
    document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    ingest_job_id UUID REFERENCES ingest_jobs(id) ON DELETE SET NULL,
    command TEXT NOT NULL CHECK (command IN ('active', 'paused', 'cancelled', 'removed')),
    run_next BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_controls_command_idx ON job_controls (command);
CREATE INDEX IF NOT EXISTS job_controls_run_next_idx ON job_controls (run_next) WHERE run_next = true;

COMMENT ON TABLE job_controls IS 'Pause, start, cancel, and remove. Do not ALTER ingest_jobs.';
