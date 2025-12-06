/**
 * Content Orchestrator Service
 * Coordinates content generation, caching, and delivery
 * Requirements: 1.3, 2.2, 2.3, 2.4, 3.1, 3.4, 3.5, 4.1, 4.3, 4.4
 * 
 * Key Features:
 * - Cache-first strategy for all content retrieval
 * - Parallel generation for text and image
 * - Async video generation with polling
 * - Preloading for adjacent eras
 */

import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';
import type {
  EraContent,
  CacheMetadata,
  GeneratedImage,
  GeneratedVideo,
  VideoOperation,
  LocationContext,
} from './types';
import { CACHE_TTL_MS } from './types';
import { cacheManager } from './cacheManager';
import { textGenerator } from './textGenerator';
import { imageGenerator } from './imageGenerator';
import { videoGenerator } from './videoGenerator';
import { buildLocationContext } from './locationContextService';
import { generateAICacheKey } from './aiCache';
import { isOffline, isApiKeyConfigured } from './errorHandling';
import { fallbackProvider } from './fallbackProvider';
import { getActiveApiKey } from '../../components/ApiKeyModal';

// ============================================
// Types
// ============================================

/**
 * Options for content retrieval
 */
export interface ContentRetrievalOptions {
  /** Skip cache and force regeneration */
  forceRefresh?: boolean;
  /** Skip image generation */
  skipImage?: boolean;
  /** Skip video generation */
  skipVideo?: boolean;
  /** Use fallback content on error */
  useFallbackOnError?: boolean;
}

/**
 * Result of content retrieval with status information
 */
export interface ContentRetrievalResult {
  /** The era content */
  content: EraContent;
  /** Whether content was served from cache */
  fromCache: boolean;
  /** Video operation if video is still generating */
  videoOperation?: VideoOperation;
}

/**
 * Error types specific to content orchestration
 */
export type ContentOrchestratorErrorType =
  | 'cache_error'
  | 'generation_error'
  | 'invalid_location'
  | 'invalid_era'
  | 'network_error';

/**
 * Custom error class for content orchestration errors
 */
export class ContentOrchestratorError extends Error {
  constructor(
    public readonly type: ContentOrchestratorErrorType,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ContentOrchestratorError';
  }
}

// ============================================
// Content Orchestrator Interface (from design.md)
// ============================================

/**
 * ContentOrchestrator interface as specified in the design document
 * Coordinates content generation, caching, and delivery
 */
export interface ContentOrchestrator {
  /**
   * Get complete content for a location-era combination
   * Returns cached content if available, generates if not
   * 
   * Requirement 1.3: Reuse cached content for same location
   * Requirement 2.2: Cache result with 30-day TTL
   * Requirement 2.3: Retrieve from cache without API call
   * Requirement 2.4: Generate and cache if missing/expired
   */
  getContent(
    location: GeoCoordinate,
    era: GeologicalLayer,
    options?: ContentRetrievalOptions
  ): Promise<ContentRetrievalResult>;

  /**
   * Invalidate cache and regenerate content
   * 
   * Requirement 6.2: Invalidate cached content for specific era
   * Requirement 6.3: Generate new content with varied prompts
   */
  refreshContent(
    location: GeoCoordinate,
    era: GeologicalLayer
  ): Promise<ContentRetrievalResult>;

  /**
   * Preload content for adjacent eras
   * Uses idle time for background generation
   */
  preloadAdjacentEras(
    location: GeoCoordinate,
    currentEra: GeologicalLayer,
    adjacentEras: GeologicalLayer[]
  ): Promise<void>;

  /**
   * Check if content exists in cache for a location-era
   */
  hasContent(
    location: GeoCoordinate,
    era: GeologicalLayer
  ): Promise<boolean>;

  /**
   * Get the cache key for a location-era combination
   * Property 18: Cache key format
   */
  getCacheKey(
    location: GeoCoordinate,
    era: GeologicalLayer
  ): string;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Creates cache metadata for new content
 */
function createCacheMetadata(
  location: GeoCoordinate,
  era: GeologicalLayer,
  contentSize: number
): CacheMetadata {
  const now = new Date();
  return {
    cacheKey: generateAICacheKey(location, era),
    cachedAt: now,
    expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
    lastAccessed: now,
    size: contentSize,
    version: 1,
  };
}

/**
 * Estimates content size in bytes
 */
function estimateContentSize(content: EraContent): number {
  let size = 0;
  
  // Estimate narrative size (JSON string length * 2 for UTF-16)
  size += JSON.stringify(content.narrative).length * 2;
  
  // Add image size if present
  if (content.image?.imageData) {
    size += content.image.imageData.size;
  }
  
  // Add video size if present
  if (content.video?.videoData) {
    size += content.video.videoData.size;
  }
  
  return size;
}

// ============================================
// Content Orchestrator Implementation
// ============================================

class ContentOrchestratorImpl implements ContentOrchestrator {
  /** Track API calls for testing/monitoring */
  private apiCallCount = 0;

