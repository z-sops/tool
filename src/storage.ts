// NicheScout Storage Utilities (localStorage-based)

import type {
  SavedProduct,
  SavedComparison,
  SavedAnalysis,
  SavedListing,
  ResearchNote,
  RecentActivity,
  Product,
  ComparisonProduct,
} from './types';

const STORAGE_KEYS = {
  SAVED_PRODUCTS: 'nichescout_saved_products',
  SAVED_COMPARISONS: 'nichescout_saved_comparisons',
  SAVED_ANALYSES: 'nichescout_saved_analyses',
  SAVED_LISTINGS: 'nichescout_saved_listings',
  RESEARCH_NOTES: 'nichescout_research_notes',
  RECENT_ACTIVITY: 'nichescout_recent_activity',
} as const;

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function addActivity(activity: Omit<RecentActivity, 'id' | 'timestamp'>): void {
  const activities = getFromStorage<RecentActivity[]>(STORAGE_KEYS.RECENT_ACTIVITY, []);
  const newActivity: RecentActivity = {
    ...activity,
    id: generateId(),
    timestamp: Date.now(),
  };
  // Keep only last 50 activities
  const updated = [newActivity, ...activities].slice(0, 50);
  setToStorage(STORAGE_KEYS.RECENT_ACTIVITY, updated);
}

// Saved Products
export function getSavedProducts(): SavedProduct[] {
  return getFromStorage<SavedProduct[]>(STORAGE_KEYS.SAVED_PRODUCTS, []);
}

export function saveProduct(product: Product, notes?: string): SavedProduct {
  const saved = getSavedProducts();
  const newSaved: SavedProduct = {
    id: generateId(),
    product,
    savedAt: Date.now(),
    notes,
  };
  setToStorage(STORAGE_KEYS.SAVED_PRODUCTS, [newSaved, ...saved]);
  addActivity({ type: 'saved', title: 'Saved Product', productName: product.name });
  return newSaved;
}

export function removeSavedProduct(id: string): void {
  const saved = getSavedProducts().filter(p => p.id !== id);
  setToStorage(STORAGE_KEYS.SAVED_PRODUCTS, saved);
  addActivity({ type: 'saved', title: 'Removed Saved Product' });
}

export function updateSavedProductNotes(id: string, notes: string): void {
  const saved = getSavedProducts().map(p => 
    p.id === id ? { ...p, notes } : p
  );
  setToStorage(STORAGE_KEYS.SAVED_PRODUCTS, saved);
}

// Saved Comparisons
export function getSavedComparisons(): SavedComparison[] {
  return getFromStorage<SavedComparison[]>(STORAGE_KEYS.SAVED_COMPARISONS, []);
}

