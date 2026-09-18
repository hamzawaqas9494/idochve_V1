CREATE TABLE IF NOT EXISTS upload_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    department_id UUID REFERENCES departments(id),
    user_id UUID NOT NULL REFERENCES users(id),
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    byte_size BIGINT NOT NULL CHECK (byte_size > 0 AND byte_size <= 104857600),
    chunk_size INTEGER NOT NULL CHECK (chunk_size >= 32 AND chunk_size <= 1048576),
    chunk_count INTEGER NOT NULL CHECK (chunk_count >= 1 AND chunk_count <= 20000),
    class_code TEXT NOT NULL DEFAULT 'project_report',
    language_code TEXT NOT NULL DEFAULT 'en',
    status TEXT NOT NULL DEFAULT 'open',
    document_id UUID REFERENCES documents(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS upload_sessions_user_idx ON upload_sessions (user_id, created_at DESC);

COMMENT ON TABLE upload_sessions IS 'Resumable CF uploads. Chunk bytes stay on disk, not in PostgreSQL.';
