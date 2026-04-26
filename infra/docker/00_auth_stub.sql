-- Stub for the Supabase Auth schema so the main migration's foreign keys
-- (`REFERENCES auth.users(id)`) resolve in a plain Postgres + pgvector image.
-- In production (real Supabase), this schema and table already exist and
-- this script is a no-op.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stub auth.uid() so RLS policies that reference it don't fail at parse time.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
    SELECT NULL::UUID;
$$ LANGUAGE sql STABLE;
