-- Neon PostgreSQL Database Schema for SoloSuccess AI Content Factory
-- Run this in your Neon SQL Editor
-- 
-- NOTE: This file is for reference only. For Neon + Stack Auth, use database/neon-complete-migration.sql instead.
-- This file still contains Supabase-specific syntax (auth.users, auth.uid()) that won't work with Neon.

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Changed from UUID REFERENCES auth.users(id) for Neon compatibility
  topic TEXT NOT NULL,
  idea TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT CHECK (status IN ('draft', 'scheduled', 'posted')) DEFAULT 'draft',
  tags TEXT[] DEFAULT '{}',
  summary TEXT,
  headlines TEXT[] DEFAULT '{}',
  social_media_posts JSONB DEFAULT '{}',
  social_media_tones JSONB DEFAULT '{}',
  social_media_audiences JSONB DEFAULT '{}',
  selected_image TEXT,
  schedule_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  posted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own posts
-- NOTE: With Neon + Stack Auth, RLS policies should be handled at the application level
-- or use session variables. This policy may not work correctly with Stack Auth.
-- Consider disabling RLS and handling access control in your application code.
CREATE POLICY "Users can access own posts" ON posts
  FOR ALL USING (user_id = current_setting('app.user_id', true));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_schedule_date_idx ON posts(schedule_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();