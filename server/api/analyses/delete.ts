import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { savedAnalyses } from '../../../src/server/db/schema';
import { eq, and } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const analysisId = req.query.id as string;
  if (!analysisId) {
    return res.status(400).json({ error: 'Analysis ID required' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`analysis:delete:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'DELETE') {
    try {
      const db = getDb();
      const [analysis] = await db
        .select()
        .from(savedAnalyses)
        .where(and(
          eq(savedAnalyses.id, analysisId),
          eq(savedAnalyses.userId, auth.userId)
        ))
        .limit(1);
      
      if (!analysis) {
        return res.status(404).json({ error: 'Analysis not found' });
      }
      
      await db.delete(savedAnalyses).where(eq(savedAnalyses.id, analysisId));
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Delete analysis error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}