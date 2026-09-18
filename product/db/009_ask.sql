INSERT INTO models (id, code, kind, name)
VALUES (
    '66666666-6666-6666-6666-666666666666',
    'qwen2.5:3b',
    'generate',
    'Ollama qwen2.5:3b'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO model_versions (id, model_id, version_label, dimension)
VALUES (
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666666',
    'latest',
    NULL
)
ON CONFLICT (model_id, version_label) DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id),
    question TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES ai_requests(id) ON DELETE CASCADE,
    answer TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('generated', 'extractive')),
    model_version_id UUID REFERENCES model_versions(id),
    state TEXT NOT NULL CHECK (state IN ('pending_review', 'approved', 'rejected', 'changes_requested')),
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_responses_state_idx ON ai_responses (state, created_at DESC);

CREATE TABLE IF NOT EXISTS citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES document_chunks(id) ON DELETE SET NULL,
    rank INTEGER NOT NULL,
    UNIQUE (response_id, rank)
);

CREATE INDEX IF NOT EXISTS citations_response_idx ON citations (response_id);

COMMENT ON TABLE ai_responses IS 'Every answer starts pending_review. No public AI provider.';
COMMENT ON TABLE citations IS 'Ids and rank only. UI loads authorized titles.';
