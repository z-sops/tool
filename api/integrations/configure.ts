import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext, requireWorkspaceAccess } from '../_lib/authorization';
import { getDb } from '../../src/server/db/client';
import { integrationConfigs } from '../../src/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const configureIntegrationSchema = z.object({
  workspaceId: z.string().uuid(),
  provider: z.enum(['manual', 'openrouter', 'unavailable']),
  config: z.record(z.unknown()),
  credentials: z.record(z.string()).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  
  const auth = await getAuthContext(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const ip = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';
  const rateLimit = await apiRateLimiter(`integration:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'GET') {
    try {
      const workspaceId = req.query.workspaceId as string;
      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId query parameter required' });
      }
      
      await requireWorkspaceAccess(auth.userId, workspaceId);
      
      const db = getDb();
      const configs = await db
        .select()
        .from(integrationConfigs)
        .where(eq(integrationConfigs.workspaceId, workspaceId));
      
      const sanitized = configs.map(c => ({
        ...c,
        encryptedCredentials: c.encryptedCredentials ? '[REDACTED]' : null,
      }));
      
      return res.status(200).json({ integrations: sanitized });
    } catch (error) {
      console.error('Get integrations error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const parsed = configureIntegrationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
      }
      
      const { workspaceId, provider, config, credentials } = parsed.data;
      
      await requireWorkspaceAccess(auth.userId, workspaceId, ['owner', 'admin']);
      
      const db = getDb();
      const { encryptCredentials } = await import('../_lib/encryption');
      
      const encryptedCredentials = credentials ? encryptCredentials(credentials) : null;
      
      const [integration] = await db
        .insert(integrationConfigs)
        .values({
          workspaceId,
          provider,
          config,
          encryptedCredentials,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [integrationConfigs.workspaceId, integrationConfigs.provider],
          set: {
            config,
            encryptedCredentials,
            isActive: true,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      return res.status(200).json({ 
        integration: {
          ...integration,
          encryptedCredentials: integration.encryptedCredentials ? '[REDACTED]' : null,
        },
      });
    } catch (error) {
      console.error('Configure integration error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}