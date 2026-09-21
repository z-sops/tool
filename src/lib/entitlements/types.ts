/**
 * Entitlement system types — infrastructure only.
 * No payment processing is connected in Phase 1; plans are a config model.
 */
export type Plan = 'free' | 'starter' | 'pro' | 'enterprise';

export type EntitlementFeature =
  // Existing tool areas
  | 'calculators'
  | 'ip-risk-check'
  | 'restriction-check'
  | 'listing-analyzer'
  | 'ai-listing-gen'
  | 'manual-data-entry'
  // Marketplace data features (future providers)
  | 'keyword-research'
  | 'competitor-intel'
  | 'bsr-tracking'
  | 'amazon-sp-api';

export interface FeatureEntitlement {
  feature: EntitlementFeature;
  /** Whether the plan may use the feature at all. */
  enabled: boolean;
  /** Max uses per window; null = unlimited. */
  dailyQuota: number | null;
  monthlyQuota: number | null;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  feature: EntitlementFeature;
  plan: Plan;
  reason?: 'feature-disabled' | 'daily-quota-exceeded' | 'monthly-quota-exceeded';
  dailyQuota: number | null;
  monthlyQuota: number | null;
  dailyUsed: number;
  monthlyUsed: number;
  /** When the relevant window resets (ISO), if a quota is enforced. */
  resetsAt?: string;
}
