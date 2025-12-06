/**
 * Persistence Generators for Property-Based Testing
 * Generates persistence-related test data for the PersistenceService
 */

import * as fc from 'fast-check';
import type { 
  EraContent, 
  EnhancedNarrative, 
  GeneratedImage, 
  GeneratedVideo,
  CacheMetadata,
  LocationContext,
  TokenUsage,
} from '../../deep-time-app/src/services/ai/types';
import type { FirestoreSyncMetadata } from '../../deep-time-app/src/services/ai/persistenceService';
import { CACHE_TTL_MS } from '../../deep-time-app/src/services/ai/types';
import { geoCoordinateArb, geologicalLayerArb } from './geological.generators';
import { cacheKeyArb } from './cache.generators';

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
  cachedTokens: fc.integer({ min: 0, max: 10000 }),
  totalCost: fc.double({ min: 0, max: 10, noNaN: true }),
});

/**
 * Generate an enhanced narrative
 */
export const enhancedNarrativeArb: fc.Arbitrary<EnhancedNarrative> = fc.record({
  // Base Narrative fields
  era: fc.string({ minLength: 1, maxLength: 50 }),
  period: fc.string({ minLength: 1, maxLength: 50 }),
  yearsAgo: fc.integer({ min: 1000, max: 4500000000 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 1000 }),
  climate: fc.string({ minLength: 1, maxLength: 200 }),
  flora: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
  fauna: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
  geologicalEvents: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 0, maxLength: 3 }),
  funFact: fc.string({ minLength: 1, maxLength: 200 }),
  // Enhanced fields
  locationContext: locationContextArb,
  generatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  modelUsed: fc.constantFrom('gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'),
  tokenUsage: tokenUsageArb,
});

/**
 * Generate a generated image (without actual blob data for testing)
 */
export const generatedImageArb: fc.Arbitrary<GeneratedImage> = fc.record({
  id: fc.uuid(),
  imageData: fc.constant(new Blob(['test image data'], { type: 'image/png' })),
  mimeType: fc.constantFrom('image/png', 'image/jpeg'),
  width: fc.constantFrom(512, 1024, 2048),
  height: fc.constantFrom(512, 1024, 2048),
  prompt: fc.string({ minLength: 10, maxLength: 500 }),
  generatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  modelUsed: fc.constantFrom('gemini-2.5-flash-image', 'imagen-3'),
  resolution: fc.constantFrom('LOW', 'MEDIUM', 'HIGH'),
  cost: fc.double({ min: 0.01, max: 0.1, noNaN: true }),
});

/**
 * Generate a generated video (without actual blob data for testing)
 */
export const generatedVideoArb: fc.Arbitrary<GeneratedVideo> = fc.record({
  id: fc.uuid(),
  videoData: fc.constant(new Blob(['test video data'], { type: 'video/mp4' })),
  mimeType: fc.constant('video/mp4'),
  duration: fc.integer({ min: 4, max: 6 }),
  width: fc.constantFrom(720, 1080),
  height: fc.constantFrom(720, 1080),
  prompt: fc.string({ minLength: 10, maxLength: 500 }),
  generatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  modelUsed: fc.constantFrom('veo-3.1-fast', 'veo-3.1-standard'),
  cost: fc.double({ min: 0.5, max: 2, noNaN: true }),
});

/**
 * Generate cache metadata
 */
export const cacheMetadataArb: fc.Arbitrary<CacheMetadata> = fc.record({
  cacheKey: cacheKeyArb,
  cachedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  expiresAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(
    (date) => new Date(date.getTime() + CACHE_TTL_MS)
  ),
  lastAccessed: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  size: fc.integer({ min: 1000, max: 10000000 }),
  version: fc.integer({ min: 1, max: 5 }),
});

/**
 * Generate era content with all components
 */
export const eraContentArb: fc.Arbitrary<EraContent> = fc.record({
  narrative: enhancedNarrativeArb,
  image: fc.option(generatedImageArb, { nil: null }),
  video: fc.option(generatedVideoArb, { nil: null }),
  cacheMetadata: cacheMetadataArb,
});

/**
 * Generate era content with image
 */
export const eraContentWithImageArb: fc.Arbitrary<EraContent> = fc.record({
  narrative: enhancedNarrativeArb,
  image: generatedImageArb,
  video: fc.option(generatedVideoArb, { nil: null }),
  cacheMetadata: cacheMetadataArb,
});

/**
 * Generate era content with video
 */
export const eraContentWithVideoArb: fc.Arbitrary<EraContent> = fc.record({
  narrative: enhancedNarrativeArb,
  image: fc.option(generatedImageArb, { nil: null }),
  video: generatedVideoArb,
  cacheMetadata: cacheMetadataArb,
});

/**
 * Generate era content with both image and video
 */
export const eraContentFullArb: fc.Arbitrary<EraContent> = fc.record({
  narrative: enhancedNarrativeArb,
  image: generatedImageArb,
  video: generatedVideoArb,
  cacheMetadata: cacheMetadataArb,
});

/**
 * Generate Firestore sync metadata
 */
export const firestoreSyncMetadataArb: fc.Arbitrary<FirestoreSyncMetadata> = fc.record({
  cacheKey: cacheKeyArb,
  location: geoCoordinateArb,
  eraId: fc.uuid(),
  eraName: fc.string({ minLength: 1, maxLength: 50 }),
  generatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
  cachedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
  expiresAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString()),
  hasImage: fc.boolean(),
  hasVideo: fc.boolean(),
  imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
  videoUrl: fc.option(fc.webUrl(), { nil: undefined }),
  totalCost: fc.double({ min: 0, max: 10, noNaN: true }),
  textModel: fc.constantFrom('gemini-2.5-flash', 'gemini-2.0-flash'),
  imageModel: fc.option(fc.constantFrom('gemini-2.5-flash-image', 'imagen-3'), { nil: undefined }),
  videoModel: fc.option(fc.constantFrom('veo-3.1-fast', 'veo-3.1-standard'), { nil: undefined }),
});

/**
 * Generate a persistence result
 */
export interface PersistenceTestResult {
  success: boolean;
  cacheKey: string;
  persistedAt: Date;
  size: number;
  error?: string;
}

export const persistenceResultArb: fc.Arbitrary<PersistenceTestResult> = fc.record({
  success: fc.boolean(),
  cacheKey: cacheKeyArb,
  persistedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
  size: fc.integer({ min: 0, max: 10000000 }),
  error: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
});
