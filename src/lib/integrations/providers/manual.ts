import type { ServerProvider, UnavailableResult } from './types';

/**
 * Manual provider — accepts user-provided data as-is.
 *
 * GUARDRAIL: data produced through this provider must ALWAYS be attributed
 * methodology = 'user-input'. It must never be marked 'api-live' because no
 * external API was contacted and nothing was verified.
 */
export class ManualProvider implements ServerProvider {
  readonly name = 'manual' as const;
  readonly isLive = true;
  readonly methodology = 'user-input' as const;

  checkAvailability(): UnavailableResult | null {
    // Manual entry requires no credentials and is always available.
    return null;
  }
}

export const manualProvider = new ManualProvider();
