-- Scheduling schema for automated posting jobs

-- Create enum-like constraint for status
CREATE TABLE IF NOT EXISTS post_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID,
  platform TEXT NOT NULL,
  run_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','processing','succeeded','failed','cancelled')) DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  idempotency_key TEXT UNIQUE,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  payload JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient picking of due jobs
CREATE INDEX IF NOT EXISTS post_jobs_run_at_status_idx ON post_jobs (status, run_at);
CREATE INDEX IF NOT EXISTS post_jobs_user_idx ON post_jobs (user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_post_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_post_jobs_updated_at ON post_jobs;
CREATE TRIGGER trg_post_jobs_updated_at BEFORE UPDATE ON post_jobs
FOR EACH ROW EXECUTE FUNCTION update_post_jobs_updated_at();

-- RLS
ALTER TABLE post_jobs ENABLE ROW LEVEL SECURITY;

-- Users can access their own jobs
DROP POLICY IF EXISTS post_jobs_user_access ON post_jobs;
CREATE POLICY post_jobs_user_access ON post_jobs
  FOR ALL USING (auth.uid() = user_id);

-- Realtime (optional)
-- Note: Neon PostgreSQL doesn't have built-in realtime like Supabase.
-- If you need realtime functionality, consider using WebSockets, SSE, or third-party services.

