-- Neon Database Schema Migration for Integration Manager
-- This migration creates all necessary tables and functions for the Integration Manager

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('social_media', 'analytics', 'ai_service', 'crm', 'email', 'storage')),
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error', 'syncing')),
    credentials JSONB NOT NULL,
    configuration JSONB DEFAULT '{}',
    last_sync TIMESTAMPTZ,
    sync_frequency TEXT DEFAULT 'hourly' CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly', 'manual')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create integration_webhooks table
CREATE TABLE IF NOT EXISTS integration_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] DEFAULT '{}',
    secret TEXT,
    is_active BOOLEAN DEFAULT true,
    retry_policy JSONB DEFAULT '{"maxRetries": 3, "backoffMultiplier": 2, "initialDelay": 1000, "maxDelay": 30000}',
    headers JSONB DEFAULT '{}',
    timeout INTEGER DEFAULT 30000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create integration_logs table
CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create integration_alerts table
CREATE TABLE IF NOT EXISTS integration_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create integration_metrics table
CREATE TABLE IF NOT EXISTS integration_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
    total_requests INTEGER DEFAULT 0,
    successful_requests INTEGER DEFAULT 0,
    failed_requests INTEGER DEFAULT 0,
    average_response_time FLOAT DEFAULT 0,
    last_request_time TIMESTAMPTZ DEFAULT NOW(),
    error_rate FLOAT DEFAULT 0,
    uptime FLOAT DEFAULT 100,
    data_processed BIGINT DEFAULT 0,
    sync_count INTEGER DEFAULT 0,
    last_sync_duration INTEGER DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES integration_webhooks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    delivery_attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_platform ON integrations(platform);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_created_at ON integrations(created_at);

