/**
 * Cost Tracking Service
 * Comprehensive cost monitoring and budget control for AI API usage
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 * 
 * Property 39: Token count logging
 * Property 40: Cache hit event logging
 * Property 41: Image cost logging
 * Property 42: Video cost logging
 * Property 43: Usage threshold alerts
 */

import type { TokenUsage, DailyCostRecord, MediaResolution } from './types';
import {
  INPUT_COST_PER_1M,
  OUTPUT_COST_PER_1M,
  CACHED_COST_PER_1M,
  IMAGE_COST_BY_RESOLUTION,
  VIDEO_COST_PER_SECOND_FAST,
  VIDEO_COST_PER_SECOND_STANDARD,
} from './types';
import { aiCacheService, getTodayDateString } from './aiCache';

// ============================================
// Cost Tracking Types
// ============================================

/**
 * API call log entry for detailed tracking
 */
export interface ApiCallLogEntry {
  /** Timestamp of the API call */
  timestamp: Date;
  /** Type of API call */
  type: 'text' | 'image' | 'video';
  /** Model used for generation */
  model: string;
  /** Cost in USD */
  cost: number;
  /** Token usage (for text generation) */
  tokenUsage?: TokenUsage;
  /** Image resolution (for image generation) */
  resolution?: MediaResolution;
  /** Video duration in seconds (for video generation) */
  duration?: number;
  /** Cache key for the content */
  cacheKey?: string;
}

/**
 * Cache hit log entry
 */
export interface CacheHitLogEntry {
  /** Timestamp of the cache hit */
  timestamp: Date;
  /** Cache key that was hit */
  cacheKey: string;
  /** Type of content served from cache */
  contentType: 'text' | 'image' | 'video' | 'all';
  /** Estimated cost saved by using cache */
  costSaved: number;
}

/**
 * Usage threshold configuration
 */
export interface UsageThreshold {
  /** Daily cost threshold in USD */
  dailyLimit: number;
  /** Warning threshold (percentage of daily limit) */
  warningThreshold: number;
  /** Whether to disable generation when over budget */
  disableOnExceed: boolean;
}

/**
 * Threshold alert event
 */
export interface ThresholdAlert {
  /** Timestamp of the alert */
  timestamp: Date;
  /** Type of alert */
  type: 'warning' | 'exceeded';
  /** Current daily cost */
  currentCost: number;
  /** Configured threshold */
  threshold: number;
  /** Message describing the alert */
  message: string;
}

/**
 * Cost tracking service configuration
 */
export interface CostTrackingConfig {
  /** Usage thresholds */
  thresholds: UsageThreshold;
  /** Whether to log to console */
  enableConsoleLogging: boolean;
  /** Callback for threshold alerts */
  onThresholdAlert?: (alert: ThresholdAlert) => void;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_THRESHOLDS: UsageThreshold = {
  dailyLimit: 100, // $100 daily limit
  warningThreshold: 0.8, // Warn at 80%
  disableOnExceed: false, // Don't disable by default
};

const DEFAULT_CONFIG: CostTrackingConfig = {
  thresholds: DEFAULT_THRESHOLDS,
  enableConsoleLogging: true,
};

// ============================================
// Cost Calculation Utilities
// ============================================


/**
 * Calculate text generation cost from token usage
 * Requirement 11.1: Log token counts for input, output, and cached tokens
 * Requirement 2.1: Apply the correct 90% discount rate of $0.03 per 1M tokens
 * Property 39: Token count logging
 * 
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param cachedTokens - Number of cached tokens (90% discount - $0.03 per 1M)
 * @returns Cost in USD
 */
export function calculateTextCost(
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0
): number {
  // Non-cached input tokens at full price
  const nonCachedInputTokens = Math.max(0, inputTokens - cachedTokens);
  
  const inputCost = (nonCachedInputTokens / 1_000_000) * INPUT_COST_PER_1M;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;
  const cachedCost = (cachedTokens / 1_000_000) * CACHED_COST_PER_1M;
  
  return inputCost + outputCost + cachedCost;
}

/**
 * Calculate image generation cost by resolution
 * Requirement 11.3: Log image generation costs based on resolution
 * Property 41: Image cost logging
 * 
 * @param resolution - Image resolution (LOW, MEDIUM, HIGH)
 * @returns Cost in USD
 */
export function calculateImageCost(resolution: MediaResolution = 'MEDIUM'): number {
  return IMAGE_COST_BY_RESOLUTION[resolution];
}

/**
 * Calculate video generation cost by duration
 * Requirement 11.4: Log video generation costs based on duration
 * Property 42: Video cost logging
 * 
 * @param durationSeconds - Video duration in seconds
 * @param useFastModel - Whether using Veo 3.1 Fast (true) or Standard (false)
 * @returns Cost in USD
 */
export function calculateVideoCost(
  durationSeconds: number,
  useFastModel: boolean = true
): number {
  const costPerSecond = useFastModel 
    ? VIDEO_COST_PER_SECOND_FAST 
    : VIDEO_COST_PER_SECOND_STANDARD;
  return durationSeconds * costPerSecond;
}

/**
 * Create TokenUsage object with calculated cost
 * Requirement 11.1: Log token counts for input, output, and cached tokens
 */
export function createTokenUsage(
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number = 0
): TokenUsage {
  return {
    inputTokens,
    outputTokens,
    cachedTokens,
    totalCost: calculateTextCost(inputTokens, outputTokens, cachedTokens),
  };
}

// ============================================
// Cost Tracking Service Interface
// ============================================

export interface CostTrackingService {
  /** Configure the service */
  configure(config: Partial<CostTrackingConfig>): void;
  
