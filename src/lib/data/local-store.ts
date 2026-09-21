import type { DataStore } from './store';
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

export class LocalStorageStore implements DataStore {
  async getSavedProducts(): Promise<SavedProduct[]> {
    return getFromStorage<SavedProduct[]>(STORAGE_KEYS.SAVED_PRODUCTS, []);
  }

  async saveProduct(product: Product, notes?: string): Promise<SavedProduct> {
    const saved = await this.getSavedProducts();
    const newSaved: SavedProduct = {
      id: generateId(),
      product,
      savedAt: Date.now(),
      notes,
    };
    setToStorage(STORAGE_KEYS.SAVED_PRODUCTS, [newSaved, ...saved]);
    await this.addActivity({ type: 'saved', title: 'Saved Product', productName: product.name });
    return newSaved;
  }

  async removeSavedProduct(id: string): Promise<void> {
    const saved = (await this.getSavedProducts()).filter(p => p.id !== id);
    setToStorage(STORAGE_KEYS.SAVED_PRODUCTS, saved);
    await this.addActivity({ type: 'saved', title: 'Removed Saved Product' });
  }

  async updateSavedProductNotes(id: string, notes: string): Promise<void> {
    const saved = (await this.getSavedProducts()).map(p => 
      p.id === id ? { ...p, notes } : p
    );
    setToStorage(STORAGE_KEYS.SAVED_PRODUCTS, saved);
  }

  async getSavedComparisons(): Promise<SavedComparison[]> {
    return getFromStorage<SavedComparison[]>(STORAGE_KEYS.SAVED_COMPARISONS, []);
  }

  async saveComparison(name: string, products: ComparisonProduct[]): Promise<SavedComparison> {
    const saved = await this.getSavedComparisons();
    const newSaved: SavedComparison = {
      id: generateId(),
      name,
      products,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setToStorage(STORAGE_KEYS.SAVED_COMPARISONS, [newSaved, ...saved]);
    await this.addActivity({ type: 'saved', title: 'Saved Comparison', productName: name });
    return newSaved;
  }

  async removeSavedComparison(id: string): Promise<void> {
    const saved = (await this.getSavedComparisons()).filter(c => c.id !== id);
    setToStorage(STORAGE_KEYS.SAVED_COMPARISONS, saved);
    await this.addActivity({ type: 'saved', title: 'Removed Comparison' });
  }

  async updateSavedComparison(id: string, updates: Partial<SavedComparison>): Promise<void> {
    const saved = (await this.getSavedComparisons()).map(c => 
      c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
    );
    setToStorage(STORAGE_KEYS.SAVED_COMPARISONS, saved);
  }

  async getSavedAnalyses(): Promise<SavedAnalysis[]> {
    return getFromStorage<SavedAnalysis[]>(STORAGE_KEYS.SAVED_ANALYSES, []);
  }

  async saveAnalysis(
    type: SavedAnalysis['type'],
    productName: string,
    inputs: any,
    result: any
  ): Promise<SavedAnalysis> {
    const saved = await this.getSavedAnalyses();
    const newSaved: SavedAnalysis = {
      id: generateId(),
      type,
      productName,
      inputs,
      result,
      createdAt: Date.now(),
    };
    setToStorage(STORAGE_KEYS.SAVED_ANALYSES, [newSaved, ...saved]);
    await this.addActivity({ type: 'calculated', title: `Ran ${type} Analysis`, productName, toolName: type });
    return newSaved;
  }

  async removeSavedAnalysis(id: string): Promise<void> {
    const saved = (await this.getSavedAnalyses()).filter(a => a.id !== id);
    setToStorage(STORAGE_KEYS.SAVED_ANALYSES, saved);
  }

  async getAnalysesByType(type: SavedAnalysis['type']): Promise<SavedAnalysis[]> {
    return (await this.getSavedAnalyses()).filter(a => a.type === type);
  }

  async getSavedListings(): Promise<SavedListing[]> {
    return getFromStorage<SavedListing[]>(STORAGE_KEYS.SAVED_LISTINGS, []);
  }

  async saveListing(
    productName: string,
    listing: { title: string; bulletPoints: string[]; description: string; searchTerms: string[] }
  ): Promise<SavedListing> {
    const saved = await this.getSavedListings();
    const newSaved: SavedListing = {
      id: generateId(),
      productName,
      listing,
      createdAt: Date.now(),
    };
    setToStorage(STORAGE_KEYS.SAVED_LISTINGS, [newSaved, ...saved]);
    await this.addActivity({ type: 'created', title: 'Created Listing', productName });
    return newSaved;
  }

  async removeSavedListing(id: string): Promise<void> {
    const saved = (await this.getSavedListings()).filter(l => l.id !== id);
    setToStorage(STORAGE_KEYS.SAVED_LISTINGS, saved);
  }

  async getResearchNotes(): Promise<ResearchNote[]> {
    return getFromStorage<ResearchNote[]>(STORAGE_KEYS.RESEARCH_NOTES, []);
  }

  async saveNote(title: string, content: string, tags: string[] = []): Promise<ResearchNote> {
    const saved = await this.getResearchNotes();
    const newNote: ResearchNote = {
      id: generateId(),
      title,
      content,
      tags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setToStorage(STORAGE_KEYS.RESEARCH_NOTES, [newNote, ...saved]);
    await this.addActivity({ type: 'saved', title: 'Created Note', productName: title });
    return newNote;
  }

  async updateNote(id: string, updates: Partial<ResearchNote>): Promise<void> {
    const saved = (await this.getResearchNotes()).map(n => 
      n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
    );
    setToStorage(STORAGE_KEYS.RESEARCH_NOTES, saved);
  }

  async removeNote(id: string): Promise<void> {
    const saved = (await this.getResearchNotes()).filter(n => n.id !== id);
    setToStorage(STORAGE_KEYS.RESEARCH_NOTES, saved);
  }

  async getRecentActivity(limit = 20): Promise<RecentActivity[]> {
    return getFromStorage<RecentActivity[]>(STORAGE_KEYS.RECENT_ACTIVITY, []).slice(0, limit);
  }

  async addActivity(activity: Omit<RecentActivity, 'id' | 'timestamp'>): Promise<void> {
    const activities = await this.getRecentActivity(100);
    const newActivity: RecentActivity = {
      ...activity,
      id: generateId(),
      timestamp: Date.now(),
    };
    const updated = [newActivity, ...activities].slice(0, 50);
    setToStorage(STORAGE_KEYS.RECENT_ACTIVITY, updated);
  }

  async clearAllData(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  }

  async exportAllData(): Promise<string> {
    const data = {
      savedProducts: await this.getSavedProducts(),
      savedComparisons: await this.getSavedComparisons(),
      savedAnalyses: await this.getSavedAnalyses(),
      savedListings: await this.getSavedListings(),
      researchNotes: await this.getResearchNotes(),
      recentActivity: await this.getRecentActivity(100),
      exportedAt: Date.now(),
    };
    return JSON.stringify(data, null, 2);
  }

  async importData(json: string): Promise<boolean> {
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

  async hasLocalData(): Promise<boolean> {
    for (const key of Object.values(STORAGE_KEYS)) {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          if (Array.isArray(parsed) && parsed.length > 0) return true;
        } catch {
          continue;
        }
      }
    }
    return false;
  }
}

export const localStore = new LocalStorageStore();