export function saveComparison(name: string, products: ComparisonProduct[]): SavedComparison {
  const saved = getSavedComparisons();
  const newSaved: SavedComparison = {
    id: generateId(),
    name,
    products,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  setToStorage(STORAGE_KEYS.SAVED_COMPARISONS, [newSaved, ...saved]);
  addActivity({ type: 'saved', title: 'Saved Comparison', productName: name });
  return newSaved;
}

export function removeSavedComparison(id: string): void {
  const saved = getSavedComparisons().filter(c => c.id !== id);
  setToStorage(STORAGE_KEYS.SAVED_COMPARISONS, saved);
  addActivity({ type: 'saved', title: 'Removed Comparison' });
}

export function updateSavedComparison(id: string, updates: Partial<SavedComparison>): void {
  const saved = getSavedComparisons().map(c => 
    c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
  );
  setToStorage(STORAGE_KEYS.SAVED_COMPARISONS, saved);
}

// Saved Analyses
export function getSavedAnalyses(): SavedAnalysis[] {
  return getFromStorage<SavedAnalysis[]>(STORAGE_KEYS.SAVED_ANALYSES, []);
}

export function saveAnalysis(
  type: SavedAnalysis['type'],
  productName: string,
  inputs: any,
  result: any
): SavedAnalysis {
  const saved = getSavedAnalyses();
  const newSaved: SavedAnalysis = {
    id: generateId(),
    type,
    productName,
    inputs,
    result,
    createdAt: Date.now(),
  };
  setToStorage(STORAGE_KEYS.SAVED_ANALYSES, [newSaved, ...saved]);
  addActivity({ type: 'calculated', title: `Ran ${type} Analysis`, productName, toolName: type });
  return newSaved;
}

export function removeSavedAnalysis(id: string): void {
  const saved = getSavedAnalyses().filter(a => a.id !== id);
  setToStorage(STORAGE_KEYS.SAVED_ANALYSES, saved);
}

export function getAnalysesByType(type: SavedAnalysis['type']): SavedAnalysis[] {
  return getSavedAnalyses().filter(a => a.type === type);
}

// Saved Listings
export function getSavedListings(): SavedListing[] {
  return getFromStorage<SavedListing[]>(STORAGE_KEYS.SAVED_LISTINGS, []);
}

export function saveListing(productName: string, listing: { title: string; bulletPoints: string[]; description: string; searchTerms: string[] }): SavedListing {
  const saved = getSavedListings();
  const newSaved: SavedListing = {
    id: generateId(),
    productName,
    listing,
    createdAt: Date.now(),
  };
  setToStorage(STORAGE_KEYS.SAVED_LISTINGS, [newSaved, ...saved]);
  addActivity({ type: 'created', title: 'Created Listing', productName });
  return newSaved;
}

export function removeSavedListing(id: string): void {
  const saved = getSavedListings().filter(l => l.id !== id);
  setToStorage(STORAGE_KEYS.SAVED_LISTINGS, saved);
}

// Research Notes
export function getResearchNotes(): ResearchNote[] {
  return getFromStorage<ResearchNote[]>(STORAGE_KEYS.RESEARCH_NOTES, []);
}

export function saveNote(title: string, content: string, tags: string[] = []): ResearchNote {
  const saved = getResearchNotes();
  const newNote: ResearchNote = {
    id: generateId(),
    title,
    content,
    tags,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  setToStorage(STORAGE_KEYS.RESEARCH_NOTES, [newNote, ...saved]);
  addActivity({ type: 'saved', title: 'Created Note', productName: title });
  return newNote;
}

export function updateNote(id: string, updates: Partial<ResearchNote>): void {
  const saved = getResearchNotes().map(n => 
    n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
  );
  setToStorage(STORAGE_KEYS.RESEARCH_NOTES, saved);
}

export function removeNote(id: string): void {
  const saved = getResearchNotes().filter(n => n.id !== id);
  setToStorage(STORAGE_KEYS.RESEARCH_NOTES, saved);
}

// Recent Activity
export function getRecentActivity(limit = 20): RecentActivity[] {
  return getFromStorage<RecentActivity[]>(STORAGE_KEYS.RECENT_ACTIVITY, []).slice(0, limit);
}

export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
}

// Utility: Format timestamp
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Utility: Get all saved data for export
export function exportAllData(): string {
  const data = {
    savedProducts: getSavedProducts(),
    savedComparisons: getSavedComparisons(),
    savedAnalyses: getSavedAnalyses(),
    savedListings: getSavedListings(),
    researchNotes: getResearchNotes(),
    recentActivity: getRecentActivity(100),
    exportedAt: Date.now(),
  };
  return JSON.stringify(data, null, 2);
}

// Utility: Import data
export function importData(json: string): boolean {
  try {
    const data = JSON.parse(json);
    if (data.savedProducts) setToStorage(STORAGE_KEYS.SAVED_PRODUCTS, data.savedProducts);
    if (data.savedComparisons) setToStorage(STORAGE_KEYS.SAVED_COMPARISONS, data.savedComparisons);
    if (data.savedAnalyses) setToStorage(STORAGE_KEYS.SAVED_ANALYSES, data.savedAnalyses);
    if (data.savedListings) setToStorage(STORAGE_KEYS.SAVED_LISTINGS, data.savedListings);
    if (data.researchNotes) setToStorage(STORAGE_KEYS.RESEARCH_NOTES, data.researchNotes);
    if (data.recentActivity) setToStorage(STORAGE_KEYS.RECENT_ACTIVITY, data.recentActivity);
    return true;
  } catch {
    return false;
  }
}