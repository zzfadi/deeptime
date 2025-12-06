/**
 * Fallback Content Provider Service
 * Provides fallback content when AI generation fails
 * Requirements: 9.1, 9.2, 9.3
 * 
 * Key Features:
 * - Uses existing core library narratives as fallback
 * - Creates era-appropriate placeholder images
 * - Gracefully hides video section on failure
 */

import type { GeologicalLayer } from '../../../../src/types';
import type {
  EnhancedNarrative,
  GeneratedImage,
  GeneratedVideo,
  EraContent,
  CacheMetadata,
  LocationContext,
} from './types';
import { CACHE_TTL_MS } from './types';
import { generateNarrative as generateCoreNarrative } from '../../../../src/narrative';

// ============================================
// Types
// ============================================

/**
 * Fallback content provider interface
 */
export interface FallbackProvider {
  /**
   * Get fallback narrative when AI generation fails
   * Requirement 9.1: Fall back to pre-written narratives from core library
   */
  getNarrativeFallback(
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): EnhancedNarrative;

  /**
   * Get fallback placeholder image when generation fails
   * Requirement 9.2: Display era-appropriate placeholder images
   */
  getImageFallback(layer: GeologicalLayer): GeneratedImage;

  /**
   * Get fallback for video (returns null - hide video section)
   * Requirement 9.3: Hide video section gracefully on failure
   */
  getVideoFallback(): GeneratedVideo | null;

  /**
   * Get complete fallback content for a location-era
   */
  getCompleteFallback(
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): EraContent;
}

// ============================================
// Era Color Mapping
// ============================================

/**
 * Gets era-appropriate placeholder color based on era name
 */
function getEraPlaceholderColor(eraName: string): string {
  const colors: Record<string, string> = {
    Holocene: '#4a7c59',      // Forest green
    Pleistocene: '#87ceeb',   // Ice blue
    Pliocene: '#c2b280',      // Sandy beige
    Miocene: '#228b22',       // Forest green
    Oligocene: '#2e8b57',     // Sea green
    Eocene: '#006400',        // Dark green (jungle)
    Paleocene: '#228b22',     // Forest green
    Cretaceous: '#556b2f',    // Dark olive green
    Jurassic: '#6b8e23',      // Olive drab
    Triassic: '#cd853f',      // Peru (desert)
    Permian: '#d2691e',       // Chocolate (arid)
    Carboniferous: '#013220', // Dark green (swamp)
    Devonian: '#4682b4',      // Steel blue (ocean)
    Silurian: '#5f9ea0',      // Cadet blue
    Ordovician: '#20b2aa',    // Light sea green
    Cambrian: '#008b8b',      // Dark cyan
    Precambrian: '#8b0000',   // Dark red (volcanic)
  };
  
  return colors[eraName] || '#808080';
}

/**
 * Gets era-appropriate description for placeholder
 */
function getEraDescription(eraName: string): string {
  const descriptions: Record<string, string> = {
    Holocene: 'Modern era with diverse ecosystems',
    Pleistocene: 'Ice age with megafauna',
    Pliocene: 'Cooling climate, grasslands expand',
    Miocene: 'Forests and early apes',
    Oligocene: 'Temperate forests dominate',
    Eocene: 'Tropical conditions worldwide',
    Paleocene: 'Recovery after mass extinction',
    Cretaceous: 'Age of dinosaurs, flowering plants',
    Jurassic: 'Giant dinosaurs, lush vegetation',
    Triassic: 'First dinosaurs appear',
    Permian: 'Supercontinent Pangaea forms',
    Carboniferous: 'Vast swamp forests',
    Devonian: 'Age of fishes',
    Silurian: 'First land plants',
    Ordovician: 'Marine life diversifies',
    Cambrian: 'Explosion of complex life',
    Precambrian: 'Early single-celled life',
  };
  
  return descriptions[eraName] || 'Ancient geological era';
}

