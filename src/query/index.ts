// Data Query Service for DeepTime application
// Requirements: 1.2, 2.5

import type {
  GeoCoordinate,
  GeologicalStack,
  CachedLocation,
  Narrative,
} from '../types';
import {
  CacheManager,
  generateCacheKey,
} from '../cache';
import {
  parseGeologicalResponse,
  buildGeologicalStack,
} from '../geological';

// ============================================
// API Client Interface
// ============================================

/**
 * Interface for geological API client abstraction
 * Allows for different implementations (real API, mock, etc.)
 */
export interface GeologicalAPIClient {
  /**
   * Fetches geological data for a location from external API (e.g., USGS)
   * @param location - Geographic coordinates to query
   * @returns Raw API response data (array of layer objects)
   */
  fetchGeologicalData(location: GeoCoordinate): Promise<unknown>;
}

// ============================================
// Query Service Configuration
// ============================================

/**
 * Configuration for DataQueryService
 */
export interface DataQueryServiceConfig {
  /** API request timeout in milliseconds */
  timeoutMs?: number;
  /** Whether to use cache (default: true) */
  useCache?: boolean;
  /** Default data source name */
  dataSource?: string;
}

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_DATA_SOURCE = 'USGS';

// ============================================
// Query Result Types
// ============================================

/**
 * Result of a geological query
 */
export interface QueryResult {
  /** The geological stack data */
  stack: GeologicalStack;
  /** Whether data came from cache */
  fromCache: boolean;
  /** Cache key used for this location */
  cacheKey: string;
  /** Any warnings from parsing */
  warnings: string[];
}

/**
 * Error thrown when query operation fails
 */
export class QueryError extends Error {
  constructor(
    message: string,
    public readonly code: 'NETWORK_ERROR' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'TIMEOUT' | 'NO_DATA'
  ) {
    super(message);
    this.name = 'QueryError';
  }
}

// ============================================
// Data Query Service Implementation
// ============================================

/**
 * DataQueryService manages communication with geological databases and caching.
 * 
 * Requirements:
 * - 1.2: WHEN LiDAR data and GPS coordinates are captured THEN the DeepTime_App 
 *        SHALL query geological databases (USGS) for soil composition, bedrock 
 *        formations, and historical data for that location
 * - 2.5: WHEN narrative generation completes THEN the DeepTime_App SHALL cache 
 *        the narrative for offline access at that location
 */
export class DataQueryService {
  private apiClient: GeologicalAPIClient;
  private cacheManager: CacheManager;
  private config: Required<DataQueryServiceConfig>;

  constructor(
    apiClient: GeologicalAPIClient,
    cacheManager: CacheManager,
    config: DataQueryServiceConfig = {}
  ) {
    this.apiClient = apiClient;
    this.cacheManager = cacheManager;
    this.config = {
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      useCache: config.useCache ?? true,
      dataSource: config.dataSource ?? DEFAULT_DATA_SOURCE,
    };
  }

  /**
   * Generates a cache key for a location
   */
  getCacheKey(location: GeoCoordinate): string {
    return generateCacheKey(location);
  }

  /**
   * Checks cache for existing geological data at a location
   * 
   * @param location - Geographic coordinates to check
   * @returns GeologicalStack if found in cache, null otherwise
   */
  async getCachedData(location: GeoCoordinate): Promise<GeologicalStack | null> {
    if (!this.config.useCache) {
      return null;
    }

    const cacheKey = this.getCacheKey(location);
    
    try {
      const cached = await this.cacheManager.retrieve(cacheKey);
      if (cached) {
        return cached.geologicalStack;
      }
    } catch {
      // Cache retrieval failed, continue without cache
    }

    return null;
  }

  /**
   * Persists geological data to cache
   * 
   * @param location - Geographic coordinates
   * @param stack - Geological stack to cache
   * @param narratives - Optional narratives to cache with the stack
   */
  async cacheData(
    location: GeoCoordinate,
    stack: GeologicalStack,
    narratives: Narrative[] = []
  ): Promise<void> {
    if (!this.config.useCache) {
      return;
    }

    const cacheKey = this.getCacheKey(location);
    const now = new Date();

    const cachedLocation: CachedLocation = {
      id: cacheKey,
      location,
      geologicalStack: stack,
      narratives,
      cachedAt: now,
      lastAccessed: now,
      schemaVersion: 1,
    };

    try {
      await this.cacheManager.store(cacheKey, cachedLocation);
    } catch {
      // Cache storage failed, continue without caching
      // This is non-critical - data can be re-fetched
    }
  }

