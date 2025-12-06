/**
 * Generators for Explicit Cache Service Property Tests
 * Requirements: 8.4, 8.5
 */

import * as fc from 'fast-check';
import { geoCoordinateArb, geologicalLayerArb } from './geological.generators';
import type { GeoCoordinate, GeologicalLayer } from '../../src/types';

// ============================================
// Location Context Generators
// ============================================

/**
 * Generator for location context
 */
export const locationContextArb = fc.record({
  coordinates: geoCoordinateArb,
  placeName: fc.string({ minLength: 1, maxLength: 100 }),
  geologicalFeatures: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
  nearbyLandmarks: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
});

// ============================================
// Explicit Cache Entry Generators
// ============================================

/**
 * Generator for explicit cache entry
 */
export const explicitCacheEntryArb = fc.record({
  cacheName: fc.string({ minLength: 10, maxLength: 100 }).map(s => `caches/${s}`),
  location: geoCoordinateArb,
  eraId: fc.uuid(),
  displayName: fc.string({ minLength: 5, maxLength: 50 }),
  tokenCount: fc.integer({ min: 4096, max: 100000 }),
  createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  expiresAt: fc.date({ min: new Date('2024-01-02'), max: new Date('2026-01-01') }),
  model: fc.constantFrom('gemini-2.5-flash', 'gemini-2.5-pro'),
});

// ============================================
// Token Usage Generators
// ============================================

/**
 * Generator for token usage with cache hits
 */
export const tokenUsageWithCacheHitArb = fc.record({
  inputTokens: fc.integer({ min: 1000, max: 50000 }),
  outputTokens: fc.integer({ min: 100, max: 5000 }),
  cachedTokens: fc.integer({ min: 100, max: 40000 }),
  totalCost: fc.double({ min: 0, max: 1, noNaN: true }),
}).filter(usage => usage.cachedTokens <= usage.inputTokens);

/**
 * Generator for token usage without cache hits
 */
export const tokenUsageNoCacheArb = fc.record({
  inputTokens: fc.integer({ min: 1000, max: 50000 }),
  outputTokens: fc.integer({ min: 100, max: 5000 }),
  cachedTokens: fc.constant(0),
  totalCost: fc.double({ min: 0, max: 1, noNaN: true }),
});

/**
 * Generator for any token usage
 */
export const tokenUsageArb = fc.oneof(tokenUsageWithCacheHitArb, tokenUsageNoCacheArb);

// ============================================
// Large Content Generators (for explicit caching threshold)
// ============================================

/**
 * Generator for content that exceeds the explicit cache threshold (>4096 tokens)
 * Approximately 4 characters per token, so >16384 characters
 */
export const largeContentArb = fc.string({ minLength: 17000, maxLength: 50000 });

/**
 * Generator for content below the explicit cache threshold
 */
export const smallContentArb = fc.string({ minLength: 100, maxLength: 4000 });

// ============================================
// Location-Era Pair Generators
// ============================================

/**
 * Generator for location-era pairs
 */
export const locationEraPairArb: fc.Arbitrary<{ location: GeoCoordinate; layer: GeologicalLayer }> = fc.record({
  location: geoCoordinateArb,
  layer: geologicalLayerArb,
});

/**
 * Generator for multiple unique location-era pairs
 */
export const uniqueLocationEraPairsArb = (count: number) =>
  fc.array(locationEraPairArb, { minLength: count, maxLength: count });

// ============================================
// Cache Hit Event Generators
// ============================================

/**
 * Generator for cache hit events
 */
export const cacheHitEventArb = fc.record({
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  type: fc.constantFrom('implicit', 'explicit', 'local') as fc.Arbitrary<'implicit' | 'explicit' | 'local'>,
  cachedTokens: fc.integer({ min: 0, max: 50000 }),
  totalInputTokens: fc.integer({ min: 1000, max: 100000 }),
  costSaved: fc.double({ min: 0, max: 0.1, noNaN: true }),
  cacheKey: fc.option(fc.string({ minLength: 10, maxLength: 50 }), { nil: undefined }),
  model: fc.option(fc.constantFrom('gemini-2.5-flash', 'gemini-2.5-pro'), { nil: undefined }),
  requestType: fc.option(fc.constantFrom('text', 'image', 'video') as fc.Arbitrary<'text' | 'image' | 'video'>, { nil: undefined }),
});

// ============================================
// Cache Stats Generators
// ============================================

/**
 * Generator for cache hit statistics
 */
export const cacheHitStatsArb = fc.record({
  totalRequests: fc.integer({ min: 0, max: 10000 }),
  requestsWithCacheHits: fc.integer({ min: 0, max: 10000 }),
  totalCachedTokens: fc.integer({ min: 0, max: 1000000 }),
  totalInputTokens: fc.integer({ min: 0, max: 2000000 }),
  cacheHitRate: fc.double({ min: 0, max: 1, noNaN: true }),
  tokenCacheRate: fc.double({ min: 0, max: 1, noNaN: true }),
  totalCostSaved: fc.double({ min: 0, max: 100, noNaN: true }),
  avgCachedTokensPerHit: fc.double({ min: 0, max: 50000, noNaN: true }),
}).filter(stats => stats.requestsWithCacheHits <= stats.totalRequests);
