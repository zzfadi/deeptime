/**
 * Era Transition Controller
 * Manages visual transitions between geological eras
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import * as THREE from 'three';
import type {
  IEraTransitionController,
  TransitionDirection,
  TransitionEffectType,
  ICreatureManager,
  Creature,
} from './types';
import type { GeologicalEra } from 'deep-time-core/types';

/**
 * Transition state machine states
 * Requirements: 3.1, 3.5
 */
export type TransitionState = 'idle' | 'fading_out' | 'loading' | 'fading_in' | 'complete';

/**
 * Transition configuration
 * Requirements: 3.1 - Duration between 1-2 seconds
 */
export interface TransitionConfig {
  /** Total transition duration in milliseconds (1000-2000ms per Requirement 3.1) */
  duration: number;
  /** Fade out duration as percentage of total */
  fadeOutRatio: number;
  /** Fade in duration as percentage of total */
  fadeInRatio: number;
}

/**
 * Default transition configuration
 * Property 6: Transition Duration Bounds (1000-2000ms)
 */
export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  duration: 1500, // 1.5 seconds - middle of 1-2 second range
  fadeOutRatio: 0.4, // 40% for fade out
  fadeInRatio: 0.4, // 40% for fade in (20% for loading)
};

/**
 * Minimum transition duration in milliseconds
 * Property 6: Transition Duration Bounds
 */
export const MIN_TRANSITION_DURATION = 1000;

/**
 * Maximum transition duration in milliseconds
 * Property 6: Transition Duration Bounds
 */
export const MAX_TRANSITION_DURATION = 2000;


/**
 * Callback type for slider lock state changes
 * Requirements: 3.5
 */
export type SliderLockCallback = (isLocked: boolean) => void;

/**
 * Callback type for creature loading
 * Requirements: 3.4
 */
export type CreatureLoadCallback = (era: GeologicalEra) => Promise<Creature[]>;

/**
 * Transition event callbacks
 */
export interface TransitionCallbacks {
  /** Called when slider should be locked/unlocked */
  onSliderLockChange?: SliderLockCallback;
  /** Called to load creatures for new era */
  onLoadCreatures?: CreatureLoadCallback;
  /** Called when transition completes */
  onTransitionComplete?: (targetEra: GeologicalEra) => void;
  /** Called when transition starts */
  onTransitionStart?: (fromEra: GeologicalEra | null, toEra: GeologicalEra) => void;
}

/**
 * Determines the transition effect type based on direction
 * Property 7: Transition Effect Direction
 * 
 * @param currentYearsAgo - Current era's yearsAgo value
 * @param targetYearsAgo - Target era's yearsAgo value
 * @returns 'dissolve' for going to past (larger yearsAgo), 'emerge' for going to future
 */
export function determineTransitionEffect(
  currentYearsAgo: number,
  targetYearsAgo: number
): TransitionEffectType {
  // Going to older era (larger yearsAgo) = dissolve into the past
  // Going to newer era (smaller yearsAgo) = emerge from the past
  return targetYearsAgo > currentYearsAgo ? 'dissolve' : 'emerge';
}

/**
 * Determines the transition direction based on era comparison
 * 
 * @param currentYearsAgo - Current era's yearsAgo value
 * @param targetYearsAgo - Target era's yearsAgo value
 * @returns 'past' if going to older era, 'future' if going to newer era
 */
export function determineTransitionDirection(
  currentYearsAgo: number,
  targetYearsAgo: number
): TransitionDirection {
  return targetYearsAgo > currentYearsAgo ? 'past' : 'future';
}

/**
 * EraTransitionController implementation
 * Manages visual transitions between geological eras with state machine
 * 
 * Requirements:
 * - 3.1: Animate transition effect lasting 1-2 seconds
 * - 3.2: Apply "dissolve into the past" effect for older eras
 * - 3.3: Apply "emerge from the past" effect for newer eras
 * - 3.4: Smoothly fade in new era creatures
 * - 3.5: Disable time slider during transition
 */
