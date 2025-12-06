/**
 * Image Generator Service
 * Generates era visualization images using Gemini 2.5 Flash Image
 * Requirements: 3.1, 3.2, 3.3, 7.4
 * 
 * Key Features:
 * - Uses Gemini 2.5 Flash Image for native image generation
 * - Implements MEDIUM resolution configuration for optimal quality-cost balance
 * - Handles blob conversion and storage to IndexedDB
 * - Integrates with Prompt Builder for location-specific prompts
 */

import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';
import type {
  GeneratedImage,
  ImageGenerationOptions,
  MediaResolution,
  EnhancedNarrative,
} from './types';
import {
  DEFAULT_IMAGE_RESOLUTION,
  IMAGE_COST_BY_RESOLUTION,
} from './types';
import { promptBuilder } from './promptBuilder';
import { aiCacheService } from './aiCache';
import { getActiveApiKey } from '../../components/ApiKeyModal';

// ============================================
// Constants
// ============================================

/**
 * Import model from centralized config
 * Design Reference: .kiro/specs/ai-flow-redesign/design.md
 */
import { MODEL_USE_CASES } from '../../config/aiModels';

/**
 * Image model from centralized config
 * Uses Gemini 2.5 Flash Image for native image generation
 * Pricing: $0.039 per image (Standard)
 */
const IMAGE_MODEL = MODEL_USE_CASES.ERA_IMAGE;

/**
 * Default image generation configuration
 * Using landscape (16:9) for optimal display on mobile devices
 */
const DEFAULT_IMAGE_CONFIG = {
  resolution: DEFAULT_IMAGE_RESOLUTION as MediaResolution,
  aspectRatio: '16:9' as const,
  style: 'photorealistic' as const,
};

// ============================================
// Types
// ============================================

/**
 * Error types specific to image generation
 */
export type ImageGeneratorErrorType =
  | 'api_error'
  | 'parse_error'
  | 'rate_limit'
  | 'invalid_response'
  | 'invalid_key'
  | 'network_error'
  | 'no_image_generated';

/**
 * Custom error class for image generation errors
 */
export class ImageGeneratorError extends Error {
  constructor(
    public readonly type: ImageGeneratorErrorType,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ImageGeneratorError';
  }
}

// ============================================
// Image Generator Interface
// ============================================

export interface ImageGenerator {
  /**
   * Generate image for a location-era combination
   * Uses Gemini 2.5 Flash Image with MEDIUM resolution
   * 
   * Requirement 3.1: Generate or retrieve cached image
   * Requirement 3.2: Use Gemini 2.5 Flash Image model
   * Requirement 7.4: Use MEDIA_RESOLUTION_MEDIUM
   */
  generateImage(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    narrative: EnhancedNarrative,
    options?: ImageGenerationOptions
  ): Promise<GeneratedImage>;

  /**
   * Get fallback placeholder image when generation fails
   * Requirement 9.2: Display era-appropriate placeholder images
   */
  getFallbackImage(
    layer: GeologicalLayer
  ): GeneratedImage;

  /**
   * Calculate image generation cost based on resolution
   * Requirement 11.3: Log image generation costs based on resolution
   */
  calculateCost(resolution: MediaResolution): number;

  /**
   * Check if the API key is configured and valid
   */
  isConfigured(): boolean;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the current API key (runtime or env)
 */
function getGeminiApiKey(): string {
  const runtimeKey = getActiveApiKey();
  if (runtimeKey) return runtimeKey;
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Gemini API base URL for direct REST calls
 * Using REST API instead of SDK for better control over responseModalities
 */
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Check if API key is configured
 */
function isApiKeyConfigured(): boolean {
  const apiKey = getGeminiApiKey();
  return !!apiKey && apiKey.length > 0;
}

/**
 * Generates a unique ID for the image
 */
function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Converts base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

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
 * Creates a placeholder SVG image for fallback
 */
function createPlaceholderSvg(eraName: string, width: number, height: number): string {
  const color = getEraPlaceholderColor(eraName);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
        <stop offset="50%" style="stop-color:${color};stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#skyGradient)"/>
    <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" 
          font-family="system-ui, sans-serif" font-size="24" fill="white" opacity="0.8">
      ${eraName} Era
    </text>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
          font-family="system-ui, sans-serif" font-size="14" fill="white" opacity="0.6">
      Image generation unavailable
    </text>
  </svg>`;
}

// ============================================
// Image Generator Implementation
// ============================================

export const imageGenerator: ImageGenerator = {
  /**
   * Generate image for a location-era combination
   * Property 10: Image generation or retrieval
   * Property 11: Image prompt completeness
   * Property 12: Image caching
   * Property 41: Image cost logging
   */
  async generateImage(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    narrative: EnhancedNarrative,
    options?: ImageGenerationOptions
  ): Promise<GeneratedImage> {
    const apiKey = getGeminiApiKey();

    // Merge options with defaults
    const config = {
      ...DEFAULT_IMAGE_CONFIG,
      ...options,
    };

    // If no API key, use fallback immediately
    // Property 33: No API calls without key
    if (!isApiKeyConfigured()) {
      console.warn('No API key configured, using fallback image');
      return this.getFallbackImage(layer);
    }

    const startTime = Date.now();

    try {
      // Build the image prompt using Prompt Builder
      // Requirement 3.3: Include location-specific flora, fauna, climate, geological features
      // Property 11: Image prompt completeness
      const basePrompt = promptBuilder.buildImagePrompt(location, layer, narrative);

      // Build the final prompt for image generation
      const prompt = `Generate a photorealistic landscape image showing: ${basePrompt}
      
Style: Photorealistic nature photography, cinematic lighting, high detail.
Aspect ratio: ${config.aspectRatio} (landscape orientation).
Do not include any text, labels, or watermarks in the image.`;

      console.log(`[ImageGenerator] Generating image for ${layer.era.name} at ${narrative.locationContext.placeName}`);

      // Build request body - Direct REST API call matching the working tester
      const requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT']
        }
      };

      // Make direct REST API call
      const response = await fetch(
        `${GEMINI_API_BASE_URL}/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.error?.message || `HTTP ${response.status}`;
        console.error('[ImageGenerator] API Error:', errorMessage);

        if (response.status === 429) {
          throw new ImageGeneratorError(
            'rate_limit',
            'Rate limit exceeded. Please try again later.'
          );
        }

        throw new ImageGeneratorError(
          'api_error',
          `Image generation failed: ${errorMessage}`
        );
      }

      // Extract image from response - same structure as REST API
      let imageData: Blob | null = null;
      let mimeType = 'image/png';

      const candidates = responseData.candidates;
      if (candidates && candidates.length > 0) {
        const parts = candidates[0].content?.parts || [];
        for (const part of parts) {
          if (part.inlineData) {
            const { data, mimeType: partMimeType } = part.inlineData;
            if (data && partMimeType?.startsWith('image/')) {
              imageData = base64ToBlob(data, partMimeType);
              mimeType = partMimeType;
              break;
            }
          }
        }
      }

      // If no image in response, check for text response
      if (!imageData) {
        const textPart = candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p.text);
        if (textPart) {
          console.warn('[ImageGenerator] Model returned text instead of image:', textPart.text?.substring(0, 200));
        }

        throw new ImageGeneratorError(
          'no_image_generated',
          'No image was generated in the response. The model may not support image generation for this prompt.'
        );
      }

