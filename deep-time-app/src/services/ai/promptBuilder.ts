/**
 * Prompt Builder Service
 * Creates optimized prompts for AI content generation with implicit caching support
 * Requirements: 7.1, 7.2, 7.3, 7.5, 8.2
 * 
 * Key Design Principles:
 * - Place large, reusable context at the beginning of prompts (Req 7.1)
 * - Reuse common prompt prefixes for implicit caching (Req 7.2)
 * - Use clear, concise output format instructions (Req 7.3)
 * - Limit few-shot examples to 2-3 maximum (Req 7.5)
 */

import type { GeoCoordinate, GeologicalLayer } from 'deep-time-core/types';
import type { LocationContext, EnhancedNarrative } from './types';

// ============================================
// Prompt Template Types
// ============================================

/**
 * Template variables that can be substituted in prompts
 */
export interface PromptTemplateVariables {
  // Location variables
  latitude?: number;
  longitude?: number;
  placeName?: string;
  geologicalFeatures?: string[];
  nearbyLandmarks?: string[];

  // Geological layer variables
  eraName?: string;
  period?: string;
  epoch?: string;
  yearsAgo?: number;
  yearsAgoFormatted?: string;
  material?: string;
  fossilIndex?: string;
  depthStart?: number;
  depthEnd?: number;
  layerColor?: string;

  // Narrative variables (for image/video prompts)
  flora?: string[];
  fauna?: string[];
  climateTemperature?: string;
  climateHumidity?: string;
  climateAtmosphere?: string;
  shortDescription?: string;
  visualPrompt?: string;
}

/**
 * Prompt template with metadata
 */
export interface PromptTemplate {
  /** Template name for identification */
  name: string;
  /** Template string with {{variable}} placeholders */
  template: string;
  /** Required variables for this template */
  requiredVariables: string[];
  /** Optional variables that enhance the prompt */
  optionalVariables: string[];
  /** Estimated token count for the template (without variables) */
  estimatedBaseTokens: number;
}

// ============================================
// Prompt Templates
// ============================================

/**
 * Context prefix template - placed at the beginning of all prompts
 * for implicit caching benefits (Req 7.1, 7.2, 8.2)
 * 
 * This prefix contains location and geological data that remains
 * consistent across multiple requests for the same location.
 */
export const CONTEXT_PREFIX_TEMPLATE: PromptTemplate = {
  name: 'context_prefix',
  template: `=== LOCATION CONTEXT ===
Geographic Coordinates: {{latitude}}, {{longitude}}
Place Name: {{placeName}}
Geological Features: {{geologicalFeatures}}
Nearby Landmarks: {{nearbyLandmarks}}

=== GEOLOGICAL LAYER DATA ===
Era: {{eraName}}
Period: {{period}}
Time: {{yearsAgoFormatted}} years ago
Material Type: {{material}}
Fossil Index: {{fossilIndex}}
Depth Range: {{depthStart}}m to {{depthEnd}}m
Layer Characteristics: {{layerColor}}

`,
  requiredVariables: ['latitude', 'longitude', 'eraName', 'period', 'yearsAgoFormatted', 'material'],
  optionalVariables: ['placeName', 'geologicalFeatures', 'nearbyLandmarks', 'fossilIndex', 'depthStart', 'depthEnd', 'layerColor'],
  estimatedBaseTokens: 150,
};

/**
 * Narrative generation prompt template
 * Requirement 2.1: Generate era narratives using Gemini 2.5 Flash
 */
export const NARRATIVE_PROMPT_TEMPLATE: PromptTemplate = {
  name: 'narrative',
  template: `=== TASK ===
You are a geological storyteller creating an immersive narrative about this prehistoric location.

Generate a vivid, engaging narrative describing what this exact location looked like during the {{eraName}} era. Include specific details about:
1. Flora (plants and vegetation)
2. Fauna (animals and creatures)
3. Climate conditions
4. Geological features visible at this location

=== OUTPUT FORMAT ===
Return ONLY valid JSON with no markdown formatting:
{
  "shortDescription": "A brief 2-3 sentence description of the scene",
  "fullDescription": "A detailed 4-6 sentence narrative",
  "flora": ["plant1", "plant2", "plant3"],
  "fauna": ["creature1", "creature2", "creature3"],
  "climate": {
    "temperature": "description of temperature conditions",
    "humidity": "description of humidity/precipitation",
    "atmosphere": "description of atmospheric conditions"
  },
  "visualPrompt": "A concise visual description for image generation"
}

=== EXAMPLES ===
Input: Jurassic Era, 150 million years ago, Tropical Location
Output:
{
  "shortDescription": "A lush tropical floodplain dominated by towering conifers and ferns. Giant sauropods graze in the distance under a humid, hazy sky.",
  "fullDescription": "The air is thick with humidity and the scent of pine and decay. Towering Araucaria trees form a dense canopy overhead, filtering the sunlight into dappled patterns on the fern-covered forest floor. Massive Diplodocus herds move slowly through the floodplain, their footsteps shaking the ground. Small ornithopods dart between the cycads, staying alert for predators. The atmosphere feels heavy and primordial, with a constant buzz of insects.",
  "flora": ["Araucaria", "Tree Ferns", "Cycads", "Ginkgo"],
  "fauna": ["Diplodocus", "Allosaurus", "Stegosaurus", "Early Mammals"],
  "climate": {
    "temperature": "Warm and tropical, averaging 30°C",
    "humidity": "High humidity with frequent afternoon rains",
    "atmosphere": "Oxygen-rich and dense"
  },
  "visualPrompt": "Jurassic landscape, lush tropical forest with Araucaria trees and ferns, Diplodocus herd in background, golden hour lighting, photorealistic"
}`,
  requiredVariables: ['eraName'],
  optionalVariables: [],
  estimatedBaseTokens: 250,
};

