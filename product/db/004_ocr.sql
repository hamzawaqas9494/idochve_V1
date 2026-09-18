CREATE TABLE IF NOT EXISTS ingest_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    error_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ingest_jobs_status_idx ON ingest_jobs (status, created_at);

CREATE TABLE IF NOT EXISTS ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    engine TEXT NOT NULL,
    language_code TEXT NOT NULL,
    mean_confidence NUMERIC,
    text_content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('accepted', 'needs_validation', 'corrected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ocr_results_status_idx ON ocr_results (status, created_at DESC);

CREATE TABLE IF NOT EXISTS ocr_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ocr_result_id UUID NOT NULL REFERENCES ocr_results(id) ON DELETE CASCADE,
    corrected_text TEXT NOT NULL,
    decided_by UUID NOT NULL REFERENCES users(id),
    decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ingest_jobs IS 'OCR and later processing jobs. HTTP ingest only enqueues.';
COMMENT ON TABLE ocr_results IS 'Derived text only. Never overwrite the encrypted original blob.';
COMMENT ON TABLE ocr_validations IS 'Human corrections for low-confidence or empty OCR.';