  /**
   * Get complete content for a location-era combination
   * Implements cache-first strategy
   * 
   * Property 3: Cache reuse for same location
   * Property 7: Cache hit avoids API calls
   * Property 8: Cache miss triggers generation
   * Property 22: Offline cache-only behavior
   * Property 33: No API calls without key
   */
  async getContent(
    location: GeoCoordinate,
    era: GeologicalLayer,
    options: ContentRetrievalOptions = {}
  ): Promise<ContentRetrievalResult> {
    const cacheKey = this.getCacheKey(location, era);
    console.log(`[ContentOrchestrator] Getting content for ${cacheKey}`);

    // Check cache first (always, even when offline)
    // Requirement 2.3: Retrieve from cache without API call
    // Property 7: Cache hit avoids API calls
    const cached = await cacheManager.getContent(location, era);
    
    // Property 22: Offline cache-only behavior
    // Requirement 5.5: Serve all content from cache when offline
    if (isOffline()) {
      console.log(`[ContentOrchestrator] Device is offline`);
      
      if (cached && cacheManager.isValid(cached.metadata)) {
        console.log(`[ContentOrchestrator] Serving cached content while offline`);
        return {
          content: cached.content,
          fromCache: true,
        };
      }
      
      // No valid cache and offline - return fallback
      console.log(`[ContentOrchestrator] No cache available while offline, using fallback`);
      return {
        content: fallbackProvider.getCompleteFallback(era),
        fromCache: false,
      };
    }

    // Property 33: No API calls without key
    // Requirement 9.4: API key missing or invalid
    const apiKey = getActiveApiKey() || import.meta.env.VITE_GEMINI_API_KEY;
    if (!isApiKeyConfigured(apiKey)) {
      console.log(`[ContentOrchestrator] No API key configured`);
      
      if (cached && cacheManager.isValid(cached.metadata)) {
        console.log(`[ContentOrchestrator] Serving cached content (no API key)`);
        return {
          content: cached.content,
          fromCache: true,
        };
      }
      
      // No valid cache and no API key - return fallback
      console.log(`[ContentOrchestrator] No cache available and no API key, using fallback`);
      return {
        content: fallbackProvider.getCompleteFallback(era),
        fromCache: false,
      };
    }

    // Skip cache check if force refresh is requested
    if (!options.forceRefresh) {
      if (cached && cacheManager.isValid(cached.metadata)) {
        console.log(`[ContentOrchestrator] Cache HIT for ${cacheKey}`);
        return {
          content: cached.content,
          fromCache: true,
        };
      }
      
      console.log(`[ContentOrchestrator] Cache MISS for ${cacheKey}`);
    }

    // Generate new content
    // Requirement 2.4: Generate and cache if missing/expired
    // Property 8: Cache miss triggers generation
    return this.generateAndCacheContent(location, era, options);
  }

  /**
   * Invalidate cache and regenerate content
   * 
   * Property 21: Cache invalidation on refresh
   * Property 23: Refresh invalidates cache
   * Property 24: Refresh produces different content
   */
  async refreshContent(
    location: GeoCoordinate,
    era: GeologicalLayer
  ): Promise<ContentRetrievalResult> {
    const cacheKey = this.getCacheKey(location, era);
    console.log(`[ContentOrchestrator] Refreshing content for ${cacheKey}`);

    // Invalidate existing cache
    // Requirement 6.2: Invalidate cached content for specific era
    await cacheManager.invalidate(location, era);

    // Generate new content with force refresh
    // Requirement 6.3: Generate new content with varied prompts
    return this.getContent(location, era, { forceRefresh: true });
  }

  /**
   * Preload content for adjacent eras
   * Uses background generation for better UX
   */
  async preloadAdjacentEras(
    location: GeoCoordinate,
    _currentEra: GeologicalLayer,
    adjacentEras: GeologicalLayer[]
  ): Promise<void> {
    console.log(`[ContentOrchestrator] Preloading ${adjacentEras.length} adjacent eras`);

    // Preload each adjacent era in parallel (but don't wait for all)
    const preloadPromises = adjacentEras.map(async (era) => {
      try {
        // Only preload if not already cached
        const hasContent = await this.hasContent(location, era);
        if (!hasContent) {
          // Generate with lower priority (skip video for preload)
          await this.getContent(location, era, {
            skipVideo: true,
            useFallbackOnError: true,
          });
        }
      } catch (error) {
        // Silently fail preloading - it's not critical
        console.warn(`[ContentOrchestrator] Preload failed for era ${era.id}:`, error);
      }
    });

    // Don't await all - let them complete in background
    Promise.all(preloadPromises).catch(() => {
      // Ignore errors in background preloading
    });
  }

