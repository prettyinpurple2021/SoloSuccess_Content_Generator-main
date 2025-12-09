-- Neon Database Schema for SoloSuccess AI Content Factory
-- Run this in your Neon SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  brand_voice_id UUID,
  audience_profile_id UUID,
  campaign_id UUID,
  series_id UUID,
  template_id UUID,
  performance_score DECIMAL(5,2),
  optimization_suggestions JSONB,
  image_style_id UUID
);

-- Create brand_voices table
CREATE TABLE IF NOT EXISTS brand_voices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  tone TEXT NOT NULL,
  vocabulary TEXT,
  writing_style TEXT,
  target_audience TEXT,
  sample_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audience_profiles table
CREATE TABLE IF NOT EXISTS audience_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  age_range TEXT,
  industry TEXT,
  interests JSONB,
  pain_points JSONB,
  preferred_content_types JSONB,
  engagement_patterns JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  theme TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  platforms TEXT[] DEFAULT '{}',
  status TEXT CHECK (status IN ('planning', 'active', 'paused', 'completed')) DEFAULT 'planning',
  performance JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create content_series table
CREATE TABLE IF NOT EXISTS content_series (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  theme TEXT,
  total_posts INTEGER DEFAULT 0,
  frequency TEXT,
  current_post INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create content_templates table
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  industry TEXT,
  content_type TEXT,
  structure JSONB,
  customizable_fields JSONB,
  usage_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create image_styles table
CREATE TABLE IF NOT EXISTS image_styles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  style_prompt TEXT,
  color_palette JSONB,
  visual_elements JSONB,
  brand_assets JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create post_analytics table
CREATE TABLE IF NOT EXISTS post_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT CHECK (status IN ('active', 'inactive', 'error', 'pending')) DEFAULT 'pending',
  credentials JSONB,
  configuration JSONB,
  last_sync TIMESTAMPTZ,
  sync_frequency TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create integration_logs table
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  level TEXT CHECK (level IN ('info', 'warn', 'error', 'debug')) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create integration_alerts table
CREATE TABLE IF NOT EXISTS integration_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- Create integration_metrics table
CREATE TABLE IF NOT EXISTS integration_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  average_response_time DECIMAL(10,2) DEFAULT 0,
  last_request_time TIMESTAMPTZ,
  error_rate DECIMAL(5,2) DEFAULT 0,
  uptime DECIMAL(5,2) DEFAULT 100,
  data_processed BIGINT DEFAULT 0,
  sync_count INTEGER DEFAULT 0,
  last_sync_duration INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create integration_webhooks table
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT,
  is_active BOOLEAN DEFAULT true,
  retry_policy JSONB,
  headers JSONB,
  timeout INTEGER DEFAULT 30000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts(status);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_schedule_date_idx ON posts(schedule_date);
CREATE INDEX IF NOT EXISTS posts_brand_voice_id_idx ON posts(brand_voice_id);
CREATE INDEX IF NOT EXISTS posts_campaign_id_idx ON posts(campaign_id);
CREATE INDEX IF NOT EXISTS posts_series_id_idx ON posts(series_id);

CREATE INDEX IF NOT EXISTS brand_voices_user_id_idx ON brand_voices(user_id);
CREATE INDEX IF NOT EXISTS audience_profiles_user_id_idx ON audience_profiles(user_id);
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS content_series_user_id_idx ON content_series(user_id);
CREATE INDEX IF NOT EXISTS content_templates_user_id_idx ON content_templates(user_id);
CREATE INDEX IF NOT EXISTS image_styles_user_id_idx ON image_styles(user_id);

CREATE INDEX IF NOT EXISTS post_analytics_post_id_idx ON post_analytics(post_id);
CREATE INDEX IF NOT EXISTS post_analytics_platform_idx ON post_analytics(platform);
CREATE INDEX IF NOT EXISTS post_analytics_recorded_at_idx ON post_analytics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS integrations_user_id_idx ON integrations(user_id);
CREATE INDEX IF NOT EXISTS integrations_platform_idx ON integrations(platform);
CREATE INDEX IF NOT EXISTS integrations_status_idx ON integrations(status);

CREATE INDEX IF NOT EXISTS integration_logs_integration_id_idx ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS integration_logs_timestamp_idx ON integration_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS integration_alerts_integration_id_idx ON integration_alerts(integration_id);
CREATE INDEX IF NOT EXISTS integration_alerts_is_resolved_idx ON integration_alerts(is_resolved);

CREATE INDEX IF NOT EXISTS integration_metrics_integration_id_idx ON integration_metrics(integration_id);
CREATE INDEX IF NOT EXISTS integration_metrics_recorded_at_idx ON integration_metrics(recorded_at DESC);

CREATE INDEX IF NOT EXISTS integration_webhooks_integration_id_idx ON integration_webhooks(integration_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_webhooks_updated_at BEFORE UPDATE ON integration_webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate performance report
CREATE OR REPLACE FUNCTION generate_performance_report(
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_posts BIGINT,
  total_engagement BIGINT,
  avg_engagement_rate DECIMAL(10,2),
  platform_breakdown JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH platform_stats AS (
    SELECT 
      pa.platform,
      COUNT(DISTINCT p.id) as posts_count,
      SUM(pa.likes + pa.shares + pa.comments + pa.clicks) as total_engagement,
      SUM(pa.impressions) as total_impressions,
      CASE 
        WHEN SUM(pa.impressions) > 0 
        THEN (SUM(pa.likes + pa.shares + pa.comments + pa.clicks)::DECIMAL / SUM(pa.impressions)) * 100
        ELSE 0 
      END as engagement_rate
    FROM posts p
    LEFT JOIN post_analytics pa ON p.id = pa.post_id
    WHERE p.created_at BETWEEN start_date AND end_date
    GROUP BY pa.platform
  ),
  overall_stats AS (
    SELECT 
      COUNT(DISTINCT p.id) as total_posts,
      COALESCE(SUM(pa.likes + pa.shares + pa.comments + pa.clicks), 0) as total_engagement,
      CASE 
        WHEN SUM(pa.impressions) > 0 
        THEN (SUM(pa.likes + pa.shares + pa.comments + pa.clicks)::DECIMAL / SUM(pa.impressions)) * 100
        ELSE 0 
      END as avg_engagement_rate
    FROM posts p
    LEFT JOIN post_analytics pa ON p.id = pa.post_id
    WHERE p.created_at BETWEEN start_date AND end_date
  )
  SELECT 
    os.total_posts,
    os.total_engagement,
    os.avg_engagement_rate,
    COALESCE(jsonb_object_agg(ps.platform, jsonb_build_object(
      'posts', ps.posts_count,
      'engagement', ps.total_engagement,
      'engagement_rate', ps.engagement_rate
    )), '{}'::jsonb) as platform_breakdown
  FROM overall_stats os
  LEFT JOIN platform_stats ps ON true
  GROUP BY os.total_posts, os.total_engagement, os.avg_engagement_rate;
END;
$$ LANGUAGE plpgsql;

-- Create function to get top performing content
CREATE OR REPLACE FUNCTION get_top_performing_content(
  limit_count INTEGER DEFAULT 10,
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  post_id UUID,
  topic TEXT,
  total_engagement BIGINT,
  platform TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as post_id,
    p.topic,
    SUM(pa.likes + pa.shares + pa.comments + pa.clicks) as total_engagement,
    pa.platform
  FROM posts p
  LEFT JOIN post_analytics pa ON p.id = pa.post_id
  WHERE (start_date IS NULL OR p.created_at >= start_date)
    AND (end_date IS NULL OR p.created_at <= end_date)
  GROUP BY p.id, p.topic, pa.platform
  ORDER BY total_engagement DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM post_analytics 
  WHERE recorded_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get integration health status
CREATE OR REPLACE FUNCTION get_integration_health(integration_uuid UUID)
RETURNS TABLE (
  is_healthy BOOLEAN,
  last_sync TIMESTAMPTZ,
  error_rate DECIMAL(5,2),
  uptime DECIMAL(5,2),
  total_requests BIGINT,
  failed_requests BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN i.last_sync > NOW() - INTERVAL '24 hours' 
        AND COALESCE(im.error_rate, 0) < 10 
        AND COALESCE(im.uptime, 100) > 90
      THEN true 
      ELSE false 
    END as is_healthy,
    i.last_sync,
    COALESCE(im.error_rate, 0) as error_rate,
    COALESCE(im.uptime, 100) as uptime,
    COALESCE(im.total_requests, 0) as total_requests,
    COALESCE(im.failed_requests, 0) as failed_requests
  FROM integrations i
  LEFT JOIN integration_metrics im ON i.id = im.integration_id
  WHERE i.id = integration_uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing
INSERT INTO posts (user_id, topic, idea, content, status) VALUES 
  ('00000000-0000-0000-0000-000000000000', 'AI Content Creation', 'Automated social media posts', 'This is a sample post about AI content creation...', 'draft')
ON CONFLICT DO NOTHING;

-- Create a view for dashboard analytics
CREATE OR REPLACE VIEW dashboard_analytics AS
SELECT 
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT CASE WHEN p.status = 'posted' THEN p.id END) as posted_posts,
  COUNT(DISTINCT CASE WHEN p.status = 'scheduled' THEN p.id END) as scheduled_posts,
  COUNT(DISTINCT CASE WHEN p.status = 'draft' THEN p.id END) as draft_posts,
  COALESCE(SUM(pa.likes + pa.shares + pa.comments + pa.clicks), 0) as total_engagement,
  COALESCE(SUM(pa.impressions), 0) as total_impressions,
  CASE 
    WHEN SUM(pa.impressions) > 0 
    THEN (SUM(pa.likes + pa.shares + pa.comments + pa.clicks)::DECIMAL / SUM(pa.impressions)) * 100
    ELSE 0 
  END as avg_engagement_rate
FROM posts p
LEFT JOIN post_analytics pa ON p.id = pa.post_id;

-- Grant necessary permissions (adjust as needed for your setup)
-- These would typically be handled by your Neon project settings
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