/**
 * Image generation prompt template
 * Requirement 3.3: Include location-specific flora, fauna, climate, and geological features
 * Property 11: Image prompt completeness - must include flora, fauna, climate, geological features
 */
export const IMAGE_PROMPT_TEMPLATE: PromptTemplate = {
  name: 'image',
  template: `Generate a photorealistic landscape image depicting {{placeName}} during the {{eraName}} era of the {{period}} period, approximately {{yearsAgoFormatted}} years ago.

=== SCENE COMPOSITION ===
Location: {{placeName}} (coordinates: {{latitude}}, {{longitude}})
Time Period: {{eraName}} era, {{period}} period

=== GEOLOGICAL FEATURES ===
Terrain Type: {{material}} formations
Geological Characteristics: {{geologicalFeatures}}
Fossil Richness: {{fossilIndex}} fossil index

=== FLORA (Vegetation) ===
Plant Life: {{flora}}
Vegetation should be scientifically accurate for the {{eraName}} era.

=== FAUNA (Wildlife) ===
Animal Life: {{fauna}}
Creatures should be depicted naturally in their prehistoric habitat.

=== CLIMATE CONDITIONS ===
Temperature: {{climateTemperature}}
Humidity: {{climateHumidity}}
Atmospheric Conditions: {{climateAtmosphere}}

=== VISUAL STYLE ===
- Photorealistic rendering with cinematic lighting
- Wide landscape panoramic view (16:9 aspect ratio)
- Golden hour or dramatic sky lighting
- Scientifically accurate prehistoric environment
- High detail on geological formations and vegetation
- Natural, documentary-style composition
- Immersive, educational, and awe-inspiring mood

=== ADDITIONAL CONTEXT ===
{{shortDescription}}

=== EXAMPLES ===
Input: Cretaceous Period, Hell Creek Formation
Output:
Generate a photorealistic landscape image depicting the Hell Creek Formation during the Late Cretaceous period, approximately 66 million years ago.

=== SCENE COMPOSITION ===
Location: Hell Creek
Time Period: Late Cretaceous
Terrain Type: River delta system
Geological Characteristics: Muddy floodplains, meandering rivers
Fossil Richness: High

=== FLORA ===
Plant Life: Palm trees, Conifers, Flowering plants (Angiosperms)
Vegetation should be scientifically accurate for the Late Cretaceous.

=== FAUNA ===
Animal Life: Tyrannosaurus Rex, Triceratops, Edmontosaurus
Creatures should be depicted naturally in their prehistoric habitat.

=== CLIMATE CONDITIONS ===
Temperature: Subtropical and warm
Humidity: Humid
Atmospheric Conditions: Hazy with volcanic ash in distance

=== VISUAL STYLE ===
- Photorealistic rendering with cinematic lighting
- Wide landscape panoramic view (16:9 aspect ratio)
- Golden hour or dramatic sky lighting
- Scientifically accurate prehistoric environment
- High detail on geological formations and vegetation
- Natural, documentary-style composition
- Immersive, educational, and awe-inspiring mood`,
  requiredVariables: ['placeName', 'eraName', 'period', 'yearsAgoFormatted', 'material', 'flora', 'fauna'],
  optionalVariables: ['latitude', 'longitude', 'geologicalFeatures', 'fossilIndex', 'climateTemperature', 'climateHumidity', 'climateAtmosphere', 'shortDescription'],
  estimatedBaseTokens: 200,
};

/**
 * Video generation prompt template
 * Requirement 4.2: Use text-to-video generation with location-specific prompts
 * Property 15: Video prompt location-specificity - must include location name, era name, narrative elements
 * 
 * Enhanced for cinematic quality with Veo 3.1 Fast
 */
