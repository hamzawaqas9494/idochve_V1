CREATE TABLE IF NOT EXISTS document_locks (
    document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES document_versions(id),
    workflow_task_id UUID REFERENCES workflow_tasks(id),
    body TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_comments_document_idx
    ON document_comments (document_id, created_at);

COMMENT ON TABLE document_locks IS 'Set on approved. Blocks new versions. Does not rewrite blobs.';
COMMENT ON TABLE document_comments IS 'Append-only. Application users cannot update or delete rows.';
