import { z } from 'zod';

// Phase-one China-only inventory: never represent an uninspected item as verified.
export const supplierInput = z.object({
  workspaceId: z.string().uuid(),
  companyName: z.string().trim().min(2).max(180),
  city: z.string().trim().min(2).max(100),
  province: z.string().trim().min(2).max(100),
  contactName: z.string().trim().max(120).optional(),
  contactDetails: z.string().trim().max(250).optional(),
  licenseNumber: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(3000).optional(),
}).strict();

export const lotOrigins = ['factory_overstock', 'cancelled_order', 'export_leftover', 'discontinued', 'wholesale_clearance'] as const;
export const lotConditions = ['new_sealed', 'new_open_box', 'mixed_new', 'unknown'] as const;
export const lotInput = z.object({
  workspaceId: z.string().uuid(),
  supplierId: z.string().uuid(),
  productName: z.string().trim().min(3).max(180),
  category: z.string().trim().min(2).max(100),
  origin: z.enum(lotOrigins),
  condition: z.enum(lotConditions),
  quantity: z.number().int().positive().max(100000000),
  minimumOrder: z.number().int().positive().max(100000000),
  splitAllowed: z.boolean().default(false),
  unitPriceCnyMinor: z.number().int().min(0).max(2147483647),
  warehouseLocation: z.string().trim().min(2).max(250),
  evidenceUrls: z.array(z.string().url().max(1000).refine(s => s.startsWith('https://'), 'HTTPS only')).max(10).default([]),
  notes: z.string().trim().max(3000).optional(),
}).strict().refine(data => data.minimumOrder <= data.quantity, {
  path: ['minimumOrder'], message: 'Minimum order cannot exceed stock quantity',
});

export const buyerDemandInput = z.object({
  workspaceId: z.string().uuid(),
  productName: z.string().trim().min(3).max(180),
  category: z.string().trim().min(2).max(100),
  quantity: z.number().int().positive().max(100000000),
  maxBudgetCnyMinor: z.number().int().positive().max(2147483647),
  destination: z.string().trim().min(2).max(150),
  buyerName: z.string().trim().max(120).optional(),
  buyerContact: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(3000).optional(),
}).strict();

export const reviewInput = z.object({
  workspaceId: z.string().uuid(),
  lotId: z.string().uuid(),
  action: z.enum(['verify', 'publish', 'withdraw']),
  evidenceNote: z.string().trim().max(2000).optional(),
}).strict().superRefine((v, ctx) => {
  if (v.action === 'verify' && (!v.evidenceNote || v.evidenceNote.length < 15)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['evidenceNote'], message: 'Document verification evidence (15+ chars) required' });
  }
});

export function hasSellableStatus(status: string): boolean {
  return status === 'published';
}
