-- Enhanced Content Features Database Migration
-- This script adds new tables and columns for enhanced content generation features
-- Run this in your Neon SQL Editor after the base schema

-- ============================================================================
-- 1. BRAND VOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS brand_voices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tone TEXT NOT NULL,
  vocabulary TEXT[] DEFAULT '{}',
  writing_style TEXT,
  target_audience TEXT,
  sample_content TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for brand_voices
ALTER TABLE brand_voices ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_voices
CREATE POLICY "Users can access own brand voices" ON brand_voices
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for brand_voices
CREATE INDEX IF NOT EXISTS brand_voices_user_id_idx ON brand_voices(user_id);
CREATE INDEX IF NOT EXISTS brand_voices_name_idx ON brand_voices(name);

-- ============================================================================
-- 2. AUDIENCE PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audience_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_range TEXT,
  industry TEXT,
  interests TEXT[] DEFAULT '{}',
  pain_points TEXT[] DEFAULT '{}',
  preferred_content_types TEXT[] DEFAULT '{}',
  engagement_patterns JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for audience_profiles
ALTER TABLE audience_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for audience_profiles
CREATE POLICY "Users can access own audience profiles" ON audience_profiles
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for audience_profiles
CREATE INDEX IF NOT EXISTS audience_profiles_user_id_idx ON audience_profiles(user_id);
CREATE INDEX IF NOT EXISTS audience_profiles_name_idx ON audience_profiles(name);
CREATE INDEX IF NOT EXISTS audience_profiles_industry_idx ON audience_profiles(industry);

-- ============================================================================
-- 3. CAMPAIGNS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  platforms TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('draft', 'active', 'completed', 'paused')) DEFAULT 'draft',
  performance JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- RLS policies for campaigns
CREATE POLICY "Users can access own campaigns" ON campaigns
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_start_date_idx ON campaigns(start_date);
CREATE INDEX IF NOT EXISTS campaigns_end_date_idx ON campaigns(end_date);

-- ============================================================================
-- 4. CONTENT SERIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  theme TEXT,
  total_posts INTEGER,
  frequency TEXT CHECK (frequency IN ('daily', 'weekly', 'biweekly')),
  current_post INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for content_series
ALTER TABLE content_series ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_series
CREATE POLICY "Users can access own content series" ON content_series
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for content_series
CREATE INDEX IF NOT EXISTS content_series_user_id_idx ON content_series(user_id);
CREATE INDEX IF NOT EXISTS content_series_campaign_id_idx ON content_series(campaign_id);
CREATE INDEX IF NOT EXISTS content_series_frequency_idx ON content_series(frequency);

-- ============================================================================
-- 5. POST ANALYTICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS post_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for post_analytics
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for post_analytics (inherit from posts table)
CREATE POLICY "Users can access analytics for own posts" ON post_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_analytics.post_id 
      AND posts.user_id = auth.uid()
    )
  );

-- Indexes for post_analytics
CREATE INDEX IF NOT EXISTS post_analytics_post_id_idx ON post_analytics(post_id);
CREATE INDEX IF NOT EXISTS post_analytics_platform_idx ON post_analytics(platform);
CREATE INDEX IF NOT EXISTS post_analytics_recorded_at_idx ON post_analytics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS post_analytics_engagement_rate_idx ON post_analytics(engagement_rate DESC);

-- ============================================================================
-- 6. CONTENT TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  industry TEXT,
  content_type TEXT CHECK (content_type IN ('blog', 'social', 'email', 'video')),
  structure JSONB NOT NULL,
  customizable_fields JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for content_templates
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for content_templates
CREATE POLICY "Users can access own templates" ON content_templates
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public templates" ON content_templates
  FOR SELECT USING (is_public = true);

-- Indexes for content_templates
CREATE INDEX IF NOT EXISTS content_templates_user_id_idx ON content_templates(user_id);
CREATE INDEX IF NOT EXISTS content_templates_category_idx ON content_templates(category);
CREATE INDEX IF NOT EXISTS content_templates_content_type_idx ON content_templates(content_type);
CREATE INDEX IF NOT EXISTS content_templates_is_public_idx ON content_templates(is_public);
CREATE INDEX IF NOT EXISTS content_templates_rating_idx ON content_templates(rating DESC);

