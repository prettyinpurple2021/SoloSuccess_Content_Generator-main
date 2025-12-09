-- Rollback script for Enhanced Content Features Migration
-- Run this script to remove all enhanced features and revert to base schema
-- WARNING: This will delete all data in the enhanced tables

-- ============================================================================
-- 1. REMOVE TRIGGERS
-- ============================================================================
DROP TRIGGER IF EXISTS post_analytics_performance_trigger ON post_analytics;
DROP TRIGGER IF EXISTS update_image_styles_updated_at ON image_styles;
DROP TRIGGER IF EXISTS update_content_templates_updated_at ON content_templates;
DROP TRIGGER IF EXISTS update_content_series_updated_at ON content_series;
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
DROP TRIGGER IF EXISTS update_audience_profiles_updated_at ON audience_profiles;
DROP TRIGGER IF EXISTS update_brand_voices_updated_at ON brand_voices;

-- ============================================================================
-- 2. REMOVE HELPER FUNCTIONS
-- ============================================================================
DROP FUNCTION IF EXISTS trigger_update_performance_score();
DROP FUNCTION IF EXISTS update_post_performance_score(UUID);
DROP FUNCTION IF EXISTS calculate_engagement_rate(INTEGER, INTEGER, INTEGER, INTEGER);

-- ============================================================================
-- 3. REMOVE NEW COLUMNS FROM POSTS TABLE
-- ============================================================================
ALTER TABLE posts 
DROP COLUMN IF EXISTS optimization_suggestions,
DROP COLUMN IF EXISTS performance_score,
DROP COLUMN IF EXISTS image_style_id,
DROP COLUMN IF EXISTS template_id,
DROP COLUMN IF EXISTS series_id,
DROP COLUMN IF EXISTS campaign_id,
DROP COLUMN IF EXISTS audience_profile_id,
DROP COLUMN IF EXISTS brand_voice_id;

-- ============================================================================
-- 4. REMOVE REALTIME SUBSCRIPTIONS
-- ============================================================================
-- Note: Neon PostgreSQL doesn't have built-in realtime like Supabase.
-- No realtime publication cleanup needed for Neon.

-- ============================================================================
-- 5. DROP TABLES (in reverse dependency order)
-- ============================================================================
DROP TABLE IF EXISTS post_analytics;
DROP TABLE IF EXISTS image_styles;
DROP TABLE IF EXISTS content_templates;
DROP TABLE IF EXISTS content_series;
DROP TABLE IF EXISTS campaigns;
DROP TABLE IF EXISTS audience_profiles;
DROP TABLE IF EXISTS brand_voices;

-- Rollback completed - all enhanced features removed