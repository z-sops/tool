import { localStore } from './local-store';
import { remoteStore } from './remote-store';
import type { DataStore } from './store';

export interface MigrationResult {
  success: boolean;
  migrated: {
    analyses: number;
    listings: number;
  };
  errors: string[];
}

export async function migrateLocalToRemote(
  workspaceId: string,
  projectId?: string,
  onProgress?: (step: string, current: number, total: number) => void
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migrated: { analyses: 0, listings: 0 },
    errors: [],
  };

  remoteStore.setContext(workspaceId, projectId);

  try {
    onProgress?.('analyses', 0, 1);
    const localAnalyses = await localStore.getSavedAnalyses();
    for (let i = 0; i < localAnalyses.length; i++) {
      const analysis = localAnalyses[i];
      try {
        await remoteStore.saveAnalysis(
          analysis.type,
          analysis.productName,
          analysis.inputs,
          analysis.result
        );
        result.migrated.analyses++;
      } catch (error) {
        result.errors.push(`Failed to migrate analysis ${analysis.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      onProgress?.('analyses', i + 1, localAnalyses.length);
    }

    onProgress?.('listings', 0, 1);
    const localListings = await localStore.getSavedListings();
    for (let i = 0; i < localListings.length; i++) {
      const listing = localListings[i];
      try {
        await remoteStore.saveListing(listing.productName, listing.listing);
        result.migrated.listings++;
      } catch (error) {
        result.errors.push(`Failed to migrate listing ${listing.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      onProgress?.('listings', i + 1, localListings.length);
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return result;
  }
}

export async function detectLocalData(): Promise<boolean> {
  return localStore.hasLocalData();
}

export function createStoreSelector(
  isLoggedIn: boolean,
  workspaceId?: string,
  projectId?: string
): DataStore {
  if (isLoggedIn && workspaceId) {
    remoteStore.setContext(workspaceId, projectId);
    return remoteStore;
  }
  return localStore;
}