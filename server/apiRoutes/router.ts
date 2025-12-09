import type { VercelRequest, VercelResponse } from '@vercel/node';
import { adaptRequest, createApiResponse } from './types';
import analyticsHandler from './analytics/index';
import audienceProfilesHandler from './audience-profiles/index';
import brandVoicesHandler from './brand-voices/index';
import campaignsHandler from './campaigns/index';
import contentSeriesHandler from './content-series/index';
import imageStylesHandler from './image-styles/index';
import postsHandler from './posts/index';
import templatesHandler from './templates/index';
import templateDetailHandler from './templates/[id]';
import healthHandler from './health/index';
import healthDatabaseHandler from './health/database';
import monitoringDashboardHandler from './monitoring/dashboard';
import monitoringMetricsHandler from './monitoring/metrics';
import monitoringUptimeHandler from './monitoring/uptime';
import performanceDatabaseHandler from './performance/database';
import performanceFrontendHandler from './performance/frontend';
import integrationsHandler from './integrations/index';
import integrationDetailHandler from './integrations/[id]';

type HandlerFunction = (
  req: ReturnType<typeof adaptRequest>,
  res: ReturnType<typeof createApiResponse>
) => Promise<void>;

interface RouteDefinition {
  segments: RouteSegment[];
  handler: HandlerFunction;
}

type RouteSegment = { type: 'literal'; value: string } | { type: 'param'; name: string };

const routes: RouteDefinition[] = [
  route('analytics', analyticsHandler),
  route('audience-profiles', audienceProfilesHandler),
  route('brand-voices', brandVoicesHandler),
  route('campaigns', campaignsHandler),
  route('content-series', contentSeriesHandler),
  route('image-styles', imageStylesHandler),
  route('posts', postsHandler),
  route('templates', templatesHandler),
  route('templates/:id', templateDetailHandler),
  route('health', healthHandler),
  route('health/database', healthDatabaseHandler),
  route('monitoring/dashboard', monitoringDashboardHandler),
  route('monitoring/metrics', monitoringMetricsHandler),
  route('monitoring/uptime', monitoringUptimeHandler),
  route('performance/database', performanceDatabaseHandler),
  route('performance/frontend', performanceFrontendHandler),
  route('integrations', integrationsHandler),
  route('integrations/:id', integrationDetailHandler),
];

function route(path: string, handler: HandlerFunction): RouteDefinition {
  const segments = path
    .split('/')
    .filter(Boolean)
    .map<RouteSegment>((segment) =>
      segment.startsWith(':')
        ? { type: 'param', name: segment.slice(1) }
        : { type: 'literal', value: segment }
    );

  return { segments, handler };
}

export async function routeRequest(req: VercelRequest, res: VercelResponse) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathSegments = url.pathname
    .replace(/^\/api\/?/, '')
    .split('/')
    .filter(Boolean);

  for (const route of routes) {
    const params = matchRoute(route.segments, pathSegments);
    if (!params) {
      continue;
    }

    const apiReq = adaptRequest(req);
    apiReq.query = { ...apiReq.query, ...params };
    const apiRes = createApiResponse(res);

    await route.handler(apiReq, apiRes);
    return;
  }

  res.status(404).json({ error: 'Not Found' });
}

function matchRoute(
  routeSegments: RouteSegment[],
  pathSegments: string[]
): Record<string, string> | null {
  if (routeSegments.length !== pathSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < routeSegments.length; i += 1) {
    const routeSegment = routeSegments[i];
    const pathSegment = pathSegments[i];

    if (!routeSegment || !pathSegment) {
      return null;
    }

    if (routeSegment.type === 'literal') {
      if (routeSegment.value !== pathSegment) {
        return null;
      }
    } else if (routeSegment.type === 'param') {
      params[routeSegment.name] = pathSegment;
    }
  }

  return params;
}
