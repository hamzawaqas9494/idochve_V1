CREATE TABLE IF NOT EXISTS prompt_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_policy_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES prompt_policies(id) ON DELETE CASCADE,
    version_label TEXT NOT NULL,
    body TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (policy_id, version_label)
);

INSERT INTO prompt_policies (id, code, name) VALUES
    ('88888888-8888-8888-8888-888888888801', 'ask_grounded', 'Grounded ask'),
    ('88888888-8888-8888-8888-888888888803', 'classify_document', 'Classify document'),
    ('88888888-8888-8888-8888-888888888805', 'extract_fields', 'Extract fields')
ON CONFLICT (code) DO NOTHING;

INSERT INTO prompt_policy_versions (id, policy_id, version_label, body, is_active) VALUES
    (
        '88888888-8888-8888-8888-888888888802',
        '88888888-8888-8888-8888-888888888801',
        'v1',
        'Answer only from the authorized sources that follow. If they are insufficient, say you cannot answer from authorized records. Do not invent sources or other departments.',
        true
    ),
    (
        '88888888-8888-8888-8888-888888888804',
        '88888888-8888-8888-8888-888888888803',
        'v1',
        'Choose exactly one class code: government_circular, contract, project_report, variation_order. Reply with JSON only: {"code":"..."} . If evidence is insufficient, {"code":""}.',
        true
    ),
    (
        '88888888-8888-8888-8888-888888888806',
        '88888888-8888-8888-8888-888888888805',
        'v1',
        'Extract JSON only: {"title":"","language":"","summary":""}. Use only the authorized text. Leave fields empty if unknown.',
        true
    )
ON CONFLICT (policy_id, version_label) DO NOTHING;

CREATE TABLE IF NOT EXISTS classification_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    error_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS classification_jobs_status_idx ON classification_jobs (status, created_at);

CREATE TABLE IF NOT EXISTS classification_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES document_versions(id),
    policy_version_id UUID REFERENCES prompt_policy_versions(id),
    proposed_code TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL CHECK (state IN ('pending_review', 'approved', 'rejected', 'changes_requested')),
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS extraction_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    error_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS extraction_jobs_status_idx ON extraction_jobs (status, created_at);

CREATE TABLE IF NOT EXISTS extraction_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    document_version_id UUID REFERENCES document_versions(id),
    policy_version_id UUID REFERENCES prompt_policy_versions(id),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    state TEXT NOT NULL CHECK (state IN ('pending_review', 'approved', 'rejected', 'changes_requested')),
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE prompt_policy_versions IS 'Active policy body is the runtime prompt. No public model provider.';
COMMENT ON TABLE classification_results IS 'Proposed class only. pending_review until a human decides.';
