/**
 * Video Generator Service
 * Generates short video clips using Veo 3.1 Fast
 * Requirements: 4.1, 4.2, 4.5, 5.1
 * 
 * Key Features:
 * - Uses Veo 3.1 Fast model for video generation (4-8 seconds supported)
 * - Default duration: 4 seconds ($0.60 per video) for cost optimization
 * - Implements async operation handling with polling
 * - Handles blob storage to IndexedDB
 * - Integrates with Prompt Builder for location-specific prompts
 */

import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';
import type {
  GeneratedVideo,
  VideoOperation,
  VideoGenerationOptions,
  VideoExtensionOptions,
  EnhancedNarrative,
  GeneratedImage,
} from './types';
import {
  DEFAULT_VIDEO_DURATION,
  MIN_VIDEO_DURATION,
  MAX_VIDEO_DURATION,
  VIDEO_COST_PER_SECOND_FAST,
  MAX_VIDEO_EXTENSIONS,
} from './types';
import { promptBuilder } from './promptBuilder';
import { aiCacheService } from './aiCache';
import { getActiveApiKey } from '../../components/ApiKeyModal';

// ============================================
// Constants
// ============================================

/**
 * Import model from centralized config
 * Design Reference: .kiro/specs/ai-flow-redesign/design.md
 */
import { MODEL_USE_CASES } from '../../config/aiModels';

/**
 * Video model from centralized config
 * Uses Veo 3.1 Fast for video generation
 * - Cost: $0.15 per second of video with audio
 * - Rate limits (Tier 1): 2 RPM, 10 RPD
 */
const VIDEO_MODEL = MODEL_USE_CASES.ERA_VIDEO;

/**
 * Gemini API base URL for video generation
 */
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Default video generation configuration
 */
const DEFAULT_VIDEO_CONFIG: Required<VideoGenerationOptions> = {
  duration: DEFAULT_VIDEO_DURATION as 4 | 6 | 8,
  resolution: '720p',
  useImageAsFirstFrame: false,
};

/**
 * Polling interval for video generation status (10 seconds)
 */
const POLL_INTERVAL_MS = 10000;

/**
 * Maximum polling attempts before timeout (30 attempts = 5 minutes)
 */
const MAX_POLL_ATTEMPTS = 30;

// ============================================
// Types
// ============================================

/**
 * Error types specific to video generation
 */
export type VideoGeneratorErrorType =
  | 'api_error'
  | 'parse_error'
  | 'rate_limit'
  | 'invalid_response'
  | 'invalid_key'
  | 'network_error'
  | 'generation_timeout'
  | 'invalid_duration'
  | 'operation_failed';

/**
 * Custom error class for video generation errors
 */
export class VideoGeneratorError extends Error {
  constructor(
    public readonly type: VideoGeneratorErrorType,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'VideoGeneratorError';
  }
}

/**
 * Response structure from Veo API for video generation
 */
interface VeoGenerateResponse {
  name: string; // Operation name for polling
}

/**
 * Response structure from Veo API for operation status
 */
interface VeoOperationResponse {
  name: string;
  done: boolean;
  error?: {
    code: number;
    message: string;
  };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video: {
          uri: string;
        };
      }>;
    };
    generatedVideos?: Array<{
      video: {
        uri: string;
      };
    }>;
  };
}

// ============================================
// Video Generator Interface
// ============================================

export interface VideoGenerator {
  /**
   * Generate video for a location-era combination
   * Uses Veo 3.1 Fast for 4-6 second clips
   * Returns operation handle for async polling
   * 
   * Requirement 4.1: Generate 4-6 second videos using Veo 3.1 Fast
   * Requirement 4.5: Use Veo 3.1 Fast model
   */
  generateVideo(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    narrative: EnhancedNarrative,
    image?: GeneratedImage,
    options?: VideoGenerationOptions
  ): Promise<VideoOperation>;

  /**
   * Poll video generation status
   * Returns GeneratedVideo when complete, null if still processing
   */
  pollVideoStatus(operation: VideoOperation): Promise<GeneratedVideo | null>;

  /**
   * Wait for video generation to complete with automatic polling
   * Convenience method that handles the polling loop
   */
  waitForVideo(operation: VideoOperation): Promise<GeneratedVideo>;

