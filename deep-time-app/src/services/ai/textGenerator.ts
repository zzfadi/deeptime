/**
 * Text Generator Service
 * Generates location-aware narratives using Gemini 2.5 Flash
 * Requirements: 2.1, 2.5, 2.6, 8.1, 8.2
 * 
 * Key Features:
 * - Uses Gemini 2.5 Flash for balanced cost and quality
 * - Implements token counting and cost calculation
 * - Supports implicit caching through prompt structure
 * - Integrates with Prompt Builder for optimized prompts
 */

// Using direct REST API calls instead of SDK for better control
import type { GeoCoordinate, GeologicalLayer, ClimateDescription } from 'deep-time-core/types';
import type { EnhancedNarrative, LocationContext, TokenUsage } from './types';
import {
  INPUT_COST_PER_1M,
  OUTPUT_COST_PER_1M,
  CACHED_COST_PER_1M,
  DEFAULT_MAX_OUTPUT_TOKENS,
} from './types';
import { promptBuilder } from './promptBuilder';
import { buildBasicLocationContext } from './contextPrefixGenerator';
import { MODEL_USE_CASES } from '../../config/aiModels';
import { getActiveApiKey } from '../../components/ApiKeyModal';
import { generateNarrative as generateFallbackNarrative } from 'deep-time-core/narrative';
import {
  handleRateLimit,
  isOffline,
  isApiKeyConfigured,
  AIError,
} from './errorHandling';
import { cacheHitMonitor } from './cacheHitMonitor';

// ============================================
// Types
// ============================================

/**
 * Options for text generation
 */
export interface TextGenerationOptions {
  /** Override the default model */
  model?: string;
  /** Temperature for generation (0-1) */
  temperature?: number;
  /** 
   * Maximum output tokens (default: 2048)
   * Requirement 4.1: Limit token generation to prevent waste
   * 2048 tokens is sufficient for narrative JSON responses
   */
  maxOutputTokens?: number;
  /** Whether to use fallback on error */
  useFallbackOnError?: boolean;
}

/**
 * Raw response from Gemini API for narrative generation
 */
interface GeminiNarrativeResponse {
  shortDescription: string;
  fullDescription?: string;
  flora: string[];
  fauna: string[];
  climate: ClimateDescription;
  visualPrompt?: string;
}

/**
 * Error types specific to text generation
 */
export type TextGeneratorErrorType =
  | 'api_error'
  | 'parse_error'
  | 'rate_limit'
  | 'invalid_response'
  | 'invalid_key'
  | 'network_error';

/**
 * Custom error class for text generation errors
 */
export class TextGeneratorError extends Error {
  constructor(
    public readonly type: TextGeneratorErrorType,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'TextGeneratorError';
  }
}

// ============================================
// Text Generator Interface
// ============================================

export interface TextGenerator {
  /**
   * Generate narrative for a location-era combination
   * Uses Gemini 2.5 Flash with implicit caching
   * 
   * Requirement 2.1: Use Gemini 2.5 Flash model
   * Requirement 2.5: Use implicit caching for large geological data
   * Requirement 2.6: Place large, reusable context at the beginning
   */
  generateNarrative(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext,
    options?: TextGenerationOptions
  ): Promise<EnhancedNarrative>;

  /**
   * Get fallback narrative when generation fails
   * Requirement 9.1: Fall back to pre-written narratives
   */
  getFallbackNarrative(
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): EnhancedNarrative;

