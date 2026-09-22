import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { apiRateLimiter } from '../_lib/rate-limit';
import { getAuthContext, requireWorkspaceAccess } from '../_lib/authorization';
import { getDb } from '../../../src/server/db/client';
import { entitlements, workspaces } from '../../../src/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { PLAN_CONFIG, isKnownFeature, PLANS } from '../../../src/lib/entitlements';
import type { Plan, EntitlementFeature } from '../../../src/lib/entitlements';

const updateEntitlementSchema = z.object({
  workspaceId: z.string().uuid(),
  feature: z.string().min(1).max(100),
  limit: z.number().int().min(0).optional(),
  used: z.number().int().min(0).optional(),
});

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
  const rateLimit = await apiRateLimiter(`entitlements:${auth.userId}:${ip}`);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
  
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: 'Too many requests', retryAfter: rateLimit.retryAfterMs });
  }
  
  if (req.method === 'GET') {
    try {
      await requireWorkspaceAccess(auth.userId, workspaceId);
      
      const db = getDb();
      const [workspace] = await db.select({ plan: workspaces.plan }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
      
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found' });
      }
      
      const plan = (PLANS.includes(workspace.plan as Plan) ? workspace.plan : 'free') as Plan;
      const currentEntitlements = await db.select().from(entitlements).where(eq(entitlements.workspaceId, workspaceId));
      
      const entitlementMap = new Map(currentEntitlements.map(e => [e.feature, e]));
      
      const planConfig = PLAN_CONFIG[plan];
      const result = (Object.keys(planConfig) as EntitlementFeature[]).map((feature) => {
        const planFeature = planConfig[feature];
        const current = entitlementMap.get(feature);
        // DB row override only applies when a limit was explicitly set.
        const effectiveLimit = current?.limit ?? planFeature.monthlyQuota;
        return {
          feature,
          enabled: planFeature.enabled,
          limit: effectiveLimit,
          used: current?.used ?? 0,
          remaining: effectiveLimit === null ? null : Math.max(0, effectiveLimit - (current?.used ?? 0)),
          planMonthlyQuota: planFeature.monthlyQuota,
          planDailyQuota: planFeature.dailyQuota,
        };
      });
      
      return res.status(200).json({ entitlements: result, plan });
    } catch (error) {
      console.error('Get entitlements error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  if (req.method === 'POST') {
    try {
      await requireWorkspaceAccess(auth.userId, workspaceId, ['owner', 'admin']);
      
      const parsed = updateEntitlementSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
      }
      
      const { feature, limit, used } = parsed.data;
      if (!isKnownFeature(feature)) {
        return res.status(400).json({ error: `Unknown feature: ${feature}` });
      }
      const db = getDb();
      
      const [entitlement] = await db
        .insert(entitlements)
        .values({
          workspaceId,
          feature,
          limit,
          used: used ?? 0,
        })
        .onConflictDoUpdate({
          target: [entitlements.workspaceId, entitlements.feature],
          set: {
            limit: limit ?? undefined,
            used: used ?? undefined,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      return res.status(200).json({ entitlement });
    } catch (error) {
      console.error('Update entitlement error:', error);
      if (error instanceof Error && error.message.includes('permissions')) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}