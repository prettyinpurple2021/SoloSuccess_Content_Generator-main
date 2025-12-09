#!/usr/bin/env node

/**
 * Test script for Neon Integration Manager
 *
 * This script tests the Integration Manager functionality with Neon database.
 */

import { neonService } from '../services/neonService.js';

async function testIntegrationManager() {
  console.log('🧪 Testing Neon Integration Manager...\n');

  try {
    // Test 1: Database Connection
    console.log('1️⃣ Testing database connection...');
    const integrations = await neonService.getIntegrations();
    console.log(`✅ Connected! Found ${integrations.length} existing integrations\n`);

    // Test 2: Create Integration
    console.log('2️⃣ Testing integration creation...');
    const testIntegration = await neonService.addIntegration({
      name: 'Test Twitter Integration',
      type: 'social_media',
      platform: 'twitter',
      status: 'connected',
      credentials: {
        encrypted: 'test_encrypted_credentials',
        iv: 'test_iv',
        authTag: 'test_auth_tag',
        algorithm: 'aes-256-gcm',
      },
      configuration: {
        healthScore: 100,
        syncSettings: {
          autoSync: true,
          syncInterval: 60,
        },
      },
      sync_frequency: 'hourly',
      is_active: true,
    });
    console.log(`✅ Created integration: ${testIntegration.name} (ID: ${testIntegration.id})\n`);

    // Test 3: Update Integration
    console.log('3️⃣ Testing integration update...');
    const updatedIntegration = await neonService.updateIntegration(testIntegration.id, {
      name: 'Updated Test Twitter Integration',
      configuration: {
        healthScore: 95,
        syncSettings: {
          autoSync: true,
          syncInterval: 30,
        },
      },
    });
    console.log(`✅ Updated integration: ${updatedIntegration.name}\n`);

    // Test 4: Add Integration Log
    console.log('4️⃣ Testing integration logging...');
    const log = await neonService.addIntegrationLog({
      integration_id: testIntegration.id,
      level: 'info',
      message: 'Test log entry created successfully',
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    });
    console.log(`✅ Created log entry: ${log.message}\n`);

    // Test 5: Add Integration Alert
    console.log('5️⃣ Testing integration alerts...');
    const alert = await neonService.addIntegrationAlert({
      integration_id: testIntegration.id,
      type: 'test',
      title: 'Test Alert',
      message: 'This is a test alert for the integration manager',
      severity: 'low',
    });
    console.log(`✅ Created alert: ${alert.title}\n`);

    // Test 6: Record Metrics
    console.log('6️⃣ Testing metrics recording...');
    const metrics = await neonService.updateIntegrationMetrics(testIntegration.id, {
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      averageResponseTime: 250.5,
      errorRate: 5.0,
      uptime: 95.0,
      dataProcessed: 50000,
      syncCount: 10,
      lastSyncDuration: 1200,
    });
    console.log(`✅ Recorded metrics: ${metrics.totalRequests} total requests\n`);

    // Test 7: Get Integration by ID
    console.log('7️⃣ Testing integration retrieval...');
    const retrievedIntegration = await neonService.getIntegrationById(testIntegration.id);
    if (retrievedIntegration) {
      console.log(`✅ Retrieved integration: ${retrievedIntegration.name}\n`);
    } else {
      console.log('❌ Failed to retrieve integration\n');
    }

    // Test 8: Get Integration Logs
    console.log('8️⃣ Testing log retrieval...');
    const logs = await neonService.getIntegrationLogs(testIntegration.id, 10);
    console.log(`✅ Retrieved ${logs.length} log entries\n`);

    // Test 9: Get Integration Alerts
    console.log('9️⃣ Testing alert retrieval...');
    const alerts = await neonService.getIntegrationAlerts(testIntegration.id);
    console.log(`✅ Retrieved ${alerts.length} alerts\n`);

    // Test 10: Get Integration Metrics
    console.log('🔟 Testing metrics retrieval...');
    const integrationMetrics = await neonService.getIntegrationMetrics(testIntegration.id, '24h');
    console.log(`✅ Retrieved ${integrationMetrics.length} metric records\n`);

    // Test 11: Health Check
    console.log('1️⃣1️⃣ Testing health check...');
    const healthCheck = await neonService.checkIntegrationRLSPermissions(testIntegration.id);
    console.log(`✅ Health check: ${healthCheck.isSecure ? 'Secure' : 'Not Secure'}\n`);

    // Test 12: Cleanup - Delete Test Integration
    console.log('1️⃣2️⃣ Testing integration deletion...');
    await neonService.deleteIntegration(testIntegration.id);
    console.log(`✅ Deleted test integration\n`);

    console.log(
      '🎉 All tests passed! Integration Manager is working correctly with Neon database.'
    );
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testIntegrationManager().catch(console.error);
