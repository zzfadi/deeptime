/**
 * Orchestrator Generators for Property-Based Testing
 * Generates test data for ContentOrchestrator property tests
 */

import * as fc from 'fast-check';
import type { GeoCoordinate, GeologicalLayer, ClimateDescription } from '../../src/types';
import type {
  EnhancedNarrative,
  GeneratedImage,
  GeneratedVideo,
  EraContent,
  CacheMetadata,
  LocationContext,
  TokenUsage,
} from '../../deep-time-app/src/services/ai/types';
import { CACHE_TTL_MS } from '../../deep-time-app/src/services/ai/types';
import { geoCoordinateArb, geologicalLayerArb } from './geological.generators';

/**
 * Generate a location context
 */
export const locationContextArb: fc.Arbitrary<LocationContext> = fc.record({
  coordinates: geoCoordinateArb,
  placeName: fc.string({ minLength: 1, maxLength: 100 }),
  geologicalFeatures: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
  nearbyLandmarks: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
});

/**
 * Generate token usage
 */
export const tokenUsageArb: fc.Arbitrary<TokenUsage> = fc.record({
  inputTokens: fc.integer({ min: 0, max: 10000 }),
  outputTokens: fc.integer({ min: 0, max: 5000 }),
  cachedTokens: fc.integer({ min: 0, max: 5000 }),
  totalCost: fc.double({ min: 0, max: 10, noNaN: true }),
});

/**
 * Generate a climate description
 */
export const climateDescriptionArb: fc.Arbitrary<ClimateDescription> = fc.record({
  temperature: fc.constantFrom('hot', 'warm', 'temperate', 'cool', 'cold', 'freezing'),
  humidity: fc.constantFrom('arid', 'dry', 'moderate', 'humid', 'tropical'),
  atmosphere: fc.constantFrom('clear', 'hazy', 'cloudy', 'stormy', 'volcanic'),
});

/**
 * Generate an enhanced narrative
 */
export const enhancedNarrativeArb: fc.Arbitrary<EnhancedNarrative> = fc.record({
  layerId: fc.uuid(),
  shortDescription: fc.string({ minLength: 10, maxLength: 200 }),
  fullDescription: fc.string({ minLength: 50, maxLength: 1000 }),
  visualPrompt: fc.string({ minLength: 10, maxLength: 500 }),
  flora: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
  fauna: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
  climate: climateDescriptionArb,
  soundscape: fc.string({ minLength: 1, maxLength: 100 }),
  locationContext: locationContextArb,
  generatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  modelUsed: fc.constantFrom('gemini-2.5-flash', 'fallback'),
  tokenUsage: tokenUsageArb,
});

/**
 * Generate a generated image (without actual blob data for testing)
 */
export const generatedImageArb: fc.Arbitrary<GeneratedImage> = fc.record({
  id: fc.uuid(),
  imageData: fc.constant(new Blob(['test'], { type: 'image/png' })),
  mimeType: fc.constantFrom('image/png', 'image/jpeg', 'image/svg+xml'),
  width: fc.constantFrom(1024, 1920, 1600),
  height: fc.constantFrom(1024, 1080, 1200),
  prompt: fc.string({ minLength: 10, maxLength: 500 }),
  generatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  modelUsed: fc.constantFrom('gemini-2.5-flash-image', 'fallback'),
  resolution: fc.constantFrom('LOW', 'MEDIUM', 'HIGH'),
  cost: fc.double({ min: 0, max: 1, noNaN: true }),
});

/**
 * Generate a generated video (without actual blob data for testing)
 */
export const generatedVideoArb: fc.Arbitrary<GeneratedVideo> = fc.record({
  id: fc.uuid(),
  videoData: fc.constant(new Blob(['test'], { type: 'video/mp4' })),
  mimeType: fc.constant('video/mp4'),
  duration: fc.integer({ min: 4, max: 6 }),
  width: fc.constantFrom(1280, 1920),
  height: fc.constantFrom(720, 1080),
  prompt: fc.string({ minLength: 10, maxLength: 500 }),
  generatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  modelUsed: fc.constant('veo-3.1-fast-preview'),
  cost: fc.double({ min: 0, max: 5, noNaN: true }),
});

/**
 * Generate cache metadata
 */
export const cacheMetadataArb: fc.Arbitrary<CacheMetadata> = fc.record({
  cacheKey: fc.string({ minLength: 10, maxLength: 100 }),
  cachedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  expiresAt: fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }).map(
    (futureMs) => new Date(Date.now() + futureMs)
  ),
  lastAccessed: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
  size: fc.integer({ min: 100, max: 10 * 1024 * 1024 }),
  version: fc.integer({ min: 1, max: 10 }),
});

/**
 * Generate era content
 */
export const eraContentArb: fc.Arbitrary<EraContent> = fc.record({
  narrative: enhancedNarrativeArb,
  image: fc.option(generatedImageArb, { nil: null }),
  video: fc.option(generatedVideoArb, { nil: null }),
  cacheMetadata: cacheMetadataArb,
});

/**
 * Generate a location-era pair for testing
 */
export const locationEraPairArb: fc.Arbitrary<{
  location: GeoCoordinate;
  era: GeologicalLayer;
}> = fc.record({
  location: geoCoordinateArb,
  era: geologicalLayerArb,
});

/**
 * Generate multiple distinct eras for the same location
 * Property 4: Unique content per era
 */
export const multipleErasForLocationArb: fc.Arbitrary<{
  location: GeoCoordinate;
  eras: GeologicalLayer[];
}> = fc.record({
  location: geoCoordinateArb,
  eras: fc.array(geologicalLayerArb, { minLength: 2, maxLength: 5 }),
}).filter(({ eras }) => {
  // Ensure all eras have unique IDs
  const ids = eras.map(e => e.id);
  return new Set(ids).size === ids.length;
});

/**
 * Generate a sequence of cache operations for testing
 */
export interface CacheOperation {
  type: 'get' | 'store' | 'invalidate';
  location: GeoCoordinate;
  era: GeologicalLayer;
}

export const cacheOperationArb: fc.Arbitrary<CacheOperation> = fc.record({
  type: fc.constantFrom('get', 'store', 'invalidate'),
  location: geoCoordinateArb,
  era: geologicalLayerArb,
});

export const cacheOperationSequenceArb: fc.Arbitrary<CacheOperation[]> = fc.array(
  cacheOperationArb,
  { minLength: 1, maxLength: 20 }
);

/**
 * Generate test data for API call tracking
 */
export interface ApiCallTracker {
  location: GeoCoordinate;
  era: GeologicalLayer;
  expectedApiCalls: number;
  operations: Array<'get' | 'refresh'>;
}

export const apiCallTrackerArb: fc.Arbitrary<ApiCallTracker> = fc.record({
  location: geoCoordinateArb,
  era: geologicalLayerArb,
  operations: fc.array(fc.constantFrom('get' as const, 'refresh' as const), { minLength: 1, maxLength: 10 }),
}).map(({ location, era, operations }) => {
  // Calculate expected API calls:
  // - First 'get' = 1 API call (cache miss)
  // - Subsequent 'get' = 0 API calls (cache hit)
  // - Each 'refresh' = 1 API call
  let expectedApiCalls = 0;
  let hasCachedContent = false;
  
  for (const op of operations) {
    if (op === 'get') {
      if (!hasCachedContent) {
        expectedApiCalls++;
        hasCachedContent = true;
      }
      // Cache hit - no API call
    } else if (op === 'refresh') {
      expectedApiCalls++;
      hasCachedContent = true; // Refresh also caches
    }
  }
  
  return { location, era, expectedApiCalls, operations };
});
