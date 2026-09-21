import { describe, it, expect } from 'vitest';
import { checkEntitlement } from '../../src/lib/entitlements/check';
import { PLAN_CONFIG, isKnownFeature, getPlanConfig } from '../../src/lib/entitlements/config';

describe('entitlements config', () => {
  it('covers every plan and feature', () => {
    for (const plan of ['free', 'starter', 'pro', 'enterprise'] as const) {
      const config = PLAN_CONFIG[plan];
      expect(Object.keys(config).length).toBeGreaterThan(0);
      for (const [feature, ent] of Object.entries(config) as Array<[string, typeof config[keyof typeof config]]>) {
        expect(ent.feature).toBe(feature);
      }
    }
  });

  it('marks known features', () => {
    expect(isKnownFeature('calculators')).toBe(true);
    expect(isKnownFeature('amazon-sp-api')).toBe(true);
    expect(isKnownFeature('nope')).toBe(false);
  });

  it('disables marketplace-data features on free plan', () => {
    const free = getPlanConfig('free');
    expect(free['keyword-research'].enabled).toBe(false);
    expect(free['bsr-tracking'].enabled).toBe(false);
    expect(free['amazon-sp-api'].enabled).toBe(false);
  });
});

describe('checkEntitlement', () => {
  it('allows usage under quota', () => {
    const result = checkEntitlement({ feature: 'calculators', plan: 'free', dailyUsed: 3, monthlyUsed: 100 });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('blocks when daily quota exceeded', () => {
    const result = checkEntitlement({ feature: 'calculators', plan: 'free', dailyUsed: 25, monthlyUsed: 0 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('daily-quota-exceeded');
    expect(result.resetsAt).toBeDefined();
  });

  it('blocks when monthly quota exceeded', () => {
    const result = checkEntitlement({ feature: 'calculators', plan: 'free', dailyUsed: 1, monthlyUsed: 500 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('monthly-quota-exceeded');
  });

  it('blocks disabled features with feature-disabled reason', () => {
    const result = checkEntitlement({ feature: 'keyword-research', plan: 'free' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('feature-disabled');
  });

  it('blocks unknown features', () => {
    const result = checkEntitlement({ feature: 'made-up-feature', plan: 'pro' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('feature-disabled');
  });

  it('allows unlimited (null) quotas regardless of usage', () => {
    const result = checkEntitlement({ feature: 'manual-data-entry', plan: 'free', dailyUsed: 999999, monthlyUsed: 999999 });
    expect(result.allowed).toBe(true);
  });

  it('treats usage at quota-1 as still allowed', () => {
    const result = checkEntitlement({ feature: 'ai-listing-gen', plan: 'free', dailyUsed: 2, monthlyUsed: 0 });
    expect(result.allowed).toBe(true);
  });
});
