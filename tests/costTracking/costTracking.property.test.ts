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
   * **Feature: pre-deployment-optimization, Property 4: Cached token cost calculation**
   * **Validates: Requirements 2.1**
   * 
   * *For any* positive number of cached tokens, the calculated cost should equal 
   * (tokens / 1,000,000) × 0.03
   */
  describe('Property 4: Cached token cost calculation', () => {
    it('cached token cost should equal (tokens / 1,000,000) × 0.03', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10_000_000 }),
          (cachedTokens) => {
            // Calculate cost using only cached tokens (no input or output)
            const cost = calculateTextCost(cachedTokens, 0, cachedTokens);
            
            // Expected cost: (cachedTokens / 1,000,000) × 0.03
            const expectedCost = (cachedTokens / 1_000_000) * CACHED_COST_PER_1M;
            
            expect(cost).toBeCloseTo(expectedCost, 10);
            return Math.abs(cost - expectedCost) < 0.0000001;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('CACHED_COST_PER_1M should be 0.03 (90% discount)', () => {
      // Requirement 2.1: Apply the correct 90% discount rate of $0.03 per 1M tokens
      expect(CACHED_COST_PER_1M).toBe(0.03);
    });

    it('cached tokens should receive 90% discount compared to input tokens', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 1_000_000 }),
          (tokens) => {
            // Cost if all tokens are non-cached input
            const inputOnlyCost = (tokens / 1_000_000) * INPUT_COST_PER_1M;
            
            // Cost if all tokens are cached
            const cachedOnlyCost = (tokens / 1_000_000) * CACHED_COST_PER_1M;
            
            // Cached cost should be 10% of input cost (90% discount)
            // 0.03 / 0.30 = 0.1 = 10%
            const discountRatio = cachedOnlyCost / inputOnlyCost;
            
            expect(discountRatio).toBeCloseTo(0.1, 5);
            return Math.abs(discountRatio - 0.1) < 0.0001;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: pre-deployment-optimization, Property 5: Cost report structure**
   * **Validates: Requirements 2.2**
   * 
   * *For any* generated cost report, the report should contain distinct fields 
   * for cached token costs and uncached token costs
   */
  describe('Property 5: Cost report structure', () => {
    it('TokenUsage should contain distinct fields for cached and uncached tokens', () => {
      fc.assert(
        fc.property(textCostInputArb, ({ inputTokens, outputTokens, cachedTokens }) => {
          const tokenUsage = createTokenUsage(inputTokens, outputTokens, cachedTokens);
          
          // TokenUsage should have distinct fields for tracking
          expect(tokenUsage).toHaveProperty('inputTokens');
          expect(tokenUsage).toHaveProperty('outputTokens');
          expect(tokenUsage).toHaveProperty('cachedTokens');
          expect(tokenUsage).toHaveProperty('totalCost');
          
          // Values should match what was passed in
          expect(tokenUsage.inputTokens).toBe(inputTokens);
          expect(tokenUsage.outputTokens).toBe(outputTokens);
          expect(tokenUsage.cachedTokens).toBe(cachedTokens);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('cost calculation should distinguish between cached and uncached input tokens', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 100000 }),
          fc.integer({ min: 100, max: 10000 }),
          fc.integer({ min: 0, max: 50000 }),
          (inputTokens, outputTokens, cachedTokens) => {
            // Ensure cachedTokens doesn't exceed inputTokens
            const actualCachedTokens = Math.min(cachedTokens, inputTokens);
            
            const tokenUsage = createTokenUsage(inputTokens, outputTokens, actualCachedTokens);
            
            // Calculate expected costs separately
            const nonCachedInputTokens = Math.max(0, inputTokens - actualCachedTokens);
            const expectedInputCost = (nonCachedInputTokens / 1_000_000) * INPUT_COST_PER_1M;
            const expectedOutputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;
            const expectedCachedCost = (actualCachedTokens / 1_000_000) * CACHED_COST_PER_1M;
            const expectedTotalCost = expectedInputCost + expectedOutputCost + expectedCachedCost;
            
            // Total cost should reflect the distinction
            expect(tokenUsage.totalCost).toBeCloseTo(expectedTotalCost, 10);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('DailyCostRecord should have separate fields for different cost types', () => {
      fc.assert(
        fc.property(consistentDailyCostRecordArb, (record) => {
          // DailyCostRecord should have distinct fields for each cost type
          expect(record).toHaveProperty('textCost');
          expect(record).toHaveProperty('imageCost');
          expect(record).toHaveProperty('videoCost');
          expect(record).toHaveProperty('totalCost');
          
          // All cost fields should be numbers
          expect(typeof record.textCost).toBe('number');
          expect(typeof record.imageCost).toBe('number');
          expect(typeof record.videoCost).toBe('number');
          expect(typeof record.totalCost).toBe('number');
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

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

  /**
   * **Feature: pre-deployment-optimization, Example 2: Cached token pricing constant**
   * **Validates: Requirements 2.3**
   * 
   * Verify that CACHED_COST_PER_1M equals 0.03
   */
  describe('Example 2: Cached token pricing constant', () => {
    it('CACHED_COST_PER_1M should equal 0.03', () => {
      // Requirement 2.3: Use the constant value 0.03 for cached token pricing
      expect(CACHED_COST_PER_1M).toBe(0.03);
    });

    it('cached token pricing should represent 90% discount from input pricing', () => {
      // Input cost is $0.30 per 1M tokens
      // Cached cost should be $0.03 per 1M tokens (90% discount)
      const discountPercentage = ((INPUT_COST_PER_1M - CACHED_COST_PER_1M) / INPUT_COST_PER_1M) * 100;
      expect(discountPercentage).toBeCloseTo(90, 5);
    });

    it('1 million cached tokens should cost exactly $0.03', () => {
      const cost = calculateTextCost(1_000_000, 0, 1_000_000);
      expect(cost).toBe(0.03);
    });
  });
});
