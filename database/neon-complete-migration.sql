-- Complete Database Migration for SoloSuccess AI Content Planner - Neon Version
-- Run this entire script in your Neon SQL Editor
-- This will create all necessary tables for the application to work properly

-- ============================================================================
-- 1. BASE SCHEMA
-- ============================================================================

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
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
CREATE POLICY "Users can access own posts" ON posts
  FOR ALL USING (user_id = current_user);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_schedule_date_idx ON posts(schedule_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at trigger for posts
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. ENHANCED CONTENT FEATURES TABLES
-- ============================================================================

-- Brand Voices Table
CREATE TABLE IF NOT EXISTS brand_voices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  tone TEXT NOT NULL,
  vocabulary TEXT[] DEFAULT '{}',
  writing_style TEXT,
  target_audience TEXT,
  sample_content TEXT[] DEFAULT '{}',
  personality_traits TEXT[] DEFAULT '{}',
  communication_style TEXT,
  brand_values TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for brand_voices
ALTER TABLE brand_voices ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_voices
CREATE POLICY "Users can access own brand voices" ON brand_voices
  FOR ALL USING (user_id = current_user);

-- Indexes for brand_voices
CREATE INDEX IF NOT EXISTS brand_voices_user_id_idx ON brand_voices(user_id);
CREATE INDEX IF NOT EXISTS brand_voices_name_idx ON brand_voices(name);

-- Audience Profiles Table
CREATE TABLE IF NOT EXISTS audience_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  age_range TEXT,
  industry TEXT,
  interests TEXT[] DEFAULT '{}',
  pain_points TEXT[] DEFAULT '{}',
  preferred_content_types TEXT[] DEFAULT '{}',
  engagement_patterns JSONB DEFAULT '{}',
  demographics JSONB DEFAULT '{}',
  behavior_patterns JSONB DEFAULT '{}',
  content_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for audience_profiles
ALTER TABLE audience_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for audience_profiles
CREATE POLICY "Users can access own audience profiles" ON audience_profiles
  FOR ALL USING (user_id = current_user);

-- Indexes for audience_profiles
CREATE INDEX IF NOT EXISTS audience_profiles_user_id_idx ON audience_profiles(user_id);
CREATE INDEX IF NOT EXISTS audience_profiles_name_idx ON audience_profiles(name);
CREATE INDEX IF NOT EXISTS audience_profiles_industry_idx ON audience_profiles(industry);

-- Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
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
  FOR ALL USING (user_id = current_user);

-- Indexes for campaigns
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_start_date_idx ON campaigns(start_date);
CREATE INDEX IF NOT EXISTS campaigns_end_date_idx ON campaigns(end_date);

-- Content Series Table
CREATE TABLE IF NOT EXISTS content_series (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
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
  FOR ALL USING (user_id = current_user);

-- Indexes for content_series
CREATE INDEX IF NOT EXISTS content_series_user_id_idx ON content_series(user_id);
CREATE INDEX IF NOT EXISTS content_series_campaign_id_idx ON content_series(campaign_id);
CREATE INDEX IF NOT EXISTS content_series_frequency_idx ON content_series(frequency);

-- Post Analytics Table
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
      AND posts.user_id = current_user
    )
  );

-- Indexes for post_analytics
CREATE INDEX IF NOT EXISTS post_analytics_post_id_idx ON post_analytics(post_id);
CREATE INDEX IF NOT EXISTS post_analytics_platform_idx ON post_analytics(platform);
CREATE INDEX IF NOT EXISTS post_analytics_recorded_at_idx ON post_analytics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS post_analytics_engagement_rate_idx ON post_analytics(engagement_rate DESC);

-- Content Templates Table
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Changed from UUID REFERENCES auth.users(id)
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

-- Indexes for content_templates
CREATE INDEX IF NOT EXISTS content_templates_user_id_idx ON content_templates(user_id);
CREATE INDEX IF NOT EXISTS content_templates_category_idx ON content_templates(category);
CREATE INDEX IF NOT EXISTS content_templates_content_type_idx ON content_templates(content_type);
CREATE INDEX IF NOT EXISTS content_templates_is_public_idx ON content_templates(is_public);
CREATE INDEX IF NOT EXISTS content_templates_rating_idx ON content_templates(rating DESC);