  /**
   * Calculate video generation cost based on duration
   * Requirement 11.4: Log video generation costs based on duration
   */
  calculateCost(durationSeconds: number): number;

  /**
   * Validate video duration is within acceptable range (4-6 seconds)
   * Property 14: Video duration range
   */
  validateDuration(duration: number): boolean;

  /**
   * Check if the API key is configured and valid
   */
  isConfigured(): boolean;

  /**
   * Extend an existing video by 7 seconds
   * Uses Veo 3.1 video extension feature
   * Max 5 extensions per video chain (up to ~148 seconds total)
   */
  extendVideo(options: VideoExtensionOptions): Promise<VideoOperation>;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the current API key (runtime or env)
 */
function getGeminiApiKey(): string {
  const runtimeKey = getActiveApiKey();
  if (runtimeKey) return runtimeKey;
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Generates a unique ID for the video
 */
function generateVideoId(): string {
  return `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Fetches video blob from URI
 */
async function fetchVideoBlob(uri: string, apiKey: string): Promise<Blob> {
  // The URI from Veo API requires the API key for authentication
  const response = await fetch(uri, {
    headers: {
      'x-goog-api-key': apiKey,
    },
  });

  if (!response.ok) {
    throw new VideoGeneratorError(
      'api_error',
      `Failed to download video: ${response.status} ${response.statusText}`
    );
  }

  return response.blob();
}

/**
 * Estimates video duration from blob size (rough approximation)
 * In production, we'd use video metadata or API response
 */
function estimateVideoDuration(requestedDuration: number): number {
  // Return the requested duration as Veo generates videos of specified length
  return requestedDuration;
}

// ============================================
// Video Generator Implementation
// ============================================

export const videoGenerator: VideoGenerator = {
  /**
   * Generate video for a location-era combination
   * Property 14: Video duration range (4-6 seconds)
   * Property 15: Video prompt location-specificity
   * Property 42: Video cost logging
   */
  async generateVideo(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    narrative: EnhancedNarrative,
    image?: GeneratedImage,
    options?: VideoGenerationOptions
  ): Promise<VideoOperation> {
    const apiKey = getGeminiApiKey();

    // Property 33: No API calls without key
    if (!apiKey) {
      throw new VideoGeneratorError(
        'invalid_key',
        'Gemini API key not configured. Video generation requires a valid API key.'
      );
    }

    // Merge options with defaults
    const config = {
      ...DEFAULT_VIDEO_CONFIG,
      ...options,
      // Auto-enable first frame when image is provided and not explicitly disabled
      useImageAsFirstFrame: options?.useImageAsFirstFrame ?? (image !== undefined),
    };

    // Validate duration
    // Property 14: Video duration range
    if (!this.validateDuration(config.duration)) {
      throw new VideoGeneratorError(
        'invalid_duration',
        `Video duration must be between ${MIN_VIDEO_DURATION} and ${MAX_VIDEO_DURATION} seconds. Got: ${config.duration}`
      );
    }

    // Build the video prompt using Prompt Builder
    // Requirement 4.2: Use text-to-video generation with location-specific prompts
    // Property 15: Video prompt location-specificity
    const prompt = promptBuilder.buildVideoPrompt(location, layer, narrative);

    console.log(`[VideoGenerator] Starting video generation for ${layer.era.name} at ${narrative.locationContext.placeName}`);
    console.log(`[VideoGenerator] Duration: ${config.duration}s, Resolution: ${config.resolution}`);

    try {
      // Build request body
      const requestBody: Record<string, unknown> = {
        instances: [{
          prompt: prompt,
        }],
        parameters: {
          aspectRatio: '9:16',
          durationSeconds: config.duration,
          resolution: config.resolution,
          negativePrompt: 'cartoon, drawing, low quality, blur, text overlay, watermark, amateur',
        },
      };

      // If using image as first frame
      if (config.useImageAsFirstFrame && image) {
        // Convert image blob to base64
        const imageArrayBuffer = await image.imageData.arrayBuffer();
        const imageBase64 = btoa(
          new Uint8Array(imageArrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );

        requestBody.instances = [{
          prompt: prompt,
          image: {
            bytesBase64Encoded: imageBase64,
            mimeType: image.mimeType,
          },
        }];
      }

      // Make API request to start video generation
      const response = await fetch(
        `${GEMINI_API_BASE_URL}/models/${VIDEO_MODEL}:predictLongRunning`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        if (response.status === 429) {
          throw new VideoGeneratorError(
            'rate_limit',
            'Rate limit exceeded. Please try again later.'
          );
        }

        throw new VideoGeneratorError(
          'api_error',
          `Video generation request failed: ${response.status} - ${errorText}`
        );
      }

      const result: VeoGenerateResponse = await response.json();

      if (!result.name) {
        throw new VideoGeneratorError(
          'invalid_response',
          'Invalid response from Veo API: missing operation name'
        );
      }

      // Create operation handle
      const operation: VideoOperation = {
        operationId: result.name,
        status: 'pending',
        estimatedCompletion: new Date(Date.now() + 60000), // Estimate 1 minute
        progress: 0,
      };

      console.log(`[VideoGenerator] Video generation started. Operation: ${operation.operationId}`);

      return operation;
    } catch (error) {
      console.error('[VideoGenerator] Generation failed:', error);

      if (error instanceof VideoGeneratorError) {
        throw error;
      }

      throw new VideoGeneratorError(
        'api_error',
        `Video generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Poll video generation status
   * Returns GeneratedVideo when complete, null if still processing
   */
  async pollVideoStatus(operation: VideoOperation): Promise<GeneratedVideo | null> {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      throw new VideoGeneratorError(
        'invalid_key',
        'Gemini API key not configured.'
      );
    }

    try {
      const response = await fetch(
        `${GEMINI_API_BASE_URL}/${operation.operationId}`,
        {
          method: 'GET',
          headers: {
            'x-goog-api-key': apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new VideoGeneratorError(
          'api_error',
          `Failed to poll operation status: ${response.status}`
        );
      }

      const result: VeoOperationResponse = await response.json();

      // Check for errors
      if (result.error) {
        throw new VideoGeneratorError(
          'operation_failed',
          `Video generation failed: ${result.error.message}`
        );
      }

      // If not done, return null
      if (!result.done) {
        // Update operation status
        operation.status = 'processing';
        operation.progress = Math.min(operation.progress + 10, 90);
        return null;
      }

      // Extract video URI from response
      const videoUri =
        result.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
        result.response?.generatedVideos?.[0]?.video?.uri;

      if (!videoUri) {
        throw new VideoGeneratorError(
          'invalid_response',
          'Video generation completed but no video URI in response'
        );
      }

      console.log(`[VideoGenerator] Video generation complete. Downloading from: ${videoUri}`);

      // Download the video
      const videoBlob = await fetchVideoBlob(videoUri, apiKey);

      // Generate unique ID
      const videoId = generateVideoId();

      // Estimate duration (Veo generates videos of requested length)
      const duration = estimateVideoDuration(DEFAULT_VIDEO_DURATION);

      // Calculate cost
      // Requirement 11.4: Log video generation costs based on duration
      const cost = this.calculateCost(duration);

      // Create the generated video object
      const generatedVideo: GeneratedVideo = {
        id: videoId,
        videoData: videoBlob,
        mimeType: 'video/mp4',
        duration,
        width: 1280, // 720p
        height: 720,
        prompt: '', // Prompt was used in generation
        generatedAt: new Date(),
        modelUsed: VIDEO_MODEL,
        cost,
      };

      // Store the video blob in cache
      // Requirement 4.3: Cache video in IndexedDB
      try {
        await aiCacheService.storeMediaBlob(videoId, 'video', videoBlob);
        console.log(`[VideoGenerator] Video cached with ID: ${videoId}`);
      } catch (cacheError) {
        console.warn('[VideoGenerator] Failed to cache video:', cacheError);
        // Continue even if caching fails
      }

      // Log cost
      // Property 42: Video cost logging
      try {
        await aiCacheService.logApiCost(0, 0, cost);
      } catch (costError) {
        console.warn('[VideoGenerator] Failed to log cost:', costError);
      }

      console.log(`[VideoGenerator] Video ready. Duration: ${duration}s, Cost: $${cost.toFixed(2)}`);

      return generatedVideo;
    } catch (error) {
      console.error('[VideoGenerator] Poll failed:', error);

      if (error instanceof VideoGeneratorError) {
        throw error;
      }

      throw new VideoGeneratorError(
        'api_error',
        `Failed to poll video status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Wait for video generation to complete with automatic polling
   * Convenience method that handles the polling loop
   */
  async waitForVideo(operation: VideoOperation): Promise<GeneratedVideo> {
    let attempts = 0;

    while (attempts < MAX_POLL_ATTEMPTS) {
      const video = await this.pollVideoStatus(operation);

      if (video) {
        return video;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      attempts++;

      console.log(`[VideoGenerator] Polling attempt ${attempts}/${MAX_POLL_ATTEMPTS}...`);
    }

    throw new VideoGeneratorError(
      'generation_timeout',
      `Video generation timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000} seconds`
    );
  },

  /**
   * Calculate video generation cost based on duration
   * Requirement 11.4: Log video generation costs based on duration
   * 
   * Pricing (Veo 3.1 Fast):
   * - $0.15 per second of video
   */
  calculateCost(durationSeconds: number): number {
    return durationSeconds * VIDEO_COST_PER_SECOND_FAST;
  },

  /**
   * Validate video duration is within acceptable range
   * Property 14: Video duration range (4-6 seconds)
   */
  validateDuration(duration: number): boolean {
    return duration >= MIN_VIDEO_DURATION && duration <= MAX_VIDEO_DURATION;
  },

  /**
   * Check if the API key is configured and valid
   */
  isConfigured(): boolean {
    const apiKey = getGeminiApiKey();
    return !!apiKey && apiKey.length > 0;
  },

  /**
   * Extend an existing video by 7 seconds
   * Uses Veo 3.1 video extension feature
   */
  async extendVideo(options: VideoExtensionOptions): Promise<VideoOperation> {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      throw new VideoGeneratorError(
        'invalid_key',
        'Gemini API key not configured. Video extension requires a valid API key.'
      );
    }

    const { sourceVideo, extensionPrompt, eraName, placeName } = options;

    // Check extension limit
    const currentExtensions = sourceVideo.extensionCount ?? 0;
    if (currentExtensions >= MAX_VIDEO_EXTENSIONS) {
      throw new VideoGeneratorError(
        'invalid_duration',
        `Maximum of ${MAX_VIDEO_EXTENSIONS} extensions reached for this video.`
      );
    }

    console.log(`[VideoGenerator] Extending video ${sourceVideo.id} (extension ${currentExtensions + 1}/${MAX_VIDEO_EXTENSIONS})`);

    try {
      // Build extension prompt with context
      const fullPrompt = `Continue this prehistoric video clip smoothly.

Original Context:
- Era: ${eraName}
- Location: ${placeName}

Extension Direction:
${extensionPrompt}

Maintain visual consistency with the original clip. Keep the same lighting, color palette, and atmosphere.`;

      // Convert source video blob to base64
      const videoArrayBuffer = await sourceVideo.videoData.arrayBuffer();
      const videoBase64 = btoa(
        new Uint8Array(videoArrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      const requestBody = {
        instances: [{
          prompt: fullPrompt,
          video: {
            bytesBase64Encoded: videoBase64,
            mimeType: sourceVideo.mimeType,
          },
        }],
        parameters: {
          aspectRatio: '9:16',
          resolution: '720p', // Extension only supports 720p
          numberOfVideos: 1,
        },
      };

      const response = await fetch(
        `${GEMINI_API_BASE_URL}/models/${VIDEO_MODEL}:predictLongRunning`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();

        if (response.status === 429) {
          throw new VideoGeneratorError(
            'rate_limit',
            'Rate limit exceeded. Please try again later.'
          );
        }

        throw new VideoGeneratorError(
          'api_error',
          `Video extension request failed: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();

      if (!result.name) {
        throw new VideoGeneratorError(
          'invalid_response',
          'Invalid response from Veo API: missing operation name'
        );
      }

      const operation: VideoOperation = {
        operationId: result.name,
        status: 'pending',
        estimatedCompletion: new Date(Date.now() + 60000),
        progress: 0,
      };

      console.log(`[VideoGenerator] Video extension started. Operation: ${operation.operationId}`);

      return operation;
    } catch (error) {
      console.error('[VideoGenerator] Extension failed:', error);

      if (error instanceof VideoGeneratorError) {
        throw error;
      }

      throw new VideoGeneratorError(
        'api_error',
        `Video extension failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  },
};

export default videoGenerator;
