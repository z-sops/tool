import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  'https://listing.ai',
  'https://www.listing.ai',
  'http://localhost:5173',
  'http://localhost:3000',
];

export function getCorsHeaders(origin: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
  
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else if (!origin) {
    headers['Access-Control-Allow-Origin'] = ALLOWED_ORIGINS[0];
  }
  
  return headers;
}

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  const headers = getCorsHeaders(origin);
  
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  
  return false;
}

export function setCorsHeaders(res: VercelResponse, origin?: string): void {
  const headers = getCorsHeaders(origin);
  Object.entries(headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}