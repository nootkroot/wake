-- Wake — initial schema
-- Postgres + pgvector + Supabase Auth assumed.

CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------- Voting Periods ----------------
CREATE TABLE IF NOT EXISTS votingperiod (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    scope TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    export_url TEXT,
    top_n INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------- Submissions ----------------
CREATE TABLE IF NOT EXISTS submission (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_mode TEXT NOT NULL CHECK (display_mode IN ('ISSUE', 'SUGGESTION')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    image_url TEXT,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geohash TEXT,
    neighborhood TEXT,
    granularity TEXT NOT NULL DEFAULT 'CITY'
        CHECK (granularity IN ('NEIGHBORHOOD', 'CITY', 'COUNTY', 'STATE')),
    severity SMALLINT CHECK (severity BETWEEN 1 AND 4),
    gemma_rationale TEXT,
    scoring_job_id UUID,
    true_score INTEGER NOT NULL DEFAULT 0,
    display_score INTEGER NOT NULL DEFAULT 0,
    vote_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
        CHECK (status IN ('PENDING_REVIEW', 'ACTIVE', 'HIDDEN', 'CLOSED')),
    report_count INTEGER NOT NULL DEFAULT 0,
    report_threshold INTEGER NOT NULL DEFAULT 5,
    moderator_note TEXT,
    scope_tag TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    lang TEXT NOT NULL DEFAULT 'en',
    voting_period_id UUID REFERENCES votingperiod(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_submission_status ON submission(status);
CREATE INDEX IF NOT EXISTS idx_submission_period ON submission(voting_period_id);
CREATE INDEX IF NOT EXISTS idx_submission_geohash ON submission(geohash);
CREATE INDEX IF NOT EXISTS idx_submission_display_mode ON submission(display_mode);

-- ---------------- Votes ----------------
CREATE TABLE IF NOT EXISTS vote (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    direction SMALLINT NOT NULL CHECK (direction IN (1, -1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_vote_submission_session UNIQUE (submission_id, session_id)
);
CREATE INDEX IF NOT EXISTS idx_vote_submission ON vote(submission_id);
CREATE INDEX IF NOT EXISTS idx_vote_session ON vote(session_id);

-- ---------------- Legislation Chunks (vector store) ----------------
CREATE TABLE IF NOT EXISTS legislationchunk (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID NOT NULL,
    doc_title TEXT NOT NULL,
    doc_source TEXT NOT NULL,
    source_verified BOOLEAN NOT NULL DEFAULT FALSE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_translated TEXT,
    lang_translated TEXT,
    embedding vector(768),
    granularity TEXT NOT NULL DEFAULT 'CITY',
    lang TEXT NOT NULL DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ingestion_job_id UUID
);
CREATE INDEX IF NOT EXISTS idx_legislation_doc ON legislationchunk(doc_id);
CREATE INDEX IF NOT EXISTS idx_legislation_embedding
    ON legislationchunk USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ---------------- Job Queue ----------------
CREATE TABLE IF NOT EXISTS jobqueue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL
        CHECK (job_type IN ('SCORE_SUBMISSION', 'INGEST_DOCUMENT', 'TRANSLATE_CHUNKS', 'CLOSE_PERIOD')),
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'RUNNING', 'DONE', 'FAILED')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_job_status ON jobqueue(status);
CREATE INDEX IF NOT EXISTS idx_job_created ON jobqueue(created_at);

-- ---------------- Moderation Flags ----------------
CREATE TABLE IF NOT EXISTS moderationflag (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
    reporter_session_id TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_moderationflag_submission_reporter
        UNIQUE (submission_id, reporter_session_id)
);

-- ---------------- updated_at trigger ----------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS submission_updated_at ON submission;
CREATE TRIGGER submission_updated_at
    BEFORE UPDATE ON submission
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------- Public View: hides true_score from anon role ----------------
CREATE OR REPLACE VIEW public_submission AS
SELECT id, display_mode, title, body, image_url, is_anonymous,
       latitude, longitude, geohash, neighborhood, granularity,
       severity, gemma_rationale, display_score, vote_count,
       status, scope_tag, tags, lang, voting_period_id,
       created_at, updated_at
FROM submission
WHERE status = 'ACTIVE';

-- ---------------- RLS ----------------
ALTER TABLE submission ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderationflag ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submission_public_read" ON submission;
CREATE POLICY "submission_public_read" ON submission
    FOR SELECT
    USING (status = 'ACTIVE');

DROP POLICY IF EXISTS "submission_author_write" ON submission;
CREATE POLICY "submission_author_write" ON submission
    FOR UPDATE
    USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "vote_owner_read" ON vote;
CREATE POLICY "vote_owner_read" ON vote
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "vote_owner_write" ON vote;
CREATE POLICY "vote_owner_write" ON vote
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "moderationflag_insert_anon" ON moderationflag;
CREATE POLICY "moderationflag_insert_anon" ON moderationflag
    FOR INSERT
    WITH CHECK (TRUE);
