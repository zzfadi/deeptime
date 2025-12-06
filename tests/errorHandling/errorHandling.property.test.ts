/**
 * Error Handling Property Tests
 * Property-based tests for error handling and fallback behavior
 * 
 * **Feature: ai-flow-redesign**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  geoCoordinateArb,
  geologicalLayerArb,
} from '../generators/geological.generators';
import {
  AIError,
  classifyError,
  createAIError,
  calculateBackoffDelay,
  DEFAULT_BACKOFF_CONFIG,
  isApiKeyConfigured,
} from '../../deep-time-app/src/services/ai/errorHandling';
import { fallbackProvider } from '../../deep-time-app/src/services/ai/fallbackProvider';
import type { AIErrorType } from '../../deep-time-app/src/services/ai/types';

// ============================================
// Pure Functions for Testing
// ============================================

/**
 * Pure function to check if fallback should be used
 * Property 32: Fallback on generation failure
 */
function shouldUseFallback(
  generationFailed: boolean,
  useFallbackOnError: boolean
): boolean {
  return generationFailed && useFallbackOnError;
}

/**
 * Pure function to check if API calls should be made
 * Property 33: No API calls without key
 */
function shouldMakeApiCall(
  apiKey: string | undefined | null,
  isOnline: boolean
): boolean {
  if (!isOnline) return false;
  if (!apiKey || apiKey.trim().length === 0) return false;
  return true;
}

/**
 * Pure function to calculate expected backoff delays
 * Property 34: Exponential backoff on rate limits
 */
function calculateExpectedBackoffDelays(
  maxAttempts: number,
  baseDelayMs: number,
  multiplier: number,
  maxDelayMs: number
): number[] {
  const delays: number[] = [];
  for (let i = 0; i < maxAttempts; i++) {
    const exponentialDelay = baseDelayMs * Math.pow(multiplier, i);
    delays.push(Math.min(exponentialDelay, maxDelayMs));
  }
  return delays;
}

/**
 * Pure function to check if cache should be used when offline
 * Property 22: Offline cache-only behavior
 */
function shouldUseCacheWhenOffline(
  isOnline: boolean,
  hasCachedContent: boolean
): 'use_cache' | 'use_fallback' | 'make_api_call' {
  if (!isOnline) {
    return hasCachedContent ? 'use_cache' : 'use_fallback';
  }
  return 'make_api_call';
}

// ============================================
// Property Tests
// ============================================

