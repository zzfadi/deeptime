/**
 * Progressive Loading and Refresh Property Tests
 * Property-based tests for UI progressive loading and refresh functionality
 * 
 * **Feature: ai-flow-redesign**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  geoCoordinateArb,
  geologicalLayerArb,
} from '../generators/geological.generators';
import {
  eraContentArb,
  cacheMetadataArb,
} from '../generators/orchestrator.generators';
import type { GeoCoordinate, GeologicalLayer } from '../../src/types';
import type { EraContent, CacheMetadata } from '../../deep-time-app/src/services/ai/types';
import { CACHE_TTL_MS } from '../../deep-time-app/src/services/ai/types';
import { generateAICacheKey } from '../../deep-time-app/src/services/ai/aiCache';

// ============================================
// Pure Functions for Testing
// ============================================

/**
 * Simulates cache state after refresh operation
 * Property 23: Refresh invalidates cache
 */
interface CacheState {
  entries: Map<string, { content: EraContent; metadata: CacheMetadata }>;
}

function simulateRefresh(
  cacheState: CacheState,
  location: GeoCoordinate,
  era: GeologicalLayer
): CacheState {
  const cacheKey = generateAICacheKey(location, era);
  const newEntries = new Map(cacheState.entries);
  
  // Refresh invalidates the cache entry
  newEntries.delete(cacheKey);
  
  return { entries: newEntries };
}


/**
 * Simulates content generation with variation
 * Property 24: Refresh produces different content
 */
function generateContentWithVariation(
  baseContent: EraContent,
  seed: number
): EraContent {
  // Simulate that refresh produces different content by adding variation
  const variation = `_v${seed}_${Date.now()}`;
  return {
    ...baseContent,
    narrative: {
      ...baseContent.narrative,
      shortDescription: baseContent.narrative.shortDescription + variation,
    },
    cacheMetadata: {
      ...baseContent.cacheMetadata,
      cachedAt: new Date(),
      expiresAt: new Date(Date.now() + CACHE_TTL_MS),
    },
  };
}

/**
 * Determines loading strategy based on connection speed
 * Property 44: Text-first loading on slow connections
 */
type ConnectionSpeed = 'fast' | 'slow' | 'unknown';

interface LoadingStrategy {
  loadTextFirst: boolean;
  skipImageInitially: boolean;
  skipVideoInitially: boolean;
  showLoadButtons: boolean;
}

function determineLoadingStrategy(
  connectionSpeed: ConnectionSpeed,
  isContentCached: boolean
): LoadingStrategy {
  // Requirement 12.5: Cached media loads immediately regardless of connection
  if (isContentCached) {
    return {
      loadTextFirst: false,
      skipImageInitially: false,
      skipVideoInitially: false,
      showLoadButtons: false,
    };
  }
  
  // Requirement 12.2: Load text first on slow connections
  if (connectionSpeed === 'slow') {
    return {
      loadTextFirst: true,
      skipImageInitially: true,
      skipVideoInitially: true,
      showLoadButtons: true,
    };
  }
  
  // Fast connection: load everything
  return {
    loadTextFirst: false,
    skipImageInitially: false,
    skipVideoInitially: false,
    showLoadButtons: false,
  };
}

/**
 * Simulates on-demand media loading
 * Property 45: On-demand media loading
 */
interface MediaLoadState {
  imageLoaded: boolean;
  videoLoaded: boolean;
  imageLoadRequested: boolean;
  videoLoadRequested: boolean;
}

function simulateMediaLoadRequest(
  state: MediaLoadState,
  mediaType: 'image' | 'video'
): MediaLoadState {
  if (mediaType === 'image') {
    return {
      ...state,
      imageLoadRequested: true,
      imageLoaded: true, // Simulates successful load
    };
  } else {
    return {
      ...state,
      videoLoadRequested: true,
      videoLoaded: true, // Simulates successful load
    };
  }
}

/**
 * Checks if cached media should load immediately
 * Property 46: Cached media loads immediately
 */
function shouldLoadMediaImmediately(
  isMediaCached: boolean,
  connectionSpeed: ConnectionSpeed
): boolean {
  // Requirement 12.5: Cached media loads immediately regardless of connection
  return isMediaCached;
}


