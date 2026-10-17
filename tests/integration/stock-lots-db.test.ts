import { createHash } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { eq } from 'drizzle-orm';
import { getDb, closePool } from '../../src/server/db/client';
import {
  users, sessions, workspaces, workspaceMembers, inventoryLots, lotReviewEvents,
} from '../../src/server/db/schema';
import stockLotsHandler from '../../server/api/stocklots/index';

const db = getDb();
const ORIGIN = 'http://localhost:3000';
const TOKENS = { owner: 'integration-owner-token', outsider: 'integration-outsider-token', member: 'integration-member-token' };
let workspaceA: string;
let workspaceB: string;
let supplierId = '';
let supplierBId = '';
let lotId = '';
let demandId = '';
let ownerId = '';

type Result = { status: number; body: any; headers: Record<string, string> };

async function invoke(method: 'GET' | 'POST', params: Record<string, string>, body?: unknown, token?: string, origin: string | undefined = ORIGIN): Promise<Result> {
  const result: Result = { status: 200, body: null, headers: {} };
  const request = {
    method, query: params, body,
    headers: { host: 'localhost:3000', ...(origin ? { origin } : {}), 'x-forwarded-proto': 'http', ...(token ? { cookie: 'ns_session=' + token } : {}) },
  } as unknown as VercelRequest;
  const response = {
    setHeader(name: string, value: string) { result.headers[name] = value; return this; },
    status(code: number) { result.status = code; return this; },
    json(value: unknown) { result.body = value; return this; },
    end() { return this; },
  } as unknown as VercelResponse;
  await stockLotsHandler(request, response);
  return result;
}
const post = (action: string, body: unknown, token = TOKENS.owner, origin: string | undefined = ORIGIN) =>
  invoke('POST', { action }, body, token, origin);
const get = (type: string, workspaceId: string, token = TOKENS.owner) =>
  invoke('GET', { type, workspaceId }, undefined, token);

beforeAll(async () => {
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.includes('localhost')) {
    throw new Error('Integration tests only run against disposable local PostgreSQL service');
  }
  const [owner] = await db.insert(users).values({ email: 'stock-owner@example.invalid', passwordHash: 'integration-only' }).returning();
  const [member] = await db.insert(users).values({ email: 'stock-member@example.invalid', passwordHash: 'integration-only' }).returning();
  const [outsider] = await db.insert(users).values({ email: 'stock-outsider@example.invalid', passwordHash: 'integration-only' }).returning();
  ownerId = owner.id;
  const [a] = await db.insert(workspaces).values({ name: 'China stocklots A', slug: 'lot-test-a', ownerId }).returning();
  const [b] = await db.insert(workspaces).values({ name: 'China stocklots B', slug: 'lot-test-b', ownerId }).returning();
  workspaceA = a.id; workspaceB = b.id;
  await db.insert(workspaceMembers).values([
    { workspaceId: a.id, userId: owner.id, role: 'owner' },
    { workspaceId: b.id, userId: owner.id, role: 'owner' },
    { workspaceId: a.id, userId: member.id, role: 'member' },
  ]);
  await db.insert(sessions).values([
    { userId: owner.id, tokenHash: createHash('sha256').update(TOKENS.owner).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000) },
    { userId: outsider.id, tokenHash: createHash('sha256').update(TOKENS.outsider).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000) },
    { userId: member.id, tokenHash: createHash('sha256').update(TOKENS.member).digest('hex'), expiresAt: new Date(Date.now() + 3_600_000) },
  ]);
});
afterAll(async () => { await closePool(); });

