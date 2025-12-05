/**
 * IndexedDB Caching Layer
 * Provides local caching for geological stacks and narratives
 * Requirements: 5.1, 5.2
 */

import type { GeoCoordinate, GeologicalStack, Narrative, CachedLocation, CachedLocationSummary, StorageUsage } from 'deep-time-core/types';

// ============================================
// Types
// ============================================

export interface CacheService {
  /** Initialize the cache database */
  initialize(): Promise<void>;
  
  /** Store a complete location with geological data and narratives */
  saveLocation(location: GeoCoordinate, stack: GeologicalStack, narratives: Narrative[]): Promise<void>;
  
  /** Get cached location data by coordinates */
  getLocation(location: GeoCoordinate): Promise<CachedLocation | null>;
  
  /** Get all cached location summaries */
  getAllLocationSummaries(): Promise<CachedLocationSummary[]>;
  
  /** Store a narrative for a specific layer */
  saveNarrative(location: GeoCoordinate, layerId: string, narrative: Narrative): Promise<void>;
  
  /** Get cached narrative for a layer */
  getNarrative(location: GeoCoordinate, layerId: string): Promise<Narrative | null>;
  
  /** Get all narratives for a location */
  getNarrativesForLocation(location: GeoCoordinate): Promise<Narrative[]>;
  
  /** Delete a cached location */
  deleteLocation(location: GeoCoordinate): Promise<void>;
  
  /** Clear all cached data */
  clearAll(): Promise<void>;
  
  /** Get storage usage statistics */
  getStorageUsage(): Promise<StorageUsage>;
  
  /** Update last accessed timestamp for a location */
  touchLocation(location: GeoCoordinate): Promise<void>;
}

export type CacheErrorType =
  | 'db_error'
  | 'not_found'
  | 'storage_full'
  | 'invalid_data';

export class CacheError extends Error {
  constructor(
    public readonly type: CacheErrorType,
    message: string
  ) {
    super(message);
    this.name = 'CacheError';
  }
}

// ============================================
// IndexedDB Configuration
// ============================================

const DB_NAME = 'deeptime-cache';
const DB_VERSION = 2;

const STORES = {
  LOCATIONS: 'locations',
  NARRATIVES: 'narratives',
} as const;

// ============================================
// Cache Key Generation
// ============================================

/**
 * Generates a cache key from coordinates
 * Uses 5 decimal places (~1.1m precision)
 * Requirement 5.1, 5.2: Coordinate-based cache keys
 */
export function generateCacheKey(location: GeoCoordinate): string {
  const lat = location.latitude.toFixed(5);
  const lon = location.longitude.toFixed(5);
  return `loc_${lat}_${lon}`;
}

/**
 * Generates a narrative cache key
 */
export function generateNarrativeCacheKey(location: GeoCoordinate, layerId: string): string {
  return `${generateCacheKey(location)}_${layerId}`;
}

// ============================================
// IndexedDB Helpers
// ============================================

interface CachedLocationRecord {
  key: string;
  location: GeoCoordinate;
  geologicalStack: {
    location: GeoCoordinate;
    layers: GeologicalStack['layers'];
    queryTimestamp: string;
    dataSource: string;
    confidence: number;
  };
  narrativeKeys: string[];
  cachedAt: string;
  lastAccessed: string;
  schemaVersion: number;
}

interface CachedNarrativeRecord {
  key: string;
  locationKey: string;
  layerId: string;
  narrative: Narrative;
  cachedAt: string;
}

let dbInstance: IDBDatabase | null = null;

/**
 * Opens or creates the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Return existing instance if available
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new CacheError('db_error', 'Failed to open cache database'));
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      
      // Handle database close
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create locations store
      if (!db.objectStoreNames.contains(STORES.LOCATIONS)) {
        const locationStore = db.createObjectStore(STORES.LOCATIONS, { keyPath: 'key' });
        locationStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        locationStore.createIndex('lastAccessed', 'lastAccessed', { unique: false });
      }
      
      // Create narratives store
      if (!db.objectStoreNames.contains(STORES.NARRATIVES)) {
        const narrativeStore = db.createObjectStore(STORES.NARRATIVES, { keyPath: 'key' });
        narrativeStore.createIndex('locationKey', 'locationKey', { unique: false });
        narrativeStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };
  });
}

/**
 * Converts CachedLocation to storage format
 */
function toStorageFormat(
  location: GeoCoordinate,
  stack: GeologicalStack,
  narrativeKeys: string[]
): CachedLocationRecord {
  const key = generateCacheKey(location);
  const now = new Date().toISOString();
  
  return {
    key,
    location,
    geologicalStack: {
      ...stack,
      queryTimestamp: stack.queryTimestamp instanceof Date 
        ? stack.queryTimestamp.toISOString() 
        : stack.queryTimestamp,
    },
    narrativeKeys,
    cachedAt: now,
    lastAccessed: now,
    schemaVersion: 1,
  };
}

