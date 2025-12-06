/**
 * Explicit Cache Service
 * Implements Gemini API explicit caching for large geological data
 * Requirements: 8.4, 8.5
 * 
 * Property 31: Explicit cache creation
 * - Creates cached content objects for geological data >4096 tokens
 * - Sets 24-hour TTL for geological context
 * - Reuses cached content across requests
 * 
 * This service manages explicit caching with the Gemini API to guarantee
 * cost savings for frequently accessed geological data that exceeds
 * the implicit caching threshold.
 */


import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';
import type { LocationContext } from './types';
import { contextPrefixGenerator } from './contextPrefixGenerator';
import { getActiveApiKey } from '../../components/ApiKeyModal';
import { MODEL_USE_CASES } from '../../config/aiModels';

// ============================================
// Constants
// ============================================

/**
 * Minimum token count for explicit caching (Gemini 2.5 Flash)
 * Below this threshold, implicit caching is sufficient
 * 
 * Updated from 4096 to 512 tokens to enable explicit caching for
 * geological context prompts which typically range from 500-2000 tokens.
 * This lower threshold ensures cost savings are achieved for more requests.
 * 
 * Requirement 8.1: Use a value of 512 tokens or less
 */
export const EXPLICIT_CACHE_MIN_TOKENS = 512;

/**
 * TTL for explicit geological context cache (24 hours in seconds)
 * Requirement 8.5: Set TTL to 24 hours for geological context
 */
export const EXPLICIT_CACHE_TTL_SECONDS = 24 * 60 * 60;

/**
 * TTL string format for Gemini API
 */
export const EXPLICIT_CACHE_TTL_STRING = `${EXPLICIT_CACHE_TTL_SECONDS}s`;

// ============================================
// Types
// ============================================

/**
 * Explicit cache entry metadata
 */
export interface ExplicitCacheEntry {
  /** Cache name from Gemini API */
  cacheName: string;
  /** Location coordinates for this cache */
  location: GeoCoordinate;
  /** Era ID for this cache */
  eraId: string;
  /** Display name for identification */
  displayName: string;
  /** Token count of cached content */
  tokenCount: number;
  /** When the cache was created */
  createdAt: Date;
  /** When the cache expires */
  expiresAt: Date;
  /** Model used for this cache */
  model: string;
}

/**
 * Result of checking if explicit caching should be used
 */
export interface ExplicitCacheCheckResult {
  /** Whether explicit caching should be used */
  shouldUseExplicitCache: boolean;
  /** Estimated token count of the content */
  estimatedTokenCount: number;
  /** Reason for the decision */
  reason: string;
}

/**
 * Result of creating an explicit cache
 */
export interface ExplicitCacheCreateResult {
  /** Whether cache creation was successful */
  success: boolean;
  /** Cache entry if successful */
  cacheEntry?: ExplicitCacheEntry;
  /** Error message if failed */
  error?: string;
}

/**
 * Explicit cache service error types
 */
export type ExplicitCacheErrorType =
  | 'api_error'
  | 'invalid_key'
  | 'cache_not_found'
  | 'cache_expired'
  | 'token_count_too_low';

/**
 * Custom error class for explicit cache errors
 */
export class ExplicitCacheError extends Error {
  constructor(
    public readonly type: ExplicitCacheErrorType,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ExplicitCacheError';
  }
}

// ============================================
// In-Memory Cache Registry
// ============================================

/**
 * In-memory registry of active explicit caches
 * Maps cache key to cache entry
 */
const explicitCacheRegistry = new Map<string, ExplicitCacheEntry>();

/**
 * Generates a registry key for explicit cache lookup
 */