  /**
   * Calculate token usage and cost from API response
   * Requirement 11.1: Log token counts for input, output, and cached tokens
   */
  calculateTokenUsage(
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number
  ): TokenUsage;

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
 */
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Validates that the Gemini response has all required fields
 * Requirement 2.1: Parse and validate JSON responses
 */
function validateGeminiResponse(data: unknown): data is GeminiNarrativeResponse {
  if (!data || typeof data !== 'object') return false;

  const response = data as Record<string, unknown>;

  // Check shortDescription
  if (typeof response.shortDescription !== 'string' || !response.shortDescription.trim()) {
    return false;
  }

  // Check flora array
  if (!Array.isArray(response.flora) || response.flora.length === 0) {
    return false;
  }

  // Check fauna array
  if (!Array.isArray(response.fauna) || response.fauna.length === 0) {
    return false;
  }

  // Check climate object
  if (!response.climate || typeof response.climate !== 'object') {
    return false;
  }

  const climate = response.climate as Record<string, unknown>;
  if (typeof climate.temperature !== 'string' || !climate.temperature.trim()) {
    return false;
  }
  if (typeof climate.humidity !== 'string' || !climate.humidity.trim()) {
    return false;
  }
  if (typeof climate.atmosphere !== 'string' || !climate.atmosphere.trim()) {
    return false;
  }

  return true;
}

/**
 * Parses Gemini response text into structured data
 */
function parseGeminiResponse(responseText: string): GeminiNarrativeResponse {
  // Clean up the response - remove markdown code blocks if present
  let cleanedText = responseText.trim();

  // Remove markdown code block markers
  if (cleanedText.startsWith('```json')) {
    cleanedText = cleanedText.slice(7);
  } else if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.slice(3);
  }
  if (cleanedText.endsWith('```')) {
    cleanedText = cleanedText.slice(0, -3);
  }
  cleanedText = cleanedText.trim();

