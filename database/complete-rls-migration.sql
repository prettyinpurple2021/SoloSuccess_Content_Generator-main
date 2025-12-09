-- Complete RLS Migration for All User-Specific Tables
-- This script enables Row Level Security on all remaining tables that need user isolation

-- Enable RLS for brand_voices table
ALTER TABLE brand_voices ENABLE ROW LEVEL SECURITY;

-- Create policy for brand_voices - users can only access their own brand voices
DROP POLICY IF EXISTS "Users can access own brand voices" ON brand_voices;
CREATE POLICY "Users can access own brand voices" ON brand_voices
  FOR ALL USING (user_id = current_user);

-- Enable RLS for audience_profiles table
ALTER TABLE audience_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for audience_profiles - users can only access their own audience profiles
DROP POLICY IF EXISTS "Users can access own audience profiles" ON audience_profiles;
CREATE POLICY "Users can access own audience profiles" ON audience_profiles
  FOR ALL USING (user_id = current_user);

-- Enable RLS for campaigns table
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Create policy for campaigns - users can only access their own campaigns
DROP POLICY IF EXISTS "Users can access own campaigns" ON campaigns;
CREATE POLICY "Users can access own campaigns" ON campaigns
  FOR ALL USING (user_id = current_user);

-- Enable RLS for content_series table
ALTER TABLE content_series ENABLE ROW LEVEL SECURITY;

-- Create policy for content_series - users can only access their own content series
DROP POLICY IF EXISTS "Users can access own content series" ON content_series;
CREATE POLICY "Users can access own content series" ON content_series
  FOR ALL USING (user_id = current_user);

-- Enable RLS for integrations table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'integrations') THEN
        ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for integrations - users can only access their own integrations
        DROP POLICY IF EXISTS "Users can access own integrations" ON integrations;
        CREATE POLICY "Users can access own integrations" ON integrations
          FOR ALL USING (user_id = current_user);
    END IF;
END $$;

-- Enable RLS for post_analytics table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'post_analytics') THEN
        ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for post_analytics - users can access analytics for their own posts
        DROP POLICY IF EXISTS "Users can access analytics for own posts" ON post_analytics;
        CREATE POLICY "Users can access analytics for own posts" ON post_analytics
          FOR ALL USING (
            EXISTS (
              SELECT 1 FROM posts 
              WHERE posts.id = post_analytics.post_id 
              AND posts.user_id = current_user
            )
          );
    END IF;
END $$;

-- Enable RLS for content_templates table (if it exists and has user_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'content_templates' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for content_templates - users can access their own templates or public ones
        DROP POLICY IF EXISTS "Users can access own templates or public" ON content_templates;
        CREATE POLICY "Users can access own templates or public" ON content_templates
          FOR ALL USING (user_id = current_user OR is_public = true);
    END IF;
END $$;

-- Enable RLS for image_styles table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'image_styles') THEN
        ALTER TABLE image_styles ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for image_styles - users can only access their own image styles
        DROP POLICY IF EXISTS "Users can access own image styles" ON image_styles;
        CREATE POLICY "Users can access own image styles" ON image_styles
          FOR ALL USING (user_id = current_user);
    END IF;
END $$;

-- Verify RLS is enabled on all expected tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as status
FROM pg_tables 
WHERE tablename IN (
    'posts', 'brand_voices', 'audience_profiles', 'campaigns', 
    'content_series', 'integrations', 'post_analytics', 
    'content_templates', 'image_styles'
)
AND schemaname = 'public'
ORDER BY tablename;