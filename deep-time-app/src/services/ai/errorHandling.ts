/**
 * Error Handling Infrastructure for AI Services
 * Requirements: 9.1, 9.4, 9.5
 * 
 * Key Features:
 * - Defines AIErrorType enum for error classification
 * - Creates ErrorRecoveryStrategy interface
 * - Implements error classification and recovery logic
 * - Provides exponential backoff for rate limits
 */

import type { AIErrorType, ErrorRecoveryStrategy } from './types';

// ============================================
// Error Classification
// ============================================

/**
 * Custom error class for AI-related errors
 * Provides structured error information for recovery strategies
 */
export class AIError extends Error {
  constructor(
    public readonly type: AIErrorType,
    message: string,
    public readonly cause?: Error,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIError';
  }

  /**
   * Check if this error is a rate limit error
   */
  isRateLimit(): boolean {
    return this.type === 'rate_limit' || this.statusCode === 429;
  }

  /**
   * Check if this error is recoverable with retry
   */
  isRetryable(): boolean {
    return this.retryable || this.type === 'rate_limit' || this.type === 'network_error';
  }
}

// ============================================
// Error Classification Functions
// ============================================

/**
 * Classifies an error into an AIErrorType
 * Requirement 9.1, 9.4, 9.5: Graceful degradation and fallbacks
 */
export function classifyError(error: unknown): AIErrorType {
  if (error instanceof AIError) {
    return error.type;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const errorString = String(error);

    // Rate limit detection (429 status)
    // Requirement 9.5: Rate limit handling
    if (
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('quota exceeded')
    ) {
      return 'rate_limit';
    }

    // Invalid API key detection
    // Requirement 9.4: API key missing or invalid
    if (
      message.includes('api key') ||
      message.includes('invalid key') ||
      message.includes('unauthorized') ||
      message.includes('401') ||
      message.includes('403')
    ) {
      return 'invalid_key';
    }

    // Network error detection
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('econnrefused') ||
      errorString.includes('TypeError: Failed to fetch')
    ) {
      return 'network_error';
    }

    // Parse error detection
    if (
      message.includes('parse') ||
      message.includes('json') ||
      message.includes('syntax')
    ) {
      return 'parse_error';
    }

    // Cache error detection
    if (
      message.includes('indexeddb') ||
      message.includes('cache') ||
      message.includes('storage')
    ) {
      return 'cache_error';
    }

    // Timeout detection
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'generation_timeout';
    }
  }

  // Default to generic API error
  return 'api_error';
}

/**
 * Creates an AIError from any error type
 */
export function createAIError(error: unknown, defaultType?: AIErrorType): AIError {
  if (error instanceof AIError) {
    return error;
  }

  const type = defaultType || classifyError(error);
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error ? error : undefined;
  const retryable = type === 'rate_limit' || type === 'network_error';

  return new AIError(type, message, cause, undefined, retryable);
}

// ============================================
// Recovery Strategies
// ============================================

/**
 * Default recovery strategies for each error type
 * Requirement 9.1, 9.4, 9.5: Graceful degradation
 */
export const DEFAULT_RECOVERY_STRATEGIES: Record<AIErrorType, ErrorRecoveryStrategy> = {
  api_error: {
    errorType: 'api_error',
    fallbackBehavior: 'use_fallback',
  },
  rate_limit: {
    errorType: 'rate_limit',
    fallbackBehavior: 'retry',
    retryConfig: {
      maxAttempts: 3,
      backoffMs: [1000, 2000, 4000, 8000],
    },
  },
  invalid_key: {
    errorType: 'invalid_key',
    fallbackBehavior: 'use_fallback',
  },
  parse_error: {
    errorType: 'parse_error',
    fallbackBehavior: 'use_fallback',
  },
  cache_error: {
    errorType: 'cache_error',
    fallbackBehavior: 'fail_gracefully',
  },
  network_error: {
    errorType: 'network_error',
    fallbackBehavior: 'use_cache',
  },
  generation_timeout: {
    errorType: 'generation_timeout',
    fallbackBehavior: 'use_fallback',
  },
};

/**
 * Gets the recovery strategy for an error type
 */
export function getRecoveryStrategy(errorType: AIErrorType): ErrorRecoveryStrategy {
  return DEFAULT_RECOVERY_STRATEGIES[errorType];
}

// ============================================
// Exponential Backoff
// ============================================

/**
 * Configuration for exponential backoff
 */
export interface BackoffConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Base delay in milliseconds */
  baseDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Multiplier for each retry */
  multiplier: number;
  /** Add jitter to prevent thundering herd */
  jitter: boolean;
}

