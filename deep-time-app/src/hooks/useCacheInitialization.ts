/**
 * Cache Initialization Hook
 * Loads cached content from IndexedDB on app startup
 * Requirement 10.2: Load cached content from IndexedDB on app init
 * Property 36: Cache load on startup
 */

import { useState, useEffect, useCallback } from 'react';
import { persistenceService, cacheManager } from '../services/ai';
import type { CacheLoadResult, CacheStats } from '../services/ai';

// ============================================
// Types
// ============================================

export interface CacheInitializationState {
  /** Whether cache initialization is in progress */
  isInitializing: boolean;
  /** Whether cache has been initialized */
  isInitialized: boolean;
  /** Result of cache loading */
  loadResult: CacheLoadResult | null;
  /** Cache statistics after loading */
  cacheStats: CacheStats | null;
  /** Any error that occurred during initialization */
  error: string | null;
}

export interface CacheInitializationOptions {
  /** Maximum number of entries to load */
  maxEntries?: number;
  /** Only load entries accessed within this many days */
  recentDays?: number;
  /** Whether to update lastAccessed timestamps */
  updateTimestamps?: boolean;
  /** Callback when initialization completes */
  onComplete?: (result: CacheLoadResult) => void;
  /** Callback when initialization fails */
  onError?: (error: string) => void;
}

// ============================================
// Hook Implementation
// ============================================

/**
 * Hook for initializing cache on app startup
 * Requirement 10.2: Load cached content from IndexedDB on app init
 * Property 36: Cache load on startup - cached content loaded before new API calls
 */
export function useCacheInitialization(
  options: CacheInitializationOptions = {}
): CacheInitializationState & {
  /** Manually trigger cache initialization */
  initialize: () => Promise<void>;
  /** Refresh cache statistics */
  refreshStats: () => Promise<void>;
} {
  const [state, setState] = useState<CacheInitializationState>({
    isInitializing: false,
    isInitialized: false,
    loadResult: null,
    cacheStats: null,
    error: null,
  });

  const {
    maxEntries = 100,
    recentDays = 30,
    updateTimestamps = true,
    onComplete,
    onError,
  } = options;

  /**
   * Initialize cache and load content
   */
  const initialize = useCallback(async () => {
    if (state.isInitialized || state.isInitializing) {
      return;
    }

    setState(prev => ({
      ...prev,
      isInitializing: true,
      error: null,
    }));

    try {
      console.log('[useCacheInitialization] Starting cache initialization...');

      // Load cached content from IndexedDB
      // Requirement 10.2: Load cached content from IndexedDB on app init
      const loadResult = await persistenceService.loadCachedContent({
        maxEntries,
        recentDays,
        updateTimestamps,
      });

      // Get cache statistics
      const cacheStats = await cacheManager.getStats();

      setState({
        isInitializing: false,
        isInitialized: true,
        loadResult,
        cacheStats,
        error: loadResult.errors.length > 0 ? loadResult.errors.join(', ') : null,
      });

      console.log(`[useCacheInitialization] Cache initialized: ${loadResult.entriesLoaded} entries, ${loadResult.totalSize} bytes`);

      onComplete?.(loadResult);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setState(prev => ({
        ...prev,
        isInitializing: false,
        isInitialized: true, // Mark as initialized even on error to prevent retry loops
        error: errorMessage,
      }));

      console.error('[useCacheInitialization] Cache initialization failed:', error);
      
      onError?.(errorMessage);
    }
  }, [state.isInitialized, state.isInitializing, maxEntries, recentDays, updateTimestamps, onComplete, onError]);

  /**
   * Refresh cache statistics
   */
  const refreshStats = useCallback(async () => {
    try {
      const cacheStats = await cacheManager.getStats();
      setState(prev => ({
        ...prev,
        cacheStats,
      }));
    } catch (error) {
      console.error('[useCacheInitialization] Failed to refresh stats:', error);
    }
  }, []);

  // Initialize cache on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    ...state,
    initialize,
    refreshStats,
  };
}

export default useCacheInitialization;
