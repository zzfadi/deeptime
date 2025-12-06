/**
 * Cache Hit Monitor Service
 * Monitors and logs implicit cache hits from Gemini API responses
 * Requirements: 8.3
 * 
 * Property 30: Cache hit logging
 * - Logs implicit cache hits from API responses
 * - Tracks cache hit rate
 * - Monitors cost savings from caching
 * 
 * This service tracks when the Gemini API returns cached tokens,
 * calculates cost savings, and provides analytics on caching effectiveness.
 */

import type { TokenUsage } from './types';
import {
  INPUT_COST_PER_1M,
  CACHED_COST_PER_1M,
} from './types';
import { aiCacheService, getTodayDateString } from './aiCache';

// ============================================
// Types
// ============================================

/**
 * Cache hit event for logging
 */
export interface CacheHitEvent {
  /** Timestamp of the cache hit */
  timestamp: Date;
  /** Type of cache hit */
  type: 'implicit' | 'explicit' | 'local';
  /** Number of cached tokens */
  cachedTokens: number;
  /** Total input tokens in the request */
  totalInputTokens: number;
  /** Cost saved by using cached tokens */
  costSaved: number;
  /** Cache key or identifier (if available) */
  cacheKey?: string;
  /** Model used */
  model?: string;
  /** Request type (narrative, image, video) */
  requestType?: 'text' | 'image' | 'video';
}

/**
 * Cache hit statistics for a time period
 */
export interface CacheHitStats {
  /** Total number of API requests */
  totalRequests: number;
  /** Number of requests with cache hits */
  requestsWithCacheHits: number;
  /** Total cached tokens across all requests */
  totalCachedTokens: number;
  /** Total input tokens across all requests */
  totalInputTokens: number;
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
  /** Token cache rate (cached tokens / total input tokens) */
  tokenCacheRate: number;
  /** Total cost saved from caching */
  totalCostSaved: number;
  /** Average cached tokens per request with cache hit */
  avgCachedTokensPerHit: number;
}

/**
 * Cache hit monitor configuration
 */
export interface CacheHitMonitorConfig {
  /** Whether to log cache hits to console */
  enableConsoleLogging: boolean;
  /** Callback for cache hit events */
  onCacheHit?: (event: CacheHitEvent) => void;
  /** Callback for significant cost savings (e.g., >$0.01) */
  onSignificantSaving?: (event: CacheHitEvent) => void;
  /** Threshold for significant savings (in USD) */
  significantSavingThreshold: number;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_CONFIG: CacheHitMonitorConfig = {
  enableConsoleLogging: true,
  significantSavingThreshold: 0.01,
};

// ============================================
// In-Memory Event Storage
// ============================================

/**
 * In-memory storage for cache hit events (for current session)
 * Events are also persisted via aiCacheService for long-term tracking
 */
const cacheHitEvents: CacheHitEvent[] = [];

/**
 * Maximum number of events to keep in memory
 */
const MAX_EVENTS_IN_MEMORY = 1000;

// ============================================
// Cost Calculation Utilities
// ============================================

/**
 * Calculate cost saved by using cached tokens instead of regular input tokens
 * Cached tokens cost 75% less than regular input tokens
 * 
 * @param cachedTokens - Number of tokens served from cache
 * @returns Cost saved in USD
 */
export function calculateCostSaved(cachedTokens: number): number {
  // Cost if tokens were not cached
  const fullCost = (cachedTokens / 1_000_000) * INPUT_COST_PER_1M;
  // Cost with caching
  const cachedCost = (cachedTokens / 1_000_000) * CACHED_COST_PER_1M;
  // Savings
  return fullCost - cachedCost;
}

/**
 * Calculate cache hit rate from token usage
 * 
 * @param tokenUsage - Token usage from API response
 * @returns Cache hit rate (0-1)
 */
export function calculateCacheHitRate(tokenUsage: TokenUsage): number {
  if (tokenUsage.inputTokens === 0) return 0;
  return tokenUsage.cachedTokens / tokenUsage.inputTokens;
}

// ============================================
// Cache Hit Monitor Interface
// ============================================

export interface CacheHitMonitor {
  /** Configure the monitor */
  configure(config: Partial<CacheHitMonitorConfig>): void;
  
  /** Get current configuration */
  getConfig(): CacheHitMonitorConfig;
  
