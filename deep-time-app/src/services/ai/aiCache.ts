/**
 * AI Content Cache Service
 * Extended IndexedDB caching for AI-generated content (text, images, videos)
 * Requirements: 5.1, 5.2, 5.3, 11.1, 11.2
 */

import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';
import type {
  CacheEntry,
  CacheMetadata,
  CachedEraContent,
  CacheStats,
  AIGeneratedContent,
  EraContent,
  DailyCostRecord,
} from './types';
import {
  CACHE_TTL_MS,
  MAX_CACHE_SIZE_BYTES,
} from './types';

// ============================================
// IndexedDB Configuration
// ============================================

const DB_NAME = 'deeptime-ai-cache';
const DB_VERSION = 1;

const STORES = {
  ERA_CONTENT: 'eraContent',
  MEDIA_BLOBS: 'mediaBlobs',
  COST_TRACKING: 'costTracking',
} as const;

// ============================================
// Cache Key Generation
// ============================================

/**
 * Generates a cache key from coordinates and era
 * Format: ${latitude}_${longitude}_${eraId}
 * Uses 5 decimal places (~1.1m precision)
 * Requirement 5.1: Cache key combining location coordinates and era identifier
 * Property 18: Cache key format validation
 */
export function generateAICacheKey(location: GeoCoordinate, era: GeologicalLayer): string {
  const lat = location.latitude.toFixed(5);
  const lon = location.longitude.toFixed(5);
  return `${lat}_${lon}_${era.id}`;
}

/**
 * Generates a media blob key
 */
export function generateMediaBlobKey(contentId: string, type: 'image' | 'video'): string {
  return `${type}_${contentId}`;
}

/**
 * Gets today's date string for cost tracking
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================
// Cache Error Types
// ============================================

export type AICacheErrorType =
  | 'db_error'
  | 'not_found'
  | 'storage_full'
  | 'invalid_data'
  | 'migration_error';

export class AICacheError extends Error {
  constructor(
    public readonly type: AICacheErrorType,
    message: string
  ) {
    super(message);
    this.name = 'AICacheError';
  }
}

// ============================================
// IndexedDB Helpers
// ============================================

let dbInstance: IDBDatabase | null = null;

/**
 * Opens or creates the AI cache database
 * Implements migration from existing schema
 * Requirement 5.1: Add eraContent, mediaBlobs, costTracking object stores
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new AICacheError('db_error', 'Failed to open AI cache database'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create eraContent store with indexes
      // Requirement 5.1: Store with cache key combining location and era
      if (!db.objectStoreNames.contains(STORES.ERA_CONTENT)) {
        const eraContentStore = db.createObjectStore(STORES.ERA_CONTENT, { keyPath: 'key' });
        eraContentStore.createIndex('cachedAt', 'metadata.cachedAt', { unique: false });
        eraContentStore.createIndex('expiresAt', 'metadata.expiresAt', { unique: false });
        eraContentStore.createIndex('lastAccessed', 'metadata.lastAccessed', { unique: false });
      }
      
      // Create mediaBlobs store for images/videos
      // Requirement 3.4, 4.3: Cache image and video data
      if (!db.objectStoreNames.contains(STORES.MEDIA_BLOBS)) {
        const mediaBlobsStore = db.createObjectStore(STORES.MEDIA_BLOBS, { keyPath: 'id' });
        mediaBlobsStore.createIndex('type', 'type', { unique: false });
        mediaBlobsStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
      
      // Create costTracking store for monitoring
      // Requirement 11.1: Log token counts and costs
      if (!db.objectStoreNames.contains(STORES.COST_TRACKING)) {
        const costTrackingStore = db.createObjectStore(STORES.COST_TRACKING, { keyPath: 'date' });
        costTrackingStore.createIndex('totalCost', 'totalCost', { unique: false });
      }
    };
  });
}

// ============================================
// Cache Service Interface
// ============================================

export interface AICacheService {
  /** Initialize the cache database */
  initialize(): Promise<void>;
  
  /** Get cached content for location-era */
  getContent(location: GeoCoordinate, era: GeologicalLayer): Promise<CachedEraContent | null>;
  
  /** Store content with TTL */
  storeContent(
    location: GeoCoordinate,
    era: GeologicalLayer,
    content: AIGeneratedContent
  ): Promise<void>;
  
  /** Invalidate specific cache entry */
  invalidate(location: GeoCoordinate, era: GeologicalLayer): Promise<void>;
  
  /** Check if cache entry is valid (not expired) */
  isValid(metadata: CacheMetadata): boolean;
  
  /** Evict old entries when storage limit reached (LRU) */
  evictOldEntries(): Promise<number>;
  
  /** Get cache statistics */
  getStats(): Promise<CacheStats>;
  
  /** Store media blob (image or video) */
  storeMediaBlob(id: string, type: 'image' | 'video', data: Blob): Promise<void>;
  
  /** Get media blob */
  getMediaBlob(id: string): Promise<Blob | null>;
  
  /** Delete media blob */
  deleteMediaBlob(id: string): Promise<void>;
  
  /** Log API call cost */
  logApiCost(textCost: number, imageCost: number, videoCost: number): Promise<void>;
  
  /** Log cache hit event */
  logCacheHit(): Promise<void>;
  
  /** Get daily cost record */
  getDailyCost(date?: string): Promise<DailyCostRecord | null>;
  
  /** Get total cache size in bytes */
  getTotalCacheSize(): Promise<number>;
  
  /** Clear all cached data */
  clearAll(): Promise<void>;
}