  /** Get current configuration */
  getConfig(): CostTrackingConfig;
  
  /** Log an API call with cost */
  logApiCall(entry: Omit<ApiCallLogEntry, 'timestamp'>): Promise<void>;
  
  /** Log a cache hit event */
  logCacheHit(entry: Omit<CacheHitLogEntry, 'timestamp'>): Promise<void>;
  
  /** Get daily cost record */
  getDailyCost(date?: string): Promise<DailyCostRecord | null>;
  
  /** Get cost for a date range */
  getCostRange(startDate: string, endDate: string): Promise<DailyCostRecord[]>;
  
  /** Check if daily limit is exceeded */
  isOverBudget(): Promise<boolean>;
  
  /** Check current threshold status */
  checkThresholds(): Promise<ThresholdAlert | null>;
  
  /** Get total cost for today */
  getTodayCost(): Promise<number>;
  
  /** Get cache hit rate for today */
  getTodayCacheHitRate(): Promise<number>;
  
  /** Reset daily cost tracking (for testing) */
  resetDailyCost(date?: string): Promise<void>;
}

// ============================================
// Cost Tracking Service Implementation
// ============================================

class CostTrackingServiceImpl implements CostTrackingService {
  private config: CostTrackingConfig = { ...DEFAULT_CONFIG };
  private alertHistory: ThresholdAlert[] = [];
  
  /**
   * Configure the service
   */
  configure(config: Partial<CostTrackingConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      thresholds: {
        ...this.config.thresholds,
        ...config.thresholds,
      },
    };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): CostTrackingConfig {
    return { ...this.config };
  }
  
  /**
   * Log an API call with cost
   * Requirement 11.1: Log token counts for input, output, and cached tokens
   * Requirement 11.3: Log image generation costs
   * Requirement 11.4: Log video generation costs
   */
  async logApiCall(entry: Omit<ApiCallLogEntry, 'timestamp'>): Promise<void> {
    // Calculate costs based on type
    let textCost = 0;
    let imageCost = 0;
    let videoCost = 0;
    
    switch (entry.type) {
      case 'text':
        textCost = entry.cost;
        if (this.config.enableConsoleLogging && entry.tokenUsage) {
          console.log(
            `[CostTracking] Text generation: ${entry.tokenUsage.inputTokens} input, ` +
            `${entry.tokenUsage.outputTokens} output, ${entry.tokenUsage.cachedTokens} cached, ` +
            `$${entry.cost.toFixed(6)}`
          );
        }
        break;
        
      case 'image':
        imageCost = entry.cost;
        if (this.config.enableConsoleLogging) {
          console.log(
            `[CostTracking] Image generation (${entry.resolution || 'MEDIUM'}): $${entry.cost.toFixed(4)}`
          );
        }
        break;
        
      case 'video':
        videoCost = entry.cost;
        if (this.config.enableConsoleLogging) {
          console.log(
            `[CostTracking] Video generation (${entry.duration || 5}s): $${entry.cost.toFixed(4)}`
          );
        }
        break;
    }
    
    // Store in IndexedDB via aiCacheService
    await aiCacheService.logApiCost(textCost, imageCost, videoCost);
    
    // Check thresholds after logging
    const alert = await this.checkThresholds();
    if (alert && this.config.onThresholdAlert) {
      this.config.onThresholdAlert(alert);
    }
  }
  
