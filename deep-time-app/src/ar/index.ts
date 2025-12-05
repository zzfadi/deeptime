/**
 * AR Module Barrel Export
 * Central export point for all AR-related functionality
 * Requirements: 1.1, 1.2
 */

// Type exports
export type {
  // Session types
  XRSupportLevel,
  CameraPermission,
  ARSessionState,
  IARSessionManager,
  // Creature types
  AnimationType,
  CreatureDiet,
  CreatureSize,
  Creature,
  CreatureInstance,
  CreatureManifest,
  ICreatureManager,
  // Transition types
  TransitionEffectType,
  TransitionDirection,
  TransitionEffect,
  IEraTransitionController,
  // Haptic types
  HapticIntensity,
  IHapticController,
  // Narration types
  NarrationType,
  Narration,
  IARNarrationService,
  // Fallback types
  ARAvailability,
  IARFallbackDetector,
} from './types';

// Service exports (will be added as implementations are created)
export { ARSessionManager } from './ARSessionManager';
export { ARFallbackDetector } from './ARFallbackDetector';
export { CreatureManager, creatureManager, MIN_CREATURE_SPACING, MAX_OVERLAP_PERCENTAGE } from './CreatureManager';
export { CreatureInteractionHandler, creatureInteractionHandler } from './CreatureInteraction';
export {
  EraTransitionController,
  eraTransitionController,
  determineTransitionEffect,
  determineTransitionDirection,
  DEFAULT_TRANSITION_CONFIG,
  MIN_TRANSITION_DURATION,
  MAX_TRANSITION_DURATION,
  type TransitionState,
  type TransitionConfig,
  type TransitionCallbacks,
  type SliderLockCallback,
  type CreatureLoadCallback,
} from './EraTransitionController';
export {
  TransitionEffectManager,
  transitionEffectManager,
  createDissolveShaderMaterial,
  createEmergeShaderMaterial,
  createTransitionShaderMaterial,
  DISSOLVE_COLOR,
  EMERGE_COLOR,
} from './TransitionShaders';

// Re-export haptic controller from services for convenience
export { 
  hapticController, 
  HapticController, 
  getHapticIntensityForEra,
  HAPTIC_DURATIONS,
  CONFIRM_PATTERN,
  MAJOR_ERA_NAMES,
} from '../services/haptics';
