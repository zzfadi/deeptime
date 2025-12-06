# Requirements Document

## Introduction

This document outlines the requirements for redesigning DeepTime's AI integration to create a more cost-effective, location-aware, and immersive experience. The redesign focuses on leveraging Gemini 2.5 Flash Image for visual content generation and Veo 3.1 for short video clips, while implementing intelligent caching and generation strategies to minimize API costs. The system will generate content once per location per era and persist it efficiently, allowing users to refresh content only when desired.

## Glossary

- **DeepTime Application**: The Progressive Web App that allows users to explore Earth's geological history at their current location
- **Gemini 2.5 Flash**: Google's fast, cost-efficient text generation model
- **Gemini 2.5 Flash Image**: Google's native image generation model optimized for speed
- **Veo 3.1**: Google's state-of-the-art video generation model for creating 8-second videos
- **Geological Layer**: A data structure containing era information, material type, fossil index, and depth range
- **Location Context**: Geographic coordinates and geological data specific to a user's location
- **Content Cache**: Persistent storage for generated AI content (text, images, videos)
- **Generation Strategy**: The logic determining when to generate new content vs. use cached content
- **Context Caching**: Gemini API feature that caches input tokens for reuse at reduced cost
- **Implicit Caching**: Automatic caching enabled on Gemini 2.5 models with no developer action required
- **Explicit Caching**: Manual caching configuration for guaranteed cost savings
- **TTL (Time To Live)**: Duration that cached content remains valid before expiration
- **Media Resolution**: Parameter controlling token allocation for media inputs (LOW, MEDIUM, HIGH, ULTRA_HIGH)

## Requirements

### Requirement 1: Location-Aware Content Generation

**User Story:** As a user, I want AI-generated content that is specific to my geographic location and its geological history, so that I can learn about the prehistoric environment that existed where I am standing.

#### Acceptance Criteria

1. WHEN a user provides or selects a location THEN the system SHALL retrieve geological data specific to that location's coordinates
2. WHEN generating AI content THEN the system SHALL include location-specific geological metadata in the generation prompt
3. WHEN multiple users access the same location THEN the system SHALL reuse cached content for that location
4. WHEN a location has multiple geological layers THEN the system SHALL generate unique content for each era at that location
5. WHERE location data includes material type and fossil index THEN the system SHALL incorporate these details into generated content

### Requirement 2: Cost-Optimized Text Narrative Generation

**User Story:** As a product owner, I want to minimize API costs for text generation while maintaining high-quality narratives, so that the application remains financially sustainable.

#### Acceptance Criteria

1. WHEN generating era narratives THEN the system SHALL use Gemini 2.5 Flash model for balanced cost and quality
2. WHEN generating content for a location-era combination THEN the system SHALL cache the result in IndexedDB with a 30-day TTL
3. WHEN a cached narrative exists and is not expired THEN the system SHALL retrieve it from cache without making an API call
4. WHEN the cache is expired or missing THEN the system SHALL generate new content and update the cache
5. WHERE geological data exceeds 1024 tokens THEN the system SHALL use implicit caching to reduce costs on repeated requests
6. WHEN constructing prompts THEN the system SHALL place large, reusable context at the beginning to maximize implicit cache hits

### Requirement 3: Image Generation for Era Visualization

**User Story:** As a user, I want to see AI-generated images depicting what my location looked like during different geological eras, so that I can visualize the prehistoric environment.

#### Acceptance Criteria

1. WHEN a user views an era detail page THEN the system SHALL generate or retrieve a cached image showing that era's landscape at the user's location
2. WHEN generating images THEN the system SHALL use Gemini 2.5 Flash Image model
3. WHEN constructing image prompts THEN the system SHALL include location-specific flora, fauna, climate, and geological features
4. WHEN an image is generated THEN the system SHALL cache it in IndexedDB with the image data and metadata
5. WHEN a cached image exists for a location-era combination THEN the system SHALL display it without generating a new image
6. WHERE image generation fails THEN the system SHALL display a fallback placeholder image with era-appropriate styling

### Requirement 4: Video Generation for Immersive Experience

**User Story:** As a user, I want to see short AI-generated videos showing prehistoric creatures and environments from my location's geological history, so that I can experience a more immersive time-travel effect.

#### Acceptance Criteria

1. WHEN a user requests a video for an era THEN the system SHALL generate or retrieve a cached 4-6 second video using Veo 3.1 Fast
2. WHEN generating videos THEN the system SHALL use text-to-video generation with location-specific prompts
3. WHEN a video is generated THEN the system SHALL cache it in IndexedDB with video data and metadata
4. WHEN a cached video exists for a location-era combination THEN the system SHALL display it without generating a new video
5. WHERE video generation is requested THEN the system SHALL use Veo 3.1 Fast model for optimal cost-performance balance
6. WHEN video generation fails or is in progress THEN the system SHALL display a loading state with estimated completion time

### Requirement 5: Intelligent Cache Management

**User Story:** As a user, I want the app to remember previously generated content so that I can quickly revisit eras without waiting for regeneration, while also having the option to refresh content when I want something new.

#### Acceptance Criteria

