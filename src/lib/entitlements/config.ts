import type { EntitlementFeature, FeatureEntitlement, Plan } from './types';

/**
 * Central entitlement configuration — the single source of truth for plan
 * capabilities. Used by api/billing/*, the entitlement checker, and any
 * feature gating in the app.
 *
 * Phase 1: infrastructure only, no billing provider connected. Workspaces
 * are on 'free' until a real payment provider is integrated — do not pretend
 * users have paid plans.
 *
 * Quota semantics: null = unlimited for that window. enabled=false means the
 * plan may not use the feature at all.
 */
export const PLAN_CONFIG: Record<Plan, Record<EntitlementFeature, FeatureEntitlement>> = {
  free: {
    'calculators':        { feature: 'calculators',        enabled: true,  dailyQuota: 25,  monthlyQuota: 500 },
    'ip-risk-check':      { feature: 'ip-risk-check',      enabled: true,  dailyQuota: 10,  monthlyQuota: 100 },
    'restriction-check':  { feature: 'restriction-check',  enabled: true,  dailyQuota: 10,  monthlyQuota: 100 },
    'listing-analyzer':   { feature: 'listing-analyzer',   enabled: true,  dailyQuota: 5,   monthlyQuota: 50 },
    'ai-listing-gen':     { feature: 'ai-listing-gen',     enabled: true,  dailyQuota: 3,   monthlyQuota: 20 },
    'manual-data-entry':  { feature: 'manual-data-entry',  enabled: true,  dailyQuota: null, monthlyQuota: null },
    'keyword-research':   { feature: 'keyword-research',   enabled: false, dailyQuota: 0,   monthlyQuota: 0 },
    'competitor-intel':   { feature: 'competitor-intel',   enabled: false, dailyQuota: 0,   monthlyQuota: 0 },
    'bsr-tracking':       { feature: 'bsr-tracking',       enabled: false, dailyQuota: 0,   monthlyQuota: 0 },
    'amazon-sp-api':      { feature: 'amazon-sp-api',      enabled: false, dailyQuota: 0,   monthlyQuota: 0 },
  },
  starter: {
    'calculators':        { feature: 'calculators',        enabled: true,  dailyQuota: 100,  monthlyQuota: 2000 },
    'ip-risk-check':      { feature: 'ip-risk-check',      enabled: true,  dailyQuota: 50,   monthlyQuota: 1000 },
    'restriction-check':  { feature: 'restriction-check',  enabled: true,  dailyQuota: 50,   monthlyQuota: 1000 },
    'listing-analyzer':   { feature: 'listing-analyzer',   enabled: true,  dailyQuota: 25,   monthlyQuota: 500 },
    'ai-listing-gen':     { feature: 'ai-listing-gen',     enabled: true,  dailyQuota: 20,   monthlyQuota: 300 },
    'manual-data-entry':  { feature: 'manual-data-entry',  enabled: true,  dailyQuota: null, monthlyQuota: null },
    'keyword-research':   { feature: 'keyword-research',   enabled: false, dailyQuota: 0,    monthlyQuota: 0 },
    'competitor-intel':   { feature: 'competitor-intel',   enabled: false, dailyQuota: 0,    monthlyQuota: 0 },
    'bsr-tracking':       { feature: 'bsr-tracking',       enabled: false, dailyQuota: 0,    monthlyQuota: 0 },
    'amazon-sp-api':      { feature: 'amazon-sp-api',      enabled: false, dailyQuota: 0,    monthlyQuota: 0 },
  },
  pro: {
    'calculators':        { feature: 'calculators',        enabled: true,  dailyQuota: null, monthlyQuota: null },
    'ip-risk-check':      { feature: 'ip-risk-check',      enabled: true,  dailyQuota: 200,  monthlyQuota: 5000 },
    'restriction-check':  { feature: 'restriction-check',  enabled: true,  dailyQuota: 200,  monthlyQuota: 5000 },
    'listing-analyzer':   { feature: 'listing-analyzer',   enabled: true,  dailyQuota: 100,  monthlyQuota: 2000 },
    'ai-listing-gen':     { feature: 'ai-listing-gen',     enabled: true,  dailyQuota: 100,  monthlyQuota: 2000 },
    'manual-data-entry':  { feature: 'manual-data-entry',  enabled: true,  dailyQuota: null, monthlyQuota: null },
    'keyword-research':   { feature: 'keyword-research',   enabled: true,  dailyQuota: 50,   monthlyQuota: 1000 },
    'competitor-intel':   { feature: 'competitor-intel',   enabled: true,  dailyQuota: 50,   monthlyQuota: 1000 },
    'bsr-tracking':       { feature: 'bsr-tracking',       enabled: true,  dailyQuota: 100,  monthlyQuota: 2000 },
    'amazon-sp-api':      { feature: 'amazon-sp-api',      enabled: false, dailyQuota: 0,    monthlyQuota: 0 },
  },
  enterprise: {
    'calculators':        { feature: 'calculators',        enabled: true,  dailyQuota: null, monthlyQuota: null },
    'ip-risk-check':      { feature: 'ip-risk-check',      enabled: true,  dailyQuota: null, monthlyQuota: null },
    'restriction-check':  { feature: 'restriction-check',  enabled: true,  dailyQuota: null, monthlyQuota: null },
    'listing-analyzer':   { feature: 'listing-analyzer',   enabled: true,  dailyQuota: null, monthlyQuota: null },
    'ai-listing-gen':     { feature: 'ai-listing-gen',     enabled: true,  dailyQuota: null, monthlyQuota: null },
    'manual-data-entry':  { feature: 'manual-data-entry',  enabled: true,  dailyQuota: null, monthlyQuota: null },
    'keyword-research':   { feature: 'keyword-research',   enabled: true,  dailyQuota: null, monthlyQuota: null },
    'competitor-intel':   { feature: 'competitor-intel',   enabled: true,  dailyQuota: null, monthlyQuota: null },
    'bsr-tracking':       { feature: 'bsr-tracking',       enabled: true,  dailyQuota: null, monthlyQuota: null },
    'amazon-sp-api':      { feature: 'amazon-sp-api',      enabled: true,  dailyQuota: null, monthlyQuota: null },
  },
};

export const PLANS: Plan[] = ['free', 'starter', 'pro', 'enterprise'];

export function getPlanConfig(plan: Plan): Record<EntitlementFeature, FeatureEntitlement> {
  return PLAN_CONFIG[plan] ?? PLAN_CONFIG.free;
}

export function isKnownFeature(feature: string): feature is EntitlementFeature {
  return Object.prototype.hasOwnProperty.call(PLAN_CONFIG.free, feature);
}

/**
 * Usage counter keys used with api_usage_log / entitlements rows.
 * Kept here so billing endpoints and the checker agree on naming.
 */
export const ENTITLEMENT_USAGE_FEATURES: EntitlementFeature[] = [
  'calculators',
  'ip-risk-check',
  'restriction-check',
  'listing-analyzer',
  'ai-listing-gen',
  'keyword-research',
  'competitor-intel',
  'bsr-tracking',
];
