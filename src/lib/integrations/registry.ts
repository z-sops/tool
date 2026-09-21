import type { Provider, ProviderConfig, ProviderResponse, Methodology } from './types';

const providerConfigs: Record<Provider, ProviderConfig> = {
  manual: {
    name: 'manual',
    displayName: 'Manual Entry',
    description: 'Enter data manually without external API',
    requiresCredentials: false,
    credentialFields: [],
    capabilities: [
      { type: 'listing-generation', description: 'Generate listings from manual input' },
    ],
  },
  openrouter: {
    name: 'openrouter',
    displayName: 'OpenRouter AI',
    description: 'AI-powered listing generation via OpenRouter',
    requiresCredentials: true,
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-or-...' },
    ],
    capabilities: [
      { type: 'listing-generation', description: 'Generate optimized listings using AI' },
    ],
    rateLimits: { requestsPerMinute: 60, requestsPerDay: 1000 },
  },
  unavailable: {
    name: 'unavailable',
    displayName: 'Unavailable',
    description: 'Provider not yet available',
    requiresCredentials: false,
    credentialFields: [],
    capabilities: [],
  },
  keyword: {
    name: 'keyword',
    displayName: 'Keyword Research',
    description: 'Keyword research and search volume data',
    requiresCredentials: true,
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    capabilities: [
      { type: 'keyword-research', description: 'Find keywords with search volume and competition' },
    ],
    rateLimits: { requestsPerMinute: 30, requestsPerDay: 500 },
  },
  bsr: {
    name: 'bsr',
    displayName: 'BSR Tracking',
    description: 'Best Seller Rank tracking and sales estimation',
    requiresCredentials: true,
    credentialFields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true },
    ],
    capabilities: [
      { type: 'bsr-tracking', description: 'Track BSR and estimate sales' },
      { type: 'sales-estimation', description: 'Estimate monthly sales from BSR' },
    ],
    rateLimits: { requestsPerMinute: 20, requestsPerDay: 200 },
  },
  trademark: {
    name: 'trademark',
    displayName: 'Trademark Check',
    description: 'USPTO trademark search and monitoring',
    requiresCredentials: false,
    credentialFields: [],
    capabilities: [
      { type: 'trademark-check', description: 'Search trademark database' },
    ],
    rateLimits: { requestsPerMinute: 10, requestsPerDay: 100 },
  },
  shopify: {
    name: 'shopify',
    displayName: 'Shopify',
    description: 'Shopify store integration',
    requiresCredentials: true,
    credentialFields: [
      { key: 'shopDomain', label: 'Shop Domain', type: 'text', required: true, placeholder: 'your-store.myshopify.com' },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
    capabilities: [
      { type: 'listing-generation', description: 'Create listings on Shopify' },
      { type: 'competitor-analysis', description: 'Analyze competitor stores' },
    ],
    rateLimits: { requestsPerMinute: 40, requestsPerDay: 1000 },
  },
  etsy: {
    name: 'etsy',
    displayName: 'Etsy',
    description: 'Etsy marketplace integration',
    requiresCredentials: true,
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'accessToken', label: 'Access Token', type: 'password', required: true },
    ],
    capabilities: [
      { type: 'listing-generation', description: 'Create listings on Etsy' },
      { type: 'keyword-research', description: 'Etsy keyword research' },
    ],
    rateLimits: { requestsPerMinute: 30, requestsPerDay: 500 },
  },
  'amazon-sp-api': {
    name: 'amazon-sp-api',
    displayName: 'Amazon SP-API',
    description: 'Amazon Selling Partner API (requires approval)',
    requiresCredentials: true,
    credentialFields: [
      { key: 'clientId', label: 'Client ID', type: 'text', required: true },
      { key: 'clientSecret', label: 'Client Secret', type: 'password', required: true },
      { key: 'refreshToken', label: 'Refresh Token', type: 'password', required: true },
      { key: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-east-1' },
    ],
    capabilities: [
      { type: 'bsr-tracking', description: 'Track BSR via Amazon API' },
      { type: 'sales-estimation', description: 'Get actual sales data' },
      { type: 'competitor-analysis', description: 'Analyze Amazon competitors' },
      { type: 'keyword-research', description: 'Amazon keyword data' },
    ],
    rateLimits: { requestsPerMinute: 10, requestsPerDay: 1000 },
  },
};

export function getProviderConfig(provider: Provider): ProviderConfig {
  return providerConfigs[provider];
}

export function getAllProviders(): ProviderConfig[] {
  return Object.values(providerConfigs);
}

export function getAvailableProviders(): ProviderConfig[] {
  return Object.values(providerConfigs).filter(p => p.name !== 'unavailable');
}

export function isProviderAvailable(provider: Provider): boolean {
  return provider !== 'unavailable';
}

export function validateProviderCredentials(provider: Provider, credentials: Record<string, string>): boolean {
  const config = getProviderConfig(provider);
  if (!config.requiresCredentials) return true;
  
  return config.credentialFields
    .filter(f => f.required)
    .every(f => credentials[f.key] && credentials[f.key].length > 0);
}

export function createProviderResponse<T>(
  data: T,
  provider: Provider,
  methodology: Methodology = 'user-input',
  confidence: number = 100
): ProviderResponse<T> {
  return {
    data,
    provider,
    fetchedAt: new Date().toISOString(),
    confidence,
    methodology,
  };
}

export const FUTURE_PROVIDERS: Provider[] = ['keyword', 'bsr', 'trademark', 'shopify', 'etsy', 'amazon-sp-api'];
export const CURRENT_PROVIDERS: Provider[] = ['manual', 'openrouter'];