  /**
   * Log a cache hit event
   * Requirement 11.2: Log cache hit events
   * Property 40: Cache hit event logging
   */
  async logCacheHit(entry: Omit<CacheHitLogEntry, 'timestamp'>): Promise<void> {
    if (this.config.enableConsoleLogging) {
      console.log(
        `[CostTracking] Cache hit for ${entry.cacheKey} (${entry.contentType}), ` +
        `saved ~$${entry.costSaved.toFixed(4)}`
      );
    }
    
    // Store in IndexedDB via aiCacheService
    await aiCacheService.logCacheHit();
  }
  
  /**
   * Get daily cost record
   */
  async getDailyCost(date?: string): Promise<DailyCostRecord | null> {
    return aiCacheService.getDailyCost(date);
  }
  
  /**
   * Get cost for a date range
   * Note: This is a simplified implementation that fetches each day individually
   */
  async getCostRange(startDate: string, endDate: string): Promise<DailyCostRecord[]> {
    const records: DailyCostRecord[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const record = await this.getDailyCost(dateStr);
      if (record) {
        records.push(record);
      }
    }
    
    return records;
  }
  
  /**
   * Check if daily limit is exceeded
   * Requirement 11.5: Optionally disable generation when over budget
   */
  async isOverBudget(): Promise<boolean> {
    if (!this.config.thresholds.disableOnExceed) {
      return false;
    }
    
    const todayCost = await this.getTodayCost();
    return todayCost >= this.config.thresholds.dailyLimit;
  }
  
  /**
   * Check current threshold status
   * Requirement 11.5: Alert administrators when usage exceeds thresholds
   * Property 43: Usage threshold alerts
   */
  async checkThresholds(): Promise<ThresholdAlert | null> {
    const todayCost = await this.getTodayCost();
    const { dailyLimit, warningThreshold } = this.config.thresholds;
    
    // Check if exceeded
    if (todayCost >= dailyLimit) {
      const alert: ThresholdAlert = {
        timestamp: new Date(),
        type: 'exceeded',
        currentCost: todayCost,
        threshold: dailyLimit,
        message: `Daily cost limit exceeded: $${todayCost.toFixed(2)} >= $${dailyLimit.toFixed(2)}`,
      };
      
      // Only log if this is a new alert (not already logged today)
      if (!this.hasAlertedToday('exceeded')) {
        this.alertHistory.push(alert);
        if (this.config.enableConsoleLogging) {
          console.warn(`[CostTracking] ALERT: ${alert.message}`);
        }
        return alert;
      }
    }
    // Check if at warning level
    else if (todayCost >= dailyLimit * warningThreshold) {
      const alert: ThresholdAlert = {
        timestamp: new Date(),
        type: 'warning',
        currentCost: todayCost,
        threshold: dailyLimit * warningThreshold,
        message: `Daily cost approaching limit: $${todayCost.toFixed(2)} (${((todayCost / dailyLimit) * 100).toFixed(1)}% of $${dailyLimit.toFixed(2)})`,
      };
      
      // Only log if this is a new alert (not already logged today)
      if (!this.hasAlertedToday('warning')) {
        this.alertHistory.push(alert);
        if (this.config.enableConsoleLogging) {
          console.warn(`[CostTracking] WARNING: ${alert.message}`);
        }
        return alert;
      }
    }
    
    return null;
  }
  
  /**
   * Check if we've already alerted today for a given type
   */
  private hasAlertedToday(type: 'warning' | 'exceeded'): boolean {
    const today = getTodayDateString();
    return this.alertHistory.some(
      alert => 
        alert.type === type && 
        alert.timestamp.toISOString().split('T')[0] === today
    );
  }
  
  /**
   * Get total cost for today
   */
  async getTodayCost(): Promise<number> {
    const record = await this.getDailyCost();
    return record?.totalCost || 0;
  }
  
  /**
   * Get cache hit rate for today
   */
  async getTodayCacheHitRate(): Promise<number> {
    const record = await this.getDailyCost();
    if (!record) return 0;
    
    const totalRequests = record.apiCalls + record.cacheHits;
    if (totalRequests === 0) return 0;
    
    return record.cacheHits / totalRequests;
  }
  
  /**
   * Reset daily cost tracking (for testing)
   */
  async resetDailyCost(date?: string): Promise<void> {
    // Clear alert history for the day
    const targetDate = date || getTodayDateString();
    this.alertHistory = this.alertHistory.filter(
      alert => alert.timestamp.toISOString().split('T')[0] !== targetDate
    );
    
    // Note: We don't actually delete from IndexedDB here to preserve history
    // This is mainly for testing purposes
  }
}

// ============================================
// Singleton Export
// ============================================

export const costTrackingService: CostTrackingService = new CostTrackingServiceImpl();

export default costTrackingService;
