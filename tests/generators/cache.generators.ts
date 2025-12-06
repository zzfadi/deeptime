/**
 * Cache Generators for Property-Based Testing
 * Generates cache-related test data for the CacheManager
 */

import * as fc from 'fast-check';
import type { CacheMetadata, CacheStats } from '../../deep-time-app/src/services/ai/types';
import { CACHE_TTL_MS, MAX_CACHE_SIZE_BYTES } from '../../deep-time-app/src/services/ai/types';
import { geoCoordinateArb, geologicalLayerArb } from './geological.generators';

/**
 * Generate a valid cache key format: ${latitude}_${longitude}_${eraId}
 * Property 18: Cache key format
 */
export const cacheKeyArb: fc.Arbitrary<string> = fc.tuple(
  fc.double({ min: -90, max: 90, noNaN: true }),
  fc.double({ min: -180, max: 180, noNaN: true }),
  fc.uuid()
).map(([lat, lon, eraId]) => `${lat.toFixed(5)}_${lon.toFixed(5)}_${eraId}`);

/**
 * Generate a timestamp within a reasonable range
 */
export const timestampArb: fc.Arbitrary<Date> = fc.date({
  min: new Date('2020-01-01'),
  max: new Date('2030-01-01'),
});

/**
 * Generate a valid (non-expired) cache metadata
 * The expiresAt is in the future relative to now
 */
export const validCacheMetadataArb: fc.Arbitrary<CacheMetadata> = fc.record({
  cacheKey: cacheKeyArb,
  cachedAt: timestampArb,
  // expiresAt is in the future (valid)
  expiresAt: fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }).map(
    (futureMs) => new Date(Date.now() + futureMs)
  ),
  lastAccessed: timestampArb,
  size: fc.integer({ min: 100, max: 10 * 1024 * 1024 }), // 100 bytes to 10MB
  version: fc.integer({ min: 1, max: 10 }),
});

/**
 * Generate an expired cache metadata
 * The expiresAt is in the past relative to now
 */
export const expiredCacheMetadataArb: fc.Arbitrary<CacheMetadata> = fc.record({
  cacheKey: cacheKeyArb,
  cachedAt: fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2023-01-01'),
  }),
  // expiresAt is in the past (expired)
  expiresAt: fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }).map(
    (pastMs) => new Date(Date.now() - pastMs)
  ),
  lastAccessed: fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2023-01-01'),
  }),
  size: fc.integer({ min: 100, max: 10 * 1024 * 1024 }),
  version: fc.integer({ min: 1, max: 10 }),
});

/**
 * Generate cache metadata with specific TTL offset from now
 * Positive offset = future (valid), negative offset = past (expired)
 */
export const cacheMetadataWithTTLOffsetArb = (offsetMs: number): fc.Arbitrary<CacheMetadata> =>
  fc.record({
    cacheKey: cacheKeyArb,
    cachedAt: fc.constant(new Date(Date.now() - CACHE_TTL_MS + offsetMs)),
    expiresAt: fc.constant(new Date(Date.now() + offsetMs)),
    lastAccessed: fc.constant(new Date()),
    size: fc.integer({ min: 100, max: 1024 * 1024 }),
    version: fc.constant(1),
  });

/**
 * Generate a list of cache entries with varying lastAccessed timestamps
 * for LRU eviction testing
 */
export interface LRUTestEntry {
  key: string;
  lastAccessed: Date;
  size: number;
}

export const lruTestEntriesArb: fc.Arbitrary<LRUTestEntry[]> = fc
  .array(
    fc.record({
      key: cacheKeyArb,
      // Spread lastAccessed over a range to ensure different timestamps
      lastAccessedOffset: fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 }), // 0-30 days
      size: fc.integer({ min: 1024, max: 5 * 1024 * 1024 }), // 1KB to 5MB
    }),
    { minLength: 3, maxLength: 20 }
  )
  .map((entries) => {
    const baseTime = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    return entries.map((e) => ({
      key: e.key,
      lastAccessed: new Date(baseTime + e.lastAccessedOffset),
      size: e.size,
    }));
  });

/**
 * Generate cache stats
 */
export const cacheStatsArb: fc.Arbitrary<CacheStats> = fc.record({
  totalEntries: fc.integer({ min: 0, max: 1000 }),
  totalSize: fc.integer({ min: 0, max: MAX_CACHE_SIZE_BYTES }),
  hitRate: fc.double({ min: 0, max: 1, noNaN: true }),
  oldestEntry: timestampArb,
  newestEntry: timestampArb,
});

/**
 * Generate a cache hit event for logging tests
 */
export interface CacheHitEvent {
  timestamp: Date;
  cacheKey: string;
  wasHit: boolean;
}

export const cacheHitEventArb: fc.Arbitrary<CacheHitEvent> = fc.record({
  timestamp: timestampArb,
  cacheKey: cacheKeyArb,
  wasHit: fc.boolean(),
});

/**
 * Generate a sequence of cache hit events for hit rate calculation
 */
export const cacheHitSequenceArb: fc.Arbitrary<CacheHitEvent[]> = fc.array(
  cacheHitEventArb,
  { minLength: 1, maxLength: 100 }
);
