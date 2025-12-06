/**
 * Services barrel export
 */

export { locationService, LocationError } from './location';
export type { LocationService, LocationErrorType } from './location';

export { geologicalDataService, GeologicalError, generateCacheKey } from './geological';
export type { GeologicalDataService, GeologicalErrorType } from './geological';

/**
 * @deprecated narrativeService is deprecated. Use textGenerator from './ai' or contentOrchestrator instead.
 * creatureNarrationService is still available for AR creature narrations.
 */
export { 
  narrativeService, 
  NarrativeError,
  creatureNarrationService,
  getCreatureFallbackNarration,
  getEraFallbackNarration,
  calculateReadingTime,
} from './narrative';
/** @deprecated Use TextGenerator from './ai' instead */
export type { NarrativeService, NarrativeErrorType } from './narrative';

export { firebaseService, FirebaseError, generateLocationId, createCachedLocation } from './firebase';
export type { FirebaseService, FirebaseConfig, FirebaseErrorType } from './firebase';

export { cacheService, CacheError, generateCacheKey as generateLocalCacheKey, generateNarrativeCacheKey } from './cache';
export type { CacheService, CacheErrorType } from './cache';

export { 
  hapticController, 
  HapticController, 
  getHapticIntensityForEra,
  HAPTIC_DURATIONS,
  CONFIRM_PATTERN,
  MAJOR_ERA_NAMES,
} from './haptics';

// AI Services Module
export * from './ai';
