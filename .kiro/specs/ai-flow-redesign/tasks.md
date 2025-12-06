# Implementation Plan

- [x] 1. Set up core infrastructure and types
  - Create new type definitions for AI-generated content
  - Set up IndexedDB schema for enhanced caching
  - Configure cost tracking infrastructure
  - _Requirements: 2.1, 5.1, 11.1_

- [x] 1.1 Create enhanced type definitions
  - Define `EnhancedNarrative`, `GeneratedImage`, `GeneratedVideo` types
  - Define `LocationContext`, `TokenUsage`, `GenerationMetadata` types
  - Define `CacheEntry` and `CacheMetadata` types
  - _Requirements: 2.1, 5.1_

- [x] 1.2 Extend IndexedDB schema
  - Add `eraContent` object store with indexes
  - Add `mediaBlobs` object store for images/videos
  - Add `costTracking` object store for monitoring
  - Implement migration from existing schema
  - _Requirements: 5.1, 11.1_

- [ ]* 1.3 Write property test for cache key generation
  - **Property 18: Cache key format**
  - **Validates: Requirements 5.1**

- [x] 2. Implement Prompt Builder service
  - Create prompt template system
  - Implement context prefix generation for implicit caching
  - Build narrative, image, and video prompt builders
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [x] 2.1 Create prompt template library
  - Define narrative prompt template with context prefix
  - Define image prompt template
  - Define video prompt template
  - Implement template variable substitution
  - _Requirements: 7.1, 7.2_

- [x] 2.2 Implement context prefix generator
  - Extract location and geological data
  - Format as reusable prefix (first 1024 tokens)
  - Ensure consistency across prompts for same location
  - _Requirements: 7.1, 7.2, 8.2_

- [ ]* 2.3 Write property test for prompt structure
  - **Property 25: Context at prompt beginning**
  - **Property 26: Prompt prefix consistency**
  - **Validates: Requirements 7.1, 7.2, 8.2**

- [ ]* 2.4 Write property test for token efficiency
  - **Property 27: Token efficiency**
  - **Property 28: Few-shot example limit**
  - **Validates: Requirements 7.3, 7.5**

- [x] 3. Implement Text Generator service
  - Create text generation service using Gemini 2.5 Flash
  - Implement token counting and cost calculation
  - Add implicit caching support
  - Integrate with Prompt Builder
  - _Requirements: 2.1, 2.5, 2.6, 8.1, 8.2_

- [x] 3.1 Create TextGenerator class
  - Implement `generateNarrative()` method
  - Use Gemini 2.5 Flash model
  - Parse and validate JSON responses
  - Calculate token usage and costs
  - _Requirements: 2.1_

- [x] 3.2 Add location context enrichment
  - Fetch place name from coordinates
  - Identify geological features
  - Find nearby landmarks
  - Build `LocationContext` object
  - _Requirements: 1.2_

- [ ]* 3.3 Write property test for geological metadata in prompts
  - **Property 2: Geological metadata in prompts**
  - **Validates: Requirements 1.2**

- [ ]* 3.4 Write property test for geological details in content
  - **Property 5: Geological details in content**
  - **Validates: Requirements 1.5**

- [ ]* 3.5 Write property test for token count logging
  - **Property 39: Token count logging**
  - **Validates: Requirements 11.1**

- [x] 4. Implement Image Generator service
  - Create image generation service using Gemini 2.5 Flash Image
  - Implement MEDIUM resolution configuration
  - Add blob storage and retrieval
  - Integrate with Prompt Builder
  - _Requirements: 3.1, 3.2, 3.3, 7.4_

- [x] 4.1 Create ImageGenerator class
  - Implement `generateImage()` method
  - Use Gemini 2.5 Flash Image model
  - Set MEDIA_RESOLUTION_MEDIUM
  - Handle blob conversion and storage
  - _Requirements: 3.2, 7.4_

- [x] 4.2 Implement image prompt construction
  - Include flora, fauna, climate from narrative
  - Add geological features and location details
  - Format for photorealistic style
  - _Requirements: 3.3_

- [ ] 4.3 Write property test for image prompt completeness
  - **Property 11: Image prompt completeness**
  - **Validates: Requirements 3.3**

- [ ]* 4.4 Write property test for image cost logging
  - **Property 41: Image cost logging**
  - **Validates: Requirements 11.3**

- [x] 5. Implement Video Generator service
  - Create video generation service using Veo 3.1 Fast
  - Implement async operation handling with polling
  - Add duration validation (4-6 seconds)
  - Integrate with Prompt Builder
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 5.1 Create VideoGenerator class
  - Implement `generateVideo()` method
  - Use Veo 3.1 Fast model
  - Return `VideoOperation` handle
  - Implement `pollVideoStatus()` for async completion
  - _Requirements: 4.1, 4.5_

- [x] 5.2 Implement video prompt construction
  - Include location name and era details
  - Add narrative elements (flora, fauna, climate)
  - Format for cinematic style
  - _Requirements: 4.2_

