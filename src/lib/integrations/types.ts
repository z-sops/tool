export type Provider = 'manual' | 'openrouter' | 'unavailable' | 'keyword' | 'bsr' | 'trademark' | 'shopify' | 'etsy' | 'amazon-sp-api';
export type Methodology = 'api-live' | 'user-input' | 'cached' | 'estimated';

export interface ProviderConfig {
  name: string;
  displayName: string;
  description: string;
  requiresCredentials: boolean;
  credentialFields: CredentialField[];
  capabilities: ProviderCapability[];
  rateLimits?: RateLimitConfig;
}

export interface CredentialField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url';
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

export interface ProviderCapability {
  type: 'keyword-research' | 'bsr-tracking' | 'trademark-check' | 'listing-generation' | 'competitor-analysis' | 'sales-estimation';
  description: string;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
}

export interface ProviderResponse<T = unknown> {
  data: T;
  provider: Provider;
  fetchedAt: string;
  confidence: number;
  methodology: Methodology;
  metadata?: Record<string, unknown>;
}

export interface KeywordResearchResult {
  keywords: KeywordData[];
  totalResults: number;
}

export interface KeywordData {
  keyword: string;
  searchVolume: number;
  competition: 'low' | 'medium' | 'high';
  cpc?: number;
  trend?: number[];
}

export interface BSRResult {
  asin: string;
  bsr: number;
  category: string;
  categoryRank: number;
  estimatedSales: number;
  timestamp: string;
}

export interface TrademarkResult {
  mark: string;
  status: 'registered' | 'pending' | 'abandoned' | 'cancelled' | 'not-found';
  serialNumber?: string;
  registrationNumber?: string;
  owner?: string;
  goodsServices?: string[];
}

export interface ListingGenerationInput {
  productName: string;
  category: string;
  keyFeatures: string[];
  targetAudience: string;
  tone: 'professional' | 'friendly' | 'luxury' | 'urgent';
  platform: 'amazon' | 'etsy' | 'shopify';
}

export interface ListingGenerationResult {
  title: string;
  bulletPoints: string[];
  description: string;
  searchTerms: string[];
}

export interface CompetitorAnalysisResult {
  competitors: CompetitorData[];
  marketSummary: MarketSummary;
}

export interface CompetitorData {
  asin: string;
  title: string;
  price: number;
  rating: number;
  reviews: number;
  bsr: number;
  estimatedMonthlySales: number;
  estimatedMonthlyRevenue: number;
}

export interface MarketSummary {
  averagePrice: number;
  averageRating: number;
  totalReviews: number;
  topBrands: string[];
  priceRange: { min: number; max: number };
}

export interface SalesEstimationResult {
  asin: string;
  estimatedMonthlySales: number;
  estimatedMonthlyRevenue: number;
  confidence: number;
  methodology: Methodology;
}