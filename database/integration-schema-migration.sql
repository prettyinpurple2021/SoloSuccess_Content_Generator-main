-- Integration Manager Database Schema Migration
-- This script creates all tables and functions needed for the Integration Manager
-- Run this in your Neon SQL Editor after the base schema

-- ============================================================================
-- 1. INTEGRATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('social_media', 'analytics', 'crm', 'email', 'storage', 'ai_service')),
  platform TEXT NOT NULL,
  status JSONB DEFAULT '{"connected": false, "syncInProgress": false, "errorCount": 0, "healthScore": 0}',
  credentials JSONB NOT NULL, -- Encrypted
  configuration JSONB DEFAULT '{}',
  last_sync TIMESTAMPTZ,
  sync_frequency TEXT CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly', 'manual')) DEFAULT 'hourly',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for integrations
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for integrations
CREATE POLICY "Users can access own integrations" ON integrations
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for integrations
CREATE INDEX IF NOT EXISTS integrations_user_id_idx ON integrations(user_id);
CREATE INDEX IF NOT EXISTS integrations_platform_idx ON integrations(platform);
CREATE INDEX IF NOT EXISTS integrations_type_idx ON integrations(type);
CREATE INDEX IF NOT EXISTS integrations_status_idx ON integrations USING GIN (status);
CREATE INDEX IF NOT EXISTS integrations_is_active_idx ON integrations(is_active);
CREATE INDEX IF NOT EXISTS integrations_last_sync_idx ON integrations(last_sync DESC);

-- ============================================================================
-- 2. INTEGRATION WEBHOOKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] DEFAULT '{}',
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  retry_policy JSONB DEFAULT '{"maxRetries": 3, "backoffMultiplier": 2, "initialDelay": 1000, "maxDelay": 30000}',
  headers JSONB DEFAULT '{}',
  timeout INTEGER DEFAULT 30000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for integration_webhooks
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS policies for integration_webhooks
CREATE POLICY "Users can access own webhooks" ON integration_webhooks
  FOR ALL USING (
    EXISTS (SELECT 1 FROM integrations WHERE id = integration_webhooks.integration_id AND user_id = auth.uid())
  );

-- Indexes for integration_webhooks
CREATE INDEX IF NOT EXISTS integration_webhooks_integration_id_idx ON integration_webhooks(integration_id);
CREATE INDEX IF NOT EXISTS integration_webhooks_is_active_idx ON integration_webhooks(is_active);
CREATE INDEX IF NOT EXISTS integration_webhooks_events_idx ON integration_webhooks USING GIN (events);

-- ============================================================================
-- 3. INTEGRATION LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  level TEXT CHECK (level IN ('info', 'warn', 'error', 'debug')) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for integration_logs
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for integration_logs
CREATE POLICY "Users can access own integration logs" ON integration_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM integrations WHERE id = integration_logs.integration_id AND user_id = auth.uid())
  );

-- Indexes for integration_logs
CREATE INDEX IF NOT EXISTS integration_logs_integration_id_idx ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS integration_logs_level_idx ON integration_logs(level);
CREATE INDEX IF NOT EXISTS integration_logs_created_at_idx ON integration_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS integration_logs_metadata_idx ON integration_logs USING GIN (metadata);

-- ============================================================================
-- 4. INTEGRATION ALERTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('error', 'warning', 'info', 'success')) NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for integration_alerts
ALTER TABLE integration_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for integration_alerts
CREATE POLICY "Users can access own integration alerts" ON integration_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM integrations WHERE id = integration_alerts.integration_id AND user_id = auth.uid())
  );

-- Indexes for integration_alerts
CREATE INDEX IF NOT EXISTS integration_alerts_integration_id_idx ON integration_alerts(integration_id);
CREATE INDEX IF NOT EXISTS integration_alerts_type_idx ON integration_alerts(type);
CREATE INDEX IF NOT EXISTS integration_alerts_severity_idx ON integration_alerts(severity);
CREATE INDEX IF NOT EXISTS integration_alerts_is_resolved_idx ON integration_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS integration_alerts_created_at_idx ON integration_alerts(created_at DESC);