function generateExplicitCacheKey(location: GeoCoordinate, eraId: string): string {
  const lat = location.latitude.toFixed(5);
  const lon = location.longitude.toFixed(5);
  return `explicit_${lat}_${lon}_${eraId}`;
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
 * Estimates token count for a string
 * Uses a simple heuristic: ~4 characters per token for English text
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Generates a display name for the cache
 */
function generateCacheDisplayName(location: GeoCoordinate, layer: GeologicalLayer): string {
  const lat = location.latitude.toFixed(2);
  const lon = location.longitude.toFixed(2);
  return `deeptime_geo_${lat}_${lon}_${layer.era.name.toLowerCase().replace(/\s+/g, '_')}`;
}

// ============================================
// Explicit Cache Service Interface
// ============================================

export interface ExplicitCacheService {
  /**
   * Check if explicit caching should be used for given content
   * Requirement 8.4: Create cached content for geological data >4096 tokens
   */
  shouldUseExplicitCache(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): ExplicitCacheCheckResult;

  /**
   * Create an explicit cache for geological context
   * Requirement 8.4: Create cached content objects for geological data
   * Requirement 8.5: Set TTL to 24 hours
   * Property 31: Explicit cache creation
   */
  createExplicitCache(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): Promise<ExplicitCacheCreateResult>;

  /**
   * Get an existing explicit cache entry if available and not expired
   */
  getExplicitCache(
    location: GeoCoordinate,
    layer: GeologicalLayer
  ): ExplicitCacheEntry | null;

  /**
   * Get or create an explicit cache
   * Returns existing cache if valid, creates new one if needed
   */
  getOrCreateExplicitCache(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): Promise<ExplicitCacheEntry | null>;

  /**
   * Delete an explicit cache
   */
  deleteExplicitCache(
    location: GeoCoordinate,
    layer: GeologicalLayer
  ): Promise<boolean>;

  /**
   * List all active explicit caches
   */
  listExplicitCaches(): ExplicitCacheEntry[];

  /**
   * Clear expired caches from registry
   */
  clearExpiredCaches(): number;

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalCaches: number;
    totalTokensCached: number;
    oldestCache: Date | null;
    newestCache: Date | null;
  };
}

// ============================================
// Explicit Cache Service Implementation
// ============================================