export const VIDEO_PROMPT_TEMPLATE: PromptTemplate = {
  name: 'video',
  template: `A cinematic 5-second nature documentary video depicting {{placeName}} during the {{eraName}} era of the {{period}} period, approximately {{yearsAgoFormatted}} years ago.

=== SCENE DESCRIPTION ===
Location: {{placeName}}
Time Period: {{eraName}} era, {{period}} period

=== ENVIRONMENT ===
The prehistoric landscape features {{material}} terrain with {{geologicalFeatures}}. Lush {{flora}} vegetation dominates the scene, creating a dense, primordial atmosphere.

=== WILDLIFE ===
{{fauna}} move naturally through their ancient habitat, exhibiting realistic behaviors. The creatures interact with the environment in a scientifically accurate manner.

=== ATMOSPHERE ===
{{climateAtmosphere}}. {{climateTemperature}}. The air carries {{climateHumidity}}.

=== CINEMATIC DIRECTION ===
Camera Movement: Slow, sweeping pan across the landscape, gradually revealing the prehistoric world
Lighting: Golden hour sunlight filtering through ancient vegetation, creating dramatic shadows and highlights
Style: Photorealistic, BBC Earth nature documentary quality, scientifically accurate
Mood: Awe-inspiring, immersive time-travel experience that transports the viewer millions of years into the past
Audio: Natural ambient sounds - wind through vegetation, distant creature calls, water if present

=== VISUAL CONTEXT ===
{{shortDescription}}`,
  requiredVariables: ['placeName', 'eraName', 'period', 'yearsAgoFormatted', 'flora', 'fauna'],
  optionalVariables: ['material', 'geologicalFeatures', 'climateAtmosphere', 'climateTemperature', 'climateHumidity', 'shortDescription'],
  estimatedBaseTokens: 180,
};

// ============================================
// Template Variable Substitution
// ============================================

/**
 * Formats years ago into human-readable string
 */
export function formatYearsAgo(yearsAgo: number): string {
  if (yearsAgo >= 1_000_000_000) {
    return `${(yearsAgo / 1_000_000_000).toFixed(1)} billion`;
  }
  if (yearsAgo >= 1_000_000) {
    return `${(yearsAgo / 1_000_000).toFixed(1)} million`;
  }
  if (yearsAgo >= 1_000) {
    return `${(yearsAgo / 1_000).toFixed(1)} thousand`;
  }
  return yearsAgo.toString();
}

/**
 * Formats an array of strings for prompt inclusion
 */
