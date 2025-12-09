-- Schema Verification Script
-- Run this script to verify that the enhanced schema migration was applied correctly

-- ============================================================================
-- 1. VERIFY ALL TABLES EXIST
-- ============================================================================
SELECT 
  'Tables Check' as check_type,
  CASE 
    WHEN COUNT(*) = 8 THEN 'PASS: All 8 tables exist'
    ELSE 'FAIL: Missing tables. Found ' || COUNT(*) || ' of 8 expected tables'
  END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'posts', 'brand_voices', 'audience_profiles', 'campaigns', 
  'content_series', 'post_analytics', 'content_templates', 'image_styles'
);

-- ============================================================================
-- 2. VERIFY POSTS TABLE EXTENSIONS
-- ============================================================================
SELECT 
  'Posts Extensions Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 8 THEN 'PASS: All new columns added to posts table'
    ELSE 'FAIL: Missing columns in posts table. Found ' || COUNT(*) || ' new columns'
  END as result
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'posts'
AND column_name IN (
  'brand_voice_id', 'audience_profile_id', 'campaign_id', 'series_id',
  'template_id', 'image_style_id', 'performance_score', 'optimization_suggestions'
);

-- ============================================================================
-- 3. VERIFY ROW LEVEL SECURITY IS ENABLED
-- ============================================================================
SELECT 
  'RLS Check' as check_type,
  CASE 
    WHEN COUNT(*) = 7 THEN 'PASS: RLS enabled on all new tables'
    ELSE 'FAIL: RLS not enabled on all tables. Found ' || COUNT(*) || ' of 7 expected'
  END as result
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
AND c.relname IN (
  'brand_voices', 'audience_profiles', 'campaigns', 
  'content_series', 'post_analytics', 'content_templates', 'image_styles'
)
AND c.relrowsecurity = true;

-- ============================================================================
-- 4. VERIFY INDEXES EXIST
-- ============================================================================
SELECT 
  'Indexes Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 20 THEN 'PASS: Sufficient indexes created'
    ELSE 'WARN: Only ' || COUNT(*) || ' indexes found, expected 20+'
  END as result
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
  'brand_voices', 'audience_profiles', 'campaigns', 
  'content_series', 'post_analytics', 'content_templates', 'image_styles'
);

-- ============================================================================
-- 5. VERIFY TRIGGERS EXIST
-- ============================================================================
SELECT 
  'Triggers Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 6 THEN 'PASS: Update triggers created'
    ELSE 'FAIL: Missing triggers. Found ' || COUNT(*) || ' triggers'
  END as result
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%updated_at%'
AND event_object_table IN (
  'brand_voices', 'audience_profiles', 'campaigns', 
  'content_series', 'content_templates', 'image_styles'
);

-- ============================================================================
-- 6. VERIFY HELPER FUNCTIONS EXIST
-- ============================================================================
SELECT 
  'Functions Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 3 THEN 'PASS: Helper functions created'
    ELSE 'FAIL: Missing functions. Found ' || COUNT(*) || ' functions'
  END as result
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
  'calculate_engagement_rate', 
  'update_post_performance_score', 
  'trigger_update_performance_score'
);

-- ============================================================================
-- 7. VERIFY FOREIGN KEY CONSTRAINTS
-- ============================================================================
SELECT 
  'Foreign Keys Check' as check_type,
  CASE 
    WHEN COUNT(*) >= 10 THEN 'PASS: Foreign key constraints created'
    ELSE 'WARN: Only ' || COUNT(*) || ' foreign keys found'
  END as result
FROM information_schema.table_constraints 
WHERE constraint_schema = 'public'
AND constraint_type = 'FOREIGN KEY'
AND table_name IN (
  'posts', 'brand_voices', 'audience_profiles', 'campaigns', 
  'content_series', 'post_analytics', 'content_templates', 'image_styles'
);

-- ============================================================================
-- 8. TEST SAMPLE DATA INSERTION (OPTIONAL)
-- ============================================================================
-- This will only work if you have an authenticated user session
SELECT 
  'Sample Data Check' as check_type,
  CASE 
    WHEN auth.uid() IS NULL THEN 'SKIP: No authenticated user for sample data test'
    WHEN (SELECT COUNT(*) FROM brand_voices WHERE user_id = auth.uid()) > 0 
    THEN 'PASS: Sample data exists'
    ELSE 'INFO: No sample data found (this is normal for production)'
  END as result;

-- Summary
SELECT '=== SCHEMA VERIFICATION COMPLETE ===' as summary;