CREATE TABLE IF NOT EXISTS ocr_progress (
    ingest_job_id UUID PRIMARY KEY REFERENCES ingest_jobs(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    current_page INTEGER NOT NULL DEFAULT 0 CHECK (current_page >= 0),
    total_pages INTEGER NOT NULL DEFAULT 0 CHECK (total_pages >= 0),
    elapsed_ms INTEGER NOT NULL DEFAULT 0 CHECK (elapsed_ms >= 0),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ocr_progress_document_idx ON ocr_progress (document_id);

COMMENT ON TABLE ocr_progress IS 'Live OCR page counts. Do not ALTER ingest_jobs.';
