import { describe, it, expect } from 'vitest';
import { getProviderConfig, getAllProviders, isProviderAvailable, validateProviderCredentials, createProviderResponse, CURRENT_PROVIDERS, FUTURE_PROVIDERS } from '../../src/lib/integrations/registry';
import { integrationClient } from '../../src/lib/integrations/client';
import { ManualProvider } from '../../src/lib/integrations/providers/manual';
import { OpenRouterProvider } from '../../src/lib/integrations/providers/openrouter';
import { UnavailableProvider, AmazonSPAdapter } from '../../src/lib/integrations/providers/unavailable';
import { isUnavailableResult } from '../../src/lib/integrations/providers/types';

describe('registry', () => {
  it('has configs for all providers', () => {
    const all = getAllProviders();
    const names = all.map(p => p.name);
    for (const expected of ['manual', 'openrouter', 'unavailable', 'keyword', 'bsr', 'trademark', 'shopify', 'etsy', 'amazon-sp-api']) {
      expect(names).toContain(expected);
    }
  });

  it('keeps manual and openrouter current; marketplace data future', () => {
    expect(CURRENT_PROVIDERS).toContain('manual');
    expect(CURRENT_PROVIDERS).toContain('openrouter');
    expect(FUTURE_PROVIDERS).toContain('amazon-sp-api');
    expect(FUTURE_PROVIDERS).toContain('keyword');
  });

  it('validates required credentials', () => {
    expect(validateProviderCredentials('openrouter', { apiKey: 'sk-or-test' })).toBe(true);
    expect(validateProviderCredentials('openrouter', {})).toBe(false);
    expect(validateProviderCredentials('manual', {})).toBe(true);
  });

  it('marks unavailable as not available', () => {
    expect(isProviderAvailable('unavailable')).toBe(false);
    expect(isProviderAvailable('manual')).toBe(true);
  });

  it('createProviderResponse stamps attribution fields', () => {
    const resp = createProviderResponse({ ok: 1 }, 'manual', 'user-input', 50);
    expect(resp.methodology).toBe('user-input');
    expect(resp.provider).toBe('manual');
    expect(resp.confidence).toBe(50);
    expect(resp.fetchedAt).toBeTruthy();
  });

  it('getProviderConfig returns requested config', () => {
    expect(getProviderConfig('manual').name).toBe('manual');
  });
});

describe('providers', () => {
  it('manual provider is always available with user-input methodology', () => {
    const p = new ManualProvider();
    expect(p.checkAvailability()).toBeNull();
    expect(p.methodology).toBe('user-input');
    expect(p.isLive).toBe(true);
  });

  it('openrouter provider reports missing credentials structurally', () => {
    const p = new OpenRouterProvider();
    const prev = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    const result = p.checkAvailability();
    expect(isUnavailableResult(result)).toBe(true);
    if (isUnavailableResult(result)) {
      expect(result.reason).toBe('credentials-missing');
    }

    // With credentials present it is available.
    expect(p.checkAvailability({ apiKey: 'sk-or-test' })).toBeNull();
    expect(p.checkAvailability({})).not.toBeNull(); // env still unset

    if (prev !== undefined) process.env.OPENROUTER_API_KEY = prev;
  });

  it('openrouter provider uses api-live methodology (only for real calls)', () => {
    const p = new OpenRouterProvider();
    expect(p.methodology).toBe('api-live');
  });

  it('unavailable provider returns structured result, never data', () => {
    const p = new UnavailableProvider();
    const result = p.checkAvailability();
    expect(result).not.toBeNull();
    expect(isUnavailableResult(result)).toBe(true);
    if (isUnavailableResult(result)) {
      expect(result.available).toBe(false);
      expect(result.reason).toBe('not-implemented');
    }
    expect(p.isLive).toBe(false);
  });

  it('amazon SP adapter reports requires-approval without credentials', () => {
    const a = new AmazonSPAdapter();
    const result = a.checkAvailability();
    expect(isUnavailableResult(result)).toBe(true);
    if (isUnavailableResult(result)) {
      expect(result.reason).toBe('requires-approval');
      expect(result.message).toContain('No Amazon data');
    }
    expect(a.isLive).toBe(false);
  });

  it('amazon SP adapter still refuses even with credential-shaped input', () => {
    const a = new AmazonSPAdapter();
    const result = a.checkAvailability({
      clientId: 'x', clientSecret: 'y', refreshToken: 'z', region: 'us-east-1',
    });
    expect(isUnavailableResult(result)).toBe(true);
    if (isUnavailableResult(result)) {
      expect(result.reason).toBe('not-implemented');
    }
  });
});

describe('integrationClient', () => {
  it('checks availability for known providers', () => {
    expect(integrationClient.checkProviderAvailability('manual')).toBeNull();
    expect(integrationClient.checkProviderAvailability('keyword')).not.toBeNull();
    const amazon = integrationClient.checkProviderAvailability('amazon-sp-api');
    expect(isUnavailableResult(amazon)).toBe(true);
  });

  it('manual generation is attributed user-input', async () => {
    const resp = await integrationClient.generateListing(
      {
        productName: 'Test Bottle',
        category: 'Kitchen',
        keyFeatures: ['insulated', 'BPA-free'],
        targetAudience: 'athletes',
        tone: 'professional',
        platform: 'amazon',
      },
      'manual'
    );
    expect(resp.methodology).toBe('user-input');
    expect(resp.provider).toBe('manual');
    expect(resp.data.title).toContain('Test Bottle');
  });
});