  /**
   * Queries geological data for a location.
   * 
   * This method:
   * 1. Checks cache first (if enabled)
   * 2. Falls back to API query if not cached
   * 3. Parses and validates the response
   * 4. Builds a GeologicalStack
   * 5. Caches the result for offline access
   * 
   * Requirements:
   * - 1.2: Query geological databases for soil composition, bedrock formations
   * - 2.5: Cache data for offline access
   * 
   * @param location - Geographic coordinates to query
   * @param forceRefresh - If true, bypasses cache and fetches fresh data
   * @returns QueryResult with geological stack and metadata
   * @throws QueryError if query fails
   */
  async queryGeology(
    location: GeoCoordinate,
    forceRefresh = false
  ): Promise<QueryResult> {
    const cacheKey = this.getCacheKey(location);
    const warnings: string[] = [];

    // Check cache first (unless force refresh)
    if (!forceRefresh && this.config.useCache) {
      try {
        const cached = await this.cacheManager.retrieve(cacheKey);
        if (cached) {
          return {
            stack: cached.geologicalStack,
            fromCache: true,
            cacheKey,
            warnings: [],
          };
        }
      } catch {
        // Cache retrieval failed, continue to API
        warnings.push('Cache retrieval failed, fetching from API');
      }
    }

    // Fetch from API
    let rawData: unknown;
    try {
      rawData = await this.fetchWithTimeout(location);
    } catch (error) {
      // Handle network errors gracefully
      if (error instanceof QueryError) {
        throw error;
      }
      throw new QueryError(
        `Network error while fetching geological data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR'
      );
    }

    // Parse the response
    const parseResult = parseGeologicalResponse(rawData);

    // Collect parse warnings
    for (const warning of parseResult.warnings) {
      warnings.push(`Layer ${warning.layerIndex}: ${warning.message}`);
    }

    // Check for critical parse errors
    if (parseResult.errors.length > 0) {
      const errorMessages = parseResult.errors
        .map(e => `Layer ${e.layerIndex}: ${e.message}`)
        .join('; ');
      throw new QueryError(
        `Failed to parse geological data: ${errorMessages}`,
        'PARSE_ERROR'
      );
    }

    // Check for empty result
    if (parseResult.layers.length === 0) {
      throw new QueryError(
        'No geological data available for this location',
        'NO_DATA'
      );
    }

    // Build the geological stack
    const buildResult = buildGeologicalStack(parseResult.layers, {
      location,
      dataSource: this.config.dataSource,
      confidence: 0.8, // Default confidence for API data
      queryTimestamp: new Date(),
    });

    // Check for build errors
    if (buildResult.errors.length > 0 || !buildResult.stack) {
      const errorMessages = buildResult.errors
        .map(e => e.message)
        .join('; ');
      throw new QueryError(
        `Failed to build geological stack: ${errorMessages}`,
        'VALIDATION_ERROR'
      );
    }

    const stack = buildResult.stack;

    // Cache the result for offline access (Requirement 2.5)
    await this.cacheData(location, stack);

    return {
      stack,
      fromCache: false,
      cacheKey,
      warnings,
    };
  }

  /**
   * Fetches geological data with timeout handling
   */
  private async fetchWithTimeout(location: GeoCoordinate): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new QueryError('API request timed out', 'TIMEOUT'));
      }, this.config.timeoutMs);

      this.apiClient
        .fetchGeologicalData(location)
        .then(data => {
          clearTimeout(timeoutId);
          resolve(data);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Clears cached data for a specific location
   */
  async clearCache(location: GeoCoordinate): Promise<void> {
    const cacheKey = this.getCacheKey(location);
    await this.cacheManager.remove(cacheKey);
  }

  /**
   * Clears all cached geological data
   */
  async clearAllCache(): Promise<void> {
    await this.cacheManager.clear();
  }
}

// ============================================
// Mock API Client (for testing)
// ============================================

/**
 * Mock geological API client for testing
 */
export class MockGeologicalAPIClient implements GeologicalAPIClient {
  private responseData: unknown = [];
  private shouldFail = false;
  private failureError: Error | null = null;
  private latencyMs = 0;

  async fetchGeologicalData(_location: GeoCoordinate): Promise<unknown> {
    // Simulate network latency
    if (this.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.latencyMs));
    }

    if (this.shouldFail) {
      throw this.failureError ?? new Error('API request failed');
    }

    return this.responseData;
  }

  /**
   * Sets the mock response data
   */
  setResponseData(data: unknown): void {
    this.responseData = data;
  }

  /**
   * Configures the mock to fail with an error
   */
  setFailure(shouldFail: boolean, error?: Error): void {
    this.shouldFail = shouldFail;
    this.failureError = error ?? null;
  }

  /**
   * Sets simulated network latency
   */
  setLatency(ms: number): void {
    this.latencyMs = ms;
  }
}
