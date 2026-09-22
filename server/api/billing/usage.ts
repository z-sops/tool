import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext, requireWorkspaceAccess } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { apiUsageLog, integrationConfigs } from '../../../src/server/db/schema';
import { eq, and, desc, sum, count, gte, sql } from 'drizzle-orm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const workspaceId = req.query.workspaceId as string;
  if (!workspaceId) {
    return res.status(400).json({ error: 'workspaceId query parameter required' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`billing:usage:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'GET') {
    try {
      await requireWorkspaceAccess(auth.userId, workspaceId, ['owner', 'admin']);
      
      const db = getDb();
      const days = parseInt(req.query.days as string || '30', 10);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const usage = await db
        .select({
          provider: apiUsageLog.provider,
          totalRequests: count(),
          totalRequestTokens: sum(apiUsageLog.requestTokens),
          totalResponseTokens: sum(apiUsageLog.responseTokens),
          totalCostUsd: sum(apiUsageLog.costUsd),
          errorCount: sql<number>`count(*) filter (where ${apiUsageLog.status} >= 400)`.mapWith(Number),
        })
        .from(apiUsageLog)
        .where(and(
          eq(apiUsageLog.workspaceId, workspaceId),
          gte(apiUsageLog.createdAt, since)
        ))
        .groupBy(apiUsageLog.provider);
      
      const recentLogs = await db
        .select()
        .from(apiUsageLog)
        .where(and(
          eq(apiUsageLog.workspaceId, workspaceId),
          gte(apiUsageLog.createdAt, since)
        ))
        .orderBy(desc(apiUsageLog.createdAt))
        .limit(100);
      
      return res.status(200).json({ usage, recentLogs });
    } catch (error) {
      console.error('Get usage error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}