CREATE INDEX IF NOT EXISTS idx_integration_webhooks_integration_id ON integration_webhooks(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_is_active ON integration_webhooks(is_active);

CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_id ON integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_user_id ON integration_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_timestamp ON integration_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_integration_logs_level ON integration_logs(level);

CREATE INDEX IF NOT EXISTS idx_integration_alerts_integration_id ON integration_alerts(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_alerts_is_resolved ON integration_alerts(is_resolved);
CREATE INDEX IF NOT EXISTS idx_integration_alerts_severity ON integration_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_integration_alerts_created_at ON integration_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_integration_metrics_integration_id ON integration_metrics(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_metrics_recorded_at ON integration_metrics(recorded_at);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_integrations_updated_at 
    BEFORE UPDATE ON integrations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_webhooks_updated_at 
    BEFORE UPDATE ON integration_webhooks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate integration health score
CREATE OR REPLACE FUNCTION calculate_integration_health_score(integration_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    health_score INTEGER := 100;
    metrics_record RECORD;
    error_count INTEGER := 0;
    success_rate FLOAT := 0;
    avg_response_time FLOAT := 0;
    uptime_score FLOAT := 100;
BEGIN
    -- Get latest metrics for the integration
    SELECT 
        total_requests,
        successful_requests,
        failed_requests,
        average_response_time,
        uptime
    INTO metrics_record
    FROM integration_metrics 
    WHERE integration_id = integration_id_param 
    ORDER BY recorded_at DESC 
    LIMIT 1;
    
    -- If no metrics found, return default score
    IF NOT FOUND THEN
        RETURN 50; -- Default score for new integrations
    END IF;
    
    -- Calculate success rate
    IF metrics_record.total_requests > 0 THEN
        success_rate := (metrics_record.successful_requests::FLOAT / metrics_record.total_requests::FLOAT) * 100;
    END IF;
    
    -- Calculate health score based on multiple factors
    -- Success rate (40% weight)
    health_score := health_score - ((100 - success_rate) * 0.4);
    
    -- Response time (20% weight) - penalize if > 5000ms
    IF metrics_record.average_response_time > 5000 THEN
        health_score := health_score - ((metrics_record.average_response_time - 5000) / 100 * 0.2);
    END IF;
    
    -- Uptime (30% weight)
    health_score := health_score - ((100 - metrics_record.uptime) * 0.3);
    
    -- Recent errors (10% weight)
    SELECT COUNT(*) INTO error_count
    FROM integration_logs 
    WHERE integration_id = integration_id_param 
    AND level = 'error' 
    AND timestamp > NOW() - INTERVAL '1 hour';
    
    health_score := health_score - (error_count * 2);
    
    -- Ensure score is between 0 and 100
    health_score := GREATEST(0, LEAST(100, health_score));
    
    RETURN health_score;
END;
$$ LANGUAGE plpgsql;

-- Create function to update integration health score
CREATE OR REPLACE FUNCTION update_integration_health_score(integration_id_param UUID)
RETURNS VOID AS $$
DECLARE
    health_score INTEGER;
BEGIN
    health_score := calculate_integration_health_score(integration_id_param);
    
    UPDATE integrations 
    SET configuration = jsonb_set(
        COALESCE(configuration, '{}'::jsonb), 
        '{healthScore}', 
        to_jsonb(health_score)
    )
    WHERE id = integration_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to create integration alert
CREATE OR REPLACE FUNCTION create_integration_alert(
    integration_id_param UUID,
    alert_type TEXT,
    alert_title TEXT,
    alert_message TEXT,
    alert_severity TEXT DEFAULT 'medium'
)
RETURNS UUID AS $$
DECLARE
    alert_id UUID;
BEGIN
    INSERT INTO integration_alerts (
        integration_id, type, title, message, severity
    ) VALUES (
        integration_id_param, alert_type, alert_title, alert_message, alert_severity
    ) RETURNING id INTO alert_id;
    
    RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to log integration activity
CREATE OR REPLACE FUNCTION log_integration_activity(
    integration_id_param UUID,
    user_id_param TEXT,
    log_level TEXT,
    log_message TEXT,
    log_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO integration_logs (
        integration_id, user_id, level, message, metadata
    ) VALUES (
        integration_id_param, user_id_param, log_level, log_message, log_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to record integration metrics
CREATE OR REPLACE FUNCTION record_integration_metrics(
    integration_id_param UUID,
    total_requests_param INTEGER DEFAULT 0,
    successful_requests_param INTEGER DEFAULT 0,
    failed_requests_param INTEGER DEFAULT 0,
    average_response_time_param FLOAT DEFAULT 0,
    error_rate_param FLOAT DEFAULT 0,
    uptime_param FLOAT DEFAULT 100,
    data_processed_param BIGINT DEFAULT 0,
    sync_count_param INTEGER DEFAULT 0,
    last_sync_duration_param INTEGER DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
    metrics_id UUID;
BEGIN
    INSERT INTO integration_metrics (
        integration_id, total_requests, successful_requests, failed_requests,
        average_response_time, error_rate, uptime, data_processed,
        sync_count, last_sync_duration
    ) VALUES (
        integration_id_param, total_requests_param, successful_requests_param,
        failed_requests_param, average_response_time_param, error_rate_param,
        uptime_param, data_processed_param, sync_count_param, last_sync_duration_param
    ) RETURNING id INTO metrics_id;
    
    -- Update health score after recording metrics
    PERFORM update_integration_health_score(integration_id_param);
    
    RETURN metrics_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for integration status overview
CREATE OR REPLACE VIEW integration_status_overview AS
SELECT 
    i.id,
    i.name,
    i.type,
    i.platform,
    i.status,
    i.is_active,
    i.last_sync,
    i.created_at,
    COALESCE(i.configuration->>'healthScore', '0')::INTEGER as health_score,
    COALESCE(im.total_requests, 0) as total_requests,
    COALESCE(im.successful_requests, 0) as successful_requests,
    COALESCE(im.failed_requests, 0) as failed_requests,
    COALESCE(im.average_response_time, 0) as average_response_time,
    COALESCE(im.uptime, 100) as uptime,
    (SELECT COUNT(*) FROM integration_alerts ia WHERE ia.integration_id = i.id AND ia.is_resolved = false) as active_alerts
FROM integrations i
LEFT JOIN LATERAL (
    SELECT * FROM integration_metrics 
    WHERE integration_id = i.id 
    ORDER BY recorded_at DESC 
    LIMIT 1
) im ON true;

-- Create view for recent integration activity
CREATE OR REPLACE VIEW recent_integration_activity AS
SELECT 
    il.id,
    il.integration_id,
    i.name as integration_name,
    i.platform,
    il.level,
    il.message,
    il.metadata,
    il.timestamp
FROM integration_logs il
JOIN integrations i ON il.integration_id = i.id
WHERE il.timestamp > NOW() - INTERVAL '24 hours'
ORDER BY il.timestamp DESC;

-- Insert sample data for testing
INSERT INTO integrations (
    user_id, name, type, platform, status, credentials, configuration, 
    sync_frequency, is_active
) VALUES (
    'sample_user_123',
    'Twitter API Integration',
    'social_media',
    'twitter',
    'connected',
    '{"encrypted": "sample_encrypted_credentials", "iv": "sample_iv", "authTag": "sample_auth_tag", "algorithm": "aes-256-gcm"}',
    '{"healthScore": 95, "lastHealthCheck": "2024-01-01T00:00:00Z", "syncSettings": {"autoSync": true, "syncInterval": 60}}',
    'hourly',
    true
) ON CONFLICT DO NOTHING;

-- Insert sample metrics
INSERT INTO integration_metrics (
    integration_id, total_requests, successful_requests, failed_requests,
    average_response_time, error_rate, uptime, data_processed, sync_count
) 
SELECT 
    i.id,
    1000,
    950,
    50,
    250.5,
    5.0,
    95.0,
    50000,
    24
FROM integrations i 
WHERE i.name = 'Twitter API Integration'
ON CONFLICT DO NOTHING;

-- Insert sample logs
INSERT INTO integration_logs (
    integration_id, user_id, level, message, metadata
)
SELECT 
    i.id,
    'sample_user_123',
    'info',
    'Integration health check completed successfully',
    '{"healthScore": 95, "responseTime": 250}'
FROM integrations i 
WHERE i.name = 'Twitter API Integration'
ON CONFLICT DO NOTHING;

-- Grant necessary permissions (adjust as needed for your Neon setup)
-- Note: In Neon, permissions are typically managed through the dashboard
-- These are included for reference but may not be needed

-- Create a simple RLS policy example (if RLS is enabled)
-- ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY integration_user_policy ON integrations
--     FOR ALL TO authenticated
--     USING (user_id = current_setting('app.current_user_id', true));

COMMENT ON TABLE integrations IS 'Stores integration configurations and credentials';
COMMENT ON TABLE integration_webhooks IS 'Stores webhook configurations for integrations';
COMMENT ON TABLE integration_logs IS 'Stores activity logs for integrations';
COMMENT ON TABLE integration_alerts IS 'Stores alerts and notifications for integrations';
COMMENT ON TABLE integration_metrics IS 'Stores performance metrics for integrations';
COMMENT ON TABLE webhook_deliveries IS 'Stores webhook delivery attempts and results';

COMMENT ON FUNCTION calculate_integration_health_score(UUID) IS 'Calculates health score for an integration based on metrics';
COMMENT ON FUNCTION update_integration_health_score(UUID) IS 'Updates the health score in integration configuration';
COMMENT ON FUNCTION create_integration_alert(UUID, TEXT, TEXT, TEXT, TEXT) IS 'Creates a new alert for an integration';
COMMENT ON FUNCTION log_integration_activity(UUID, TEXT, TEXT, TEXT, JSONB) IS 'Logs activity for an integration';
COMMENT ON FUNCTION record_integration_metrics(UUID, INTEGER, INTEGER, INTEGER, FLOAT, FLOAT, FLOAT, BIGINT, INTEGER, INTEGER) IS 'Records metrics for an integration and updates health score';