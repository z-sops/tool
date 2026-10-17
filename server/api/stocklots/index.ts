import type { VercelRequest, VercelResponse } from '@vercel/node';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '../../../src/server/db/client';
import { lotSuppliers, inventoryLots, buyerDemands } from '../../../src/server/db/schema';
import { supplierInput, lotInput, buyerDemandInput, reviewInput } from '../../../src/lib/stock-lots/validation';
import { getAuthContext, requireWorkspaceAccess } from '../_lib/authorization';
import { apiRateLimiter } from '../_lib/rate-limit';
import { handleCors, setCorsHeaders } from '../_lib/cors';
import { z } from 'zod';

const queryInput = z.object({
  workspaceId: z.string().uuid(),
  type: z.enum(['suppliers', 'lots', 'demands']),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res, req.headers.origin);
  const auth = await getAuthContext(req);
  if (!auth) return res.status(401).json({ error: 'Unauthorized' });
  const limit = await apiRateLimiter('stocklots:' + auth.userId);
  if (!limit.allowed) return res.status(429).json({ error: 'Too many requests' });
  const db = getDb();
  try {
    if (req.method === 'GET') {
      const input = queryInput.safeParse(req.query);
      if (!input.success) return res.status(400).json({ error: 'Invalid query' });
      const { workspaceId, type } = input.data;
      await requireWorkspaceAccess(auth.userId, workspaceId);
      if (type === 'suppliers') {
        const suppliers = await db.select().from(lotSuppliers)
          .where(eq(lotSuppliers.workspaceId, workspaceId))
          .orderBy(desc(lotSuppliers.createdAt)).limit(200);
        return res.status(200).json({ items: suppliers });
      }
      if (type === 'lots') {
        const lots = await db.select().from(inventoryLots)
          .where(eq(inventoryLots.workspaceId, workspaceId))
          .orderBy(desc(inventoryLots.createdAt)).limit(200);
        return res.status(200).json({ items: lots });
      }
      const demands = await db.select().from(buyerDemands)
        .where(eq(buyerDemands.workspaceId, workspaceId))
        .orderBy(desc(buyerDemands.createdAt)).limit(200);
      return res.status(200).json({ items: demands });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const action = req.query.action;
    if (action === 'supplier') {
      const parsed = supplierInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid supplier', details: parsed.error.flatten() });
      await requireWorkspaceAccess(auth.userId, parsed.data.workspaceId);
      const [item] = await db.insert(lotSuppliers).values({ ...parsed.data, createdBy: auth.userId }).returning();
      return res.status(201).json({ item });
    }
    if (action === 'lot') {
      const parsed = lotInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid lot', details: parsed.error.flatten() });
      const { workspaceId, supplierId } = parsed.data;
      await requireWorkspaceAccess(auth.userId, workspaceId);
      const [supplier] = await db.select({ id: lotSuppliers.id }).from(lotSuppliers)
        .where(and(eq(lotSuppliers.id, supplierId), eq(lotSuppliers.workspaceId, workspaceId))).limit(1);
      if (!supplier) return res.status(400).json({ error: 'Supplier not in this workspace' });
      const [item] = await db.insert(inventoryLots).values({ ...parsed.data, createdBy: auth.userId }).returning();
      return res.status(201).json({ item });
    }
    if (action === 'demand') {
      const parsed = buyerDemandInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid buyer demand', details: parsed.error.flatten() });
      await requireWorkspaceAccess(auth.userId, parsed.data.workspaceId);
      const [item] = await db.insert(buyerDemands).values({ ...parsed.data, createdBy: auth.userId }).returning();
      return res.status(201).json({ item });
    }
    if (action === 'review') {
      const parsed = reviewInput.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Invalid review', details: parsed.error.flatten() });
      const { workspaceId, lotId, action: decision, evidenceNote } = parsed.data;
      await requireWorkspaceAccess(auth.userId, workspaceId, ['owner', 'admin']);
      const [current] = await db.select().from(inventoryLots)
        .where(and(eq(inventoryLots.id, lotId), eq(inventoryLots.workspaceId, workspaceId))).limit(1);
      if (!current) return res.status(404).json({ error: 'Lot not found' });
      if (decision === 'verify' && current.status !== 'unverified') {
        return res.status(409).json({ error: 'Only unverified lots can be reviewed' });
      }
      if (decision === 'publish' && current.status !== 'documents_checked') {
        return res.status(409).json({ error: 'Document review required before publication' });
      }
      if (decision === 'publish' && !current.verifiedAt) {
        return res.status(409).json({ error: 'Document review timestamp missing' });
      }
      if (decision === 'publish' && current.evidenceUrls.length === 0) {
        return res.status(409).json({ error: 'At least one evidence URL required before publication' });
      }
      if (decision === 'withdraw' && current.status === 'withdrawn') {
        return res.status(409).json({ error: 'Already withdrawn' });
      }
      const status = decision === 'verify' ? 'documents_checked' : decision === 'publish' ? 'published' : 'withdrawn';
      const [item] = await db.update(inventoryLots).set({
        status,
        updatedAt: new Date(),
        ...(decision === 'verify' ? { verifiedAt: new Date(), verificationNote: evidenceNote } : {}),
      }).where(and(eq(inventoryLots.id, lotId), eq(inventoryLots.workspaceId, workspaceId))).returning();
      return res.status(200).json({ item });
    }
    return res.status(404).json({ error: 'Unknown action' });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('permissions') || error.message.includes('access denied'))) {
      return res.status(403).json({ error: 'Insufficient workspace permissions' });
    }
    console.error('Stock-lot API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
