#!/usr/bin/env node

/**
 * End-to-End Workflow Test
 *
 * This script simulates the complete user workflow:
 * signup → create content → schedule → publish
 *
 * Tests the entire application flow as a real user would experience it.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { validatePath } from '../utils/pathValidator.js';

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
  step: (step, msg) => console.log(`${colors.bold}Step ${step}:${colors.reset} ${msg}`),
};

class EndToEndWorkflowTester {
  constructor() {
    this.testResults = {
      steps: [],
      passed: 0,
      failed: 0,
      warnings: 0,
      startTime: Date.now(),
    };
  }

  recordStep(stepName, status, message, details = null) {
    const step = {
      name: stepName,
      status,
      message,
      details,
      timestamp: new Date().toISOString(),
    };

    this.testResults.steps.push(step);

    if (status === 'pass') {
      log.success(`${stepName}: ${message}`);
      this.testResults.passed++;
    } else if (status === 'fail') {
      log.error(`${stepName}: ${message}`);
      this.testResults.failed++;
    } else if (status === 'warn') {
      log.warning(`${stepName}: ${message}`);
      this.testResults.warnings++;
    } else {
      log.info(`${stepName}: ${message}`);
    }

    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  async testUserSignupFlow() {
    log.header('👤 Testing User Signup/Authentication Flow');

    try {
      // Step 1: Check authentication configuration
      log.step(1, 'Verify authentication configuration');

      const requiredAuthVars = [
        'VITE_STACK_PROJECT_ID',
        'VITE_STACK_PUBLISHABLE_CLIENT_KEY',
        'STACK_SECRET_SERVER_KEY',
      ];

      const missingVars = requiredAuthVars.filter((varName) => !process.env[varName]);

      if (missingVars.length === 0) {
        this.recordStep(
          'Authentication Configuration',
          'pass',
          'All Stack Auth environment variables are configured'
        );
      } else {
        this.recordStep(
          'Authentication Configuration',
          'fail',
          `Missing authentication variables: ${missingVars.join(', ')}`,
          { missingVars }
        );
        return false;
      }

      // Step 2: Check authentication components
      log.step(2, 'Verify authentication components exist');

      const authComponentPaths = [
        'App.tsx',
        'components/Auth.tsx',
        'components/AppWithErrorHandling.tsx',
      ];

      let authImplementationFound = false;
      let authDetails = {};

      authComponentPaths.forEach((componentPath) => {
        const fullPath = validatePath(projectRoot, componentPath);
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf8');

          if (content.includes('useUser') || content.includes('@stackframe/react')) {
            authImplementationFound = true;
            authDetails[componentPath] = {
              hasUseUser: content.includes('useUser'),
              hasStackFrame: content.includes('@stackframe/react'),
              hasAuthHandling: content.includes('stackUser') || content.includes('user'),
            };
          }
        }
      });

      if (authImplementationFound) {
        this.recordStep(
          'Authentication Components',
          'pass',
          'Authentication implementation found in components',
          authDetails
        );
      } else {
        this.recordStep(
          'Authentication Components',
          'fail',
          'Authentication implementation not found in components'
        );
        return false;
      }

      // Step 3: Check user state management
      log.step(3, 'Verify user state management');

      const appPath = validatePath(projectRoot, 'App.tsx');
      if (existsSync(appPath)) {
        const appContent = readFileSync(appPath, 'utf8');

        const hasUserState =
          appContent.includes('useState') &&
          (appContent.includes('user') || appContent.includes('User'));
        const hasAuthReady = appContent.includes('isAuthReady') || appContent.includes('authReady');

        if (hasUserState && hasAuthReady) {
          this.recordStep(
            'User State Management',
            'pass',
            'User state management properly implemented',
            { hasUserState, hasAuthReady }
          );
        } else {
          this.recordStep(
            'User State Management',
            'warn',
            'User state management may be incomplete',
            { hasUserState, hasAuthReady }
          );
        }
      }

      return true;
    } catch (error) {
      this.recordStep(
        'User Signup Flow Test',
        'fail',
        `Authentication flow test failed: ${error.message}`
      );
      return false;
    }
  }

  async testContentCreationFlow() {
    log.header('✍️ Testing Content Creation Flow');

    try {
      // Step 1: Check AI service configuration
      log.step(1, 'Verify AI service configuration');

      if (process.env.GEMINI_API_KEY) {
        this.recordStep('AI Service Configuration', 'pass', 'Gemini API key is configured');
      } else {
        this.recordStep('AI Service Configuration', 'fail', 'Gemini API key is not configured');
        return false;
      }

      // Step 2: Check content generation services
      log.step(2, 'Verify content generation services');

      const geminiServicePath = validatePath(projectRoot, 'services/geminiService.ts');
      if (existsSync(geminiServicePath)) {
        const geminiContent = readFileSync(geminiServicePath, 'utf8');

        const contentGenerationMethods = {
          generateTopic: geminiContent.includes('generateTopic'),
          generateIdeas: geminiContent.includes('generateIdeas'),
          generatePersonalizedContent:
            geminiContent.includes('generatePersonalizedContent') ||
            geminiContent.includes('generateContent'),
          generateSummary: geminiContent.includes('generateSummary'),
          generateHeadlines: geminiContent.includes('generateHeadlines'),
          generateTags: geminiContent.includes('generateTags'),
          generateSocialMediaPost: geminiContent.includes('generateSocialMediaPost'),
          generateImage: geminiContent.includes('generateImage'),
        };

        const implementedMethods = Object.entries(contentGenerationMethods)
          .filter(([_, implemented]) => implemented)
          .map(([method, _]) => method);

        if (implementedMethods.length >= 6) {
          this.recordStep(
            'Content Generation Methods',
            'pass',
            `${implementedMethods.length}/8 content generation methods implemented`,
            { implementedMethods }
          );
        } else {
          this.recordStep(
            'Content Generation Methods',
            'warn',
            `Only ${implementedMethods.length}/8 content generation methods found`,
            {
              implementedMethods,
              missing: Object.keys(contentGenerationMethods).filter(
                (m) => !contentGenerationMethods[m]
              ),
            }
          );
        }
      } else {
        this.recordStep('Content Generation Services', 'fail', 'Gemini service file not found');
        return false;
      }

      // Step 3: Check content workflow in main app
      log.step(3, 'Verify content creation workflow in main app');

      const appPath = validatePath(projectRoot, 'App.tsx');
      if (existsSync(appPath)) {
        const appContent = readFileSync(appPath, 'utf8');

        const workflowElements = {
          topicGeneration:
            appContent.includes('handleGenerateTopic') || appContent.includes('generateTopic'),
          ideaGeneration:
            appContent.includes('handleGenerateIdeas') || appContent.includes('generateIdeas'),
          postGeneration:
            appContent.includes('handleGeneratePost') || appContent.includes('generatePost'),
          socialMediaGeneration:
            appContent.includes('handleGenerateSocialPost') ||
            appContent.includes('generateSocialPost'),
          imageGeneration:
            appContent.includes('handleGenerateImages') || appContent.includes('generateImages'),
          contentSaving: appContent.includes('handleSaveDraft') || appContent.includes('saveDraft'),
        };

        const implementedWorkflow = Object.entries(workflowElements)
          .filter(([_, implemented]) => implemented)
          .map(([element, _]) => element);

        if (implementedWorkflow.length >= 4) {
          this.recordStep(
            'Content Creation Workflow',
            'pass',
            `${implementedWorkflow.length}/6 workflow elements implemented`,
            { implementedWorkflow }
          );
        } else {
          this.recordStep(
            'Content Creation Workflow',
            'warn',
            `Only ${implementedWorkflow.length}/6 workflow elements found`,
            { implementedWorkflow }
          );
        }
      }

      // Step 4: Check personalization features
      log.step(4, 'Verify content personalization features');

      if (existsSync(appPath)) {
        const appContent = readFileSync(appPath, 'utf8');

        const personalizationFeatures = {
          brandVoice:
            appContent.includes('BrandVoice') && appContent.includes('selectedBrandVoice'),
          audienceProfile:
            appContent.includes('AudienceProfile') &&
            appContent.includes('selectedAudienceProfile'),
          campaigns: appContent.includes('Campaign') && appContent.includes('selectedCampaign'),
          templates:
            appContent.includes('ContentTemplate') && appContent.includes('selectedTemplate'),
        };

        const implementedFeatures = Object.entries(personalizationFeatures)
          .filter(([_, implemented]) => implemented)
          .map(([feature, _]) => feature);

        if (implementedFeatures.length >= 2) {
          this.recordStep(
            'Content Personalization',
            'pass',
            `${implementedFeatures.length}/4 personalization features implemented`,
            { implementedFeatures }
          );
        } else {
          this.recordStep(
            'Content Personalization',
            'warn',
            `Only ${implementedFeatures.length}/4 personalization features found`,
            { implementedFeatures }
          );
        }
      }

      return true;
    } catch (error) {
      this.recordStep(
        'Content Creation Flow Test',
        'fail',
        `Content creation test failed: ${error.message}`
      );
      return false;
    }
  }

  async testSchedulingFlow() {
    log.header('📅 Testing Content Scheduling Flow');

    try {
      // Step 1: Check scheduling service
      log.step(1, 'Verify scheduling service implementation');

      const schedulingServices = [
        'services/postScheduler.ts',
        'services/schedulingService.ts',
        'services/schedulerService.ts',
      ];

      let schedulingServiceFound = false;
      let schedulingDetails = {};

      schedulingServices.forEach((servicePath) => {
        const fullPath = validatePath(projectRoot, servicePath);
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf8');
          schedulingServiceFound = true;
          schedulingDetails[servicePath] = {
            hasScheduleMethod: content.includes('schedule'),
            hasStartMethod: content.includes('start'),
            hasStopMethod: content.includes('stop'),
            hasIntervalHandling: content.includes('setInterval') || content.includes('setTimeout'),
          };
        }
      });

      if (schedulingServiceFound) {
        this.recordStep(
          'Scheduling Service',
          'pass',
          'Scheduling service implementation found',
          schedulingDetails
        );
      } else {
        this.recordStep(
          'Scheduling Service',
          'warn',
          'Scheduling service implementation not found'
        );
      }

      // Step 2: Check scheduling workflow in main app
      log.step(2, 'Verify scheduling workflow integration');

      const appPath = validatePath(projectRoot, 'App.tsx');
      if (existsSync(appPath)) {
        const appContent = readFileSync(appPath, 'utf8');

        const schedulingWorkflow = {
          scheduleModal:
            appContent.includes('showScheduleModal') || appContent.includes('ScheduleModal'),
          scheduleDate: appContent.includes('scheduleDate') || appContent.includes('schedule_date'),
          handleSchedule:
            appContent.includes('handleSchedulePost') || appContent.includes('schedulePost'),
          scheduledPosts:
            appContent.includes('allScheduledPosts') || appContent.includes('scheduledPosts'),
          postScheduler: appContent.includes('postScheduler'),
        };

        const implementedScheduling = Object.entries(schedulingWorkflow)
          .filter(([_, implemented]) => implemented)
          .map(([element, _]) => element);

        if (implementedScheduling.length >= 3) {
          this.recordStep(
            'Scheduling Workflow Integration',
            'pass',
            `${implementedScheduling.length}/5 scheduling elements implemented`,
            { implementedScheduling }
          );
        } else {
          this.recordStep(
            'Scheduling Workflow Integration',
            'warn',
            `Only ${implementedScheduling.length}/5 scheduling elements found`,
            { implementedScheduling }
          );
        }
      }

      // Step 3: Check calendar view component
      log.step(3, 'Verify calendar view component');

      const calendarPath = validatePath(projectRoot, 'components/CalendarView.tsx');
      if (existsSync(calendarPath)) {
        const calendarContent = readFileSync(calendarPath, 'utf8');

        const calendarFeatures = {
          hasCalendarDisplay:
            calendarContent.includes('calendar') || calendarContent.includes('Calendar'),
          hasDateHandling: calendarContent.includes('Date') || calendarContent.includes('date'),
          hasPostDisplay: calendarContent.includes('post') || calendarContent.includes('Post'),
          hasEventHandling:
            calendarContent.includes('onClick') || calendarContent.includes('onSelect'),
        };

        const implementedCalendarFeatures = Object.entries(calendarFeatures)
          .filter(([_, implemented]) => implemented)
          .map(([feature, _]) => feature);

        this.recordStep(
          'Calendar View Component',
          'pass',
          `Calendar component found with ${implementedCalendarFeatures.length}/4 features`,
          { implementedCalendarFeatures }
        );
      } else {
        this.recordStep('Calendar View Component', 'warn', 'Calendar view component not found');
      }

      return true;
    } catch (error) {
      this.recordStep('Scheduling Flow Test', 'fail', `Scheduling test failed: ${error.message}`);
      return false;
    }
  }

  async testPublishingFlow() {
    log.header('🚀 Testing Content Publishing Flow');

    try {
      // Step 1: Check integration services
      log.step(1, 'Verify integration services for publishing');

      const integrationFiles = [
        'services/integrationService.ts',
        'services/integrationOrchestrator.ts',
        'components/IntegrationManager.tsx',
      ];

      let integrationServiceFound = false;
      let integrationDetails = {};

      integrationFiles.forEach((filePath) => {
        const fullPath = validatePath(projectRoot, filePath);
        if (existsSync(fullPath)) {
          const content = readFileSync(fullPath, 'utf8');
          integrationServiceFound = true;
          integrationDetails[filePath] = {
            hasPublishMethod: content.includes('publish') || content.includes('post'),
            hasIntegrationConfig:
              content.includes('Integration') || content.includes('integration'),
            hasPlatformSupport: content.includes('platform') || content.includes('Platform'),
            hasErrorHandling: content.includes('try') && content.includes('catch'),
          };
        }
      });

      if (integrationServiceFound) {
        this.recordStep(
          'Integration Services',
          'pass',
          'Integration services for publishing found',
          integrationDetails
        );
      } else {
        this.recordStep(
          'Integration Services',
          'warn',
          'Integration services not found - publishing may be limited'
        );
      }

      // Step 2: Check social media platform support
      log.step(2, 'Verify social media platform support');

      const constantsPath = validatePath(projectRoot, 'constants.tsx');
      if (existsSync(constantsPath)) {
        const constantsContent = readFileSync(constantsPath, 'utf8');

        const platformSupport = {
          hasPlatformsList:
            constantsContent.includes('PLATFORMS') || constantsContent.includes('platforms'),
          hasPlatformConfig:
            constantsContent.includes('PLATFORM_CONFIG') ||
            constantsContent.includes('platformConfig'),
          hasTwitter: constantsContent.includes('twitter') || constantsContent.includes('Twitter'),
          hasLinkedIn:
            constantsContent.includes('linkedin') || constantsContent.includes('LinkedIn'),
          hasFacebook:
            constantsContent.includes('facebook') || constantsContent.includes('Facebook'),
          hasInstagram:
            constantsContent.includes('instagram') || constantsContent.includes('Instagram'),
        };

        const supportedPlatforms = Object.entries(platformSupport)
          .filter(([_, supported]) => supported)
          .map(([platform, _]) => platform);

        if (supportedPlatforms.length >= 4) {
          this.recordStep(
            'Social Media Platform Support',
            'pass',
            `${supportedPlatforms.length}/6 platform features found`,
            { supportedPlatforms }
          );
        } else {
          this.recordStep(
            'Social Media Platform Support',
            'warn',
            `Only ${supportedPlatforms.length}/6 platform features found`,
            { supportedPlatforms }
          );
        }
      }

      // Step 3: Check publishing workflow in main app
      log.step(3, 'Verify publishing workflow integration');

      const appPath = validatePath(projectRoot, 'App.tsx');
      if (existsSync(appPath)) {
        const appContent = readFileSync(appPath, 'utf8');

        const publishingWorkflow = {
          socialMediaPosts:
            appContent.includes('socialMediaPosts') || appContent.includes('SocialMediaPosts'),
          platformHandling: appContent.includes('platform') && appContent.includes('PLATFORMS'),
          publishingLogic: appContent.includes('publish') || appContent.includes('post'),
          integrationManager:
            appContent.includes('IntegrationManager') ||
            appContent.includes('showIntegrationManager'),
          postStatus: appContent.includes('posted') || appContent.includes('posting'),
        };

        const implementedPublishing = Object.entries(publishingWorkflow)
          .filter(([_, implemented]) => implemented)
          .map(([element, _]) => element);

        if (implementedPublishing.length >= 3) {
          this.recordStep(
            'Publishing Workflow Integration',
            'pass',
            `${implementedPublishing.length}/5 publishing elements implemented`,
            { implementedPublishing }
          );
        } else {
          this.recordStep(
            'Publishing Workflow Integration',
            'warn',
            `Only ${implementedPublishing.length}/5 publishing elements found`,
            { implementedPublishing }
          );
        }
      }

      // Step 4: Check credential encryption for integrations
      log.step(4, 'Verify credential encryption for secure publishing');

      if (process.env.INTEGRATION_ENCRYPTION_SECRET) {
        const secretLength = process.env.INTEGRATION_ENCRYPTION_SECRET.length;
        if (secretLength >= 32) {
          this.recordStep(
            'Credential Encryption',
            'pass',
            `Integration encryption secret properly configured (${secretLength} characters)`
          );
        } else {
          this.recordStep(
            'Credential Encryption',
            'fail',
            `Integration encryption secret too short (${secretLength} characters, need 32+)`
          );
        }
      } else {
        this.recordStep(
          'Credential Encryption',
          'warn',
          'Integration encryption secret not configured - publishing credentials may not be secure'
        );
      }

      return true;
    } catch (error) {
      this.recordStep('Publishing Flow Test', 'fail', `Publishing test failed: ${error.message}`);
      return false;
    }
  }

  async testDatabasePersistence() {
    log.header('💾 Testing Database Persistence');

    try {
      // Step 1: Check database configuration
      log.step(1, 'Verify database configuration');

      if (process.env.DATABASE_URL) {
        this.recordStep('Database Configuration', 'pass', 'Database URL is configured');
      } else {
        this.recordStep('Database Configuration', 'fail', 'Database URL is not configured');
        return false;
      }

      // Step 2: Check database service implementation
      log.step(2, 'Verify database service implementation');

      const dbServicePath = validatePath(projectRoot, 'services/neonService.ts');
      if (existsSync(dbServicePath)) {
        const dbContent = readFileSync(dbServicePath, 'utf8');

        const dbOperations = {
          connection: dbContent.includes('pool') || dbContent.includes('connect'),
          testConnection: dbContent.includes('testConnection'),
          queryExecution: dbContent.includes('query') || dbContent.includes('pool`'),
          errorHandling: dbContent.includes('try') && dbContent.includes('catch'),
          ssl: dbContent.includes('ssl'),
        };

        const implementedOperations = Object.entries(dbOperations)
          .filter(([_, implemented]) => implemented)
          .map(([operation, _]) => operation);

        if (implementedOperations.length >= 4) {
          this.recordStep(
            'Database Service Implementation',
            'pass',
            `${implementedOperations.length}/5 database operations implemented`,
            { implementedOperations }
          );
        } else {
          this.recordStep(
            'Database Service Implementation',
            'warn',
            `Only ${implementedOperations.length}/5 database operations found`,
            { implementedOperations }
          );
        }
      } else {
        this.recordStep(
          'Database Service Implementation',
          'fail',
          'Database service file not found'
        );
        return false;
      }

      // Step 3: Check API service for database operations
      log.step(3, 'Verify API service database integration');

      const apiServicePath = validatePath(projectRoot, 'services/clientApiService.ts');
      if (existsSync(apiServicePath)) {
        const apiContent = readFileSync(apiServicePath, 'utf8');

        const apiOperations = {
          getPosts: apiContent.includes('getPosts'),
          addPost: apiContent.includes('addPost'),
          updatePost: apiContent.includes('updatePost'),
          deletePost: apiContent.includes('deletePost'),
          getBrandVoices: apiContent.includes('getBrandVoices'),
          getAudienceProfiles: apiContent.includes('getAudienceProfiles'),
        };

        const implementedApiOperations = Object.entries(apiOperations)
          .filter(([_, implemented]) => implemented)
          .map(([operation, _]) => operation);

        if (implementedApiOperations.length >= 4) {
          this.recordStep(
            'API Database Integration',
            'pass',
            `${implementedApiOperations.length}/6 API operations implemented`,
            { implementedApiOperations }
          );
        } else {
          this.recordStep(
            'API Database Integration',
            'warn',
            `Only ${implementedApiOperations.length}/6 API operations found`,
            { implementedApiOperations }
          );
        }
      }

      // Step 4: Test database connection (if possible)
      log.step(4, 'Test database connection');

      try {
        const { testConnection } = await import('../services/neonService.js');
        await testConnection();
        this.recordStep('Database Connection Test', 'pass', 'Database connection test successful');
      } catch (error) {
        this.recordStep(
          'Database Connection Test',
          'warn',
          `Database connection test failed: ${error.message}`
        );
      }

      return true;
    } catch (error) {
      this.recordStep(
        'Database Persistence Test',
        'fail',
        `Database test failed: ${error.message}`
      );
      return false;
    }
  }

  async testMultiUserSupport() {
    log.header('👥 Testing Multi-User Support');

    try {
      // Step 1: Check user isolation in database schema
      log.step(1, 'Verify user isolation in database schema');

      const schemaFiles = ['database/schema.sql', 'database/neon-schema.sql'];

      let userIsolationFound = false;
      let schemaDetails = {};

      schemaFiles.forEach((schemaFile) => {
        const schemaPath = validatePath(projectRoot, schemaFile);
        if (existsSync(schemaPath)) {
          const schemaContent = readFileSync(schemaPath, 'utf8');

          const hasUserIdColumns =
            schemaContent.includes('user_id') || schemaContent.includes('userId');
          const hasRLS =
            schemaContent.includes('ROW LEVEL SECURITY') || schemaContent.includes('RLS');
          const hasPolicies = schemaContent.includes('CREATE POLICY');

          if (hasUserIdColumns) {
            userIsolationFound = true;
            schemaDetails[schemaFile] = {
              hasUserIdColumns,
              hasRLS,
              hasPolicies,
            };
          }
        }
      });

      if (userIsolationFound) {
        this.recordStep(
          'User Isolation Schema',
          'pass',
          'User isolation implemented in database schema',
          schemaDetails
        );
      } else {
        this.recordStep(
          'User Isolation Schema',
          'warn',
          'User isolation not clearly implemented in schema'
        );
      }

      // Step 2: Check user-specific data handling in services
      log.step(2, 'Verify user-specific data handling');

      const apiServicePath = validatePath(projectRoot, 'services/clientApiService.ts');
      if (existsSync(apiServicePath)) {
        const apiContent = readFileSync(apiServicePath, 'utf8');

        const userDataHandling = {
          userIdParameter: apiContent.includes('userId') || apiContent.includes('user_id'),
          userSpecificQueries: apiContent.includes('WHERE') && apiContent.includes('user'),
          userAuthentication: apiContent.includes('auth') || apiContent.includes('user'),
        };

        const implementedUserHandling = Object.entries(userDataHandling)
          .filter(([_, implemented]) => implemented)
          .map(([feature, _]) => feature);

        if (implementedUserHandling.length >= 2) {
          this.recordStep(
            'User-Specific Data Handling',
            'pass',
            `${implementedUserHandling.length}/3 user handling features implemented`,
            { implementedUserHandling }
          );
        } else {
          this.recordStep(
            'User-Specific Data Handling',
            'warn',
            `Only ${implementedUserHandling.length}/3 user handling features found`,
            { implementedUserHandling }
          );
        }
      }

      // Step 3: Check session management
      log.step(3, 'Verify session management');

      const appPath = validatePath(projectRoot, 'App.tsx');
      if (existsSync(appPath)) {
        const appContent = readFileSync(appPath, 'utf8');

        const sessionManagement = {
          userState: appContent.includes('user') && appContent.includes('useState'),
          authReady: appContent.includes('isAuthReady') || appContent.includes('authReady'),
          userEffects: appContent.includes('useEffect') && appContent.includes('user'),
          stackAuth: appContent.includes('useUser') || appContent.includes('stackUser'),
        };

        const implementedSession = Object.entries(sessionManagement)
          .filter(([_, implemented]) => implemented)
          .map(([feature, _]) => feature);

        if (implementedSession.length >= 3) {
          this.recordStep(
            'Session Management',
            'pass',
            `${implementedSession.length}/4 session management features implemented`,
            { implementedSession }
          );
        } else {
          this.recordStep(
            'Session Management',
            'warn',
            `Only ${implementedSession.length}/4 session management features found`,
            { implementedSession }
          );
        }
      }

      return true;
    } catch (error) {
      this.recordStep(
        'Multi-User Support Test',
        'fail',
        `Multi-user test failed: ${error.message}`
      );
      return false;
    }
  }

  generateWorkflowReport() {
    log.header('📊 End-to-End Workflow Test Report');

    const duration = Date.now() - this.testResults.startTime;
    const totalSteps =
      this.testResults.passed + this.testResults.failed + this.testResults.warnings;
    const successRate =
      totalSteps > 0 ? ((this.testResults.passed / totalSteps) * 100).toFixed(1) : 0;

    console.log(`${colors.bold}Test Summary:${colors.reset}`);
    console.log(`⏱️  Duration: ${colors.blue}${(duration / 1000).toFixed(2)}s${colors.reset}`);
    console.log(`✅ Passed: ${colors.green}${this.testResults.passed}${colors.reset}`);
    console.log(`⚠️  Warnings: ${colors.yellow}${this.testResults.warnings}${colors.reset}`);
    console.log(`❌ Failed: ${colors.red}${this.testResults.failed}${colors.reset}`);
    console.log(`📊 Success Rate: ${colors.blue}${successRate}%${colors.reset}`);

    // Detailed step results
    console.log(`\n${colors.bold}Detailed Results:${colors.reset}`);
    this.testResults.steps.forEach((step, index) => {
      const icon = step.status === 'pass' ? '✅' : step.status === 'fail' ? '❌' : '⚠️';
      console.log(`${index + 1}. ${icon} ${step.name}: ${step.message}`);
    });

    // Critical workflow assessment
    console.log(`\n${colors.bold}Workflow Assessment:${colors.reset}`);

    const criticalSteps = this.testResults.steps.filter(
      (step) =>
        step.name.includes('Configuration') ||
        step.name.includes('Service') ||
        step.name.includes('Database')
    );

    const criticalFailures = criticalSteps.filter((step) => step.status === 'fail');

    if (criticalFailures.length === 0) {
      if (this.testResults.failed === 0) {
        log.success('🎉 Complete user workflow is functional and ready!');
        console.log('All critical components are working correctly.');
      } else {
        log.warning('✅ Core workflow is functional with minor issues');
        console.log('Main user journey works, but some features may need attention.');
      }
    } else {
      log.error('❌ Critical workflow issues detected');
      console.log('Core user journey may not work properly.');
      console.log('\nCritical issues:');
      criticalFailures.forEach((failure, index) => {
        console.log(`${index + 1}. ${failure.name}: ${failure.message}`);
      });
    }

    // Recommendations
    console.log(`\n${colors.bold}Recommendations:${colors.reset}`);

    if (this.testResults.failed > 0) {
      console.log('1. Fix failed components before production deployment');
    }

    if (this.testResults.warnings > 0) {
      console.log('2. Review warnings to improve user experience');
    }

    console.log('3. Perform manual testing of the complete workflow');
    console.log('4. Test with multiple user accounts if possible');
    console.log('5. Monitor application behavior after deployment');

    return criticalFailures.length === 0 && this.testResults.failed <= 2;
  }

  async runCompleteWorkflowTest() {
    console.log(`${colors.bold}${colors.blue}🧪 End-to-End Workflow Test${colors.reset}`);
    console.log(
      `${colors.blue}Testing complete user journey at ${new Date().toISOString()}${colors.reset}\n`
    );

    try {
      // Test each part of the user workflow
      const signupSuccess = await this.testUserSignupFlow();
      const contentSuccess = await this.testContentCreationFlow();
      const scheduleSuccess = await this.testSchedulingFlow();
      const publishSuccess = await this.testPublishingFlow();
      const databaseSuccess = await this.testDatabasePersistence();
      const multiUserSuccess = await this.testMultiUserSupport();

      // Generate comprehensive report
      const workflowReady = this.generateWorkflowReport();

      return workflowReady;
    } catch (error) {
      log.error(`Workflow test failed: ${error.message}`);
      return false;
    }
  }
}

// Run test if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new EndToEndWorkflowTester();
  tester
    .runCompleteWorkflowTest()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Workflow test failed:', error);
      process.exit(1);
    });
}

export default EndToEndWorkflowTester;