      // Calculate cost
      // Requirement 11.3: Log image generation costs based on resolution
      const cost = this.calculateCost(config.resolution);

      // Generate unique ID
      const imageId = generateImageId();

      // Create the generated image object
      const generatedImage: GeneratedImage = {
        id: imageId,
        imageData,
        mimeType,
        width: config.aspectRatio === '16:9' ? 1920 : config.aspectRatio === '4:3' ? 1600 : 1024,
        height: config.aspectRatio === '16:9' ? 1080 : config.aspectRatio === '4:3' ? 1200 : 1024,
        prompt,
        generatedAt: new Date(),
        modelUsed: IMAGE_MODEL,
        resolution: config.resolution,
        cost,
      };

      // Store the image blob in cache
      // Requirement 3.4: Cache image in IndexedDB
      // Property 12: Image caching
      try {
        await aiCacheService.storeMediaBlob(imageId, 'image', imageData);
        console.log(`[ImageGenerator] Image cached with ID: ${imageId}`);
      } catch (cacheError) {
        console.warn('[ImageGenerator] Failed to cache image:', cacheError);
        // Continue even if caching fails
      }

      // Log cost
      // Property 41: Image cost logging
      try {
        await aiCacheService.logApiCost(0, cost, 0);
      } catch (costError) {
        console.warn('[ImageGenerator] Failed to log cost:', costError);
      }

      const duration = Date.now() - startTime;
      console.log(`[ImageGenerator] Image generated in ${duration}ms, cost: $${cost.toFixed(4)}`);

      return generatedImage;
    } catch (error) {
      console.error('[ImageGenerator] Generation failed:', error);

      // Re-throw ImageGeneratorError
      if (error instanceof ImageGeneratorError) {
        throw error;
      }

      // Check for rate limit errors
      if (error instanceof Error && error.message.includes('429')) {
        throw new ImageGeneratorError(
          'rate_limit',
          'Rate limit exceeded. Please try again later.',
          error
        );
      }

      // For network errors, throw appropriate error
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
        throw new ImageGeneratorError(
          'network_error',
          'Network error: Could not connect to the image generation service.',
          error
        );
      }

      // For other errors, throw with message
      throw new ImageGeneratorError(
        'api_error',
        `Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Get fallback placeholder image when generation fails
   * Requirement 9.2: Display era-appropriate placeholder images
   */
  getFallbackImage(layer: GeologicalLayer): GeneratedImage {
    const width = 1920;
    const height = 1080;

    // Create SVG placeholder
    const svgContent = createPlaceholderSvg(layer.era.name, width, height);
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });

    return {
      id: `fallback_${layer.id}`,
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
   * Calculate image generation cost based on resolution
   * Requirement 11.3: Log image generation costs based on resolution
   * 
   * Pricing (Gemini 2.5 Flash Image):
   * - Output: $0.039 per image (MEDIUM resolution)
   */
  calculateCost(resolution: MediaResolution): number {
    return IMAGE_COST_BY_RESOLUTION[resolution] || IMAGE_COST_BY_RESOLUTION.MEDIUM;
  },

  /**
   * Check if the API key is configured and valid
   */
  isConfigured(): boolean {
    const apiKey = getGeminiApiKey();
    return !!apiKey && apiKey.length > 0;
  },
};

export default imageGenerator;