- [x] 5.3 Write property test for video duration
  - **Property 14: Video duration range**
  - **Validates: Requirements 4.1**

- [x] 5.4 Write property test for video prompt location-specificity
  - **Property 15: Video prompt location-specificity**
  - **Validates: Requirements 4.2**

- [x] 5.5 Write property test for video cost logging
  - **Property 42: Video cost logging**
  - **Validates: Requirements 11.4**

- [x] 6. Implement Cache Manager service
  - Create enhanced cache manager with TTL support
  - Implement LRU eviction algorithm
  - Add cache validation and invalidation
  - Integrate with IndexedDB
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6.1 Create CacheManager class
  - Implement `getContent()` method
  - Implement `storeContent()` with TTL (30 days)
  - Implement `invalidate()` method
  - Implement `isValid()` TTL checker
  - _Requirements: 5.1, 5.2, 5.4_

- [x] 6.2 Implement LRU eviction
  - Track `lastAccessed` timestamp
  - Monitor total cache size
  - Evict oldest entries when exceeding 50MB
  - Implement `evictOldEntries()` method
  - _Requirements: 5.3_

- [x] 6.3 Add cache statistics
  - Implement `getStats()` method
  - Track hit rate, total size, entry count
  - Log cache hits and misses
  - _Requirements: 11.2_

- [x] 6.4 Write property test for TTL validation
  - **Property 19: TTL validation**
  - **Validates: Requirements 5.2**

- [x] 6.5 Write property test for LRU eviction
  - **Property 20: LRU eviction**
  - **Validates: Requirements 5.3**

- [x] 6.6 Write property test for cache hit logging
  - **Property 40: Cache hit event logging**
  - **Validates: Requirements 11.2**

- [x] 7. Implement Content Orchestrator service
  - Create orchestrator to coordinate all generators
  - Implement cache-first strategy
  - Add parallel generation for text and image
  - Handle async video generation
  - _Requirements: 1.3, 2.2, 2.3, 2.4, 3.1, 3.4, 3.5, 4.1, 4.3, 4.4_

- [x] 7.1 Create ContentOrchestrator class
  - Implement `getContent()` method with cache-first logic
  - Implement `refreshContent()` method
  - Implement `preloadAdjacentEras()` method
  - Coordinate TextGenerator, ImageGenerator, VideoGenerator
  - _Requirements: 1.3, 2.2, 2.3, 2.4_

- [x] 7.2 Implement cache-first retrieval
  - Check cache before generation
  - Validate cache TTL
  - Return cached content if valid
  - Generate and cache if missing/expired
  - _Requirements: 2.2, 2.3, 2.4_

- [x] 7.3 Write property test for cache reuse
  - **Property 3: Cache reuse for same location**
  - **Validates: Requirements 1.3**

- [x] 7.4 Write property test for cache hit avoids API calls
  - **Property 7: Cache hit avoids API calls**
  - **Validates: Requirements 2.3**

- [x] 7.5 Write property test for cache miss triggers generation
  - **Property 8: Cache miss triggers generation**
  - **Validates: Requirements 2.4**

- [x] 7.6 Write property test for unique content per era
  - **Property 4: Unique content per era**
  - **Validates: Requirements 1.4**

- [x] 8. Implement error handling and fallbacks
  - Add error types and recovery strategies
  - Implement exponential backoff for rate limits
  - Create fallback content providers
  - Handle offline scenarios
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 8.1 Create error handling infrastructure
  - Define `AIErrorType` enum
  - Create `ErrorRecoveryStrategy` interface
  - Implement error classification
  - _Requirements: 9.1, 9.4, 9.5_

- [x] 8.2 Implement rate limit handler
  - Detect 429 status codes
  - Implement exponential backoff (1s, 2s, 4s, 8s)
  - Retry up to 3 times
  - Fall back to cached/fallback content after max retries
  - _Requirements: 9.5_

- [x] 8.3 Create fallback content providers
  - Use existing core library narratives
  - Create era-appropriate placeholder images
  - Hide video section gracefully on failure
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 8.4 Implement offline detection
  - Check navigator.onLine status
  - Serve all content from cache when offline
  - Prevent API calls when offline
  - _Requirements: 5.5_

- [x] 8.5 Write property test for fallback on generation failure
  - **Property 32: Fallback on generation failure**
  - **Validates: Requirements 9.1**

- [x] 8.6 Write property test for no API calls without key
  - **Property 33: No API calls without key**
  - **Validates: Requirements 9.4**

- [x] 8.7 Write property test for exponential backoff
  - **Property 34: Exponential backoff on rate limits**
  - **Validates: Requirements 9.5**

- [x] 8.8 Write property test for offline cache-only behavior
  - **Property 22: Offline cache-only behavior**
  - **Validates: Requirements 5.5**

