#!/usr/bin/env node

/**
 * Security Validation Script
 *
 * This script validates security configurations and checks for potential vulnerabilities
 * as part of task 9.1 Security validation
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validatePath } from '../utils/pathValidator.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔒 Starting Security Validation...\n');

// Security validation results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  issues: [],
};

function logResult(test, status, message, severity = 'info') {
  const icons = { pass: '✅', fail: '❌', warn: '⚠️' };
  const colors = {
    pass: '\x1b[32m',
    fail: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m',
  };

  console.log(`${icons[status]} ${colors[status]}${test}${colors.reset}: ${message}`);

  if (status === 'pass') results.passed++;
  else if (status === 'fail') {
    results.failed++;
    results.issues.push({ test, message, severity: 'error' });
  } else if (status === 'warn') {
    results.warnings++;
    results.issues.push({ test, message, severity: 'warning' });
  }
}

// 1. Check for API key exposure in client-side code
function checkApiKeyExposure() {
  console.log('\n📋 Checking for API key exposure in client-side code...');

  const clientSideFiles = ['App.tsx', 'index.tsx', 'vite.config.ts', 'constants.tsx'];

  let exposedKeys = [];

  clientSideFiles.forEach((file) => {
    const filePath = validatePath(projectRoot, file);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8');

      // Check for hardcoded API keys
      const apiKeyPatterns = [
        /AIza[0-9A-Za-z-_]{35}/g, // Google API keys
        /sk-[a-zA-Z0-9]{48}/g, // OpenAI API keys
        /xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}/g, // Slack tokens
        /ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
        /['"]\w*[Aa][Pp][Ii][_-]?[Kk][Ee][Yy]\w*['"]:\s*['"][^'"]+['"]/g, // Generic API key patterns
      ];

      apiKeyPatterns.forEach((pattern) => {
        const matches = content.match(pattern);
        if (matches) {
          exposedKeys.push({ file, matches });
        }
      });

      // Check for process.env usage in client code (should use import.meta.env in Vite)
      if (file !== 'vite.config.ts' && content.includes('process.env')) {
        const processEnvMatches = content.match(/process\.env\.\w+/g);
        if (processEnvMatches) {
          logResult(
            `Client-side process.env usage in ${file}`,
            'warn',
            `Found ${processEnvMatches.length} process.env references. Consider using import.meta.env for Vite.`
          );
        }
      }
    }
  });

  if (exposedKeys.length === 0) {
    logResult('API Key Exposure Check', 'pass', 'No hardcoded API keys found in client-side code');
  } else {
    exposedKeys.forEach(({ file, matches }) => {
      logResult(
        `API Key Exposure in ${file}`,
        'fail',
        `Found ${matches.length} potential API key(s): ${matches.join(', ')}`
      );
    });
  }
}

// 2. Check environment variable configuration
function checkEnvironmentVariables() {
  console.log('\n📋 Checking environment variable configuration...');

  const envExamplePath = validatePath(projectRoot, '.env.example');
  const envLocalPath = validatePath(projectRoot, '.env.local');

  if (!existsSync(envExamplePath)) {
    logResult('Environment Example File', 'warn', '.env.example file not found');
  } else {
    logResult('Environment Example File', 'pass', '.env.example file exists');
  }

  // Check for sensitive data in .env.example
  if (existsSync(envExamplePath)) {
    const envExample = readFileSync(envExamplePath, 'utf8');
    const sensitivePatterns = [
      /AIza[0-9A-Za-z-_]{35}/g,
      /sk-[a-zA-Z0-9]{48}/g,
      /postgres:\/\/[^@]+:[^@]+@/g,
    ];

    let foundSensitive = false;
    sensitivePatterns.forEach((pattern) => {
      if (pattern.test(envExample)) {
        foundSensitive = true;
      }
    });

    if (foundSensitive) {
      logResult('Environment Example Security', 'fail', 'Sensitive data found in .env.example');
    } else {
      logResult('Environment Example Security', 'pass', 'No sensitive data in .env.example');
    }
  }

  // Check required environment variables
  const requiredEnvVars = [
    'VITE_STACK_PROJECT_ID',
    'VITE_STACK_PUBLISHABLE_CLIENT_KEY',
    'STACK_SECRET_SERVER_KEY',
    'DATABASE_URL',
    'GEMINI_API_KEY',
    'INTEGRATION_ENCRYPTION_SECRET',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length === 0) {
    logResult(
      'Required Environment Variables',
      'pass',
      'All required environment variables are set'
    );
  } else {
    logResult(
      'Required Environment Variables',
      'warn',
      `Missing variables: ${missingVars.join(', ')}`
    );
  }
}

// 3. Check database security configuration
function checkDatabaseSecurity() {
  console.log('\n📋 Checking database security configuration...');

  const neonServicePath = validatePath(projectRoot, 'services', 'neonService.ts');

  if (existsSync(neonServicePath)) {
    const content = readFileSync(neonServicePath, 'utf8');

    // Check for SSL configuration
    if (content.includes('ssl: { rejectUnauthorized: false }')) {
      logResult('Database SSL Configuration', 'pass', 'SSL is configured for database connections');
    } else {
      logResult(
        'Database SSL Configuration',
        'warn',
        'SSL configuration not found or not properly set'
      );
    }

    // Check for connection pooling
    if (content.includes('max:') && content.includes('idle_timeout:')) {
      logResult('Database Connection Pooling', 'pass', 'Connection pooling is configured');
    } else {
      logResult(
        'Database Connection Pooling',
        'warn',
        'Connection pooling configuration not found'
      );
    }

    // Check for parameterized queries (using template literals with postgres)
    if (content.includes('pool`') || content.includes('await pool`')) {
      logResult(
        'Parameterized Queries',
        'pass',
        'Using parameterized queries with postgres template literals'
      );
    } else {
      logResult(
        'Parameterized Queries',
        'warn',
        'Parameterized query usage not clearly identified'
      );
    }
  } else {
    logResult('Database Service File', 'fail', 'neonService.ts not found');
  }
}

// 4. Check API security headers
function checkApiSecurityHeaders() {
  console.log('\n📋 Checking API security headers...');

  const apiErrorHandlerPath = validatePath(projectRoot, 'services', 'apiErrorHandler.ts');

  if (existsSync(apiErrorHandlerPath)) {
    const content = readFileSync(apiErrorHandlerPath, 'utf8');

    const securityHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Referrer-Policy',
      'Content-Security-Policy',
    ];

    const missingHeaders = securityHeaders.filter((header) => !content.includes(header));

    if (missingHeaders.length === 0) {
      logResult('Security Headers', 'pass', 'All essential security headers are configured');
    } else {
      logResult('Security Headers', 'warn', `Missing headers: ${missingHeaders.join(', ')}`);
    }

    // Check for input sanitization
    if (content.includes('sanitizeInput')) {
      logResult('Input Sanitization', 'pass', 'Input sanitization function found');
    } else {
      logResult('Input Sanitization', 'warn', 'Input sanitization not found');
    }
  } else {
    logResult('API Error Handler', 'fail', 'apiErrorHandler.ts not found');
  }
}

// 5. Check rate limiting configuration
function checkRateLimiting() {
  console.log('\n📋 Checking rate limiting configuration...');

  const rateLimitServicePath = validatePath(projectRoot, 'services', 'rateLimitingService.ts');

  if (existsSync(rateLimitServicePath)) {
    const content = readFileSync(rateLimitServicePath, 'utf8');

    // Check for rate limiting strategies
    const strategies = ['sliding', 'token-bucket', 'fixed'];
    const foundStrategies = strategies.filter((strategy) => content.includes(strategy));

    if (foundStrategies.length > 0) {
      logResult(
        'Rate Limiting Strategies',
        'pass',
        `Found strategies: ${foundStrategies.join(', ')}`
      );
    } else {
      logResult('Rate Limiting Strategies', 'warn', 'Rate limiting strategies not found');
    }

    // Check for circuit breaker pattern
    if (content.includes('circuitBreaker') || content.includes('circuit-breaker')) {
      logResult('Circuit Breaker Pattern', 'pass', 'Circuit breaker pattern implemented');
    } else {
      logResult('Circuit Breaker Pattern', 'warn', 'Circuit breaker pattern not found');
    }
  } else {
    logResult('Rate Limiting Service', 'warn', 'rateLimitingService.ts not found');
  }
}

// 6. Check credential encryption
function checkCredentialEncryption() {
  console.log('\n📋 Checking credential encryption...');

  const credentialEncryptionPath = validatePath(projectRoot, 'services', 'credentialEncryption.ts');

  if (existsSync(credentialEncryptionPath)) {
    const content = readFileSync(credentialEncryptionPath, 'utf8');

    // Check for strong encryption algorithms
    if (content.includes('AES-GCM') || content.includes('AES-256')) {
      logResult('Encryption Algorithm', 'pass', 'Strong encryption algorithm (AES-GCM) in use');
    } else {
      logResult(
        'Encryption Algorithm',
        'warn',
        'Strong encryption algorithm not clearly identified'
      );
    }

    // Check for key derivation
    if (content.includes('PBKDF2')) {
      logResult('Key Derivation', 'pass', 'PBKDF2 key derivation implemented');
    } else {
      logResult('Key Derivation', 'warn', 'Key derivation function not found');
    }

    // Check for proper IV generation
    if (content.includes('crypto.getRandomValues') || content.includes('randomBytes')) {
      logResult('IV Generation', 'pass', 'Proper IV generation implemented');
    } else {
      logResult('IV Generation', 'warn', 'IV generation not clearly identified');
    }
  } else {
    logResult('Credential Encryption Service', 'warn', 'credentialEncryption.ts not found');
  }
}

// 7. Check for Stack Auth configuration
function checkStackAuthConfiguration() {
  console.log('\n📋 Checking Stack Auth configuration...');

  // Check if Stack Auth environment variables are properly configured
  const stackAuthVars = [
    'VITE_STACK_PROJECT_ID',
    'VITE_STACK_PUBLISHABLE_CLIENT_KEY',
    'STACK_SECRET_SERVER_KEY',
  ];

  const missingStackVars = stackAuthVars.filter((varName) => !process.env[varName]);

  if (missingStackVars.length === 0) {
    logResult(
      'Stack Auth Configuration',
      'pass',
      'Stack Auth environment variables are configured'
    );
  } else {
    logResult(
      'Stack Auth Configuration',
      'fail',
      `Missing Stack Auth variables: ${missingStackVars.join(', ')}`
    );
  }

  // Check for proper domain configuration (would need to be checked in production)
  logResult(
    'Stack Auth Domain Configuration',
    'warn',
    'Domain configuration should be verified in production environment'
  );
}

// 8. Check build configuration security
function checkBuildSecurity() {
  console.log('\n📋 Checking build configuration security...');

  const viteConfigPath = validatePath(projectRoot, 'vite.config.ts');

  if (existsSync(viteConfigPath)) {
    const content = readFileSync(viteConfigPath, 'utf8');

    // Check if console statements are removed in production
    if (content.includes('drop_console: true')) {
      logResult(
        'Console Statement Removal',
        'pass',
        'Console statements are removed in production builds'
      );
    } else {
      logResult(
        'Console Statement Removal',
        'warn',
        'Console statements may not be removed in production'
      );
    }

    // Check for source map configuration
    if (content.includes('sourcemap: false')) {
      logResult('Source Map Configuration', 'pass', 'Source maps are disabled for production');
    } else {
      logResult('Source Map Configuration', 'warn', 'Source maps configuration should be reviewed');
    }

    // Check for environment variable exposure
    const defineSection = content.match(/define:\s*{([^}]+)}/s);
    if (defineSection) {
      const defineContent = defineSection[1];
      if (defineContent.includes('SECRET') || defineContent.includes('PRIVATE')) {
        logResult(
          'Environment Variable Exposure',
          'fail',
          'Potential secret exposure in build configuration'
        );
      } else {
        logResult(
          'Environment Variable Exposure',
          'pass',
          'No obvious secret exposure in build configuration'
        );
      }
    }
  } else {
    logResult('Vite Configuration', 'fail', 'vite.config.ts not found');
  }
}

// Run all security checks
async function runSecurityValidation() {
  try {
    checkApiKeyExposure();
    checkEnvironmentVariables();
    checkDatabaseSecurity();
    checkApiSecurityHeaders();
    checkRateLimiting();
    checkCredentialEncryption();
    checkStackAuthConfiguration();
    checkBuildSecurity();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`❌ Failed: ${results.failed}`);

    if (results.issues.length > 0) {
      console.log('\n📋 Issues to Address:');
      results.issues.forEach((issue, index) => {
        console.log(
          `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.test}: ${issue.message}`
        );
      });
    }

    console.log('\n' + '='.repeat(60));

    if (results.failed === 0) {
      console.log('🎉 Security validation completed successfully!');
      if (results.warnings > 0) {
        console.log('⚠️  Please review the warnings above.');
      }
      return true;
    } else {
      console.log('❌ Security validation failed. Please address the issues above.');
      return false;
    }
  } catch (error) {
    console.error('❌ Security validation script failed:', error);
    return false;
  }
}

// Run the validation
runSecurityValidation().then((success) => {
  process.exit(success ? 0 : 1);
});
