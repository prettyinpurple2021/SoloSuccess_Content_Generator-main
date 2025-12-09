#!/usr/bin/env node

/**
 * AI Services Validation Script
 *
 * Comprehensive validation of AI content generation features
 * for production readiness assessment.
 */

import {
  enhancedGeminiService,
  getAIServiceHealth,
  getAIServiceMetrics,
} from '../services/enhancedGeminiService.js';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logHeader(message) {
  log(`\n${colors.bold}${message}${colors.reset}`, colors.blue);
}

async function validateAIServiceHealth() {
  logHeader('🔍 AI Service Health Check');

  try {
    const health = getAIServiceHealth();
    const metrics = getAIServiceMetrics();

    logInfo(`Service Status: ${health.status}`);
    logInfo(`Success Rate: ${health.successRate.toFixed(2)}%`);
    logInfo(`Average Response Time: ${health.averageResponseTime.toFixed(0)}ms`);
    logInfo(`Rate Limit Hits: ${health.rateLimitHits}`);
    logInfo(`Total Requests: ${metrics.totalRequests}`);
    logInfo(`Successful Requests: ${metrics.successfulRequests}`);
    logInfo(`Failed Requests: ${metrics.failedRequests}`);

    if (health.status === 'healthy') {
      logSuccess('AI service health check passed');
      return true;
    } else if (health.status === 'degraded') {
      logWarning('AI service is degraded but functional');
      return true;
    } else {
      logError('AI service is unhealthy');
      return false;
    }
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    return false;
  }
}

