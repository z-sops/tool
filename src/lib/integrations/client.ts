import type { Provider, ProviderResponse, ListingGenerationInput, ListingGenerationResult, Methodology } from './types';
import { getProviderConfig, validateProviderCredentials, isProviderAvailable } from './registry';
import { isUnavailableResult, type UnavailableResult } from './providers/types';
import { manualProvider } from './providers/manual';
import { openRouterProvider } from './providers/openrouter';
import { amazonSPAdapter } from './providers/unavailable';

export interface IntegrationClient {
  /** Returns a structured unavailable result if the provider can't serve requests, else null. */
  checkProviderAvailability(provider: Provider, credentials?: Record<string, string>): UnavailableResult | null;
  validateCredentials(provider: Provider, credentials: Record<string, string>): boolean;
  /**
   * Generate a listing through the given provider.
   * Browser-safe only for provider='manual'; 'openrouter' requires a server
   * environment (OPENROUTER_API_KEY or decrypted workspace credentials).
   */
  generateListing(
    input: ListingGenerationInput,
    provider: Provider,
    credentials?: Record<string, string>
  ): Promise<ProviderResponse<ListingGenerationResult>>;
}

class DefaultIntegrationClient implements IntegrationClient {
  async generateListing(
    input: ListingGenerationInput,
    provider: Provider,
    credentials?: Record<string, string>
  ): Promise<ProviderResponse<ListingGenerationResult>> {
    const config = getProviderConfig(provider);

    if (!isProviderAvailable(provider)) {
      throw new Error(`Provider ${provider} is not available`);
    }

    if (config.requiresCredentials && credentials) {
      if (!validateProviderCredentials(provider, credentials)) {
        throw new Error(`Invalid credentials for provider ${provider}`);
      }
    }

    // Check availability first so callers get a structured result, not a throw.
    const unavailability = this.checkProviderAvailability(provider, credentials);
    if (unavailability) {
      throw new Error(unavailability.message);
    }

    if (provider === 'openrouter') {
      // Server-side only. Never falls back to import.meta.env — the key must
      // not exist in the browser bundle.
      return openRouterProvider.generateListing(input, credentials);
    }

    if (provider === 'manual') {
      // Deterministic template from user input — attributed user-input.
      return this.generateListingManual(input);
    }

    throw new Error(`Provider ${provider} not implemented`);
  }

  private generateListingManual(input: ListingGenerationInput): ProviderResponse<ListingGenerationResult> {
    const title = `${input.productName} - ${input.keyFeatures.slice(0, 2).join(', ')}`;
    const bulletPoints = input.keyFeatures.map((feature, i) =>
      `${i + 1}. ${feature} - Designed for ${input.targetAudience.toLowerCase()}`
    );
    const description = `Introducing the ${input.productName}, the ultimate solution for ${input.targetAudience.toLowerCase()}. ` +
      `With features including ${input.keyFeatures.join(', ')}, this ${input.category.toLowerCase()} ` +
      `is designed to exceed your expectations.`;
    const searchTerms = input.keyFeatures.flatMap(f => f.toLowerCase().split(' ')).slice(0, 8);

    return {
      data: { title, bulletPoints, description, searchTerms },
      provider: 'manual',
      fetchedAt: new Date().toISOString(),
      confidence: 50,
      methodology: 'user-input',
    };
  }

  checkProviderAvailability(provider: Provider, credentials?: Record<string, string>): UnavailableResult | null {
    switch (provider) {
      case 'manual':
        return manualProvider.checkAvailability();
      case 'openrouter':
        return openRouterProvider.checkAvailability(credentials);
      case 'unavailable':
      case 'keyword':
      case 'bsr':
      case 'trademark':
      case 'shopify':
      case 'etsy':
        // Generic unimplemented providers: structured unavailable, no fake data.
        return {
          available: false,
          provider,
          reason: 'not-implemented',
          message: `Provider ${provider} is not yet implemented. No data is available.`,
        };
      case 'amazon-sp-api':
        // Delegates to the future-ready adapter (reports requires-approval).
        return amazonSPAdapter.checkAvailability(credentials);
      default:
        return {
          available: false,
          provider,
          reason: 'not-implemented',
          message: `Unknown provider ${provider}.`,
        };
    }
  }

  validateCredentials(provider: Provider, credentials: Record<string, string>): boolean {
    return validateProviderCredentials(provider, credentials);
  }
}

export const integrationClient = new DefaultIntegrationClient();
export { isUnavailableResult };
export type { Methodology };