/**
 * Default backoff configuration
 * Requirement 9.5: Exponential backoff (1s, 2s, 4s, 8s)
 */
export const DEFAULT_BACKOFF_CONFIG: BackoffConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
  multiplier: 2,
  jitter: true,
};

/**
 * Calculates the delay for a given retry attempt
 * Requirement 9.5: Exponential backoff (1s, 2s, 4s, 8s)
 * 
 * @param attempt - The current attempt number (0-indexed)
 * @param config - Backoff configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attempt: number,
  config: BackoffConfig = DEFAULT_BACKOFF_CONFIG
): number {
  // Calculate exponential delay: baseDelay * multiplier^attempt
  const exponentialDelay = config.baseDelayMs * Math.pow(config.multiplier, attempt);
  
  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  
  // Add jitter if enabled (±25% randomization)
  if (config.jitter) {
    const jitterRange = cappedDelay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, Math.round(cappedDelay + jitter));
  }
  
  return cappedDelay;
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes an operation with exponential backoff retry
 * Requirement 9.5: Retry with exponential backoff
 * 
 * Property 34: Exponential backoff on rate limits
 * 
 * @param operation - The async operation to execute
 * @param config - Backoff configuration
 * @param shouldRetry - Optional function to determine if error is retryable
 * @returns The result of the operation
 * @throws AIError if all retries are exhausted
 */
export async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  config: BackoffConfig = DEFAULT_BACKOFF_CONFIG,
  shouldRetry?: (error: unknown, attempt: number) => boolean
): Promise<T> {
  let lastError: unknown;
  const delays: number[] = [];

  for (let attempt = 0; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      const aiError = createAIError(error);
      const canRetry = shouldRetry 
        ? shouldRetry(error, attempt) 
        : aiError.isRetryable();
      
      // If not retryable or last attempt, throw
      if (!canRetry || attempt >= config.maxAttempts) {
        throw aiError;
      }
      
      // Calculate and apply backoff delay
      const delay = calculateBackoffDelay(attempt, config);
      delays.push(delay);
      
      console.log(
        `[ErrorHandling] Retry attempt ${attempt + 1}/${config.maxAttempts} ` +
        `after ${delay}ms delay. Error: ${aiError.message}`
      );
      
      await sleep(delay);
    }
  }

  // Should not reach here, but throw last error just in case
  throw createAIError(lastError);
}

// ============================================
// Rate Limit Handler
// ============================================

/**
 * Handles rate limit errors with exponential backoff
 * Requirement 9.5: Detect 429 status codes, implement exponential backoff
 * 
 * @param operation - The async operation to execute
 * @param maxRetries - Maximum number of retries (default: 3)
 * @returns The result of the operation
 */
export async function handleRateLimit<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const config: BackoffConfig = {
    ...DEFAULT_BACKOFF_CONFIG,
    maxAttempts: maxRetries,
  };

  return withExponentialBackoff(
    operation,
    config,
    (error) => {
      const aiError = createAIError(error);
      return aiError.isRateLimit();
    }
  );
}

// ============================================
// Offline Detection
// ============================================

/**
 * Checks if the device is currently online
 * Requirement 5.5: Check navigator.onLine status
 */
export function isOnline(): boolean {
  // In Node.js environment (tests), assume online
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine;
}

/**
 * Checks if the device is currently offline
 * Requirement 5.5: Serve all content from cache when offline
 */
export function isOffline(): boolean {
  return !isOnline();
}

/**
 * Adds an event listener for online/offline status changes
 */
export function onOnlineStatusChange(
  callback: (isOnline: boolean) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op in Node.js
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ============================================
// API Key Validation
// ============================================

/**
 * Checks if an API key is configured
 * Requirement 9.4: API key missing or invalid
 */
export function isApiKeyConfigured(apiKey: string | undefined | null): boolean {
  return !!apiKey && apiKey.trim().length > 0;
}

/**
 * Validates API key format (basic validation)
 * Requirement 9.4: API key validation
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  // Gemini API keys are typically 39 characters starting with 'AI'
  // But we'll be lenient and just check for reasonable length
  return apiKey.length >= 10 && apiKey.length <= 100;
}

// ============================================
// Error Logging
// ============================================

/**
 * Logs an AI error with context
 */
export function logAIError(
  error: AIError | unknown,
  context?: Record<string, unknown>
): void {
  const aiError = error instanceof AIError ? error : createAIError(error);
  
  console.error('[AI Error]', {
    type: aiError.type,
    message: aiError.message,
    retryable: aiError.retryable,
    statusCode: aiError.statusCode,
    ...context,
  });
}
