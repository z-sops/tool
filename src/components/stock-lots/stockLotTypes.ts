export type Supplier = {
  id: string; workspaceId: string; companyName: string; city: string; province: string;
  contactName?: string | null; contactDetails?: string | null; licenseNumber?: string | null;
  status: string; notes?: string | null; createdAt: string;
};
export type Lot = {
  id: string; workspaceId: string; supplierId: string;
  productName: string; category: string; origin: string; condition: string;
  quantity: number; minimumOrder: number; splitAllowed: boolean; unitPriceCnyMinor: number;
  warehouseLocation: string; evidenceUrls: string[]; notes?: string | null;
  status: string; verifiedAt?: string | null; createdAt: string;
};
export type Demand = {
  id: string; workspaceId: string; productName: string; category: string;
  quantity: number; maxBudgetCnyMinor: number; destination: string;
  buyerName?: string | null; buyerContact?: string | null; status: string; createdAt: string;
};
export type BuyerMatch = { demandId: string; lotId: string; units: number; score: number;
  fullLot: boolean; totalPriceCnyMinor: number; notes: string[] };
export type WorkspaceEntry = { workspace: { id: string; name: string }; role: 'owner' | 'admin' | 'member' };
export type FormSection = 'suppliers' | 'lots' | 'demands';
export type View = 'overview' | 'lots' | 'suppliers' | 'buyers' | 'matches';
export function formatCny(minor: number): string {
  return '¥' + new Intl.NumberFormat('en-US',{maximumFractionDigits:2,minimumFractionDigits:2}).format((minor || 0)/100);
}
export function formatInteger(n: number): string {
  return new Intl.NumberFormat('en-US').format(n || 0);
}
export function friendlyDate(date: string): string {
  const x = new Date(date);
  return Number.isNaN(x.getTime()) ? 'Date unavailable' : x.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
}
export function readableStatus(status: string): string {
  return ({ unverified:'Unverified',documents_checked:'Documents checked',published:'Published',withdrawn:'Withdrawn',open:'Open' } as Record<string,string>)[status] || status;
}
export function quoteCsv(value: unknown): string {
  const raw = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
  const safe = /^\s*[=+@\-\t\r]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g,'""') + '"';
}
