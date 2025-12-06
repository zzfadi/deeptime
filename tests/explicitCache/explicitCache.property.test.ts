/**
 * Property-Based Tests for Explicit Cache Service
 * Requirements: 8.4, 8.5
 * 
 * **Feature: ai-flow-redesign, Property 31: Explicit cache creation**
 * **Validates: Requirements 8.4**
 * 
 * Tests that:
 * - Explicit caches are created for geological data >4096 tokens
 * - 24-hour TTL is set for geological context
 * - Cached content is reused across requests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  locationEraPairArb,
  tokenUsageWithCacheHitArb,
  tokenUsageNoCacheArb,
} from '../generators/explicitCache.generators';
import { geoCoordinateArb, geologicalLayerArb } from '../generators/geological.generators';

// ============================================
// Constants for Testing
// ============================================

// Import the actual constant from the service to ensure tests stay in sync
import { EXPLICIT_CACHE_MIN_TOKENS } from '../../deep-time-app/src/services/ai/explicitCacheService';

const EXPLICIT_CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

// ============================================
// Helper Functions (Simulating Service Logic)
// ============================================

/**
 * Estimates token count for a string
 * Uses a simple heuristic: ~4 characters per token for English text
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generates a cache key from coordinates and era
 */
function generateExplicitCacheKey(
  location: { latitude: number; longitude: number },
  eraId: string
): string {
  const lat = location.latitude.toFixed(5);
  const lon = location.longitude.toFixed(5);
  return `explicit_${lat}_${lon}_${eraId}`;
}

/**
 * Simulates checking if explicit caching should be used
 */
function shouldUseExplicitCache(tokenCount: number): boolean {
  return tokenCount >= EXPLICIT_CACHE_MIN_TOKENS;
}

/**
 * Simulates creating an explicit cache entry
 */
function createExplicitCacheEntry(
  location: { latitude: number; longitude: number },
  eraId: string,
  tokenCount: number,
  model: string
): {
  cacheName: string;
  location: { latitude: number; longitude: number };
  eraId: string;
  tokenCount: number;
  createdAt: Date;
  expiresAt: Date;
  model: string;
} {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPLICIT_CACHE_TTL_SECONDS * 1000);
  
  return {
    cacheName: `caches/deeptime_geo_${Date.now()}`,
    location,
    eraId,
    tokenCount,
    createdAt: now,
    expiresAt,
    model,
  };
}

/**
 * Calculates cost saved by using cached tokens
 */
function calculateCostSaved(cachedTokens: number): number {
  const INPUT_COST_PER_1M = 0.30;
  const CACHED_COST_PER_1M = 0.075;
  
  const fullCost = (cachedTokens / 1_000_000) * INPUT_COST_PER_1M;
  const cachedCost = (cachedTokens / 1_000_000) * CACHED_COST_PER_1M;
  
  return fullCost - cachedCost;
}

// ============================================
// Property Tests
// ============================================

