#!/usr/bin/env node

/**
 * Master Production Validation Script
 *
 * This script runs all production readiness validation tests
 * for task 10.1 Final production validation
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`),
};

class MasterProductionValidator {
  constructor() {
    this.results = {
      tests: [],
      startTime: Date.now(),
      totalPassed: 0,
      totalFailed: 0,
      totalWarnings: 0,
      criticalIssues: [],
      recommendations: [],
    };
  }

  async runTest(testName, scriptPath, description, isCritical = false) {
    log.section(`Running ${testName}...`);
    console.log(`Description: ${description}`);

    const testStart = Date.now();
    let success = false;
    let output = '';
    let error = '';

    try {
      output = execSync(`node ${scriptPath}`, {
        encoding: 'utf8',
        timeout: 300000, // 5 minute timeout
        cwd: projectRoot,
      });
      success = true;
      log.success(`${testName} completed successfully`);
    } catch (execError) {
      success = false;
      error = execError.message;
      output = execError.stdout || '';

      if (isCritical) {
        log.error(`${testName} FAILED (CRITICAL)`);
        this.results.criticalIssues.push({
          test: testName,
          error: error,
          isCritical: true,
        });
      } else {
        log.warning(`${testName} completed with issues`);
      }
    }

    const duration = Date.now() - testStart;

    const testResult = {
      name: testName,
      description,
      success,
      duration,
      output,
      error,
      isCritical,
      timestamp: new Date().toISOString(),
    };

    this.results.tests.push(testResult);

    if (success) {
      this.results.totalPassed++;
    } else {
      this.results.totalFailed++;
    }

    console.log(`Duration: ${(duration / 1000).toFixed(2)}s\n`);
    return success;
  }

  async runAllValidationTests() {
    log.header('🚀 PRODUCTION READINESS VALIDATION SUITE');
    console.log(`Starting comprehensive validation at ${new Date().toISOString()}`);
    console.log(`Project: SoloSuccess AI Content Factory`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

    // Test 1: Security Validation (Critical)
    await this.runTest(
      'Security Validation',
      'scripts/security-validation.js',
      'Validates security configurations, API key exposure, and authentication setup',
      true
    );

    // Test 2: Database Security (Critical)
    await this.runTest(
      'Database Security',
      'scripts/test-database-security.js',
      'Tests database security including SSL, parameterized queries, and RLS',
      true
    );

    // Test 3: End-to-End Workflow (Critical)
    await this.runTest(
      'End-to-End Workflow',
      'scripts/end-to-end-workflow-test.js',
      'Tests complete user workflow: signup → create content → schedule → publish',
      true
    );

    // Test 4: Production Readiness (Critical)
    await this.runTest(
      'Production Readiness',
      'scripts/production-readiness-validation.js',
      'Comprehensive production readiness check including all systems',
      true
    );

    // Test 5: Performance Validation
    await this.runTest(
      'Performance Validation',
      'scripts/performance-validation.js',
      'Tests build performance, bundle size, and runtime optimizations',
      false
    );

    // Test 6: Production Deployment Validation
    await this.runTest(
      'Deployment Validation',
      'scripts/production-deployment-validation.js',
      'Validates deployment configuration and environment setup',
      false
    );

    // Test 7: API Key Exposure Test
    await this.runTest(
      'API Key Exposure',
      'scripts/test-api-key-exposure.js',
      'Tests for API key exposure in client-side code',
      true
    );

    // Test 8: Rate Limiting Test
    await this.runTest(
      'Rate Limiting',
      'scripts/test-rate-limiting.js',
      'Tests rate limiting functionality and configuration',
      false
    );
  }

  async testHealthEndpoint() {
    log.section('Testing Health Endpoint...');

    try {
      // Check if health endpoint exists
      const healthEndpointPath = join(projectRoot, 'api/health/index.ts');
      if (!existsSync(healthEndpointPath)) {
        log.error('Health endpoint not found');
        this.results.criticalIssues.push({
          test: 'Health Endpoint',
          error: 'Health endpoint file not found',
          isCritical: true,
        });
        return false;
      }

      // Read and validate health endpoint
      const healthContent = readFileSync(healthEndpointPath, 'utf8');

      const requiredChecks = [
        'checkDatabaseHealth',
        'checkAIServicesHealth',
        'checkAuthenticationHealth',
        'checkIntegrationServicesHealth',
        'checkEnvironmentConfiguration',
      ];

      const missingChecks = requiredChecks.filter((check) => !healthContent.includes(check));

      if (missingChecks.length === 0) {
        log.success('Health endpoint has all required checks');
        this.results.totalPassed++;
      } else {
        log.warning(`Health endpoint missing checks: ${missingChecks.join(', ')}`);
        this.results.totalWarnings++;
        this.results.recommendations.push('Add missing health checks to health endpoint');
      }

      return true;
    } catch (error) {
      log.error(`Health endpoint test failed: ${error.message}`);
      this.results.totalFailed++;
      return false;
    }
  }

  async testMonitoringSetup() {
    log.section('Testing Monitoring Setup...');

    try {
      // Check if monitoring service exists
      const monitoringServicePath = join(projectRoot, 'services/productionMonitoringService.ts');
      if (!existsSync(monitoringServicePath)) {
        log.warning('Production monitoring service not found');
        this.results.recommendations.push('Implement production monitoring service');
        this.results.totalWarnings++;
        return false;
      }

      // Validate monitoring service
      const monitoringContent = readFileSync(monitoringServicePath, 'utf8');

      const monitoringFeatures = [
        'startMonitoring',
        'performHealthCheck',
        'recordError',
        'createAlert',
        'checkAlertConditions',
      ];

      const implementedFeatures = monitoringFeatures.filter((feature) =>
        monitoringContent.includes(feature)
      );

      if (implementedFeatures.length >= 4) {
        log.success(
          `Monitoring service has ${implementedFeatures.length}/${monitoringFeatures.length} features`
        );
        this.results.totalPassed++;
      } else {
        log.warning(
          `Monitoring service only has ${implementedFeatures.length}/${monitoringFeatures.length} features`
        );
        this.results.totalWarnings++;
        this.results.recommendations.push('Complete monitoring service implementation');
      }

      return true;
    } catch (error) {
      log.error(`Monitoring setup test failed: ${error.message}`);
      this.results.totalFailed++;
      return false;
    }
  }

  async validateEnvironmentConfiguration() {
    log.section('Validating Environment Configuration...');

    try {
      const requiredEnvVars = [
        'VITE_STACK_PROJECT_ID',
        'VITE_STACK_PUBLISHABLE_CLIENT_KEY',
        'STACK_SECRET_SERVER_KEY',
        'DATABASE_URL',
        'GEMINI_API_KEY',
        'INTEGRATION_ENCRYPTION_SECRET',
      ];

      const optionalEnvVars = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_API_KEY',
        'TWITTER_API_KEY',
        'LINKEDIN_CLIENT_ID',
        'FACEBOOK_APP_ID',
      ];

      // Check required variables
      const missingRequired = requiredEnvVars.filter((varName) => !process.env[varName]);

      if (missingRequired.length === 0) {
        log.success('All required environment variables are configured');
        this.results.totalPassed++;
      } else {
        log.error(`Missing required environment variables: ${missingRequired.join(', ')}`);
        this.results.totalFailed++;
        this.results.criticalIssues.push({
          test: 'Environment Configuration',
          error: `Missing required variables: ${missingRequired.join(', ')}`,
          isCritical: true,
        });
      }

      // Check optional variables
      const configuredOptional = optionalEnvVars.filter((varName) => process.env[varName]);
      log.info(
        `Optional integrations configured: ${configuredOptional.length}/${optionalEnvVars.length}`
      );

      if (configuredOptional.length === 0) {
        this.results.recommendations.push(
          'Configure optional social media integrations for full functionality'
        );
      }

      return missingRequired.length === 0;
    } catch (error) {
      log.error(`Environment validation failed: ${error.message}`);
      this.results.totalFailed++;
      return false;
    }
  }

  generateValidationReport() {
    log.header('📊 FINAL PRODUCTION VALIDATION REPORT');

    const duration = Date.now() - this.results.startTime;
    const totalTests = this.results.tests.length + 3; // +3 for additional tests
    const successRate =
      totalTests > 0 ? ((this.results.totalPassed / totalTests) * 100).toFixed(1) : 0;

    // Summary
    console.log(`${colors.bold}Validation Summary:${colors.reset}`);
    console.log(
      `⏱️  Total Duration: ${colors.blue}${(duration / 1000 / 60).toFixed(2)} minutes${colors.reset}`
    );
    console.log(`🧪 Tests Run: ${colors.blue}${totalTests}${colors.reset}`);
    console.log(`✅ Passed: ${colors.green}${this.results.totalPassed}${colors.reset}`);
    console.log(`⚠️  Warnings: ${colors.yellow}${this.results.totalWarnings}${colors.reset}`);
    console.log(`❌ Failed: ${colors.red}${this.results.totalFailed}${colors.reset}`);
    console.log(`📊 Success Rate: ${colors.blue}${successRate}%${colors.reset}`);

    // Test Results
    console.log(`\n${colors.bold}Test Results:${colors.reset}`);
    this.results.tests.forEach((test, index) => {
      const icon = test.success ? '✅' : test.isCritical ? '🚨' : '⚠️';
      const status = test.success ? 'PASSED' : test.isCritical ? 'CRITICAL FAILURE' : 'FAILED';
      console.log(
        `${index + 1}. ${icon} ${test.name}: ${status} (${(test.duration / 1000).toFixed(2)}s)`
      );

      if (!test.success && test.error) {
        console.log(`   Error: ${test.error.split('\n')[0]}`);
      }
    });

    // Critical Issues
    if (this.results.criticalIssues.length > 0) {
      console.log(
        `\n${colors.bold}${colors.red}🚨 CRITICAL ISSUES (Must Fix Before Launch):${colors.reset}`
      );
      this.results.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.test}: ${issue.error}`);
      });
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log(`\n${colors.bold}${colors.yellow}💡 Recommendations:${colors.reset}`);
      this.results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    // Known Limitations
    console.log(`\n${colors.bold}📋 Known Limitations:${colors.reset}`);
    const knownLimitations = [
      'AI services have rate limits that may affect high-volume usage',
      'Database free tier has connection limits (mitigated by connection pooling)',
      'Some social media integrations require manual OAuth setup',
      'Real-time features depend on browser WebSocket support',
      'Image generation may occasionally fail (graceful fallback implemented)',
    ];

    knownLimitations.forEach((limitation, index) => {
      console.log(`${index + 1}. ${limitation}`);
    });

    // Final Assessment
    console.log(`\n${colors.bold}FINAL ASSESSMENT:${colors.reset}`);

    let readinessLevel = 'READY';
    let readinessMessage = 'Application is ready for production launch';
    let readinessColor = colors.green;

    if (this.results.criticalIssues.length > 0) {
      readinessLevel = 'NOT READY';
      readinessMessage = 'Critical issues must be resolved before launch';
      readinessColor = colors.red;
    } else if (this.results.totalFailed > 3) {
      readinessLevel = 'NEEDS WORK';
      readinessMessage = 'Multiple issues should be addressed before launch';
      readinessColor = colors.yellow;
    } else if (this.results.totalFailed > 0 || this.results.totalWarnings > 5) {
      readinessLevel = 'MOSTLY READY';
      readinessMessage = 'Minor issues present but core functionality is ready';
      readinessColor = colors.yellow;
    }

    console.log(
      `${readinessColor}${colors.bold}${readinessLevel}${colors.reset}: ${readinessMessage}`
    );

    // Next Steps
    console.log(`\n${colors.bold}Next Steps:${colors.reset}`);
    if (this.results.criticalIssues.length > 0) {
      console.log('1. 🚨 Fix all critical issues listed above');
      console.log('2. Re-run validation to confirm fixes');
      console.log('3. Address remaining warnings and recommendations');
      console.log('4. Perform manual testing of key workflows');
      console.log('5. Deploy to production when all critical issues are resolved');
    } else {
      console.log('1. ✅ Address any remaining warnings (optional)');
      console.log('2. 🧪 Perform final manual testing of key user workflows');
      console.log('3. 🚀 Deploy to production environment');
      console.log('4. 📊 Monitor application health after deployment');
      console.log('5. 🔄 Set up ongoing monitoring and maintenance');
    }

    // Save detailed report
    this.saveDetailedReport();

    return this.results.criticalIssues.length === 0 && this.results.totalFailed <= 2;
  }

  saveDetailedReport() {
    try {
      const reportPath = join(projectRoot, 'production-validation-report.json');
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          totalTests: this.results.tests.length + 3,
          passed: this.results.totalPassed,
          failed: this.results.totalFailed,
          warnings: this.results.totalWarnings,
          duration: Date.now() - this.results.startTime,
          successRate: ((this.results.totalPassed / (this.results.tests.length + 3)) * 100).toFixed(
            1
          ),
        },
        tests: this.results.tests,
        criticalIssues: this.results.criticalIssues,
        recommendations: this.results.recommendations,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          nodeVersion: process.version,
          platform: process.platform,
        },
      };

      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      log.info(`Detailed report saved to: ${reportPath}`);
    } catch (error) {
      log.warning(`Could not save detailed report: ${error.message}`);
    }
  }

  async runCompleteValidation() {
    try {
      // Run all validation tests
      await this.runAllValidationTests();

      // Run additional checks
      await this.testHealthEndpoint();
      await this.testMonitoringSetup();
      await this.validateEnvironmentConfiguration();

      // Generate final report
      const isReady = this.generateValidationReport();

      return isReady;
    } catch (error) {
      log.error(`Validation suite failed: ${error.message}`);
      return false;
    }
  }
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new MasterProductionValidator();
  validator
    .runCompleteValidation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Production validation failed:', error);
      process.exit(1);
    });
}

export default MasterProductionValidator;
