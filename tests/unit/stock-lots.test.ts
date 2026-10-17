import { describe, expect, it } from 'vitest';
import { matchBuyerDemand } from '../../src/lib/stock-lots/matching';
import { isTrustedMutationOrigin } from '../../server/api/stocklots/origin';
import { supplierInput, lotInput, buyerDemandInput, reviewInput, hasSellableStatus } from '../../src/lib/stock-lots/validation';

const workspaceId = '11111111-1111-4111-8111-111111111111';
const supplierId = '22222222-2222-4222-8222-222222222222';

describe('China stock-lot MVP input validation', () => {
  it('validates new suppliers', () => {
    expect(supplierInput.safeParse({ workspaceId, companyName: 'Yiwu Surplus Trading', city: 'Yiwu', province: 'Zhejiang' }).success).toBe(true);
    expect(supplierInput.safeParse({ workspaceId, companyName: '', city: 'Yiwu', province: 'Zhejiang' }).success).toBe(false);
  });
  const lot = { workspaceId, supplierId, productName: 'Stainless cutlery sets', category: 'Kitchenware', origin: 'factory_overstock', condition: 'new_sealed', quantity: 2400, minimumOrder: 500, unitPriceCnyMinor: 250, warehouseLocation: 'Yiwu, Zhejiang' };
  it('requires positive stock and MOQ no larger than quantity', () => {
    expect(lotInput.safeParse(lot).success).toBe(true);
    expect(lotInput.safeParse({ ...lot, minimumOrder: 3000 }).success).toBe(false);
    expect(lotInput.safeParse({ ...lot, quantity: 0 }).success).toBe(false);
    expect(lotInput.safeParse({ ...lot, origin: 'amazon_fba' }).success).toBe(false);
  });
  it('requires HTTPS evidence and forbids unexpected fields', () => {
    expect(lotInput.safeParse({ ...lot, evidenceUrls: ['http://example.com/box.jpg'] }).success).toBe(false);
    expect(lotInput.safeParse({ ...lot, amazonFee: 10 }).success).toBe(false);
  });
  it('requires a priced buyer requirement', () => {
    expect(buyerDemandInput.safeParse({ workspaceId, productName: 'Cutlery', category: 'Kitchenware', quantity: 1000, maxBudgetCnyMinor: 100000, destination: 'Karachi' }).success).toBe(true);
    expect(buyerDemandInput.safeParse({ workspaceId, productName: 'Cutlery', category: 'Kitchenware', quantity: 1000, maxBudgetCnyMinor: -1, destination: 'Karachi' }).success).toBe(false);
  });
  it('needs recorded evidence before document verification', () => {
    expect(reviewInput.safeParse({ workspaceId, lotId: supplierId, action: 'verify' }).success).toBe(false);
    expect(reviewInput.safeParse({ workspaceId, lotId: supplierId, action: 'verify', evidenceNote: 'License and stock images reviewed.' }).success).toBe(true);
  });
  it('never treats unverified inventory as publicly sellable', () => {
    expect(hasSellableStatus('unverified')).toBe(false);
    expect(hasSellableStatus('documents_checked')).toBe(false);
    expect(hasSellableStatus('published')).toBe(true);
  });
});

describe('lot availability and buyer matches', () => {
  const demand = { id: 'd1', workspaceId, status: 'open', category: 'Kitchenware', productName: 'Stainless steel cutlery', quantity: 1000, maxBudgetCnyMinor: 500000 };
  const original = { id: 'l1', workspaceId, status: 'published', category: 'Kitchenware', productName: 'Stainless steel cutlery sets', quantity: 2400, minimumOrder: 500, splitAllowed: false, unitPriceCnyMinor: 250 };
  it('never matches unverified or other workspace stock', () => {
    expect(matchBuyerDemand(demand, [{...original, status: 'unverified'}])).toEqual([]);
    expect(matchBuyerDemand(demand, [{...original, workspaceId: 'other'}])).toEqual([]);
  });
  it('does not silently split a full-only lot', () => {
    expect(matchBuyerDemand(demand, [original])).toEqual([]); // full lot costs 600000
    const results = matchBuyerDemand({...demand,maxBudgetCnyMinor:650000}, [original]);
    expect(results).toHaveLength(1);
    expect(results[0].units).toBe(2400);
    expect(results[0].fullLot).toBe(true);
  });
  it('supports explicitly permitted splits', () => {
    const results = matchBuyerDemand(demand, [{ ...original, splitAllowed: true }]);
    expect(results).toHaveLength(1);
    expect(results[0].units).toBe(1000);
    expect(results[0].totalPriceCnyMinor).toBe(250000);
    expect(matchBuyerDemand({...demand,quantity:400}, [{ ...original, splitAllowed: true }])).toEqual([]);
  });
  it('requires category, relevant terms and budget', () => {
    expect(matchBuyerDemand(demand, [{...original, splitAllowed: true, category:'Lighting'}])).toEqual([]);
    expect(matchBuyerDemand(demand, [{...original, splitAllowed: true, productName:'LED floodlights'}])).toEqual([]);
    expect(matchBuyerDemand({...demand,maxBudgetCnyMinor:200000}, [{...original, splitAllowed: true}])).toEqual([]);
  });
});
describe('same-origin mutation safety', () => {
  const req = (origin?:string,host='example.com',proto='https') => ({ headers: {origin,host,'x-forwarded-proto':proto} });
  it('allows same-origin writes', () => expect(isTrustedMutationOrigin(req('https://example.com'))).toBe(true));
  it('rejects foreign and missing origins', () => {
    expect(isTrustedMutationOrigin(req('https://evil.example'))).toBe(false);
    expect(isTrustedMutationOrigin(req())).toBe(false);
    expect(isTrustedMutationOrigin(req('http://example.com'))).toBe(false);
  });
});