  /**
   * Log a cache hit event from API response
   * Requirement 8.3: Log implicit cache hits from API responses
   * Property 30: Cache hit logging
   */
  logCacheHit(
    tokenUsage: TokenUsage,
    options?: {
      type?: 'implicit' | 'explicit' | 'local';
      cacheKey?: string;
      model?: string;
      requestType?: 'text' | 'image' | 'video';
    }
  ): Promise<CacheHitEvent | null>;
  
  /**
   * Log a local cache hit (content served from IndexedDB)
   */
  logLocalCacheHit(
    cacheKey: string,
    estimatedCostSaved: number,
    requestType?: 'text' | 'image' | 'video'
  ): Promise<CacheHitEvent>;
  
  /**
   * Get cache hit statistics for today
   */
  getTodayStats(): CacheHitStats;
  
  /**
   * Get cache hit statistics for a specific date
   */
  getStatsForDate(date: string): Promise<CacheHitStats>;
  
  /**
   * Get recent cache hit events
   */
  getRecentEvents(limit?: number): CacheHitEvent[];
  
  /**
   * Get total cost saved today
   */
  getTodayCostSaved(): number;
  
  /**
   * Clear in-memory event history
   */
  clearEventHistory(): void;
}

// ============================================
// Cache Hit Monitor Implementation
// ============================================

class CacheHitMonitorImpl implements CacheHitMonitor {
  private config: CacheHitMonitorConfig = { ...DEFAULT_CONFIG };
  private todayStats: CacheHitStats = this.createEmptyStats();
  private lastStatsDate: string = getTodayDateString();
  
  /**
   * Create empty stats object
   */
  private createEmptyStats(): CacheHitStats {
    return {
      totalRequests: 0,
      requestsWithCacheHits: 0,
      totalCachedTokens: 0,
      totalInputTokens: 0,
      cacheHitRate: 0,
      tokenCacheRate: 0,
      totalCostSaved: 0,
      avgCachedTokensPerHit: 0,
    };
  }
  
  /**
   * Reset stats if day has changed
   */
  private checkDateRollover(): void {
    const today = getTodayDateString();
    if (today !== this.lastStatsDate) {
      this.todayStats = this.createEmptyStats();
      this.lastStatsDate = today;
    }
  }
  
  /**
   * Update stats with new event
   */
  private updateStats(event: CacheHitEvent): void {
    this.checkDateRollover();
    
    this.todayStats.totalRequests++;
    this.todayStats.totalInputTokens += event.totalInputTokens;
    
    if (event.cachedTokens > 0) {
      this.todayStats.requestsWithCacheHits++;
      this.todayStats.totalCachedTokens += event.cachedTokens;
      this.todayStats.totalCostSaved += event.costSaved;
    }
    
    // Recalculate rates
    this.todayStats.cacheHitRate = this.todayStats.totalRequests > 0
      ? this.todayStats.requestsWithCacheHits / this.todayStats.totalRequests
      : 0;
    
    this.todayStats.tokenCacheRate = this.todayStats.totalInputTokens > 0
      ? this.todayStats.totalCachedTokens / this.todayStats.totalInputTokens
      : 0;
    
    this.todayStats.avgCachedTokensPerHit = this.todayStats.requestsWithCacheHits > 0
      ? this.todayStats.totalCachedTokens / this.todayStats.requestsWithCacheHits
      : 0;
  }
  
  /**
   * Configure the monitor
   */
  configure(config: Partial<CacheHitMonitorConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): CacheHitMonitorConfig {
    return { ...this.config };
  }
  
  /**
   * Log a cache hit event from API response
   * Requirement 8.3: Log implicit cache hits from API responses
   * Property 30: Cache hit logging
   */
  async logCacheHit(
    tokenUsage: TokenUsage,
    options?: {
      type?: 'implicit' | 'explicit' | 'local';
      cacheKey?: string;
      model?: string;
      requestType?: 'text' | 'image' | 'video';
    }
  ): Promise<CacheHitEvent | null> {
    // Only log if there were cached tokens
    if (tokenUsage.cachedTokens === 0) {
      // Still update stats for total requests
      this.checkDateRollover();
      this.todayStats.totalRequests++;
      this.todayStats.totalInputTokens += tokenUsage.inputTokens;
      
      // Recalculate rates
      this.todayStats.cacheHitRate = this.todayStats.totalRequests > 0
        ? this.todayStats.requestsWithCacheHits / this.todayStats.totalRequests
        : 0;
      this.todayStats.tokenCacheRate = this.todayStats.totalInputTokens > 0
        ? this.todayStats.totalCachedTokens / this.todayStats.totalInputTokens
        : 0;
      
      return null;
    }
    
    const costSaved = calculateCostSaved(tokenUsage.cachedTokens);
    
    const event: CacheHitEvent = {
      timestamp: new Date(),
      type: options?.type || 'implicit',
      cachedTokens: tokenUsage.cachedTokens,
      totalInputTokens: tokenUsage.inputTokens,
      costSaved,
      cacheKey: options?.cacheKey,
      model: options?.model,
      requestType: options?.requestType,
    };
    
    // Store event in memory
    cacheHitEvents.push(event);
    if (cacheHitEvents.length > MAX_EVENTS_IN_MEMORY) {
      cacheHitEvents.shift();
    }
    
    // Update stats
    this.updateStats(event);
    
    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      const cacheRate = ((tokenUsage.cachedTokens / tokenUsage.inputTokens) * 100).toFixed(1);
      console.log(
        `[CacheHitMonitor] ${event.type} cache hit: ${tokenUsage.cachedTokens}/${tokenUsage.inputTokens} tokens ` +
        `(${cacheRate}%), saved $${costSaved.toFixed(6)}`
      );
    }
    
