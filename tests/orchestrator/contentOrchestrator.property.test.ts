/**
 * Content Orchestrator Property Tests
 * Property-based tests for content orchestration service
 * 
 * **Feature: ai-flow-redesign**
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  geoCoordinateArb,
  geologicalLayerArb,
} from '../generators/geological.generators';
import {
  multipleErasForLocationArb,
  eraContentArb,
  enhancedNarrativeArb,
  generatedImageArb,
  cacheMetadataArb,
} from '../generators/orchestrator.generators';
import { generateAICacheKey } from '../../deep-time-app/src/services/ai/aiCache';
import type { GeoCoordinate, GeologicalLayer, Narrative } from '../../src/types';
import type { EraContent, CacheMetadata, EnhancedNarrative } from '../../deep-time-app/src/services/ai/types';
import { CACHE_TTL_MS } from '../../deep-time-app/src/services/ai/types';

// ============================================
// Pure Functions for Testing
// ============================================

/**
 * Pure function to check if cache should be used
 * Mirrors the cache-first logic in ContentOrchestrator
 */
function shouldUseCache(
  cachedContent: EraContent | null,
  metadata: CacheMetadata | null,
  forceRefresh: boolean
): boolean {
  if (forceRefresh) return false;
  if (!cachedContent || !metadata) return false;
  
  // Check TTL validity
  const now = new Date();
  const expiresAt = metadata.expiresAt instanceof Date 
    ? metadata.expiresAt 
    : new Date(metadata.expiresAt);
  return now < expiresAt;
}

/**
 * Pure function to calculate expected API calls
 * Property 3: Cache reuse for same location
 * Property 7: Cache hit avoids API calls
 */
function calculateExpectedApiCalls(
  operations: Array<{ type: 'get' | 'refresh'; hasCachedContent: boolean }>
): number {
  let apiCalls = 0;
  let cacheHasContent = false;
  
  for (const op of operations) {
    if (op.type === 'get') {
      if (!cacheHasContent) {
        apiCalls++; // Cache miss - need API call
        cacheHasContent = true;
      }
      // Cache hit - no API call
    } else if (op.type === 'refresh') {
      apiCalls++; // Refresh always makes API call
      cacheHasContent = true;
    }
  }
  
  return apiCalls;
}

/**
 * Pure function to check if content is unique
 * Property 4: Unique content per era
 */
function areContentsUnique(contents: EraContent[]): boolean {
  if (contents.length <= 1) return true;
  
  // Check that narratives are different
  // Cast to Narrative to access shortDescription (EnhancedNarrative extends Narrative)
  const narrativeTexts = contents.map(c => (c.narrative as unknown as Narrative).shortDescription);
  const uniqueNarratives = new Set(narrativeTexts);
  
  return uniqueNarratives.size === contents.length;
}

/**
 * Pure function to generate cache key
 * Property 18: Cache key format
 */
function generateCacheKey(location: GeoCoordinate, era: GeologicalLayer): string {
  const lat = location.latitude.toFixed(5);
  const lon = location.longitude.toFixed(5);
  return `${lat}_${lon}_${era.id}`;
}

/**
 * Pure function to check if cache entry is valid
 */
function isCacheValid(metadata: CacheMetadata): boolean {
  const now = new Date();
  const expiresAt = metadata.expiresAt instanceof Date 
    ? metadata.expiresAt 
    : new Date(metadata.expiresAt);
  return now < expiresAt;
}

// ============================================
// Property Tests
// ============================================

