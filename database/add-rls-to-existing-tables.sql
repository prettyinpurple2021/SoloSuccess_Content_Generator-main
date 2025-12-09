-- Add Row-Level Security to Existing Tables
-- Run this script after the initial migration to add RLS to already created tables

-- ============================================================================
-- ADD RLS TO EXISTING TABLES
-- ============================================================================

-- Enable RLS on posts table (if not already enabled)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policy for posts (drop if exists first)
DROP POLICY IF EXISTS "Users can access own posts" ON posts;
CREATE POLICY "Users can access own posts" ON posts
  FOR ALL USING (user_id = current_user);

-- Enable RLS on brand_voices table (if not already enabled)
ALTER TABLE brand_voices ENABLE ROW LEVEL SECURITY;

-- Create policy for brand_voices (drop if exists first)
DROP POLICY IF EXISTS "Users can access own brand voices" ON brand_voices;
CREATE POLICY "Users can access own brand voices" ON brand_voices
  FOR ALL USING (user_id = current_user);

-- Enable RLS on audience_profiles table (if not already enabled)
ALTER TABLE audience_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for audience_profiles (drop if exists first)
DROP POLICY IF EXISTS "Users can access own audience profiles" ON audience_profiles;
CREATE POLICY "Users can access own audience profiles" ON audience_profiles
  FOR ALL USING (user_id = current_user);

-- Enable RLS on campaigns table (if not already enabled)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Create policy for campaigns (drop if exists first)
DROP POLICY IF EXISTS "Users can access own campaigns" ON campaigns;
CREATE POLICY "Users can access own campaigns" ON campaigns
  FOR ALL USING (user_id = current_user);

-- Enable RLS on content_series table (if not already enabled)
ALTER TABLE content_series ENABLE ROW LEVEL SECURITY;

-- Create policy for content_series (drop if exists first)
DROP POLICY IF EXISTS "Users can access own content series" ON content_series;
CREATE POLICY "Users can access own content series" ON content_series
  FOR ALL USING (user_id = current_user);

-- Enable RLS on post_analytics table (if not already enabled)
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

-- Create policy for post_analytics (drop if exists first)
DROP POLICY IF EXISTS "Users can access analytics for own posts" ON post_analytics;
CREATE POLICY "Users can access analytics for own posts" ON post_analytics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM posts 
      WHERE posts.id = post_analytics.post_id 
      AND posts.user_id = current_user
    )
  );

-- Enable RLS on content_templates table (if not already enabled)
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for content_templates (drop if exists first)
DROP POLICY IF EXISTS "Users can access own templates" ON content_templates;
CREATE POLICY "Users can access own templates" ON content_templates
  FOR ALL USING (user_id = current_user);

-- Create policy for public templates (drop if exists first)
DROP POLICY IF EXISTS "Users can view public templates" ON content_templates;
CREATE POLICY "Users can view public templates" ON content_templates
  FOR SELECT USING (is_public = true);

-- Enable RLS on image_styles table (if not already enabled)
ALTER TABLE image_styles ENABLE ROW LEVEL SECURITY;

-- Create policy for image_styles (drop if exists first)
DROP POLICY IF EXISTS "Users can access own image styles" ON image_styles;
CREATE POLICY "Users can access own image styles" ON image_styles
  FOR ALL USING (user_id = current_user);

-- Enable RLS on integrations table (if not already enabled)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create policy for integrations (drop if exists first)
DROP POLICY IF EXISTS "Users can access own integrations" ON integrations;
CREATE POLICY "Users can access own integrations" ON integrations
  FOR ALL USING (user_id = current_user);

-- Enable RLS on integration_logs table (if not already enabled)
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for integration_logs (drop if exists first)
DROP POLICY IF EXISTS "Users can access own integration logs" ON integration_logs;
CREATE POLICY "Users can access own integration logs" ON integration_logs
  FOR ALL USING (user_id = current_user);

-- Enable RLS on integration_alerts table (if not already enabled)
ALTER TABLE integration_alerts ENABLE ROW LEVEL SECURITY;

-- Create policy for integration_alerts (drop if exists first)
DROP POLICY IF EXISTS "Users can access own integration alerts" ON integration_alerts;
CREATE POLICY "Users can access own integration alerts" ON integration_alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM integrations 
      WHERE id = integration_alerts.integration_id 
      AND user_id = current_user
    )
  );

-- Enable RLS on integration_webhooks table (if not already enabled)
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;

-- Create policy for integration_webhooks (drop if exists first)
DROP POLICY IF EXISTS "Users can access own webhooks" ON integration_webhooks;
CREATE POLICY "Users can access own webhooks" ON integration_webhooks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM integrations 
      WHERE id = integration_webhooks.integration_id 
      AND user_id = current_user
    )
  );

-- Enable RLS on integration_metrics table (if not already enabled)
ALTER TABLE integration_metrics ENABLE ROW LEVEL SECURITY;

-- Create policy for integration_metrics (drop if exists first)
DROP POLICY IF EXISTS "Users can access own integration metrics" ON integration_metrics;
CREATE POLICY "Users can access own integration metrics" ON integration_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM integrations 
      WHERE id = integration_metrics.integration_id 
      AND user_id = current_user
    )
  );

-- Enable RLS on hashtag_performance table (if not already enabled)
ALTER TABLE hashtag_performance ENABLE ROW LEVEL SECURITY;

-- Create policy for hashtag_performance (drop if exists first)
DROP POLICY IF EXISTS "Users can access hashtag performance" ON hashtag_performance;
CREATE POLICY "Users can access hashtag performance" ON hashtag_performance
  FOR ALL USING (true); -- This table is shared data, not user-specific

-- Enable RLS on webhook_deliveries table (if not already enabled)
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Create policy for webhook_deliveries (drop if exists first)
DROP POLICY IF EXISTS "Users can access own webhook deliveries" ON webhook_deliveries;
CREATE POLICY "Users can access own webhook deliveries" ON webhook_deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM integration_webhooks iw
      JOIN integrations i ON i.id = iw.integration_id
      WHERE iw.id = webhook_deliveries.webhook_id 
      AND i.user_id = current_user
    )
  );

-- ============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add missing columns to brand_voices table
ALTER TABLE brand_voices 
ADD COLUMN IF NOT EXISTS personality_traits TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS communication_style TEXT,
ADD COLUMN IF NOT EXISTS brand_values TEXT[] DEFAULT '{}';

-- Add missing columns to audience_profiles table
ALTER TABLE audience_profiles 
ADD COLUMN IF NOT EXISTS demographics JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS behavior_patterns JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS content_preferences JSONB DEFAULT '{}';

-- ============================================================================
-- ADD MISSING INDEXES
-- ============================================================================

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS brand_voices_personality_traits_idx ON brand_voices USING GIN(personality_traits);
CREATE INDEX IF NOT EXISTS brand_voices_brand_values_idx ON brand_voices USING GIN(brand_values);
CREATE INDEX IF NOT EXISTS audience_profiles_demographics_idx ON audience_profiles USING GIN(demographics);
CREATE INDEX IF NOT EXISTS audience_profiles_behavior_patterns_idx ON audience_profiles USING GIN(behavior_patterns);
CREATE INDEX IF NOT EXISTS audience_profiles_content_preferences_idx ON audience_profiles USING GIN(content_preferences);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'RLS policies and missing columns added successfully to existing tables!' as status;
