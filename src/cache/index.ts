// Cache serialization for DeepTime application
// Requirements: 8.1, 8.2

import type {
  CachedLocation,
  CachedLocationSummary,
  GeologicalStack,
  GeoCoordinate,
  GeologicalLayer,
  Narrative,
  StorageUsage,
} from '../types';

// ============================================
// Serialized Types (JSON-safe representations)
// ============================================

/**
 * JSON-serialized representation of CachedLocation
 * All Date fields are converted to ISO-8601 strings
 */
export interface SerializedCachedLocation {
  schemaVersion: number;
  id: string;
  location: GeoCoordinate;
  geologicalStack: SerializedGeologicalStack;
  narratives: Narrative[];
  cachedAt: string; // ISO-8601
  lastAccessed: string; // ISO-8601
}

/**
 * JSON-serialized representation of GeologicalStack
 * queryTimestamp is converted to ISO-8601 string
 */
export interface SerializedGeologicalStack {
  location: GeoCoordinate;
  layers: GeologicalLayer[];
  queryTimestamp: string; // ISO-8601
  dataSource: string;
  confidence: number;
}

// ============================================
// Serialization Functions
// ============================================

/**
 * Serializes a GeologicalStack to a JSON-safe format
 * Converts Date objects to ISO-8601 strings
 */
export function serializeGeologicalStack(
  stack: GeologicalStack
): SerializedGeologicalStack {
  return {
    location: stack.location,
    layers: stack.layers,
    queryTimestamp: stack.queryTimestamp.toISOString(),
    dataSource: stack.dataSource,
    confidence: stack.confidence,
  };
}

/**
 * Serializes a CachedLocation to a JSON-safe format
 * - Includes schemaVersion in output
 * - Converts all Date fields to ISO-8601 strings
 * 
 * Requirements: 8.1, 8.2
 */
export function serializeCachedLocation(
  cachedLocation: CachedLocation
): SerializedCachedLocation {
  return {
    schemaVersion: cachedLocation.schemaVersion,
    id: cachedLocation.id,
    location: cachedLocation.location,
    geologicalStack: serializeGeologicalStack(cachedLocation.geologicalStack),
    narratives: cachedLocation.narratives,
    cachedAt: cachedLocation.cachedAt.toISOString(),
    lastAccessed: cachedLocation.lastAccessed.toISOString(),
  };
}

/**
 * Converts a CachedLocation to a JSON string
 * Convenience wrapper around serializeCachedLocation
 */
export function cachedLocationToJson(cachedLocation: CachedLocation): string {
  return JSON.stringify(serializeCachedLocation(cachedLocation));
}

// ============================================
// Deserialization Functions
// ============================================

/** Current schema version supported by this implementation */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Error thrown when deserialization fails due to schema version mismatch
 */
export class SchemaVersionError extends Error {
  constructor(
    public readonly foundVersion: number,
    public readonly supportedVersion: number
  ) {
    super(
      `Schema version mismatch: found ${foundVersion}, supported ${supportedVersion}`
    );
    this.name = 'SchemaVersionError';
  }
}

/**
 * Error thrown when deserialization fails due to invalid data
 */
export class DeserializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeserializationError';
  }
}

/**
 * Deserializes a SerializedGeologicalStack back to a GeologicalStack
 * Parses ISO-8601 date strings back to Date objects
 */
export function deserializeGeologicalStack(
  serialized: SerializedGeologicalStack
): GeologicalStack {
  return {
    location: serialized.location,
    layers: serialized.layers,
    queryTimestamp: new Date(serialized.queryTimestamp),
    dataSource: serialized.dataSource,
    confidence: serialized.confidence,
  };
}

/**
 * Deserializes a SerializedCachedLocation back to a CachedLocation
 * - Parses ISO-8601 dates back to Date objects
 * - Validates schemaVersion compatibility
 * 
 * Requirements: 8.3
 * 
 * @throws {SchemaVersionError} if schemaVersion is not compatible
 * @throws {DeserializationError} if data is malformed
 */