export class EraTransitionController implements IEraTransitionController {
  private state: TransitionState = 'idle';
  private progress: number = 0;
  private currentEra: GeologicalEra | null = null;
  private targetEra: GeologicalEra | null = null;
  private direction: TransitionDirection = 'past';
  private effectType: TransitionEffectType = 'dissolve';
  
  private config: TransitionConfig;
  private callbacks: TransitionCallbacks;
  private creatureManager: ICreatureManager | null = null;
  
  private transitionStartTime: number = 0;
  private animationFrameId: number | null = null;
  private resolveTransition: (() => void) | null = null;
  private rejectTransition: ((error: Error) => void) | null = null;

  constructor(
    config: Partial<TransitionConfig> = {},
    callbacks: TransitionCallbacks = {}
  ) {
    this.config = { ...DEFAULT_TRANSITION_CONFIG, ...config };
    this.callbacks = callbacks;
    
    // Clamp duration to valid range (Property 6)
    this.config.duration = Math.max(
      MIN_TRANSITION_DURATION,
      Math.min(MAX_TRANSITION_DURATION, this.config.duration)
    );
  }

  /**
   * Set the creature manager for creature transitions
   */
  setCreatureManager(manager: ICreatureManager): void {
    this.creatureManager = manager;
  }

  /**
   * Set the Three.js scene for effects
   * Note: Scene is passed to TransitionEffectManager for shader effects
   */
  setScene(scene: THREE.Scene): void {
    // Import and use TransitionEffectManager for shader effects
    // This method is kept for API compatibility
    void scene; // Acknowledge parameter for future use
  }

  /**
   * Set the current era (for direction calculation)
   */
  setCurrentEra(era: GeologicalEra): void {
    this.currentEra = era;
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: TransitionCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }


  /**
   * Start transition to new era
   * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
   * 
   * @param targetEra - The geological era to transition to
   * @param direction - Direction of time travel ('past' or 'future')
   * @returns Promise that resolves when transition completes
   */
  async transitionTo(targetEra: GeologicalEra, direction: TransitionDirection): Promise<void> {
    // Don't start new transition if one is in progress
    if (this.state !== 'idle') {
      return Promise.reject(new Error('Transition already in progress'));
    }

    // Determine effect type based on direction (Property 7)
    if (this.currentEra) {
      this.effectType = determineTransitionEffect(
        this.currentEra.yearsAgo,
        targetEra.yearsAgo
      );
      this.direction = determineTransitionDirection(
        this.currentEra.yearsAgo,
        targetEra.yearsAgo
      );
    } else {
      this.effectType = direction === 'past' ? 'dissolve' : 'emerge';
      this.direction = direction;
    }

    this.targetEra = targetEra;
    this.progress = 0;
    this.transitionStartTime = performance.now();

    // Lock slider (Property 8: Slider Lock During Transition)
    this.callbacks.onSliderLockChange?.(true);
    
    // Notify transition start
    this.callbacks.onTransitionStart?.(this.currentEra, targetEra);

    return new Promise((resolve, reject) => {
      this.resolveTransition = resolve;
      this.rejectTransition = reject;
      
      // Start the transition state machine
      this.setState('fading_out');
      this.startAnimationLoop();
    });
  }

  /**
   * Check if transition is in progress
   * Property 8: Slider Lock During Transition
   */
  isTransitioning(): boolean {
    return this.state !== 'idle' && this.state !== 'complete';
  }

  /**
   * Cancel current transition
   */
  cancel(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Unlock slider
    this.callbacks.onSliderLockChange?.(false);

    // Reset state
    this.state = 'idle';
    this.progress = 0;
    this.targetEra = null;

    // Reject pending promise
    if (this.rejectTransition) {
      this.rejectTransition(new Error('Transition cancelled'));
      this.resolveTransition = null;
      this.rejectTransition = null;
    }
  }

  /**
   * Get current transition progress (0-1)
   */
  getProgress(): number {
    return this.progress;
  }

  /**
   * Get current transition state
   */
  getState(): TransitionState {
    return this.state;
  }

  /**
   * Get current effect type
   */
  getEffectType(): TransitionEffectType {
    return this.effectType;
  }