  /**
   * Check if content exists in cache for a location-era
   */
  async hasContent(
    location: GeoCoordinate,
    era: GeologicalLayer
  ): Promise<boolean> {
    const cached = await cacheManager.getContent(location, era);
    return cached !== null && cacheManager.isValid(cached.metadata);
  }

  /**
   * Get the cache key for a location-era combination
   * Property 18: Cache key format
   */
  getCacheKey(
    location: GeoCoordinate,
    era: GeologicalLayer
  ): string {
    return generateAICacheKey(location, era);
  }

  /**
   * Get the API call count (for testing)
   */
  getApiCallCount(): number {
    return this.apiCallCount;
  }

  /**
   * Reset the API call count (for testing)
   */
  resetApiCallCount(): void {
    this.apiCallCount = 0;
  }

  /**
   * Generate content and store in cache
   * Implements parallel generation for text and image
   */
  private async generateAndCacheContent(
    location: GeoCoordinate,
    era: GeologicalLayer,
    options: ContentRetrievalOptions
  ): Promise<ContentRetrievalResult> {
    const startTime = Date.now();
    this.apiCallCount++;

    try {
      // Build location context first
      let locationContext: LocationContext;
      try {
        locationContext = await buildLocationContext(location, era);
      } catch (error) {
        console.warn('[ContentOrchestrator] Failed to build location context, using basic:', error);
        locationContext = {
          coordinates: location,
          placeName: 'Unknown Location',
          geologicalFeatures: [era.material],
          nearbyLandmarks: [],
        };
      }

      // Generate text narrative (required)
      // Requirement 2.1: Use Gemini 2.5 Flash for narrative generation
      console.log('[ContentOrchestrator] Generating narrative...');
      const narrative = await textGenerator.generateNarrative(
        location,
        era,
        locationContext,
        { useFallbackOnError: options.useFallbackOnError }
      );

      // Generate image in parallel (optional)
      // Requirement 3.1: Generate or retrieve cached image
      let image: GeneratedImage | null = null;
      if (!options.skipImage) {
        console.log('[ContentOrchestrator] Generating image...');
        try {
          image = await imageGenerator.generateImage(location, era, narrative);
        } catch (error) {
          console.warn('[ContentOrchestrator] Image generation failed:', error);
          if (options.useFallbackOnError) {
            image = imageGenerator.getFallbackImage(era);
          }
        }
      }

      // Start video generation (async, optional)
      // Requirement 4.1: Generate 4-6 second videos
      let video: GeneratedVideo | null = null;
      let videoOperation: VideoOperation | undefined;
      
      if (!options.skipVideo && videoGenerator.isConfigured()) {
        console.log('[ContentOrchestrator] Starting video generation...');
        try {
          videoOperation = await videoGenerator.generateVideo(
            location,
            era,
            narrative,
            image || undefined
          );
          
          // Try to wait for video (with timeout)
          try {
            video = await videoGenerator.waitForVideo(videoOperation);
            videoOperation = undefined; // Clear operation since video is ready
          } catch (videoError) {
            console.warn('[ContentOrchestrator] Video generation timed out, will poll later');
            // Keep videoOperation for later polling
          }
        } catch (error) {
          console.warn('[ContentOrchestrator] Video generation failed:', error);
          // Video is optional, continue without it
        }
      }

      // Create cache metadata
      const contentSize = estimateContentSize({
        narrative,
        image,
        video,
        cacheMetadata: createCacheMetadata(location, era, 0),
      });
      const cacheMetadata = createCacheMetadata(location, era, contentSize);

      // Build the era content
      const content: EraContent = {
        narrative,
        image,
        video,
        cacheMetadata,
      };

      // Store in cache
      // Requirement 2.2: Cache result with 30-day TTL
      // Requirement 5.1: Store with cache key combining location and era
      await cacheManager.storeContent(location, era, content);

      const duration = Date.now() - startTime;
      console.log(`[ContentOrchestrator] Content generated in ${duration}ms`);

      return {
        content,
        fromCache: false,
        videoOperation,
      };
    } catch (error) {
      console.error('[ContentOrchestrator] Content generation failed:', error);

      // If fallback is enabled, return fallback content
      if (options.useFallbackOnError) {
        const fallbackNarrative = textGenerator.getFallbackNarrative(era);
        const fallbackImage = imageGenerator.getFallbackImage(era);
        const cacheMetadata = createCacheMetadata(location, era, 0);

        return {
          content: {
            narrative: fallbackNarrative,
            image: fallbackImage,
            video: null,
            cacheMetadata,
          },
          fromCache: false,
        };
      }

      throw new ContentOrchestratorError(
        'generation_error',
        `Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}

// ============================================
// Singleton Export
// ============================================

/**
 * Singleton instance of ContentOrchestrator
 * Use this for all content orchestration operations
 */
export const contentOrchestrator = new ContentOrchestratorImpl();

export default contentOrchestrator;
