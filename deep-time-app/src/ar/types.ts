/**
 * AR Module Type Definitions
 * TypeScript interfaces for AR components based on design document
 * Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1
 */

import type { GeologicalEra } from 'deep-time-core/types';
import * as THREE from 'three';

// ============================================
// AR Session Types
// ============================================

/**
 * XR support level for the device
 */
export type XRSupportLevel = 'full' | 'limited' | 'none';

/**
 * Camera permission state
 */
export type CameraPermission = 'granted' | 'denied' | 'prompt';

/**
 * State of the AR session
 * Requirements: 1.2, 1.3
 */
export interface ARSessionState {
  /** Whether an AR session is currently active */
  isActive: boolean;
  /** Whether a ground plane has been detected */
  hasGroundPlane: boolean;
  /** The XR anchor for the ground plane, if detected */
  groundPlaneAnchor: XRAnchor | null;
  /** Current camera permission status */
  cameraPermission: CameraPermission;
  /** Level of XR support on this device */
  xrSupport: XRSupportLevel;
  /** Y-coordinate of the detected ground plane */
  groundPlaneY: number | null;
}

/**
 * AR Session Manager interface
 * Manages WebXR session lifecycle and camera passthrough
 * Requirements: 1.2, 1.3
 */
export interface IARSessionManager {
  /** Initialize AR session with camera passthrough */
  initSession(): Promise<ARSessionState>;
  /** End AR session and cleanup */
  endSession(): void;
  /** Get current session state */
  getState(): ARSessionState;
  /** Check if AR is supported */
  isSupported(): Promise<boolean>;
  /** Request hit test for ground plane detection */
  requestHitTest(origin: THREE.Vector3, direction: THREE.Vector3): Promise<XRHitTestResult[]>;
}

// ============================================
// Creature Types
// ============================================

/**
 * Animation types available for creatures
 * Requirements: 2.2, 2.3
 */
export type AnimationType = 'idle' | 'walk' | 'roar' | 'attention' | 'eat' | 'graze' | 'trumpet';

/**
 * Creature diet classification
 */
export type CreatureDiet = 'herbivore' | 'carnivore' | 'omnivore';

/**
 * Creature size classification
 */
export type CreatureSize = 'tiny' | 'small' | 'medium' | 'large' | 'massive';

/**
 * Creature definition from manifest
 * Requirements: 2.1
 */
export interface Creature {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Scientific name */
  scientificName: string;
  /** Geological era this creature belongs to */
  era: string;
  /** Specific period within the era */
  period: string;
  /** URL to the GLTF model */
  modelUrl: string;
  /** URL to thumbnail image */
  thumbnailUrl: string;
  /** Real-world scale in meters */
  scale: number;
  /** Available animation names */
  animations: AnimationType[];
  /** Brief description */
  description: string;
  /** Diet classification */
  diet: CreatureDiet;
  /** Size classification */
  size: CreatureSize;
}

/**
 * Instance of a spawned creature in the scene
 * Requirements: 2.2, 2.4, 2.5
 */
export interface CreatureInstance {
  /** Unique instance identifier */
  id: string;
  /** The creature definition */
  creature: Creature;
  /** Three.js group containing the model */
  mesh: THREE.Group;
  /** Animation mixer for this instance */
  mixer: THREE.AnimationMixer;
  /** World position */
  position: THREE.Vector3;
  /** Current animation being played */
  currentAnimation: AnimationType;
  /** Bounding box for collision detection */
  boundingBox: THREE.Box3;
}

/**
 * Creature manifest structure
 * Requirements: 2.1
 */
export interface CreatureManifest {
  creatures: {
    [eraName: string]: Creature[];
  };
}

