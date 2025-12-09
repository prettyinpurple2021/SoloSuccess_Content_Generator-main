import type { ApiRequest, ApiResponse } from '../types';
/**
 * Production Health Check Endpoint
 *
 * This endpoint provides comprehensive health status for the application,
 * including database connectivity, AI services, and integration services.
 */

// Generic types for serverless function

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: HealthCheck[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

// Track application start time for uptime calculation
const startTime = Date.now();

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    // Set CORS headers for health check access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const checks: HealthCheck[] = [];

    // 1. Database Health Check
    const dbCheck = await checkDatabaseHealth();
    checks.push(dbCheck);

    // 2. AI Services Health Check
    const aiCheck = await checkAIServicesHealth();
    checks.push(aiCheck);

    // 3. Authentication Service Health Check
    const authCheck = await checkAuthenticationHealth();
    checks.push(authCheck);

    // 4. Integration Services Health Check
    const integrationCheck = await checkIntegrationServicesHealth();
    checks.push(integrationCheck);

    // 5. Environment Configuration Check
    const envCheck = checkEnvironmentConfiguration();
    checks.push(envCheck);

    // Calculate summary
    const summary = {
      total: checks.length,
      healthy: checks.filter((c) => c.status === 'healthy').length,
      unhealthy: checks.filter((c) => c.status === 'unhealthy').length,
      degraded: checks.filter((c) => c.status === 'degraded').length,
    };

    // Determine overall status
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - startTime,
      environment: process.env.NODE_ENV || 'development',
      checks,
      summary,
    };

    // Set appropriate HTTP status code
    const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    // Log error using error handler instead of console
    const { errorHandler } = await import('../../../services/errorHandlingService');
    errorHandler.logError(
      'Health check error',
      error instanceof Error ? error : new Error(String(error)),
      { endpoint: '/api/health', operation: 'health_check' },
      'error'
    );

    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Date.now() - startTime,
      environment: process.env.NODE_ENV || 'development',
      checks: [
        {
          service: 'health-check',
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      ],
      summary: {
        total: 1,
        healthy: 0,
        unhealthy: 1,
        degraded: 0,
      },
    };

    res.status(503).json(errorResponse);
  }
}

async function checkDatabaseHealth(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Import database service dynamically to avoid issues
    const neonService = await import('../../../services/neonService');

    await neonService.testConnection();

    return {
      service: 'database',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: {
        provider: 'neon-postgresql',
        ssl: true,
      },
    };
  } catch (error) {
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

async function checkAIServicesHealth(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY) {
      return {
        service: 'ai-services',
        status: 'degraded',
        responseTime: Date.now() - start,
        error: 'Gemini API key not configured',
      };
    }

    // Simple test to verify AI service is accessible
    // We don't make an actual API call to avoid costs and rate limits
    return {
      service: 'ai-services',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: {
        provider: 'google-gemini',
        configured: true,
      },
    };
  } catch (error) {
    return {
      service: 'ai-services',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'AI services check failed',
    };
  }
}

async function checkAuthenticationHealth(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Check if Stack Auth is properly configured
    const requiredEnvVars = [
      'VITE_STACK_PROJECT_ID',
      'VITE_STACK_PUBLISHABLE_CLIENT_KEY',
      'STACK_SECRET_SERVER_KEY',
    ];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      return {
        service: 'authentication',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: `Missing environment variables: ${missingVars.join(', ')}`,
      };
    }

    return {
      service: 'authentication',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: {
        provider: 'stack-auth',
        configured: true,
      },
    };
  } catch (error) {
    return {
      service: 'authentication',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Authentication check failed',
    };
  }
}

async function checkIntegrationServicesHealth(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Check if integration encryption secret is configured
    if (!process.env.INTEGRATION_ENCRYPTION_SECRET) {
      return {
        service: 'integrations',
        status: 'degraded',
        responseTime: Date.now() - start,
        error: 'Integration encryption secret not configured',
      };
    }

    // Check encryption secret length
    if (process.env.INTEGRATION_ENCRYPTION_SECRET.length < 32) {
      return {
        service: 'integrations',
        status: 'degraded',
        responseTime: Date.now() - start,
        error: 'Integration encryption secret is too short',
      };
    }

    // Count configured social media integrations
    const socialMediaKeys = [
      'TWITTER_API_KEY',
      'LINKEDIN_CLIENT_ID',
      'FACEBOOK_APP_ID',
      'REDDIT_CLIENT_ID',
      'PINTEREST_APP_ID',
    ];

    const configuredIntegrations = socialMediaKeys.filter((key) => process.env[key]);

    return {
      service: 'integrations',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: {
        encryptionConfigured: true,
        socialMediaIntegrations: configuredIntegrations.length,
        availableIntegrations: socialMediaKeys.length,
      },
    };
  } catch (error) {
    return {
      service: 'integrations',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Integration services check failed',
    };
  }
}

function checkEnvironmentConfiguration(): HealthCheck {
  const start = Date.now();

  try {
    const requiredEnvVars = [
      'VITE_STACK_PROJECT_ID',
      'VITE_STACK_PUBLISHABLE_CLIENT_KEY',
      'STACK_SECRET_SERVER_KEY',
      'DATABASE_URL',
      'GEMINI_API_KEY',
      'INTEGRATION_ENCRYPTION_SECRET',
    ];

    const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
    const configuredVars = requiredEnvVars.length - missingVars.length;

    if (missingVars.length > 0) {
      return {
        service: 'environment',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        error: `Missing required environment variables: ${missingVars.join(', ')}`,
        details: {
          configured: configuredVars,
          required: requiredEnvVars.length,
          missing: missingVars,
        },
      };
    }

    return {
      service: 'environment',
      status: 'healthy',
      responseTime: Date.now() - start,
      details: {
        configured: configuredVars,
        required: requiredEnvVars.length,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      },
    };
  } catch (error) {
    return {
      service: 'environment',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Environment configuration check failed',
    };
  }
}
