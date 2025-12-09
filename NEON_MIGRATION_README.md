# Neon Database Migration for Integration Manager

This document explains how to migrate the Integration Manager from Supabase to Neon database.

## Overview

The Integration Manager has been updated to use Neon PostgreSQL database instead of Supabase. This provides better performance, more control over the database, and eliminates vendor lock-in.

## What Changed

### 1. Database Service (`services/neonService.ts`)

- **New**: Complete Neon database service using the `postgres` package
- **Features**:
  - All CRUD operations for integrations, logs, alerts, metrics, and webhooks
  - Secure credential encryption/decryption
  - Real-time subscriptions (mock implementation)
  - Caching support
  - Health monitoring and metrics

### 2. Database Schema (`database/neon-integration-schema-migration.sql`)

- **New**: Complete PostgreSQL schema for Neon
- **Tables**:
  - `integrations` - Integration configurations
  - `integration_webhooks` - Webhook configurations
  - `integration_logs` - Activity logs
  - `integration_alerts` - Alerts and notifications
  - `integration_metrics` - Performance metrics
  - `webhook_deliveries` - Webhook delivery tracking
- **Functions**: Health scoring, alert creation, logging, metrics recording
- **Indexes**: Optimized for performance
- **Views**: Status overview and recent activity

### 3. Migration Script (`scripts/apply-neon-migrations.js`)

- **New**: Automated migration script for Neon
- **Features**:
  - Applies schema migrations
  - Handles errors gracefully
  - Verifies table creation
  - Inserts sample data

### 4. Environment Configuration

- **Updated**: Added Neon database URL support
- **Variables**:
  - `VITE_NEON_DATABASE_URL` - Primary Neon database URL
  - `DATABASE_URL` - Alternative environment variable name

## Setup Instructions

### 1. Get Neon Database URL

1. Go to [Neon Console](https://neon.tech)
2. Create a new project or use existing one
3. Copy the connection string from the dashboard
4. It should look like: `postgresql://username:password@hostname/database?sslmode=require`

### 2. Configure Environment Variables

Create a `.env.local` file in your project root:

```bash
# Neon Database Configuration
VITE_NEON_DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require

# Alternative environment variable name
DATABASE_URL=postgresql://username:password@hostname/database?sslmode=require

# Integration Manager Configuration
INTEGRATION_APP_SECRET=your_secure_secret_key_here
```

### 3. Run Database Migrations

```bash
# Install dependencies (if not already done)
npm install

# Run the migration script
npm run migrate:neon
```

This will:

- Create all necessary tables
- Set up indexes and constraints
- Create helper functions
- Insert sample data for testing

### 4. Verify Installation

After running migrations, you should see:

- ✅ All tables created successfully
- ✅ Sample data inserted
- ✅ Functions and triggers created

## Database Schema

### Core Tables

#### `integrations`

Stores integration configurations and credentials.

```sql
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('social_media', 'analytics', 'ai_service', 'crm', 'email', 'storage')),
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'disconnected',
    credentials JSONB NOT NULL,
    configuration JSONB DEFAULT '{}',
    last_sync TIMESTAMPTZ,
    sync_frequency TEXT DEFAULT 'hourly',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `integration_metrics`

Stores performance metrics for each integration.

```sql
CREATE TABLE integration_metrics (
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
```

### Helper Functions

#### `calculate_integration_health_score(integration_id)`

Calculates a health score (0-100) based on:

- Success rate (40% weight)
- Response time (20% weight)
- Uptime (30% weight)
- Recent errors (10% weight)

#### `record_integration_metrics(integration_id, ...)`

Records metrics and automatically updates health score.

## Usage

### Basic Integration Operations

```typescript
import { neonService } from './services/neonService';

// Get all integrations
const integrations = await neonService.getIntegrations();

// Create new integration
const newIntegration = await neonService.addIntegration({
  name: 'My Twitter Integration',
  type: 'social_media',
  platform: 'twitter',
  status: 'connected',
  credentials: {
    /* encrypted credentials */
  },
  configuration: {
    /* integration settings */
  },
});

// Update integration
const updated = await neonService.updateIntegration(integrationId, {
  name: 'Updated Name',
  configuration: {
    /* new settings */
  },
});

// Delete integration
await neonService.deleteIntegration(integrationId);
```

### Health Monitoring

```typescript
// Get integration metrics
const metrics = await neonService.getIntegrationMetrics(integrationId, '24h');

// Record new metrics
await neonService.updateIntegrationMetrics(integrationId, {
  totalRequests: 100,
  successfulRequests: 95,
  failedRequests: 5,
  averageResponseTime: 250,
  uptime: 99.5,
});
```

### Logging and Alerts

```typescript
// Add log entry
await neonService.addIntegrationLog({
  integration_id: integrationId,
  level: 'info',
  message: 'Integration health check completed',
  metadata: { healthScore: 95 },
});

// Create alert
await neonService.addIntegrationAlert({
  integration_id: integrationId,
  type: 'health_check',
  title: 'Low Health Score',
  message: 'Integration health score dropped below 80%',
  severity: 'medium',
});
```

## Migration from Supabase

If you're migrating from Supabase:

1. **Export your data** from Supabase (if needed)
2. **Set up Neon database** as described above
3. **Run migrations** to create the schema
4. **Import data** (if you have existing data to migrate)
5. **Update your app** to use the new Neon service

## Troubleshooting

### Common Issues

1. **Connection Error**: Check your Neon database URL
2. **Migration Fails**: Ensure you have proper permissions
3. **Tables Not Created**: Check if the migration script ran successfully

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=neon:*
```

### Health Check

Test your database connection:

```typescript
import { neonService } from './services/neonService';

try {
  const integrations = await neonService.getIntegrations();
  console.log('✅ Database connection successful');
} catch (error) {
  console.error('❌ Database connection failed:', error);
}
```

## Performance Considerations

- **Indexes**: All tables have appropriate indexes for optimal performance
- **Connection Pooling**: Uses connection pooling for better performance
- **Caching**: Integrates with existing caching service
- **Batch Operations**: Supports batch inserts for analytics data

## Security

- **Credential Encryption**: All credentials are encrypted using AES-256-GCM
- **User Isolation**: Data is isolated by user_id
- **Input Validation**: All inputs are validated before database operations
- **SQL Injection Protection**: Uses parameterized queries throughout

## Support

For issues or questions:

1. Check the migration logs
2. Verify your environment variables
3. Test database connectivity
4. Review the schema documentation

## Next Steps

1. ✅ Set up Neon database
2. ✅ Run migrations
3. ✅ Test Integration Manager
4. 🔄 Monitor performance
5. 🔄 Set up monitoring and alerting
6. 🔄 Configure backup strategy
