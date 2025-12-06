/**
 * Zustand App Store
 * Central state management for DeepTime PWA
 * Requirements: 1.1, 3.1, 3.2, 5.1, 5.2, 5.3
 */

import { create } from 'zustand';
import type { GeoCoordinate, GeologicalStack, GeologicalLayer, Narrative, CachedLocationSummary } from 'deep-time-core/types';
import { locationService, LocationError } from '../services/location';
import { geologicalDataService, GeologicalError } from '../services/geological';
import { narrativeService, NarrativeError } from '../services/narrative';
import { firebaseService } from '../services/firebase';
import { cacheService } from '../services/cache';
import type { EraContent, VideoOperation } from '../services/ai/types';

// ============================================
// Types
// ============================================

export type ViewMode = 'card' | 'ar';

/**
 * AI content cache entry for an era
 * Stores generated content to persist across era switches
 */
export interface EraAIContentEntry {
  content: EraContent;
  videoOperation?: VideoOperation;
  fromCache: boolean;
  loadedAt: number; // timestamp
}

export interface AppState {
  // Location state
  location: GeoCoordinate | null;
  isLocationLoading: boolean;
  locationError: string | null;

  // Geological data state
  geologicalStack: GeologicalStack | null;
  isGeologyLoading: boolean;
  geologyError: string | null;

  // Era navigation state (Requirements 3.1, 3.2)
  currentEra: GeologicalLayer | null;
  timePosition: number; // yearsAgo value for slider

  // Narrative state
  narrative: Narrative | null;
  isNarrativeLoading: boolean;
  narrativeError: string | null;
  // Narrative cache - keyed by layer ID to persist across era switches
  narrativeCache: Map<string, Narrative>;

  // AI content state - keyed by era ID to persist across era switches
  eraAIContent: Map<string, EraAIContentEntry>;
  eraAIContentLoading: Set<string>; // era IDs currently loading

  // UI state
  isOffline: boolean;
  viewMode: ViewMode;

  // Cached locations state (Requirements 5.1, 5.2, 5.3)
  cachedLocations: CachedLocationSummary[];
  isCacheLoading: boolean;

  // Combined loading/error for convenience
  isLoading: boolean;
  error: string | null;
}

export interface AppActions {
  // Location actions (Requirement 1.1)
  requestLocation: () => Promise<void>;
  searchLocation: (query: string) => Promise<GeoCoordinate[]>;
  setLocation: (location: GeoCoordinate) => void;
  clearLocationError: () => void;

  // Era navigation actions (Requirements 3.1, 3.2)
  setTimePosition: (yearsAgo: number) => void;
  selectEra: (layer: GeologicalLayer) => void;
  navigateToNextEra: () => void;
  navigateToPreviousEra: () => void;

  // Narrative actions
  loadNarrative: (layer: GeologicalLayer) => Promise<void>;

  // AI content actions - persist content across era switches
  setEraAIContent: (eraId: string, entry: EraAIContentEntry) => void;
  getEraAIContent: (eraId: string) => EraAIContentEntry | undefined;
  setEraAIContentLoading: (eraId: string, loading: boolean) => void;
  isEraAIContentLoading: (eraId: string) => boolean;
  clearEraAIContent: () => void; // Clear all when location changes

  // UI actions
  setViewMode: (mode: ViewMode) => void;
  setOfflineStatus: (isOffline: boolean) => void;

  // Cache actions (Requirements 5.1, 5.2, 5.3)
  loadCachedLocations: () => Promise<void>;
  loadFromCache: (location: GeoCoordinate) => Promise<boolean>;
  saveToCache: () => Promise<void>;
  deleteCachedLocation: (location: GeoCoordinate) => Promise<void>;

  // Error handling
  clearErrors: () => void;

  // Full flow: location -> geology -> narrative
  initializeForLocation: (location: GeoCoordinate) => Promise<void>;
}

export type AppStore = AppState & AppActions;

// ============================================
// Helper Functions
// ============================================

/**
 * Finds the geological layer that contains the given yearsAgo value
 * Requirement 3.2: Update displayed era based on slider position
 */
