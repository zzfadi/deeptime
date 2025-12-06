/**
 * Cost Tracking Generators for Property-Based Testing
 * Generates random cost tracking data for testing threshold alerts
 * 
 * **Feature: ai-flow-redesign**
 */

import * as fc from 'fast-check';
import type { DailyCostRecord, MediaResolution, TokenUsage } from '../../deep-time-app/src/services/ai/types';
import type { UsageThreshold, ThresholdAlert, ApiCallLogEntry } from '../../deep-time-app/src/services/ai/costTrackingService';

// ============================================
// Token Usage Generators
// ============================================

/**
 * Generate random token usage
 */
export const tokenUsageArb: fc.Arbitrary<TokenUsage> = fc.record({
  inputTokens: fc.integer({ min: 100, max: 10000 }),
  outputTokens: fc.integer({ min: 50, max: 5000 }),
  cachedTokens: fc.integer({ min: 0, max: 5000 }),
  totalCost: fc.double({ min: 0.0001, max: 1, noNaN: true }),
});

// ============================================
// Daily Cost Record Generators
// ============================================

/**
 * Generate a random daily cost record
 */
export const dailyCostRecordArb: fc.Arbitrary<DailyCostRecord> = fc.record({
  date: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
    .map(d => d.toISOString().split('T')[0]),
  textCost: fc.double({ min: 0, max: 50, noNaN: true }),
  imageCost: fc.double({ min: 0, max: 50, noNaN: true }),
  videoCost: fc.double({ min: 0, max: 100, noNaN: true }),
  totalCost: fc.double({ min: 0, max: 200, noNaN: true }),
  apiCalls: fc.integer({ min: 0, max: 1000 }),
  cacheHits: fc.integer({ min: 0, max: 5000 }),
});

/**
 * Generate a daily cost record with consistent totalCost
 */
