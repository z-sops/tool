import type {
  SavedProduct,
  SavedComparison,
  SavedAnalysis,
  SavedListing,
  ResearchNote,
  RecentActivity,
  Product,
  ComparisonProduct,
} from '../../types';

export interface DataStore {
  getSavedProducts(): Promise<SavedProduct[]>;
  saveProduct(product: Product, notes?: string): Promise<SavedProduct>;
  removeSavedProduct(id: string): Promise<void>;
  updateSavedProductNotes(id: string, notes: string): Promise<void>;
  
  getSavedComparisons(): Promise<SavedComparison[]>;
  saveComparison(name: string, products: ComparisonProduct[]): Promise<SavedComparison>;
  removeSavedComparison(id: string): Promise<void>;
  updateSavedComparison(id: string, updates: Partial<SavedComparison>): Promise<void>;
  
  getSavedAnalyses(): Promise<SavedAnalysis[]>;
  saveAnalysis(type: SavedAnalysis['type'], productName: string, inputs: any, result: any): Promise<SavedAnalysis>;
  removeSavedAnalysis(id: string): Promise<void>;
  getAnalysesByType(type: SavedAnalysis['type']): Promise<SavedAnalysis[]>;
  
  getSavedListings(): Promise<SavedListing[]>;
  saveListing(productName: string, listing: { title: string; bulletPoints: string[]; description: string; searchTerms: string[] }): Promise<SavedListing>;
  removeSavedListing(id: string): Promise<void>;
  
  getResearchNotes(): Promise<ResearchNote[]>;
  saveNote(title: string, content: string, tags?: string[]): Promise<ResearchNote>;
  updateNote(id: string, updates: Partial<ResearchNote>): Promise<void>;
  removeNote(id: string): Promise<void>;
  
  getRecentActivity(limit?: number): Promise<RecentActivity[]>;
  addActivity(activity: Omit<RecentActivity, 'id' | 'timestamp'>): Promise<void>;
  
  clearAllData(): Promise<void>;
  exportAllData(): Promise<string>;
  importData(json: string): Promise<boolean>;
  
  hasLocalData(): Promise<boolean>;
}