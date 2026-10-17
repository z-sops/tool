/**
 * Deterministic pilot matching. No AI-generated prices, no assumption that a
 * supplier allows splitting, and no claims about delivered/import landed cost.
 */
export type LotForMatch = {
  id: string; workspaceId: string; status: string; category: string;
  productName: string; quantity: number; minimumOrder: number;
  splitAllowed: boolean; unitPriceCnyMinor: number;
  condition?: string;
};
export type DemandForMatch = {
  id: string; workspaceId: string; status: string; category: string;
  productName: string; quantity: number; maxBudgetCnyMinor: number;
};
export type LotMatch = {
  lotId: string; demandId: string; units: number; fullLot: boolean;
  totalPriceCnyMinor: number; score: number; notes: string[];
};
const stopwords = new Set(['the', 'for', 'and', 'of', 'lot', 'stock', 'wholesale', 'bulk', 'new', 'product', 'set', 'sets']);
const normalized = (x: string) => x.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
function tokens(x: string): string[] {
  return [...new Set(normalized(x).split(/[^\p{L}\p{N}]+/u).map(v => v.length > 3 && v.endsWith('s') ? v.slice(0, -1) : v).filter(v => v.length > 1 && !stopwords.has(v)))];
}
export function matchBuyerDemand(demand: DemandForMatch, lots: readonly LotForMatch[]): LotMatch[] {
  if (demand.status !== 'open') return [];
  const wanted = tokens(demand.productName);
  if (!wanted.length) return [];
  const candidates: LotMatch[] = [];
  for (const lot of lots) {
    if (lot.workspaceId !== demand.workspaceId || lot.status !== 'published') continue;
    if (normalized(lot.category) !== normalized(demand.category)) continue;
    const offered = new Set(tokens(lot.productName));
    const shared = wanted.filter(t => offered.has(t)).length;
    if (shared < Math.max(1, Math.ceil(wanted.length / 2))) continue;
    if (lot.quantity < demand.quantity || demand.quantity <= 0) continue;
    if (lot.splitAllowed && demand.quantity < lot.minimumOrder) continue;
    const units = lot.splitAllowed ? demand.quantity : lot.quantity;
    if (!Number.isSafeInteger(lot.unitPriceCnyMinor) || lot.unitPriceCnyMinor < 0) continue;
    const total = BigInt(lot.unitPriceCnyMinor) * BigInt(units);
    if (total > BigInt(demand.maxBudgetCnyMinor) || total > BigInt(Number.MAX_SAFE_INTEGER)) continue;
    const notes = [lot.splitAllowed ? 'Supplier permits split orders (reconfirm)' : 'Complete lot purchase required'];
    if (lot.condition === 'unknown') notes.push('Product condition not confirmed');
    notes.push('Excludes inspection, shipping, import duties and taxes');
    candidates.push({
      lotId: lot.id, demandId: demand.id, units,
      fullLot: !lot.splitAllowed, totalPriceCnyMinor: Number(total),
      score: Math.round((shared / wanted.length) * 70 + (1 - Number(total) / demand.maxBudgetCnyMinor) * 30),
      notes,
    });
  }
  return candidates.sort((a,b) => b.score-a.score || a.totalPriceCnyMinor-b.totalPriceCnyMinor || a.lotId.localeCompare(b.lotId)).slice(0, 25);
}
