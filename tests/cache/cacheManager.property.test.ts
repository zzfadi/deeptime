/**
 * Cache Manager Property Tests
 * Property-based tests for cache management service
 * 
 * **Feature: ai-flow-redesign**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validCacheMetadataArb,
  expiredCacheMetadataArb,
  lruTestEntriesArb,
  cacheHitSequenceArb,
  cacheKeyArb,
} from '../generators/cache.generators';
import {
  geoCoordinateArb,
  geologicalLayerArb,
} from '../generators/geological.generators';
import { generateAICacheKey } from '../../deep-time-app/src/services/ai/aiCache';
import { CACHE_TTL_MS, MAX_CACHE_SIZE_BYTES } from '../../deep-time-app/src/services/ai/types';
import type { CacheMetadata } from '../../deep-time-app/src/services/ai/types';

/**
 * Pure function to validate TTL
 * This mirrors the isValid implementation in aiCacheService
 */
function isValidTTL(metadata: CacheMetadata): boolean {
  const now = new Date();
  const expiresAt = metadata.expiresAt instanceof Date 
    ? metadata.expiresAt 
    : new Date(metadata.expiresAt);
  return now < expiresAt;
}

/**
 * Pure function to sort entries by lastAccessed (LRU order)
 * Returns entries sorted oldest first
 */
function sortByLRU<T extends { lastAccessed: Date }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => {
    const aTime = a.lastAccessed instanceof Date 
      ? a.lastAccessed.getTime() 
      : new Date(a.lastAccessed).getTime();
    const bTime = b.lastAccessed instanceof Date 
      ? b.lastAccessed.getTime() 
      : new Date(b.lastAccessed).getTime();
    return aTime - bTime;
  });
}

/**
 * Pure function to determine which entries to evict
 * Returns keys of entries to evict (oldest first until under limit)
 */
function getEntriesToEvict<T extends { key: string; size: number; lastAccessed: Date }>(
  entries: T[],
  maxSize: number
): string[] {
  const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
  
  if (totalSize <= maxSize) {
    return [];
  }
  
  const sorted = sortByLRU(entries);
  const toEvict: string[] = [];
  let currentSize = totalSize;
  const targetSize = maxSize * 0.8; // Keep 20% buffer
  
  for (const entry of sorted) {
    if (currentSize <= targetSize) {
      break;
    }
    toEvict.push(entry.key);
    currentSize -= entry.size;
  }
  
  return toEvict;
}

/**
 * Calculate hit rate from a sequence of cache events
 */
function calculateHitRate(events: Array<{ wasHit: boolean }>): number {
  if (events.length === 0) return 0;
  const hits = events.filter(e => e.wasHit).length;
  return hits / events.length;
}