- [x] 9. Implement content persistence and sync
  - Add immediate IndexedDB persistence
  - Implement optional Firestore sync
  - Handle app initialization with cache loading
  - Sync metadata only (not full blobs)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 9.1 Implement immediate persistence
  - Save to IndexedDB immediately after generation
  - Store text, image, and video separately
  - Update cache metadata
  - _Requirements: 10.1_

- [x] 9.2 Add Firestore sync (optional)
  - Check if Firebase is configured
  - Sync metadata and URLs only
  - Exclude image/video Blob data
  - Implement download on Firestore load
  - _Requirements: 10.3, 10.4, 10.5_

- [x] 9.3 Implement cache loading on startup
  - Load cached content from IndexedDB on app init
  - Prioritize cache over API calls
  - Update lastAccessed timestamps
  - _Requirements: 10.2_

- [x] 9.4 Write property test for immediate persistence
  - **Property 35: Immediate persistence**
  - **Validates: Requirements 10.1**

- [x] 9.5 Write property test for cache load on startup
  - **Property 36: Cache load on startup**
  - **Validates: Requirements 10.2**

- [x] 9.6 Write property test for Firestore sync excludes blobs
  - **Property 37: Firestore sync excludes blobs**
  - **Validates: Requirements 10.4**

- [x] 10. Update UI components for new AI flow
  - Update EraDetail page to use ContentOrchestrator
  - Add refresh button with cache invalidation
  - Implement progressive loading (text → image → video)
  - Add loading states for async video generation
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 10.1 Update EraDetail component
  - Replace narrativeService with ContentOrchestrator
  - Display enhanced narrative with location context
  - Show generated image
  - Handle async video loading
  - _Requirements: 3.1, 4.1_

- [x] 10.2 Add refresh functionality
  - Add refresh button to UI
  - Implement cache invalidation on click
  - Show loading overlay during regeneration
  - Display old content while loading
  - Handle refresh errors gracefully
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 10.3 Implement progressive loading
  - Detect connection speed
  - Load text first
  - Show image placeholder with "Load" button
  - Show video placeholder with "Load" button
  - Load media on demand or automatically if cached
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 10.4 Write property test for refresh invalidates cache
  - **Property 23: Refresh invalidates cache**
  - **Validates: Requirements 6.2**

- [x] 10.5 Write property test for refresh produces different content
  - **Property 24: Refresh produces different content**
  - **Validates: Requirements 6.3**

- [x] 10.6 Write property test for text-first loading
  - **Property 44: Text-first loading on slow connections**
  - **Validates: Requirements 12.2**

- [x] 10.7 Write property test for on-demand media loading
  - **Property 45: On-demand media loading**
  - **Validates: Requirements 12.4**

- [x] 10.8 Write property test for cached media loads immediately
  - **Property 46: Cached media loads immediately**
  - **Validates: Requirements 12.5**

- [x] 11. Implement cost monitoring and alerts
  - Add cost tracking to IndexedDB
  - Log all API calls with costs
  - Implement daily cost aggregation
  - Add usage threshold alerts
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 11.1 Create cost tracking service
  - Implement `logApiCall()` method
  - Implement `logCacheHit()` method
  - Store daily cost summaries in IndexedDB
  - _Requirements: 11.1, 11.2_

- [x] 11.2 Add cost calculation utilities
  - Calculate text generation costs (input, output, cached tokens)
  - Calculate image generation costs (by resolution)
  - Calculate video generation costs (by duration)
  - _Requirements: 11.3, 11.4_

- [x] 11.3 Implement usage threshold monitoring
  - Check daily costs against thresholds
  - Log alert events when exceeded
  - Optionally disable generation when over budget
  - _Requirements: 11.5_

- [x] 11.4 Write property test for usage threshold alerts
  - **Property 43: Usage threshold alerts**
  - **Validates: Requirements 11.5**

- [x] 12. Add context caching optimization
  - Implement explicit caching for large geological data
  - Add cache hit rate monitoring
  - Optimize prompt structure for implicit caching
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 12.1 Implement explicit caching
  - Create cached content objects for geological data >4096 tokens
  - Set 24-hour TTL for geological context
  - Reuse cached content across requests
  - _Requirements: 8.4, 8.5_

- [x] 12.2 Add cache hit monitoring
  - Log implicit cache hits from API responses
  - Track cache hit rate
  - Monitor cost savings from caching
  - _Requirements: 8.3_

- [x] 12.3 Write property test for explicit cache creation
  - **Property 31: Explicit cache creation**
  - **Validates: Requirements 8.4**

- [ ]* 12.4 Write property test for cache hit logging
  - **Property 30: Cache hit logging**
  - **Validates: Requirements 8.3**

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. Create cost monitoring dashboard (optional)
  - Build admin dashboard for cost tracking
  - Display daily/monthly cost trends
  - Show cache hit rates
  - Display API usage statistics
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 15. Implement preloading optimization (optional)
  - Preload content for adjacent eras
  - Use idle time for background generation
  - Prioritize based on user navigation patterns
  - _Requirements: Performance optimization_

- [x] 16. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