1. WHEN content is generated THEN the system SHALL store it in IndexedDB with a cache key combining location coordinates and era identifier
2. WHEN checking for cached content THEN the system SHALL verify the cache entry has not exceeded its TTL
3. WHEN cache storage exceeds 50MB THEN the system SHALL remove the oldest entries using LRU (Least Recently Used) eviction
4. WHEN a user explicitly requests refresh THEN the system SHALL invalidate the cache for that location-era and generate new content
5. WHERE the device is offline THEN the system SHALL serve all content from cache without attempting API calls

### Requirement 6: User-Controlled Content Refresh

**User Story:** As a user, I want to manually refresh AI-generated content when I want to see different variations, so that I can explore multiple interpretations of the same era.

#### Acceptance Criteria

1. WHEN viewing era content THEN the system SHALL display a refresh button for regenerating content
2. WHEN a user taps the refresh button THEN the system SHALL invalidate cached content for that specific era
3. WHEN regenerating content THEN the system SHALL generate new text, image, and video with varied prompts
4. WHEN refresh is in progress THEN the system SHALL display the old content with a loading indicator overlay
5. WHERE refresh fails THEN the system SHALL retain the existing cached content and display an error message

### Requirement 7: Prompt Engineering for Quality and Cost

**User Story:** As a developer, I want to use prompt engineering best practices to maximize content quality while minimizing token usage, so that we achieve the best cost-performance ratio.

#### Acceptance Criteria

1. WHEN constructing prompts THEN the system SHALL place large, reusable context (geological data, location info) at the beginning
2. WHEN generating multiple pieces of content for the same location THEN the system SHALL reuse common prompt prefixes to benefit from implicit caching
3. WHEN specifying output format THEN the system SHALL use clear, concise instructions to minimize token usage
4. WHEN generating images THEN the system SHALL use MEDIA_RESOLUTION_MEDIUM for optimal quality-cost balance
5. WHERE prompts include examples THEN the system SHALL use 2-3 few-shot examples maximum to avoid overfitting

### Requirement 8: Context Caching for Geological Data

**User Story:** As a product owner, I want to leverage Gemini's context caching feature for frequently accessed geological data, so that we reduce costs on repeated API calls.

#### Acceptance Criteria

1. WHEN geological data for a location exceeds 1024 tokens THEN the system SHALL benefit from implicit caching automatically
2. WHEN making multiple requests for the same location THEN the system SHALL structure prompts to maximize cache hit rate
3. WHEN implicit cache hits occur THEN the system SHALL log cache hit metrics for monitoring
4. WHERE explicit caching would provide cost savings THEN the system SHALL create cached content objects for system instructions and geological data
5. WHEN using explicit caching THEN the system SHALL set TTL to 24 hours for geological context

### Requirement 9: Graceful Degradation and Fallbacks

**User Story:** As a user, I want the app to work even when AI generation fails or is unavailable, so that I can still explore geological history with pre-written content.

#### Acceptance Criteria

1. WHEN AI generation fails THEN the system SHALL fall back to pre-written narratives from the core library
2. WHEN image generation fails THEN the system SHALL display era-appropriate placeholder images
3. WHEN video generation fails THEN the system SHALL hide the video section gracefully
4. WHEN the API key is missing or invalid THEN the system SHALL use fallback content exclusively
5. WHERE rate limits are exceeded THEN the system SHALL queue requests and retry with exponential backoff

### Requirement 10: Content Persistence and Sync

**User Story:** As a user, I want my generated content to persist across sessions and optionally sync across my devices, so that I don't lose my personalized exploration history.

#### Acceptance Criteria

1. WHEN content is generated THEN the system SHALL persist it to IndexedDB immediately
2. WHEN the user returns to the app THEN the system SHALL load cached content from IndexedDB
3. WHERE Firebase is configured THEN the system SHALL optionally sync cached content to Firestore
4. WHEN syncing to Firestore THEN the system SHALL only sync metadata and URLs, not full media files
5. WHEN loading from Firestore THEN the system SHALL download media files to IndexedDB for offline access

### Requirement 11: Cost Monitoring and Budget Controls

**User Story:** As a product owner, I want to monitor API usage and costs in real-time, so that I can ensure we stay within budget and optimize spending.

#### Acceptance Criteria

1. WHEN making API calls THEN the system SHALL log token counts for input, output, and cached tokens
2. WHEN content is served from cache THEN the system SHALL log cache hit events
3. WHEN generating images THEN the system SHALL log image generation costs based on resolution
4. WHEN generating videos THEN the system SHALL log video generation costs based on duration
5. WHERE usage exceeds defined thresholds THEN the system SHALL alert administrators and optionally disable generation

### Requirement 12: Progressive Enhancement for Media

**User Story:** As a user on a slow connection or limited data plan, I want the option to view text-only content without loading images and videos, so that I can conserve bandwidth.

#### Acceptance Criteria

1. WHEN the app loads THEN the system SHALL detect connection speed and data saver preferences
2. WHEN connection is slow or data saver is enabled THEN the system SHALL load text content first
3. WHEN text content is displayed THEN the system SHALL show placeholders for images and videos with "Load" buttons
4. WHEN a user taps "Load" THEN the system SHALL fetch and display the specific media item
5. WHERE media is already cached THEN the system SHALL display it immediately regardless of connection speed
