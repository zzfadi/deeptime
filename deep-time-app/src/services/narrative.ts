/**
 * Narrative Service with Gemini AI Integration
 * Generates engaging narratives for geological layers and creatures using AI
 * Requirements: 2.1, 2.2, 2.4, 4.1, 4.2
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GeologicalLayer, Narrative, ClimateDescription } from 'deep-time-core/types';
import { generateNarrative as generateFallbackNarrative } from 'deep-time-core/narrative';
import type { Creature, Narration, NarrationType } from '../ar/types';

// ============================================
// Types
// ============================================

export interface NarrativeService {
  generateNarrative(layer: GeologicalLayer): Promise<Narrative>;
  getFallback(layer: GeologicalLayer): Narrative;
}

export type NarrativeErrorType =
  | 'api_error'
  | 'parse_error'
  | 'rate_limit'
  | 'invalid_response';

export class NarrativeError extends Error {
  constructor(
    public readonly type: NarrativeErrorType,
    message: string
  ) {
    super(message);
    this.name = 'NarrativeError';
  }
}

// ============================================
// Gemini API Configuration
// ============================================

import { getActiveApiKey } from '../components/ApiKeyModal';

// Import centralized AI model configuration
import { MODEL_USE_CASES } from '../config/aiModels';

/**
 * Get the current API key (runtime or env)
 * Supports user-provided keys at runtime for hackathon demo
 */
