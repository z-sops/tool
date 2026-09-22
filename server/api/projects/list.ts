import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext, requireWorkspaceAccess } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { projects } from '../../../src/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const workspaceId = req.query.workspaceId as string;
  if (!workspaceId) {
    return res.status(400).json({ error: 'workspaceId query parameter required' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`project:list:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'GET') {
    try {
      await requireWorkspaceAccess(auth.userId, workspaceId, ['owner', 'admin', 'member']);
      
      const db = getDb();
      const projectList = await db
        .select()
        .from(projects)
        .where(eq(projects.workspaceId, workspaceId))
        .orderBy(desc(projects.createdAt));
      
      return res.status(200).json({ projects: projectList });
    } catch (error) {
      console.error('List projects error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient workspace permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}