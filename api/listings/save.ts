import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext } from '../_lib/authorization';
import { getDb } from '../../src/server/db/client';
import { savedListings } from '../../src/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';

const saveListingSchema = z.object({
  productName: z.string().min(1).max(200),
  listing: z.object({
    title: z.string(),
    bulletPoints: z.array(z.string()),
    description: z.string(),
    searchTerms: z.array(z.string()),
  }),
  workspaceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  provider: z.enum(['manual', 'openrouter', 'unavailable']).default('manual'),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`listing:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'POST') {
    try {
      const parsed = saveListingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
      }
      
      const data = parsed.data;
      const db = getDb();
      
      if (data.workspaceId) {
        const { requireWorkspaceAccess } = await import('../_lib/authorization');
        await requireWorkspaceAccess(auth.userId, data.workspaceId);
      }
      
      if (data.projectId) {
        const { requireProjectAccess } = await import('../_lib/authorization');
        await requireProjectAccess(auth.userId, data.projectId);
      }
      
      const [listing] = await db.insert(savedListings).values({
        userId: auth.userId,
        workspaceId: data.workspaceId,
        projectId: data.projectId,
        productName: data.productName,
        listing: data.listing,
        provider: data.provider,
      }).returning();
      
      return res.status(201).json({ listing });
    } catch (error) {
      console.error('Save listing error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}