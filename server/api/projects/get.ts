import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext, requireProjectAccess } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { projects } from '../../../src/server/db/schema';
import { eq } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const projectId = req.query.id as string;
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID required' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`project:get:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'GET') {
    try {
      const project = await requireProjectAccess(auth.userId, projectId);
      return res.status(200).json({ project });
    } catch (error) {
      console.error('Get project error:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({ error: 'Project access denied' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}