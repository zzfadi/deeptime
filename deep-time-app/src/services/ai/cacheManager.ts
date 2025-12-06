/**
 * Cache Manager Service
 * High-level cache management with TTL support, LRU eviction, and statistics
 * Requirements: 5.1, 5.2, 5.3, 5.4, 11.2
 * 
 * This module provides the CacheManager interface as specified in the design document,
 * wrapping the lower-level aiCacheService with additional functionality.
 */

import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';
import type {
  CacheMetadata,
  CachedEraContent,
  CacheStats,
  EraContent,
  AIGeneratedContent,
} from './types';
// Constants imported for reference in documentation
// CACHE_TTL_MS = 30 days, MAX_CACHE_SIZE_BYTES = 50MB
import {
  aiCacheService,
  generateAICacheKey,
} from './aiCache';

// ============================================
// Cache Manager Interface (from design.md)
// ============================================

/**
 * CacheManager interface as specified in the design document
 * Manages content persistence with TTL and LRU eviction
 */
export interface CacheManager {
  /**
   * Get cached content for location-era
   * Requirement 2.3: Retrieve from cache without making API call
   */
  getContent(
    location: GeoCoordinate,
    era: GeologicalLayer
  ): Promise<CachedEraContent | null>;
  
  /**
   * Store content with TTL (30 days)
   * Requirement 2.2: Cache result in IndexedDB with 30-day TTL
   * Requirement 5.1: Store with cache key combining location and era
   */
  storeContent(
    location: GeoCoordinate,
    era: GeologicalLayer,
    content: EraContent
  ): Promise<void>;
  
  /**
   * Invalidate specific cache entry
   * Requirement 5.4: Invalidate cache on user refresh request
   */
  invalidate(
    location: GeoCoordinate,
    era: GeologicalLayer
  ): Promise<void>;
  
  /**
   * Check if cache entry is valid (not expired)
   * Requirement 5.2: Verify cache entry has not exceeded TTL
   * Property 19: TTL validation
   */
  isValid(metadata: CacheMetadata): boolean;
  
  /**
   * Evict old entries when storage limit reached (LRU)
   * Requirement 5.3: Remove oldest entries using LRU eviction
   * Property 20: LRU eviction
   */
  evictOldEntries(): Promise<number>;
  
  /**
   * Get cache statistics
   * Requirement 11.2: Track cache hit rate
   */
  getStats(): Promise<CacheStats>;
}

// ============================================
// Cache Event Types for Logging
// ============================================

export interface CacheEvent {
  type: 'hit' | 'miss' | 'store' | 'invalidate' | 'evict';
  timestamp: Date;
  cacheKey: string;
  details?: Record<string, unknown>;
}

export type CacheEventListener = (event: CacheEvent) => void;

// ============================================
// Cache Manager Implementation
// ============================================

class CacheManagerImpl implements CacheManager {
  private eventListeners: CacheEventListener[] = [];
  private initialized = false;