-- ============================================================================
-- 5. INTEGRATION METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS integration_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  average_response_time DECIMAL(10,2) DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  error_rate DECIMAL(5,2) DEFAULT 0,
  uptime DECIMAL(5,2) DEFAULT 0,
  data_processed BIGINT DEFAULT 0,
  sync_count INTEGER DEFAULT 0,
  last_request_time TIMESTAMPTZ,
  last_sync_duration INTEGER DEFAULT 0,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for integration_metrics
ALTER TABLE integration_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for integration_metrics
CREATE POLICY "Users can access own integration metrics" ON integration_metrics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM integrations WHERE id = integration_metrics.integration_id AND user_id = auth.uid())
  );

-- Indexes for integration_metrics
CREATE INDEX IF NOT EXISTS integration_metrics_integration_id_idx ON integration_metrics(integration_id);
CREATE INDEX IF NOT EXISTS integration_metrics_recorded_at_idx ON integration_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS integration_metrics_success_rate_idx ON integration_metrics(success_rate DESC);

-- ============================================================================
-- 6. WEBHOOK DELIVERIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID REFERENCES integration_webhooks(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'delivering', 'delivered', 'failed')) DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  response_status INTEGER,
  response_headers JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for webhook_deliveries
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhook_deliveries
CREATE POLICY "Users can access own webhook deliveries" ON webhook_deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM integration_webhooks iw
      JOIN integrations i ON i.id = iw.integration_id
      WHERE iw.id = webhook_deliveries.webhook_id AND i.user_id = auth.uid()
    )
  );

-- Indexes for webhook_deliveries
CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_id_idx ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS webhook_deliveries_status_idx ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS webhook_deliveries_event_idx ON webhook_deliveries(event);
CREATE INDEX IF NOT EXISTS webhook_deliveries_created_at_idx ON webhook_deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS webhook_deliveries_next_retry_at_idx ON webhook_deliveries(next_retry_at);

-- ============================================================================
-- 7. CREATE UPDATED_AT TRIGGERS
-- ============================================================================
-- Integrations trigger
CREATE TRIGGER update_integrations_updated_at 
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Integration webhooks trigger
CREATE TRIGGER update_integration_webhooks_updated_at 
  BEFORE UPDATE ON integration_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Integration alerts trigger
CREATE TRIGGER update_integration_alerts_updated_at 
  BEFORE UPDATE ON integration_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Webhook deliveries trigger
CREATE TRIGGER update_webhook_deliveries_updated_at 
  BEFORE UPDATE ON webhook_deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. ENABLE REALTIME FOR INTEGRATION TABLES
-- ============================================================================
-- Enable realtime subscriptions for integration tables
-- Note: Neon PostgreSQL doesn't have built-in realtime like Supabase.
-- If you need realtime functionality, consider using WebSockets, SSE, or third-party services.

-- ============================================================================
-- 9. CREATE INTEGRATION HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate integration health score
CREATE OR REPLACE FUNCTION calculate_integration_health_score(p_integration_id UUID)
RETURNS INTEGER AS $$
DECLARE
  health_score INTEGER := 0;
  connection_status BOOLEAN;
  recent_errors INTEGER;
  last_sync_age INTERVAL;
  sync_frequency TEXT;
