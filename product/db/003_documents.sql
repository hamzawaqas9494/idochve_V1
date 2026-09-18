CREATE TABLE IF NOT EXISTS document_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

INSERT INTO document_classes (code, name) VALUES
    ('government_circular', 'Government circular'),
    ('contract', 'Contract'),
    ('project_report', 'Project report'),
    ('variation_order', 'Variation order')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    department_id UUID REFERENCES departments(id),
    class_id UUID REFERENCES document_classes(id),
    title TEXT NOT NULL,
    language_code TEXT NOT NULL DEFAULT 'en',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    blob_key TEXT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    byte_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    encrypted BOOLEAN NOT NULL DEFAULT true,
    immutable BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id, version_number)
);

CREATE TABLE IF NOT EXISTS workflow_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id),
    document_version_id UUID REFERENCES document_versions(id),
    state TEXT NOT NULL CHECK (state IN ('pending_review', 'approved', 'rejected', 'changes_requested')),
    assigned_to UUID REFERENCES users(id),
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events (created_at DESC);

CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    UNIQUE (document_version_id, chunk_index)
);

COMMENT ON TABLE document_chunks IS 'pgvector embeddings are populated in Release 2. Release 1 may insert content without vectors.';