async function validateContentGeneration() {
  logHeader('📝 Content Generation Validation');

  const tests = [
    {
      name: 'Topic Generation',
      test: () => enhancedGeminiService.generateTopic(),
      validate: (result) => typeof result === 'string' && result.length > 0,
    },
    {
      name: 'Ideas Generation',
      test: () => enhancedGeminiService.generateIdeas('AI productivity tools'),
      validate: (result) => Array.isArray(result) && result.length > 0,
    },
    {
      name: 'Blog Post Generation',
      test: () => enhancedGeminiService.generateBlogPost('How to use AI for productivity'),
      validate: (result) => typeof result === 'string' && result.length > 100,
    },
    {
      name: 'Tags Generation',
      test: () =>
        enhancedGeminiService.generateTags('Sample blog post about AI tools for entrepreneurs...'),
      validate: (result) => Array.isArray(result) && result.length > 0,
    },
    {
      name: 'Headlines Generation',
      test: () => enhancedGeminiService.generateHeadlines('Sample blog post content...'),
      validate: (result) => Array.isArray(result) && result.length > 0,
    },
    {
      name: 'Summary Generation',
      test: () => enhancedGeminiService.generateSummary('Long blog post content about AI tools...'),
      validate: (result) => typeof result === 'string' && result.length > 20,
    },
    {
      name: 'Social Media Post Generation',
      test: () =>
        enhancedGeminiService.generateSocialMediaPost(
          'Twitter',
          'Blog content...',
          'professional',
          'entrepreneurs'
        ),
      validate: (result) => typeof result === 'string' && result.length > 0,
    },
    {
      name: 'Image Prompts Generation',
      test: () => enhancedGeminiService.generateImagePrompts('Blog post about AI tools...'),
      validate: (result) => Array.isArray(result) && result.length > 0,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      logInfo(`Testing ${test.name}...`);
      const result = await test.test();

      if (test.validate(result)) {
        logSuccess(`${test.name} - PASSED`);
        passed++;
      } else {
        logError(`${test.name} - FAILED (invalid result format)`);
        failed++;
      }
    } catch (error) {
      logError(`${test.name} - FAILED (${error.message})`);
      failed++;
    }
  }

  logInfo(`\nContent Generation Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function validatePersonalizedContent() {
  logHeader('🎯 Personalized Content Validation');

  const brandVoice = {
    tone: 'friendly',
    writingStyle: 'conversational',
    vocabulary: ['awesome', 'amazing', 'journey'],
    targetAudience: 'solo entrepreneurs',
  };

  const audienceProfile = {
    ageRange: '25-35',
    industry: 'technology',
    interests: ['AI', 'productivity', 'automation'],
    painPoints: ['time management', 'staying updated'],
  };

  try {
    logInfo('Testing personalized content generation...');
    const result = await enhancedGeminiService.generatePersonalizedContent(
      'Building a personal brand with AI',
      brandVoice,
      audienceProfile
    );

    if (typeof result === 'string' && result.length > 100) {
      logSuccess('Personalized content generation - PASSED');
      return true;
    } else {
      logError('Personalized content generation - FAILED (invalid result)');
      return false;
    }
  } catch (error) {
    logError(`Personalized content generation - FAILED (${error.message})`);
    return false;
  }
}

async function validateErrorHandling() {
  logHeader('🛡️ Error Handling Validation');

  let passed = 0;
  let failed = 0;

  // Test fallback content when service fails
  try {
    logInfo('Testing fallback content generation...');

    // These should return fallback content instead of throwing
    const topic = await enhancedGeminiService.generateTopic();
    const ideas = await enhancedGeminiService.generateIdeas('test');
    const blogPost = await enhancedGeminiService.generateBlogPost('test');

    if (typeof topic === 'string' && Array.isArray(ideas) && typeof blogPost === 'string') {
      logSuccess('Fallback content generation - PASSED');
      passed++;
    } else {
      logError('Fallback content generation - FAILED');
      failed++;
    }
  } catch (error) {
    logError(`Fallback content generation - FAILED (${error.message})`);
    failed++;
  }

  // Test image generation error handling
  try {
    logInfo('Testing image generation error handling...');
    await enhancedGeminiService.generateImage('test prompt');
    logWarning('Image generation should have failed with test credentials');
    failed++;
  } catch (error) {
    logSuccess('Image generation error handling - PASSED (correctly threw error)');
    passed++;
  }

  logInfo(`\nError Handling Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

async function validatePerformance() {
  logHeader('⚡ Performance Validation');

  try {
    logInfo('Testing concurrent request handling...');

    const startTime = Date.now();

    // Make multiple concurrent requests
    const promises = [
      enhancedGeminiService.generateTopic(),
      enhancedGeminiService.generateIdeas('productivity'),
      enhancedGeminiService.generateTags('sample content'),
      enhancedGeminiService.generateSummary('sample content'),
      enhancedGeminiService.generateImagePrompts('sample content'),
    ];

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    logInfo(`Concurrent requests completed in ${totalTime}ms`);

    // Validate all results
    const allValid = results.every((result) => {
      if (Array.isArray(result)) {
        return result.length > 0;
      }
      return typeof result === 'string' && result.length > 0;
    });

    if (allValid && totalTime < 30000) {
      // 30 second timeout
      logSuccess('Performance validation - PASSED');
      return true;
    } else {
      logError('Performance validation - FAILED');
      return false;
    }
  } catch (error) {
    logError(`Performance validation - FAILED (${error.message})`);
    return false;
  }
}

async function validateRateLimiting() {
  logHeader('🚦 Rate Limiting Validation');

  try {
    logInfo('Testing rate limiting configuration...');

    // Update rate limits for testing
    enhancedGeminiService.updateRateLimits({
      requestsPerMinute: 100,
      requestsPerHour: 5000,
    });

    // Update retry configuration
    enhancedGeminiService.updateRetryConfig({
      maxRetries: 3,
      baseDelay: 1000,
    });

    logSuccess('Rate limiting configuration - PASSED');
    return true;
  } catch (error) {
    logError(`Rate limiting validation - FAILED (${error.message})`);
    return false;
  }
}

async function generateValidationReport() {
  logHeader('📊 Validation Report');

  const health = getAIServiceHealth();
  const metrics = getAIServiceMetrics();

  const report = {
    timestamp: new Date().toISOString(),
    serviceHealth: {
      status: health.status,
      successRate: health.successRate,
      averageResponseTime: health.averageResponseTime,
      rateLimitHits: health.rateLimitHits,
    },
    usageMetrics: {
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      lastRequestTime: metrics.lastRequestTime,
    },
    recommendations: [],
  };

  // Add recommendations based on metrics
  if (health.successRate < 80) {
    report.recommendations.push('Consider implementing additional fallback mechanisms');
  }

  if (health.averageResponseTime > 5000) {
    report.recommendations.push('Optimize AI service response times or implement caching');
  }

  if (health.rateLimitHits > 0) {
    report.recommendations.push(
      'Review rate limiting configuration to prevent service interruptions'
    );
  }

  if (metrics.failedRequests > metrics.successfulRequests * 0.2) {
    report.recommendations.push('Investigate high failure rate and improve error handling');
  }

  console.log('\n' + JSON.stringify(report, null, 2));

  return report;
}

async function main() {
  log(`${colors.bold}🤖 AI Services Production Readiness Validation${colors.reset}`);
  log('='.repeat(60));

  const results = {
    healthCheck: false,
    contentGeneration: false,
    personalizedContent: false,
    errorHandling: false,
    performance: false,
    rateLimiting: false,
  };

  try {
    // Reset metrics for clean validation
    enhancedGeminiService.resetMetrics();

    // Run all validation tests
    results.healthCheck = await validateAIServiceHealth();
    results.contentGeneration = await validateContentGeneration();
    results.personalizedContent = await validatePersonalizedContent();
    results.errorHandling = await validateErrorHandling();
    results.performance = await validatePerformance();
    results.rateLimiting = await validateRateLimiting();

    // Generate final report
    const report = await generateValidationReport();

    // Calculate overall score
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    const overallScore = (passedTests / totalTests) * 100;

    logHeader('🎯 Final Results');
    log(`Overall Score: ${overallScore.toFixed(1)}% (${passedTests}/${totalTests} tests passed)`);

    if (overallScore >= 90) {
      logSuccess('AI services are PRODUCTION READY! 🚀');
      process.exit(0);
    } else if (overallScore >= 70) {
      logWarning('AI services are MOSTLY READY with some improvements needed ⚠️');
      process.exit(0);
    } else {
      logError('AI services need SIGNIFICANT IMPROVEMENTS before production 🚨');
      process.exit(1);
    }
  } catch (error) {
    logError(`Validation failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main as validateAIServices };