describe('real PostgreSQL stock-lot workflow', () => {
  it('rejects unauthenticated reads, foreign tenants and forged POST Origin', async () => {
    expect((await invoke('GET', { workspaceId: workspaceA, type: 'suppliers' })).status).toBe(401);
    expect((await get('suppliers', workspaceA, TOKENS.outsider)).status).toBe(403);
    const supplied = { workspaceId: workspaceA, companyName: 'Yiwu Factory', city: 'Yiwu', province: 'Zhejiang' };
    expect((await post('supplier', supplied, TOKENS.owner, 'https://bad.example')).status).toBe(403);
    expect((await post('supplier', supplied, TOKENS.owner, '')).status).toBe(403);
  });

  it('creates suppliers and isolates foreign supplier references', async () => {
    const a = await post('supplier', {
      workspaceId: workspaceA, companyName: 'Yiwu Lot Factory', city: 'Yiwu', province: 'Zhejiang',
      contactDetails: 'Business contact', licenseNumber: 'TEST-NOT-REAL',
    });
    expect(a.status).toBe(201); supplierId = a.body.item.id;
    const b = await post('supplier', { workspaceId: workspaceB, companyName: 'Guangzhou Wholesaler', city: 'Guangzhou', province: 'Guangdong' });
    expect(b.status).toBe(201); supplierBId = b.body.item.id;
    const listing = await get('suppliers', workspaceA);
    expect(listing.status).toBe(200);
    expect(listing.body.items.map((s: { id: string }) => s.id)).toContain(supplierId);
    expect(listing.body.items.map((s: { id: string }) => s.id)).not.toContain(supplierBId);
    const crossLot = await post('lot', {
      workspaceId: workspaceA, supplierId: supplierBId, productName: 'Steel cutlery sets',
      category: 'Kitchenware', origin: 'factory_overstock', condition: 'new_sealed',
      quantity: 2400, minimumOrder: 500, unitPriceCnyMinor: 250,
      warehouseLocation: 'Guangzhou', evidenceUrls: ['https://example.com/test-image.jpg'],
    });
    expect(crossLot.status).toBe(400);
  });

  it('creates an unverified lot and buyer demand, but does not match early', async () => {
    const lot = await post('lot', {
      workspaceId: workspaceA, supplierId, productName: 'Stainless steel cutlery sets',
      category: 'Kitchenware', origin: 'factory_overstock', condition: 'new_sealed',
      quantity: 2400, minimumOrder: 500, splitAllowed: true,
      unitPriceCnyMinor: 250, warehouseLocation: 'Yiwu, Zhejiang',
      evidenceUrls: ['https://example.com/test-image.jpg'],
    });
    expect(lot.status).toBe(201); lotId = lot.body.item.id;
    expect(lot.body.item.status).toBe('unverified');
    const demand = await post('demand', {
      workspaceId: workspaceA, productName: 'Stainless steel cutlery',
      category: 'Kitchenware', quantity: 1000, maxBudgetCnyMinor: 500000,
      destination: 'Karachi, Pakistan',
    });
    expect(demand.status).toBe(201); demandId = demand.body.item.id;
    const matched = await get('matches', workspaceA);
    expect(matched.status).toBe(200);
    expect(matched.body.items).toEqual([]);
  });

  it('prevents a normal member reviewing a lot or publishing without documents', async () => {
    expect((await post('review', { workspaceId: workspaceA, lotId, action: 'verify', evidenceNote: 'Documents inspected by team member' }, TOKENS.member)).status).toBe(403);
    expect((await post('review', { workspaceId: workspaceA, lotId, action: 'publish' })).status).toBe(409);
  });

  it('records an audited document review, then publishes and matches', async () => {
    const verified = await post('review', { workspaceId: workspaceA, lotId, action: 'verify', evidenceNote: 'Reviewed supplier identity and dated stock images.' });
    expect(verified.status).toBe(200);
    expect(verified.body.item.status).toBe('documents_checked');
    expect((await get('matches', workspaceA)).body.items).toEqual([]);
    expect((await post('review', { workspaceId: workspaceA, lotId, action: 'verify', evidenceNote: 'Duplicate review forbidden by state' })).status).toBe(409);
    const published = await post('review', { workspaceId: workspaceA, lotId, action: 'publish' });
    expect(published.status).toBe(200);
    expect(published.body.item.status).toBe('published');
    const matches = await get('matches', workspaceA);
    expect(matches.status).toBe(200);
    expect(matches.body.items).toEqual([expect.objectContaining({ lotId, demandId, units: 1000, totalPriceCnyMinor: 250000 })]);
    const events = await db.select().from(lotReviewEvents).where(eq(lotReviewEvents.lotId, lotId));
    expect(events.map(x => x.nextStatus)).toEqual(expect.arrayContaining(['documents_checked', 'published']));
    expect(events).toHaveLength(2);
    expect(events.every(x => x.reviewerId === ownerId)).toBe(true);
  });

  it('withdraws the lot and eliminates recommendations without deleting evidence', async () => {
    const removed = await post('review', { workspaceId: workspaceA, lotId, action: 'withdraw' });
    expect(removed.status).toBe(200);
    expect(removed.body.item.status).toBe('withdrawn');
    expect((await get('matches', workspaceA)).body.items).toEqual([]);
    expect((await post('review', { workspaceId: workspaceA, lotId, action: 'withdraw' })).status).toBe(409);
    const [lot] = await db.select().from(inventoryLots).where(eq(inventoryLots.id, lotId));
    expect(lot.verificationNote).toContain('Reviewed supplier identity');
    expect((await db.select().from(lotReviewEvents).where(eq(lotReviewEvents.lotId, lotId)))).toHaveLength(3);
  });
});
