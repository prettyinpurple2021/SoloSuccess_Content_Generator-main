-- Database Performance Optimization Script
-- Run this to apply performance improvements to the database

-- ============================================================================
-- INDEX OPTIMIZATIONS
-- ============================================================================

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_status 
ON posts(user_id, status) 
WHERE status IN ('draft', 'scheduled', 'posted');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_date 
ON posts(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_campaign 
ON posts(user_id, campaign_id) 
WHERE campaign_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_series 
ON posts(user_id, series_id) 
WHERE series_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_schedule_date 
ON posts(schedule_date) 
WHERE schedule_date IS NOT NULL AND status = 'scheduled';

-- Brand voices optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_voices_user_name 
ON brand_voices(user_id, name);

-- Audience profiles optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audience_profiles_user_name 
ON audience_profiles(user_id, name);

-- Campaigns optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_user_status 
ON campaigns(user_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_date_range 
ON campaigns(start_date, end_date);

-- Content series optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_series_campaign 
ON content_series(campaign_id, user_id);

-- Templates optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_user_category 
ON content_templates(user_id, category);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_public_rating 
ON content_templates(is_public, rating DESC) 
WHERE is_public = true;

-- Image styles optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_image_styles_user_name 
ON image_styles(user_id, name);

-- Analytics optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_analytics_post_platform 
ON post_analytics(post_id, platform);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_analytics_recorded_date 
ON post_analytics(recorded_at DESC);

-- Integration optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integrations_user_platform 
ON integrations(user_id, platform);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integrations_status_active 
ON integrations(status, is_active) 
WHERE is_active = true;

-- Integration logs optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integration_logs_integration_timestamp 
ON integration_logs(integration_id, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integration_logs_level_timestamp 
ON integration_logs(level, timestamp DESC) 
WHERE level IN ('error', 'warn');

-- Integration alerts optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integration_alerts_unresolved 
ON integration_alerts(integration_id, created_at DESC) 
WHERE is_resolved = false;

-- Integration metrics optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integration_metrics_integration_recorded 
ON integration_metrics(integration_id, recorded_at DESC);

-- ============================================================================
-- PARTIAL INDEXES FOR BETTER PERFORMANCE
-- ============================================================================

-- Only index active integrations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integrations_active_only 
ON integrations(user_id, platform, last_sync) 
WHERE is_active = true AND status = 'active';

-- Only index scheduled posts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_scheduled_only 
ON posts(user_id, schedule_date) 
WHERE status = 'scheduled' AND schedule_date IS NOT NULL;

-- Only index posts with performance scores
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_performance_scored 
ON posts(user_id, performance_score DESC) 
WHERE performance_score IS NOT NULL;

-- ============================================================================
-- QUERY OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Function to get user posts with optimized query
CREATE OR REPLACE FUNCTION get_user_posts_optimized(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_series_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  topic TEXT,
  idea TEXT,
  content TEXT,
  status TEXT,
  tags TEXT[],
  summary TEXT,
  headlines TEXT[],
  social_media_posts JSONB,
  social_media_tones JSONB,
  social_media_audiences JSONB,
  selected_image TEXT,
  schedule_date TIMESTAMPTZ,
  brand_voice_id UUID,
  audience_profile_id UUID,
  campaign_id UUID,
  series_id UUID,
  template_id UUID,
  performance_score DECIMAL(5,2),
  optimization_suggestions JSONB,
  image_style_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.topic, p.idea, p.content, p.status, p.tags, p.summary, p.headlines,
    p.social_media_posts, p.social_media_tones, p.social_media_audiences,
    p.selected_image, p.schedule_date, p.brand_voice_id, p.audience_profile_id,
    p.campaign_id, p.series_id, p.template_id, p.performance_score,
    p.optimization_suggestions, p.image_style_id, p.created_at, p.updated_at, p.posted_at
  FROM posts p
  WHERE p.user_id = p_user_id
    AND (p_status IS NULL OR p.status = p_status)
    AND (p_campaign_id IS NULL OR p.campaign_id = p_campaign_id)
    AND (p_series_id IS NULL OR p.series_id = p_series_id)
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$ LANGUAGE plpgsql;

-- Function to get posts count with optimized query
CREATE OR REPLACE FUNCTION get_user_posts_count_optimized(
  p_user_id UUID,
  p_status TEXT DEFAULT NULL,
  p_campaign_id UUID DEFAULT NULL,
  p_series_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $
DECLARE
  result_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO result_count
  FROM posts p
  WHERE p.user_id = p_user_id
    AND (p_status IS NULL OR p.status = p_status)
    AND (p_campaign_id IS NULL OR p.campaign_id = p_campaign_id)
    AND (p_series_id IS NULL OR p.series_id = p_series_id);
  
  RETURN result_count;
END;
$ LANGUAGE plpgsql;

-- Function to get dashboard analytics with optimized queries
CREATE OR REPLACE FUNCTION get_dashboard_analytics_optimized(p_user_id UUID)
RETURNS TABLE (
  total_posts BIGINT,
  draft_posts BIGINT,
  scheduled_posts BIGINT,
  posted_posts BIGINT,
  total_engagement BIGINT,
  avg_performance_score DECIMAL(5,2),
  active_campaigns BIGINT,
  active_integrations BIGINT
) AS $
BEGIN
  RETURN QUERY
  WITH post_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'draft') as drafts,
      COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
      COUNT(*) FILTER (WHERE status = 'posted') as posted,
      AVG(performance_score) as avg_score
    FROM posts 
    WHERE user_id = p_user_id
  ),
  engagement_stats AS (
    SELECT COALESCE(SUM(pa.likes + pa.shares + pa.comments + pa.clicks), 0) as total_eng
    FROM posts p
    LEFT JOIN post_analytics pa ON p.id = pa.post_id
    WHERE p.user_id = p_user_id
  ),
  campaign_stats AS (
    SELECT COUNT(*) as active_camps
    FROM campaigns 
    WHERE user_id = p_user_id AND status = 'active'
  ),
  integration_stats AS (
    SELECT COUNT(*) as active_ints
    FROM integrations 
    WHERE user_id = p_user_id AND is_active = true AND status = 'active'
  )
  SELECT 
    ps.total,
    ps.drafts,
    ps.scheduled,
    ps.posted,
    es.total_eng,
    ps.avg_score,
    cs.active_camps,
    is_t.active_ints
  FROM post_stats ps
  CROSS JOIN engagement_stats es
  CROSS JOIN campaign_stats cs
  CROSS JOIN integration_stats is_t;
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- View for slow queries monitoring
CREATE OR REPLACE VIEW slow_queries_monitor AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time
FROM pg_stat_statements 
WHERE mean_time > 100 -- Queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- View for index usage statistics
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN 'Unused'
    WHEN idx_scan < 10 THEN 'Low Usage'
    WHEN idx_scan < 100 THEN 'Medium Usage'
    ELSE 'High Usage'
  END as usage_category
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- View for table statistics
CREATE OR REPLACE VIEW table_performance_stats AS
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  CASE 
    WHEN (seq_scan + idx_scan) = 0 THEN 0
    ELSE ROUND((seq_scan::DECIMAL / (seq_scan + idx_scan)) * 100, 2)
  END as seq_scan_percentage
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan_percentage DESC;

-- ============================================================================
-- MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS TEXT AS $
BEGIN
  ANALYZE posts;
  ANALYZE brand_voices;
  ANALYZE audience_profiles;
  ANALYZE campaigns;
  ANALYZE content_series;
  ANALYZE content_templates;
  ANALYZE image_styles;
  ANALYZE post_analytics;
  ANALYZE integrations;
  ANALYZE integration_logs;
  ANALYZE integration_alerts;
  ANALYZE integration_metrics;
  ANALYZE integration_webhooks;
  
  RETURN 'Table statistics updated successfully';
END;
$ LANGUAGE plpgsql;

-- Function to reindex tables
CREATE OR REPLACE FUNCTION reindex_performance_critical_tables()
RETURNS TEXT AS $
BEGIN
  REINDEX TABLE posts;
  REINDEX TABLE brand_voices;
  REINDEX TABLE audience_profiles;
  REINDEX TABLE campaigns;
  REINDEX TABLE integrations;
  REINDEX TABLE post_analytics;
  
  RETURN 'Performance critical tables reindexed successfully';
END;
$ LANGUAGE plpgsql;

-- Function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data(days_to_keep INTEGER DEFAULT 90)
RETURNS TEXT AS $
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM post_analytics 
  WHERE recorded_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM integration_logs 
  WHERE timestamp < NOW() - INTERVAL '1 day' * days_to_keep;
  
  DELETE FROM integration_metrics 
  WHERE recorded_at < NOW() - INTERVAL '1 day' * days_to_keep;
  
  RETURN 'Cleaned up ' || deleted_count || ' old analytics records';
END;
$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE CONFIGURATION
-- ============================================================================

-- Update PostgreSQL configuration for better performance
-- Note: These would typically be set in postgresql.conf, but can be set per session

-- Increase work memory for complex queries
SET work_mem = '256MB';

-- Increase maintenance work memory for index operations
SET maintenance_work_mem = '512MB';

-- Enable parallel query execution
SET max_parallel_workers_per_gather = 4;

-- Optimize random page cost for SSD storage
SET random_page_cost = 1.1;

-- Enable query plan caching
SET plan_cache_mode = 'auto';

-- ============================================================================
-- MONITORING SETUP
-- ============================================================================

-- Enable pg_stat_statements extension for query monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Reset statistics to start fresh monitoring
SELECT pg_stat_statements_reset();

-- Update table statistics after creating indexes
SELECT update_table_statistics();

-- Create a performance monitoring function that can be called periodically
CREATE OR REPLACE FUNCTION performance_health_check()
RETURNS TABLE (
  metric_name TEXT,
  metric_value TEXT,
  status TEXT,
  recommendation TEXT
) AS $
DECLARE
  slow_query_count INTEGER;
  unused_index_count INTEGER;
  high_seq_scan_tables INTEGER;
  avg_query_time DECIMAL;
BEGIN
  -- Check for slow queries
  SELECT COUNT(*) INTO slow_query_count
  FROM pg_stat_statements 
  WHERE mean_time > 1000; -- Queries taking more than 1 second
  
  -- Check for unused indexes
  SELECT COUNT(*) INTO unused_index_count
  FROM pg_stat_user_indexes 
  WHERE idx_scan = 0 AND schemaname = 'public';
  
  -- Check for tables with high sequential scan ratio
  SELECT COUNT(*) INTO high_seq_scan_tables
  FROM pg_stat_user_tables 
  WHERE schemaname = 'public' 
    AND (seq_scan::DECIMAL / GREATEST(seq_scan + idx_scan, 1)) > 0.1;
  
  -- Get average query time
  SELECT COALESCE(AVG(mean_time), 0) INTO avg_query_time
  FROM pg_stat_statements;
  
  -- Return metrics
  RETURN QUERY VALUES 
    ('slow_queries', slow_query_count::TEXT, 
     CASE WHEN slow_query_count > 5 THEN 'WARNING' ELSE 'OK' END,
     CASE WHEN slow_query_count > 5 THEN 'Review and optimize slow queries' ELSE 'Performance is good' END),
    ('unused_indexes', unused_index_count::TEXT,
     CASE WHEN unused_index_count > 3 THEN 'WARNING' ELSE 'OK' END,
     CASE WHEN unused_index_count > 3 THEN 'Consider dropping unused indexes' ELSE 'Index usage is optimal' END),
    ('high_seq_scan_tables', high_seq_scan_tables::TEXT,
     CASE WHEN high_seq_scan_tables > 2 THEN 'WARNING' ELSE 'OK' END,
     CASE WHEN high_seq_scan_tables > 2 THEN 'Add indexes to reduce sequential scans' ELSE 'Index coverage is good' END),
    ('avg_query_time_ms', ROUND(avg_query_time, 2)::TEXT,
     CASE WHEN avg_query_time > 500 THEN 'WARNING' WHEN avg_query_time > 100 THEN 'CAUTION' ELSE 'OK' END,
     CASE WHEN avg_query_time > 500 THEN 'Query performance needs optimization' 
          WHEN avg_query_time > 100 THEN 'Monitor query performance closely'
          ELSE 'Query performance is good' END);
END;
$ LANGUAGE plpgsql;

-- Create a function to get performance recommendations
CREATE OR REPLACE FUNCTION get_performance_recommendations()
RETURNS TABLE (
  category TEXT,
  recommendation TEXT,
  priority TEXT,
  sql_command TEXT
) AS $
BEGIN
  RETURN QUERY
  -- Check for missing indexes based on query patterns
  WITH missing_indexes AS (
    SELECT 
      'Indexing' as category,
      'Add composite index for user_id + status queries' as recommendation,
      'HIGH' as priority,
      'CREATE INDEX CONCURRENTLY idx_posts_user_status ON posts(user_id, status);' as sql_command
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'posts' AND indexname LIKE '%user%status%'
    )
    
    UNION ALL
    
    SELECT 
      'Indexing' as category,
      'Add index for date range queries' as recommendation,
      'MEDIUM' as priority,
      'CREATE INDEX CONCURRENTLY idx_posts_date_range ON posts(created_at DESC);' as sql_command
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'posts' AND indexname LIKE '%created_at%'
    )
  )
  SELECT * FROM missing_indexes;
END;
$ LANGUAGE plpgsql;

-- Final message
SELECT 'Database performance optimization script completed successfully' as status;