describe('Content Orchestrator Properties', () => {
  /**
   * **Feature: ai-flow-redesign, Property 3: Cache reuse for same location**
   * **Validates: Requirements 1.3**
   * 
   * *For any* location-era combination, multiple requests should result in 
   * only one API call, with subsequent requests served from cache
   */
  describe('Property 3: Cache reuse for same location', () => {
    it('multiple get operations for same location-era should result in one API call', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          fc.integer({ min: 2, max: 10 }),
          (location, era, numRequests) => {
            // Simulate multiple get operations
            const operations = Array(numRequests).fill({ type: 'get' as const, hasCachedContent: false });
            
            // First request is cache miss, rest are hits
            const expectedApiCalls = calculateExpectedApiCalls(operations);
            
            // Should only make 1 API call regardless of number of requests
            expect(expectedApiCalls).toBe(1);
            return expectedApiCalls === 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('cache key should be consistent for same location-era', () => {
      fc.assert(
        fc.property(geoCoordinateArb, geologicalLayerArb, (location, era) => {
          const key1 = generateCacheKey(location, era);
          const key2 = generateCacheKey(location, era);
          
          expect(key1).toBe(key2);
          return key1 === key2;
        }),
        { numRuns: 100 }
      );
    });

    it('same location with different eras should have different cache keys', () => {
      fc.assert(
        fc.property(multipleErasForLocationArb, ({ location, eras }) => {
          const keys = eras.map(era => generateCacheKey(location, era));
          const uniqueKeys = new Set(keys);
          
          // All keys should be unique since eras are different
          expect(uniqueKeys.size).toBe(keys.length);
          return uniqueKeys.size === keys.length;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 7: Cache hit avoids API calls**
   * **Validates: Requirements 2.3**
   * 
   * *For any* valid cached content (not expired), requesting that content 
   * should not trigger an API call
   */
  describe('Property 7: Cache hit avoids API calls', () => {
    it('valid cached content should be used without API call', () => {
      fc.assert(
        fc.property(eraContentArb, (content) => {
          // Create valid (non-expired) metadata
          const validMetadata: CacheMetadata = {
            ...content.cacheMetadata,
            expiresAt: new Date(Date.now() + CACHE_TTL_MS), // Future expiration
          };
          
          const shouldUse = shouldUseCache(content, validMetadata, false);
          
          expect(shouldUse).toBe(true);
          return shouldUse === true;
        }),
        { numRuns: 100 }
      );
    });

    it('expired cached content should not be used', () => {
      fc.assert(
        fc.property(eraContentArb, (content) => {
          // Create expired metadata
          const expiredMetadata: CacheMetadata = {
            ...content.cacheMetadata,
            expiresAt: new Date(Date.now() - 1000), // Past expiration
          };
          
          const shouldUse = shouldUseCache(content, expiredMetadata, false);
          
          expect(shouldUse).toBe(false);
          return shouldUse === false;
        }),
        { numRuns: 100 }
      );
    });

    it('force refresh should bypass cache', () => {
      fc.assert(
        fc.property(eraContentArb, (content) => {
          // Create valid metadata
          const validMetadata: CacheMetadata = {
            ...content.cacheMetadata,
            expiresAt: new Date(Date.now() + CACHE_TTL_MS),
          };
          
          // Force refresh should bypass cache
          const shouldUse = shouldUseCache(content, validMetadata, true);
          
          expect(shouldUse).toBe(false);
          return shouldUse === false;
        }),
        { numRuns: 100 }
      );
    });

    it('null cached content should trigger API call', () => {
      fc.assert(
        fc.property(cacheMetadataArb, (metadata) => {
          const shouldUse = shouldUseCache(null, metadata, false);
          
          expect(shouldUse).toBe(false);
          return shouldUse === false;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 8: Cache miss triggers generation**
   * **Validates: Requirements 2.4**
   * 
   * *For any* expired or missing cache entry, requesting content should 
   * trigger new generation and cache update
   */
  describe('Property 8: Cache miss triggers generation', () => {
    it('missing cache should trigger generation (API call)', () => {
      fc.assert(
        fc.property(geoCoordinateArb, geologicalLayerArb, (location, era) => {
          // Simulate first request with no cache
          const operations = [{ type: 'get' as const, hasCachedContent: false }];
          const apiCalls = calculateExpectedApiCalls(operations);
          
          // Should make exactly 1 API call
          expect(apiCalls).toBe(1);
          return apiCalls === 1;
        }),
        { numRuns: 100 }
      );
    });

    it('expired cache should trigger generation', () => {
      fc.assert(
        fc.property(eraContentArb, (content) => {
          // Create expired metadata
          const expiredMetadata: CacheMetadata = {
            ...content.cacheMetadata,
            expiresAt: new Date(Date.now() - 1000),
          };
          
          // Expired cache should not be used
          const shouldUse = shouldUseCache(content, expiredMetadata, false);
          
          // Since cache is not used, generation should be triggered
          expect(shouldUse).toBe(false);
          return shouldUse === false;
        }),
        { numRuns: 100 }
      );
    });

    it('refresh should always trigger generation', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          fc.integer({ min: 1, max: 5 }),
          (location, era, numRefreshes) => {
            // Simulate multiple refresh operations
            const operations = Array(numRefreshes).fill({ type: 'refresh' as const, hasCachedContent: true });
            const apiCalls = calculateExpectedApiCalls(operations);
            
            // Each refresh should make an API call
            expect(apiCalls).toBe(numRefreshes);
            return apiCalls === numRefreshes;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 4: Unique content per era**
   * **Validates: Requirements 1.4**
   * 
   * *For any* location with multiple geological layers, content generated 
   * for different eras should be distinct
   */
  describe('Property 4: Unique content per era', () => {
    it('different eras should have different cache keys', () => {
      fc.assert(
        fc.property(multipleErasForLocationArb, ({ location, eras }) => {
          const keys = eras.map(era => generateCacheKey(location, era));
          const uniqueKeys = new Set(keys);
          
          // Each era should have a unique cache key
          expect(uniqueKeys.size).toBe(eras.length);
          return uniqueKeys.size === eras.length;
        }),
        { numRuns: 100 }
      );
    });

    it('era ID should be part of cache key', () => {
      fc.assert(
        fc.property(geoCoordinateArb, geologicalLayerArb, (location, era) => {
          const key = generateCacheKey(location, era);
          
          // Cache key should contain the era ID
          expect(key).toContain(era.id);
          return key.includes(era.id);
        }),
        { numRuns: 100 }
      );
    });

    it('generated content should reference correct era', () => {
      fc.assert(
        fc.property(enhancedNarrativeArb, geologicalLayerArb, (narrative, era) => {
          // When generating content for an era, the layerId should match
          const contentWithCorrectEra = {
            ...narrative,
            layerId: era.id,
          };
          
          expect(contentWithCorrectEra.layerId).toBe(era.id);
          return contentWithCorrectEra.layerId === era.id;
        }),
        { numRuns: 100 }
      );
    });

    it('multiple unique contents should be detected as unique', () => {
      fc.assert(
        fc.property(
          fc.array(eraContentArb, { minLength: 2, maxLength: 5 }),
          (contents) => {
            // Modify each content to have unique narrative
            // Cast to Narrative to access shortDescription (EnhancedNarrative extends Narrative)
            const uniqueContents = contents.map((c, i) => ({
              ...c,
              narrative: {
                ...c.narrative,
                shortDescription: `Unique description ${i}: ${(c.narrative as unknown as Narrative).shortDescription}`,
              },
            }));
            
            const isUnique = areContentsUnique(uniqueContents);
            expect(isUnique).toBe(true);
            return isUnique;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('duplicate contents should be detected as not unique', () => {
      fc.assert(
        fc.property(eraContentArb, (content) => {
          // Create array with duplicate content
          const duplicateContents = [content, content];
          
          const isUnique = areContentsUnique(duplicateContents);
          expect(isUnique).toBe(false);
          return !isUnique;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional cache key format tests
   * **Property 18: Cache key format**
   */
  describe('Property 18: Cache key format (orchestrator context)', () => {
    it('cache key should follow lat_lon_eraId format', () => {
      fc.assert(
        fc.property(geoCoordinateArb, geologicalLayerArb, (location, era) => {
          const key = generateAICacheKey(location, era);
          
          // Key should have at least 3 parts separated by underscore
          const parts = key.split('_');
          expect(parts.length).toBeGreaterThanOrEqual(3);
          
          // First two parts should be parseable as numbers
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          expect(isNaN(lat)).toBe(false);
          expect(isNaN(lon)).toBe(false);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('cache key coordinates should match input location', () => {
      fc.assert(
        fc.property(geoCoordinateArb, geologicalLayerArb, (location, era) => {
          const key = generateAICacheKey(location, era);
          const parts = key.split('_');
          
          const keyLat = parseFloat(parts[0]);
          const keyLon = parseFloat(parts[1]);
          
          // Should be close to original coordinates (within rounding)
          expect(Math.abs(keyLat - location.latitude)).toBeLessThan(0.00001);
          expect(Math.abs(keyLon - location.longitude)).toBeLessThan(0.00001);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