-- ============================================================================
-- 7. IMAGE STYLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS image_styles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  style_prompt TEXT NOT NULL,
  color_palette TEXT[] DEFAULT '{}',
  visual_elements TEXT[] DEFAULT '{}',
  brand_assets JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for image_styles
ALTER TABLE image_styles ENABLE ROW LEVEL SECURITY;

-- RLS policies for image_styles
CREATE POLICY "Users can access own image styles" ON image_styles
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for image_styles
CREATE INDEX IF NOT EXISTS image_styles_user_id_idx ON image_styles(user_id);
CREATE INDEX IF NOT EXISTS image_styles_name_idx ON image_styles(name);

-- ============================================================================
-- 8. EXTEND EXISTING POSTS TABLE
-- ============================================================================
-- Add new columns to existing posts table for enhanced features
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS brand_voice_id UUID REFERENCES brand_voices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS audience_profile_id UUID REFERENCES audience_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES content_series(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES content_templates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS image_style_id UUID REFERENCES image_styles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS performance_score DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS optimization_suggestions JSONB DEFAULT '[]';

-- Add indexes for new foreign key columns
CREATE INDEX IF NOT EXISTS posts_brand_voice_id_idx ON posts(brand_voice_id);
CREATE INDEX IF NOT EXISTS posts_audience_profile_id_idx ON posts(audience_profile_id);
CREATE INDEX IF NOT EXISTS posts_campaign_id_idx ON posts(campaign_id);
CREATE INDEX IF NOT EXISTS posts_series_id_idx ON posts(series_id);
CREATE INDEX IF NOT EXISTS posts_template_id_idx ON posts(template_id);
CREATE INDEX IF NOT EXISTS posts_image_style_id_idx ON posts(image_style_id);
CREATE INDEX IF NOT EXISTS posts_performance_score_idx ON posts(performance_score DESC);

-- ============================================================================
-- 9. CREATE UPDATED_AT TRIGGERS FOR ALL NEW TABLES
-- ============================================================================
-- Brand voices trigger
CREATE TRIGGER update_brand_voices_updated_at 
  BEFORE UPDATE ON brand_voices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audience profiles trigger
CREATE TRIGGER update_audience_profiles_updated_at 
  BEFORE UPDATE ON audience_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Campaigns trigger
CREATE TRIGGER update_campaigns_updated_at 
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Content series trigger
CREATE TRIGGER update_content_series_updated_at 
  BEFORE UPDATE ON content_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Content templates trigger
CREATE TRIGGER update_content_templates_updated_at 
  BEFORE UPDATE ON content_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Image styles trigger
CREATE TRIGGER update_image_styles_updated_at 
  BEFORE UPDATE ON image_styles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. ENABLE REALTIME FOR NEW TABLES
-- ============================================================================
-- Enable realtime subscriptions for all new tables
-- Note: Neon PostgreSQL doesn't have built-in realtime like Supabase.
-- If you need realtime functionality, consider using WebSockets, SSE, or third-party services.

-- ============================================================================
-- 11. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate engagement rate
CREATE OR REPLACE FUNCTION calculate_engagement_rate(
  p_likes INTEGER,
  p_shares INTEGER,
  p_comments INTEGER,
  p_impressions INTEGER
) RETURNS DECIMAL(5,4) AS $$
BEGIN
  IF p_impressions = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND(
    ((p_likes + p_shares + p_comments)::DECIMAL / p_impressions::DECIMAL) * 100,
    4
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update post performance score based on analytics
CREATE OR REPLACE FUNCTION update_post_performance_score(p_post_id UUID)
RETURNS VOID AS $$
DECLARE
  avg_engagement DECIMAL(5,4);
  post_count INTEGER;
  performance_score DECIMAL(3,2);
BEGIN
  -- Calculate average engagement rate for this post across all platforms
  SELECT 
    COALESCE(AVG(engagement_rate), 0),
    COUNT(*)
  INTO avg_engagement, post_count
  FROM post_analytics 
  WHERE post_id = p_post_id;
  
  -- Convert to 0-10 scale (assuming max engagement rate of 10%)
  performance_score := LEAST(avg_engagement / 10.0 * 10, 10.0);
  
  -- Update the posts table
  UPDATE posts 
  SET performance_score = performance_score
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update performance score when analytics are inserted/updated
CREATE OR REPLACE FUNCTION trigger_update_performance_score()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate and update engagement rate
  NEW.engagement_rate := calculate_engagement_rate(
    NEW.likes, 
    NEW.shares, 
    NEW.comments, 
    NEW.impressions
  );
  
  -- Update post performance score
  PERFORM update_post_performance_score(NEW.post_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_analytics_performance_trigger
  BEFORE INSERT OR UPDATE ON post_analytics
  FOR EACH ROW EXECUTE FUNCTION trigger_update_performance_score();

-- ============================================================================
-- 12. SAMPLE DATA INSERTION (OPTIONAL - FOR DEVELOPMENT)
-- ============================================================================

-- Insert sample brand voices (only if no data exists)
INSERT INTO brand_voices (user_id, name, tone, writing_style, target_audience, sample_content)
SELECT 
  auth.uid(),
  'Professional',
  'professional',
  'Clear, concise, and authoritative',
  'Business professionals and entrepreneurs',
  ARRAY['We help businesses achieve their goals through strategic planning.', 'Our expertise drives measurable results.']
WHERE NOT EXISTS (SELECT 1 FROM brand_voices WHERE user_id = auth.uid())
AND auth.uid() IS NOT NULL;

INSERT INTO brand_voices (user_id, name, tone, writing_style, target_audience, sample_content)
SELECT 
  auth.uid(),
  'Casual & Friendly',
  'casual',
  'Conversational, approachable, and engaging',
  'General audience, millennials, and Gen Z',
  ARRAY['Hey there! Let''s talk about something that could change your business game.', 'I''ve got some exciting news to share with you today!']
WHERE NOT EXISTS (SELECT 1 FROM brand_voices WHERE user_id = auth.uid() AND name = 'Casual & Friendly')
AND auth.uid() IS NOT NULL;

-- Insert sample audience profiles
INSERT INTO audience_profiles (user_id, name, age_range, industry, interests, pain_points, preferred_content_types)
SELECT 
  auth.uid(),
  'Small Business Owners',
  '30-50',
  'Small Business',
  ARRAY['entrepreneurship', 'marketing', 'productivity', 'growth'],
  ARRAY['limited time', 'budget constraints', 'marketing challenges'],
  ARRAY['blog posts', 'social media', 'video content']
WHERE NOT EXISTS (SELECT 1 FROM audience_profiles WHERE user_id = auth.uid())
AND auth.uid() IS NOT NULL;

-- Insert sample content templates
INSERT INTO content_templates (user_id, name, category, content_type, structure, customizable_fields, is_public)
SELECT 
  auth.uid(),
  'Blog Post Template',
  'General',
  'blog',
  '[
    {"type": "heading", "content": "{{title}}", "isCustomizable": true},
    {"type": "paragraph", "content": "{{introduction}}", "isCustomizable": true},
    {"type": "list", "content": "{{main_points}}", "isCustomizable": true},
    {"type": "paragraph", "content": "{{conclusion}}", "isCustomizable": true},
    {"type": "cta", "content": "{{call_to_action}}", "isCustomizable": true}
  ]'::jsonb,
  '[
    {"name": "title", "type": "text", "placeholder": "Enter your blog post title"},
    {"name": "introduction", "type": "textarea", "placeholder": "Write your introduction"},
    {"name": "main_points", "type": "list", "placeholder": "Add your main points"},
    {"name": "conclusion", "type": "textarea", "placeholder": "Write your conclusion"},
    {"name": "call_to_action", "type": "text", "placeholder": "Add your call to action"}
  ]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM content_templates WHERE user_id = auth.uid())
AND auth.uid() IS NOT NULL;

-- Migration completed successfully
-- All tables created with proper RLS policies, indexes, and triggers