export function findLayerForTimePosition(
  stack: GeologicalStack | null,
  yearsAgo: number
): GeologicalLayer | null {
  if (!stack || stack.layers.length === 0) {
    return null;
  }

  // Sort layers by yearsAgo (ascending - oldest first)
  const sortedLayers = [...stack.layers].sort(
    (a, b) => a.era.yearsAgo - b.era.yearsAgo
  );

  // Find the layer whose era contains this time position
  // We look for the layer where yearsAgo falls within its era range
  for (let i = 0; i < sortedLayers.length; i++) {
    const layer = sortedLayers[i];
    const nextLayer = sortedLayers[i + 1];

    // If this is the last layer or yearsAgo is less than next layer's era
    if (!nextLayer || yearsAgo < nextLayer.era.yearsAgo) {
      // Check if yearsAgo is at least at this layer's era
      if (yearsAgo >= layer.era.yearsAgo || i === 0) {
        return layer;
      }
    }
  }

  // Default to the most recent layer (surface)
  return sortedLayers[0];
}

/**
 * Gets era boundaries from a geological stack for the time slider
 */
export function getEraBoundaries(stack: GeologicalStack | null): Array<{
  yearsAgo: number;
  eraName: string;
  layerId: string;
}> {
  if (!stack || stack.layers.length === 0) {
    return [];
  }

  return stack.layers.map((layer) => ({
    yearsAgo: layer.era.yearsAgo,
    eraName: layer.era.name,
    layerId: layer.id,
  }));
}

// ============================================
// Store Implementation
// ============================================