/**
 * Creature Manager interface
 * Handles loading, animation, and interaction of 3D creature models
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export interface ICreatureManager {
  /** Load creatures for a specific era */
  loadEraCreatures(era: GeologicalEra): Promise<Creature[]>;
  /** Spawn creature at position on ground plane */
  spawnCreature(creature: Creature, position: THREE.Vector3): Promise<CreatureInstance>;
  /** Play animation on creature */
  playAnimation(instance: CreatureInstance, animation: AnimationType): void;
  /** Handle tap interaction */
  handleTap(instance: CreatureInstance): void;
  /** Update all creature animations (called per frame) */
  update(deltaTime: number): void;
  /** Clear all creatures (for era transition) */
  clearAll(): void;
  /** Get all active creature instances */
  getInstances(): CreatureInstance[];
}

// ============================================
// Era Transition Types
// ============================================

/**
 * Transition effect types
 * Requirements: 3.2, 3.3
 */
export type TransitionEffectType = 'dissolve' | 'emerge' | 'ripple';

/**
 * Direction of time travel
 */
export type TransitionDirection = 'past' | 'future';

/**
 * Transition effect configuration
 * Requirements: 3.1, 3.2, 3.3
 */
export interface TransitionEffect {
  /** Type of visual effect */
  type: TransitionEffectType;
  /** Duration in milliseconds */
  duration: number;
  /** Shader material for the effect */
  shader: THREE.ShaderMaterial;
}

/**
 * Era Transition Controller interface
 * Manages visual transitions between geological eras
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export interface IEraTransitionController {
  /** Start transition to new era */
  transitionTo(targetEra: GeologicalEra, direction: TransitionDirection): Promise<void>;
  /** Check if transition is in progress */
  isTransitioning(): boolean;
  /** Cancel current transition */
  cancel(): void;
  /** Get current transition progress (0-1) */
  getProgress(): number;
}

// ============================================
// Haptic Types
// ============================================

/**
 * Haptic intensity levels
 * Requirements: 5.2
 */
export type HapticIntensity = 'light' | 'medium' | 'strong';

/**
 * Haptic Controller interface
 * Manages vibration feedback for time navigation
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */
export interface IHapticController {
  /** Trigger haptic pulse for era boundary */
  pulseEraBoundary(intensity: HapticIntensity): void;
  /** Trigger confirmation haptic */
  pulseConfirm(): void;
  /** Check if haptics are supported */
  isSupported(): boolean;
}

// ============================================
// Narration Types
// ============================================

/**
 * Narration type classification
 */
export type NarrationType = 'era' | 'creature' | 'discovery';

/**
 * Narration content
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export interface Narration {
  /** The narration text */
  text: string;
  /** Auto-dismiss time in milliseconds */
  duration: number;
  /** Type of narration */
  type: NarrationType;
}

/**
 * Narration Service interface for AR
 * Generates and displays AI-powered narration
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export interface IARNarrationService {
  /** Generate narration for current era view */
  narrateEra(era: GeologicalEra, creatures: Creature[]): Promise<Narration>;
  /** Generate narration for specific creature */
  narrateCreature(creature: Creature): Promise<Narration>;
  /** Display narration toast */
  showNarration(narration: Narration): void;
  /** Dismiss current narration */
  dismiss(): void;
}

// ============================================
// AR Fallback Types
// ============================================

/**
 * AR availability result
 * Requirements: 1.4, 1.5
 */
export interface ARAvailability {
  /** Whether full AR is available */
  isARAvailable: boolean;
  /** Whether camera-only mode is available */
  isCameraAvailable: boolean;
  /** Reason if AR is not available */
  unavailableReason: string | null;
  /** Recommended fallback mode */
  fallbackMode: 'card-view' | 'camera-only' | 'none';
}

/**
 * AR Fallback Detector interface
 * Checks WebXR support and camera permissions
 * Requirements: 1.4, 1.5
 */
export interface IARFallbackDetector {
  /** Check AR availability and determine fallback */
  checkAvailability(): Promise<ARAvailability>;
  /** Request camera permission */
  requestCameraPermission(): Promise<boolean>;
  /** Check if should use card-based view */
  shouldUseCardView(): boolean;
}
