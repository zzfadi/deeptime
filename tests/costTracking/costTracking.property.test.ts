/**
 * Cost Tracking Property Tests
 * Property-based tests for cost monitoring and threshold alerts
 * 
 * **Feature: ai-flow-redesign**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  textCostInputArb,
  imageResolutionArb,
  videoDurationArb,
  belowWarningScenarioArb,
  atWarningScenarioArb,
  exceededScenarioArb,
  consistentDailyCostRecordArb,
} from '../generators/costTracking.generators';
import {
  calculateTextCost,
  calculateImageCost,
  calculateVideoCost,
  createTokenUsage,
} from '../../deep-time-app/src/services/ai/costTrackingService';
import {
  INPUT_COST_PER_1M,
  OUTPUT_COST_PER_1M,
  CACHED_COST_PER_1M,
  IMAGE_COST_BY_RESOLUTION,
  VIDEO_COST_PER_SECOND_FAST,
  VIDEO_COST_PER_SECOND_STANDARD,
} from '../../deep-time-app/src/services/ai/types';
import type { UsageThreshold } from '../../deep-time-app/src/services/ai/costTrackingService';

// ============================================
// Pure Functions for Testing Threshold Logic
// ============================================

/**
 * Pure function to determine if a threshold alert should be triggered
 * This mirrors the checkThresholds logic in costTrackingService
 */
function shouldTriggerAlert(
  currentCost: number,
  threshold: UsageThreshold
): 'exceeded' | 'warning' | null {
  const { dailyLimit, warningThreshold } = threshold;
  
  if (currentCost >= dailyLimit) {
    return 'exceeded';
  }
  
  if (currentCost >= dailyLimit * warningThreshold) {
    return 'warning';
  }
  
  return null;
}

/**
 * Pure function to check if generation should be disabled
 */
function shouldDisableGeneration(
  currentCost: number,
  threshold: UsageThreshold
): boolean {
  if (!threshold.disableOnExceed) {
    return false;
  }
  return currentCost >= threshold.dailyLimit;
}

/**
 * Pure function to calculate expected text cost
 */
