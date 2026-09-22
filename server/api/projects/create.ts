import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext, requireWorkspaceAccess } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { projects } from '../../../src/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  workspaceId: z.string().uuid(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`project:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'POST') {
    try {
      const parsed = createProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
      }
      
      const { name, description, workspaceId } = parsed.data;
      
      await requireWorkspaceAccess(auth.userId, workspaceId, ['owner', 'admin', 'member']);
      
      const db = getDb();
      const [project] = await db.insert(projects).values({
        workspaceId,
        name,
        description,
      }).returning();
      
      return res.status(201).json({ project });
    } catch (error) {
      console.error('Create project error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient workspace permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}