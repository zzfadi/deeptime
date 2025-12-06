/**
 * AI Dashboard Property Tests
 * Property-based tests for dashboard metrics display accuracy
 * 
 * **Feature: ai-dashboard**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  dashboardDailyCostRecordArb,
  emptyDailyCostRecordArb,
  noCacheHitsDailyCostRecordArb,
  onlyCacheHitsDailyCostRecordArb,
  cacheHitRateDataArb,
  perfectCacheHitRateDataArb,
  zeroCacheHitRateDataArb,
} from '../generators/dashboard.generators';
import {
  transformToDashboardMetrics,
  calculateCacheHitRate,
} from '../../deep-time-app/src/components/AIDashboard';
import type { DailyCostRecord } from '../../deep-time-app/src/services/ai/types';

describe('AI Dashboard Properties', () => {
  /**
   * **Feature: ai-dashboard, Property 1: Metrics display accuracy**
   * **Validates: Requirements 1.1**
   * 
   * *For any* DailyCostRecord, the dashboard SHALL display values that exactly match 
   * the record's apiCalls, cacheHits, and totalCost fields.
   */
  describe('Property 1: Metrics display accuracy', () => {
    it('dashboard metrics should exactly match DailyCostRecord values', () => {
      fc.assert(
        fc.property(dashboardDailyCostRecordArb, (record) => {
          const metrics = transformToDashboardMetrics(record);
          
          // Metrics should exactly match the record
          expect(metrics.apiCalls).toBe(record.apiCalls);
          expect(metrics.cacheHits).toBe(record.cacheHits);
          expect(metrics.totalCost).toBe(record.totalCost);
          expect(metrics.textCost).toBe(record.textCost);
          expect(metrics.imageCost).toBe(record.imageCost);
          expect(metrics.videoCost).toBe(record.videoCost);
          
          return (
            metrics.apiCalls === record.apiCalls &&
            metrics.cacheHits === record.cacheHits &&
            metrics.totalCost === record.totalCost &&
            metrics.textCost === record.textCost &&
            metrics.imageCost === record.imageCost &&
            metrics.videoCost === record.videoCost
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should handle null record by returning zero values', () => {
      const metrics = transformToDashboardMetrics(null);
      
      expect(metrics.apiCalls).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.totalCost).toBe(0);
      expect(metrics.textCost).toBe(0);
      expect(metrics.imageCost).toBe(0);
      expect(metrics.videoCost).toBe(0);
      expect(metrics.cacheHitRate).toBe(0);
    });

    it('should handle empty record (no usage) correctly', () => {
      fc.assert(
        fc.property(emptyDailyCostRecordArb, (record) => {
          const metrics = transformToDashboardMetrics(record);
          
          expect(metrics.apiCalls).toBe(0);
          expect(metrics.cacheHits).toBe(0);
          expect(metrics.totalCost).toBe(0);
          expect(metrics.textCost).toBe(0);
          expect(metrics.imageCost).toBe(0);
          expect(metrics.videoCost).toBe(0);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('all displayed values should be non-negative', () => {
      fc.assert(
        fc.property(dashboardDailyCostRecordArb, (record) => {
          const metrics = transformToDashboardMetrics(record);
          
          expect(metrics.apiCalls).toBeGreaterThanOrEqual(0);
          expect(metrics.cacheHits).toBeGreaterThanOrEqual(0);
          expect(metrics.totalCost).toBeGreaterThanOrEqual(0);
          expect(metrics.textCost).toBeGreaterThanOrEqual(0);
          expect(metrics.imageCost).toBeGreaterThanOrEqual(0);
          expect(metrics.videoCost).toBeGreaterThanOrEqual(0);
          expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
          expect(metrics.cacheHitRate).toBeLessThanOrEqual(1);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-dashboard, Property 2: Cache hit rate calculation**
   * **Validates: Requirements 1.2**
   * 
   * *For any* combination of apiCalls and cacheHits where total > 0, 
   * the displayed cache hit rate SHALL equal cacheHits / (apiCalls + cacheHits) * 100.
   */
  describe('Property 2: Cache hit rate calculation', () => {
    it('cache hit rate should equal cacheHits / (apiCalls + cacheHits)', () => {
      fc.assert(
        fc.property(cacheHitRateDataArb, ({ apiCalls, cacheHits, expectedRate }) => {
          const actualRate = calculateCacheHitRate(apiCalls, cacheHits);
          
          // Rate should match expected calculation
          expect(actualRate).toBeCloseTo(expectedRate, 10);
          
          return Math.abs(actualRate - expectedRate) < 0.0000001;
        }),
        { numRuns: 100 }
      );
    });

    it('cache hit rate should be 0 when both apiCalls and cacheHits are 0', () => {
      const rate = calculateCacheHitRate(0, 0);
      expect(rate).toBe(0);
    });

    it('cache hit rate should be 1.0 (100%) when only cache hits exist', () => {
      fc.assert(
        fc.property(perfectCacheHitRateDataArb, ({ apiCalls, cacheHits, expectedRate }) => {
          const actualRate = calculateCacheHitRate(apiCalls, cacheHits);
          
          expect(actualRate).toBe(1.0);
          expect(actualRate).toBe(expectedRate);
          
          return actualRate === 1.0;
        }),
        { numRuns: 100 }
      );
    });

    it('cache hit rate should be 0 when only API calls exist (no cache hits)', () => {
      fc.assert(
        fc.property(zeroCacheHitRateDataArb, ({ apiCalls, cacheHits, expectedRate }) => {
          const actualRate = calculateCacheHitRate(apiCalls, cacheHits);
          
          expect(actualRate).toBe(0);
          expect(actualRate).toBe(expectedRate);
          
          return actualRate === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('cache hit rate should always be between 0 and 1', () => {
      fc.assert(
        fc.property(cacheHitRateDataArb, ({ apiCalls, cacheHits }) => {
          const rate = calculateCacheHitRate(apiCalls, cacheHits);
          
          expect(rate).toBeGreaterThanOrEqual(0);
          expect(rate).toBeLessThanOrEqual(1);
          
          return rate >= 0 && rate <= 1;
        }),
        { numRuns: 100 }
      );
    });

    it('transformToDashboardMetrics should include correct cache hit rate', () => {
      fc.assert(
        fc.property(dashboardDailyCostRecordArb, (record) => {
          const metrics = transformToDashboardMetrics(record);
          const expectedRate = calculateCacheHitRate(record.apiCalls, record.cacheHits);
          
          expect(metrics.cacheHitRate).toBeCloseTo(expectedRate, 10);
          
          return Math.abs(metrics.cacheHitRate - expectedRate) < 0.0000001;
        }),
        { numRuns: 100 }
      );
    });

    it('cache hit rate should increase when cache hits increase', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (apiCalls, cacheHits1, additionalCacheHits) => {
            const rate1 = calculateCacheHitRate(apiCalls, cacheHits1);
            const rate2 = calculateCacheHitRate(apiCalls, cacheHits1 + additionalCacheHits);
            
            // Rate should increase when cache hits increase
            expect(rate2).toBeGreaterThan(rate1);
            
            return rate2 > rate1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('cache hit rate should decrease when API calls increase', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (apiCalls1, cacheHits, additionalApiCalls) => {
            const rate1 = calculateCacheHitRate(apiCalls1, cacheHits);
            const rate2 = calculateCacheHitRate(apiCalls1 + additionalApiCalls, cacheHits);
            
            // Rate should decrease when API calls increase (assuming cache hits stay same)
            expect(rate2).toBeLessThan(rate1);
            
            return rate2 < rate1;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-dashboard, Property 3: Cost breakdown accuracy**
   * **Validates: Requirements 1.3**
   * 
   * *For any* DailyCostRecord, the sum of displayed textCost, imageCost, and videoCost 
   * SHALL equal the totalCost (within floating point tolerance).
   */
  describe('Property 3: Cost breakdown accuracy', () => {
    it('sum of cost breakdown should equal totalCost', () => {
      fc.assert(
        fc.property(dashboardDailyCostRecordArb, (record) => {
          const metrics = transformToDashboardMetrics(record);
          
          const sumOfBreakdown = metrics.textCost + metrics.imageCost + metrics.videoCost;
          
          // Sum should equal totalCost within floating point tolerance
          expect(sumOfBreakdown).toBeCloseTo(metrics.totalCost, 10);
          
          return Math.abs(sumOfBreakdown - metrics.totalCost) < 0.0001;
        }),
        { numRuns: 100 }
      );
    });

    it('cost breakdown should match original record breakdown', () => {
      fc.assert(
        fc.property(dashboardDailyCostRecordArb, (record) => {
          const metrics = transformToDashboardMetrics(record);
          
          // Each cost component should match the record
          expect(metrics.textCost).toBe(record.textCost);
          expect(metrics.imageCost).toBe(record.imageCost);
          expect(metrics.videoCost).toBe(record.videoCost);
          
          // And their sum should equal totalCost
          const sumOfBreakdown = metrics.textCost + metrics.imageCost + metrics.videoCost;
          expect(sumOfBreakdown).toBeCloseTo(record.totalCost, 10);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('cost breakdown should be consistent with totalCost for records with no cache hits', () => {
      fc.assert(
        fc.property(noCacheHitsDailyCostRecordArb, (record) => {
          const metrics = transformToDashboardMetrics(record);
          
          const sumOfBreakdown = metrics.textCost + metrics.imageCost + metrics.videoCost;
          
          expect(sumOfBreakdown).toBeCloseTo(metrics.totalCost, 10);
          expect(metrics.totalCost).toBeGreaterThan(0); // Should have some cost
          
          return Math.abs(sumOfBreakdown - metrics.totalCost) < 0.0001;
        }),
        { numRuns: 100 }
      );
    });

    it('cost breakdown should be zero when only cache hits exist', () => {
      fc.assert(
        fc.property(onlyCacheHitsDailyCostRecordArb, (record) => {
          const metrics = transformToDashboardMetrics(record);
          
          // All costs should be zero when only cache hits exist
          expect(metrics.textCost).toBe(0);
          expect(metrics.imageCost).toBe(0);
          expect(metrics.videoCost).toBe(0);
          expect(metrics.totalCost).toBe(0);
          
          const sumOfBreakdown = metrics.textCost + metrics.imageCost + metrics.videoCost;
          expect(sumOfBreakdown).toBe(0);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('each cost component should be non-negative', () => {
      fc.assert(
        fc.property(dashboardDailyCostRecordArb, (record) => {
          const metrics = transformToDashboardMetrics(record);
          
          expect(metrics.textCost).toBeGreaterThanOrEqual(0);
          expect(metrics.imageCost).toBeGreaterThanOrEqual(0);
          expect(metrics.videoCost).toBeGreaterThanOrEqual(0);
          
          return (
            metrics.textCost >= 0 &&
            metrics.imageCost >= 0 &&
            metrics.videoCost >= 0
          );
        }),
        { numRuns: 100 }
      );
    });

    it('totalCost should be at least as large as any individual cost component', () => {
      fc.assert(
        fc.property(dashboardDailyCostRecordArb, (record) => {
          const metrics = transformToDashboardMetrics(record);
          
          expect(metrics.totalCost).toBeGreaterThanOrEqual(metrics.textCost);
          expect(metrics.totalCost).toBeGreaterThanOrEqual(metrics.imageCost);
          expect(metrics.totalCost).toBeGreaterThanOrEqual(metrics.videoCost);
          
          return (
            metrics.totalCost >= metrics.textCost &&
            metrics.totalCost >= metrics.imageCost &&
            metrics.totalCost >= metrics.videoCost
          );
        }),
        { numRuns: 100 }
      );
    });

    it('cost breakdown percentages should sum to 100% when totalCost > 0', () => {
      fc.assert(
        fc.property(
          dashboardDailyCostRecordArb.filter((record) => record.totalCost > 0),
          (record) => {
            const metrics = transformToDashboardMetrics(record);
            
            const textPercentage = (metrics.textCost / metrics.totalCost) * 100;
            const imagePercentage = (metrics.imageCost / metrics.totalCost) * 100;
            const videoPercentage = (metrics.videoCost / metrics.totalCost) * 100;
            
            const sumOfPercentages = textPercentage + imagePercentage + videoPercentage;
            
            // Sum of percentages should be 100% (within floating point tolerance)
            expect(sumOfPercentages).toBeCloseTo(100, 5);
            
            return Math.abs(sumOfPercentages - 100) < 0.01;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Integration Properties
   * Test the complete transformation pipeline
   */
  describe('Integration Properties', () => {
    it('transformToDashboardMetrics should preserve all record data', () => {
      fc.assert(
        fc.property(dashboardDailyCostRecordArb, (record) => {
          const metrics = transformToDashboardMetrics(record);
          
          // All fields should be preserved
          expect(metrics.apiCalls).toBe(record.apiCalls);
          expect(metrics.cacheHits).toBe(record.cacheHits);
          expect(metrics.totalCost).toBe(record.totalCost);
          expect(metrics.textCost).toBe(record.textCost);
          expect(metrics.imageCost).toBe(record.imageCost);
          expect(metrics.videoCost).toBe(record.videoCost);
          
          // Cache hit rate should be calculated correctly
          const expectedRate = calculateCacheHitRate(record.apiCalls, record.cacheHits);
          expect(metrics.cacheHitRate).toBeCloseTo(expectedRate, 10);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('transformation should be idempotent for the same record', () => {
      fc.assert(
        fc.property(dashboardDailyCostRecordArb, (record) => {
          const metrics1 = transformToDashboardMetrics(record);
          const metrics2 = transformToDashboardMetrics(record);
          
          // Both transformations should produce identical results
          expect(metrics1).toEqual(metrics2);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('transformation should handle edge cases gracefully', () => {
      // Test with null
      const nullMetrics = transformToDashboardMetrics(null);
      expect(nullMetrics.totalCost).toBe(0);
      expect(nullMetrics.cacheHitRate).toBe(0);
      
      // Test with empty record
      const emptyRecord: DailyCostRecord = {
        date: '2024-01-01',
        textCost: 0,
        imageCost: 0,
        videoCost: 0,
        totalCost: 0,
        apiCalls: 0,
        cacheHits: 0,
      };
      const emptyMetrics = transformToDashboardMetrics(emptyRecord);
      expect(emptyMetrics.totalCost).toBe(0);
      expect(emptyMetrics.cacheHitRate).toBe(0);
      
      return true;
    });
  });
});