export function deserializeCachedLocation(
  serialized: SerializedCachedLocation
): CachedLocation {
  // Validate schemaVersion compatibility
  if (serialized.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new SchemaVersionError(
      serialized.schemaVersion,
      CURRENT_SCHEMA_VERSION
    );
  }

  // Validate required fields exist
  if (!serialized.id || typeof serialized.id !== 'string') {
    throw new DeserializationError('Missing or invalid id field');
  }
  if (!serialized.location) {
    throw new DeserializationError('Missing location field');
  }
  if (!serialized.geologicalStack) {
    throw new DeserializationError('Missing geologicalStack field');
  }
  if (!serialized.cachedAt) {
    throw new DeserializationError('Missing cachedAt field');
  }
  if (!serialized.lastAccessed) {
    throw new DeserializationError('Missing lastAccessed field');
  }

  return {
    id: serialized.id,
    location: serialized.location,
    geologicalStack: deserializeGeologicalStack(serialized.geologicalStack),
    narratives: serialized.narratives || [],
    cachedAt: new Date(serialized.cachedAt),
    lastAccessed: new Date(serialized.lastAccessed),
    schemaVersion: serialized.schemaVersion,
  };
}

/**
 * Parses a JSON string into a CachedLocation
 * Convenience wrapper around deserializeCachedLocation
 * 
 * @throws {SchemaVersionError} if schemaVersion is not compatible
 * @throws {DeserializationError} if data is malformed
 * @throws {SyntaxError} if JSON is invalid
 */
export function jsonToCachedLocation(json: string): CachedLocation {
  const parsed = JSON.parse(json) as SerializedCachedLocation;
  return deserializeCachedLocation(parsed);
}

// ============================================
// Cache Key Generation
// ============================================

/**
 * Generates a cache key from geographic coordinates
 * Uses a precision of 5 decimal places (~1.1m accuracy)
 * Format: "lat_{latitude}_lon_{longitude}"
 */
export function generateCacheKey(coordinate: GeoCoordinate): string {
  const latRounded = coordinate.latitude.toFixed(5);
  const lonRounded = coordinate.longitude.toFixed(5);
  return `lat_${latRounded}_lon_${lonRounded}`;
}

// ============================================
// Storage Backend Interface
// ============================================

/**
 * Interface for storage backends (allows for different implementations)
 * Default implementation uses in-memory Map
 */
export interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

/**
 * In-memory storage backend for testing and development
 */
export class InMemoryStorageBackend implements StorageBackend {
  private storage = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}

// ============================================
// Cache Manager
// ============================================

/**
 * CacheManager handles local storage of geological data and narratives
 * 
 * Requirements: 2.5, 8.1, 8.3
 * - Stores geological stack with narratives
 * - Retrieves cached location data
 * - Tracks cachedAt and lastAccessed timestamps
 */
export class CacheManager {
  private storage: StorageBackend;

  constructor(storage?: StorageBackend) {
    this.storage = storage ?? new InMemoryStorageBackend();
  }

  /**
   * Stores a CachedLocation to local storage
   * Generates cache key from coordinates
   * Sets cachedAt timestamp if not already set
   * Updates lastAccessed timestamp
   * 
   * @param key - Cache key (typically from generateCacheKey)
   * @param data - CachedLocation data to store
   */
  async store(key: string, data: CachedLocation): Promise<void> {
    const now = new Date();
    
    // Update lastAccessed timestamp
    const dataToStore: CachedLocation = {
      ...data,
      lastAccessed: now,
    };

    const serialized = cachedLocationToJson(dataToStore);
    await this.storage.set(key, serialized);
  }

