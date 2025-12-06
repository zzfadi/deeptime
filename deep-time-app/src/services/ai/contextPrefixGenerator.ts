/**
 * Context Prefix Generator
 * Generates reusable context prefixes for AI prompts to maximize implicit caching
 * Requirements: 7.1, 7.2, 8.2
 * 
 * The context prefix contains location and geological data that remains
 * consistent across multiple requests for the same location-era combination.
 * By placing this at the beginning of all prompts, we benefit from Gemini's
 * implicit caching feature (tokens cached after first 1024 tokens).
 */

import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';
import type { LocationContext } from './types';
import { promptBuilder, formatYearsAgo, formatStringArray } from './promptBuilder';

// ============================================
// Context Prefix Cache
// ============================================

/**
 * In-memory cache for context prefixes
 * Ensures consistency across prompts for the same location-era
 * Property 26: Prompt prefix consistency
 */
const contextPrefixCache = new Map<string, string>();

/**
 * Generates a cache key for context prefix
 */
function generatePrefixCacheKey(location: GeoCoordinate, era: GeologicalLayer): string {
  const lat = location.latitude.toFixed(5);
  const lon = location.longitude.toFixed(5);
  return `prefix_${lat}_${lon}_${era.id}`;
}

// ============================================
// Location Context Builder
// ============================================

/**
 * Builds a LocationContext object from available data
 * This is used when we don't have full location context from geocoding
 */
export function buildBasicLocationContext(
  location: GeoCoordinate,
  layer: GeologicalLayer,
  placeName?: string
): LocationContext {
  // Extract geological features from layer characteristics
  const geologicalFeatures: string[] = [];
  
  // Add material type as a feature
  if (layer.material) {
    geologicalFeatures.push(`${layer.material} formations`);
  }
  
  // Add fossil information if significant
  if (layer.fossilIndex === 'high' || layer.fossilIndex === 'exceptional') {
    geologicalFeatures.push(`rich fossil deposits (${layer.fossilIndex} index)`);
  }
  
  // Add depth information
  if (layer.depthStart !== undefined && layer.depthEnd !== undefined) {
    geologicalFeatures.push(`layer depth ${layer.depthStart}m to ${layer.depthEnd}m`);
  }
  
  // Add color if available
  if (layer.characteristics?.color) {
    geologicalFeatures.push(`${layer.characteristics.color} coloration`);
  }
  
  return {
    coordinates: location,
    placeName: placeName || `Location (${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°)`,
    geologicalFeatures,
    nearbyLandmarks: [],
  };
}

/**
 * Enriches a basic location context with additional details
 * This can be extended to fetch data from geocoding services
 */
export function enrichLocationContext(
  basicContext: LocationContext,
  additionalFeatures?: string[],
  landmarks?: string[]
): LocationContext {
  return {
    ...basicContext,
    geologicalFeatures: [
      ...basicContext.geologicalFeatures,
      ...(additionalFeatures || []),
    ],
    nearbyLandmarks: [
      ...basicContext.nearbyLandmarks,
      ...(landmarks || []),
    ],
  };
}

// ============================================
// Context Prefix Generator Interface
// ============================================

export interface ContextPrefixGenerator {
  /**
   * Generate a context prefix for a location-era combination
   * The prefix is cached to ensure consistency across prompts
   * 
   * Requirement 7.1: Place large, reusable context at the beginning
   * Requirement 7.2: Reuse common prompt prefixes
   * Requirement 8.2: Structure prompts to maximize cache hit rate
   */
  generatePrefix(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): string;
  
  /**
   * Get a cached prefix if available
   */
  getCachedPrefix(location: GeoCoordinate, layer: GeologicalLayer): string | null;
  
  /**
   * Clear the prefix cache
   */
  clearCache(): void;
  
  /**
   * Get the estimated token count for a prefix
   */
  estimateTokenCount(prefix: string): number;
  
  /**
   * Validate that a prefix is within the recommended size
   * (first 1024 tokens for optimal implicit caching)
   */
  validatePrefixSize(prefix: string): { valid: boolean; tokenCount: number; recommendation?: string };
}

// ============================================
// Context Prefix Generator Implementation
// ============================================

/**
 * Estimates token count for a string
 * Uses a simple heuristic: ~4 characters per token for English text
 * This is an approximation; actual token count depends on the tokenizer
 */
function estimateTokens(text: string): number {
  // Average of ~4 characters per token for English text
  // This is a rough estimate; actual tokenization varies
  return Math.ceil(text.length / 4);
}

/**
 * Maximum recommended prefix size in tokens
 * Gemini's implicit caching kicks in after the first 1024 tokens
 */
const MAX_PREFIX_TOKENS = 1024;

/**
 * Target prefix size (leave room for variation)
 */
const TARGET_PREFIX_TOKENS = 800;

