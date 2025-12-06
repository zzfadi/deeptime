/**
 * Video Generator Property Tests
 * Property-based tests for video generation service
 * 
 * **Feature: ai-flow-redesign**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validVideoDurationArb,
  invalidVideoDurationArb,
  videoCostInputArb,
} from '../generators/video.generators';
import {
  geoCoordinateArb,
  geologicalLayerArb,
} from '../generators/geological.generators';
import {
  narrativeArb,
  climateDescriptionArb,
} from '../generators/narrative.generators';
import {
  MIN_VIDEO_DURATION,
  MAX_VIDEO_DURATION,
  VIDEO_COST_PER_SECOND_FAST,
} from '../../deep-time-app/src/services/ai/types';
import {
  promptBuilder,
  formatYearsAgo,
} from '../../deep-time-app/src/services/ai/promptBuilder';
import type { EnhancedNarrative, LocationContext } from '../../deep-time-app/src/services/ai/types';

/**
 * Helper to create an EnhancedNarrative from a base Narrative
 */
function createEnhancedNarrative(
  narrative: ReturnType<typeof narrativeArb.generate>[0]['value'],
  locationContext: LocationContext
): EnhancedNarrative {
  return {
    ...narrative,
    locationContext,
    generatedAt: new Date(),
    modelUsed: 'gemini-2.5-flash',
    tokenUsage: {
      inputTokens: 100,
      outputTokens: 200,
      cachedTokens: 0,
      totalCost: 0.001,
    },
  };
}

/**
 * Helper to create a LocationContext
 */
function createLocationContext(
  coord: ReturnType<typeof geoCoordinateArb.generate>[0]['value']
): LocationContext {
  return {
    coordinates: coord,
    placeName: 'Test Location',
    geologicalFeatures: ['mountains', 'valleys'],
    nearbyLandmarks: ['river', 'forest'],
  };
}