  /**
   * Retrieves a CachedLocation from local storage
   * Updates lastAccessed timestamp on retrieval
   * 
   * @param key - Cache key to retrieve
   * @returns CachedLocation if found, null otherwise
   * @throws {SchemaVersionError} if cached data has incompatible schema version
   * @throws {DeserializationError} if cached data is malformed
   */
  async retrieve(key: string): Promise<CachedLocation | null> {
    const json = await this.storage.get(key);
    if (json === null) {
      return null;
    }

    const cachedLocation = jsonToCachedLocation(json);
    
    // Update lastAccessed timestamp
    const now = new Date();
    const updatedLocation: CachedLocation = {
      ...cachedLocation,
      lastAccessed: now,
    };
    
    // Persist the updated lastAccessed timestamp
    await this.store(key, updatedLocation);
    
    return updatedLocation;
  }

  /**
   * Lists all cached locations (summary only)
   * 
   * @returns Array of CachedLocationSummary
   */
  async listCached(): Promise<CachedLocationSummary[]> {
    const keys = await this.storage.keys();
    const summaries: CachedLocationSummary[] = [];

    for (const key of keys) {
      const json = await this.storage.get(key);
      if (json) {
        try {
          const location = jsonToCachedLocation(json);
          summaries.push({
            id: location.id,
            location: location.location,
            cachedAt: location.cachedAt,
            lastAccessed: location.lastAccessed,
          });
        } catch {
          // Skip corrupted entries
          continue;
        }
      }
    }

    return summaries;
  }

  /**
   * Removes a cached location
   * 
   * @param key - Cache key to remove
   */
  async remove(key: string): Promise<void> {
    await this.storage.delete(key);
  }

  /**
   * Gets current storage usage
   * Note: Actual byte calculation depends on storage backend
   * This implementation provides an estimate based on JSON string lengths
   * 
   * @returns StorageUsage with used bytes, total bytes, and location count
   */
  async getStorageUsage(): Promise<StorageUsage> {
    const keys = await this.storage.keys();
    let usedBytes = 0;

    for (const key of keys) {
      const json = await this.storage.get(key);
      if (json) {
        // Estimate bytes as string length (UTF-8 approximation)
        usedBytes += json.length;
      }
    }

    return {
      usedBytes,
      totalBytes: 50 * 1024 * 1024, // 50MB default limit
      locationCount: keys.length,
    };
  }

  /**
   * Clears all cached data
   */
  async clear(): Promise<void> {
    await this.storage.clear();
  }
}

// ============================================
// Storage Threshold Detection
// ============================================

/** Default storage threshold percentage (90%) */
export const STORAGE_THRESHOLD_PERCENTAGE = 0.9;

/**
 * Checks if storage usage exceeds the threshold (90% capacity)
 * Returns true if storage management prompt should be triggered
 * 
 * Requirements: 8.5
 * 
 * @param usage - Current storage usage
 * @param thresholdPercentage - Threshold percentage (default 0.9 = 90%)
 * @returns true if usedBytes exceeds threshold percentage of totalBytes
 */
export function isStorageThresholdExceeded(
  usage: StorageUsage,
  thresholdPercentage: number = STORAGE_THRESHOLD_PERCENTAGE
): boolean {
  if (usage.totalBytes <= 0) {
    return false;
  }
  return usage.usedBytes >= usage.totalBytes * thresholdPercentage;
}

/**
 * Gets storage usage and checks if threshold is exceeded
 * Convenience function combining getStorageUsage and threshold check
 * 
 * Requirements: 8.5
 * 
 * @param cacheManager - CacheManager instance
 * @returns Object with usage data and whether threshold is exceeded
 */
export async function getStorageUsageWithThresholdCheck(
  cacheManager: CacheManager
): Promise<{ usage: StorageUsage; thresholdExceeded: boolean }> {
  const usage = await cacheManager.getStorageUsage();
  const thresholdExceeded = isStorageThresholdExceeded(usage);
  return { usage, thresholdExceeded };
}
