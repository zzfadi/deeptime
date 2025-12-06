/**
 * Hooks Index
 * Exports all custom hooks for the DeepTime PWA
 */

export { useWebXRSupport, useARSession } from './useWebXR';
export type { WebXRSupport } from './useWebXR';

export { useOfflineStatus } from './useOfflineStatus';
export type { OfflineStatusResult } from './useOfflineStatus';

export { useCachedLocations } from './useCachedLocations';
export type { CachedLocationsResult } from './useCachedLocations';

export { usePWAInstall } from './usePWAInstall';

export { useIdleFade, DEFAULT_IDLE_TIMEOUT, IDLE_OPACITY, ACTIVE_OPACITY } from './useIdleFade';
export type { UseIdleFadeOptions, UseIdleFadeResult } from './useIdleFade';

export { useCacheInitialization } from './useCacheInitialization';
export type { CacheInitializationState, CacheInitializationOptions } from './useCacheInitialization';

export { useEraGlyph } from './useEraGlyph';
export type { default as UseEraGlyphResult } from './useEraGlyph';
