/**
 * Video Generator Arbitraries
 * Generators for video-related types used in property-based testing
 */

import * as fc from 'fast-check';
import type { VideoGenerationOptions, VideoOperation, GeneratedVideo } from '../../deep-time-app/src/services/ai/types';
import { MIN_VIDEO_DURATION, MAX_VIDEO_DURATION } from '../../deep-time-app/src/services/ai/types';

/**
 * Generator for valid video durations (4-6 seconds)
 * Property 14: Video duration range
 */
export const validVideoDurationArb: fc.Arbitrary<4 | 6> = fc.constantFrom(4, 6);

/**
 * Generator for invalid video durations (outside 4-6 range)
 */
export const invalidVideoDurationArb: fc.Arbitrary<number> = fc.oneof(
  fc.integer({ min: -100, max: MIN_VIDEO_DURATION - 1 }),
  fc.integer({ min: MAX_VIDEO_DURATION + 1, max: 100 })
);

/**
 * Generator for video resolution options
 */
export const videoResolutionArb: fc.Arbitrary<'720p' | '1080p'> = fc.constantFrom('720p', '1080p');

/**
 * Generator for video generation options
 */
export const videoGenerationOptionsArb: fc.Arbitrary<VideoGenerationOptions> = fc.record({
  duration: fc.option(validVideoDurationArb, { nil: undefined }),
  resolution: fc.option(videoResolutionArb, { nil: undefined }),
  useImageAsFirstFrame: fc.option(fc.boolean(), { nil: undefined }),
});

/**
 * Generator for video operation status
 */
export const videoOperationStatusArb: fc.Arbitrary<'pending' | 'processing' | 'complete' | 'failed'> = 
  fc.constantFrom('pending', 'processing', 'complete', 'failed');

/**
 * Generator for video operation handles
 */
export const videoOperationArb: fc.Arbitrary<VideoOperation> = fc.record({
  operationId: fc.string({ minLength: 10, maxLength: 50 }).map(s => `operations/${s}`),
  status: videoOperationStatusArb,
  estimatedCompletion: fc.date({ min: new Date(), max: new Date(Date.now() + 600000) }),
  progress: fc.integer({ min: 0, max: 100 }),
});

/**
 * Generator for generated video metadata (without actual blob data)
 */
export const generatedVideoMetadataArb: fc.Arbitrary<Omit<GeneratedVideo, 'videoData'>> = fc.record({
  id: fc.uuid().map(id => `vid_${id}`),
  mimeType: fc.constant('video/mp4'),
  duration: fc.integer({ min: MIN_VIDEO_DURATION, max: MAX_VIDEO_DURATION }),
  width: fc.constantFrom(1280, 1920),
  height: fc.constantFrom(720, 1080),
  prompt: fc.lorem({ maxCount: 5, mode: 'sentences' }),
  generatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date('2030-01-01') }),
  modelUsed: fc.constant('veo-3.1-fast-preview'),
  cost: fc.double({ min: 0.5, max: 2.0, noNaN: true }),
});

/**
 * Generator for video cost calculation inputs
 */
export const videoCostInputArb: fc.Arbitrary<{ duration: number; expectedCost: number }> = 
  fc.integer({ min: MIN_VIDEO_DURATION, max: MAX_VIDEO_DURATION }).map(duration => ({
    duration,
    expectedCost: duration * 0.15, // VIDEO_COST_PER_SECOND_FAST
  }));
