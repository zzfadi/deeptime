/**
 * AI Services Module
 * Exports all AI-related types and services for content generation
 * Requirements: 2.1, 3.1, 4.1, 5.1, 11.1
 */

// Type exports
export type {
  // Location Context
  LocationContext,

  // Token and Cost Tracking
  TokenUsage,
  DailyCostRecord,

  // Enhanced Narrative
  EnhancedNarrative,

  // Image Generation
  GeneratedImage,
  ImageGenerationOptions,
  MediaResolution,

  // Video Generation
  VideoOperation,
  GeneratedVideo,
  VideoGenerationOptions,

  // Generation Metadata
  GenerationMetadata,

  // Combined Content
  AIGeneratedContent,
  EraContent,

  // Cache Types
  CacheMetadata,
  CacheEntry,
  CachedEraContent,
  CacheStats,

  // Error Types
  AIErrorType,
  ErrorRecoveryStrategy,

  // IndexedDB Schema
  DeepTimeCacheDB,
} from './types';

// Constant exports
export {
  CACHE_TTL_MS,
  MAX_CACHE_SIZE_BYTES,
  DEFAULT_VIDEO_DURATION,
  MIN_VIDEO_DURATION,
  MAX_VIDEO_DURATION,
  DEFAULT_IMAGE_RESOLUTION,
  INPUT_COST_PER_1M,
  OUTPUT_COST_PER_1M,
  CACHED_COST_PER_1M,
  IMAGE_COST_BY_RESOLUTION,
  VIDEO_COST_PER_SECOND_FAST,
  VIDEO_COST_PER_SECOND_STANDARD,
} from './types';

// Cache service exports
export type { AICacheService, AICacheErrorType } from './aiCache';
export {
  aiCacheService,
  AICacheError,
  generateAICacheKey,
  generateMediaBlobKey,
  getTodayDateString,
} from './aiCache';

// Prompt Builder exports
export type {
  PromptTemplateVariables,
  PromptTemplate,
  PromptBuilder,
} from './promptBuilder';
export {
  promptBuilder,
  formatYearsAgo,
  formatStringArray,
  substituteTemplateVariables,
  CONTEXT_PREFIX_TEMPLATE,
  NARRATIVE_PROMPT_TEMPLATE,
  IMAGE_PROMPT_TEMPLATE,
  VIDEO_PROMPT_TEMPLATE,
} from './promptBuilder';

// Context Prefix Generator exports
export type { ContextPrefixGenerator } from './contextPrefixGenerator';
export {
  contextPrefixGenerator,
  buildBasicLocationContext,
  enrichLocationContext,
  createPromptWithPrefix,
  formatLocationContextForDisplay,
  formatGeologicalLayerForDisplay,
} from './contextPrefixGenerator';

// Text Generator exports
export type { TextGenerator, TextGenerationOptions, TextGeneratorErrorType } from './textGenerator';
export { textGenerator, TextGeneratorError } from './textGenerator';

// Location Context Service exports
export type { LocationContextService, LocationContextOptions, LocationContextErrorType } from './locationContextService';
export {
  locationContextService,
  LocationContextError,
  buildLocationContext,
  buildLocationContextSync,
} from './locationContextService';

// Image Generator exports
export type { ImageGenerator, ImageGeneratorErrorType } from './imageGenerator';
export { imageGenerator, ImageGeneratorError } from './imageGenerator';

// Video Generator exports
export type { VideoGenerator, VideoGeneratorErrorType } from './videoGenerator';
export { videoGenerator, VideoGeneratorError } from './videoGenerator';

// Cache Manager exports
export type { CacheManager, CacheEvent, CacheEventListener } from './cacheManager';
export { cacheManager } from './cacheManager';

// Content Orchestrator exports
export type {
  ContentOrchestrator,
  ContentRetrievalOptions,
  ContentRetrievalResult,
  ContentOrchestratorErrorType,
} from './contentOrchestrator';
export { contentOrchestrator, ContentOrchestratorError } from './contentOrchestrator';

// Error Handling exports
export type { BackoffConfig } from './errorHandling';
export {
  AIError,
  classifyError,
  createAIError,
  DEFAULT_RECOVERY_STRATEGIES,
  getRecoveryStrategy,
  DEFAULT_BACKOFF_CONFIG,
  calculateBackoffDelay,
  sleep,
  withExponentialBackoff,
  handleRateLimit,
  isOnline,
  isOffline,
  onOnlineStatusChange,
  isApiKeyConfigured,
  validateApiKeyFormat,
  logAIError,
} from './errorHandling';

// Fallback Provider exports
export type { FallbackProvider } from './fallbackProvider';
export { fallbackProvider } from './fallbackProvider';

// Persistence Service exports
export type {
  PersistenceService,
  FirestoreSyncMetadata,
  PersistenceResult,
  CacheLoadOptions,
  CacheLoadResult,
  PersistenceErrorType,
} from './persistenceService';
export { persistenceService, PersistenceError } from './persistenceService';

// Firestore Sync Service exports
export type {
  FirestoreSyncService,
  FirestoreContentDocument,
  SyncResult,
  FirestoreLoadOptions,
  FirestoreLoadResult,
  SyncErrorType,
} from './firestoreSyncService';
export {
  firestoreSyncService,
  SyncError,
  isFirebaseConfigured,
  getFirebaseConfig,
} from './firestoreSyncService';

// Cost Tracking Service exports
export type {
  CostTrackingService,
  CostTrackingConfig,
  UsageThreshold,
  ThresholdAlert,
  ApiCallLogEntry,
  CacheHitLogEntry,
} from './costTrackingService';
export {
  costTrackingService,
  calculateTextCost,
  calculateImageCost,
  calculateVideoCost,
  createTokenUsage,
} from './costTrackingService';

// Explicit Cache Service exports
export type {
  ExplicitCacheService,
  ExplicitCacheEntry,
  ExplicitCacheCheckResult,
  ExplicitCacheCreateResult,
  ExplicitCacheErrorType,
} from './explicitCacheService';
export {
  explicitCacheService,
  ExplicitCacheError,
  EXPLICIT_CACHE_MIN_TOKENS,
  EXPLICIT_CACHE_TTL_SECONDS,
  EXPLICIT_CACHE_TTL_STRING,
} from './explicitCacheService';

// Cache Hit Monitor exports
export type {
  CacheHitMonitor,
  CacheHitEvent,
  CacheHitStats,
  CacheHitMonitorConfig,
} from './cacheHitMonitor';
export {
  cacheHitMonitor,
  calculateCostSaved,
  calculateCacheHitRate,
} from './cacheHitMonitor';
