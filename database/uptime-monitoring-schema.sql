-- Uptime Monitoring Schema
-- Creates tables for tracking service uptime, incidents, and health checks

-- ============================================================================
-- 1. SERVICE HEALTH CHECKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_health_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  service_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('operational', 'degraded', 'outage')),
  response_time INTEGER, -- in milliseconds
  http_status INTEGER,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes for service_health_checks
CREATE INDEX IF NOT EXISTS service_health_checks_service_name_idx ON service_health_checks(service_name);
CREATE INDEX IF NOT EXISTS service_health_checks_checked_at_idx ON service_health_checks(checked_at DESC);
CREATE INDEX IF NOT EXISTS service_health_checks_status_idx ON service_health_checks(status);
CREATE INDEX IF NOT EXISTS service_health_checks_service_name_checked_at_idx ON service_health_checks(service_name, checked_at DESC);

-- ============================================================================
-- 2. SERVICE INCIDENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  severity TEXT NOT NULL CHECK (severity IN ('minor', 'major', 'critical')),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for service_incidents
CREATE INDEX IF NOT EXISTS service_incidents_service_name_idx ON service_incidents(service_name);
CREATE INDEX IF NOT EXISTS service_incidents_status_idx ON service_incidents(status);
CREATE INDEX IF NOT EXISTS service_incidents_severity_idx ON service_incidents(severity);
CREATE INDEX IF NOT EXISTS service_incidents_start_time_idx ON service_incidents(start_time DESC);
CREATE INDEX IF NOT EXISTS service_incidents_resolved_at_idx ON service_incidents(resolved_at);

-- ============================================================================
-- 3. INCIDENT UPDATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS incident_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL REFERENCES service_incidents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for incident_updates
CREATE INDEX IF NOT EXISTS incident_updates_incident_id_idx ON incident_updates(incident_id);
CREATE INDEX IF NOT EXISTS incident_updates_timestamp_idx ON incident_updates(timestamp DESC);

-- ============================================================================
-- 4. SERVICE METRICS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name TEXT NOT NULL,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  average_response_time DECIMAL(10,2) DEFAULT 0,
  error_rate DECIMAL(5,2) DEFAULT 0,
  uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Indexes for service_metrics
CREATE INDEX IF NOT EXISTS service_metrics_service_name_idx ON service_metrics(service_name);
CREATE INDEX IF NOT EXISTS service_metrics_period_start_idx ON service_metrics(period_start DESC);
CREATE INDEX IF NOT EXISTS service_metrics_period_end_idx ON service_metrics(period_end DESC);
CREATE INDEX IF NOT EXISTS service_metrics_service_name_period_idx ON service_metrics(service_name, period_start DESC);

-- ============================================================================
-- 5. UPDATE TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for service_incidents
CREATE TRIGGER update_service_incidents_updated_at
  BEFORE UPDATE ON service_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_service_incidents_updated_at();

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate service uptime for a period
CREATE OR REPLACE FUNCTION calculate_service_uptime(
  p_service_name TEXT,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_checks INTEGER;
  operational_checks INTEGER;
  uptime_pct DECIMAL(5,2);
BEGIN
  -- Count total checks in period
  SELECT COUNT(*) INTO total_checks
  FROM service_health_checks
  WHERE service_name = p_service_name
    AND checked_at >= p_start_time
    AND checked_at <= p_end_time;

  -- Count operational checks
  SELECT COUNT(*) INTO operational_checks
  FROM service_health_checks
  WHERE service_name = p_service_name
    AND status = 'operational'
    AND checked_at >= p_start_time
    AND checked_at <= p_end_time;

  -- Calculate uptime percentage
  IF total_checks > 0 THEN
    uptime_pct := (operational_checks::DECIMAL / total_checks::DECIMAL) * 100;
  ELSE
    uptime_pct := 100.00;
  END IF;

  RETURN uptime_pct;
END;
$$ LANGUAGE plpgsql;

-- Function to get service incident count
CREATE OR REPLACE FUNCTION get_service_incident_count(
  p_service_name TEXT,
  p_start_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  incident_count INTEGER;
BEGIN
  IF p_start_time IS NULL THEN
    SELECT COUNT(*) INTO incident_count
    FROM service_incidents
    WHERE service_name = p_service_name;
  ELSE
    SELECT COUNT(*) INTO incident_count
    FROM service_incidents
    WHERE service_name = p_service_name
      AND start_time >= p_start_time;
  END IF;

  RETURN COALESCE(incident_count, 0);
END;
$$ LANGUAGE plpgsql;

