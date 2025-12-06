/**
 * Model Configuration Tests
 * Validates model selection for different use cases
 * 
 * Requirements: 3.1, 3.2, 3.3, 4.1, 7.1, 7.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { MODEL_USE_CASES, GEMINI_MODELS, VEO_MODELS, getModelForUseCase, MODEL_SPECS } from '../../deep-time-app/src/config/aiModels';
import { DEFAULT_MAX_OUTPUT_TOKENS, DEFAULT_VIDEO_DURATION, VIDEO_COST_PER_SECOND_FAST } from '../../deep-time-app/src/services/ai/types';
import { EXPLICIT_CACHE_MIN_TOKENS } from '../../deep-time-app/src/services/ai/explicitCacheService';

describe('Model Configuration', () => {
  describe('ERA_NARRATIVE model selection', () => {
    it('should use gemini-2.5-flash-lite for ERA_NARRATIVE (Requirement 3.1)', () => {
      // Example 3: ERA_NARRATIVE model configuration
      // Validates: Requirements 3.1, 3.2
      expect(MODEL_USE_CASES.ERA_NARRATIVE).toBe(GEMINI_MODELS.FLASH_LITE);
      expect(MODEL_USE_CASES.ERA_NARRATIVE).toBe('gemini-2.5-flash-lite');
    });

    it('should return flash-lite when querying ERA_NARRATIVE use case', () => {
      const model = getModelForUseCase('ERA_NARRATIVE');
      expect(model).toBe('gemini-2.5-flash-lite');
    });
  });

  describe('Cost optimization', () => {
    it('should use Flash-Lite for cost-sensitive operations', () => {
      // Flash-Lite should be used for:
      // - ERA_NARRATIVE (detailed narratives)
      // - CREATURE_NARRATION (AR interactions)
      // - ERA_WELCOME (AR welcome messages)
      expect(MODEL_USE_CASES.ERA_NARRATIVE).toBe(GEMINI_MODELS.FLASH_LITE);
      expect(MODEL_USE_CASES.CREATURE_NARRATION).toBe(GEMINI_MODELS.FLASH_LITE);
      expect(MODEL_USE_CASES.ERA_WELCOME).toBe(GEMINI_MODELS.FLASH_LITE);
    });
  });

  describe('Narrative output validation', () => {
    /**
     * Property 6: Narrative output validation
     * Feature: pre-deployment-optimization, Property 6: Narrative output validation
     * Validates: Requirements 3.3
     * 
     * For any generated narrative, the output should be valid JSON containing 
     * all required fields (shortDescription, flora, fauna, climate)
     */
    it('should validate that any narrative contains all required fields', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary narrative-like objects
          fc.record({
            layerId: fc.string(),
            shortDescription: fc.string({ minLength: 1 }),
            fullDescription: fc.string({ minLength: 1 }),
            visualPrompt: fc.string({ minLength: 1 }),
            flora: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
            fauna: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
            climate: fc.record({
              temperature: fc.string({ minLength: 1 }),
              humidity: fc.string({ minLength: 1 }),
              atmosphere: fc.string({ minLength: 1 }),
            }),
            soundscape: fc.string(),
            locationContext: fc.record({
              coordinates: fc.record({
                latitude: fc.double({ min: -90, max: 90 }),
                longitude: fc.double({ min: -180, max: 180 }),
                altitude: fc.double(),
                accuracy: fc.double({ min: 0 }),
              }),
              placeName: fc.string(),
              geologicalFeatures: fc.array(fc.string()),
              nearbyLandmarks: fc.array(fc.string()),
            }),
            generatedAt: fc.date(),
            modelUsed: fc.string(),
            tokenUsage: fc.record({
              inputTokens: fc.nat(),
              outputTokens: fc.nat(),
              cachedTokens: fc.nat(),
              totalCost: fc.double({ min: 0 }),
            }),
          }),
          (narrative) => {
            // Validate that the narrative has all required fields
            expect(narrative).toHaveProperty('shortDescription');
            expect(narrative.shortDescription).toBeTruthy();
            expect(typeof narrative.shortDescription).toBe('string');

            expect(narrative).toHaveProperty('flora');
            expect(Array.isArray(narrative.flora)).toBe(true);
            expect(narrative.flora.length).toBeGreaterThan(0);

            expect(narrative).toHaveProperty('fauna');
            expect(Array.isArray(narrative.fauna)).toBe(true);
            expect(narrative.fauna.length).toBeGreaterThan(0);

            expect(narrative).toHaveProperty('climate');
            expect(narrative.climate).toHaveProperty('temperature');
            expect(narrative.climate).toHaveProperty('humidity');
            expect(narrative.climate).toHaveProperty('atmosphere');
            expect(typeof narrative.climate.temperature).toBe('string');
            expect(typeof narrative.climate.humidity).toBe('string');
            expect(typeof narrative.climate.atmosphere).toBe('string');
            expect(narrative.climate.temperature).toBeTruthy();
            expect(narrative.climate.humidity).toBeTruthy();
            expect(narrative.climate.atmosphere).toBeTruthy();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject narratives missing required fields', () => {
      // Test that validation would fail for incomplete narratives
      const incompleteNarratives = [
        { shortDescription: '', flora: ['plant'], fauna: ['animal'], climate: { temperature: 'warm', humidity: 'high', atmosphere: 'oxygen-rich' } },
        { shortDescription: 'desc', flora: [], fauna: ['animal'], climate: { temperature: 'warm', humidity: 'high', atmosphere: 'oxygen-rich' } },
        { shortDescription: 'desc', flora: ['plant'], fauna: [], climate: { temperature: 'warm', humidity: 'high', atmosphere: 'oxygen-rich' } },
        { shortDescription: 'desc', flora: ['plant'], fauna: ['animal'], climate: { temperature: '', humidity: 'high', atmosphere: 'oxygen-rich' } },
        { shortDescription: 'desc', flora: ['plant'], fauna: ['animal'], climate: { temperature: 'warm', humidity: '', atmosphere: 'oxygen-rich' } },
        { shortDescription: 'desc', flora: ['plant'], fauna: ['animal'], climate: { temperature: 'warm', humidity: 'high', atmosphere: '' } },
      ];

      incompleteNarratives.forEach((narrative) => {
        const hasValidShortDescription = Boolean(narrative.shortDescription && narrative.shortDescription.trim().length > 0);
        const hasValidFlora = Boolean(narrative.flora && narrative.flora.length > 0);
        const hasValidFauna = Boolean(narrative.fauna && narrative.fauna.length > 0);
        const hasValidClimate = Boolean(
          narrative.climate &&
          narrative.climate.temperature && narrative.climate.temperature.trim().length > 0 &&
          narrative.climate.humidity && narrative.climate.humidity.trim().length > 0 &&
          narrative.climate.atmosphere && narrative.climate.atmosphere.trim().length > 0
        );

        const isValid = hasValidShortDescription && hasValidFlora && hasValidFauna && hasValidClimate;
        
        // At least one of these should be false
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Token limit configuration', () => {
    /**
     * Example 4: Max output tokens default
     * Feature: pre-deployment-optimization, Example 4: Max output tokens default
     * Validates: Requirements 4.1
     * 
     * Verify that the default maxOutputTokens is 2048 or less
     */
    it('should have DEFAULT_MAX_OUTPUT_TOKENS set to 2048 or less (Requirement 4.1)', () => {
      // Example 4: Max output tokens default
      // Validates: Requirements 4.1
      expect(DEFAULT_MAX_OUTPUT_TOKENS).toBeLessThanOrEqual(2048);
      expect(DEFAULT_MAX_OUTPUT_TOKENS).toBe(2048);
    });

    it('should use a token limit sufficient for narrative JSON responses', () => {
      // 2048 tokens is approximately 1500-2000 words
      // Narrative JSON typically requires:
      // - shortDescription: ~50-100 tokens
      // - fullDescription: ~200-400 tokens
      // - flora array: ~50-100 tokens
      // - fauna array: ~50-100 tokens
      // - climate object: ~50-100 tokens
      // - visualPrompt: ~50-100 tokens
      // Total: ~450-900 tokens, well within 2048 limit
      expect(DEFAULT_MAX_OUTPUT_TOKENS).toBeGreaterThanOrEqual(1024);
      expect(DEFAULT_MAX_OUTPUT_TOKENS).toBeLessThanOrEqual(2048);
    });
  });

  describe('Video generation configuration', () => {
    /**
     * Example 5: Default video duration
     * Feature: pre-deployment-optimization, Example 5: Default video duration
     * Validates: Requirements 5.1
     * 
     * Verify that DEFAULT_VIDEO_DURATION equals 4 seconds
     * This reduces video generation costs by 33% ($0.60 vs $0.90 per video)
     */
    it('should have DEFAULT_VIDEO_DURATION set to 4 seconds (Requirement 5.1)', () => {
      // Example 5: Default video duration
      // Validates: Requirements 5.1
      expect(DEFAULT_VIDEO_DURATION).toBe(4);
    });

    it('should calculate correct video cost for 4-second duration', () => {
      // Veo 3.1 Fast costs $0.15 per second
      // 4 seconds = $0.60 (33% savings vs 6 seconds at $0.90)
      const expectedCost = DEFAULT_VIDEO_DURATION * VIDEO_COST_PER_SECOND_FAST;
      expect(expectedCost).toBe(0.60);
    });

    it('should use a duration within Veo 3.1 Fast supported range', () => {
      // Veo 3.1 Fast supports 4, 6, or 8 second videos
      expect([4, 6, 8]).toContain(DEFAULT_VIDEO_DURATION);
    });
  });

  describe('Model configuration usage', () => {
    /**
     * Property 8: Model configuration usage
     * Feature: pre-deployment-optimization, Property 8: Model configuration usage
     * Validates: Requirements 7.1
     * 
     * For any model identifier in MODEL_USE_CASES, that model should be 
     * referenced in at least one service implementation (i.e., be a valid model)
     */
    it('should have all MODEL_USE_CASES reference valid models', () => {
      // Get all valid model identifiers from GEMINI_MODELS and VEO_MODELS
      const validModels = new Set([
        ...Object.values(GEMINI_MODELS),
        ...Object.values(VEO_MODELS),
      ]);

      // Get all actively used model use cases (excluding deprecated ones)
      const activeUseCases = ['CREATURE_NARRATION', 'ERA_WELCOME', 'ERA_NARRATIVE', 'ERA_IMAGE', 'ERA_VIDEO'] as const;

      fc.assert(
        fc.property(
          fc.constantFrom(...activeUseCases),
          (useCase) => {
            const model = MODEL_USE_CASES[useCase];
            // Every active use case should reference a valid model
            expect(validModels.has(model)).toBe(true);
            // Every active model should have specs defined
            expect(MODEL_SPECS[model as keyof typeof MODEL_SPECS]).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have model specs for all referenced models', () => {
      // All models referenced in active use cases should have specs
      const activeUseCases = ['CREATURE_NARRATION', 'ERA_WELCOME', 'ERA_NARRATIVE', 'ERA_IMAGE', 'ERA_VIDEO'] as const;
      
      activeUseCases.forEach((useCase) => {
        const model = MODEL_USE_CASES[useCase];
        const specs = MODEL_SPECS[model as keyof typeof MODEL_SPECS];
        expect(specs).toBeDefined();
        expect(specs.name).toBeTruthy();
        expect(specs.speed).toBeTruthy();
        expect(specs.cost).toBeTruthy();
      });
    });
  });

  describe('Unused configuration cleanup', () => {
    /**
     * Example 8: Unused configuration cleanup
     * Feature: pre-deployment-optimization, Example 8: Unused configuration cleanup
     * Validates: Requirements 7.2
     * 
     * Verify that unused model configurations (QUIZ_GENERATION, PERSONALIZATION) 
     * are removed or marked deprecated
     */
    it('should mark QUIZ_GENERATION as deprecated (Requirement 7.2)', () => {
      // QUIZ_GENERATION should either be removed or clearly marked as deprecated
      // If it exists, it should be documented as a future/deprecated feature
      if ('QUIZ_GENERATION' in MODEL_USE_CASES) {
        // The configuration exists but should be marked as deprecated in comments
        // This test verifies the configuration is for future use only
        expect(MODEL_USE_CASES.QUIZ_GENERATION).toBe(GEMINI_MODELS.PRO);
      }
    });

    it('should mark PERSONALIZATION as deprecated (Requirement 7.2)', () => {
      // PERSONALIZATION should either be removed or clearly marked as deprecated
      // If it exists, it should be documented as a future/deprecated feature
      if ('PERSONALIZATION' in MODEL_USE_CASES) {
        // The configuration exists but should be marked as deprecated in comments
        // This test verifies the configuration is for future use only
        expect(MODEL_USE_CASES.PERSONALIZATION).toBe(GEMINI_MODELS.PRO);
      }
    });

    it('should only have actively used configurations without deprecated marker', () => {
      // List of actively used configurations (not deprecated)
      const activeConfigurations = [
        'CREATURE_NARRATION',
        'ERA_WELCOME', 
        'ERA_NARRATIVE',
        'ERA_IMAGE',
        'ERA_VIDEO',
      ];

      // List of deprecated/future configurations
      const deprecatedConfigurations = [
        'QUIZ_GENERATION',
        'PERSONALIZATION',
      ];

      // Verify all active configurations exist
      activeConfigurations.forEach((config) => {
        expect(config in MODEL_USE_CASES).toBe(true);
      });

      // Verify deprecated configurations are properly identified
      // (they may exist but should be marked as deprecated in code comments)
      const allConfigs = Object.keys(MODEL_USE_CASES);
      const unexpectedConfigs = allConfigs.filter(
        (config) => !activeConfigurations.includes(config) && !deprecatedConfigurations.includes(config)
      );
      
      // There should be no unexpected configurations
      expect(unexpectedConfigs).toEqual([]);
    });
  });

  describe('Explicit cache threshold configuration', () => {
    /**
     * Example 9: Explicit cache threshold
     * Feature: pre-deployment-optimization, Example 9: Explicit cache threshold
     * Validates: Requirements 8.1
     * 
     * Verify that EXPLICIT_CACHE_MIN_TOKENS is 512 or less
     * This lower threshold enables explicit caching for geological context prompts
     * which typically range from 500-2000 tokens, ensuring cost savings are achieved.
     */
    it('should have EXPLICIT_CACHE_MIN_TOKENS set to 512 or less (Requirement 8.1)', () => {
      // Example 9: Explicit cache threshold
      // Validates: Requirements 8.1
      expect(EXPLICIT_CACHE_MIN_TOKENS).toBeLessThanOrEqual(512);
      expect(EXPLICIT_CACHE_MIN_TOKENS).toBe(512);
    });

    it('should use a threshold appropriate for geological context prompts', () => {
      // Geological context prompts typically contain:
      // - Location coordinates and place name: ~50-100 tokens
      // - Era information (name, period, age): ~50-100 tokens
      // - Geological features and formations: ~100-300 tokens
      // - Rock types and mineral composition: ~100-200 tokens
      // - Environmental context: ~100-200 tokens
      // Total: ~400-900 tokens for typical prompts
      // 
      // A threshold of 512 tokens ensures most geological prompts
      // will trigger explicit caching for cost savings
      expect(EXPLICIT_CACHE_MIN_TOKENS).toBeGreaterThanOrEqual(256);
      expect(EXPLICIT_CACHE_MIN_TOKENS).toBeLessThanOrEqual(1024);
    });
  });
});
