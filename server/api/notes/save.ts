import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext, requireWorkspaceAccess } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { researchNotes } from '../../../src/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const saveNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  tags: z.array(z.string()).default([]),
  workspaceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
});

const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`notes:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'POST') {
    try {
      const parsed = saveNoteSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
      }
      
      const { title, content, tags, workspaceId, projectId } = parsed.data;
      const db = getDb();
      
      if (workspaceId) {
        await requireWorkspaceAccess(auth.userId, workspaceId);
      }
      
      if (projectId) {
        const { requireProjectAccess } = await import('../_lib/authorization');
        await requireProjectAccess(auth.userId, projectId);
      }
      
      const [note] = await db.insert(researchNotes).values({
        userId: auth.userId,
        workspaceId,
        projectId,
        title,
        content,
        tags,
      }).returning();
      
      return res.status(201).json({ note });
    } catch (error) {
      console.error('Save note error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  if (req.method === 'GET') {
    try {
      const workspaceId = req.query.workspaceId as string | undefined;
      const projectId = req.query.projectId as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string || '50', 10), 100);
      const offset = parseInt(req.query.offset as string || '0', 10);
      
      if (workspaceId) {
        await requireWorkspaceAccess(auth.userId, workspaceId);
      }
      
      if (projectId) {
        const { requireProjectAccess } = await import('../_lib/authorization');
        await requireProjectAccess(auth.userId, projectId);
      }
      
      const db = getDb();
      const conditions = [eq(researchNotes.userId, auth.userId)];
      
      if (workspaceId) conditions.push(eq(researchNotes.workspaceId, workspaceId));
      if (projectId) conditions.push(eq(researchNotes.projectId, projectId));
      
      const notes = await db
        .select()
        .from(researchNotes)
        .where(and(...conditions))
        .orderBy(desc(researchNotes.updatedAt))
        .limit(limit)
        .offset(offset);
      
      return res.status(200).json({ notes });
    } catch (error) {
      console.error('List notes error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}