function getGeminiApiKey(): string {
  // First check for runtime-provided key
  const runtimeKey = getActiveApiKey();
  if (runtimeKey) return runtimeKey;
  
  // Fall back to environment variable
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

/**
 * Gemini prompt template for narrative generation
 * Requirement 2.1: Send layer metadata to Gemini API
 */
function buildNarrativePrompt(layer: GeologicalLayer): string {
  return `You are a geological storyteller. Given this layer data:
- Era: ${layer.era.name} (${formatYearsAgo(layer.era.yearsAgo)} years ago)
- Period: ${layer.era.period}
- Material: ${layer.material}
- Fossil Index: ${layer.fossilIndex}
- Depth: ${layer.depthStart}m to ${layer.depthEnd}m

Generate a vivid, engaging narrative (2-3 sentences) describing what this location looked like during this era. Include specific flora, fauna, and climate details. Return ONLY valid JSON with no markdown formatting:
{
  "shortDescription": "A brief 1-2 sentence description",
  "flora": ["plant1", "plant2", "plant3"],
  "fauna": ["creature1", "creature2", "creature3"],
  "climate": { "temperature": "description", "humidity": "description", "atmosphere": "description" }
}`;
}

/**
 * Formats years ago into human-readable string
 */
function formatYearsAgo(yearsAgo: number): string {
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

// ============================================
// Gemini Response Parsing
// ============================================

interface GeminiNarrativeResponse {
  shortDescription: string;
  flora: string[];
  fauna: string[];
  climate: ClimateDescription;
}

/**
 * Validates that the Gemini response has all required fields
 * Requirement 2.2: Display era-appropriate description with flora, fauna, and climate
 */
function validateGeminiResponse(data: unknown): data is GeminiNarrativeResponse {
  if (!data || typeof data !== 'object') return false;
  
  const response = data as Record<string, unknown>;
  
  // Check shortDescription
  if (typeof response.shortDescription !== 'string' || !response.shortDescription.trim()) {
    return false;
  }
  
  // Check flora array - must be non-empty
  if (!Array.isArray(response.flora) || response.flora.length === 0) {
    return false;
  }
  if (!response.flora.every(item => typeof item === 'string')) {
    return false;
  }
  
  // Check fauna array - must be non-empty
  if (!Array.isArray(response.fauna) || response.fauna.length === 0) {
    return false;
  }
  if (!response.fauna.every(item => typeof item === 'string')) {
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
      throw new NarrativeError(
        'invalid_response',
        'Gemini response missing required fields'
      );
    }
    
    return parsed;
  } catch (error) {
    if (error instanceof NarrativeError) {
      throw error;
    }
    throw new NarrativeError(
      'parse_error',
      `Failed to parse Gemini response: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================
// Fallback Narratives
// ============================================

// Fallback narratives are provided by the core library's generateNarrative function
// Requirement 2.4: Display cached fallback content when narrative generation fails

// ============================================
// Narrative Service Implementation
// ============================================

/**
 * Creates a Gemini AI client instance
 * Uses runtime API key if available, falls back to env variable
 */
function createGeminiClient(): GoogleGenerativeAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.warn('Gemini API key not configured. Using fallback narratives.');
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
}

export const narrativeService: NarrativeService = {
  /**
   * Generates a narrative for a geological layer using Gemini AI
   * Requirement 2.1: Send layer metadata to Gemini API
   * Requirement 2.2: Display era-appropriate description with flora, fauna, and climate
   * 
   * Uses Gemini 2.5 Flash for balanced performance and detailed narratives
   */
  async generateNarrative(layer: GeologicalLayer): Promise<Narrative> {
    const client = createGeminiClient();
    
    // If no API key, use fallback immediately
    if (!client) {
      return this.getFallback(layer);
    }
    
    try {
      // Use Gemini 2.5 Flash for detailed era narratives
      const model = client.getGenerativeModel({ model: MODEL_USE_CASES.ERA_NARRATIVE });
      const prompt = buildNarrativePrompt(layer);
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      if (!text) {
        throw new NarrativeError('api_error', 'Empty response from Gemini');
      }
      
      const parsed = parseGeminiResponse(text);
      
      // Build full narrative from Gemini response
      const narrative: Narrative = {
        layerId: layer.id,
        shortDescription: parsed.shortDescription,
        fullDescription: buildFullDescription(layer, parsed),
        visualPrompt: buildVisualPrompt(layer, parsed),
        flora: parsed.flora,
        fauna: parsed.fauna,
        climate: parsed.climate,
        soundscape: getEraSoundscape(layer.era.name),
      };
      
      return narrative;
    } catch (error) {
      // Requirement 2.4: Display cached fallback content when narrative generation fails
      console.warn('Gemini narrative generation failed, using fallback:', error);
      return this.getFallback(layer);
    }
  },

  /**
   * Gets a fallback narrative for a geological layer
   * Requirement 2.4: Display cached fallback content when narrative generation fails
   */
  getFallback(layer: GeologicalLayer): Narrative {
    // Use the core library's narrative generation as fallback
    return generateFallbackNarrative(layer);
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Builds a full description from Gemini response
 */
function buildFullDescription(
  layer: GeologicalLayer,
  response: GeminiNarrativeResponse
): string {
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

export default narrativeService;

// ============================================
// Creature Narration Service
// Requirements: 4.1, 4.2, 4.5
// ============================================

/**
 * Average reading speed in words per minute
 */
const WORDS_PER_MINUTE = 200;

/**
 * Minimum narration display time in milliseconds
 */
const MIN_NARRATION_DURATION = 3000;

/**
 * Maximum narration display time in milliseconds
 */
const MAX_NARRATION_DURATION = 15000;

/**
 * Calculate reading time for a text in milliseconds
 * @param text - The text to calculate reading time for
 * @returns Duration in milliseconds
 */
export function calculateReadingTime(text: string): number {
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  const readingTimeMs = (wordCount / WORDS_PER_MINUTE) * 60 * 1000;
  return Math.max(MIN_NARRATION_DURATION, Math.min(MAX_NARRATION_DURATION, readingTimeMs));
}

/**
 * Gemini prompt template for creature-specific narration
 * Requirement 4.2: Generate specific explanation about creature on tap
 */
function buildCreatureNarrationPrompt(creature: Creature): string {
  return `You are a paleontology expert and engaging storyteller. A user has tapped on a ${creature.name} (${creature.scientificName}) in an AR experience.

Creature details:
- Name: ${creature.name}
- Scientific Name: ${creature.scientificName}
- Era: ${creature.era} (${creature.period})
- Diet: ${creature.diet}
- Size: ${creature.size} (approximately ${creature.scale} meters)
- Description: ${creature.description}

Generate a brief, engaging narration (2-3 sentences) that:
1. MUST include the creature's name "${creature.name}" in the text
2. Describes an interesting fact or behavior about this creature
3. Helps the user imagine what it would be like to encounter this creature

Return ONLY the narration text, no JSON or formatting. Keep it conversational and exciting.`;
}

/**
 * Gemini prompt template for era narration
 * Requirement 4.1: Generate contextual narration for new era
 */
function buildEraNarrationPrompt(eraName: string, creatures: Creature[]): string {
  const creatureNames = creatures.map(c => c.name).join(', ');
  const creatureDescriptions = creatures.map(c => `${c.name}: ${c.description}`).join('\n');
  
  return `You are a time-travel guide narrating an AR experience. The user has just arrived in the ${eraName} era and can see these creatures around them:

${creatureDescriptions}

Generate a brief, immersive welcome narration (2-3 sentences) that:
1. Sets the scene for the ${eraName} era
2. Mentions at least one of the visible creatures: ${creatureNames}
3. Creates a sense of wonder and discovery

Return ONLY the narration text, no JSON or formatting. Keep it conversational and exciting.`;
}

/**
 * Fallback narrations for each creature
 * Requirement 4.5: Pre-written fallback narrations when Gemini unavailable
 */
const CREATURE_FALLBACK_NARRATIONS: Record<string, string> = {
  // Cretaceous
  trex: "The mighty Tyrannosaurus Rex stands before you, the undisputed king of the Cretaceous. With jaws powerful enough to crush bone and teeth the size of bananas, this apex predator ruled the ancient world 68 million years ago.",
  triceratops: "A Triceratops grazes peacefully nearby, its three distinctive horns and massive frill making it one of the most recognizable dinosaurs. Despite its fearsome appearance, this gentle giant was a herbivore that lived in herds.",
  velociraptor: "The Velociraptor watches you with intelligent eyes, its feathered body poised for action. Don't let its small size fool you—this swift predator was one of the most cunning hunters of the Cretaceous.",
  
  // Jurassic
  brachiosaurus: "Towering above the treetops, the Brachiosaurus is a living skyscraper of the Jurassic. This gentle giant could reach vegetation over 12 meters high, making it one of the tallest creatures to ever walk the Earth.",
  stegosaurus: "The Stegosaurus ambles past, its distinctive back plates catching the prehistoric sunlight. Those plates may have helped regulate body temperature, while its spiked tail—called a thagomizer—was a formidable weapon against predators.",
  allosaurus: "An Allosaurus surveys its territory with predatory focus. This apex predator of the Jurassic was built for speed and power, with serrated teeth designed to slice through flesh.",
  
  // Pleistocene
  mammoth: "The Woolly Mammoth trumpets a greeting, its curved tusks gleaming in the Ice Age light. Covered in thick fur and standing 4 meters tall, these magnificent creatures were perfectly adapted to the frozen tundra.",
  sabertooth: "A Saber-toothed Cat prowls nearby, its 28-centimeter canine teeth on full display. Despite its fearsome appearance, this Ice Age predator was actually more closely related to modern cats than you might think.",
  megatherium: "The Giant Ground Sloth rises on its hind legs, reaching for vegetation high above. At 6 meters tall when standing, this gentle giant was one of the largest land mammals to ever exist.",
  
  // Triassic
  coelophysis: "A pack of Coelophysis darts through the Triassic landscape. These early dinosaurs were swift and agile, representing the dawn of the dinosaur age that would dominate Earth for over 160 million years.",
  
  // Permian
  dimetrodon: "The Dimetrodon basks in the Permian sun, its distinctive sail absorbing warmth. Despite its dinosaur-like appearance, this creature was actually more closely related to mammals—including you!",
  
  // Carboniferous
  meganeura: "A Meganeura buzzes overhead, its 70-centimeter wingspan casting shadows on the swampy forest floor. In the oxygen-rich atmosphere of the Carboniferous, insects grew to incredible sizes.",
};

/**
 * Fallback narrations for eras
 * Requirement 4.5: Pre-written fallback narrations when Gemini unavailable
 */
const ERA_FALLBACK_NARRATIONS: Record<string, string> = {
  Cretaceous: "Welcome to the Cretaceous period, 145 to 66 million years ago. This was the golden age of dinosaurs, when giants like T. Rex and Triceratops ruled the land. Look around—you're standing in a world that would soon face a catastrophic asteroid impact.",
  Jurassic: "You've arrived in the Jurassic period, 201 to 145 million years ago. Massive sauropods tower above the fern forests, while predators like Allosaurus hunt in the shadows. This is the age when dinosaurs truly dominated the Earth.",
  Pleistocene: "Welcome to the Ice Age, the Pleistocene epoch from 2.6 million to 11,700 years ago. Woolly mammoths and saber-toothed cats roam the frozen tundra. Your ancestors walked alongside these magnificent creatures.",
  Triassic: "You've traveled to the Triassic period, 252 to 201 million years ago. This is the dawn of the dinosaur age, when the first dinosaurs were just beginning their rise to dominance. The world is recovering from the greatest mass extinction in history.",
  Permian: "Welcome to the Permian period, 299 to 252 million years ago. Before the dinosaurs, creatures like Dimetrodon ruled the land. This ancient world would soon face the deadliest extinction event Earth has ever known.",
  Carboniferous: "You've arrived in the Carboniferous period, 359 to 299 million years ago. Giant insects fill the air, and vast swamp forests cover the land. The coal we burn today was formed from these ancient forests.",
};

/**
 * Get fallback narration for a creature
 * Requirement 4.5: Use fallback when Gemini unavailable
 * Property 9: Creature-Specific Narration - text SHALL contain creature's name
 */
export function getCreatureFallbackNarration(creature: Creature): Narration {
  const fallbackText = CREATURE_FALLBACK_NARRATIONS[creature.id] 
    || `The ${creature.name} (${creature.scientificName}) stands before you, a remarkable creature from the ${creature.era} era. ${creature.description}`;
  
  return {
    text: fallbackText,
    duration: calculateReadingTime(fallbackText),
    type: 'creature' as NarrationType,
  };
}

/**
 * Get fallback narration for an era
 * Requirement 4.5: Use fallback when Gemini unavailable
 */
export function getEraFallbackNarration(eraName: string, creatures: Creature[]): Narration {
  let fallbackText = ERA_FALLBACK_NARRATIONS[eraName];
  
  if (!fallbackText) {
    const creatureNames = creatures.map(c => c.name).join(', ');
    fallbackText = `Welcome to the ${eraName} era. Around you, creatures like ${creatureNames || 'ancient life forms'} roam the prehistoric landscape. Take a moment to observe these magnificent beings from Earth's distant past.`;
  }
  
  return {
    text: fallbackText,
    duration: calculateReadingTime(fallbackText),
    type: 'era' as NarrationType,
  };
}

/**
 * Creature Narration Service
 * Generates AI-powered narrations for creatures and eras
 * Requirements: 4.1, 4.2, 4.5
 */
export const creatureNarrationService = {
  /**
   * Generate narration for a specific creature
   * Requirement 4.2: Generate specific explanation about creature on tap
   * Property 9: Creature-Specific Narration - text SHALL contain creature's name
   * 
   * Uses Gemini 2.5 Flash-Lite for fast, real-time AR interactions
   */
  async narrateCreature(creature: Creature): Promise<Narration> {
    const client = createGeminiClient();
    
    // If no API key, use fallback immediately
    if (!client) {
      return getCreatureFallbackNarration(creature);
    }
    
    try {
      // Use Gemini 2.5 flash-lite for fast, cost-efficient creature narrations
      const model = client.getGenerativeModel({ model: MODEL_USE_CASES.CREATURE_NARRATION });
      const prompt = buildCreatureNarrationPrompt(creature);
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text()?.trim();
      
      if (!text) {
        throw new NarrativeError('api_error', 'Empty response from Gemini');
      }
      
      // Property 9: Validate that narration contains creature name
      if (!text.toLowerCase().includes(creature.name.toLowerCase())) {
        console.warn('Gemini response did not include creature name, using fallback');
        return getCreatureFallbackNarration(creature);
      }
      
      return {
        text,
        duration: calculateReadingTime(text),
        type: 'creature' as NarrationType,
      };
    } catch (error) {
      // Requirement 4.5: Use fallback when Gemini unavailable
      console.warn('Gemini creature narration failed, using fallback:', error);
      return getCreatureFallbackNarration(creature);
    }
  },

  /**
   * Generate narration for a new era
   * Requirement 4.1: Generate contextual narration when new era is displayed
   * 
   * Uses Gemini 2.5 Flash-Lite for fast era welcome messages
   */
  async narrateEra(eraName: string, creatures: Creature[]): Promise<Narration> {
    const client = createGeminiClient();
    
    // If no API key or no creatures, use fallback immediately
    if (!client || creatures.length === 0) {
      return getEraFallbackNarration(eraName, creatures);
    }
    
    try {
      // Use Gemini 2.5 flash-lite for fast era welcome narrations
      const model = client.getGenerativeModel({ model: MODEL_USE_CASES.ERA_WELCOME });
      const prompt = buildEraNarrationPrompt(eraName, creatures);
      
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text()?.trim();
      
      if (!text) {
        throw new NarrativeError('api_error', 'Empty response from Gemini');
      }
      
      return {
        text,
        duration: calculateReadingTime(text),
        type: 'era' as NarrationType,
      };
    } catch (error) {
      // Requirement 4.5: Use fallback when Gemini unavailable
      console.warn('Gemini era narration failed, using fallback:', error);
      return getEraFallbackNarration(eraName, creatures);
    }
  },
};
