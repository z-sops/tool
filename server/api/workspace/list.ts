import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { workspaces, workspaceMembers } from '../../../src/server/db/schema';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`workspace:list:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'GET') {
    try {
      const db = getDb();
      
      const ownedWorkspaces = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.ownerId, auth.userId));
      
      const memberships = await db
        .select({
          workspace: workspaces,
          role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, auth.userId));
      
      const ownedWorkspaceIds = new Set(ownedWorkspaces.map(w => w.id));
      const allWorkspaces = [
        ...ownedWorkspaces.map(w => ({ workspace: w, role: 'owner' as const })),
        ...memberships.filter(m => !ownedWorkspaceIds.has(m.workspace.id)),
      ];
      
      return res.status(200).json({ workspaces: allWorkspaces });
    } catch (error) {
      console.error('List workspaces error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}