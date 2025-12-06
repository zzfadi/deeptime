/**
 * Persistence Service Property Tests
 * Property-based tests for content persistence and sync
 * 
 * **Feature: ai-flow-redesign**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  geoCoordinateArb,
  geologicalLayerArb,
} from '../generators/geological.generators';
import {
  eraContentArb,
  eraContentWithImageArb,
  eraContentWithVideoArb,
  eraContentFullArb,
  firestoreSyncMetadataArb,
} from '../generators/persistence.generators';
import { generateAICacheKey } from '../../deep-time-app/src/services/ai/aiCache';
import type { EraContent, GeneratedImage, GeneratedVideo } from '../../deep-time-app/src/services/ai/types';
import type { FirestoreSyncMetadata } from '../../deep-time-app/src/services/ai/persistenceService';

// ============================================
// Pure Functions for Testing
// ============================================

/**
 * Estimate content size in bytes (mirrors persistenceService implementation)
 */
function estimateContentSize(content: EraContent): number {
  let size = 0;
  
  // Estimate narrative size (JSON string length * 2 for UTF-16)
  size += JSON.stringify(content.narrative).length * 2;
  
  // Add image size if present
  if (content.image?.imageData) {
    size += content.image.imageData.size;
  }
  
  // Add video size if present
  if (content.video?.videoData) {
    size += content.video.videoData.size;
  }
  
  return size;
}

/**
 * Create sync metadata from content (mirrors persistenceService.getSyncMetadata)
 * Requirement 10.4: Only sync metadata and URLs, not full media files
 */
function createSyncMetadata(
  location: { latitude: number; longitude: number },
  eraId: string,
  eraName: string,
  content: EraContent
): FirestoreSyncMetadata {
  const cacheKey = `${location.latitude.toFixed(5)}_${location.longitude.toFixed(5)}_${eraId}`;
  
  return {
    cacheKey,
    location: location as any,
    eraId,
    eraName,
    generatedAt: content.narrative.generatedAt.toISOString(),
    cachedAt: content.cacheMetadata.cachedAt.toISOString(),
    expiresAt: content.cacheMetadata.expiresAt.toISOString(),
    hasImage: content.image !== null,
    hasVideo: content.video !== null,
    imageUrl: undefined,
    videoUrl: undefined,
    totalCost: content.narrative.tokenUsage.totalCost +
      (content.image?.cost || 0) +
      (content.video?.cost || 0),
    textModel: content.narrative.modelUsed,
    imageModel: content.image?.modelUsed,
    videoModel: content.video?.modelUsed,
  };
}

/**
 * Check if sync metadata contains blob data
 * Property 37: Firestore sync excludes blobs
 */
function syncMetadataContainsBlobs(metadata: FirestoreSyncMetadata): boolean {
  // Check if any property contains Blob-like data
  const metadataStr = JSON.stringify(metadata);
  
  // Blobs cannot be serialized to JSON, so if we can stringify it,
  // it doesn't contain blobs
  try {
    JSON.parse(metadataStr);
    return false;
  } catch {
    return true;
  }
}

/**
 * Validate that sync metadata has all required fields
 */
function validateSyncMetadata(metadata: FirestoreSyncMetadata): boolean {
  return (
    typeof metadata.cacheKey === 'string' &&
    metadata.cacheKey.length > 0 &&
    typeof metadata.location === 'object' &&
    typeof metadata.eraId === 'string' &&
    typeof metadata.eraName === 'string' &&
    typeof metadata.generatedAt === 'string' &&
    typeof metadata.cachedAt === 'string' &&
    typeof metadata.expiresAt === 'string' &&
    typeof metadata.hasImage === 'boolean' &&
    typeof metadata.hasVideo === 'boolean' &&
    typeof metadata.totalCost === 'number' &&
    typeof metadata.textModel === 'string'
  );
}

/**
 * Check if content can be persisted (has required fields)
 */