-- Image Styles Table
CREATE TABLE IF NOT EXISTS image_styles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Changed from UUID REFERENCES auth.users(id)
  name TEXT NOT NULL,
  style_prompt TEXT NOT NULL,
  color_palette TEXT[] DEFAULT '{}',
  visual_elements TEXT[] DEFAULT '{}',
  brand_assets JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for image_styles
CREATE INDEX IF NOT EXISTS image_styles_user_id_idx ON image_styles(user_id);
CREATE INDEX IF NOT EXISTS image_styles_name_idx ON image_styles(name);

-- ============================================================================
-- 3. INTEGRATION MANAGEMENT TABLES
-- ============================================================================

-- Integrations Table
CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Changed from UUID REFERENCES auth.users(id)
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('social_media', 'analytics', 'crm', 'email', 'storage', 'ai_service')),
  platform TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('connected', 'disconnected', 'error', 'syncing', 'maintenance')) DEFAULT 'disconnected',
  credentials JSONB NOT NULL, -- Encrypted credentials
  configuration JSONB DEFAULT '{
    "syncSettings": {
      "autoSync": true,
      "syncInterval": 60,
      "batchSize": 100,
      "retryAttempts": 3,
      "timeoutMs": 30000,
      "syncOnStartup": true,
      "syncOnSchedule": true
    },
    "rateLimits": {
      "requestsPerMinute": 100,
      "requestsPerHour": 1000,
      "requestsPerDay": 10000,
      "burstLimit": 20
    },
    "errorHandling": {
      "maxRetries": 3,
      "retryDelay": 1000,
      "exponentialBackoff": true,
      "deadLetterQueue": true,
      "alertOnFailure": true
    },
    "notifications": {
      "emailNotifications": true,
      "webhookNotifications": false,
      "slackNotifications": false,
      "notificationLevels": ["error", "warn"]
    }
  }',
  last_sync TIMESTAMPTZ,
  sync_frequency TEXT CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly', 'manual')) DEFAULT 'hourly',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for integrations
CREATE INDEX IF NOT EXISTS integrations_user_id_idx ON integrations(user_id);
CREATE INDEX IF NOT EXISTS integrations_platform_idx ON integrations(platform);
CREATE INDEX IF NOT EXISTS integrations_type_idx ON integrations(type);
CREATE INDEX IF NOT EXISTS integrations_status_idx ON integrations(status);
CREATE INDEX IF NOT EXISTS integrations_is_active_idx ON integrations(is_active);
CREATE INDEX IF NOT EXISTS integrations_last_sync_idx ON integrations(last_sync DESC);
CREATE INDEX IF NOT EXISTS integrations_created_at_idx ON integrations(created_at DESC);

-- Integration Logs Table
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  level TEXT CHECK (level IN ('info', 'warn', 'error', 'debug')) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT NOT NULL -- Changed from UUID REFERENCES auth.users(id)
);

-- Indexes for integration_logs
CREATE INDEX IF NOT EXISTS integration_logs_integration_id_idx ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS integration_logs_level_idx ON integration_logs(level);
CREATE INDEX IF NOT EXISTS integration_logs_timestamp_idx ON integration_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS integration_logs_user_id_idx ON integration_logs(user_id);

-- Integration Alerts Table
CREATE TABLE IF NOT EXISTS integration_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('error', 'warning', 'info', 'success')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes for integration_alerts
CREATE INDEX IF NOT EXISTS integration_alerts_integration_id_idx ON integration_alerts(integration_id);
CREATE INDEX IF NOT EXISTS integration_alerts_type_idx ON integration_alerts(type);
CREATE INDEX IF NOT EXISTS integration_alerts_severity_idx ON integration_alerts(severity);
CREATE INDEX IF NOT EXISTS integration_alerts_is_resolved_idx ON integration_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS integration_alerts_created_at_idx ON integration_alerts(created_at DESC);