  try {
    const parsed = JSON.parse(cleanedText);

    if (!validateGeminiResponse(parsed)) {
      throw new TextGeneratorError(
        'invalid_response',
        'Gemini response missing required fields'
      );
    }

    return parsed;
  } catch (error) {
    if (error instanceof TextGeneratorError) {
      throw error;
    }
    throw new TextGeneratorError(
      'parse_error',
      `Failed to parse Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Builds a full description from Gemini response
 */
function buildFullDescription(
  layer: GeologicalLayer,
  response: GeminiNarrativeResponse
): string {
  // If fullDescription is provided, use it
  if (response.fullDescription) {
    return response.fullDescription;
  }

  const { era, material, fossilIndex } = layer;
  const { flora, fauna, climate } = response;

  const floraText = flora.join(', ');
  const faunaText = fauna.join(', ');

  let fossilText = '';
  if (fossilIndex === 'exceptional') {
    fossilText = ' This layer is exceptionally rich in fossils, preserving remarkable specimens.';
  } else if (fossilIndex === 'high') {
    fossilText = ' Numerous fossils can be found throughout this layer.';
  } else if (fossilIndex === 'medium') {
    fossilText = ' Some fossil remains are present in this layer.';
  }

  return `During the ${era.name} epoch of the ${era.period} period, this region was characterized by ${climate.temperature} temperatures and ${climate.humidity} conditions. The ${climate.atmosphere} atmosphere supported diverse life forms. The landscape featured ${floraText}, while ${faunaText} inhabited the area. The ${material} composition of this layer reflects the environmental conditions of the time.${fossilText}`;
}

/**
 * Builds a visual prompt for rendering
 */
function buildVisualPrompt(
  layer: GeologicalLayer,
  response: GeminiNarrativeResponse
): string {
  // If visualPrompt is provided, use it
  if (response.visualPrompt) {
    return response.visualPrompt;
  }

  const { era } = layer;
  const { flora, fauna, climate } = response;

  const floraText = flora.slice(0, 3).join(', ');
  const faunaText = fauna.slice(0, 3).join(', ');

  return `Render a ${era.name} landscape with ${climate.temperature} climate. Include ${floraText} as vegetation. Populate with ${faunaText}. Atmosphere: ${climate.atmosphere}.`;
}

/**
 * Gets era-appropriate soundscape
 */
function getEraSoundscape(eraName: string): string {
  const soundscapes: Record<string, string> = {
    Holocene: 'forest ambience',
    Pleistocene: 'rushing water and wind',
    Pliocene: 'quiet desert winds',
    Miocene: 'forest ambience',
    Oligocene: 'forest ambience',
    Eocene: 'dense jungle sounds',
    Paleocene: 'dense jungle sounds',
    Cretaceous: 'dense jungle sounds',
    Jurassic: 'dense jungle sounds',
    Triassic: 'quiet desert winds',
    Permian: 'quiet desert winds',
    Carboniferous: 'dense jungle sounds',
    Devonian: 'ocean waves',
    Silurian: 'ocean waves',
    Ordovician: 'ocean waves',
    Cambrian: 'ocean waves',
    Precambrian: 'volcanic rumbling',
  };

  return soundscapes[eraName] ?? 'rushing water and wind';
}

// ============================================
// Text Generator Implementation
// ============================================

export const textGenerator: TextGenerator = {
  /**
   * Generate narrative for a location-era combination
   * Property 2: Geological metadata in prompts
   * Property 5: Geological details in content
   * Property 39: Token count logging
   */
  async generateNarrative(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext,
    options?: TextGenerationOptions
  ): Promise<EnhancedNarrative> {
    // Build location context if not provided
    const context = locationContext || buildBasicLocationContext(location, layer);

    // Property 22: Offline cache-only behavior
    // Requirement 5.5: Serve all content from cache when offline
    if (isOffline()) {
      console.warn('[TextGenerator] Device is offline, using fallback narrative');
      return this.getFallbackNarrative(layer, context);
    }

    const apiKey = getGeminiApiKey();

    // Property 33: No API calls without key
    // Requirement 9.4: API key missing or invalid
    if (!isApiKeyConfigured(apiKey)) {
      console.warn('[TextGenerator] No API key configured, using fallback narrative');
      return this.getFallbackNarrative(layer, context);
    }

    const startTime = Date.now();
    const self = this;

    // Wrap the generation in rate limit handler
    // Requirement 9.5: Exponential backoff (1s, 2s, 4s, 8s)
    // Property 34: Exponential backoff on rate limits
    const generateWithRetry = async (): Promise<EnhancedNarrative> => {
      // Get the model - use provided model or default to ERA_NARRATIVE
      const modelName = options?.model || MODEL_USE_CASES.ERA_NARRATIVE;

      // Build the prompt with context prefix for implicit caching
      // Requirement 2.6: Place large, reusable context at the beginning
      // Requirement 8.2: Structure prompts to maximize cache hit rate
      const prompt = promptBuilder.buildNarrativePrompt(location, layer, context);

      // Build request body - Direct REST API call matching the working tester
      const requestBody = {
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
          // Requirement 4.1: Set maxOutputTokens to 2048 or less to prevent waste
          maxOutputTokens: options?.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
          responseMimeType: 'application/json',
        }
      };

      // Make direct REST API call
      const apiUrl = `${GEMINI_API_BASE_URL}/models/${modelName}:generateContent?key=${apiKey.substring(0, 10)}...`;
      console.log(`[TextGenerator] Calling API: ${apiUrl.replace(apiKey.substring(0, 10), 'AIza***')}`);

      const response = await fetch(
        `${GEMINI_API_BASE_URL}/models/${modelName}:generateContent?key=${apiKey}`,
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
        console.error('[TextGenerator] API Error:', errorMessage);

        if (response.status === 429) {
          throw new TextGeneratorError('rate_limit', 'Rate limit exceeded. Please try again later.');
        }

        throw new TextGeneratorError('api_error', `Text generation failed: ${errorMessage}`);
      }

      // Extract text from response
      const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.warn('[TextGenerator] Empty response from Gemini. Full response:', JSON.stringify(responseData).substring(0, 500));
        throw new TextGeneratorError('api_error', 'Empty response from Gemini');
      }

      // Parse the response
      const parsed = parseGeminiResponse(text);

      // Extract token usage from response metadata
      // Requirement 11.1: Log token counts
      const usageMetadata = responseData.usageMetadata;
      const inputTokens = usageMetadata?.promptTokenCount ?? 0;
      const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;
      const cachedTokens = usageMetadata?.cachedContentTokenCount ?? 0;

      const tokenUsage = self.calculateTokenUsage(inputTokens, outputTokens, cachedTokens);

      // Log token usage for monitoring
      console.log(`[TextGenerator] Token usage - Input: ${inputTokens}, Output: ${outputTokens}, Cached: ${cachedTokens}, Cost: $${tokenUsage.totalCost.toFixed(6)}`);

      // Log cache hit if there were cached tokens
      // Requirement 8.3: Log implicit cache hits from API responses
      // Property 30: Cache hit logging
      if (cachedTokens > 0) {
        await cacheHitMonitor.logCacheHit(tokenUsage, {
          type: 'implicit',
          model: modelName,
          requestType: 'text',
        });
      }

      // Build the enhanced narrative
      const narrative: EnhancedNarrative = {
        layerId: layer.id,
        shortDescription: parsed.shortDescription,
        fullDescription: buildFullDescription(layer, parsed),
        visualPrompt: buildVisualPrompt(layer, parsed),
        flora: parsed.flora,
        fauna: parsed.fauna,
        climate: parsed.climate,
        soundscape: getEraSoundscape(layer.era.name),
        locationContext: context,
        generatedAt: new Date(),
        modelUsed: modelName,
        tokenUsage,
      };

      const duration = Date.now() - startTime;
      console.log(`[TextGenerator] Narrative generated in ${duration}ms`);

      return narrative;
    };

    try {
      // Use rate limit handler with exponential backoff
      return await handleRateLimit(generateWithRetry, 3);
    } catch (error) {
      console.error('[TextGenerator] Generation failed after retries:', error);

      // Property 32: Fallback on generation failure
      // Requirement 9.1: Fall back to pre-written narratives
      if (options?.useFallbackOnError !== false) {
        console.warn('[TextGenerator] Using fallback narrative due to error');
        return this.getFallbackNarrative(layer, context);
      }

      // Re-throw the error
      if (error instanceof TextGeneratorError) {
        throw error;
      }

      if (error instanceof AIError) {
        throw new TextGeneratorError(
          error.type as TextGeneratorErrorType,
          error.message,
          error.cause
        );
      }

      throw new TextGeneratorError(
        'api_error',
        `Failed to generate narrative: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  },

  /**
   * Get fallback narrative when generation fails
   * Requirement 9.1: Fall back to pre-written narratives
   * Property 32: Fallback on generation failure
   */
  getFallbackNarrative(
    layer: GeologicalLayer,
    locationContext?: LocationContext
  ): EnhancedNarrative {
    // Use the core library's narrative generation as fallback
    const baseNarrative = generateFallbackNarrative(layer);

    // Build a basic location context if not provided
    const context = locationContext || {
      coordinates: { latitude: 0, longitude: 0, altitude: 0, accuracy: 0 },
      placeName: 'Unknown Location',
      geologicalFeatures: [],
      nearbyLandmarks: [],
    };

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
   * Calculate token usage and cost from API response
   * Requirement 11.1: Log token counts for input, output, and cached tokens
   * Requirement 2.1: Apply the correct 90% discount rate of $0.03 per 1M tokens
   * 
   * Cost calculation based on Gemini 2.5 Flash pricing:
   * - Input: $0.30 per 1M tokens
   * - Output: $2.50 per 1M tokens
   * - Cached: $0.03 per 1M tokens (90% discount)
   */
  calculateTokenUsage(
    inputTokens: number,
    outputTokens: number,
    cachedTokens: number
  ): TokenUsage {
    // Calculate costs
    // Non-cached input tokens = total input - cached
    const nonCachedInputTokens = Math.max(0, inputTokens - cachedTokens);

    const inputCost = (nonCachedInputTokens / 1_000_000) * INPUT_COST_PER_1M;
    const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_1M;
    const cachedCost = (cachedTokens / 1_000_000) * CACHED_COST_PER_1M;

    const totalCost = inputCost + outputCost + cachedCost;

    return {
      inputTokens,
      outputTokens,
      cachedTokens,
      totalCost,
    };
  },

  /**
   * Check if the API key is configured and valid
   */
  isConfigured(): boolean {
    const apiKey = getGeminiApiKey();
    return !!apiKey && apiKey.length > 0;
  },
};

export default textGenerator;