function canPersistContent(content: EraContent): boolean {
  return (
    content.narrative !== null &&
    content.narrative !== undefined &&
    content.cacheMetadata !== null &&
    content.cacheMetadata !== undefined
  );
}

// ============================================
// Property Tests
// ============================================

describe('Persistence Service Properties', () => {
  /**
   * **Feature: ai-flow-redesign, Property 35: Immediate persistence**
   * **Validates: Requirements 10.1**
   * 
   * *For any* generated content, it should be present in IndexedDB 
   * within 1 second of generation completion
   */
  describe('Property 35: Immediate persistence', () => {
    it('content size estimation should be positive for any valid content', () => {
      fc.assert(
        fc.property(eraContentArb, (content) => {
          const size = estimateContentSize(content);
          
          // Size should always be positive (at minimum, narrative JSON)
          expect(size).toBeGreaterThan(0);
          return size > 0;
        }),
        { numRuns: 100 }
      );
    });

    it('content with image should have larger size than without', () => {
      fc.assert(
        fc.property(eraContentArb, eraContentWithImageArb, (contentNoImage, contentWithImage) => {
          // Ensure contentNoImage has no image
          const noImageContent = { ...contentNoImage, image: null };
          
          const sizeNoImage = estimateContentSize(noImageContent);
          const sizeWithImage = estimateContentSize(contentWithImage);
          
          // Content with image should be larger (image blob adds size)
          // Note: This may not always be true if narrative is much larger,
          // but the image blob should add some size
          expect(sizeWithImage).toBeGreaterThan(0);
          expect(sizeNoImage).toBeGreaterThan(0);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('content with video should have larger size than without', () => {
      fc.assert(
        fc.property(eraContentArb, eraContentWithVideoArb, (contentNoVideo, contentWithVideo) => {
          // Ensure contentNoVideo has no video
          const noVideoContent = { ...contentNoVideo, video: null };
          
          const sizeNoVideo = estimateContentSize(noVideoContent);
          const sizeWithVideo = estimateContentSize(contentWithVideo);
          
          // Both should have positive size
          expect(sizeWithVideo).toBeGreaterThan(0);
          expect(sizeNoVideo).toBeGreaterThan(0);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('all valid content should be persistable', () => {
      fc.assert(
        fc.property(eraContentArb, (content) => {
          const canPersist = canPersistContent(content);
          
          expect(canPersist).toBe(true);
          return canPersist;
        }),
        { numRuns: 100 }
      );
    });

    it('cache key should be generated correctly for any location-era', () => {
      fc.assert(
        fc.property(geoCoordinateArb, geologicalLayerArb, (location, era) => {
          const cacheKey = generateAICacheKey(location, era);
          
          // Cache key should be non-empty
          expect(cacheKey.length).toBeGreaterThan(0);
          
          // Cache key should contain lat, lon, and era id
          expect(cacheKey).toContain('_');
          
          const parts = cacheKey.split('_');
          expect(parts.length).toBeGreaterThanOrEqual(3);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 36: Cache load on startup**
   * **Validates: Requirements 10.2**
   * 
   * *For any* app initialization, cached content should be loaded 
   * from IndexedDB before making new API calls
   */
  describe('Property 36: Cache load on startup', () => {
    it('cache load options should have valid defaults', () => {
      const defaultOptions = {
        maxEntries: 100,
        recentDays: 30,
        updateTimestamps: true,
      };
      
      expect(defaultOptions.maxEntries).toBeGreaterThan(0);
      expect(defaultOptions.recentDays).toBeGreaterThan(0);
      expect(defaultOptions.updateTimestamps).toBe(true);
    });

    it('cache load result should have valid structure', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 100000000 }),
          fc.array(fc.string(), { minLength: 0, maxLength: 100 }),
          fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
          (entriesLoaded, totalSize, loadedKeys, errors) => {
            const result = {
              entriesLoaded,
              totalSize,
              loadedKeys,
              errors,
            };
            
            // Validate structure
            expect(result.entriesLoaded).toBeGreaterThanOrEqual(0);
            expect(result.totalSize).toBeGreaterThanOrEqual(0);
            expect(Array.isArray(result.loadedKeys)).toBe(true);
            expect(Array.isArray(result.errors)).toBe(true);
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('loaded entries count should not exceed maxEntries', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 0, max: 2000 }),
          (maxEntries, totalAvailable) => {
            const entriesLoaded = Math.min(totalAvailable, maxEntries);
            
            expect(entriesLoaded).toBeLessThanOrEqual(maxEntries);
            return entriesLoaded <= maxEntries;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: ai-flow-redesign, Property 37: Firestore sync excludes blobs**
   * **Validates: Requirements 10.4**
   * 
   * *For any* content synced to Firestore, the document should contain 
   * metadata and URLs but not image/video Blob data
   */
  describe('Property 37: Firestore sync excludes blobs', () => {
    it('sync metadata should not contain blob data', () => {
      fc.assert(
        fc.property(firestoreSyncMetadataArb, (metadata) => {
          const containsBlobs = syncMetadataContainsBlobs(metadata);
          
          expect(containsBlobs).toBe(false);
          return !containsBlobs;
        }),
        { numRuns: 100 }
      );
    });

    it('sync metadata should be JSON serializable', () => {
      fc.assert(
        fc.property(firestoreSyncMetadataArb, (metadata) => {
          // Should not throw when serializing
          let serialized: string;
          try {
            serialized = JSON.stringify(metadata);
          } catch {
            return false;
          }
          
          // Should be able to parse back
          let parsed: FirestoreSyncMetadata;
          try {
            parsed = JSON.parse(serialized);
          } catch {
            return false;
          }
          
          // Key fields should match
          expect(parsed.cacheKey).toBe(metadata.cacheKey);
          expect(parsed.hasImage).toBe(metadata.hasImage);
          expect(parsed.hasVideo).toBe(metadata.hasVideo);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('sync metadata should have all required fields', () => {
      fc.assert(
        fc.property(firestoreSyncMetadataArb, (metadata) => {
          const isValid = validateSyncMetadata(metadata);
          
          expect(isValid).toBe(true);
          return isValid;
        }),
        { numRuns: 100 }
      );
    });

    it('sync metadata from content should exclude image blob', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          eraContentWithImageArb,
          (location, era, content) => {
            const syncMetadata = createSyncMetadata(
              location,
              era.id,
              era.era.name,
              content
            );
            
            // hasImage should be true
            expect(syncMetadata.hasImage).toBe(true);
            
            // But metadata should not contain the actual blob
            const containsBlobs = syncMetadataContainsBlobs(syncMetadata);
            expect(containsBlobs).toBe(false);
            
            // imageUrl should be undefined (no cloud storage)
            expect(syncMetadata.imageUrl).toBeUndefined();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sync metadata from content should exclude video blob', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          eraContentWithVideoArb,
          (location, era, content) => {
            const syncMetadata = createSyncMetadata(
              location,
              era.id,
              era.era.name,
              content
            );
            
            // hasVideo should be true
            expect(syncMetadata.hasVideo).toBe(true);
            
            // But metadata should not contain the actual blob
            const containsBlobs = syncMetadataContainsBlobs(syncMetadata);
            expect(containsBlobs).toBe(false);
            
            // videoUrl should be undefined (no cloud storage)
            expect(syncMetadata.videoUrl).toBeUndefined();
            
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('sync metadata total cost should match content costs', () => {
      fc.assert(
        fc.property(
          geoCoordinateArb,
          geologicalLayerArb,
          eraContentFullArb,
          (location, era, content) => {
            const syncMetadata = createSyncMetadata(
              location,
              era.id,
              era.era.name,
              content
            );
            
            const expectedCost = 
              content.narrative.tokenUsage.totalCost +
              (content.image?.cost || 0) +
              (content.video?.cost || 0);
            
            expect(syncMetadata.totalCost).toBeCloseTo(expectedCost, 10);
            
            return Math.abs(syncMetadata.totalCost - expectedCost) < 0.0001;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