-- Integration Webhooks Table
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  retry_policy JSONB DEFAULT '{
    "maxRetries": 3,
    "backoffMultiplier": 2,
    "initialDelay": 1000,
    "maxDelay": 30000
  }',
  headers JSONB DEFAULT '{}',
  timeout INTEGER DEFAULT 30000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for integration_webhooks
CREATE INDEX IF NOT EXISTS integration_webhooks_integration_id_idx ON integration_webhooks(integration_id);
CREATE INDEX IF NOT EXISTS integration_webhooks_is_active_idx ON integration_webhooks(is_active);
CREATE INDEX IF NOT EXISTS integration_webhooks_created_at_idx ON integration_webhooks(created_at DESC);

-- Integration Metrics Table
CREATE TABLE IF NOT EXISTS integration_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  average_response_time DECIMAL(10,2) DEFAULT 0,
  last_request_time TIMESTAMPTZ,
  error_rate DECIMAL(5,4) DEFAULT 0,
  uptime DECIMAL(5,2) DEFAULT 100.00,
  data_processed BIGINT DEFAULT 0,
  sync_count INTEGER DEFAULT 0,
  last_sync_duration INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for integration_metrics
CREATE INDEX IF NOT EXISTS integration_metrics_integration_id_idx ON integration_metrics(integration_id);
CREATE INDEX IF NOT EXISTS integration_metrics_recorded_at_idx ON integration_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS integration_metrics_error_rate_idx ON integration_metrics(error_rate DESC);

-- ============================================================================
-- 4. SOCIAL PLATFORM SPECIFIC TABLES
-- ============================================================================

-- Hashtag Performance Table (for socialPlatformService.ts)
CREATE TABLE IF NOT EXISTS hashtag_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hashtag TEXT NOT NULL,
  platform TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  avg_engagement DECIMAL(5,4) DEFAULT 0,
  trending_score DECIMAL(5,2) DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for hashtag_performance
CREATE INDEX IF NOT EXISTS hashtag_performance_hashtag_idx ON hashtag_performance(hashtag);
CREATE INDEX IF NOT EXISTS hashtag_performance_platform_idx ON hashtag_performance(platform);
CREATE INDEX IF NOT EXISTS hashtag_performance_last_updated_idx ON hashtag_performance(last_updated DESC);
CREATE INDEX IF NOT EXISTS hashtag_performance_trending_score_idx ON hashtag_performance(trending_score DESC);

-- Webhook Deliveries Table (for webhookService.ts)
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID REFERENCES integration_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')) DEFAULT 'pending',
  response_status INTEGER,
  response_body TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for webhook_deliveries
CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_id_idx ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS webhook_deliveries_status_idx ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS webhook_deliveries_event_type_idx ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS webhook_deliveries_created_at_idx ON webhook_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_deliveries_next_retry_at_idx ON webhook_deliveries(next_retry_at);

-- ============================================================================
-- 5. EXTEND EXISTING POSTS TABLE
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
-- 6. CREATE UPDATED_AT TRIGGERS FOR ALL NEW TABLES
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

-- Integrations trigger
CREATE TRIGGER update_integrations_updated_at 
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Integration webhooks trigger
CREATE TRIGGER update_integration_webhooks_updated_at 
  BEFORE UPDATE ON integration_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 7. CREATE HELPER FUNCTIONS
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

-- Function to log integration activity
CREATE OR REPLACE FUNCTION log_integration_activity(
  p_integration_id UUID,
  p_level TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
DECLARE
  p_user_id TEXT;
BEGIN
  -- Get user_id from integration
  SELECT user_id INTO p_user_id
  FROM integrations 
  WHERE id = p_integration_id;
  
  -- Insert log entry
  INSERT INTO integration_logs (
    integration_id,
    level,
    message,
    metadata,
    user_id
  ) VALUES (
    p_integration_id,
    p_level,
    p_message,
    p_metadata,
    p_user_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. CREATE TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

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
-- 9. MIGRATION COMPLETION MESSAGE
-- ============================================================================

-- This migration has been completed successfully!
-- All tables, indexes, triggers, and functions have been created.
-- Your SoloSuccess AI Content Planner database is now ready to use.

SELECT 'Neon database migration completed successfully! All tables are ready.' as status;