/**
 * Converts storage format to CachedLocation
 */
function fromStorageFormat(record: CachedLocationRecord, narratives: Narrative[]): CachedLocation {
  return {
    id: record.key,
    location: record.location,
    geologicalStack: {
      ...record.geologicalStack,
      queryTimestamp: new Date(record.geologicalStack.queryTimestamp),
    },
    narratives,
    cachedAt: new Date(record.cachedAt),
    lastAccessed: new Date(record.lastAccessed),
    schemaVersion: record.schemaVersion,
  };
}

// ============================================
// Cache Service Implementation
// ============================================

export const cacheService: CacheService = {
  /**
   * Initialize the cache database
   */
  async initialize(): Promise<void> {
    await openDatabase();
  },

  /**
   * Store a complete location with geological data and narratives
   * Requirement 5.1: Cache geological data locally
   */
  async saveLocation(
    location: GeoCoordinate,
    stack: GeologicalStack,
    narratives: Narrative[]
  ): Promise<void> {
    const db = await openDatabase();
    const locationKey = generateCacheKey(location);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.LOCATIONS, STORES.NARRATIVES], 'readwrite');
      
      transaction.onerror = () => {
        reject(new CacheError('db_error', 'Failed to save location to cache'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      // Save narratives first
      const narrativeStore = transaction.objectStore(STORES.NARRATIVES);
      const narrativeKeys: string[] = [];
      
      for (const narrative of narratives) {
        const narrativeKey = generateNarrativeCacheKey(location, narrative.layerId);
        narrativeKeys.push(narrativeKey);
        
        const narrativeRecord: CachedNarrativeRecord = {
          key: narrativeKey,
          locationKey,
          layerId: narrative.layerId,
          narrative,
          cachedAt: new Date().toISOString(),
        };
        
        narrativeStore.put(narrativeRecord);
      }
      
      // Save location
      const locationStore = transaction.objectStore(STORES.LOCATIONS);
      const locationRecord = toStorageFormat(location, stack, narrativeKeys);
      locationStore.put(locationRecord);
    });
  },

  /**
   * Get cached location data by coordinates
   * Requirement 5.2: Load cached data within 1 second
   */
  async getLocation(location: GeoCoordinate): Promise<CachedLocation | null> {
    const db = await openDatabase();
    const key = generateCacheKey(location);
    
    return new Promise((resolve) => {
      const transaction = db.transaction([STORES.LOCATIONS, STORES.NARRATIVES], 'readonly');
      const locationStore = transaction.objectStore(STORES.LOCATIONS);
      const request = locationStore.get(key);
      
      request.onerror = () => {
        resolve(null);
      };
      
      request.onsuccess = () => {
        const record = request.result as CachedLocationRecord | undefined;
        
        if (!record) {
          resolve(null);
          return;
        }
        
        // Fetch associated narratives
        const narrativeStore = transaction.objectStore(STORES.NARRATIVES);
        const narrativeIndex = narrativeStore.index('locationKey');
        const narrativeRequest = narrativeIndex.getAll(key);
        
        narrativeRequest.onsuccess = () => {
          const narrativeRecords = narrativeRequest.result as CachedNarrativeRecord[];
          const narratives = narrativeRecords.map(r => r.narrative);
          resolve(fromStorageFormat(record, narratives));
        };
        
        narrativeRequest.onerror = () => {
          // Return location without narratives if narrative fetch fails
          resolve(fromStorageFormat(record, []));
        };
      };
    });
  },

  /**
   * Get all cached location summaries
   * Useful for displaying cached locations when offline
   */
  async getAllLocationSummaries(): Promise<CachedLocationSummary[]> {
    const db = await openDatabase();
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.LOCATIONS, 'readonly');
      const store = transaction.objectStore(STORES.LOCATIONS);
      const request = store.getAll();
      
      request.onerror = () => {
        resolve([]);
      };
      
      request.onsuccess = () => {
        const records = request.result as CachedLocationRecord[];
        const summaries: CachedLocationSummary[] = records.map(record => ({
          id: record.key,
          location: record.location,
          cachedAt: new Date(record.cachedAt),
          lastAccessed: new Date(record.lastAccessed),
        }));
        
        // Sort by lastAccessed (most recent first)
        summaries.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
        
        resolve(summaries);
      };
    });
  },

  /**
   * Store a narrative for a specific layer
   */
  async saveNarrative(
    location: GeoCoordinate,
    layerId: string,
    narrative: Narrative
  ): Promise<void> {
    const db = await openDatabase();
    const locationKey = generateCacheKey(location);
    const narrativeKey = generateNarrativeCacheKey(location, layerId);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.LOCATIONS, STORES.NARRATIVES], 'readwrite');
      
      transaction.onerror = () => {
        reject(new CacheError('db_error', 'Failed to save narrative to cache'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      // Save narrative
      const narrativeStore = transaction.objectStore(STORES.NARRATIVES);
      const narrativeRecord: CachedNarrativeRecord = {
        key: narrativeKey,
        locationKey,
        layerId,
        narrative,
        cachedAt: new Date().toISOString(),
      };
      narrativeStore.put(narrativeRecord);
      
      // Update location's narrative keys
      const locationStore = transaction.objectStore(STORES.LOCATIONS);
      const locationRequest = locationStore.get(locationKey);
      
      locationRequest.onsuccess = () => {
        const record = locationRequest.result as CachedLocationRecord | undefined;
        if (record && !record.narrativeKeys.includes(narrativeKey)) {
          record.narrativeKeys.push(narrativeKey);
          locationStore.put(record);
        }
      };
    });
  },

  /**
   * Get cached narrative for a layer
   */
  async getNarrative(location: GeoCoordinate, layerId: string): Promise<Narrative | null> {
    const db = await openDatabase();
    const key = generateNarrativeCacheKey(location, layerId);
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.NARRATIVES, 'readonly');
      const store = transaction.objectStore(STORES.NARRATIVES);
      const request = store.get(key);
      
      request.onerror = () => {
        resolve(null);
      };
      
      request.onsuccess = () => {
        const record = request.result as CachedNarrativeRecord | undefined;
        resolve(record?.narrative ?? null);
      };
    });
  },

  /**
   * Get all narratives for a location
   */
  async getNarrativesForLocation(location: GeoCoordinate): Promise<Narrative[]> {
    const db = await openDatabase();
    const locationKey = generateCacheKey(location);
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.NARRATIVES, 'readonly');
      const store = transaction.objectStore(STORES.NARRATIVES);
      const index = store.index('locationKey');
      const request = index.getAll(locationKey);
      
      request.onerror = () => {
        resolve([]);
      };
      
      request.onsuccess = () => {
        const records = request.result as CachedNarrativeRecord[];
        resolve(records.map(r => r.narrative));
      };
    });
  },

  /**
   * Delete a cached location and its narratives
   */
  async deleteLocation(location: GeoCoordinate): Promise<void> {
    const db = await openDatabase();
    const locationKey = generateCacheKey(location);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.LOCATIONS, STORES.NARRATIVES], 'readwrite');
      
      transaction.onerror = () => {
        reject(new CacheError('db_error', 'Failed to delete location from cache'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      // Delete narratives for this location
      const narrativeStore = transaction.objectStore(STORES.NARRATIVES);
      const narrativeIndex = narrativeStore.index('locationKey');
      const narrativeRequest = narrativeIndex.openCursor(IDBKeyRange.only(locationKey));
      
      narrativeRequest.onsuccess = () => {
        const cursor = narrativeRequest.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      // Delete location
      const locationStore = transaction.objectStore(STORES.LOCATIONS);
      locationStore.delete(locationKey);
    });
  },

  /**
   * Clear all cached data
   */
  async clearAll(): Promise<void> {
    const db = await openDatabase();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORES.LOCATIONS, STORES.NARRATIVES], 'readwrite');
      
      transaction.onerror = () => {
        reject(new CacheError('db_error', 'Failed to clear cache'));
      };
      
      transaction.oncomplete = () => {
        resolve();
      };
      
      transaction.objectStore(STORES.LOCATIONS).clear();
      transaction.objectStore(STORES.NARRATIVES).clear();
    });
  },

  /**
   * Get storage usage statistics
   * Requirement 5.4: Notify user when storage limits approach
   */
  async getStorageUsage(): Promise<StorageUsage> {
    const db = await openDatabase();
    
    // Get location count
    const locationCount = await new Promise<number>((resolve) => {
      const transaction = db.transaction(STORES.LOCATIONS, 'readonly');
      const store = transaction.objectStore(STORES.LOCATIONS);
      const request = store.count();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(0);
    });
    
    // Estimate storage usage using Storage API if available
    let usedBytes = 0;
    let totalBytes = 50 * 1024 * 1024; // Default 50MB estimate
    
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        usedBytes = estimate.usage ?? 0;
        totalBytes = estimate.quota ?? totalBytes;
      } catch {
        // Storage API not available, use defaults
      }
    }
    
    return {
      usedBytes,
      totalBytes,
      locationCount,
    };
  },

  /**
   * Update last accessed timestamp for a location
   */
  async touchLocation(location: GeoCoordinate): Promise<void> {
    const db = await openDatabase();
    const key = generateCacheKey(location);
    
    return new Promise((resolve) => {
      const transaction = db.transaction(STORES.LOCATIONS, 'readwrite');
      const store = transaction.objectStore(STORES.LOCATIONS);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const record = request.result as CachedLocationRecord | undefined;
        if (record) {
          record.lastAccessed = new Date().toISOString();
          store.put(record);
        }
      };
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
    });
  },
};

export default cacheService;
