import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { savedListings } from '../../../src/server/db/schema';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const listingId = req.query.id as string;
  if (!listingId) {
    return res.status(400).json({ error: 'Listing ID required' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`listing:delete:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'DELETE') {
    try {
      const db = getDb();
      const [listing] = await db
        .select()
        .from(savedListings)
        .where(and(
          eq(savedListings.id, listingId),
          eq(savedListings.userId, auth.userId)
        ))
        .limit(1);
      
      if (!listing) {
        return res.status(404).json({ error: 'Listing not found' });
      }
      
      await db.delete(savedListings).where(eq(savedListings.id, listingId));
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete listing error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}