    // Trigger callbacks
    if (this.config.onCacheHit) {
      this.config.onCacheHit(event);
    }
    
    if (costSaved >= this.config.significantSavingThreshold && this.config.onSignificantSaving) {
      this.config.onSignificantSaving(event);
    }
    
    // Also log to persistent storage via aiCacheService
    // This increments the cache hit counter for the day
    await aiCacheService.logCacheHit();
    
    return event;
  }
  
  /**
   * Log a local cache hit (content served from IndexedDB)
   */
  async logLocalCacheHit(
    cacheKey: string,
    estimatedCostSaved: number,
    requestType?: 'text' | 'image' | 'video'
  ): Promise<CacheHitEvent> {
    const event: CacheHitEvent = {
      timestamp: new Date(),
      type: 'local',
      cachedTokens: 0, // Not applicable for local cache
      totalInputTokens: 0,
      costSaved: estimatedCostSaved,
      cacheKey,
      requestType,
    };
    
    // Store event in memory
    cacheHitEvents.push(event);
    if (cacheHitEvents.length > MAX_EVENTS_IN_MEMORY) {
      cacheHitEvents.shift();
    }
    
    // Update cost saved (but not token stats)
    this.checkDateRollover();
    this.todayStats.totalCostSaved += estimatedCostSaved;
    
    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      console.log(
        `[CacheHitMonitor] Local cache hit for "${cacheKey}", saved ~$${estimatedCostSaved.toFixed(4)}`
      );
    }
    
    // Trigger callbacks
    if (this.config.onCacheHit) {
      this.config.onCacheHit(event);
    }
    
    // Also log to persistent storage
    await aiCacheService.logCacheHit();
    
    return event;
  }
  
  /**
   * Get cache hit statistics for today
   */
  getTodayStats(): CacheHitStats {
    this.checkDateRollover();
    return { ...this.todayStats };
  }
  
  /**
   * Get cache hit statistics for a specific date
   */
  async getStatsForDate(date: string): Promise<CacheHitStats> {
    const dailyCost = await aiCacheService.getDailyCost(date);
    
    if (!dailyCost) {
      return this.createEmptyStats();
    }
    
    const totalRequests = dailyCost.apiCalls + dailyCost.cacheHits;
    
    return {
      totalRequests,
      requestsWithCacheHits: dailyCost.cacheHits,
      totalCachedTokens: 0, // Not tracked in daily cost record
      totalInputTokens: 0, // Not tracked in daily cost record
      cacheHitRate: totalRequests > 0 ? dailyCost.cacheHits / totalRequests : 0,
      tokenCacheRate: 0, // Not tracked in daily cost record
      totalCostSaved: 0, // Would need separate tracking
      avgCachedTokensPerHit: 0, // Not tracked in daily cost record
    };
  }
  
  /**
   * Get recent cache hit events
   */
  getRecentEvents(limit: number = 50): CacheHitEvent[] {
    return cacheHitEvents.slice(-limit);
  }
  
  /**
   * Get total cost saved today
   */
  getTodayCostSaved(): number {
    this.checkDateRollover();
    return this.todayStats.totalCostSaved;
  }
  
  /**
   * Clear in-memory event history
   */
  clearEventHistory(): void {
    cacheHitEvents.length = 0;
    this.todayStats = this.createEmptyStats();
  }
}

// ============================================
// Singleton Export
// ============================================

export const cacheHitMonitor: CacheHitMonitor = new CacheHitMonitorImpl();

export default cacheHitMonitor;
