// Ghost Layer Management implementation
// Requirements: 6.5

import type { MagneticAnomaly, ARScene, ARObject } from '../types';

/**
 * State of the Ghost Layer overlay
 */
export interface GhostLayerState {
  /** Whether the Ghost Layer is currently enabled */
  enabled: boolean;
  /** Currently visible anomalies (only populated when enabled) */
  visibleAnomalies: MagneticAnomaly[];
}

/**
 * Callback type for Ghost Layer state changes
 */
export type GhostLayerStateChangeCallback = (state: GhostLayerState) => void;

/**
 * GhostLayerManager manages the visibility state of magnetic anomaly overlays.
 * 
 * Per Requirement 6.5: "WHEN the Ghost_Layer is disabled THEN the DeepTime_App 
 * SHALL hide all anomaly highlights without affecting other visualizations"
 * 
 * Per Property 10: Ghost Layer State Isolation - toggling Ghost_Layer visibility 
 * SHALL only affect MagneticAnomaly overlay visibility and SHALL NOT modify any 
 * other ARObject visibility or properties.
 * 
 * This class maintains the enabled/disabled state and the list of anomalies
 * to display when enabled. It does NOT modify ARScene objects directly,
 * ensuring state isolation.
 */
export class GhostLayerManager {
  private _enabled: boolean = false;
  private _anomalies: MagneticAnomaly[] = [];
  private _stateChangeCallbacks: GhostLayerStateChangeCallback[] = [];

  /**
   * Creates a new GhostLayerManager instance.
   * 
   * @param initialEnabled - Optional initial enabled state (defaults to false)
   */
  constructor(initialEnabled: boolean = false) {
    this._enabled = initialEnabled;
  }

  /**
   * Returns whether the Ghost Layer is currently enabled.
   */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Returns the current anomalies (regardless of enabled state).
   * These are the anomalies that would be displayed if enabled.
   */
  get anomalies(): MagneticAnomaly[] {
    return [...this._anomalies];
  }

  /**
   * Returns the current Ghost Layer state.
   */
  getState(): GhostLayerState {
    return {
      enabled: this._enabled,
      visibleAnomalies: this._enabled ? [...this._anomalies] : [],
    };
  }

  /**
   * Enables the Ghost Layer, making anomaly overlays visible.
   * 
   * Per Requirement 6.1: "WHILE the Ghost_Layer is enabled THEN the DeepTime_App 
   * SHALL continuously process magnetometer data for anomaly detection"
   * 
   * This method only changes the visibility state. It does not affect
   * any other scene objects (Property 10: State Isolation).
   */
  enable(): void {
    if (!this._enabled) {
      this._enabled = true;
      this._notifyStateChange();
    }
  }

  /**
   * Disables the Ghost Layer, hiding all anomaly overlays.
   * 
   * Per Requirement 6.5: "WHEN the Ghost_Layer is disabled THEN the DeepTime_App 
   * SHALL hide all anomaly highlights without affecting other visualizations"
   * 
   * This method only changes the visibility state. It does not affect
   * any other scene objects (Property 10: State Isolation).
   */
  disable(): void {
    if (this._enabled) {
      this._enabled = false;
      this._notifyStateChange();
    }
  }

  /**
   * Toggles the Ghost Layer enabled state.
   * 
   * @returns The new enabled state after toggling
   */
  toggle(): boolean {
    this._enabled = !this._enabled;
    this._notifyStateChange();
    return this._enabled;
  }

  /**
   * Sets the anomalies to be displayed when the Ghost Layer is enabled.
   * 
   * This updates the internal anomaly list but does not affect the
   * enabled/disabled state.
   * 
   * @param anomalies - Array of magnetic anomalies to display
   */
  setAnomalies(anomalies: MagneticAnomaly[]): void {
    this._anomalies = [...anomalies];
    if (this._enabled) {
      this._notifyStateChange();
    }
  }

  /**
   * Clears all anomalies from the Ghost Layer.
   */
  clearAnomalies(): void {
    this._anomalies = [];
    if (this._enabled) {
      this._notifyStateChange();
    }
  }

  /**
   * Registers a callback to be notified when the Ghost Layer state changes.
   * 
   * @param callback - Function to call when state changes
   * @returns Unsubscribe function to remove the callback
   */
  onStateChange(callback: GhostLayerStateChangeCallback): () => void {
    this._stateChangeCallbacks.push(callback);
    return () => {
      const index = this._stateChangeCallbacks.indexOf(callback);
      if (index !== -1) {
        this._stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Returns the anomalies that should be visible based on current state.
   * 
   * @returns Array of anomalies if enabled, empty array if disabled
   */
  getVisibleAnomalies(): MagneticAnomaly[] {
    return this._enabled ? [...this._anomalies] : [];
  }

  /**
   * Checks if a specific anomaly is currently visible.
   * 
   * @param anomalyId - The ID of the anomaly to check
   * @returns True if the anomaly is visible (Ghost Layer enabled and anomaly exists)
   */
  isAnomalyVisible(anomalyId: string): boolean {
    if (!this._enabled) {
      return false;
    }
    return this._anomalies.some(a => a.id === anomalyId);
  }

  /**
   * Notifies all registered callbacks of a state change.
   */
  private _notifyStateChange(): void {
    const state = this.getState();
    for (const callback of this._stateChangeCallbacks) {
      callback(state);
    }
  }
}

/**
 * Filters an ARScene to get only the non-anomaly objects.
 * 
 * This is a utility function that demonstrates how the Ghost Layer
 * state isolation works: it returns all objects that are NOT anomaly
 * overlays, which should remain unchanged regardless of Ghost Layer state.
 * 
 * Per Property 10: Ghost Layer State Isolation - toggling Ghost_Layer 
 * visibility SHALL only affect MagneticAnomaly overlay visibility and 
 * SHALL NOT modify any other ARObject visibility or properties.
 * 
 * @param scene - The AR scene to filter
 * @returns Array of non-anomaly ARObjects
 */
export function getNonAnomalyObjects(scene: ARScene): ARObject[] {
  // All standard ARObjects in the scene are non-anomaly objects
  // Anomaly overlays are rendered separately via the GhostLayerManager
  return [...scene.objects];
}

/**
 * Verifies that toggling Ghost Layer does not affect scene objects.
 * 
 * This is a helper function for testing Property 10: Ghost Layer State Isolation.
 * It compares scene objects before and after a Ghost Layer toggle to ensure
 * they remain identical.
 * 
 * @param sceneBefore - Scene state before toggle
 * @param sceneAfter - Scene state after toggle
 * @returns True if all non-anomaly objects are unchanged
 */
export function verifyStateIsolation(
  sceneBefore: ARScene,
  sceneAfter: ARScene
): boolean {
  const objectsBefore = sceneBefore.objects;
  const objectsAfter = sceneAfter.objects;

  // Check same number of objects
  if (objectsBefore.length !== objectsAfter.length) {
    return false;
  }

  // Check each object is unchanged
  for (let i = 0; i < objectsBefore.length; i++) {
    const before = objectsBefore[i];
    const after = objectsAfter[i];

    // Compare all properties
    if (
      before.id !== after.id ||
      before.type !== after.type ||
      before.modelId !== after.modelId ||
      before.interactable !== after.interactable ||
      before.position.x !== after.position.x ||
      before.position.y !== after.position.y ||
      before.position.z !== after.position.z ||
      before.scale.x !== after.scale.x ||
      before.scale.y !== after.scale.y ||
      before.scale.z !== after.scale.z
    ) {
      return false;
    }
  }

  return true;
}
