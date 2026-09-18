INSERT INTO departments (id, organization_id, name)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'Other Controls'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, organization_id, department_id, email, full_name, password_hash)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'records.other@nia.example',
    'Other Department Officer',
    crypt('ChangeMePilot!', gen_salt('bf'))
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT '55555555-5555-5555-5555-555555555555', id
FROM roles
WHERE code = 'records_officer'
ON CONFLICT DO NOTHING;