export const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  location: null,
  isLocationLoading: false,
  locationError: null,

  geologicalStack: null,
  isGeologyLoading: false,
  geologyError: null,

  currentEra: null,
  timePosition: 0,

  narrative: null,
  isNarrativeLoading: false,
  narrativeError: null,
  narrativeCache: new Map<string, Narrative>(),

  // AI content state - persists across era switches
  eraAIContent: new Map<string, EraAIContentEntry>(),
  eraAIContentLoading: new Set<string>(),

  isOffline: !navigator.onLine,
  viewMode: 'card',

  // Cached locations state (Requirements 5.1, 5.2, 5.3)
  cachedLocations: [],
  isCacheLoading: false,

  isLoading: false,
  error: null,

  // ============================================
  // Location Actions (Requirement 1.1)
  // ============================================

  requestLocation: async () => {
    set({
      isLocationLoading: true,
      locationError: null,
      isLoading: true,
      error: null,
    });

    try {
      const location = await locationService.getCurrentPosition();
      set({ location, isLocationLoading: false });

      // Automatically fetch geological data for the location
      await get().initializeForLocation(location);
    } catch (err) {
      const errorMessage =
        err instanceof LocationError
          ? err.message
          : 'Failed to get your location. Please try again or search manually.';

      set({
        isLocationLoading: false,
        locationError: errorMessage,
        isLoading: false,
        error: errorMessage,
      });
    }
  },

  searchLocation: async (query: string) => {
    try {
      return await locationService.searchLocation(query);
    } catch (err) {
      const errorMessage =
        err instanceof LocationError
          ? err.message
          : 'Failed to search for location.';
      set({ locationError: errorMessage, error: errorMessage });
      return [];
    }
  },

  setLocation: (location: GeoCoordinate) => {
    set({ location, locationError: null });
  },

  clearLocationError: () => {
    set({ locationError: null });
  },

  // ============================================
  // Era Navigation Actions (Requirements 3.1, 3.2)
  // ============================================

  setTimePosition: (yearsAgo: number) => {
    const { geologicalStack } = get();
    const layer = findLayerForTimePosition(geologicalStack, yearsAgo);

    set({
      timePosition: yearsAgo,
      currentEra: layer,
    });

    // Load narrative for the new era if it changed
    if (layer) {
      get().loadNarrative(layer);
    }
  },

  selectEra: (layer: GeologicalLayer) => {
    set({
      currentEra: layer,
      timePosition: layer.era.yearsAgo,
    });

    // Load narrative for the selected era
    get().loadNarrative(layer);
  },

  navigateToNextEra: () => {
    const { geologicalStack, currentEra } = get();
    if (!geologicalStack || !currentEra) return;

    // Sort layers by yearsAgo (ascending)
    const sortedLayers = [...geologicalStack.layers].sort(
      (a, b) => a.era.yearsAgo - b.era.yearsAgo
    );

    const currentIndex = sortedLayers.findIndex((l) => l.id === currentEra.id);
    if (currentIndex < sortedLayers.length - 1) {
      const nextLayer = sortedLayers[currentIndex + 1];
      get().selectEra(nextLayer);
    }
  },

  navigateToPreviousEra: () => {
    const { geologicalStack, currentEra } = get();
    if (!geologicalStack || !currentEra) return;

    // Sort layers by yearsAgo (ascending)
    const sortedLayers = [...geologicalStack.layers].sort(
      (a, b) => a.era.yearsAgo - b.era.yearsAgo
    );

    const currentIndex = sortedLayers.findIndex((l) => l.id === currentEra.id);
    if (currentIndex > 0) {
      const prevLayer = sortedLayers[currentIndex - 1];
      get().selectEra(prevLayer);
    }
  },

  // ============================================
  // Narrative Actions
  // ============================================

  loadNarrative: async (layer: GeologicalLayer) => {
    // Check cache first - if we have a cached narrative, use it immediately
    const cachedNarrative = get().narrativeCache.get(layer.id);
    if (cachedNarrative) {
      set({
        narrative: cachedNarrative,
        isNarrativeLoading: false,
        narrativeError: null,
      });
      return;
    }

    set({
      isNarrativeLoading: true,
      narrativeError: null,
    });

    try {
      const narrative = await narrativeService.generateNarrative(layer);
      
      // Cache the narrative for future use
      set((state) => {
        const newCache = new Map(state.narrativeCache);
        newCache.set(layer.id, narrative);
        return {
          narrative,
          isNarrativeLoading: false,
          narrativeCache: newCache,
        };
      });
    } catch (err) {
      const errorMessage =
        err instanceof NarrativeError
          ? err.message
          : 'Failed to generate narrative.';

      // Use fallback narrative and cache it
      const fallbackNarrative = narrativeService.getFallback(layer);
      set((state) => {
        const newCache = new Map(state.narrativeCache);
        newCache.set(layer.id, fallbackNarrative);
        return {
          narrative: fallbackNarrative,
          isNarrativeLoading: false,
          narrativeError: errorMessage,
          narrativeCache: newCache,
        };
      });
    }
  },

  // ============================================
  // AI Content Actions - Persist across era switches
  // ============================================

  setEraAIContent: (eraId: string, entry: EraAIContentEntry) => {
    set((state) => {
      const newMap = new Map(state.eraAIContent);
      newMap.set(eraId, entry);
      return { eraAIContent: newMap };
    });
  },

  getEraAIContent: (eraId: string) => {
    return get().eraAIContent.get(eraId);
  },

  setEraAIContentLoading: (eraId: string, loading: boolean) => {
    set((state) => {
      const newSet = new Set(state.eraAIContentLoading);
      if (loading) {
        newSet.add(eraId);
      } else {
        newSet.delete(eraId);
      }
      return { eraAIContentLoading: newSet };
    });
  },

  isEraAIContentLoading: (eraId: string) => {
    return get().eraAIContentLoading.has(eraId);
  },

  clearEraAIContent: () => {
    set({
      eraAIContent: new Map<string, EraAIContentEntry>(),
      narrativeCache: new Map<string, Narrative>(),
      eraAIContentLoading: new Set<string>(),
    });
  },

  // ============================================
  // UI Actions
  // ============================================

  setViewMode: (mode: ViewMode) => {
    set({ viewMode: mode });
  },

  setOfflineStatus: (isOffline: boolean) => {
    set({ isOffline });
  },

  // ============================================
  // Cache Actions (Requirements 5.1, 5.2, 5.3)
  // ============================================

  loadCachedLocations: async () => {
    set({ isCacheLoading: true });
    
    try {
      await cacheService.initialize();
      const summaries = await cacheService.getAllLocationSummaries();
      set({ cachedLocations: summaries, isCacheLoading: false });
    } catch {
      // Cache loading is non-critical, continue silently
      set({ isCacheLoading: false });
    }
  },

  loadFromCache: async (location: GeoCoordinate): Promise<boolean> => {
    try {
      await cacheService.initialize();
      const cached = await cacheService.getLocation(location);
      
      if (!cached) {
        return false;
      }
      
      // Update last accessed timestamp
      await cacheService.touchLocation(location);
      
      // Set the first (surface) layer as current era
      const surfaceLayer = cached.geologicalStack.layers.length > 0
        ? cached.geologicalStack.layers.reduce((prev, curr) =>
            prev.depthStart < curr.depthStart ? prev : curr
          )
        : null;
      
      // Find cached narrative for surface layer
      const cachedNarrative = surfaceLayer 
        ? cached.narratives.find(n => n.layerId === surfaceLayer.id) ?? null
        : null;
      
      set({
        location: cached.location,
        geologicalStack: cached.geologicalStack,
        currentEra: surfaceLayer,
        timePosition: surfaceLayer?.era.yearsAgo ?? 0,
        narrative: cachedNarrative,
        isLoading: false,
        isGeologyLoading: false,
      });
      
      return true;
    } catch {
      return false;
    }
  },

  saveToCache: async () => {
    const { location, geologicalStack, narrative } = get();
    
    if (!location || !geologicalStack) {
      return;
    }
    
    try {
      await cacheService.initialize();
      const narratives = narrative ? [narrative] : [];
      await cacheService.saveLocation(location, geologicalStack, narratives);
      
      // Refresh cached locations list
      await get().loadCachedLocations();
    } catch {
      // Cache saving is non-critical, continue silently
    }
  },

  deleteCachedLocation: async (location: GeoCoordinate) => {
    try {
      await cacheService.initialize();
      await cacheService.deleteLocation(location);
      
      // Refresh cached locations list
      await get().loadCachedLocations();
    } catch {
      // Cache deletion is non-critical, continue silently
    }
  },

  // ============================================
  // Error Handling
  // ============================================

  clearErrors: () => {
    set({
      locationError: null,
      geologyError: null,
      narrativeError: null,
      error: null,
    });
  },

  // ============================================
  // Full Initialization Flow
  // ============================================

  initializeForLocation: async (location: GeoCoordinate) => {
    // Clear AI content when location changes - new location means new content
    get().clearEraAIContent();
    
    set({
      location,
      isGeologyLoading: true,
      geologyError: null,
      isLoading: true,
      error: null,
    });

    try {
      // First, try to load from local cache (Requirement 5.2: Load cached data within 1 second)
      const loadedFromCache = await get().loadFromCache(location);
      if (loadedFromCache) {
        set({ isLoading: false, isGeologyLoading: false });
        return;
      }

      // Fetch geological data from API
      const geologicalStack = await geologicalDataService.fetchGeology(location);

      // Set the first (surface) layer as current era
      const surfaceLayer = geologicalStack.layers.length > 0
        ? geologicalStack.layers.reduce((prev, curr) =>
            prev.depthStart < curr.depthStart ? prev : curr
          )
        : null;

      set({
        geologicalStack,
        currentEra: surfaceLayer,
        timePosition: surfaceLayer?.era.yearsAgo ?? 0,
        isGeologyLoading: false,
      });

      // Load narrative for the surface layer
      if (surfaceLayer) {
        await get().loadNarrative(surfaceLayer);
      }

      // Save to local IndexedDB cache (Requirement 5.1: Cache geological data locally)
      await get().saveToCache();

      // Also cache to Firebase for cross-device sync
      try {
        const userId = 'anonymous'; // For MVP, use anonymous user
        await firebaseService.saveLocation(userId, {
          id: `loc_${Date.now()}`,
          location,
          geologicalStack,
          narratives: get().narrative ? [get().narrative!] : [],
          cachedAt: new Date(),
          lastAccessed: new Date(),
          schemaVersion: 1,
        });
      } catch {
        // Firebase caching is non-critical, continue silently
      }

      set({ isLoading: false });
    } catch (err) {
      const errorMessage =
        err instanceof GeologicalError
          ? err.message
          : 'Failed to fetch geological data. Please try again.';

      set({
        isGeologyLoading: false,
        geologyError: errorMessage,
        isLoading: false,
        error: errorMessage,
      });
    }
  },
}));

// ============================================
// Selectors (for convenience)
// ============================================

export const selectLocation = (state: AppStore) => state.location;
export const selectGeologicalStack = (state: AppStore) => state.geologicalStack;
export const selectCurrentEra = (state: AppStore) => state.currentEra;
export const selectNarrative = (state: AppStore) => state.narrative;
export const selectIsLoading = (state: AppStore) => state.isLoading;
export const selectError = (state: AppStore) => state.error;
export const selectIsOffline = (state: AppStore) => state.isOffline;
export const selectViewMode = (state: AppStore) => state.viewMode;
export const selectTimePosition = (state: AppStore) => state.timePosition;
export const selectCachedLocations = (state: AppStore) => state.cachedLocations;
export const selectIsCacheLoading = (state: AppStore) => state.isCacheLoading;

export default useAppStore;