BEGIN
  -- Get integration details
  SELECT 
    (status->>'connected')::BOOLEAN,
    (status->>'errorCount')::INTEGER,
    last_sync,
    sync_frequency
  INTO connection_status, recent_errors, last_sync_age, sync_frequency
  FROM integrations 
  WHERE id = p_integration_id;
  
  -- Base score for connection
  IF connection_status THEN
    health_score := health_score + 40;
  END IF;
  
  -- Score for error count (lower is better)
  IF recent_errors = 0 THEN
    health_score := health_score + 30;
  ELSIF recent_errors < 5 THEN
    health_score := health_score + 20;
  ELSIF recent_errors < 10 THEN
    health_score := health_score + 10;
  END IF;
  
  -- Score for sync recency
  IF last_sync IS NOT NULL THEN
    CASE sync_frequency
      WHEN 'realtime' THEN
        IF last_sync > NOW() - INTERVAL '5 minutes' THEN
          health_score := health_score + 30;
        ELSIF last_sync > NOW() - INTERVAL '15 minutes' THEN
          health_score := health_score + 20;
        ELSIF last_sync > NOW() - INTERVAL '1 hour' THEN
          health_score := health_score + 10;
        END IF;
      WHEN 'hourly' THEN
        IF last_sync > NOW() - INTERVAL '2 hours' THEN
          health_score := health_score + 30;
        ELSIF last_sync > NOW() - INTERVAL '6 hours' THEN
          health_score := health_score + 20;
        ELSIF last_sync > NOW() - INTERVAL '24 hours' THEN
          health_score := health_score + 10;
        END IF;
      WHEN 'daily' THEN
        IF last_sync > NOW() - INTERVAL '2 days' THEN
          health_score := health_score + 30;
        ELSIF last_sync > NOW() - INTERVAL '7 days' THEN
          health_score := health_score + 20;
        ELSIF last_sync > NOW() - INTERVAL '14 days' THEN
          health_score := health_score + 10;
        END IF;
      WHEN 'weekly' THEN
        IF last_sync > NOW() - INTERVAL '2 weeks' THEN
          health_score := health_score + 30;
        ELSIF last_sync > NOW() - INTERVAL '1 month' THEN
          health_score := health_score + 20;
        ELSIF last_sync > NOW() - INTERVAL '2 months' THEN
          health_score := health_score + 10;
        END IF;
    END CASE;
  END IF;
  
  -- Ensure score is between 0 and 100
  health_score := GREATEST(0, LEAST(100, health_score));
  
  RETURN health_score;
END;
$$ LANGUAGE plpgsql;

-- Function to update integration health score
CREATE OR REPLACE FUNCTION update_integration_health_score(p_integration_id UUID)
RETURNS VOID AS $$
DECLARE
  new_health_score INTEGER;
BEGIN
  new_health_score := calculate_integration_health_score(p_integration_id);
  
  UPDATE integrations 
  SET 
    status = jsonb_set(
      status, 
      '{healthScore}', 
      to_jsonb(new_health_score)
    ),
    updated_at = NOW()
  WHERE id = p_integration_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create integration alert
