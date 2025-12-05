/**
 * Creature Interaction Handler
 * Detects tap/click on creature meshes and triggers interaction animations
 * Requirements: 2.3
 */

import * as THREE from 'three';
import type { CreatureInstance } from './types';
import { creatureManager } from './CreatureManager';

/**
 * CreatureInteractionHandler
 * Handles raycasting for creature selection and tap interactions
 * Requirements: 2.3
 */
export class CreatureInteractionHandler {
  private raycaster: THREE.Raycaster;
  private camera: THREE.Camera | null = null;
  private domElement: HTMLElement | null = null;
  private isEnabled: boolean = true;

  constructor() {
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * Initialize the interaction handler with camera and DOM element
   */
  initialize(camera: THREE.Camera, domElement: HTMLElement): void {
    this.camera = camera;
    this.domElement = domElement;
    this.setupEventListeners();
  }

  /**
   * Set up touch and click event listeners
   * Requirements: 2.3
   */
  private setupEventListeners(): void {
    if (!this.domElement) return;

    // Touch events for mobile
    this.domElement.addEventListener('touchstart', this.handleTouch.bind(this), { passive: false });
    
    // Click events for desktop
    this.domElement.addEventListener('click', this.handleClick.bind(this));
  }

  /**
   * Handle touch events
   * Requirements: 2.3
   */
  private handleTouch(event: TouchEvent): void {
    if (!this.isEnabled || event.touches.length === 0) return;

    const touch = event.touches[0];
    const creature = this.getCreatureAtPosition(touch.clientX, touch.clientY);
    
    if (creature) {
      event.preventDefault();
      this.triggerInteraction(creature);
    }
  }

  /**
   * Handle click events
   * Requirements: 2.3
   */
  private handleClick(event: MouseEvent): void {
    if (!this.isEnabled) return;

    const creature = this.getCreatureAtPosition(event.clientX, event.clientY);
    
    if (creature) {
      this.triggerInteraction(creature);
    }
  }

  /**
   * Get creature at screen position using raycasting
   * Requirements: 2.3
   */
  getCreatureAtPosition(clientX: number, clientY: number): CreatureInstance | null {
    if (!this.camera || !this.domElement) return null;

    // Convert screen coordinates to normalized device coordinates
    const rect = this.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    // Set up raycaster
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // Get all creature meshes
    const instances = creatureManager.getInstances();
    const meshes = instances.map(i => i.mesh);

    // Perform raycast
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      // Find the creature instance for the hit mesh
      const hitObject = intersects[0].object;
      return creatureManager.getInstanceFromMesh(hitObject) || null;
    }

    return null;
  }

  /**
   * Trigger interaction animation on creature
   * Requirements: 2.3
   */
  triggerInteraction(creature: CreatureInstance): void {
    creatureManager.handleTap(creature);
  }

  /**
   * Enable or disable interaction handling
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if interactions are enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    if (this.domElement) {
      this.domElement.removeEventListener('touchstart', this.handleTouch.bind(this));
      this.domElement.removeEventListener('click', this.handleClick.bind(this));
    }
    this.camera = null;
    this.domElement = null;
  }
}

/**
 * Singleton instance for app-wide use
 */
export const creatureInteractionHandler = new CreatureInteractionHandler();