  /**
   * Get transition direction
   */
  getDirection(): TransitionDirection {
    return this.direction;
  }

  /**
   * Set transition state and handle state-specific logic
   */
  private setState(newState: TransitionState): void {
    this.state = newState;
  }

  /**
   * Start the animation loop for transition
   */
  private startAnimationLoop(): void {
    const animate = async () => {
      const elapsed = performance.now() - this.transitionStartTime;
      this.progress = Math.min(1, elapsed / this.config.duration);

      // Update state based on progress
      await this.updateTransitionState();

      if (this.state !== 'idle' && this.state !== 'complete') {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }


  /**
   * Update transition state based on progress
   * Implements the state machine: idle -> fading_out -> loading -> fading_in -> complete -> idle
   */
  private async updateTransitionState(): Promise<void> {
    const fadeOutEnd = this.config.fadeOutRatio;
    const loadingEnd = fadeOutEnd + (1 - this.config.fadeOutRatio - this.config.fadeInRatio);
    const fadeInEnd = 1;

    switch (this.state) {
      case 'fading_out':
        // Fade out current creatures
        if (this.progress >= fadeOutEnd) {
          // Clear current creatures when fade out completes
          this.creatureManager?.clearAll();
          this.setState('loading');
          
          // Load new creatures
          if (this.targetEra && this.callbacks.onLoadCreatures) {
            try {
              await this.callbacks.onLoadCreatures(this.targetEra);
            } catch (error) {
              console.warn('Failed to load creatures for transition:', error);
            }
          }
        } else {
          // Apply fade out effect to creatures
          this.applyFadeEffect(1 - (this.progress / fadeOutEnd));
        }
        break;

      case 'loading':
        if (this.progress >= loadingEnd) {
          this.setState('fading_in');
        }
        break;

      case 'fading_in':
        if (this.progress >= fadeInEnd) {
          // Transition complete
          this.applyFadeEffect(1); // Ensure full opacity
          this.completeTransition();
        } else {
          // Apply fade in effect
          const fadeInProgress = (this.progress - loadingEnd) / this.config.fadeInRatio;
          this.applyFadeEffect(fadeInProgress);
        }
        break;
    }
  }

  /**
   * Apply fade effect to all creature meshes
   * Requirements: 3.4 - Smoothly fade in/out creatures
   * 
   * @param opacity - Target opacity (0-1)
   */
  private applyFadeEffect(opacity: number): void {
    if (!this.creatureManager) return;

    const instances = this.creatureManager.getInstances();
    for (const instance of instances) {
      instance.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.Material;
          if ('opacity' in material) {
            material.transparent = true;
            material.opacity = Math.max(0, Math.min(1, opacity));
          }
        }
      });
    }
  }

  /**
   * Complete the transition and cleanup
   */
  private completeTransition(): void {
    this.setState('complete');

    // Update current era
    if (this.targetEra) {
      this.currentEra = this.targetEra;
    }

    // Unlock slider (Property 8)
    this.callbacks.onSliderLockChange?.(false);

    // Notify completion
    if (this.targetEra) {
      this.callbacks.onTransitionComplete?.(this.targetEra);
    }

    // Resolve promise
    if (this.resolveTransition) {
      this.resolveTransition();
      this.resolveTransition = null;
      this.rejectTransition = null;
    }

    // Reset to idle
    this.state = 'idle';
    this.targetEra = null;
    this.progress = 0;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get elapsed time since transition started
   * Property 6: Transition Duration Bounds
   */
  getElapsedTime(): number {
    if (this.transitionStartTime === 0) return 0;
    return performance.now() - this.transitionStartTime;
  }

  /**
   * Validate that transition duration is within bounds
   * Property 6: Transition Duration Bounds (1000-2000ms)
   */
  validateDuration(): boolean {
    return (
      this.config.duration >= MIN_TRANSITION_DURATION &&
      this.config.duration <= MAX_TRANSITION_DURATION
    );
  }
}

/**
 * Singleton instance for app-wide use
 */
export const eraTransitionController = new EraTransitionController();
