import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext, requireWorkspaceAccess } from '../_lib/authorization';
import { getDb } from '../../src/server/db/client';
import { integrationConfigs, apiUsageLog } from '../../src/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { decryptCredentials } from '../_lib/encryption';
import { z } from 'zod';

const proxySchema = z.object({
  workspaceId: z.string().uuid(),
  provider: z.enum(['manual', 'openrouter', 'unavailable']),
  endpoint: z.string().min(1).max(200),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('POST'),
  body: z.record(z.unknown()).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`proxy:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'POST') {
    const startTime = Date.now();
    try {
      const parsed = proxySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
      }
      
      const { workspaceId, provider, endpoint, method, body } = parsed.data;
      
      await requireWorkspaceAccess(auth.userId, workspaceId);
      
      const db = getDb();
      const [config] = await db
        .select()
        .from(integrationConfigs)
        .where(and(
          eq(integrationConfigs.workspaceId, workspaceId),
          eq(integrationConfigs.provider, provider),
          eq(integrationConfigs.isActive, true)
        ))
        .limit(1);
      
      if (!config) {
        return res.status(404).json({ error: 'Integration not configured or inactive' });
      }
      
      if (provider === 'unavailable') {
        return res.status(503).json({ error: 'Provider unavailable', provider });
      }
      
      let credentials: Record<string, string> = {};
      if (config.encryptedCredentials) {
        credentials = decryptCredentials(config.encryptedCredentials);
      }
      
      let responseData: Record<string, unknown> | undefined;
      let status = 500;
      let errorMessage: string | undefined;
      let requestTokens = 0;
      let responseTokens = 0;
      
      try {
        if (provider === 'openrouter') {
          const apiKey = credentials.apiKey || process.env.OPENROUTER_API_KEY;
          if (!apiKey) {
            throw new Error('OpenRouter API key not configured');
          }
          
          const openRouterUrl = `https://openrouter.ai/api/v1/${endpoint}`;
          const response = await fetch(openRouterUrl, {
            method,
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.SITE_URL || 'https://listing.ai',
              'X-Title': 'NicheScout',
            },
            body: body ? JSON.stringify(body) : undefined,
          });
          
          responseData = await response.json() as Record<string, unknown>;
          status = response.status;
          
          const usage = responseData.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
          if (usage) {
            requestTokens = usage.prompt_tokens || 0;
            responseTokens = usage.completion_tokens || 0;
          }
        } else {
          return res.status(400).json({ error: 'Unsupported provider for proxy' });
        }
      } catch (fetchError) {
        errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
        status = 502;
      }
      
      const duration = Date.now() - startTime;
      
      await db.insert(apiUsageLog).values({
        userId: auth.userId,
        workspaceId,
        provider,
        endpoint,
        requestTokens,
        responseTokens,
        costUsd: null,
        status,
        errorMessage,
      });
      
      res.setHeader('X-Response-Time', `${duration}ms`);
      return res.status(status).json(responseData);
    } catch (error) {
      console.error('Proxy error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}