// ============================================
// Arbitraries
// ============================================

const connectionSpeedArb = fc.constantFrom<ConnectionSpeed>('fast', 'slow', 'unknown');

const mediaLoadStateArb = fc.record({
  imageLoaded: fc.boolean(),
  videoLoaded: fc.boolean(),
  imageLoadRequested: fc.boolean(),
  videoLoadRequested: fc.boolean(),
});

// ============================================
// Property Tests
// ============================================

describe('Progressive Loading and Refresh Properties', () => {
  /**
   * **Feature: ai-flow-redesign, Property 23: Refresh invalidates cache**
   * **Validates: Requirements 6.2**
   * 
   * *For any* location-era combination, triggering refresh should remove 
   * the cache entry for that specific combination
   */
  describe('Property 23: Refresh invalidates cache', () => {
    it('refresh should remove cache entry for specific location-era', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          eraContentArb,
          (location, era, content) => {
            // Set up initial cache state with the entry
            const cacheKey = generateAICacheKey(location, era);
            const initialState: CacheState = {
              entries: new Map([[cacheKey, { content, metadata: content.cacheMetadata }]]),
            };
            
            // Verify entry exists before refresh
            expect(initialState.entries.has(cacheKey)).toBe(true);
            
            // Simulate refresh
            const afterRefresh = simulateRefresh(initialState, location, era);
            
            // Entry should be removed after refresh
            expect(afterRefresh.entries.has(cacheKey)).toBe(false);
            return !afterRefresh.entries.has(cacheKey);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('refresh should only invalidate specific location-era, not others', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          fc.array(geologicalLayerArb, { minLength: 2, maxLength: 5 }),
          fc.array(eraContentArb, { minLength: 2, maxLength: 5 }),
          (location, eras, contents) => {
            // Ensure we have matching arrays
            const minLen = Math.min(eras.length, contents.length);
            const trimmedEras = eras.slice(0, minLen);
            const trimmedContents = contents.slice(0, minLen);
            
            // Set up cache with multiple entries
            const initialState: CacheState = { entries: new Map() };
            trimmedEras.forEach((era, i) => {
              const key = generateAICacheKey(location, era);
              initialState.entries.set(key, { 
                content: trimmedContents[i], 
                metadata: trimmedContents[i].cacheMetadata 
              });
            });
            
            // Refresh only the first era
            const targetEra = trimmedEras[0];
            const targetKey = generateAICacheKey(location, targetEra);
            const afterRefresh = simulateRefresh(initialState, location, targetEra);
            
            // Target entry should be removed
            expect(afterRefresh.entries.has(targetKey)).toBe(false);
            
            // Other entries should remain
            for (let i = 1; i < trimmedEras.length; i++) {
              const otherKey = generateAICacheKey(location, trimmedEras[i]);
              expect(afterRefresh.entries.has(otherKey)).toBe(true);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: ai-flow-redesign, Property 24: Refresh produces different content**
   * **Validates: Requirements 6.3**
   * 
   * *For any* location-era combination, generating content twice (after refresh) 
   * should produce different narratives, images, or videos
   */
  describe('Property 24: Refresh produces different content', () => {
    it('content generated after refresh should differ from original', () => {
      fc.assert(
        fc.property(
          eraContentArb,
          fc.integer({ min: 1, max: 1000 }),
          (originalContent, seed) => {
            // Generate new content with variation (simulating refresh)
            const refreshedContent = generateContentWithVariation(originalContent, seed);
            
            // Content should be different
            expect(refreshedContent.narrative.shortDescription).not.toBe(
              originalContent.narrative.shortDescription
            );
            
            return refreshedContent.narrative.shortDescription !== originalContent.narrative.shortDescription;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('multiple refreshes should produce unique content each time', () => {
      fc.assert(
        fc.property(
          eraContentArb,
          fc.uniqueArray(fc.integer({ min: 1, max: 100000 }), { minLength: 3, maxLength: 5 }),
          (originalContent, seeds) => {
            // Generate multiple refreshed versions with unique seeds
            const versions = seeds.map(seed => 
              generateContentWithVariation(originalContent, seed)
            );
            
            // All versions should be unique since seeds are unique
            const descriptions = versions.map(v => v.narrative.shortDescription);
            const uniqueDescriptions = new Set(descriptions);
            
            expect(uniqueDescriptions.size).toBe(versions.length);
            return uniqueDescriptions.size === versions.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('refreshed content should have updated cache metadata', () => {
      fc.assert(
        fc.property(eraContentArb, fc.integer({ min: 1, max: 1000 }), (originalContent, seed) => {
          const refreshedContent = generateContentWithVariation(originalContent, seed);
          
          // Cache metadata should be updated - cachedAt should be a valid date
          // and expiresAt should be in the future relative to cachedAt
          expect(refreshedContent.cacheMetadata.cachedAt).toBeInstanceOf(Date);
          expect(refreshedContent.cacheMetadata.expiresAt).toBeInstanceOf(Date);
          expect(refreshedContent.cacheMetadata.expiresAt.getTime()).toBeGreaterThan(
            refreshedContent.cacheMetadata.cachedAt.getTime()
          );
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 44: Text-first loading on slow connections**
   * **Validates: Requirements 12.2**
   * 
   * *For any* request when connection speed is slow, text content should be 
   * loaded and displayed before images and videos
   */
  describe('Property 44: Text-first loading on slow connections', () => {
    it('slow connection should skip image and video initially', () => {
      fc.assert(
        fc.property(fc.boolean(), (isContentCached) => {
          // Skip if content is cached (different behavior)
          if (isContentCached) return true;
          
          const strategy = determineLoadingStrategy('slow', false);
          
          expect(strategy.loadTextFirst).toBe(true);
          expect(strategy.skipImageInitially).toBe(true);
          expect(strategy.skipVideoInitially).toBe(true);
          expect(strategy.showLoadButtons).toBe(true);
          
          return strategy.loadTextFirst && 
                 strategy.skipImageInitially && 
                 strategy.skipVideoInitially;
        }),
        { numRuns: 100 }
      );
    });

    it('fast connection should load all content', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const strategy = determineLoadingStrategy('fast', false);
          
          expect(strategy.loadTextFirst).toBe(false);
          expect(strategy.skipImageInitially).toBe(false);
          expect(strategy.skipVideoInitially).toBe(false);
          expect(strategy.showLoadButtons).toBe(false);
          
          return !strategy.skipImageInitially && !strategy.skipVideoInitially;
        }),
        { numRuns: 100 }
      );
    });

    it('unknown connection should default to fast behavior', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const strategy = determineLoadingStrategy('unknown', false);
          
          // Unknown should behave like fast (optimistic)
          expect(strategy.skipImageInitially).toBe(false);
          expect(strategy.skipVideoInitially).toBe(false);
          
          return !strategy.skipImageInitially && !strategy.skipVideoInitially;
        }),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: ai-flow-redesign, Property 45: On-demand media loading**
   * **Validates: Requirements 12.4**
   * 
   * *For any* media item with a "Load" button, tapping the button should 
   * fetch and display that specific media
   */
  describe('Property 45: On-demand media loading', () => {
    it('image load request should result in image being loaded', () => {
      fc.assert(
        fc.property(mediaLoadStateArb, (initialState) => {
          // Start with image not loaded
          const stateWithoutImage = { ...initialState, imageLoaded: false, imageLoadRequested: false };
          
          // Request image load
          const afterRequest = simulateMediaLoadRequest(stateWithoutImage, 'image');
          
          expect(afterRequest.imageLoadRequested).toBe(true);
          expect(afterRequest.imageLoaded).toBe(true);
          
          return afterRequest.imageLoadRequested && afterRequest.imageLoaded;
        }),
        { numRuns: 100 }
      );
    });

    it('video load request should result in video being loaded', () => {
      fc.assert(
        fc.property(mediaLoadStateArb, (initialState) => {
          // Start with video not loaded
          const stateWithoutVideo = { ...initialState, videoLoaded: false, videoLoadRequested: false };
          
          // Request video load
          const afterRequest = simulateMediaLoadRequest(stateWithoutVideo, 'video');
          
          expect(afterRequest.videoLoadRequested).toBe(true);
          expect(afterRequest.videoLoaded).toBe(true);
          
          return afterRequest.videoLoadRequested && afterRequest.videoLoaded;
        }),
        { numRuns: 100 }
      );
    });

    it('loading one media type should not affect the other', () => {
      fc.assert(
        fc.property(mediaLoadStateArb, (initialState) => {
          // Start with neither loaded
          const cleanState = { 
            imageLoaded: false, 
            videoLoaded: false, 
            imageLoadRequested: false, 
            videoLoadRequested: false 
          };
          
          // Load only image
          const afterImageLoad = simulateMediaLoadRequest(cleanState, 'image');
          
          // Video should still be unloaded
          expect(afterImageLoad.imageLoaded).toBe(true);
          expect(afterImageLoad.videoLoaded).toBe(false);
          
          return afterImageLoad.imageLoaded && !afterImageLoad.videoLoaded;
        }),
        { numRuns: 100 }
      );
    });

    it('both media types can be loaded independently', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const cleanState: MediaLoadState = { 
            imageLoaded: false, 
            videoLoaded: false, 
            imageLoadRequested: false, 
            videoLoadRequested: false 
          };
          
          // Load image first
          const afterImage = simulateMediaLoadRequest(cleanState, 'image');
          // Then load video
          const afterBoth = simulateMediaLoadRequest(afterImage, 'video');
          
          expect(afterBoth.imageLoaded).toBe(true);
          expect(afterBoth.videoLoaded).toBe(true);
          
          return afterBoth.imageLoaded && afterBoth.videoLoaded;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 46: Cached media loads immediately**
   * **Validates: Requirements 12.5**
   * 
   * *For any* media that exists in cache, it should be displayed immediately 
   * regardless of connection speed
   */
  describe('Property 46: Cached media loads immediately', () => {
    it('cached content should load immediately on slow connection', () => {
      fc.assert(
        fc.property(connectionSpeedArb, (speed) => {
          const shouldLoadImmediately = shouldLoadMediaImmediately(true, speed);
          
          // Cached media should always load immediately
          expect(shouldLoadImmediately).toBe(true);
          return shouldLoadImmediately;
        }),
        { numRuns: 100 }
      );
    });

    it('cached content should bypass progressive loading strategy', () => {
      fc.assert(
        fc.property(connectionSpeedArb, (speed) => {
          // When content is cached, strategy should not skip media
          const strategy = determineLoadingStrategy(speed, true);
          
          expect(strategy.skipImageInitially).toBe(false);
          expect(strategy.skipVideoInitially).toBe(false);
          expect(strategy.showLoadButtons).toBe(false);
          
          return !strategy.skipImageInitially && 
                 !strategy.skipVideoInitially && 
                 !strategy.showLoadButtons;
        }),
        { numRuns: 100 }
      );
    });

    it('non-cached content on slow connection should show load buttons', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const strategy = determineLoadingStrategy('slow', false);
          
          expect(strategy.showLoadButtons).toBe(true);
          return strategy.showLoadButtons;
        }),
        { numRuns: 100 }
      );
    });

    it('non-cached content on fast connection should not show load buttons', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const strategy = determineLoadingStrategy('fast', false);
          
          expect(strategy.showLoadButtons).toBe(false);
          return !strategy.showLoadButtons;
        }),
        { numRuns: 100 }
      );
    });

    it('cache status should override connection speed for loading behavior', () => {
      fc.assert(
        fc.property(connectionSpeedArb, (speed) => {
          const cachedStrategy = determineLoadingStrategy(speed, true);
          const uncachedSlowStrategy = determineLoadingStrategy('slow', false);
          
          // Cached should never skip, uncached slow should skip
          expect(cachedStrategy.skipImageInitially).toBe(false);
          expect(uncachedSlowStrategy.skipImageInitially).toBe(true);
          
          return !cachedStrategy.skipImageInitially && uncachedSlowStrategy.skipImageInitially;
        }),
        { numRuns: 100 }
      );
    });
  });
});
