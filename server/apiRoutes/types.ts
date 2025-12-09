import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface ApiRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface ApiResponse {
  status: (code: number) => ApiResponse;
  json: (data: unknown) => void;
  end: () => void;
  setHeader: (name: string, value: string) => void;
}

export function adaptRequest(req: VercelRequest): ApiRequest {
  return {
    method: req.method,
    query: (req.query ?? {}) as Record<string, string | string[] | undefined>,
    body: req.body,
    headers: (req.headers ?? {}) as Record<string, string | string[] | undefined>,
  };
}

export function createApiResponse(res: VercelResponse): ApiResponse {
  const apiResponse: ApiResponse = {
    status: (code: number) => {
      res.status(code);
      return apiResponse;
    },
    json: (data: unknown) => {
      res.json(data);
    },
    end: () => {
      res.end();
    },
    setHeader: (name: string, value: string) => {
      res.setHeader(name, value);
    },
  };

  return apiResponse;
}