CREATE OR REPLACE FUNCTION create_integration_alert(
  p_integration_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'medium',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO integration_alerts (
    integration_id,
    type,
    title,
    message,
    severity,
    metadata
  ) VALUES (
    p_integration_id,
    p_type,
    p_title,
    p_message,
    p_severity,
    p_metadata
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log integration activity
CREATE OR REPLACE FUNCTION log_integration_activity(
  p_integration_id UUID,
  p_level TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO integration_logs (
    integration_id,
    level,
    message,
    metadata
  ) VALUES (
    p_integration_id,
    p_level,
    p_message,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record integration metrics
CREATE OR REPLACE FUNCTION record_integration_metrics(
  p_integration_id UUID,
  p_total_requests INTEGER DEFAULT 0,
  p_successful_requests INTEGER DEFAULT 0,
  p_failed_requests INTEGER DEFAULT 0,
  p_average_response_time DECIMAL DEFAULT 0,
  p_data_processed BIGINT DEFAULT 0,
  p_sync_count INTEGER DEFAULT 0,
  p_last_sync_duration INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  metrics_id UUID;
  success_rate DECIMAL(5,2);
  error_rate DECIMAL(5,2);
BEGIN
  -- Calculate rates
  IF p_total_requests > 0 THEN
    success_rate := (p_successful_requests::DECIMAL / p_total_requests::DECIMAL) * 100;
    error_rate := (p_failed_requests::DECIMAL / p_total_requests::DECIMAL) * 100;
  ELSE
    success_rate := 0;
    error_rate := 0;
  END IF;
  
  INSERT INTO integration_metrics (
    integration_id,
    total_requests,
    successful_requests,
    failed_requests,
    average_response_time,
    success_rate,
    error_rate,
    data_processed,
    sync_count,
    last_sync_duration,
    last_request_time
  ) VALUES (
    p_integration_id,
    p_total_requests,
    p_successful_requests,
    p_failed_requests,
    p_average_response_time,
    success_rate,
    error_rate,
    p_data_processed,
    p_sync_count,
    p_last_sync_duration,
    NOW()
  ) RETURNING id INTO metrics_id;
  
  -- Update integration health score
  PERFORM update_integration_health_score(p_integration_id);
  
  RETURN metrics_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. CREATE TRIGGERS FOR AUTOMATIC HEALTH SCORE UPDATES
-- ============================================================================

-- Trigger to update health score when integration status changes
CREATE OR REPLACE FUNCTION trigger_update_integration_health()
RETURNS TRIGGER AS $$
BEGIN
  -- Update health score when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM update_integration_health_score(NEW.id);
  END IF;
  
  -- Update health score when last_sync changes
  IF OLD.last_sync IS DISTINCT FROM NEW.last_sync THEN
    PERFORM update_integration_health_score(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER integration_health_update_trigger
  AFTER UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION trigger_update_integration_health();

-- ============================================================================
-- 11. CREATE VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for integration status overview
CREATE OR REPLACE VIEW integration_status_overview AS
SELECT 
  i.id,
  i.name,
  i.type,
  i.platform,
  i.status,
  i.is_active,
  i.last_sync,
  i.sync_frequency,
  i.created_at,
  i.updated_at,
  COALESCE(im.success_rate, 0) as success_rate,
  COALESCE(im.error_rate, 0) as error_rate,
  COALESCE(im.average_response_time, 0) as average_response_time,
  COALESCE(im.uptime, 0) as uptime
FROM integrations i
LEFT JOIN LATERAL (
  SELECT 
    success_rate,
    error_rate,
    average_response_time,
    uptime
  FROM integration_metrics 
  WHERE integration_id = i.id 
  ORDER BY recorded_at DESC 
  LIMIT 1
) im ON true;

-- View for recent integration activity
CREATE OR REPLACE VIEW recent_integration_activity AS
SELECT 
  i.id as integration_id,
  i.name as integration_name,
  i.platform,
  il.level,
  il.message,
  il.metadata,
  il.created_at
FROM integrations i
JOIN integration_logs il ON i.id = il.integration_id
WHERE il.created_at > NOW() - INTERVAL '24 hours'
ORDER BY il.created_at DESC;

-- ============================================================================
-- 12. SAMPLE DATA INSERTION (OPTIONAL - FOR DEVELOPMENT)
-- ============================================================================

-- Insert sample integrations (only if no data exists)
INSERT INTO integrations (user_id, name, type, platform, status, credentials, configuration)
SELECT 
  auth.uid(),
  'Twitter API',
  'social_media',
  'twitter',
  '{"connected": false, "syncInProgress": false, "errorCount": 0, "healthScore": 0}',
  '{"encrypted": "sample_encrypted_credentials", "iv": "sample_iv", "authTag": "sample_auth_tag", "algorithm": "AES-256-GCM"}',
  '{"syncSettings": {"autoSync": true, "syncInterval": 60, "batchSize": 100, "retryAttempts": 3, "timeoutMs": 30000, "syncOnStartup": true, "syncOnSchedule": true}, "rateLimits": {"requestsPerMinute": 100, "requestsPerHour": 1000, "requestsPerDay": 10000, "burstLimit": 20}, "errorHandling": {"maxRetries": 3, "retryDelay": 1000, "exponentialBackoff": true, "deadLetterQueue": true, "alertOnFailure": true}, "notifications": {"emailNotifications": true, "webhookNotifications": false, "slackNotifications": false, "notificationLevels": ["error", "warn"]}}'
WHERE NOT EXISTS (SELECT 1 FROM integrations WHERE user_id = auth.uid())
AND auth.uid() IS NOT NULL;

-- Migration completed successfully
-- All integration tables created with proper RLS policies, indexes, triggers, and functions
