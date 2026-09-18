CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    kind TEXT NOT NULL CHECK (kind IN ('embedding', 'generate')),
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS model_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    version_label TEXT NOT NULL,
    dimension INTEGER,
    UNIQUE (model_id, version_label)
);

INSERT INTO models (id, code, kind, name)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    'nomic-embed-text',
    'embedding',
    'Ollama nomic-embed-text'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO model_versions (id, model_id, version_label, dimension)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    'latest',
    768
)
ON CONFLICT (model_id, version_label) DO NOTHING;

CREATE TABLE IF NOT EXISTS chunk_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
    model_version_id UUID NOT NULL REFERENCES model_versions(id),
    embedding vector(768) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (chunk_id, model_version_id)
);

CREATE INDEX IF NOT EXISTS chunk_embeddings_chunk_idx ON chunk_embeddings (chunk_id);

CREATE TABLE IF NOT EXISTS embed_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    error_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS embed_jobs_status_idx ON embed_jobs (status, created_at);

COMMENT ON TABLE chunk_embeddings IS 'Release 2 embeddings. document_chunks.embedding (1536) stays unused.';
COMMENT ON TABLE embed_jobs IS 'Embedding jobs. HTTP never calls the model gateway.';
COMMENT ON TABLE models IS 'Internal model registry. No public AI provider rows.';
