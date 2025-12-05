/**
 * Services barrel export
 */

export { locationService, LocationError } from './location';
export type { LocationService, LocationErrorType } from './location';

export { geologicalDataService, GeologicalError, generateCacheKey } from './geological';
export type { GeologicalDataService, GeologicalErrorType } from './geological';

export { 
  narrativeService, 
  NarrativeError,
  creatureNarrationService,
  getCreatureFallbackNarration,
  getEraFallbackNarration,
  calculateReadingTime,
} from './narrative';
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
