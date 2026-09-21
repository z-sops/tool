import type { EntitlementCheckResult, EntitlementFeature, Plan } from './types';
import { getPlanConfig, isKnownFeature } from './config';

export interface CheckUsageInput {
  feature: string;
  plan: Plan;
  /** Usage count in the current daily window (default 0). */
  dailyUsed?: number;
  /** Usage count in the current monthly window (default 0). */
  monthlyUsed?: number;
}

/**
 * Pure entitlement check — no DB, no side effects. Server endpoints fetch the
 * usage numbers (from api_usage_log / entitlements tables) and pass them in,
 * keeping this function trivially testable.
 */
export function checkEntitlement(input: CheckUsageInput): EntitlementCheckResult {
  const { feature, plan, dailyUsed = 0, monthlyUsed = 0 } = input;

  const base: EntitlementCheckResult = {
    allowed: false,
    feature: isKnownFeature(feature) ? feature : feature as EntitlementFeature,
    plan,
    dailyQuota: null,
    monthlyQuota: null,
    dailyUsed,
    monthlyUsed,
  };

  if (!isKnownFeature(feature)) {
    return { ...base, reason: 'feature-disabled' };
  }

  const entitlement = getPlanConfig(plan)[feature];

  if (!entitlement.enabled) {
    return { ...base, dailyQuota: entitlement.dailyQuota, monthlyQuota: entitlement.monthlyQuota, reason: 'feature-disabled' };
  }

  if (entitlement.dailyQuota !== null && dailyUsed >= entitlement.dailyQuota) {
    return {
      ...base,
      dailyQuota: entitlement.dailyQuota,
      monthlyQuota: entitlement.monthlyQuota,
      reason: 'daily-quota-exceeded',
      resetsAt: nextUtcMidnight(),
    };
  }

  if (entitlement.monthlyQuota !== null && monthlyUsed >= entitlement.monthlyQuota) {
    return {
      ...base,
      dailyQuota: entitlement.dailyQuota,
      monthlyQuota: entitlement.monthlyQuota,
      reason: 'monthly-quota-exceeded',
      resetsAt: nextUtcMonthStart(),
    };
  }

  return {
    ...base,
    allowed: true,
    dailyQuota: entitlement.dailyQuota,
    monthlyQuota: entitlement.monthlyQuota,
  };
}

function nextUtcMidnight(): string {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return next.toISOString();
}

function nextUtcMonthStart(): string {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    1,
    0, 0, 0, 0
  ));
  return next.toISOString();
}
