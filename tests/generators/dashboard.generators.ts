/**
 * Dashboard Generators for Property-Based Testing
 * Generates random dashboard metrics data for testing display accuracy
 * 
 * **Feature: ai-dashboard**
 */

import * as fc from 'fast-check';
import type { DailyCostRecord } from '../../deep-time-app/src/services/ai/types';

// ============================================
// Dashboard Metrics Generators
// ============================================

/**
 * Generate a random daily cost record with consistent totalCost
 * This ensures Property 3 (cost breakdown accuracy) can be tested
 */
export const dashboardDailyCostRecordArb: fc.Arbitrary<DailyCostRecord> = fc.tuple(
  fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  fc.double({ min: 0, max: 50, noNaN: true }),
  fc.double({ min: 0, max: 50, noNaN: true }),
  fc.double({ min: 0, max: 100, noNaN: true }),
  fc.integer({ min: 0, max: 1000 }),
  fc.integer({ min: 0, max: 5000 }),
).map(([date, textCost, imageCost, videoCost, apiCalls, cacheHits]) => ({
  date: date.toISOString().split('T')[0],
  textCost,
  imageCost,
  videoCost,
  totalCost: textCost + imageCost + videoCost,
  apiCalls,
  cacheHits,
}));

/**
 * Generate a daily cost record with zero values (no usage)
 */
export const emptyDailyCostRecordArb: fc.Arbitrary<DailyCostRecord> = fc.date({
  min: new Date('2024-01-01'),
  max: new Date('2025-12-31'),
}).map((date) => ({
  date: date.toISOString().split('T')[0],
  textCost: 0,
  imageCost: 0,
  videoCost: 0,
  totalCost: 0,
  apiCalls: 0,
  cacheHits: 0,
}));

/**
 * Generate a daily cost record with only API calls (no cache hits)
 */
export const noCacheHitsDailyCostRecordArb: fc.Arbitrary<DailyCostRecord> = fc.tuple(
  fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  fc.double({ min: 0.01, max: 50, noNaN: true }),
  fc.double({ min: 0.01, max: 50, noNaN: true }),
  fc.double({ min: 0.01, max: 100, noNaN: true }),
  fc.integer({ min: 1, max: 1000 }),
).map(([date, textCost, imageCost, videoCost, apiCalls]) => ({
  date: date.toISOString().split('T')[0],
  textCost,
  imageCost,
  videoCost,
  totalCost: textCost + imageCost + videoCost,
  apiCalls,
  cacheHits: 0,
}));

/**
 * Generate a daily cost record with only cache hits (no API calls)
 */
export const onlyCacheHitsDailyCostRecordArb: fc.Arbitrary<DailyCostRecord> = fc.tuple(
  fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  fc.integer({ min: 1, max: 5000 }),
).map(([date, cacheHits]) => ({
  date: date.toISOString().split('T')[0],
  textCost: 0,
  imageCost: 0,
  videoCost: 0,
  totalCost: 0,
  apiCalls: 0,
  cacheHits,
}));

/**
 * Generate cache hit rate test data
 * Returns apiCalls and cacheHits with expected rate
 */
export const cacheHitRateDataArb: fc.Arbitrary<{
  apiCalls: number;
  cacheHits: number;
  expectedRate: number;
}> = fc.tuple(
  fc.integer({ min: 0, max: 1000 }),
  fc.integer({ min: 0, max: 5000 }),
).map(([apiCalls, cacheHits]) => {
  const total = apiCalls + cacheHits;
  const expectedRate = total === 0 ? 0 : cacheHits / total;
  return { apiCalls, cacheHits, expectedRate };
});

/**
 * Generate cache hit rate data with 100% hit rate
 */
export const perfectCacheHitRateDataArb: fc.Arbitrary<{
  apiCalls: number;
  cacheHits: number;
  expectedRate: number;
}> = fc.integer({ min: 1, max: 5000 }).map((cacheHits) => ({
  apiCalls: 0,
  cacheHits,
  expectedRate: 1.0,
}));

/**
 * Generate cache hit rate data with 0% hit rate
 */
export const zeroCacheHitRateDataArb: fc.Arbitrary<{
  apiCalls: number;
  cacheHits: number;
  expectedRate: number;
}> = fc.integer({ min: 1, max: 1000 }).map((apiCalls) => ({
  apiCalls,
  cacheHits: 0,
  expectedRate: 0,
}));