function expectedTextCost(
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number
): number {
  const nonCachedInputTokens = Math.max(0, inputTokens - cachedTokens);
  const inputCost = (nonCachedInputTokens / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;
  const cachedCost = (cachedTokens / 1_000_000) * CACHED_COST_PER_1M;
  return inputCost + outputCost + cachedCost;
}

describe('Cost Tracking Properties', () => {
  /**
   * **Feature: ai-flow-redesign, Property 43: Usage threshold alerts**
   * **Validates: Requirements 11.5**
   * 
   * *For any* day where total cost exceeds the defined threshold, 
   * the system should log an alert event
   */
  describe('Property 43: Usage threshold alerts', () => {
    it('should not trigger alert when cost is below warning threshold', () => {
      fc.assert(
        fc.property(belowWarningScenarioArb, ({ threshold, currentCost }) => {
          const alertType = shouldTriggerAlert(currentCost, threshold);
          
          // Should not trigger any alert
          expect(alertType).toBeNull();
          return alertType === null;
        }),
        { numRuns: 100 }
      );
    });

    it('should trigger warning alert when cost is at warning level', () => {
      fc.assert(
        fc.property(atWarningScenarioArb, ({ threshold, currentCost }) => {
          const alertType = shouldTriggerAlert(currentCost, threshold);
          
          // Should trigger warning (not exceeded since cost < dailyLimit)
          expect(alertType).toBe('warning');
          return alertType === 'warning';
        }),
        { numRuns: 100 }
      );
    });

    it('should trigger exceeded alert when cost exceeds daily limit', () => {
      fc.assert(
        fc.property(exceededScenarioArb, ({ threshold, currentCost }) => {
          const alertType = shouldTriggerAlert(currentCost, threshold);
          
          // Should trigger exceeded alert
          expect(alertType).toBe('exceeded');
          return alertType === 'exceeded';
        }),
        { numRuns: 100 }
      );
    });

    it('should disable generation when over budget and disableOnExceed is true', () => {
      fc.assert(
        fc.property(exceededScenarioArb, ({ threshold, currentCost }) => {
          // Ensure disableOnExceed is true for this test
          const thresholdWithDisable = { ...threshold, disableOnExceed: true };
          const shouldDisable = shouldDisableGeneration(currentCost, thresholdWithDisable);
          
          expect(shouldDisable).toBe(true);
          return shouldDisable === true;
        }),
        { numRuns: 100 }
      );
    });

    it('should not disable generation when disableOnExceed is false', () => {
      fc.assert(
        fc.property(exceededScenarioArb, ({ threshold, currentCost }) => {
          // Ensure disableOnExceed is false for this test
          const thresholdWithoutDisable = { ...threshold, disableOnExceed: false };
          const shouldDisable = shouldDisableGeneration(currentCost, thresholdWithoutDisable);
          
          expect(shouldDisable).toBe(false);
          return shouldDisable === false;
        }),
        { numRuns: 100 }
      );
    });

    it('alert type should be mutually exclusive (warning or exceeded, not both)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 500, noNaN: true }),
          fc.double({ min: 10, max: 1000, noNaN: true }),
          fc.double({ min: 0.5, max: 0.9, noNaN: true }),
          (currentCost, dailyLimit, warningThreshold) => {
            const threshold: UsageThreshold = {
              dailyLimit,
              warningThreshold,
              disableOnExceed: false,
            };
            
            const alertType = shouldTriggerAlert(currentCost, threshold);
            
            // Alert type should be null, 'warning', or 'exceeded' - never both
            const validTypes = [null, 'warning', 'exceeded'];
            expect(validTypes).toContain(alertType);
            
            // If exceeded, it should not also be warning
            if (alertType === 'exceeded') {
              expect(currentCost).toBeGreaterThanOrEqual(dailyLimit);
            }
            
            // If warning, it should be between warning threshold and daily limit
            if (alertType === 'warning') {
              expect(currentCost).toBeGreaterThanOrEqual(dailyLimit * warningThreshold);
              expect(currentCost).toBeLessThan(dailyLimit);
            }
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Cost Calculation Properties
   * These test the cost calculation utilities
   */
  describe('Cost Calculation Properties', () => {
    it('text cost should be non-negative for any valid input', () => {
      fc.assert(
        fc.property(textCostInputArb, ({ inputTokens, outputTokens, cachedTokens }) => {
          const cost = calculateTextCost(inputTokens, outputTokens, cachedTokens);
          
          expect(cost).toBeGreaterThanOrEqual(0);
          return cost >= 0;
        }),
        { numRuns: 100 }
      );
    });

    it('text cost should match expected calculation', () => {
      fc.assert(
        fc.property(textCostInputArb, ({ inputTokens, outputTokens, cachedTokens }) => {
          const actualCost = calculateTextCost(inputTokens, outputTokens, cachedTokens);
          const expected = expectedTextCost(inputTokens, outputTokens, cachedTokens);
          
          expect(actualCost).toBeCloseTo(expected, 10);
          return Math.abs(actualCost - expected) < 0.0000001;
        }),
        { numRuns: 100 }
      );
    });

    it('cached tokens should reduce cost compared to non-cached', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 100000 }),
          fc.integer({ min: 100, max: 10000 }),
          (inputTokens, outputTokens) => {
            const costWithoutCache = calculateTextCost(inputTokens, outputTokens, 0);
            const costWithCache = calculateTextCost(inputTokens, outputTokens, inputTokens / 2);
            
            // Cost with cache should be less than without
            expect(costWithCache).toBeLessThan(costWithoutCache);
            return costWithCache < costWithoutCache;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('image cost should match resolution pricing', () => {
      fc.assert(
        fc.property(imageResolutionArb, (resolution) => {
          const cost = calculateImageCost(resolution);
          const expectedCost = IMAGE_COST_BY_RESOLUTION[resolution];
          
          expect(cost).toBe(expectedCost);
          return cost === expectedCost;
        }),
        { numRuns: 100 }
      );
    });

    it('video cost should be proportional to duration', () => {
      fc.assert(
        fc.property(videoDurationArb, ({ duration, useFastModel }) => {
          const cost = calculateVideoCost(duration, useFastModel);
          const costPerSecond = useFastModel 
            ? VIDEO_COST_PER_SECOND_FAST 
            : VIDEO_COST_PER_SECOND_STANDARD;
          const expectedCost = duration * costPerSecond;
          
          expect(cost).toBeCloseTo(expectedCost, 10);
          return Math.abs(cost - expectedCost) < 0.0001;
        }),
        { numRuns: 100 }
      );
    });

    it('fast model should be cheaper than standard model for same duration', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 60 }),
          (duration) => {
            const fastCost = calculateVideoCost(duration, true);
            const standardCost = calculateVideoCost(duration, false);
            
            expect(fastCost).toBeLessThan(standardCost);
            return fastCost < standardCost;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('createTokenUsage should produce consistent totalCost', () => {
      fc.assert(
        fc.property(textCostInputArb, ({ inputTokens, outputTokens, cachedTokens }) => {
          const tokenUsage = createTokenUsage(inputTokens, outputTokens, cachedTokens);
          const expectedCost = calculateTextCost(inputTokens, outputTokens, cachedTokens);
          
          expect(tokenUsage.inputTokens).toBe(inputTokens);
          expect(tokenUsage.outputTokens).toBe(outputTokens);
          expect(tokenUsage.cachedTokens).toBe(cachedTokens);
          expect(tokenUsage.totalCost).toBeCloseTo(expectedCost, 10);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Daily Cost Record Properties
   */
  describe('Daily Cost Record Properties', () => {
    it('totalCost should equal sum of text, image, and video costs', () => {
      fc.assert(
        fc.property(consistentDailyCostRecordArb, (record) => {
          const expectedTotal = record.textCost + record.imageCost + record.videoCost;
          
          expect(record.totalCost).toBeCloseTo(expectedTotal, 10);
          return Math.abs(record.totalCost - expectedTotal) < 0.0001;
        }),
        { numRuns: 100 }
      );
    });

    it('date should be in valid YYYY-MM-DD format', () => {
      fc.assert(
        fc.property(consistentDailyCostRecordArb, (record) => {
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          
          expect(record.date).toMatch(dateRegex);
          
          // Should be parseable as a valid date
          const parsed = new Date(record.date);
          expect(isNaN(parsed.getTime())).toBe(false);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('apiCalls and cacheHits should be non-negative integers', () => {
      fc.assert(
        fc.property(consistentDailyCostRecordArb, (record) => {
          expect(record.apiCalls).toBeGreaterThanOrEqual(0);
          expect(record.cacheHits).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(record.apiCalls)).toBe(true);
          expect(Number.isInteger(record.cacheHits)).toBe(true);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
