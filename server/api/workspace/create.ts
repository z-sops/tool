import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { workspaces, workspaceMembers } from '../../../src/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { z } from 'zod';

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`workspace:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'POST') {
    try {
      const parsed = createWorkspaceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
      }
      
      const { name, slug } = parsed.data;
      const db = getDb();
      
      const [existing] = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
      if (existing) {
        return res.status(409).json({ error: 'Slug already taken' });
      }
      
      const [workspace] = await db.insert(workspaces).values({
        name,
        slug,
        ownerId: auth.userId,
      }).returning();
      
      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: auth.userId,
        role: 'owner',
      });
      
      return res.status(201).json({ workspace });
    } catch (error) {
      console.error('Create workspace error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}