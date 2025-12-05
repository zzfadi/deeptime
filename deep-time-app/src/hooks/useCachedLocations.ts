/**
 * useCachedLocations Hook
 * Provides access to cached locations from IndexedDB
 * Requirements: 5.1, 5.2, 5.3
 */

import { useState, useEffect, useCallback } from 'react';
import { cacheService } from '../services/cache';
import type { CachedLocationSummary, CachedLocation, GeoCoordinate } from 'deep-time-core/types';

export interface CachedLocationsResult {
  /** List of cached location summaries */
  cachedLocations: CachedLocationSummary[];
  /** Whether locations are being loaded */
  isLoading: boolean;
  /** Error message if loading failed */
  error: string | null;
  /** Refresh the cached locations list */
  refresh: () => Promise<void>;
  /** Get full cached location data */
  getLocation: (location: GeoCoordinate) => Promise<CachedLocation | null>;
  /** Delete a cached location */
  deleteLocation: (location: GeoCoordinate) => Promise<void>;
  /** Clear all cached locations */
  clearAll: () => Promise<void>;
}

/**
 * Hook to access and manage cached locations
 * Requirement 5.1: Cache geological data locally
 * Requirement 5.2: Load cached data within 1 second
 * Requirement 5.3: Display cached locations with offline indicator
 */
export function useCachedLocations(): CachedLocationsResult {
  const [cachedLocations, setCachedLocations] = useState<CachedLocationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await cacheService.initialize();
      const summaries = await cacheService.getAllLocationSummaries();
      setCachedLocations(summaries);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load cached locations';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getLocation = useCallback(async (location: GeoCoordinate): Promise<CachedLocation | null> => {
    try {
      await cacheService.initialize();
      const cached = await cacheService.getLocation(location);
      
      // Update last accessed timestamp
      if (cached) {
        await cacheService.touchLocation(location);
      }
      
      return cached;
    } catch {
      return null;
    }
  }, []);

  const deleteLocation = useCallback(async (location: GeoCoordinate): Promise<void> => {
    try {
      await cacheService.initialize();
      await cacheService.deleteLocation(location);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete cached location';
      setError(message);
    }
  }, [refresh]);

  const clearAll = useCallback(async (): Promise<void> => {
    try {
      await cacheService.initialize();
      await cacheService.clearAll();
      setCachedLocations([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear cache';
      setError(message);
    }
  }, []);

  // Load cached locations on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    cachedLocations,
    isLoading,
    error,
    refresh,
    getLocation,
    deleteLocation,
    clearAll,
  };
}

export default useCachedLocations;
