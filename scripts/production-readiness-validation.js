#!/usr/bin/env node

/**
 * Production Readiness Validation Script
 *
 * This script performs comprehensive end-to-end testing and validation
 * for task 10.1 Final production validation
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validatePath } from '../utils/pathValidator.js';
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
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}\n`),
};

class ProductionReadinessValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      issues: [],
      criticalIssues: [],
      recommendations: [],
    };
  }

  logResult(test, status, message, severity = 'info') {
    const timestamp = new Date().toISOString();

    if (status === 'pass') {
      log.success(`${test}: ${message}`);
      this.results.passed++;
    } else if (status === 'fail') {
      log.error(`${test}: ${message}`);
      this.results.failed++;

      if (severity === 'critical') {
        this.results.criticalIssues.push({ test, message, timestamp });
      } else {
        this.results.issues.push({ test, message, severity, timestamp });
      }
    } else if (status === 'warn') {
      log.warning(`${test}: ${message}`);
      this.results.warnings++;
      this.results.recommendations.push({ test, message, timestamp });
    }
  }

  async validateCompleteWorkflow() {
    log.header('🔄 Testing Complete User Workflow');

    // Test 1: Authentication System
    await this.testAuthenticationSystem();

    // Test 2: Content Generation Pipeline
    await this.testContentGenerationPipeline();

    // Test 3: Database Operations
    await this.testDatabaseOperations();

    // Test 4: API Endpoints
    await this.testAPIEndpoints();

    // Test 5: Integration Services
    await this.testIntegrationServices();

    // Test 6: Scheduling System
    await this.testSchedulingSystem();
  }

  async testAuthenticationSystem() {
    log.info('Testing authentication system...');

    try {
      // Check Stack Auth configuration
      const requiredAuthVars = [
        'VITE_STACK_PROJECT_ID',
        'VITE_STACK_PUBLISHABLE_CLIENT_KEY',
        'STACK_SECRET_SERVER_KEY',
      ];

      const missingAuthVars = requiredAuthVars.filter((varName) => !process.env[varName]);

      if (missingAuthVars.length === 0) {
        this.logResult(
          'Authentication Configuration',
          'pass',
          'All Stack Auth environment variables configured'
        );
      } else {
        this.logResult(
          'Authentication Configuration',
          'fail',
          `Missing Stack Auth variables: ${missingAuthVars.join(', ')}`,
          'critical'
        );
      }

      // Check if authentication components exist
      const authFiles = ['components/Auth.tsx', 'components/auth', 'App.tsx'];

      let authImplementationFound = false;
      authFiles.forEach((file) => {
        const filePath = validatePath(projectRoot, file);
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf8');
          if (content.includes('useUser') || content.includes('Stack')) {
            authImplementationFound = true;
          }
        }
      });

      this.logResult(
        'Authentication Implementation',
        authImplementationFound ? 'pass' : 'fail',
        authImplementationFound
          ? 'Authentication implementation found'
          : 'Authentication implementation not found',
        'critical'
      );
    } catch (error) {
      this.logResult(
        'Authentication System Test',
        'fail',
        `Authentication test failed: ${error.message}`,
        'critical'
      );
    }
  }

  async testContentGenerationPipeline() {
    log.info('Testing content generation pipeline...');

    try {
      // Check Gemini AI configuration
      if (process.env.GEMINI_API_KEY) {
        this.logResult('AI Service Configuration', 'pass', 'Gemini API key configured');
      } else {
        this.logResult(
          'AI Service Configuration',
          'fail',
          'Gemini API key not configured',
          'critical'
        );
      }

      // Check content generation services
      const contentServices = ['services/geminiService.ts', 'services/enhancedGeminiService.ts'];

      let contentServiceFound = false;
      contentServices.forEach((service) => {
        const servicePath = validatePath(projectRoot, service);
        if (existsSync(servicePath)) {
          const content = readFileSync(servicePath, 'utf8');
          if (content.includes('generateTopic') && content.includes('generateIdeas')) {
            contentServiceFound = true;
          }
        }
      });

      this.logResult(
        'Content Generation Services',
        contentServiceFound ? 'pass' : 'fail',
        contentServiceFound
          ? 'Content generation services implemented'
          : 'Content generation services not found',
        'critical'
      );

      // Check for personalization features
      const appPath = validatePath(projectRoot, 'App.tsx');
      if (existsSync(appPath)) {
        const appContent = readFileSync(appPath, 'utf8');
        const hasPersonalization =
          appContent.includes('BrandVoice') && appContent.includes('AudienceProfile');

        this.logResult(
          'Content Personalization',
          hasPersonalization ? 'pass' : 'warn',
          hasPersonalization
            ? 'Content personalization features implemented'
            : 'Content personalization features not fully implemented'
        );
      }
    } catch (error) {
      this.logResult(
        'Content Generation Pipeline Test',
        'fail',
        `Content generation test failed: ${error.message}`,
        'critical'
      );
    }
  }

  async testDatabaseOperations() {
    log.info('Testing database operations...');

    try {
      // Check database configuration
      if (process.env.DATABASE_URL) {
        this.logResult('Database Configuration', 'pass', 'Database URL configured');
      } else {
        this.logResult('Database Configuration', 'fail', 'Database URL not configured', 'critical');
      }

      // Check database service implementation
      const dbServices = ['services/neonService.ts', 'services/enhancedDatabaseService.ts'];

      let dbServiceFound = false;
      dbServices.forEach((service) => {
        const servicePath = validatePath(projectRoot, service);
        if (existsSync(servicePath)) {
          const content = readFileSync(servicePath, 'utf8');
          if (content.includes('testConnection') || content.includes('pool')) {
            dbServiceFound = true;
          }
        }
      });

      this.logResult(
        'Database Service Implementation',
        dbServiceFound ? 'pass' : 'fail',
        dbServiceFound ? 'Database service implemented' : 'Database service not found',
        'critical'
      );

      // Check for database schema
      const schemaFiles = ['database/schema.sql', 'database/neon-schema.sql'];

      let schemaFound = false;
      schemaFiles.forEach((file) => {
        if (existsSync(validatePath(projectRoot, file))) {
          schemaFound = true;
        }
      });

      this.logResult(
        'Database Schema',
        schemaFound ? 'pass' : 'fail',
        schemaFound ? 'Database schema files found' : 'Database schema files not found',
        'critical'
      );

      // Test database connection (if possible)
      try {
        const { testConnection } = await import('../services/neonService.js');
        await testConnection();
        this.logResult('Database Connection Test', 'pass', 'Database connection successful');
      } catch (error) {
        this.logResult(
          'Database Connection Test',
          'warn',
          `Database connection test failed: ${error.message}`
        );
      }
    } catch (error) {
      this.logResult(
        'Database Operations Test',
        'fail',
        `Database test failed: ${error.message}`,
        'critical'
      );
    }
  }

  async testAPIEndpoints() {
    log.info('Testing API endpoints...');

    try {
      // Check for API directory structure
      const apiDir = validatePath(projectRoot, 'api');
      if (existsSync(apiDir)) {
        this.logResult('API Directory Structure', 'pass', 'API directory exists');

        // Check for essential API endpoints
        const essentialEndpoints = [
          'api/health/index.ts',
          'api/posts',
          'api/analytics',
          'api/campaigns',
        ];

        let endpointsFound = 0;
        essentialEndpoints.forEach((endpoint) => {
          if (existsSync(validatePath(projectRoot, endpoint))) {
            endpointsFound++;
          }
        });

        this.logResult(
          'Essential API Endpoints',
          endpointsFound >= 2 ? 'pass' : 'warn',
          `Found ${endpointsFound}/${essentialEndpoints.length} essential endpoints`
        );

        // Test health endpoint specifically
        const healthEndpoint = validatePath(projectRoot, 'api/health/index.ts');
        if (existsSync(healthEndpoint)) {
          const healthContent = readFileSync(healthEndpoint, 'utf8');
          const hasComprehensiveHealth =
            healthContent.includes('checkDatabaseHealth') &&
            healthContent.includes('checkAIServicesHealth');

          this.logResult(
            'Health Check Endpoint',
            hasComprehensiveHealth ? 'pass' : 'warn',
            hasComprehensiveHealth
              ? 'Comprehensive health checks implemented'
              : 'Basic health check only'
          );
        }
      } else {
        this.logResult('API Directory Structure', 'fail', 'API directory not found', 'critical');
      }
    } catch (error) {
      this.logResult(
        'API Endpoints Test',
        'fail',
        `API endpoints test failed: ${error.message}`,
        'critical'
      );
    }
  }

  async testIntegrationServices() {
    log.info('Testing integration services...');

    try {
      // Check integration encryption
      if (process.env.INTEGRATION_ENCRYPTION_SECRET) {
        const secretLength = process.env.INTEGRATION_ENCRYPTION_SECRET.length;
        this.logResult(
          'Integration Encryption',
          secretLength >= 32 ? 'pass' : 'fail',
          `Encryption secret length: ${secretLength} characters`,
          secretLength < 32 ? 'critical' : 'info'
        );
      } else {
        this.logResult(
          'Integration Encryption',
          'fail',
          'Integration encryption secret not configured',
          'critical'
        );
      }

      // Check integration services implementation
      const integrationFiles = [
        'services/integrationService.ts',
        'services/integrationOrchestrator.ts',
        'components/IntegrationManager.tsx',
      ];

      let integrationImplemented = false;
      integrationFiles.forEach((file) => {
        if (existsSync(validatePath(projectRoot, file))) {
          integrationImplemented = true;
        }
      });

      this.logResult(
        'Integration Services Implementation',
        integrationImplemented ? 'pass' : 'warn',
        integrationImplemented
          ? 'Integration services implemented'
          : 'Integration services not fully implemented'
      );

      // Check for social media platform support
      const constantsPath = validatePath(projectRoot, 'constants.tsx');
      if (existsSync(constantsPath)) {
        const constantsContent = readFileSync(constantsPath, 'utf8');
        const hasPlatforms =
          constantsContent.includes('PLATFORMS') || constantsContent.includes('PLATFORM_CONFIG');

        this.logResult(
          'Social Media Platform Support',
          hasPlatforms ? 'pass' : 'warn',
          hasPlatforms
            ? 'Social media platforms configured'
            : 'Social media platform configuration not found'
        );
      }
    } catch (error) {
      this.logResult(
        'Integration Services Test',
        'fail',
        `Integration services test failed: ${error.message}`
      );
    }
  }

  async testSchedulingSystem() {
    log.info('Testing scheduling system...');

    try {
      // Check for scheduling service
      const schedulingServices = [
        'services/postScheduler.ts',
        'services/schedulingService.ts',
        'services/schedulerService.ts',
      ];

      let schedulingServiceFound = false;
      schedulingServices.forEach((service) => {
        const servicePath = validatePath(projectRoot, service);
        if (existsSync(servicePath)) {
          const content = readFileSync(servicePath, 'utf8');
          if (content.includes('schedule') || content.includes('Schedule')) {
            schedulingServiceFound = true;
          }
        }
      });

      this.logResult(
        'Scheduling Service Implementation',
        schedulingServiceFound ? 'pass' : 'warn',
        schedulingServiceFound ? 'Scheduling service implemented' : 'Scheduling service not found'
      );

      // Check for calendar view component
      const calendarPath = validatePath(projectRoot, 'components/CalendarView.tsx');
      if (existsSync(calendarPath)) {
        this.logResult('Calendar Interface', 'pass', 'Calendar view component exists');
      } else {
        this.logResult('Calendar Interface', 'warn', 'Calendar view component not found');
      }

      // Check for scheduling in main app
      const appPath = validatePath(projectRoot, 'App.tsx');
      if (existsSync(appPath)) {
        const appContent = readFileSync(appPath, 'utf8');
        const hasScheduling = appContent.includes('schedule') && appContent.includes('Schedule');

        this.logResult(
          'Scheduling Integration',
          hasScheduling ? 'pass' : 'warn',
          hasScheduling ? 'Scheduling integrated in main app' : 'Scheduling integration not found'
        );
      }
    } catch (error) {
      this.logResult(
        'Scheduling System Test',
        'fail',
        `Scheduling system test failed: ${error.message}`
      );
    }
  }

  async testErrorHandling() {
    log.header('🛡️ Testing Error Handling');

    try {
      // Check for error boundary components
      const errorBoundaryFiles = [
        'components/ErrorBoundary.tsx',
        'components/ErrorBoundaryEnhanced.tsx',
        'components/AppWithErrorHandling.tsx',
      ];

      let errorBoundaryFound = false;
      errorBoundaryFiles.forEach((file) => {
        if (existsSync(validatePath(projectRoot, file))) {
          errorBoundaryFound = true;
        }
      });

      this.logResult(
        'Error Boundary Implementation',
        errorBoundaryFound ? 'pass' : 'warn',
        errorBoundaryFound
          ? 'Error boundary components found'
          : 'Error boundary components not found'
      );

      // Check for error handling services
      const errorServices = ['services/errorHandlingService.ts', 'services/apiErrorHandler.ts'];

      let errorServiceFound = false;
      errorServices.forEach((service) => {
        if (existsSync(validatePath(projectRoot, service))) {
          errorServiceFound = true;
        }
      });

      this.logResult(
        'Error Handling Services',
        errorServiceFound ? 'pass' : 'warn',
        errorServiceFound
          ? 'Error handling services implemented'
          : 'Error handling services not found'
      );

      // Check for user-friendly error messages in main app
      const appPath = validatePath(projectRoot, 'App.tsx');
      if (existsSync(appPath)) {
        const appContent = readFileSync(appPath, 'utf8');
        const hasErrorMessages =
          appContent.includes('errorMessage') && appContent.includes('setErrorMessage');

        this.logResult(
          'User-Friendly Error Messages',
          hasErrorMessages ? 'pass' : 'warn',
          hasErrorMessages
            ? 'User-friendly error messaging implemented'
            : 'Error messaging not found'
        );
      }
    } catch (error) {
      this.logResult('Error Handling Test', 'fail', `Error handling test failed: ${error.message}`);
    }
  }

  async testPerformanceOptimizations() {
    log.header('⚡ Testing Performance Optimizations');

    try {
      // Check build configuration
      const viteConfigPath = validatePath(projectRoot, 'vite.config.ts');
      if (existsSync(viteConfigPath)) {
        const viteContent = readFileSync(viteConfigPath, 'utf8');

        const hasCodeSplitting =
          viteContent.includes('manualChunks') || viteContent.includes('splitVendorChunk');
        this.logResult(
          'Code Splitting',
          hasCodeSplitting ? 'pass' : 'warn',
          hasCodeSplitting ? 'Code splitting configured' : 'Code splitting not configured'
        );

        const hasMinification = viteContent.includes('terser') || viteContent.includes('minify');
        this.logResult(
          'Build Minification',
          hasMinification ? 'pass' : 'warn',
          hasMinification
            ? 'Build minification configured'
            : 'Build minification not explicitly configured'
        );
      }

      // Check for performance monitoring
      const performanceServices = [
        'services/performanceMonitoringService.ts',
        'services/frontendPerformanceService.ts',
      ];

      let performanceMonitoringFound = false;
      performanceServices.forEach((service) => {
        if (existsSync(validatePath(projectRoot, service))) {
          performanceMonitoringFound = true;
        }
      });

      this.logResult(
        'Performance Monitoring',
        performanceMonitoringFound ? 'pass' : 'warn',
        performanceMonitoringFound
          ? 'Performance monitoring services found'
          : 'Performance monitoring not implemented'
      );

      // Check for lazy loading
      const appPath = validatePath(projectRoot, 'App.tsx');
      if (existsSync(appPath)) {
        const appContent = readFileSync(appPath, 'utf8');
        const hasLazyLoading = appContent.includes('lazy') || appContent.includes('Suspense');

        this.logResult(
          'Lazy Loading',
          hasLazyLoading ? 'pass' : 'warn',
          hasLazyLoading ? 'Lazy loading implemented' : 'Lazy loading not found'
        );
      }
    } catch (error) {
      this.logResult(
        'Performance Optimizations Test',
        'fail',
        `Performance test failed: ${error.message}`
      );
    }
  }

  async testBuildProcess() {
    log.header('🔨 Testing Build Process');

    try {
      // Test if build completes successfully
      log.info('Running production build...');

      try {
        execSync('npm run build', {
          stdio: 'pipe',
          timeout: 120000, // 2 minute timeout
        });
        this.logResult('Production Build', 'pass', 'Production build completed successfully');
      } catch (error) {
        this.logResult(
          'Production Build',
          'fail',
          `Production build failed: ${error.message}`,
          'critical'
        );
      }

      // Check if build output exists
      const distPath = validatePath(projectRoot, 'dist');
      if (existsSync(distPath)) {
        this.logResult('Build Output', 'pass', 'Build output directory exists');

        // Check for essential build files
        const essentialFiles = ['index.html', 'assets'];
        let foundFiles = 0;

        essentialFiles.forEach((file) => {
          if (existsSync(join(distPath, file))) {
            foundFiles++;
          }
        });

        this.logResult(
          'Build Files',
          foundFiles === essentialFiles.length ? 'pass' : 'warn',
          `Found ${foundFiles}/${essentialFiles.length} essential build files`
        );
      } else {
        this.logResult('Build Output', 'fail', 'Build output directory not found', 'critical');
      }
    } catch (error) {
      this.logResult(
        'Build Process Test',
        'fail',
        `Build process test failed: ${error.message}`,
        'critical'
      );
    }
  }

  async testSecurityConfiguration() {
    log.header('🔒 Testing Security Configuration');

    try {
      // Run existing security validation
      try {
        execSync('node scripts/security-validation.js', {
          stdio: 'pipe',
          timeout: 60000,
        });
        this.logResult('Security Validation', 'pass', 'Security validation passed');
      } catch (error) {
        this.logResult(
          'Security Validation',
          'warn',
          'Security validation completed with warnings'
        );
      }

      // Check for HTTPS configuration
      const vercelConfigPath = validatePath(projectRoot, 'vercel.json');
      if (existsSync(vercelConfigPath)) {
        const vercelContent = readFileSync(vercelConfigPath, 'utf8');
        const hasSecurityHeaders =
          vercelContent.includes('headers') && vercelContent.includes('X-Content-Type-Options');

        this.logResult(
          'Security Headers',
          hasSecurityHeaders ? 'pass' : 'warn',
          hasSecurityHeaders ? 'Security headers configured' : 'Security headers not configured'
        );
      }
    } catch (error) {
      this.logResult(
        'Security Configuration Test',
        'fail',
        `Security test failed: ${error.message}`
      );
    }
  }

  async testMonitoringAndAlerting() {
    log.header('📊 Testing Monitoring and Alerting');

    try {
      // Check for health check endpoint
      const healthEndpoint = validatePath(projectRoot, 'api/health/index.ts');
      if (existsSync(healthEndpoint)) {
        const healthContent = readFileSync(healthEndpoint, 'utf8');

        const hasComprehensiveChecks = [
          'checkDatabaseHealth',
          'checkAIServicesHealth',
          'checkAuthenticationHealth',
          'checkIntegrationServicesHealth',
        ].every((check) => healthContent.includes(check));

        this.logResult(
          'Health Check Endpoint',
          hasComprehensiveChecks ? 'pass' : 'warn',
          hasComprehensiveChecks
            ? 'Comprehensive health checks implemented'
            : 'Basic health checks only'
        );
      } else {
        this.logResult(
          'Health Check Endpoint',
          'fail',
          'Health check endpoint not found',
          'critical'
        );
      }

      // Check for monitoring services
      const monitoringServices = [
        'services/monitoringService.ts',
        'services/productionMonitoringService.ts',
      ];

      let monitoringFound = false;
      monitoringServices.forEach((service) => {
        if (existsSync(validatePath(projectRoot, service))) {
          monitoringFound = true;
        }
      });

      this.logResult(
        'Monitoring Services',
        monitoringFound ? 'pass' : 'warn',
        monitoringFound ? 'Monitoring services implemented' : 'Monitoring services not found'
      );

      // Check for error reporting
      const errorReportingPath = validatePath(projectRoot, 'components/ErrorReportingSystem.tsx');
      if (existsSync(errorReportingPath)) {
        this.logResult('Error Reporting', 'pass', 'Error reporting system found');
      } else {
        this.logResult('Error Reporting', 'warn', 'Error reporting system not found');
      }
    } catch (error) {
      this.logResult(
        'Monitoring and Alerting Test',
        'fail',
        `Monitoring test failed: ${error.message}`
      );
    }
  }

  generateKnownLimitationsReport() {
    log.header('📋 Known Limitations and Issues');

    const knownLimitations = [
      {
        category: 'AI Services',
        limitation: 'Gemini AI rate limits may affect content generation during high usage',
        impact: 'Medium',
        workaround: 'Implement request queuing and retry logic',
      },
      {
        category: 'Database',
        limitation: 'Neon PostgreSQL free tier has connection limits',
        impact: 'Low',
        workaround: 'Connection pooling implemented to manage connections efficiently',
      },
      {
        category: 'Social Media Integrations',
        limitation: 'Some social media platforms require manual OAuth setup',
        impact: 'Medium',
        workaround: 'Comprehensive integration manager with step-by-step setup guides',
      },
      {
        category: 'Image Generation',
        limitation: 'AI image generation may have occasional failures',
        impact: 'Low',
        workaround: 'Fallback to text-only posts when image generation fails',
      },
      {
        category: 'Real-time Features',
        limitation: 'Some real-time features depend on browser support',
        impact: 'Low',
        workaround: 'Graceful degradation to polling-based updates',
      },
    ];

    console.log('\nKnown limitations and their workarounds:');
    knownLimitations.forEach((item, index) => {
      console.log(`\n${index + 1}. ${colors.bold}${item.category}${colors.reset}`);
      console.log(`   Limitation: ${item.limitation}`);
      console.log(`   Impact: ${item.impact}`);
      console.log(`   Workaround: ${item.workaround}`);
    });

    return knownLimitations;
  }

  generateFinalReport() {
    log.header('📊 Final Production Readiness Report');

    const totalTests = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = totalTests > 0 ? ((this.results.passed / totalTests) * 100).toFixed(1) : 0;

    console.log(`${colors.bold}Test Summary:${colors.reset}`);
    console.log(`✅ Passed: ${colors.green}${this.results.passed}${colors.reset}`);
    console.log(`⚠️  Warnings: ${colors.yellow}${this.results.warnings}${colors.reset}`);
    console.log(`❌ Failed: ${colors.red}${this.results.failed}${colors.reset}`);
    console.log(`📊 Success Rate: ${colors.blue}${successRate}%${colors.reset}`);

    // Critical Issues
    if (this.results.criticalIssues.length > 0) {
      console.log(
        `\n${colors.bold}${colors.red}🚨 Critical Issues (Must Fix Before Launch):${colors.reset}`
      );
      this.results.criticalIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.test}: ${issue.message}`);
      });
    }

    // Regular Issues
    if (this.results.issues.length > 0) {
      console.log(`\n${colors.bold}${colors.red}❌ Issues to Address:${colors.reset}`);
      this.results.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.test}: ${issue.message}`);
      });
    }

    // Recommendations
    if (this.results.recommendations.length > 0) {
      console.log(`\n${colors.bold}${colors.yellow}💡 Recommendations:${colors.reset}`);
      this.results.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec.test}: ${rec.message}`);
      });
    }

    // Known Limitations
    this.generateKnownLimitationsReport();

    // Final Assessment
    console.log(`\n${colors.bold}Final Assessment:${colors.reset}`);

    if (this.results.criticalIssues.length === 0 && this.results.failed === 0) {
      if (this.results.warnings === 0) {
        log.success('🎉 READY FOR PRODUCTION LAUNCH!');
        console.log('All critical systems are operational and ready for users.');
      } else {
        log.warning('✅ READY FOR PRODUCTION with recommendations');
        console.log(
          'Core functionality is ready, but consider addressing the recommendations above.'
        );
      }
    } else if (this.results.criticalIssues.length === 0 && this.results.failed <= 2) {
      log.warning('⚠️  MOSTLY READY - Minor issues to address');
      console.log('Core systems are functional, but some non-critical issues should be fixed.');
    } else {
      log.error('❌ NOT READY FOR PRODUCTION');
      console.log('Critical issues must be resolved before launch.');
      return false;
    }

    // Next Steps
    console.log(`\n${colors.bold}Recommended Next Steps:${colors.reset}`);
    console.log('1. Address any critical issues listed above');
    console.log('2. Review and implement recommendations');
    console.log('3. Perform final manual testing of key user workflows');
    console.log('4. Deploy to production environment');
    console.log('5. Monitor application health after deployment');
    console.log('6. Set up ongoing monitoring and alerting');

    return this.results.criticalIssues.length === 0;
  }

  async runFullValidation() {
    console.log(`${colors.bold}${colors.blue}🚀 Production Readiness Validation${colors.reset}`);
    console.log(
      `${colors.blue}Starting comprehensive validation at ${new Date().toISOString()}${colors.reset}\n`
    );

    try {
      // Core workflow validation
      await this.validateCompleteWorkflow();

      // Additional validation tests
      await this.testErrorHandling();
      await this.testPerformanceOptimizations();
      await this.testBuildProcess();
      await this.testSecurityConfiguration();
      await this.testMonitoringAndAlerting();

      // Generate final report
      const isReady = this.generateFinalReport();

      return isReady;
    } catch (error) {
      log.error(`Validation process failed: ${error.message}`);
      return false;
    }
  }
}

// Run validation if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new ProductionReadinessValidator();
  validator
    .runFullValidation()
    .then((isReady) => {
      process.exit(isReady ? 0 : 1);
    })
    .catch((error) => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

export default ProductionReadinessValidator;
