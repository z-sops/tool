import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { savedListings } from '../../../src/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const workspaceId = req.query.workspaceId as string | undefined;
  const projectId = req.query.projectId as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
  const offset = parseInt(req.query.offset as string || '0', 10);
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`listing:list:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'GET') {
    try {
      if (workspaceId) {
        const { requireWorkspaceAccess } = await import('../_lib/authorization');
        await requireWorkspaceAccess(auth.userId, workspaceId);
      }
      
      if (projectId) {
        const { requireProjectAccess } = await import('../_lib/authorization');
        await requireProjectAccess(auth.userId, projectId);
      }
      
      const db = getDb();
      const conditions = [eq(savedListings.userId, auth.userId)];
      
      if (workspaceId) conditions.push(eq(savedListings.workspaceId, workspaceId));
      if (projectId) conditions.push(eq(savedListings.projectId, projectId));
      
      const listings = await db
        .select()
        .from(savedListings)
        .where(and(...conditions))
        .orderBy(desc(savedListings.createdAt))
        .limit(limit)
        .offset(offset);
      
      return res.status(200).json({ listings });
    } catch (error) {
      console.error('List listings error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}