export const contextPrefixGenerator: ContextPrefixGenerator = {
  /**
   * Generate a context prefix for a location-era combination
   * Property 25: Context at prompt beginning
   * Property 26: Prompt prefix consistency
   */
  generatePrefix(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): string {
    const cacheKey = generatePrefixCacheKey(location, layer);
    
    // Check cache first for consistency
    const cached = contextPrefixCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Build location context if not provided
    const context = locationContext || buildBasicLocationContext(location, layer);
    
    // Generate the prefix using the prompt builder
    const prefix = promptBuilder.getContextPrefix(location, layer, context);
    
    // Validate and potentially truncate if too long
    const validation = this.validatePrefixSize(prefix);
    let finalPrefix = prefix;
    
    if (!validation.valid) {
      // Truncate to fit within recommended size
      finalPrefix = truncatePrefixToSize(prefix, TARGET_PREFIX_TOKENS);
    }
    
    // Cache the prefix for consistency
    contextPrefixCache.set(cacheKey, finalPrefix);
    
    return finalPrefix;
  },

  /**
   * Get a cached prefix if available
   */
  getCachedPrefix(location: GeoCoordinate, layer: GeologicalLayer): string | null {
    const cacheKey = generatePrefixCacheKey(location, layer);
    return contextPrefixCache.get(cacheKey) || null;
  },

  /**
   * Clear the prefix cache
   */
  clearCache(): void {
    contextPrefixCache.clear();
  },

  /**
   * Get the estimated token count for a prefix
   */
  estimateTokenCount(prefix: string): number {
    return estimateTokens(prefix);
  },

  /**
   * Validate that a prefix is within the recommended size
   */
  validatePrefixSize(prefix: string): { valid: boolean; tokenCount: number; recommendation?: string } {
    const tokenCount = estimateTokens(prefix);
    
    if (tokenCount <= TARGET_PREFIX_TOKENS) {
      return { valid: true, tokenCount };
    }
    
    if (tokenCount <= MAX_PREFIX_TOKENS) {
      return {
        valid: true,
        tokenCount,
        recommendation: `Prefix is ${tokenCount} tokens. Consider reducing to under ${TARGET_PREFIX_TOKENS} for optimal caching.`,
      };
    }
    
    return {
      valid: false,
      tokenCount,
      recommendation: `Prefix exceeds ${MAX_PREFIX_TOKENS} tokens (${tokenCount}). Truncation recommended for implicit caching benefits.`,
    };
  },
};

/**
 * Truncates a prefix to fit within a target token count
 * Preserves the most important information (location and era)
 */
function truncatePrefixToSize(prefix: string, targetTokens: number): string {
  const currentTokens = estimateTokens(prefix);
  
  if (currentTokens <= targetTokens) {
    return prefix;
  }
  
  // Calculate target character count
  const targetChars = targetTokens * 4;
  
  // Find a good truncation point (end of a line)
  const truncated = prefix.substring(0, targetChars);
  const lastNewline = truncated.lastIndexOf('\n');
  
  if (lastNewline > targetChars * 0.8) {
    // Truncate at the last newline if it's not too far back
    return truncated.substring(0, lastNewline + 1);
  }
  
  return truncated + '\n';
}

// ============================================
// Utility Functions for External Use
// ============================================

/**
 * Creates a complete prompt with context prefix
 * Ensures the context prefix is at the beginning for implicit caching
 * 
 * @param location - Geographic coordinates
 * @param layer - Geological layer data
 * @param locationContext - Optional enriched location context
 * @param promptBody - The main prompt content (task-specific)
 * @returns Complete prompt with context prefix
 */
export function createPromptWithPrefix(
  location: GeoCoordinate,
  layer: GeologicalLayer,
  locationContext: LocationContext | undefined,
  promptBody: string
): string {
  const prefix = contextPrefixGenerator.generatePrefix(location, layer, locationContext);
  return prefix + promptBody;
}

/**
 * Formats location context for display or logging
 */
export function formatLocationContextForDisplay(context: LocationContext): string {
  const lines: string[] = [
    `Location: ${context.placeName}`,
    `Coordinates: ${context.coordinates.latitude.toFixed(5)}, ${context.coordinates.longitude.toFixed(5)}`,
  ];
  
  if (context.geologicalFeatures.length > 0) {
    lines.push(`Geological Features: ${formatStringArray(context.geologicalFeatures)}`);
  }
  
  if (context.nearbyLandmarks.length > 0) {
    lines.push(`Nearby Landmarks: ${formatStringArray(context.nearbyLandmarks)}`);
  }
  
  return lines.join('\n');
}

/**
 * Formats geological layer for display or logging
 */
export function formatGeologicalLayerForDisplay(layer: GeologicalLayer): string {
  const lines: string[] = [
    `Era: ${layer.era.name} (${layer.era.period})`,
    `Time: ${formatYearsAgo(layer.era.yearsAgo)} years ago`,
    `Material: ${layer.material}`,
    `Fossil Index: ${layer.fossilIndex}`,
  ];
  
  if (layer.depthStart !== undefined && layer.depthEnd !== undefined) {
    lines.push(`Depth: ${layer.depthStart}m to ${layer.depthEnd}m`);
  }
  
  if (layer.characteristics?.color) {
    lines.push(`Color: ${layer.characteristics.color}`);
  }
  
  return lines.join('\n');
}

export default contextPrefixGenerator;