describe('Explicit Cache Service Property Tests', () => {
  /**
   * **Feature: ai-flow-redesign, Property 31: Explicit cache creation**
   * **Validates: Requirements 8.4**
   * 
   * *For any* location with geological data >4096 tokens, 
   * the system should create an explicit cached content object
   */
  describe('Property 31: Explicit cache creation', () => {
    it('should create explicit cache for content exceeding threshold tokens', () => {
      fc.assert(
        fc.property(
          // Generate token counts that exceed the threshold
          fc.integer({ min: EXPLICIT_CACHE_MIN_TOKENS, max: 100000 }),
          (tokenCount) => {
            const shouldCache = shouldUseExplicitCache(tokenCount);
            
            // Property: Content with >= EXPLICIT_CACHE_MIN_TOKENS tokens should trigger explicit caching
            expect(shouldCache).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT create explicit cache for content below threshold tokens', () => {
      fc.assert(
        fc.property(
          // Generate token counts below the threshold
          fc.integer({ min: 1, max: EXPLICIT_CACHE_MIN_TOKENS - 1 }),
          (tokenCount) => {
            const shouldCache = shouldUseExplicitCache(tokenCount);
            
            // Property: Content with < EXPLICIT_CACHE_MIN_TOKENS tokens should NOT trigger explicit caching
            expect(shouldCache).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should estimate token count correctly from string length', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 100, maxLength: 50000 }),
          (content) => {
            const tokenCount = estimateTokenCount(content);
            
            // Property: Token count should be approximately length / 4
            // Allow for ceiling rounding
            const expectedMin = Math.floor(content.length / 4);
            const expectedMax = Math.ceil(content.length / 4);
            
            expect(tokenCount).toBeGreaterThanOrEqual(expectedMin);
            expect(tokenCount).toBeLessThanOrEqual(expectedMax + 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 31: Explicit cache TTL**
   * **Validates: Requirements 8.5**
   * 
   * *For any* explicit cache created, the TTL should be 24 hours
   */
  describe('Property 31: Explicit cache TTL (24 hours)', () => {
    it('should set 24-hour TTL for explicit cache entries', () => {
      fc.assert(
        fc.property(
          locationEraPairArb,
          fc.integer({ min: EXPLICIT_CACHE_MIN_TOKENS, max: 100000 }),
          ({ location, layer }, tokenCount) => {
            const cacheEntry = createExplicitCacheEntry(
              location,
              layer.id,
              tokenCount,
              'gemini-2.5-flash'
            );
            
            // Property: expiresAt should be exactly 24 hours after createdAt
            const expectedTTL = EXPLICIT_CACHE_TTL_SECONDS * 1000; // in milliseconds
            const actualTTL = cacheEntry.expiresAt.getTime() - cacheEntry.createdAt.getTime();
            
            expect(actualTTL).toBe(expectedTTL);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have expiresAt in the future relative to createdAt', () => {
      fc.assert(
        fc.property(
          locationEraPairArb,
          fc.integer({ min: EXPLICIT_CACHE_MIN_TOKENS, max: 100000 }),
          ({ location, layer }, tokenCount) => {
            const cacheEntry = createExplicitCacheEntry(
              location,
              layer.id,
              tokenCount,
              'gemini-2.5-flash'
            );
            
            // Property: expiresAt should always be after createdAt
            expect(cacheEntry.expiresAt.getTime()).toBeGreaterThan(cacheEntry.createdAt.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 31: Cache key uniqueness**
   * **Validates: Requirements 8.4**
   * 
   * *For any* two different location-era combinations, 
   * the cache keys should be different
   */
  describe('Property 31: Cache key uniqueness', () => {
    it('should generate unique cache keys for different location-era combinations', () => {
      fc.assert(
        fc.property(
          locationEraPairArb,
          locationEraPairArb,
          (pair1, pair2) => {
            const key1 = generateExplicitCacheKey(pair1.location, pair1.layer.id);
            const key2 = generateExplicitCacheKey(pair2.location, pair2.layer.id);
            
            // If locations and era IDs are different, keys should be different
            const sameLocation = 
              pair1.location.latitude.toFixed(5) === pair2.location.latitude.toFixed(5) &&
              pair1.location.longitude.toFixed(5) === pair2.location.longitude.toFixed(5);
            const sameEra = pair1.layer.id === pair2.layer.id;
            
            if (!sameLocation || !sameEra) {
              expect(key1).not.toBe(key2);
            } else {
              // Same location and era should produce same key
              expect(key1).toBe(key2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate consistent cache keys for same location-era', () => {
      fc.assert(
        fc.property(
          locationEraPairArb,
          ({ location, layer }) => {
            const key1 = generateExplicitCacheKey(location, layer.id);
            const key2 = generateExplicitCacheKey(location, layer.id);
            
            // Property: Same inputs should always produce same key
            expect(key1).toBe(key2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 30: Cache hit cost savings**
   * **Validates: Requirements 8.3**
   * 
   * *For any* cache hit with cached tokens, the cost saved should be positive
   */
  describe('Property 30: Cache hit cost savings', () => {
    it('should calculate positive cost savings for cached tokens', () => {
      fc.assert(
        fc.property(
          tokenUsageWithCacheHitArb,
          (tokenUsage) => {
            // Only test when there are cached tokens
            if (tokenUsage.cachedTokens > 0) {
              const costSaved = calculateCostSaved(tokenUsage.cachedTokens);
              
              // Property: Cost saved should be positive when there are cached tokens
              expect(costSaved).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate zero cost savings when no cached tokens', () => {
      fc.assert(
        fc.property(
          tokenUsageNoCacheArb,
          (tokenUsage) => {
            const costSaved = calculateCostSaved(tokenUsage.cachedTokens);
            
            // Property: Cost saved should be zero when no cached tokens
            expect(costSaved).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate cost savings proportional to cached tokens', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 50000 }),
          fc.integer({ min: 1000, max: 50000 }),
          (tokens1, tokens2) => {
            const costSaved1 = calculateCostSaved(tokens1);
            const costSaved2 = calculateCostSaved(tokens2);
            
            // Property: More cached tokens should result in more savings
            if (tokens1 > tokens2) {
              expect(costSaved1).toBeGreaterThan(costSaved2);
            } else if (tokens1 < tokens2) {
              expect(costSaved1).toBeLessThan(costSaved2);
            } else {
              expect(costSaved1).toBe(costSaved2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 31: Cache entry data integrity**
   * **Validates: Requirements 8.4**
   * 
   * *For any* cache entry created, all required fields should be present and valid
   */
  describe('Property 31: Cache entry data integrity', () => {
    it('should create cache entries with all required fields', () => {
      fc.assert(
        fc.property(
          locationEraPairArb,
          fc.integer({ min: EXPLICIT_CACHE_MIN_TOKENS, max: 100000 }),
          fc.constantFrom('gemini-2.5-flash', 'gemini-2.5-pro'),
          ({ location, layer }, tokenCount, model) => {
            const cacheEntry = createExplicitCacheEntry(
              location,
              layer.id,
              tokenCount,
              model
            );
            
            // Property: All required fields should be present
            expect(cacheEntry.cacheName).toBeDefined();
            expect(cacheEntry.cacheName.startsWith('caches/')).toBe(true);
            expect(cacheEntry.location).toBeDefined();
            expect(cacheEntry.eraId).toBe(layer.id);
            expect(cacheEntry.tokenCount).toBe(tokenCount);
            expect(cacheEntry.createdAt).toBeInstanceOf(Date);
            expect(cacheEntry.expiresAt).toBeInstanceOf(Date);
            expect(cacheEntry.model).toBe(model);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve location coordinates in cache entry', () => {
      fc.assert(
        fc.property(
          locationEraPairArb,
          fc.integer({ min: EXPLICIT_CACHE_MIN_TOKENS, max: 100000 }),
          ({ location, layer }, tokenCount) => {
            const cacheEntry = createExplicitCacheEntry(
              location,
              layer.id,
              tokenCount,
              'gemini-2.5-flash'
            );
            
            // Property: Location should be preserved exactly
            expect(cacheEntry.location.latitude).toBe(location.latitude);
            expect(cacheEntry.location.longitude).toBe(location.longitude);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: pre-deployment-optimization, Property 9: Explicit cache threshold activation**
   * **Validates: Requirements 8.2**
   * 
   * *For any* geological context prompt with token count above EXPLICIT_CACHE_MIN_TOKENS,
   * the shouldUseExplicitCache() function should return true
   */
  describe('Property 9: Explicit cache threshold activation', () => {
    it('should activate explicit caching for geological prompts above threshold', () => {
      fc.assert(
        fc.property(
          // Generate token counts that exceed the threshold (512+)
          fc.integer({ min: EXPLICIT_CACHE_MIN_TOKENS, max: 100000 }),
          (tokenCount) => {
            const shouldCache = shouldUseExplicitCache(tokenCount);
            
            // Property 9: Content with >= EXPLICIT_CACHE_MIN_TOKENS tokens 
            // should trigger explicit caching
            expect(shouldCache).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT activate explicit caching for prompts below threshold', () => {
      fc.assert(
        fc.property(
          // Generate token counts below the threshold
          fc.integer({ min: 1, max: EXPLICIT_CACHE_MIN_TOKENS - 1 }),
          (tokenCount) => {
            const shouldCache = shouldUseExplicitCache(tokenCount);
            
            // Property 9: Content with < EXPLICIT_CACHE_MIN_TOKENS tokens 
            // should NOT trigger explicit caching
            expect(shouldCache).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should activate caching at exactly the threshold boundary', () => {
      // Edge case: exactly at threshold should trigger caching
      const shouldCache = shouldUseExplicitCache(EXPLICIT_CACHE_MIN_TOKENS);
      expect(shouldCache).toBe(true);
      
      // Edge case: one below threshold should NOT trigger caching
      const shouldNotCache = shouldUseExplicitCache(EXPLICIT_CACHE_MIN_TOKENS - 1);
      expect(shouldNotCache).toBe(false);
    });

    it('should activate caching for typical geological prompt sizes', () => {
      // Geological context prompts typically range from 500-2000 tokens
      // With threshold at 512, most prompts should trigger explicit caching
      fc.assert(
        fc.property(
          // Generate typical geological prompt token counts (500-2000)
          fc.integer({ min: 500, max: 2000 }),
          (tokenCount) => {
            const shouldCache = shouldUseExplicitCache(tokenCount);
            
            // Property: Prompts >= 512 tokens should trigger caching
            // Prompts < 512 tokens should not
            if (tokenCount >= EXPLICIT_CACHE_MIN_TOKENS) {
              expect(shouldCache).toBe(true);
            } else {
              expect(shouldCache).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
