import type { ServerProvider, UnavailableResult } from './types';
import { unavailable } from './types';

/**
 * Generic unavailable provider — returns structured "unavailable" responses
 * with NO fabricated data. Used for any provider slug that has no real
 * implementation yet (keyword, bsr, trademark, shopify, etsy) and as the
 * base state for amazon-sp-api until real credentials exist.
 *
 * GUARDRAIL: never returns numbers that look like real marketplace data.
 */
export class UnavailableProvider implements ServerProvider {
  readonly name = 'unavailable' as const;
  readonly isLive = false;
  readonly methodology = 'estimated' as const;

  constructor(
    private readonly reason: UnavailableResult['reason'] = 'not-implemented',
    private readonly message = 'This provider is not yet implemented. No data is available.'
  ) {}

  checkAvailability(): UnavailableResult | null {
    return unavailable(this.name, this.reason, this.message);
  }
}

/**
 * Amazon SP-API adapter — FUTURE-READY ONLY.
 *
 * DO NOT fabricate BSR, sales, sales rank, competitor counts, keyword volume,
 * demand, catalog data, or account restrictions from here. Until a real
 * Amazon developer account with SP-API credentials (LWA client id/secret +
 * refresh token) is configured and approved, this adapter reports itself
 * unavailable with reason 'requires-approval'.
 */
export class AmazonSPAdapter implements ServerProvider {
  readonly name = 'amazon-sp-api' as const;
  readonly isLive = false;
  readonly methodology = 'api-live' as const; // would be api-live IF it ever ran

  checkAvailability(credentials?: Record<string, string>): UnavailableResult | null {
    const required: Array<[string, string | undefined]> = [
      ['clientId', credentials?.clientId],
      ['clientSecret', credentials?.clientSecret],
      ['refreshToken', credentials?.refreshToken],
      ['region', credentials?.region],
    ];
    const missing = required.filter(([, v]) => !v).map(([k]) => k);

    if (missing.length > 0) {
      return unavailable(
        'amazon-sp-api',
        'requires-approval',
        `Amazon SP-API requires an approved developer account. Missing credentials: ${missing.join(', ')}. No Amazon data (BSR, sales, demand, restrictions) is available until access is granted.`
      );
    }

    // Even with credential-shaped input present, no live SP-API call path is
    // implemented in Phase 1 — refuse rather than fabricate.
    return unavailable(
      'amazon-sp-api',
      'not-implemented',
      'Amazon SP-API adapter is registered but no live call path is implemented yet. No Amazon data will be returned.'
    );
  }
}

export const unavailableProvider = new UnavailableProvider();
export const amazonSPAdapter = new AmazonSPAdapter();