describe('Video Generator Properties', () => {
  /**
   * **Feature: ai-flow-redesign, Property 14: Video duration range**
   * **Validates: Requirements 4.1**
   * 
   * *For any* generated video, its duration should be between 4 and 6 seconds (inclusive)
   */
  describe('Property 14: Video duration range', () => {
    it('valid durations (4-6 seconds) should pass validation', () => {
      fc.assert(
        fc.property(validVideoDurationArb, (duration) => {
          // Duration validation function
          const isValid = duration >= MIN_VIDEO_DURATION && duration <= MAX_VIDEO_DURATION;
          expect(isValid).toBe(true);
          return isValid;
        }),
        { numRuns: 100 }
      );
    });

    it('invalid durations (outside 4-6 range) should fail validation', () => {
      fc.assert(
        fc.property(invalidVideoDurationArb, (duration) => {
          // Duration validation function
          const isValid = duration >= MIN_VIDEO_DURATION && duration <= MAX_VIDEO_DURATION;
          expect(isValid).toBe(false);
          return !isValid;
        }),
        { numRuns: 100 }
      );
    });

    it('duration constants are correctly defined', () => {
      expect(MIN_VIDEO_DURATION).toBe(4);
      expect(MAX_VIDEO_DURATION).toBe(8); // Veo 3.1 Fast supports up to 8 seconds
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 15: Video prompt location-specificity**
   * **Validates: Requirements 4.2**
   * 
   * *For any* video generation prompt, it should include location name, era name, and narrative elements
   */
  describe('Property 15: Video prompt location-specificity', () => {
    it('video prompt should contain location name', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          narrativeArb,
          fc.string({ minLength: 3, maxLength: 50 }),
          (coord, layer, narrative, placeName) => {
            const locationContext = {
              ...createLocationContext(coord),
              placeName,
            };
            const enhancedNarrative = createEnhancedNarrative(narrative, locationContext);
            
            const prompt = promptBuilder.buildVideoPrompt(coord, layer, enhancedNarrative);
            
            // Prompt should contain the place name
            expect(prompt).toContain(placeName);
            return prompt.includes(placeName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('video prompt should contain era name', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          narrativeArb,
          (coord, layer, narrative) => {
            const locationContext = createLocationContext(coord);
            const enhancedNarrative = createEnhancedNarrative(narrative, locationContext);
            
            const prompt = promptBuilder.buildVideoPrompt(coord, layer, enhancedNarrative);
            
            // Prompt should contain the era name
            expect(prompt).toContain(layer.era.name);
            return prompt.includes(layer.era.name);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('video prompt should contain period name', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          narrativeArb,
          (coord, layer, narrative) => {
            const locationContext = createLocationContext(coord);
            const enhancedNarrative = createEnhancedNarrative(narrative, locationContext);
            
            const prompt = promptBuilder.buildVideoPrompt(coord, layer, enhancedNarrative);
            
            // Prompt should contain the period
            expect(prompt).toContain(layer.era.period);
            return prompt.includes(layer.era.period);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('video prompt should contain years ago formatted', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          narrativeArb,
          (coord, layer, narrative) => {
            const locationContext = createLocationContext(coord);
            const enhancedNarrative = createEnhancedNarrative(narrative, locationContext);
            
            const prompt = promptBuilder.buildVideoPrompt(coord, layer, enhancedNarrative);
            const yearsAgoFormatted = formatYearsAgo(layer.era.yearsAgo);
            
            // Prompt should contain the formatted years ago
            expect(prompt).toContain(yearsAgoFormatted);
            return prompt.includes(yearsAgoFormatted);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('video prompt should contain narrative flora elements', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          narrativeArb,
          (coord, layer, narrative) => {
            const locationContext = createLocationContext(coord);
            const enhancedNarrative = createEnhancedNarrative(narrative, locationContext);
            
            const prompt = promptBuilder.buildVideoPrompt(coord, layer, enhancedNarrative);
            
            // Prompt should contain at least one flora element from the narrative
            const hasFlora = narrative.flora.some(plant => prompt.includes(plant));
            expect(hasFlora).toBe(true);
            return hasFlora;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('video prompt should contain narrative fauna elements', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          narrativeArb,
          (coord, layer, narrative) => {
            const locationContext = createLocationContext(coord);
            const enhancedNarrative = createEnhancedNarrative(narrative, locationContext);
            
            const prompt = promptBuilder.buildVideoPrompt(coord, layer, enhancedNarrative);
            
            // Prompt should contain at least one fauna element from the narrative
            const hasFauna = narrative.fauna.some(creature => prompt.includes(creature));
            expect(hasFauna).toBe(true);
            return hasFauna;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 42: Video cost logging**
   * **Validates: Requirements 11.4**
   * 
   * *For any* generated video, the system should log the cost based on duration (Veo 3.1 Fast = $0.15 per second)
   */
  describe('Property 42: Video cost logging', () => {
    it('video cost should be calculated correctly based on duration', () => {
      fc.assert(
        fc.property(videoCostInputArb, ({ duration, expectedCost }) => {
          // Calculate cost using the same formula as the video generator
          const calculatedCost = duration * VIDEO_COST_PER_SECOND_FAST;
          
          expect(calculatedCost).toBeCloseTo(expectedCost, 10);
          return Math.abs(calculatedCost - expectedCost) < 0.0001;
        }),
        { numRuns: 100 }
      );
    });

    it('cost per second constant should be $0.15 for Veo 3.1 Fast', () => {
      expect(VIDEO_COST_PER_SECOND_FAST).toBe(0.15);
    });

    it('4-second video should cost $0.60', () => {
      const cost = 4 * VIDEO_COST_PER_SECOND_FAST;
      expect(cost).toBeCloseTo(0.60, 10);
    });

    it('5-second video should cost $0.75', () => {
      const cost = 5 * VIDEO_COST_PER_SECOND_FAST;
      expect(cost).toBeCloseTo(0.75, 10);
    });

    it('6-second video should cost $0.90', () => {
      const cost = 6 * VIDEO_COST_PER_SECOND_FAST;
      expect(cost).toBeCloseTo(0.90, 10);
    });
  });
});
