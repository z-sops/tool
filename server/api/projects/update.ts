import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext, requireProjectWorkspaceAccess } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { projects } from '../../../src/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

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
  const rateLimit = await apiRateLimiter(`project:update:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'PATCH') {
    try {
      await requireProjectWorkspaceAccess(auth.userId, projectId, ['owner', 'admin']);
      
      const parsed = updateProjectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
      }
      
      const { name, description, data } = parsed.data;
      const db = getDb();
      
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (name) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (data !== undefined) updateData.data = data;
      
      const [project] = await db
        .update(projects)
        .set(updateData)
        .where(eq(projects.id, projectId))
        .returning();
      
      return res.status(200).json({ project });
    } catch (error) {
      console.error('Update project error:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  if (req.method === 'DELETE') {
    try {
      await requireProjectWorkspaceAccess(auth.userId, projectId, ['owner', 'admin']);
      
      const db = getDb();
      await db.delete(projects).where(eq(projects.id, projectId));
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete project error:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}