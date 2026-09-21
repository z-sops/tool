import type { Provider, Methodology, ProviderResponse } from '../types';

/**
 * Result returned when a provider cannot serve a request.
 * Carries NO fabricated data — only a machine-readable reason.
 */
export interface UnavailableResult {
  available: false;
  provider: Provider;
  reason: 'not-configured' | 'credentials-missing' | 'not-implemented' | 'requires-approval' | 'disabled';
  message: string;
}

/**
 * Server-side provider interface. Provider implementations run only in
 * serverless functions — never in the browser — so credentials and API keys
 * stay on the server.
 */
export interface ServerProvider {
  /** Provider identifier from the registry. */
  readonly name: Provider;
  /** Whether this provider can actually serve live requests today. */
  readonly isLive: boolean;
  /**
   * The methodology this provider stamps on its responses when it succeeds.
   * GUARDRAIL: only a provider that performs a real live API call may use
   * 'api-live'. Manual input must always be 'user-input'.
   */
  readonly methodology: Methodology;
  /**
   * Check whether the provider is usable with the given (already decrypted)
   * credentials. Must never throw.
   */
  checkAvailability(credentials?: Record<string, string>): UnavailableResult | null;
}

/** Type guard for structured unavailable results. */
export function isUnavailableResult(value: unknown): value is UnavailableResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as UnavailableResult).available === false &&
    typeof (value as UnavailableResult).reason === 'string'
  );
}

/** Helper to build a structured unavailable result. */
export function unavailable(
  provider: Provider,
  reason: UnavailableResult['reason'],
  message: string
): UnavailableResult {
  return { available: false, provider, reason, message };
}

/** Re-export for convenience so providers can build attributed responses. */
export type { ProviderResponse };
