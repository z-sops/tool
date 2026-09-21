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

const API_BASE = '/api';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

export class RemoteStore implements DataStore {
  private workspaceId: string | null = null;
  private projectId: string | null = null;

  setContext(workspaceId: string, projectId?: string) {
    this.workspaceId = workspaceId;
    this.projectId = projectId || null;
  }

  private getWorkspaceParam(): string {
    return this.workspaceId ? `?workspaceId=${this.workspaceId}` : '';
  }

  private getProjectParam(): string {
    return this.projectId ? `&projectId=${this.projectId}` : '';
  }

  async getSavedProducts(): Promise<SavedProduct[]> {
    return [];
  }

  async saveProduct(product: Product, notes?: string): Promise<SavedProduct> {
    throw new Error('Products not supported in remote store');
  }

  async removeSavedProduct(id: string): Promise<void> {
    throw new Error('Products not supported in remote store');
  }

  async updateSavedProductNotes(id: string, notes: string): Promise<void> {
    throw new Error('Products not supported in remote store');
  }

  async getSavedComparisons(): Promise<SavedComparison[]> {
    return [];
  }

  async saveComparison(name: string, products: ComparisonProduct[]): Promise<SavedComparison> {
    throw new Error('Comparisons not supported in remote store');
  }

  async removeSavedComparison(id: string): Promise<void> {
    throw new Error('Comparisons not supported in remote store');
  }

  async updateSavedComparison(id: string, updates: Partial<SavedComparison>): Promise<void> {
    throw new Error('Comparisons not supported in remote store');
  }

  async getSavedAnalyses(): Promise<SavedAnalysis[]> {
    const params = new URLSearchParams();
    if (this.workspaceId) params.set('workspaceId', this.workspaceId);
    if (this.projectId) params.set('projectId', this.projectId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const { analyses } = await fetchApi<{ analyses: SavedAnalysis[] }>(`/analyses/list${query}`);
    return analyses;
  }

  async saveAnalysis(
    type: SavedAnalysis['type'],
    productName: string,
    inputs: any,
    result: any
  ): Promise<SavedAnalysis> {
    const { analysis } = await fetchApi<{ analysis: SavedAnalysis }>('/analyses/save', {
      method: 'POST',
      body: JSON.stringify({
        type,
        productName,
        inputs,
        result,
        workspaceId: this.workspaceId,
        projectId: this.projectId,
      }),
    });
    return analysis;
  }

  async removeSavedAnalysis(id: string): Promise<void> {
    await fetchApi(`/analyses/delete?id=${id}`, { method: 'DELETE' });
  }

  async getAnalysesByType(type: SavedAnalysis['type']): Promise<SavedAnalysis[]> {
    const params = new URLSearchParams();
    params.set('type', type);
    if (this.workspaceId) params.set('workspaceId', this.workspaceId);
    if (this.projectId) params.set('projectId', this.projectId);
    const { analyses } = await fetchApi<{ analyses: SavedAnalysis[] }>(`/analyses/list?${params.toString()}`);
    return analyses;
  }

  async getSavedListings(): Promise<SavedListing[]> {
    const params = new URLSearchParams();
    if (this.workspaceId) params.set('workspaceId', this.workspaceId);
    if (this.projectId) params.set('projectId', this.projectId);
    const query = params.toString() ? `?${params.toString()}` : '';
    const { listings } = await fetchApi<{ listings: SavedListing[] }>(`/listings/list${query}`);
    return listings;
  }

  async saveListing(
    productName: string,
    listing: { title: string; bulletPoints: string[]; description: string; searchTerms: string[] }
  ): Promise<SavedListing> {
    const { listing: saved } = await fetchApi<{ listing: SavedListing }>('/listings/save', {
      method: 'POST',
      body: JSON.stringify({
        productName,
        listing,
        workspaceId: this.workspaceId,
        projectId: this.projectId,
      }),
    });
    return saved;
  }

  async removeSavedListing(id: string): Promise<void> {
    await fetchApi(`/listings/delete?id=${id}`, { method: 'DELETE' });
  }

  async getResearchNotes(): Promise<ResearchNote[]> {
    return [];
  }

  async saveNote(title: string, content: string, tags?: string[]): Promise<ResearchNote> {
    throw new Error('Notes not supported in remote store yet');
  }

  async updateNote(id: string, updates: Partial<ResearchNote>): Promise<void> {
    throw new Error('Notes not supported in remote store yet');
  }

  async removeNote(id: string): Promise<void> {
    throw new Error('Notes not supported in remote store yet');
  }

  async getRecentActivity(limit = 20): Promise<RecentActivity[]> {
    return [];
  }

  async addActivity(activity: Omit<RecentActivity, 'id' | 'timestamp'>): Promise<void> {
  }

  async clearAllData(): Promise<void> {
    throw new Error('Clear all not supported in remote store');
  }

  async exportAllData(): Promise<string> {
    const analyses = await this.getSavedAnalyses();
    const listings = await this.getSavedListings();
    return JSON.stringify({ analyses, listings, exportedAt: Date.now() }, null, 2);
  }

  async importData(json: string): Promise<boolean> {
    return false;
  }

  async hasLocalData(): Promise<boolean> {
    return false;
  }
}

export const remoteStore = new RemoteStore();