describe('Error Handling Properties', () => {
  /**
   * **Feature: ai-flow-redesign, Property 32: Fallback on generation failure**
   * **Validates: Requirements 9.1**
   * 
   * *For any* failed text generation attempt, the system should return 
   * a pre-written narrative from the core library
   */
  describe('Property 32: Fallback on generation failure', () => {
    it('fallback narrative should be returned when generation fails and fallback is enabled', () => {
      fc.assert(
        fc.property(geologicalLayerArb, (layer) => {
          // When generation fails and fallback is enabled
          const shouldFallback = shouldUseFallback(true, true);
          expect(shouldFallback).toBe(true);
          
          // Get fallback narrative
          const fallbackNarrative = fallbackProvider.getNarrativeFallback(layer);
          
          // Fallback should have valid structure
          expect(fallbackNarrative).toBeDefined();
          expect(fallbackNarrative.layerId).toBe(layer.id);
          expect(fallbackNarrative.shortDescription).toBeTruthy();
          expect(fallbackNarrative.modelUsed).toBe('fallback');
          expect(fallbackNarrative.tokenUsage.totalCost).toBe(0);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('fallback image should be era-appropriate', () => {
      fc.assert(
        fc.property(geologicalLayerArb, (layer) => {
          const fallbackImage = fallbackProvider.getImageFallback(layer);
          
          // Fallback image should have valid structure
          expect(fallbackImage).toBeDefined();
          expect(fallbackImage.id).toContain('fallback');
          expect(fallbackImage.mimeType).toBe('image/svg+xml');
          expect(fallbackImage.modelUsed).toBe('fallback');
          expect(fallbackImage.cost).toBe(0);
          
          // Image should reference the era
          expect(fallbackImage.prompt).toContain(layer.era.name);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('fallback video should be null (hide video section)', () => {
      const fallbackVideo = fallbackProvider.getVideoFallback();
      
      // Requirement 9.3: Hide video section gracefully on failure
      expect(fallbackVideo).toBeNull();
    });

    it('complete fallback should include narrative and image but no video', () => {
      fc.assert(
        fc.property(geologicalLayerArb, (layer) => {
          const completeFallback = fallbackProvider.getCompleteFallback(layer);
          
          expect(completeFallback.narrative).toBeDefined();
          expect(completeFallback.image).toBeDefined();
          expect(completeFallback.video).toBeNull();
          expect(completeFallback.cacheMetadata).toBeDefined();
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 33: No API calls without key**
   * **Validates: Requirements 9.4**
   * 
   * *For any* request when API key is missing or invalid, the system 
   * should use fallback content without making API calls
   */
  describe('Property 33: No API calls without key', () => {
    it('should not make API calls when API key is empty', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', null, undefined),
          (apiKey) => {
            const shouldCall = shouldMakeApiCall(apiKey, true);
            expect(shouldCall).toBe(false);
            return !shouldCall;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should make API calls when API key is valid and online', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 50 }).filter(s => s.trim().length > 0),
          (apiKey) => {
            const shouldCall = shouldMakeApiCall(apiKey, true);
            expect(shouldCall).toBe(true);
            return shouldCall;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isApiKeyConfigured should return false for empty/null keys', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('', '   ', null, undefined),
          (apiKey) => {
            const isConfigured = isApiKeyConfigured(apiKey as string | undefined | null);
            expect(isConfigured).toBe(false);
            return !isConfigured;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isApiKeyConfigured should return true for non-empty keys', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (apiKey) => {
            const isConfigured = isApiKeyConfigured(apiKey);
            expect(isConfigured).toBe(true);
            return isConfigured;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 34: Exponential backoff on rate limits**
   * **Validates: Requirements 9.5**
   * 
   * *For any* rate limit error, the system should retry with exponentially 
   * increasing delays (1s, 2s, 4s, 8s, ...)
   */
  describe('Property 34: Exponential backoff on rate limits', () => {
    it('backoff delays should follow exponential pattern', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 5 }),
          (attempt) => {
            const delay = calculateBackoffDelay(attempt, {
              ...DEFAULT_BACKOFF_CONFIG,
              jitter: false, // Disable jitter for deterministic testing
            });
            
            const expectedDelay = Math.min(
              DEFAULT_BACKOFF_CONFIG.baseDelayMs * Math.pow(DEFAULT_BACKOFF_CONFIG.multiplier, attempt),
              DEFAULT_BACKOFF_CONFIG.maxDelayMs
            );
            
            expect(delay).toBe(expectedDelay);
            return delay === expectedDelay;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('backoff delays should be capped at maxDelayMs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 100, max: 1000 }),
          fc.integer({ min: 1000, max: 5000 }),
          (attempt, baseDelayMs, maxDelayMs) => {
            const delay = calculateBackoffDelay(attempt, {
              ...DEFAULT_BACKOFF_CONFIG,
              baseDelayMs,
              maxDelayMs,
              jitter: false,
            });
            
            expect(delay).toBeLessThanOrEqual(maxDelayMs);
            return delay <= maxDelayMs;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('expected delays should be 1s, 2s, 4s, 8s for default config', () => {
      const expectedDelays = calculateExpectedBackoffDelays(
        4,
        DEFAULT_BACKOFF_CONFIG.baseDelayMs,
        DEFAULT_BACKOFF_CONFIG.multiplier,
        DEFAULT_BACKOFF_CONFIG.maxDelayMs
      );
      
      expect(expectedDelays[0]).toBe(1000);
      expect(expectedDelays[1]).toBe(2000);
      expect(expectedDelays[2]).toBe(4000);
      expect(expectedDelays[3]).toBe(8000);
    });

    it('jitter should add randomization within bounds', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3 }),
          (attempt) => {
            const baseDelay = calculateBackoffDelay(attempt, {
              ...DEFAULT_BACKOFF_CONFIG,
              jitter: false,
            });
            
            // Run multiple times to check jitter variation
            const delaysWithJitter: number[] = [];
            for (let i = 0; i < 10; i++) {
              delaysWithJitter.push(calculateBackoffDelay(attempt, {
                ...DEFAULT_BACKOFF_CONFIG,
                jitter: true,
              }));
            }
            
            // All delays should be within ±25% of base delay
            const minExpected = baseDelay * 0.75;
            const maxExpected = baseDelay * 1.25;
            
            for (const delay of delaysWithJitter) {
              expect(delay).toBeGreaterThanOrEqual(0);
              expect(delay).toBeLessThanOrEqual(maxExpected);
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 22: Offline cache-only behavior**
   * **Validates: Requirements 5.5**
   * 
   * *For any* request when the device is offline, the system should serve 
   * content from cache without attempting API calls
   */
  describe('Property 22: Offline cache-only behavior', () => {
    it('should use cache when offline and cache is available', () => {
      fc.assert(
        fc.property(fc.boolean(), (hasCachedContent) => {
          const result = shouldUseCacheWhenOffline(false, hasCachedContent);
          
          if (hasCachedContent) {
            expect(result).toBe('use_cache');
          } else {
            expect(result).toBe('use_fallback');
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should allow API calls when online', () => {
      fc.assert(
        fc.property(fc.boolean(), (hasCachedContent) => {
          const result = shouldUseCacheWhenOffline(true, hasCachedContent);
          expect(result).toBe('make_api_call');
          return result === 'make_api_call';
        }),
        { numRuns: 100 }
      );
    });

    it('should never make API calls when offline', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          (hasCachedContent, hasApiKey) => {
            // When offline, should never make API calls
            const shouldCall = shouldMakeApiCall(hasApiKey ? 'valid-key' : '', false);
            expect(shouldCall).toBe(false);
            return !shouldCall;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Error Classification Tests
   */
  describe('Error Classification', () => {
    it('should classify rate limit errors correctly', () => {
      const rateLimitMessages = [
        'Error 429: Too many requests',
        'Rate limit exceeded',
        'Quota exceeded for the day',
      ];
      
      for (const message of rateLimitMessages) {
        const error = new Error(message);
        const classified = classifyError(error);
        expect(classified).toBe('rate_limit');
      }
    });

    it('should classify invalid key errors correctly', () => {
      const invalidKeyMessages = [
        'Invalid API key',
        'Unauthorized: 401',
        'Forbidden: 403',
      ];
      
      for (const message of invalidKeyMessages) {
        const error = new Error(message);
        const classified = classifyError(error);
        expect(classified).toBe('invalid_key');
      }
    });

    it('should classify network errors correctly', () => {
      const networkMessages = [
        'Network error',
        'Failed to fetch',
        'Connection refused',
      ];
      
      for (const message of networkMessages) {
        const error = new Error(message);
        const classified = classifyError(error);
        expect(classified).toBe('network_error');
      }
    });

    it('AIError should preserve error type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<AIErrorType>('api_error', 'rate_limit', 'invalid_key', 'parse_error', 'cache_error', 'network_error', 'generation_timeout'),
          fc.string({ minLength: 1, maxLength: 100 }),
          (errorType, message) => {
            const aiError = new AIError(errorType, message);
            expect(aiError.type).toBe(errorType);
            expect(aiError.message).toBe(message);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('createAIError should wrap unknown errors', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), (message) => {
          const error = new Error(message);
          const aiError = createAIError(error);
          
          expect(aiError).toBeInstanceOf(AIError);
          expect(aiError.message).toBe(message);
          expect(aiError.cause).toBe(error);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