// ============================================
// Cache Service Implementation
// ============================================

export const aiCacheService: AICacheService = {
  /**
   * Initialize the cache database
   */
  async initialize(): Promise<void> {
    await openDatabase();
  },

  /**
   * Get cached content for location-era
   * Requirement 2.3: Retrieve from cache without making API call
   * Requirement 5.2: Verify cache entry has not exceeded TTL
   */
  async getContent(
    location: GeoCoordinate,
    era: GeologicalLayer
  ): Promise<CachedEraContent | null> {
    const db = await openDatabase();
    const key = generateAICacheKey(location, era);
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.ERA_CONTENT, 'readwrite');
      const store = transaction.objectStore(STORES.ERA_CONTENT);
      const request = store.get(key);
      
      request.onerror = () => {
        resolve(null);
      };
      
      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        
        if (!entry) {
          resolve(null);
          return;
        }
        
        // Check TTL validity
        // Requirement 5.2: Verify cache entry has not exceeded TTL
        const metadata: CacheMetadata = {
          ...entry.metadata,
          cachedAt: new Date(entry.metadata.cachedAt),
          expiresAt: new Date(entry.metadata.expiresAt),
          lastAccessed: new Date(entry.metadata.lastAccessed),
        };
        
        if (!aiCacheService.isValid(metadata)) {
          // Cache expired, delete it
          store.delete(key);
          resolve(null);
          return;
        }
        
        // Update lastAccessed timestamp for LRU
        entry.metadata.lastAccessed = new Date().toISOString() as unknown as Date;
        store.put(entry);
        
        // Convert to EraContent format
        const eraContent: EraContent = {
          narrative: entry.content.text,
          image: entry.content.image,
          video: entry.content.video,
          cacheMetadata: metadata,
        };
        
        resolve({
          content: eraContent,
          metadata,
        });
      };
    });
  },

  /**
   * Store content with TTL
   * Requirement 2.2: Cache result in IndexedDB with 30-day TTL
   * Requirement 5.1: Store with cache key combining location and era
   */
  async storeContent(
    location: GeoCoordinate,
    era: GeologicalLayer,
    content: AIGeneratedContent
  ): Promise<void> {
    const db = await openDatabase();
    const key = generateAICacheKey(location, era);
    const now = new Date();
    
    // Calculate content size (approximate)
    let size = JSON.stringify(content.text).length;
    if (content.image) {
      size += content.image.imageData.size;
    }
    if (content.video) {
      size += content.video.videoData.size;
    }
    
    const metadata: CacheMetadata = {
      cacheKey: key,
      cachedAt: now,
      expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
      lastAccessed: now,
      size,
      version: 1,
    };
    
    const entry: CacheEntry = {
      key,
      content,
      metadata,
    };
    
    // Check if we need to evict old entries
    const totalSize = await this.getTotalCacheSize();
    if (totalSize + size > MAX_CACHE_SIZE_BYTES) {
      await this.evictOldEntries();
    }
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ERA_CONTENT, 'readwrite');
      const store = transaction.objectStore(STORES.ERA_CONTENT);
      
      transaction.onerror = () => {
        reject(new AICacheError('db_error', 'Failed to store content in cache'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      store.put(entry);
    });
  },

  /**
   * Invalidate specific cache entry
   * Requirement 5.4: Invalidate cache on user refresh request
   * Requirement 6.2: Invalidate cached content for specific era
   */
  async invalidate(location: GeoCoordinate, era: GeologicalLayer): Promise<void> {
    const db = await openDatabase();
    const key = generateAICacheKey(location, era);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.ERA_CONTENT, 'readwrite');
      const store = transaction.objectStore(STORES.ERA_CONTENT);
      
      transaction.onerror = () => {
        reject(new AICacheError('db_error', 'Failed to invalidate cache entry'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      store.delete(key);
    });
  },

  /**
   * Check if cache entry is valid (not expired)
   * Requirement 5.2: Verify cache entry has not exceeded TTL
   * Property 19: TTL validation
   */
  isValid(metadata: CacheMetadata): boolean {
    const now = new Date();
    const expiresAt = metadata.expiresAt instanceof Date 
      ? metadata.expiresAt 
      : new Date(metadata.expiresAt);
    return now < expiresAt;
  },

  /**
   * Evict old entries when storage limit reached (LRU)
   * Requirement 5.3: Remove oldest entries using LRU eviction
   * Property 20: LRU eviction - remove entries with oldest lastAccessed first
   */
  async evictOldEntries(): Promise<number> {
    const db = await openDatabase();
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.ERA_CONTENT, 'readwrite');
      const store = transaction.objectStore(STORES.ERA_CONTENT);
      
      const entriesToDelete: string[] = [];
      let totalSize = 0;
      let deletedCount = 0;
      
      // Get all entries and sort by lastAccessed (oldest first)
      const countRequest = store.getAll();
      countRequest.onsuccess = () => {
        const entries = countRequest.result as CacheEntry[];
        totalSize = entries.reduce((sum, e) => sum + (e.metadata.size || 0), 0);
        
        // Sort by lastAccessed (oldest first)
        entries.sort((a, b) => {
          const aTime = new Date(a.metadata.lastAccessed).getTime();
          const bTime = new Date(b.metadata.lastAccessed).getTime();
          return aTime - bTime;
        });
        
        // Mark entries for deletion until we're under the limit
        let currentSize = totalSize;
        for (const entry of entries) {
          if (currentSize <= MAX_CACHE_SIZE_BYTES * 0.8) {
            break; // Keep 20% buffer
          }
          entriesToDelete.push(entry.key);
          currentSize -= entry.metadata.size || 0;
        }
        
        // Delete marked entries
        for (const key of entriesToDelete) {
          store.delete(key);
          deletedCount++;
        }
      };
      
      transaction.oncomplete = () => {
        resolve(deletedCount);
      };
      
      transaction.onerror = () => {
        resolve(0);
      };
    });
  },

  /**
   * Get cache statistics
   * Requirement 11.2: Track cache hit rate
   */
  async getStats(): Promise<CacheStats> {
    const db = await openDatabase();
    
    return new Promise((resolve) => {
      const transaction = db.transaction([STORES.ERA_CONTENT, STORES.COST_TRACKING], 'readonly');
      const eraStore = transaction.objectStore(STORES.ERA_CONTENT);
      const costStore = transaction.objectStore(STORES.COST_TRACKING);
      
      const entriesRequest = eraStore.getAll();
      const costRequest = costStore.get(getTodayDateString());
      
      let entries: CacheEntry[] = [];
      let todayCost: DailyCostRecord | null = null;
      
      entriesRequest.onsuccess = () => {
        entries = entriesRequest.result || [];
      };
      
      costRequest.onsuccess = () => {
        todayCost = costRequest.result || null;
      };
      
      transaction.oncomplete = () => {
        const totalSize = entries.reduce((sum, e) => sum + (e.metadata.size || 0), 0);
        const dates = entries.map(e => new Date(e.metadata.cachedAt).getTime());
        
        // Calculate hit rate from today's cost tracking
        const apiCalls = todayCost?.apiCalls || 0;
        const cacheHits = todayCost?.cacheHits || 0;
        const totalRequests = apiCalls + cacheHits;
        const hitRate = totalRequests > 0 ? cacheHits / totalRequests : 0;
        
        resolve({
          totalEntries: entries.length,
          totalSize,
          hitRate,
          oldestEntry: dates.length > 0 ? new Date(Math.min(...dates)) : new Date(),
          newestEntry: dates.length > 0 ? new Date(Math.max(...dates)) : new Date(),
        });
      };
      
      transaction.onerror = () => {
        resolve({
          totalEntries: 0,
          totalSize: 0,
          hitRate: 0,
          oldestEntry: new Date(),
          newestEntry: new Date(),
        });
      };
    });
  },

  /**
   * Store media blob (image or video)
   * Requirement 3.4: Cache image in IndexedDB
   * Requirement 4.3: Cache video in IndexedDB
   */
  async storeMediaBlob(id: string, type: 'image' | 'video', data: Blob): Promise<void> {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.MEDIA_BLOBS, 'readwrite');
      const store = transaction.objectStore(STORES.MEDIA_BLOBS);
      
      transaction.onerror = () => {
        reject(new AICacheError('db_error', 'Failed to store media blob'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      store.put({
        id,
        type,
        data,
        cachedAt: new Date().toISOString(),
      });
    });
  },

  /**
   * Get media blob
   */
  async getMediaBlob(id: string): Promise<Blob | null> {
    const db = await openDatabase();
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.MEDIA_BLOBS, 'readonly');
      const store = transaction.objectStore(STORES.MEDIA_BLOBS);
      const request = store.get(id);
      
      request.onerror = () => {
        resolve(null);
      };
      
      request.onsuccess = () => {
        const record = request.result;
        resolve(record?.data || null);
      };
    });
  },

  /**
   * Delete media blob
   */
  async deleteMediaBlob(id: string): Promise<void> {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.MEDIA_BLOBS, 'readwrite');
      const store = transaction.objectStore(STORES.MEDIA_BLOBS);
      
      transaction.onerror = () => {
        reject(new AICacheError('db_error', 'Failed to delete media blob'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      store.delete(id);
    });
  },

  /**
   * Log API call cost
   * Requirement 11.1: Log token counts for input, output, and cached tokens
   * Requirement 11.3: Log image generation costs
   * Requirement 11.4: Log video generation costs
   */
  async logApiCost(textCost: number, imageCost: number, videoCost: number): Promise<void> {
    const db = await openDatabase();
    const date = getTodayDateString();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.COST_TRACKING, 'readwrite');
      const store = transaction.objectStore(STORES.COST_TRACKING);
      const request = store.get(date);
      
      request.onsuccess = () => {
        const existing = request.result as DailyCostRecord | undefined;
        
        const record: DailyCostRecord = existing || {
          date,
          textCost: 0,
          imageCost: 0,
          videoCost: 0,
          totalCost: 0,
          apiCalls: 0,
          cacheHits: 0,
        };
        
        record.textCost += textCost;
        record.imageCost += imageCost;
        record.videoCost += videoCost;
        record.totalCost = record.textCost + record.imageCost + record.videoCost;
        record.apiCalls += 1;
        
        store.put(record);
      };
      
      transaction.onerror = () => {
        reject(new AICacheError('db_error', 'Failed to log API cost'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
    });
  },

  /**
   * Log cache hit event
   * Requirement 11.2: Log cache hit events
   * Property 40: Cache hit event logging
   */
  async logCacheHit(): Promise<void> {
    const db = await openDatabase();
    const date = getTodayDateString();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.COST_TRACKING, 'readwrite');
      const store = transaction.objectStore(STORES.COST_TRACKING);
      const request = store.get(date);
      
      request.onsuccess = () => {
        const existing = request.result as DailyCostRecord | undefined;
        
        const record: DailyCostRecord = existing || {
          date,
          textCost: 0,
          imageCost: 0,
          videoCost: 0,
          totalCost: 0,
          apiCalls: 0,
          cacheHits: 0,
        };
        
        record.cacheHits += 1;
        
        store.put(record);
      };
      
      transaction.onerror = () => {
        reject(new AICacheError('db_error', 'Failed to log cache hit'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
    });
  },

  /**
   * Get daily cost record
   * Requirement 11.5: Track usage against thresholds
   */
  async getDailyCost(date?: string): Promise<DailyCostRecord | null> {
    const db = await openDatabase();
    const targetDate = date || getTodayDateString();
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.COST_TRACKING, 'readonly');
      const store = transaction.objectStore(STORES.COST_TRACKING);
      const request = store.get(targetDate);
      
      request.onerror = () => {
        resolve(null);
      };
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  },

  /**
   * Get total cache size in bytes
   */
  async getTotalCacheSize(): Promise<number> {
    const db = await openDatabase();
    
    return new Promise((resolve) => {
      const transaction = db.transaction([STORES.ERA_CONTENT, STORES.MEDIA_BLOBS], 'readonly');
      const eraStore = transaction.objectStore(STORES.ERA_CONTENT);
      const mediaStore = transaction.objectStore(STORES.MEDIA_BLOBS);
      
      let totalSize = 0;
      
      const eraRequest = eraStore.getAll();
      eraRequest.onsuccess = () => {
        const entries = eraRequest.result as CacheEntry[];
        totalSize += entries.reduce((sum, e) => sum + (e.metadata.size || 0), 0);
      };
      
      const mediaRequest = mediaStore.getAll();
      mediaRequest.onsuccess = () => {
        const blobs = mediaRequest.result as Array<{ data: Blob }>;
        totalSize += blobs.reduce((sum, b) => sum + (b.data?.size || 0), 0);
      };
      
      transaction.oncomplete = () => {
        resolve(totalSize);
      };
      
      transaction.onerror = () => {
        resolve(0);
      };
    });
  },

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.ERA_CONTENT, STORES.MEDIA_BLOBS, STORES.COST_TRACKING],
        'readwrite'
      );
      
      transaction.onerror = () => {
        reject(new AICacheError('db_error', 'Failed to clear cache'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.objectStore(STORES.ERA_CONTENT).clear();
      transaction.objectStore(STORES.MEDIA_BLOBS).clear();
      transaction.objectStore(STORES.COST_TRACKING).clear();
    });
  },
};

export default aiCacheService;
