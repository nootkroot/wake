-- Seed data for hackathon demo. Idempotent.

INSERT INTO votingperiod (id, label, scope, starts_at, ends_at, top_n)
SELECT
    '00000000-0000-0000-0000-000000000001',
    'Spring 2026 — Demo',
    'city',
    NOW() - INTERVAL '14 days',
    NOW() + INTERVAL '14 days',
    10
WHERE NOT EXISTS (
    SELECT 1 FROM votingperiod WHERE id = '00000000-0000-0000-0000-000000000001'
);

INSERT INTO submission (
    id, display_mode, title, body, latitude, longitude, geohash, neighborhood,
    granularity, status, severity, gemma_rationale, true_score, display_score,
    vote_count, tags, lang, voting_period_id, is_anonymous
)
VALUES
    (
        '11111111-1111-1111-1111-111111111111',
        'ISSUE',
        'Pothole on Pike St',
        'Large pothole near the bus stop has been there for two months.',
        47.6101, -122.3344, 'c23nb', '47.6101, -122.3344', 'CITY', 'ACTIVE',
        2, 'Quality-of-life concern impacting transit access.',
        12, 14, 12, ARRAY['transit', 'roads'], 'en',
        '00000000-0000-0000-0000-000000000001', FALSE
    ),
    (
        '22222222-2222-2222-2222-222222222222',
        'ISSUE',
        'Broken streetlight on 5th Ave',
        'Streetlight has been out for weeks; the corner is unsafe at night.',
        47.6090, -122.3320, 'c23nc', '47.6090, -122.3320', 'CITY', 'ACTIVE',
        3, 'Indicates safety or accessibility impact.',
        21, 23, 21, ARRAY['safety', 'lighting'], 'en',
        '00000000-0000-0000-0000-000000000001', FALSE
    ),
    (
        '33333333-3333-3333-3333-333333333333',
        'SUGGESTION',
        'Add bike lanes to Main Street',
        'Cars travel too fast on Main and the existing lanes are narrow.',
        NULL, NULL, NULL, NULL, 'CITY', 'ACTIVE',
        2, 'Quality-of-life concern, non-urgent.',
        45, 47, 45, ARRAY['transit', 'cycling'], 'en',
        '00000000-0000-0000-0000-000000000001', FALSE
    )
ON CONFLICT (id) DO NOTHING;