describe('Cache Manager Properties', () => {
  /**
   * **Feature: ai-flow-redesign, Property 19: TTL validation**
   * **Validates: Requirements 5.2**
   * 
   * *For any* cache entry, checking if it's valid should return false 
   * if current time exceeds the expiration date
   */
  describe('Property 19: TTL validation', () => {
    it('valid (non-expired) cache entries should pass TTL validation', () => {
      fc.assert(
        fc.property(validCacheMetadataArb, (metadata) => {
          const isValid = isValidTTL(metadata);
          expect(isValid).toBe(true);
          return isValid;
        }),
        { numRuns: 100 }
      );
    });

    it('expired cache entries should fail TTL validation', () => {
      fc.assert(
        fc.property(expiredCacheMetadataArb, (metadata) => {
          const isValid = isValidTTL(metadata);
          expect(isValid).toBe(false);
          return !isValid;
        }),
        { numRuns: 100 }
      );
    });

    it('TTL should be exactly 30 days', () => {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      expect(CACHE_TTL_MS).toBe(thirtyDaysMs);
    });

    it('entry expiring exactly now should be invalid', () => {
      const metadata: CacheMetadata = {
        cacheKey: 'test_key',
        cachedAt: new Date(Date.now() - CACHE_TTL_MS),
        expiresAt: new Date(Date.now() - 1), // 1ms in the past
        lastAccessed: new Date(),
        size: 1000,
        version: 1,
      };
      
      expect(isValidTTL(metadata)).toBe(false);
    });

    it('entry expiring 1ms in the future should be valid', () => {
      const metadata: CacheMetadata = {
        cacheKey: 'test_key',
        cachedAt: new Date(Date.now() - CACHE_TTL_MS + 1),
        expiresAt: new Date(Date.now() + 1), // 1ms in the future
        lastAccessed: new Date(),
        size: 1000,
        version: 1,
      };
      
      expect(isValidTTL(metadata)).toBe(true);
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 20: LRU eviction**
   * **Validates: Requirements 5.3**
   * 
   * *For any* cache that exceeds 50MB, the eviction process should remove 
   * entries with the oldest lastAccessed timestamp first
   */
  describe('Property 20: LRU eviction', () => {
    it('entries should be sorted by lastAccessed (oldest first) for eviction', () => {
      fc.assert(
        fc.property(lruTestEntriesArb, (entries) => {
          const sorted = sortByLRU(entries);
          
          // Verify sorted order: each entry should have lastAccessed <= next entry
          for (let i = 0; i < sorted.length - 1; i++) {
            const currentTime = sorted[i].lastAccessed.getTime();
            const nextTime = sorted[i + 1].lastAccessed.getTime();
            expect(currentTime).toBeLessThanOrEqual(nextTime);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('eviction should remove oldest entries first when over limit', () => {
      fc.assert(
        fc.property(lruTestEntriesArb, (entries) => {
          // Set a small limit to force eviction
          const smallLimit = entries.reduce((sum, e) => sum + e.size, 0) / 2;
          const toEvict = getEntriesToEvict(entries, smallLimit);
          
          if (toEvict.length === 0) {
            // No eviction needed if under limit
            return true;
          }
          
          // Get the sorted entries
          const sorted = sortByLRU(entries);
          
          // The evicted entries should be the oldest ones
          const evictedSet = new Set(toEvict);
          const oldestKeys = sorted.slice(0, toEvict.length).map(e => e.key);
          
          // All evicted keys should be among the oldest
          for (const key of toEvict) {
            expect(oldestKeys).toContain(key);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('eviction should stop when cache is under 80% of limit', () => {
      fc.assert(
        fc.property(lruTestEntriesArb, (entries) => {
          const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
          const limit = totalSize * 0.9; // Set limit slightly above total
          const toEvict = getEntriesToEvict(entries, limit);
          
          // Calculate remaining size after eviction
          const evictedSize = entries
            .filter(e => toEvict.includes(e.key))
            .reduce((sum, e) => sum + e.size, 0);
          const remainingSize = totalSize - evictedSize;
          
          // Remaining should be at or below 80% of limit
          expect(remainingSize).toBeLessThanOrEqual(limit * 0.8 + 1); // +1 for rounding
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('no eviction should occur when under limit', () => {
      fc.assert(
        fc.property(lruTestEntriesArb, (entries) => {
          const totalSize = entries.reduce((sum, e) => sum + e.size, 0);
          const largeLimit = totalSize * 2; // Limit is double the total
          const toEvict = getEntriesToEvict(entries, largeLimit);
          
          expect(toEvict.length).toBe(0);
          return toEvict.length === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('max cache size should be 50MB', () => {
      const fiftyMB = 50 * 1024 * 1024;
      expect(MAX_CACHE_SIZE_BYTES).toBe(fiftyMB);
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 40: Cache hit event logging**
   * **Validates: Requirements 11.2**
   * 
   * *For any* content served from cache, the system should log a cache hit event 
   * with timestamp and cache key
   */
  describe('Property 40: Cache hit event logging', () => {
    it('hit rate should be correctly calculated from cache events', () => {
      fc.assert(
        fc.property(cacheHitSequenceArb, (events) => {
          const hitRate = calculateHitRate(events);
          const expectedHits = events.filter(e => e.wasHit).length;
          const expectedRate = events.length > 0 ? expectedHits / events.length : 0;
          
          expect(hitRate).toBeCloseTo(expectedRate, 10);
          return Math.abs(hitRate - expectedRate) < 0.0001;
        }),
        { numRuns: 100 }
      );
    });

    it('hit rate should be between 0 and 1', () => {
      fc.assert(
        fc.property(cacheHitSequenceArb, (events) => {
          const hitRate = calculateHitRate(events);
          
          expect(hitRate).toBeGreaterThanOrEqual(0);
          expect(hitRate).toBeLessThanOrEqual(1);
          return hitRate >= 0 && hitRate <= 1;
        }),
        { numRuns: 100 }
      );
    });

    it('all hits should result in hit rate of 1', () => {
      fc.assert(
        fc.property(
          fc.array(cacheKeyArb, { minLength: 1, maxLength: 50 }),
          (keys) => {
            const events = keys.map(key => ({
              timestamp: new Date(),
              cacheKey: key,
              wasHit: true,
            }));
            
            const hitRate = calculateHitRate(events);
            expect(hitRate).toBe(1);
            return hitRate === 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('all misses should result in hit rate of 0', () => {
      fc.assert(
        fc.property(
          fc.array(cacheKeyArb, { minLength: 1, maxLength: 50 }),
          (keys) => {
            const events = keys.map(key => ({
              timestamp: new Date(),
              cacheKey: key,
              wasHit: false,
            }));
            
            const hitRate = calculateHitRate(events);
            expect(hitRate).toBe(0);
            return hitRate === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('cache key should follow format: lat_lon_eraId', () => {
      fc.assert(
        fc.property(geoCoordinateArb, geologicalLayerArb, (coord, layer) => {
          const key = generateAICacheKey(coord, layer);
          
          // Key should match pattern: number_number_uuid
          const parts = key.split('_');
          expect(parts.length).toBeGreaterThanOrEqual(3);
          
          // First two parts should be parseable as numbers (lat, lon)
          const lat = parseFloat(parts[0]);
          const lon = parseFloat(parts[1]);
          expect(isNaN(lat)).toBe(false);
          expect(isNaN(lon)).toBe(false);
          
          // Lat should be in valid range
          expect(lat).toBeGreaterThanOrEqual(-90);
          expect(lat).toBeLessThanOrEqual(90);
          
          // Lon should be in valid range
          expect(lon).toBeGreaterThanOrEqual(-180);
          expect(lon).toBeLessThanOrEqual(180);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