export function formatStringArray(arr: string[] | undefined, defaultValue: string = 'various species'): string {
  if (!arr || arr.length === 0) {
    return defaultValue;
  }
  if (arr.length === 1) {
    return arr[0];
  }
  if (arr.length === 2) {
    return `${arr[0]} and ${arr[1]}`;
  }
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`;
}

/**
 * Substitutes template variables in a prompt string
 * Requirement 7.3: Use clear, concise instructions
 * 
 * @param template - Template string with {{variable}} placeholders
 * @param variables - Object containing variable values
 * @returns Prompt string with variables substituted
 */
export function substituteTemplateVariables(
  template: string,
  variables: PromptTemplateVariables
): string {
  let result = template;

  // Process each variable
  const variablePattern = /\{\{(\w+)\}\}/g;

  result = result.replace(variablePattern, (_match, varName) => {
    const value = variables[varName as keyof PromptTemplateVariables];

    if (value === undefined || value === null) {
      // Return a sensible default for missing variables
      return getDefaultValue(varName);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return formatStringArray(value);
    }

    // Handle numbers
    if (typeof value === 'number') {
      return value.toString();
    }

    return String(value);
  });

  return result;
}

/**
 * Gets a default value for a missing template variable
 * Provides sensible defaults for image prompt completeness
 */
function getDefaultValue(varName: string): string {
  const defaults: Record<string, string> = {
    placeName: 'this location',
    geologicalFeatures: 'typical geological formations',
    nearbyLandmarks: 'the surrounding area',
    layerColor: 'characteristic coloration',
    flora: 'prehistoric vegetation including ferns and ancient trees',
    fauna: 'prehistoric creatures native to this era',
    climateTemperature: 'moderate temperatures typical of the era',
    climateHumidity: 'variable humidity conditions',
    climateAtmosphere: 'prehistoric atmospheric conditions',
    shortDescription: '',
    visualPrompt: '',
    fossilIndex: 'moderate',
    period: 'geological period',
    latitude: '0',
    longitude: '0',
  };

  return defaults[varName] || '';
}

// ============================================
// Prompt Builder Interface
// ============================================

export interface PromptBuilder {
  /**
   * Build narrative prompt with location context
   * Requirement 7.1: Place large, reusable context at the beginning
   */
  buildNarrativePrompt(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext: LocationContext
  ): string;

  /**
   * Build image generation prompt
   * Requirement 3.3: Include location-specific flora, fauna, climate
   */
  buildImagePrompt(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    narrative: EnhancedNarrative
  ): string;

  /**
   * Build video generation prompt
   * Requirement 4.2: Use location-specific prompts
   */
  buildVideoPrompt(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    narrative: EnhancedNarrative
  ): string;

  /**
   * Get reusable context prefix for implicit caching
   * Requirement 7.2: Reuse common prompt prefixes
   * Requirement 8.2: Structure prompts to maximize cache hit rate
   */
  getContextPrefix(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext: LocationContext
  ): string;

  /**
   * Extract template variables from location and layer data
   */
  extractVariables(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext,
    narrative?: EnhancedNarrative
  ): PromptTemplateVariables;
}

// ============================================
// Prompt Builder Implementation
// ============================================

export const promptBuilder: PromptBuilder = {
  /**
   * Build narrative prompt with location context
   * Property 25: Context at prompt beginning
   * Property 26: Prompt prefix consistency
   */
  buildNarrativePrompt(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext: LocationContext
  ): string {
    const variables = this.extractVariables(location, layer, locationContext);

    // Build prompt with context prefix first (for implicit caching)
    const contextPrefix = this.getContextPrefix(location, layer, locationContext);
    const narrativeBody = substituteTemplateVariables(
      NARRATIVE_PROMPT_TEMPLATE.template,
      variables
    );

    return contextPrefix + narrativeBody;
  },

  /**
   * Build image generation prompt
   * Property 11: Image prompt completeness
   */
  buildImagePrompt(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    narrative: EnhancedNarrative
  ): string {
    const variables = this.extractVariables(
      location,
      layer,
      narrative.locationContext,
      narrative
    );

    return substituteTemplateVariables(IMAGE_PROMPT_TEMPLATE.template, variables);
  },

  /**
   * Build video generation prompt
   * Property 15: Video prompt location-specificity
   */
  buildVideoPrompt(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    narrative: EnhancedNarrative
  ): string {
    const variables = this.extractVariables(
      location,
      layer,
      narrative.locationContext,
      narrative
    );

    return substituteTemplateVariables(VIDEO_PROMPT_TEMPLATE.template, variables);
  },

  /**
   * Get reusable context prefix for implicit caching
   * This prefix should be identical for all prompts at the same location-era
   * to maximize implicit cache hits from Gemini API
   * 
   * Property 26: Prompt prefix consistency
   * Property 29: Prompt structure for cache hits
   */
  getContextPrefix(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext: LocationContext
  ): string {
    const variables = this.extractVariables(location, layer, locationContext);
    return substituteTemplateVariables(CONTEXT_PREFIX_TEMPLATE.template, variables);
  },

  /**
   * Extract template variables from location and layer data
   * Ensures all required variables for image prompts are populated
   * Property 11: Image prompt completeness
   */
  extractVariables(
    location: GeoCoordinate,
    layer: GeologicalLayer,
    locationContext?: LocationContext,
    narrative?: EnhancedNarrative
  ): PromptTemplateVariables {
    const variables: PromptTemplateVariables = {
      // Location variables
      latitude: location.latitude,
      longitude: location.longitude,
      placeName: locationContext?.placeName || 'this location',
      geologicalFeatures: locationContext?.geologicalFeatures || [],
      nearbyLandmarks: locationContext?.nearbyLandmarks || [],

      // Geological layer variables
      eraName: layer.era.name,
      period: layer.era.period,
      epoch: layer.era.epoch,
      yearsAgo: layer.era.yearsAgo,
      yearsAgoFormatted: formatYearsAgo(layer.era.yearsAgo),
      material: layer.material,
      fossilIndex: layer.fossilIndex,
      depthStart: layer.depthStart,
      depthEnd: layer.depthEnd,
      layerColor: layer.characteristics?.color,
    };

    // Add narrative variables if available (required for image/video prompts)
    // Property 11: Image prompt must include flora, fauna, climate from narrative
    if (narrative) {
      variables.flora = narrative.flora;
      variables.fauna = narrative.fauna;
      variables.climateTemperature = narrative.climate?.temperature;
      variables.climateHumidity = narrative.climate?.humidity;
      variables.climateAtmosphere = narrative.climate?.atmosphere;
      variables.shortDescription = narrative.shortDescription;
      variables.visualPrompt = narrative.visualPrompt;
    }

    return variables;
  },
};

export default promptBuilder;
