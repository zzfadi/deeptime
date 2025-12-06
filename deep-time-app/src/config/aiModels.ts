/**
 * AI Model Configuration
 * Single source of truth for all AI model selection
 * 
 * Design Reference: .kiro/specs/ai-flow-redesign/design.md
 * 
 * Model Strategy (Gemini 2.5 family):
 * - Flash-Lite: Fast, cheap, real-time interactions (AR creature narrations)
 * - Flash: Balanced performance for detailed content (era narratives)
 * - Flash Image: Native image generation (era visualizations)
 * - Veo 3.1 Fast: Video generation (4-6 second clips)
 * 
 * ACTIVELY USED CONFIGURATIONS (Requirement 7.1):
 * - CREATURE_NARRATION: AR creature tap-to-narrate (Flash-Lite)
 * - ERA_WELCOME: AR era welcome messages (Flash-Lite)
 * - ERA_NARRATIVE: Detailed geological narratives (Flash-Lite)
 * - ERA_IMAGE: Era visualization images (Flash Image)
 * - ERA_VIDEO: Era video clips (Veo 3.1 Fast)
 * 
 * DEPRECATED/FUTURE CONFIGURATIONS (Requirement 7.2):
 * - QUIZ_GENERATION: Reserved for future quiz feature (Pro)
 * - PERSONALIZATION: Reserved for future personalization (Pro)
 */

// ============================================
// Gemini 2.5 Text Models
// ============================================

export const GEMINI_MODELS = {
  /**
   * Gemini 2.5 Flash Lite
   * - Fastest and most cost-efficient text model
   * - Perfect for high-frequency, real-time tasks
   * - Use for: AR creature narrations, era narratives, quick responses
   * - Pricing: $0.10/1M input, $0.40/1M output
   */
  FLASH_LITE: 'gemini-2.5-flash-lite',
  
  /**
   * Gemini 2.5 Flash
   * - Balanced performance and cost
   * - 1M token context window
   * - Hybrid reasoning with thinking budgets
   * - Use for: Complex reasoning tasks, detailed descriptions
   * - Pricing: $0.30/1M input, $2.50/1M output
   */
  FLASH: 'gemini-2.5-flash',
  
  /**
   * Gemini 2.5 Flash Image
   * - Native image generation model
   * - Optimized for speed, flexibility, contextual understanding
   * - Use for: Era visualization images
   * - Pricing: $0.039 per image (Standard)
   */
  FLASH_IMAGE: 'gemini-2.5-flash-image',
  
  /**
   * Gemini 2.5 Pro
   * - Most powerful reasoning model
   * - Best for complex tasks
   * - Use for: Future advanced features
   * - Pricing: $1.25/1M input, $10.00/1M output
   */
  PRO: 'gemini-2.5-pro',
} as const;

// ============================================
// Veo Video Models
// ============================================

export const VEO_MODELS = {
  /**
   * Veo 3.1 Fast
   * - Fast video generation with audio
   * - Optimal cost-performance balance
   * - Use for: Era video clips (4-6 seconds)
   * - Pricing: $0.15 per second
   */
  VEO_31_FAST: 'veo-3.1-fast-generate-preview',
  
  /**
   * Veo 3.1 Standard
   * - Higher quality video generation
   * - Use for: Premium video content
   * - Pricing: $0.40 per second
   */
  VEO_31_STANDARD: 'veo-3.1-generate-preview',
} as const;

// ============================================
// Use Case Mapping
// ============================================

export const MODEL_USE_CASES = {
  // Real-time AR creature interactions (tap-to-narrate)
  CREATURE_NARRATION: GEMINI_MODELS.FLASH_LITE,
  
  // Era welcome messages in AR
  ERA_WELCOME: GEMINI_MODELS.FLASH_LITE,
  
  // Detailed geological era narratives
  // Requirement 3.1: Use Flash-Lite for cost optimization (70-85% savings)
  ERA_NARRATIVE: GEMINI_MODELS.FLASH_LITE,
  
  // Era visualization images
  ERA_IMAGE: GEMINI_MODELS.FLASH_IMAGE,
  
  // Era video clips
  ERA_VIDEO: VEO_MODELS.VEO_31_FAST,
  
  /**
   * @deprecated Not currently used in any service implementation.
   * Reserved for future educational quiz generation feature.
   * Requirement 7.2: Marked as deprecated for clarity.
   */
  QUIZ_GENERATION: GEMINI_MODELS.PRO,
  
  /**
   * @deprecated Not currently used in any service implementation.
   * Reserved for future personalized learning paths feature.
   * Requirement 7.2: Marked as deprecated for clarity.
   */
  PERSONALIZATION: GEMINI_MODELS.PRO,
} as const;

// ============================================
// Model Specifications
// ============================================

export const MODEL_SPECS = {
  [GEMINI_MODELS.FLASH_LITE]: {
    name: 'Gemini 2.5 Flash Lite',
    speed: 'fastest',
    cost: 'lowest',
    contextWindow: '1M tokens',
    bestFor: 'Real-time interactions, era narratives, high-frequency tasks',
    latency: '~200-500ms',
    pricing: { input: 0.10, output: 0.40 }, // per 1M tokens
  },
  [GEMINI_MODELS.FLASH]: {
    name: 'Gemini 2.5 Flash',
    speed: 'fast',
    cost: 'moderate',
    contextWindow: '1M tokens',
    bestFor: 'Complex reasoning tasks, hybrid reasoning',
    latency: '~500-1000ms',
    pricing: { input: 0.30, output: 2.50 }, // per 1M tokens
  },
  [GEMINI_MODELS.FLASH_IMAGE]: {
    name: 'Gemini 2.5 Flash Image',
    speed: 'fast',
    cost: 'moderate',
    contextWindow: 'N/A',
    bestFor: 'Native image generation with contextual understanding',
    latency: '~2-5s',
    pricing: { perImage: 0.039 }, // per image
  },
  [GEMINI_MODELS.PRO]: {
    name: 'Gemini 2.5 Pro',
    speed: 'moderate',
    cost: 'higher',
    contextWindow: '1M tokens',
    bestFor: 'Complex reasoning, advanced features',
    latency: '~1000-2000ms',
    pricing: { input: 1.25, output: 10.00 }, // per 1M tokens
  },
  [VEO_MODELS.VEO_31_FAST]: {
    name: 'Veo 3.1 Fast',
    speed: 'fast',
    cost: 'moderate',
    contextWindow: 'N/A',
    bestFor: 'Fast video generation with audio',
    latency: '~30-60s',
    pricing: { perSecond: 0.15 }, // per second of video
  },
  [VEO_MODELS.VEO_31_STANDARD]: {
    name: 'Veo 3.1 Standard',
    speed: 'moderate',
    cost: 'higher',
    contextWindow: 'N/A',
    bestFor: 'High quality video generation',
    latency: '~60-120s',
    pricing: { perSecond: 0.40 }, // per second of video
  },
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Get model for a specific use case
 */
export function getModelForUseCase(useCase: keyof typeof MODEL_USE_CASES): string {
  return MODEL_USE_CASES[useCase];
}

/**
 * Get model specifications
 */
export function getModelSpecs(model: string) {
  return MODEL_SPECS[model as keyof typeof MODEL_SPECS];
}

export default GEMINI_MODELS;