export const consistentDailyCostRecordArb: fc.Arbitrary<DailyCostRecord> = fc.tuple(
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

// ============================================
// Usage Threshold Generators
// ============================================

/**
 * Generate random usage thresholds
 */
export const usageThresholdArb: fc.Arbitrary<UsageThreshold> = fc.record({
  dailyLimit: fc.double({ min: 1, max: 1000, noNaN: true }),
  warningThreshold: fc.double({ min: 0.5, max: 0.99, noNaN: true }),
  disableOnExceed: fc.boolean(),
});

/**
 * Generate usage threshold with specific daily limit
 */
export function usageThresholdWithLimitArb(limit: number): fc.Arbitrary<UsageThreshold> {
  return fc.record({
    dailyLimit: fc.constant(limit),
    warningThreshold: fc.double({ min: 0.5, max: 0.99, noNaN: true }),
    disableOnExceed: fc.boolean(),
  });
}

// ============================================
// Threshold Alert Generators
// ============================================

/**
 * Generate a threshold alert
 */
export const thresholdAlertArb: fc.Arbitrary<ThresholdAlert> = fc.record({
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  type: fc.constantFrom('warning', 'exceeded') as fc.Arbitrary<'warning' | 'exceeded'>,
  currentCost: fc.double({ min: 0, max: 500, noNaN: true }),
  threshold: fc.double({ min: 1, max: 1000, noNaN: true }),
  message: fc.string({ minLength: 10, maxLength: 200 }),
});

// ============================================
// API Call Log Entry Generators
// ============================================

/**
 * Generate a text API call log entry
 */
export const textApiCallLogEntryArb: fc.Arbitrary<ApiCallLogEntry> = fc.record({
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  type: fc.constant('text') as fc.Arbitrary<'text'>,
  model: fc.constant('gemini-2.5-flash'),
  cost: fc.double({ min: 0.0001, max: 0.01, noNaN: true }),
  tokenUsage: tokenUsageArb,
  cacheKey: fc.option(fc.string({ minLength: 10, maxLength: 50 }), { nil: undefined }),
});

/**
 * Generate an image API call log entry
 */
export const imageApiCallLogEntryArb: fc.Arbitrary<ApiCallLogEntry> = fc.record({
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  type: fc.constant('image') as fc.Arbitrary<'image'>,
  model: fc.constant('gemini-2.5-flash-image'),
  cost: fc.double({ min: 0.02, max: 0.08, noNaN: true }),
  resolution: fc.constantFrom('LOW', 'MEDIUM', 'HIGH') as fc.Arbitrary<MediaResolution>,
  cacheKey: fc.option(fc.string({ minLength: 10, maxLength: 50 }), { nil: undefined }),
});

/**
 * Generate a video API call log entry
 */
export const videoApiCallLogEntryArb: fc.Arbitrary<ApiCallLogEntry> = fc.record({
  timestamp: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  type: fc.constant('video') as fc.Arbitrary<'video'>,
  model: fc.constant('veo-3.1-fast'),
  cost: fc.double({ min: 0.6, max: 1.2, noNaN: true }),
  duration: fc.integer({ min: 4, max: 8 }),
  cacheKey: fc.option(fc.string({ minLength: 10, maxLength: 50 }), { nil: undefined }),
});

/**
 * Generate any type of API call log entry
 */
export const apiCallLogEntryArb: fc.Arbitrary<ApiCallLogEntry> = fc.oneof(
  textApiCallLogEntryArb,
  imageApiCallLogEntryArb,
  videoApiCallLogEntryArb,
);

// ============================================
// Threshold Test Scenario Generators
// ============================================

/**
 * Generate a scenario where cost is below warning threshold
 */
export const belowWarningScenarioArb: fc.Arbitrary<{
  threshold: UsageThreshold;
  currentCost: number;
}> = fc.tuple(
  fc.double({ min: 10, max: 1000, noNaN: true }),
  fc.double({ min: 0.5, max: 0.79, noNaN: true }),
).map(([dailyLimit, warningThreshold]) => {
  // Current cost is below warning threshold
  const maxCost = dailyLimit * warningThreshold * 0.9; // 90% of warning threshold
  const currentCost = Math.random() * maxCost;
  return {
    threshold: {
      dailyLimit,
      warningThreshold,
      disableOnExceed: false,
    },
    currentCost,
  };
});

/**
 * Generate a scenario where cost is at warning level (between warning and exceeded)
 */
export const atWarningScenarioArb: fc.Arbitrary<{
  threshold: UsageThreshold;
  currentCost: number;
}> = fc.tuple(
  fc.double({ min: 10, max: 1000, noNaN: true }),
  fc.double({ min: 0.5, max: 0.9, noNaN: true }),
).map(([dailyLimit, warningThreshold]) => {
  // Current cost is between warning threshold and daily limit
  const minCost = dailyLimit * warningThreshold;
  const maxCost = dailyLimit * 0.99; // Just below limit
  const currentCost = minCost + Math.random() * (maxCost - minCost);
  return {
    threshold: {
      dailyLimit,
      warningThreshold,
      disableOnExceed: false,
    },
    currentCost,
  };
});

/**
 * Generate a scenario where cost exceeds daily limit
 */
export const exceededScenarioArb: fc.Arbitrary<{
  threshold: UsageThreshold;
  currentCost: number;
}> = fc.tuple(
  fc.double({ min: 10, max: 1000, noNaN: true }),
  fc.double({ min: 0.5, max: 0.9, noNaN: true }),
  fc.double({ min: 1.0, max: 2.0, noNaN: true }),
).map(([dailyLimit, warningThreshold, multiplier]) => {
  // Current cost exceeds daily limit
  const currentCost = dailyLimit * multiplier;
  return {
    threshold: {
      dailyLimit,
      warningThreshold,
      disableOnExceed: true,
    },
    currentCost,
  };
});

// ============================================
// Cost Calculation Test Data Generators
// ============================================

/**
 * Generate token counts for text cost calculation
 */
export const textCostInputArb: fc.Arbitrary<{
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}> = fc.record({
  inputTokens: fc.integer({ min: 0, max: 100000 }),
  outputTokens: fc.integer({ min: 0, max: 50000 }),
  cachedTokens: fc.integer({ min: 0, max: 50000 }),
});

/**
 * Generate image resolution for cost calculation
 */
export const imageResolutionArb: fc.Arbitrary<MediaResolution> = fc.constantFrom('LOW', 'MEDIUM', 'HIGH');

/**
 * Generate video duration for cost calculation
 */
export const videoDurationArb: fc.Arbitrary<{
  duration: number;
  useFastModel: boolean;
}> = fc.record({
  duration: fc.integer({ min: 1, max: 60 }),
  useFastModel: fc.boolean(),
});
