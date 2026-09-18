CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    department_id UUID REFERENCES departments(id),
    email CITEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

INSERT INTO roles (code, name) VALUES
    ('end_user', 'End user'),
    ('records_officer', 'Records officer'),
    ('document_controller', 'Document controller'),
    ('approver', 'Reviewer and approving authority'),
    ('department_admin', 'Department administrator'),
    ('security_admin', 'Security administrator'),
    ('auditor', 'Auditor'),
    ('platform_operator', 'Platform operator')
ON CONFLICT (code) DO NOTHING;

INSERT INTO organizations (id, name)
VALUES ('11111111-1111-1111-1111-111111111111', 'National Infrastructure Archive')
ON CONFLICT (id) DO NOTHING;

INSERT INTO departments (id, organization_id, name)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Project Controls'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, organization_id, department_id, email, full_name, password_hash)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'records.officer@nia.example',
    'Records Officer',
    crypt('ChangeMePilot!', gen_salt('bf'))
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT '33333333-3333-3333-3333-333333333333', id
FROM roles
WHERE code IN ('records_officer', 'approver')
ON CONFLICT DO NOTHING;
