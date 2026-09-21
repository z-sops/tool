import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext, requireWorkspaceOwnership } from '../_lib/authorization';
import { getDb } from '../../src/server/db/client';
import { workspaces } from '../../src/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const workspaceId = req.query.id as string;
  if (!workspaceId) {
    return res.status(400).json({ error: 'Workspace ID required' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`workspace:update:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'PATCH') {
    try {
      await requireWorkspaceOwnership(auth.userId, workspaceId);
      
      const parsed = updateWorkspaceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
      }
      
      const { name, slug } = parsed.data;
      const db = getDb();
      
      if (slug) {
        const [existing] = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
        if (existing && existing.id !== workspaceId) {
          return res.status(409).json({ error: 'Slug already taken' });
        }
      }
      
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (name) updateData.name = name;
      if (slug) updateData.slug = slug;
      
      const [workspace] = await db
        .update(workspaces)
        .set(updateData)
        .where(eq(workspaces.id, workspaceId))
        .returning();
      
      return res.status(200).json({ workspace });
    } catch (error) {
      console.error('Update workspace error:', error);
      if (error instanceof Error && error.message.includes('not found or access denied')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  if (req.method === 'DELETE') {
    try {
      await requireWorkspaceOwnership(auth.userId, workspaceId);
      
      const db = getDb();
      await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete workspace error:', error);
      if (error instanceof Error && error.message.includes('not found or access denied')) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}