  /**
   * Initialize the cache manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await aiCacheService.initialize();
    this.initialized = true;
  }

  /**
   * Add event listener for cache events
   * Requirement 11.2: Log cache hit events
   */
  addEventListener(listener: CacheEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: CacheEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit cache event to all listeners
   */
  private emitEvent(event: CacheEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Cache event listener error:', error);
      }
    }
  }

  /**
   * Get cached content for location-era
   * Requirement 2.3: Retrieve from cache without making API call
   * Property 7: Cache hit avoids API calls
   */
  async getContent(
    location: GeoCoordinate,
    era: GeologicalLayer
  ): Promise<CachedEraContent | null> {
    await this.initialize();
    
    const cacheKey = generateAICacheKey(location, era);
    const cached = await aiCacheService.getContent(location, era);
    
    if (cached) {
      // Log cache hit
      // Requirement 11.2: Log cache hit events
      // Property 40: Cache hit event logging
      await aiCacheService.logCacheHit();
      
      this.emitEvent({
        type: 'hit',
        timestamp: new Date(),
        cacheKey,
        details: {
          cachedAt: cached.metadata.cachedAt,
          expiresAt: cached.metadata.expiresAt,
        },
      });
      
      console.log(`[CacheManager] Cache HIT for key: ${cacheKey}`);
      return cached;
    }
    
    // Log cache miss
    this.emitEvent({
      type: 'miss',
      timestamp: new Date(),
      cacheKey,
    });
    
    console.log(`[CacheManager] Cache MISS for key: ${cacheKey}`);
    return null;
  }

  /**
   * Store content with TTL (30 days)
   * Requirement 2.2: Cache result in IndexedDB with 30-day TTL
   * Requirement 5.1: Store with cache key combining location and era
   * Property 6: Cache storage with TTL
   */
  async storeContent(
    location: GeoCoordinate,
    era: GeologicalLayer,
    content: EraContent
  ): Promise<void> {
    await this.initialize();
    
    const cacheKey = generateAICacheKey(location, era);
    
    // Convert EraContent to AIGeneratedContent format for storage
    const aiContent: AIGeneratedContent = {
      text: content.narrative,
      image: content.image,
      video: content.video,
      generationMetadata: {
        generatedAt: content.narrative.generatedAt,
        location: content.narrative.locationContext.coordinates,
        era,
        totalCost: content.narrative.tokenUsage.totalCost + 
          (content.image?.cost || 0) + 
          (content.video?.cost || 0),
        totalTokens: content.narrative.tokenUsage.inputTokens + 
          content.narrative.tokenUsage.outputTokens,
        generationDuration: 0, // Not tracked at this level
        modelsUsed: [
          content.narrative.modelUsed,
          ...(content.image ? [content.image.modelUsed] : []),
          ...(content.video ? [content.video.modelUsed] : []),
        ],
      },
    };
    
    await aiCacheService.storeContent(location, era, aiContent);
    
    this.emitEvent({
      type: 'store',
      timestamp: new Date(),
      cacheKey,
      details: {
        hasImage: !!content.image,
        hasVideo: !!content.video,
      },
    });
    
    console.log(`[CacheManager] Stored content for key: ${cacheKey}`);
  }

  /**
   * Invalidate specific cache entry
   * Requirement 5.4: Invalidate cache on user refresh request
   * Requirement 6.2: Invalidate cached content for specific era
   * Property 21: Cache invalidation on refresh
   * Property 23: Refresh invalidates cache
   */
  async invalidate(
    location: GeoCoordinate,
    era: GeologicalLayer
  ): Promise<void> {
    await this.initialize();
    
    const cacheKey = generateAICacheKey(location, era);
    await aiCacheService.invalidate(location, era);
    
    this.emitEvent({
      type: 'invalidate',
      timestamp: new Date(),
      cacheKey,
    });
    
    console.log(`[CacheManager] Invalidated cache for key: ${cacheKey}`);
  }

  /**
   * Check if cache entry is valid (not expired)
   * Requirement 5.2: Verify cache entry has not exceeded TTL
   * Property 19: TTL validation
   * 
   * Returns false if current time exceeds the expiration date
   */
  isValid(metadata: CacheMetadata): boolean {
    return aiCacheService.isValid(metadata);
  }

  /**
   * Evict old entries when storage limit reached (LRU)
   * Requirement 5.3: Remove oldest entries using LRU eviction
   * Property 20: LRU eviction - remove entries with oldest lastAccessed first
   * 
   * @returns Number of entries evicted
   */
  async evictOldEntries(): Promise<number> {
    await this.initialize();
    
    const evictedCount = await aiCacheService.evictOldEntries();
    
    if (evictedCount > 0) {
      this.emitEvent({
        type: 'evict',
        timestamp: new Date(),
        cacheKey: '*',
        details: {
          evictedCount,
        },
      });
      
      console.log(`[CacheManager] Evicted ${evictedCount} old entries (LRU)`);
    }
    
    return evictedCount;
  }

  /**
   * Get cache statistics
   * Requirement 11.2: Track cache hit rate
   */
  async getStats(): Promise<CacheStats> {
    await this.initialize();
    return aiCacheService.getStats();
  }

  /**
   * Get total cache size in bytes
   */
  async getTotalCacheSize(): Promise<number> {
    await this.initialize();
    return aiCacheService.getTotalCacheSize();
  }

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    await this.initialize();
    await aiCacheService.clearAll();
    console.log('[CacheManager] Cleared all cache data');
  }
}

// ============================================
// Singleton Export
// ============================================

/**
 * Singleton instance of CacheManager
 * Use this for all cache operations
 */
export const cacheManager = new CacheManagerImpl();

export default cacheManager;