export const explicitCacheService: ExplicitCacheService = {
  /**
   * Check if explicit caching should be used for given content
   * Requirement 8.4: Create cached content for geological data >4096 tokens
   */
  shouldUseExplicitCache(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): ExplicitCacheCheckResult {
    // Generate the context prefix to estimate token count
    const contextPrefix = contextPrefixGenerator.generatePrefix(
      location,
      layer,
      locationContext
    );

    const estimatedTokenCount = estimateTokenCount(contextPrefix);

    // Check if token count exceeds threshold
    if (estimatedTokenCount >= EXPLICIT_CACHE_MIN_TOKENS) {
      return {
        shouldUseExplicitCache: true,
        estimatedTokenCount,
        reason: `Content has ${estimatedTokenCount} tokens, exceeds threshold of ${EXPLICIT_CACHE_MIN_TOKENS}`,
      };
    }

    return {
      shouldUseExplicitCache: false,
      estimatedTokenCount,
      reason: `Content has ${estimatedTokenCount} tokens, below threshold of ${EXPLICIT_CACHE_MIN_TOKENS}. Implicit caching is sufficient.`,
    };
  },

  /**
   * Create an explicit cache for geological context
   * Requirement 8.4: Create cached content objects for geological data
   * Requirement 8.5: Set TTL to 24 hours
   * Property 31: Explicit cache creation
   */
  async createExplicitCache(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): Promise<ExplicitCacheCreateResult> {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return {
        success: false,
        error: 'Gemini API key not configured',
      };
    }

    // Check if explicit caching is warranted
    const checkResult = this.shouldUseExplicitCache(location, layer, locationContext);
    if (!checkResult.shouldUseExplicitCache) {
      return {
        success: false,
        error: checkResult.reason,
      };
    }

    try {
      // Generate the context prefix content
      const contextPrefix = contextPrefixGenerator.generatePrefix(
        location,
        layer,
        locationContext
      );

      const displayName = generateCacheDisplayName(location, layer);
      const registryKey = generateExplicitCacheKey(location, layer.id);

      // Determine model name for caching (requires explicit version)
      // We'll use the configured model but ensure it has 'models/' prefix
      let modelName: string = MODEL_USE_CASES.ERA_NARRATIVE;
      if (!modelName.startsWith('models/')) {
        modelName = `models/${modelName}`;
      }
      // Ensure specific version for caching if needed (e.g., append -001 if generic)
      if (!modelName.includes('-001') && !modelName.includes('-002')) {
        modelName = `${modelName}-001`;
      }

      console.log(`[ExplicitCache] Creating cache via REST API for model ${modelName}...`);

      const url = `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          displayName: displayName,
          systemInstruction: {
            parts: [{ text: 'You are an expert geological historian.' }]
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: contextPrefix }],
            },
          ],
          ttl: EXPLICIT_CACHE_TTL_SECONDS + 's', // API expects string with 's' suffix
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
      }

      const cacheData = await response.json();

      // cacheData should contain name, createTime, expireTime, etc.
      const now = new Date();

      // Parse expiration
      const expiresAt = cacheData.expireTime ? new Date(cacheData.expireTime) : new Date(now.getTime() + EXPLICIT_CACHE_TTL_SECONDS * 1000);

      // Create cache entry metadata
      const cacheEntry: ExplicitCacheEntry = {
        cacheName: cacheData.name,
        location,
        eraId: layer.id,
        displayName,
        tokenCount: checkResult.estimatedTokenCount, // API might return explicit usage metadata?
        createdAt: cacheData.createTime ? new Date(cacheData.createTime) : now,
        expiresAt: expiresAt,
        model: cacheData.model || modelName,
      };

      // Store in registry
      explicitCacheRegistry.set(registryKey, cacheEntry);

      console.log(
        `[ExplicitCache] Successfully created cache "${displayName}" (${cacheData.name}) ` +
        `expires at ${cacheEntry.expiresAt.toISOString()}`
      );

      return {
        success: true,
        cacheEntry,
      };
    } catch (error) {
      console.error('[ExplicitCache] Failed to create cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get an existing explicit cache entry if available and not expired
   */
  getExplicitCache(
    location: GeoCoordinate,
    layer: GeologicalLayer
  ): ExplicitCacheEntry | null {
    const registryKey = generateExplicitCacheKey(location, layer.id);
    const entry = explicitCacheRegistry.get(registryKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (new Date() >= entry.expiresAt) {
      // Remove expired entry
      explicitCacheRegistry.delete(registryKey);
      console.log(`[ExplicitCache] Cache "${entry.displayName}" has expired, removed from registry`);
      return null;
    }

    return entry;
  },

  /**
   * Get or create an explicit cache
   * Returns existing cache if valid, creates new one if needed
   */
  async getOrCreateExplicitCache(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): Promise<ExplicitCacheEntry | null> {
    // Check for existing valid cache
    const existingCache = this.getExplicitCache(location, layer);
    if (existingCache) {
      console.log(`[ExplicitCache] Reusing existing cache "${existingCache.displayName}"`);
      return existingCache;
    }

    // Check if explicit caching is warranted
    const checkResult = this.shouldUseExplicitCache(location, layer, locationContext);
    if (!checkResult.shouldUseExplicitCache) {
      console.log(`[ExplicitCache] ${checkResult.reason}`);
      return null;
    }

    // Create new cache
    const result = await this.createExplicitCache(location, layer, locationContext);
    return result.cacheEntry || null;
  },

  /**
   * Delete an explicit cache
   */
  async deleteExplicitCache(
    location: GeoCoordinate,
    layer: GeologicalLayer
  ): Promise<boolean> {
    const registryKey = generateExplicitCacheKey(location, layer.id);
    const entry = explicitCacheRegistry.get(registryKey);

    if (!entry) {
      return false;
    }

    // In production, you would also delete from Gemini API:
    // await client.caches.delete(entry.cacheName);

    explicitCacheRegistry.delete(registryKey);
    console.log(`[ExplicitCache] Deleted cache "${entry.displayName}"`);

    return true;
  },

  /**
   * List all active explicit caches
   */
  listExplicitCaches(): ExplicitCacheEntry[] {
    // First, clear expired caches
    this.clearExpiredCaches();

    return Array.from(explicitCacheRegistry.values());
  },

  /**
   * Clear expired caches from registry
   */
  clearExpiredCaches(): number {
    const now = new Date();
    let clearedCount = 0;

    for (const [key, entry] of explicitCacheRegistry.entries()) {
      if (now >= entry.expiresAt) {
        explicitCacheRegistry.delete(key);
        clearedCount++;
        console.log(`[ExplicitCache] Cleared expired cache "${entry.displayName}"`);
      }
    }

    return clearedCount;
  },

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalCaches: number;
    totalTokensCached: number;
    oldestCache: Date | null;
    newestCache: Date | null;
  } {
    const caches = this.listExplicitCaches();

    if (caches.length === 0) {
      return {
        totalCaches: 0,
        totalTokensCached: 0,
        oldestCache: null,
        newestCache: null,
      };
    }

    const totalTokensCached = caches.reduce((sum, c) => sum + c.tokenCount, 0);
    const dates = caches.map(c => c.createdAt.getTime());

    return {
      totalCaches: caches.length,
      totalTokensCached,
      oldestCache: new Date(Math.min(...dates)),
      newestCache: new Date(Math.max(...dates)),
    };
  },
};

export default explicitCacheService;