// ============================================
// Placeholder Image Generation
// ============================================

/**
 * Creates a placeholder SVG image for fallback
 * Requirement 9.2: Era-appropriate placeholder images
 */
function createPlaceholderSvg(eraName: string, width: number, height: number): string {
  const color = getEraPlaceholderColor(eraName);
  const description = getEraDescription(eraName);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
        <stop offset="50%" style="stop-color:${color};stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#skyGradient)"/>
    <circle cx="${width * 0.8}" cy="${height * 0.2}" r="40" fill="#fff" opacity="0.1" filter="url(#glow)"/>
    <text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" 
          font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="600" fill="white" opacity="0.9">
      ${eraName} Era
    </text>
    <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" 
          font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="white" opacity="0.7">
      ${description}
    </text>
    <text x="50%" y="70%" dominant-baseline="middle" text-anchor="middle" 
          font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="white" opacity="0.5">
      AI image generation unavailable
    </text>
  </svg>`;
}

// ============================================
// Fallback Provider Implementation
// ============================================

/**
 * Default location context for fallback content
 */
const DEFAULT_LOCATION_CONTEXT: LocationContext = {
  coordinates: { latitude: 0, longitude: 0, altitude: 0, accuracy: 0 },
  placeName: 'Unknown Location',
  geologicalFeatures: [],
  nearbyLandmarks: [],
};

/**
 * Creates cache metadata for fallback content
 */
function createFallbackCacheMetadata(layer: GeologicalLayer): CacheMetadata {
  const now = new Date();
  return {
    cacheKey: `fallback_${layer.id}`,
    cachedAt: now,
    expiresAt: new Date(now.getTime() + CACHE_TTL_MS),
    lastAccessed: now,
    size: 0,
    version: 1,
  };
}

export const fallbackProvider: FallbackProvider = {
  /**
   * Get fallback narrative when AI generation fails
   * Requirement 9.1: Fall back to pre-written narratives from core library
   * Property 32: Fallback on generation failure
   */
  getNarrativeFallback(
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): EnhancedNarrative {
    // Use the core library's narrative generation as fallback
    const baseNarrative = generateCoreNarrative(layer);
    
    // Build location context
    const context = locationContext || DEFAULT_LOCATION_CONTEXT;
    
    // Enhance with location context and metadata
    const enhancedNarrative: EnhancedNarrative = {
      ...baseNarrative,
      locationContext: context,
      generatedAt: new Date(),
      modelUsed: 'fallback',
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalCost: 0,
      },
    };
    
    return enhancedNarrative;
  },

  /**
   * Get fallback placeholder image when generation fails
   * Requirement 9.2: Display era-appropriate placeholder images
   */
  getImageFallback(layer: GeologicalLayer): GeneratedImage {
    const width = 1920;
    const height = 1080;
    
    // Create SVG placeholder
    const svgContent = createPlaceholderSvg(layer.era.name, width, height);
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
    
    return {
      id: `fallback_img_${layer.id}`,
      imageData: svgBlob,
      mimeType: 'image/svg+xml',
      width,
      height,
      prompt: `Fallback placeholder for ${layer.era.name}`,
      generatedAt: new Date(),
      modelUsed: 'fallback',
      resolution: 'MEDIUM',
      cost: 0,
    };
  },

  /**
   * Get fallback for video (returns null - hide video section)
   * Requirement 9.3: Hide video section gracefully on failure
   */
  getVideoFallback(): GeneratedVideo | null {
    // No video fallback - hide video section gracefully
    return null;
  },

  /**
   * Get complete fallback content for a location-era
   */
  getCompleteFallback(
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): EraContent {
    return {
      narrative: this.getNarrativeFallback(layer, locationContext),
      image: this.getImageFallback(layer),
      video: this.getVideoFallback(),
      cacheMetadata: createFallbackCacheMetadata(layer),
    };
  },
};

export default fallbackProvider;
