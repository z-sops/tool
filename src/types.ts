// NicheScout Shared Types

// Product / Listing Types
export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  rating: number;
  reviews: number;
  bsr: number;
  image: string;
  highlights: string[];
}

export interface ListingOutput {
  title: string;
  bulletPoints: string[];
  description: string;
  searchTerms: string[];
}

// Tool Input Types
export interface CalculatorInputs {
  // Profit Calculator
  salePrice: number;
  costOfGoods: number;
  shippingCost: number;
  amazonFees: number;
  otherFees: number;
  
  // ROI Calculator
  investment: number;
  profit: number;
  
  // Pricing Calculator
  targetMargin: number;
  competitorPrice: number;
}

export interface IPRiskInputs {
  brandName: string;
  productType: 'generic' | 'private-label' | 'branded-authorized' | 'branded-unauthorized' | 'uses-another-brand';
  trademarkStatus: 'registered' | 'pending' | 'none' | 'unknown';
  hasLogo: boolean;
  hasPackaging: boolean;
  supplierVerified: boolean;
  supplierInvoices: boolean;
  productImages: 'original' | 'supplier' | 'copied';
  listingContent: 'original' | 'supplier' | 'copied';
}

export interface RestrictionInputs {
  category: string;
  brand: string;
  condition: 'new' | 'used' | 'refurbished';
  requiresApproval: boolean;
  hasInvoice: boolean;
  invoiceAgeDays: number;
}

export interface SourcingRiskInputs {
  supplierType: 'manufacturer' | 'wholesaler' | 'distributor' | 'retailer' | 'unknown';
  supplierLocation: string;
  hasContract: boolean;
  minimumOrderQuantity: number;
  leadTimeDays: number;
  qualityCertifications: string[];
  paymentTerms: string;
  communicationQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface ListingAnalyzerInputs {
  title: string;
  bulletPoints: string[];
  description: string;
  searchTerms: string[];
  images: number;
  category: string;
}

export interface TitleCheckerInputs {
  title: string;
  category: string;
  platform: 'amazon' | 'etsy' | 'shopify';
}

export interface BulletCheckerInputs {
  bullets: string[];
  category: string;
  platform: 'amazon' | 'etsy' | 'shopify';
}

export interface ChecklistInputs {
  productName: string;
  category: string;
  targetPrice: number;
  targetMargin: number;
  competitionLevel: 'low' | 'medium' | 'high';
  differentiationScore: number;
  demandScore: number;
  profitPotential: number;
}

// Tool Result Types
export interface ProfitResult {
  revenue: number;
  totalCosts: number;
  profit: number;
  margin: number;
  breakdown: {
    cogs: number;
    shipping: number;
    amazonFees: number;
    otherFees: number;
  };
}

export interface ROIResult {
  roi: number;
  paybackPeriodMonths: number;
  annualizedReturn: number;
}

export interface PricingResult {
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  marginAtSuggested: number;
  competitivePosition: 'below' | 'at' | 'above';
}

export interface IPRiskResult {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number; // 0-100
  riskLabel: string;
  signals: string[];
  whatToReview: string[];
  nextStep: string;
  warnings: string[];
  recommendations: string[];
  sellerIntegrityNotes: string[];
}

export interface RestrictionResult {
  isRestricted: boolean;
  restrictionType?: 'category' | 'brand' | 'condition' | 'none';
  requiresApproval: boolean;
  approvalProbability: 'high' | 'medium' | 'low';
  notes: string[];
  sellerCentralVerificationRequired: boolean;
}

export interface SourcingRiskResult {
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
  redFlags: string[];
  recommendations: string[];
}

export interface ListingAnalysisResult {
  score: number; // 0-100
  titleScore: number;
  bulletsScore: number;
  descriptionScore: number;
  seoScore: number;
  imagesScore: number;
  issues: string[];
  recommendations: string[];
}

export interface TitleCheckResult {
  score: number;
  characterCount: number;
  keywordDensity: number;
  issues: string[];
  suggestions: string[];
}

export interface BulletCheckResult {
  score: number;
  bulletCount: number;
  issues: string[];
  suggestions: string[];
}

export interface ChecklistResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  sections: {
    marketResearch: number;
    productValidation: number;
    financialViability: number;
    riskAssessment: number;
    operationalReadiness: number;
  };
  passedItems: string[];
  failedItems: string[];
}

// Comparison Types
export interface ComparisonProduct extends Product {
  profitMargin?: number;
  roi?: number;
  ipRisk?: 'low' | 'medium' | 'high';
  restrictionRisk?: 'low' | 'medium' | 'high';
  sourcingRisk?: 'low' | 'medium' | 'high';
  listingQuality?: number;
}

// Saved Research Types
export interface SavedProduct {
  id: string;
  product: Product;
  savedAt: number;
  notes?: string;
}

export interface SavedComparison {
  id: string;
  name: string;
  products: ComparisonProduct[];
  createdAt: number;
  updatedAt: number;
}

export interface SavedAnalysis {
  id: string;
  type: 'profit' | 'roi' | 'pricing' | 'ip' | 'restriction' | 'sourcing' | 'listing' | 'title' | 'bullet' | 'checklist' | 'niche';
  productName: string;
  inputs: any;
  result: any;
  createdAt: number;
}

export interface SavedListing {
  id: string;
  productName: string;
  listing: ListingOutput;
  createdAt: number;
}

export interface ResearchNote {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface RecentActivity {
  id: string;
  type: 'viewed' | 'analyzed' | 'calculated' | 'saved' | 'created';
  title: string;
  productName?: string;
  toolName?: string;
  timestamp: number;
}

// Learn Guide Types
export interface Guide {
  id: string;
  title: string;
  description: string;
  icon: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  color: string;
  connectedTools: string[];
  content: string;
}