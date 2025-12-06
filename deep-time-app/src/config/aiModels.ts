/**
 * AI Model Configuration
 * Centralized configuration for Gemini model selection
 * 
 * Model Selection Strategy:
 * - Flash-Lite (8B): Fast, cheap, real-time interactions
 * - Flash: Balanced performance for detailed content
 * - Pro: Advanced reasoning for complex tasks (future)
 */

export const GEMINI_MODELS = {
  /**
   * Gemini 2.5 flash-lite (Flash-Lite)
   * - Fastest and most cost-efficient
   * - Perfect for high-frequency, real-time tasks
   * - Great for mobile AR interactions
   * - Use for: Creature narrations, quick responses
   */
  FLASH_LITE: 'gemini-2.5-flash-lite',
  
  /**
   * Gemini 2.5 Flash
   * - Balanced performance and cost
   * - 1M token context window
   * - Good reasoning capabilities
   * - Use for: Era narratives, detailed descriptions
   */
  FLASH: 'gemini-2.5-flash',
  
  /**
   * Gemini 3 Pro
   * - Most powerful reasoning
   * - Best for complex tasks
   * - Higher cost, slower
   * - Use for: Future advanced features
   */
  PRO: 'gemini-3-pro',
} as const;

/**
 * Model selection for different use cases
 */
export const MODEL_USE_CASES = {
  // Real-time AR creature interactions (tap-to-narrate)
  CREATURE_NARRATION: GEMINI_MODELS.FLASH_LITE,
  
  // Era welcome messages in AR
  ERA_WELCOME: GEMINI_MODELS.FLASH_LITE,
  
  // Detailed geological era narratives
  ERA_NARRATIVE: GEMINI_MODELS.FLASH,
  
  // Future: Educational quiz generation
  QUIZ_GENERATION: GEMINI_MODELS.PRO,
  
  // Future: Personalized learning paths
  PERSONALIZATION: GEMINI_MODELS.PRO,
} as const;

/**
 * Model performance characteristics
 */
export const MODEL_SPECS = {
  [GEMINI_MODELS.FLASH_LITE]: {
    name: 'Gemini 2.5 flash-lite',
    speed: 'fastest',
    cost: 'lowest',
    contextWindow: '1M tokens',
    bestFor: 'Real-time interactions, high-frequency tasks',
    latency: '~200-500ms',
  },
  [GEMINI_MODELS.FLASH]: {
    name: 'Gemini 2.5 Flash',
    speed: 'fast',
    cost: 'moderate',
    contextWindow: '1M tokens',
    bestFor: 'Balanced performance, detailed content',
    latency: '~500-1000ms',
  },
  [GEMINI_MODELS.PRO]: {
    name: 'Gemini 3 Pro',
    speed: 'moderate',
    cost: 'higher',
    contextWindow: '2M tokens',
    bestFor: 'Complex reasoning, advanced features',
    latency: '~1000-2000ms',
  },
} as const;

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
