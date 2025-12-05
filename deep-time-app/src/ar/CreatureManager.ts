/**
 * Creature Manager
 * Handles loading, animation, and interaction of 3D creature models
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type {
  Creature,
  CreatureInstance,
  AnimationType,
  ICreatureManager,
} from './types';
import type { GeologicalEra } from 'deep-time-core/types';
import { getCreaturesForEra } from '../data';

/**
 * Minimum distance between creature centers to prevent overlap
 * Property 5: Creature Distribution Non-Overlap
 */
export const MIN_CREATURE_SPACING = 2.0; // meters

/**
 * Maximum overlap percentage allowed between creature bounding boxes
 * Property 5: Creature Distribution Non-Overlap
 */
export const MAX_OVERLAP_PERCENTAGE = 0.1; // 10%

/**
 * Maximum number of creatures to spawn at once (performance constraint)
 */
const MAX_CREATURES = 3;

/**
 * Default distribution radius for creatures around the user
 */
const DEFAULT_DISTRIBUTION_RADIUS = 5.0; // meters

/**
 * CreatureManager implementation
 * Manages 3D creature models with GLTF loading and skeletal animation
 * 
 * Requirements:
 * - 2.1: Load era-appropriate animated 3D creature models
 * - 2.2: Play idle animations by default
 * - 2.3: Trigger interaction animation on tap
 * - 2.4: Scale creatures accurately relative to real-world dimensions
 * - 2.5: Distribute creatures naturally across ground plane
 */
export class CreatureManager implements ICreatureManager {
  private instances: Map<string, CreatureInstance> = new Map();
  private loader: GLTFLoader;
  private scene: THREE.Scene | null = null;
  private groundPlaneY: number = 0;
  private loadedModels: Map<string, GLTF> = new Map();
  private onCreatureTap: ((instance: CreatureInstance) => void) | null = null;

  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Set the Three.js scene for adding creatures
   */
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  /**
   * Set the ground plane Y coordinate for positioning
   * Property 1: Ground Plane Anchoring
   */
  setGroundPlaneY(y: number): void {
    this.groundPlaneY = y;
  }

  /**
   * Set callback for creature tap events
   * Requirements: 2.3
   */
  setOnCreatureTap(callback: (instance: CreatureInstance) => void): void {
    this.onCreatureTap = callback;
  }

  /**
   * Load creatures for a specific era
   * Requirements: 2.1
   * Property 2: Era-Creature Mapping Consistency
   */
  async loadEraCreatures(era: GeologicalEra): Promise<Creature[]> {
    const creatures = getCreaturesForEra(era.name);
    
    // Validate era-creature mapping (Property 2)
    const validCreatures = creatures.filter(c => c.era === era.name);
    
    // Pre-load models for performance
    await Promise.all(
      validCreatures.slice(0, MAX_CREATURES).map(c => this.preloadModel(c))
    );
    
    return validCreatures;
  }

  /**
   * Pre-load a creature's GLTF model
   */
  private async preloadModel(creature: Creature): Promise<GLTF | null> {
    if (this.loadedModels.has(creature.id)) {
      return this.loadedModels.get(creature.id)!;
    }

    try {
      const gltf = await this.loader.loadAsync(creature.modelUrl);
      this.loadedModels.set(creature.id, gltf);
      return gltf;
    } catch (error) {
      console.warn(`Failed to load model for ${creature.name}:`, error);
      return null;
    }
  }

  /**
   * Spawn creature at position on ground plane
   * Requirements: 2.1, 2.2, 2.4
   * Property 1: Ground Plane Anchoring
   * Property 3: Default Animation State
   * Property 4: Creature Scale Accuracy
   */
  async spawnCreature(
    creature: Creature,
    position: THREE.Vector3
  ): Promise<CreatureInstance> {
    // Load or get cached model
    let gltf = this.loadedModels.get(creature.id);
    if (!gltf) {
      const loaded = await this.preloadModel(creature);
      if (loaded) {
        gltf = loaded;
      }
    }

    // Create mesh group
    const mesh = gltf ? gltf.scene.clone() : this.createPlaceholderMesh(creature);
    
    // Apply real-world scale (Property 4: Creature Scale Accuracy)
    // Scale is in meters, Three.js units are also meters
    const scaleFactor = creature.scale;
    mesh.scale.setScalar(scaleFactor);

    // Position on ground plane (Property 1: Ground Plane Anchoring)
    const anchoredPosition = position.clone();
    anchoredPosition.y = this.groundPlaneY;
    mesh.position.copy(anchoredPosition);

    // Create animation mixer
    const mixer = new THREE.AnimationMixer(mesh);
    
    // Set up idle animation by default (Property 3: Default Animation State)
    if (gltf && gltf.animations.length > 0) {
      const idleClip = this.findAnimation(gltf.animations, 'idle');
      if (idleClip) {
        const action = mixer.clipAction(idleClip);
        action.play();
      }
    }

    // Calculate bounding box for collision detection
    const boundingBox = new THREE.Box3().setFromObject(mesh);

    // Create instance
    const instance: CreatureInstance = {
      id: `${creature.id}-${Date.now()}`,
      creature,
      mesh,
      mixer,
      position: anchoredPosition,
      currentAnimation: 'idle', // Property 3: Default Animation State
      boundingBox,
    };

    // Add to scene
    if (this.scene) {
      this.scene.add(mesh);
    }

    // Store instance
    this.instances.set(instance.id, instance);

    // Set up interaction
    mesh.userData.creatureInstanceId = instance.id;

    return instance;
  }

  /**
   * Create a placeholder mesh when model fails to load
   */
  private createPlaceholderMesh(creature: Creature): THREE.Group {
    const group = new THREE.Group();
    
    // Simple box as placeholder
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x888888,
      wireframe: true 
    });
    const box = new THREE.Mesh(geometry, material);
    group.add(box);
    
    // Add label
    console.log(`Placeholder created for: ${creature.name}`);
    
    return group;
  }

  /**
   * Find animation clip by name
   */
  private findAnimation(
    animations: THREE.AnimationClip[],
    name: AnimationType
  ): THREE.AnimationClip | null {
    // Try exact match first
    let clip = animations.find(a => a.name.toLowerCase() === name.toLowerCase());
    
    // Try partial match
    if (!clip) {
      clip = animations.find(a => a.name.toLowerCase().includes(name.toLowerCase()));
    }
    
    // Fall back to first animation
    if (!clip && animations.length > 0) {
      clip = animations[0];
    }
    
    return clip || null;
  }

  /**
   * Play animation on creature
   * Requirements: 2.2, 2.3
   */
  playAnimation(instance: CreatureInstance, animation: AnimationType): void {
    const gltf = this.loadedModels.get(instance.creature.id);
    if (!gltf || gltf.animations.length === 0) {
      return;
    }

    const clip = this.findAnimation(gltf.animations, animation);
    if (!clip) {
      return;
    }

    // Stop current animation
    instance.mixer.stopAllAction();

    // Play new animation
    const action = instance.mixer.clipAction(clip);
    action.reset();
    action.play();

    // Update instance state
    instance.currentAnimation = animation;
  }

  /**
   * Handle tap interaction on creature
   * Requirements: 2.3
   */
  handleTap(instance: CreatureInstance): void {
    // Determine interaction animation based on creature's available animations
    const interactionAnimations: AnimationType[] = ['roar', 'attention', 'trumpet'];
    const availableInteraction = interactionAnimations.find(
      anim => instance.creature.animations.includes(anim)
    );

    if (availableInteraction) {
      this.playAnimation(instance, availableInteraction);
      
      // Return to idle after interaction
      setTimeout(() => {
        if (this.instances.has(instance.id)) {
          this.playAnimation(instance, 'idle');
        }
      }, 3000);
    }

    // Trigger callback
    if (this.onCreatureTap) {
      this.onCreatureTap(instance);
    }
  }

  /**
   * Update all creature animations (called per frame)
   * Requirements: 2.2
   */
  update(deltaTime: number): void {
    for (const instance of this.instances.values()) {
      instance.mixer.update(deltaTime);
      
      // Update bounding box after animation
      instance.boundingBox.setFromObject(instance.mesh);
    }
  }

  /**
   * Clear all creatures (for era transition)
   * Requirements: 3.4
   */
  clearAll(): void {
    for (const instance of this.instances.values()) {
      if (this.scene) {
        this.scene.remove(instance.mesh);
      }
      instance.mixer.stopAllAction();
    }
    this.instances.clear();
  }

  /**
   * Get all active creature instances
   */
  getInstances(): CreatureInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get instance by ID
   */
  getInstance(id: string): CreatureInstance | undefined {
    return this.instances.get(id);
  }

  /**
   * Get instance from mesh (for raycasting)
   */
  getInstanceFromMesh(mesh: THREE.Object3D): CreatureInstance | undefined {
    // Traverse up to find creature instance ID
    let current: THREE.Object3D | null = mesh;
    while (current) {
      if (current.userData.creatureInstanceId) {
        return this.instances.get(current.userData.creatureInstanceId);
      }
      current = current.parent;
    }
    return undefined;
  }

  /**
   * Despawn a specific creature
   */
  despawnCreature(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    if (this.scene) {
      this.scene.remove(instance.mesh);
    }
    instance.mixer.stopAllAction();
    this.instances.delete(instanceId);
  }

  /**
   * Calculate overlap percentage between two bounding boxes
   * Property 5: Creature Distribution Non-Overlap
   * 
   * @returns Overlap percentage (0-1) relative to smaller box volume
   */
  calculateOverlapPercentage(box1: THREE.Box3, box2: THREE.Box3): number {
    // Check if boxes intersect at all
    if (!box1.intersectsBox(box2)) {
      return 0;
    }

    // Calculate intersection box
    const intersection = box1.clone().intersect(box2);
    
    // Calculate volumes
    const size1 = new THREE.Vector3();
    const size2 = new THREE.Vector3();
    const intersectionSize = new THREE.Vector3();
    
    box1.getSize(size1);
    box2.getSize(size2);
    intersection.getSize(intersectionSize);
    
    const volume1 = size1.x * size1.y * size1.z;
    const volume2 = size2.x * size2.y * size2.z;
    const intersectionVolume = intersectionSize.x * intersectionSize.y * intersectionSize.z;
    
    // Return overlap as percentage of smaller box
    const smallerVolume = Math.min(volume1, volume2);
    if (smallerVolume === 0) return 0;
    
    return intersectionVolume / smallerVolume;
  }

  /**
   * Check if a position would cause overlap with existing creatures
   * Property 5: Creature Distribution Non-Overlap
   * 
   * @param position - Proposed position for new creature
   * @param creatureScale - Scale of the creature to spawn
   * @returns True if position is valid (no significant overlap)
   */
  isPositionValid(position: THREE.Vector3, creatureScale: number): boolean {
    // Create approximate bounding box for new creature
    const halfSize = creatureScale / 2;
    const newBox = new THREE.Box3(
      new THREE.Vector3(
        position.x - halfSize,
        position.y,
        position.z - halfSize
      ),
      new THREE.Vector3(
        position.x + halfSize,
        position.y + creatureScale,
        position.z + halfSize
      )
    );

    // Check against all existing creatures
    for (const instance of this.instances.values()) {
      const overlap = this.calculateOverlapPercentage(newBox, instance.boundingBox);
      if (overlap > MAX_OVERLAP_PERCENTAGE) {
        return false;
      }
    }

    return true;
  }

  /**
   * Find a valid position for a creature that doesn't overlap with others
   * Property 5: Creature Distribution Non-Overlap
   * 
   * @param creatureScale - Scale of the creature to spawn
   * @param center - Center point to distribute around
   * @param maxAttempts - Maximum attempts to find valid position
   * @returns Valid position or null if none found
   */
  findValidPosition(
    creatureScale: number,
    center: THREE.Vector3 = new THREE.Vector3(0, 0, -3),
    maxAttempts: number = 20
  ): THREE.Vector3 | null {
    for (let i = 0; i < maxAttempts; i++) {
      // Generate random position in a circle around center
      const angle = Math.random() * Math.PI * 2;
      const distance = MIN_CREATURE_SPACING + Math.random() * (DEFAULT_DISTRIBUTION_RADIUS - MIN_CREATURE_SPACING);
      
      const position = new THREE.Vector3(
        center.x + Math.cos(angle) * distance,
        this.groundPlaneY,
        center.z + Math.sin(angle) * distance
      );

      if (this.isPositionValid(position, creatureScale)) {
        return position;
      }
    }

    return null;
  }

  /**
   * Distribute creatures across the ground plane without overlap
   * Requirements: 2.4, 2.5
   * Property 5: Creature Distribution Non-Overlap
   * 
   * @param creatures - Array of creatures to spawn
   * @param center - Center point to distribute around
   * @returns Array of spawned creature instances
   */
  async distributeCreatures(
    creatures: Creature[],
    center: THREE.Vector3 = new THREE.Vector3(0, 0, -3)
  ): Promise<CreatureInstance[]> {
    const spawnedInstances: CreatureInstance[] = [];
    const toSpawn = creatures.slice(0, MAX_CREATURES);

    for (const creature of toSpawn) {
      const position = this.findValidPosition(creature.scale, center);
      
      if (position) {
        const instance = await this.spawnCreature(creature, position);
        spawnedInstances.push(instance);
      } else {
        console.warn(`Could not find valid position for ${creature.name}`);
      }
    }

    return spawnedInstances;
  }

  /**
   * Validate that no creatures overlap more than allowed
   * Property 5: Creature Distribution Non-Overlap
   * 
   * @returns True if all creatures are properly distributed
   */
  validateDistribution(): boolean {
    const instances = Array.from(this.instances.values());
    
    for (let i = 0; i < instances.length; i++) {
      for (let j = i + 1; j < instances.length; j++) {
        const overlap = this.calculateOverlapPercentage(
          instances[i].boundingBox,
          instances[j].boundingBox
        );
        
        if (overlap > MAX_OVERLAP_PERCENTAGE) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Scale creature to real-world dimensions
   * Requirements: 2.4
   * Property 4: Creature Scale Accuracy
   * 
   * @param instance - Creature instance to scale
   * @param targetScale - Target real-world scale in meters
   */
  scaleCreature(instance: CreatureInstance, targetScale: number): void {
    instance.mesh.scale.setScalar(targetScale);
    instance.boundingBox.setFromObject(instance.mesh);
  }

  /**
   * Get the effective scale of a creature instance
   * Property 4: Creature Scale Accuracy
   */
  getCreatureScale(instance: CreatureInstance): number {
    return instance.mesh.scale.x; // Assuming uniform scale
  }

  /**
   * Set opacity for all creatures
   * Requirements: 3.4 - Fade out/in creatures during transition
   * 
   * @param opacity - Target opacity (0-1)
   */
  setAllCreaturesOpacity(opacity: number): void {
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    
    for (const instance of this.instances.values()) {
      this.setCreatureOpacity(instance, clampedOpacity);
    }
  }

  /**
   * Set opacity for a single creature instance
   * Requirements: 3.4
   * 
   * @param instance - Creature instance to modify
   * @param opacity - Target opacity (0-1)
   */
  setCreatureOpacity(instance: CreatureInstance, opacity: number): void {
    instance.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) 
          ? child.material 
          : [child.material];
        
        for (const material of materials) {
          if (material instanceof THREE.Material) {
            material.transparent = true;
            if ('opacity' in material) {
              (material as THREE.MeshBasicMaterial).opacity = opacity;
            }
          }
        }
      }
    });
  }

  /**
   * Fade out all creatures over a duration
   * Requirements: 3.4 - Fade out current creatures
   * 
   * @param duration - Fade duration in milliseconds
   * @returns Promise that resolves when fade completes
   */
  fadeOutAll(duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        const opacity = 1 - progress;
        
        this.setAllCreaturesOpacity(opacity);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  /**
   * Fade in all creatures over a duration
   * Requirements: 3.4 - Fade in new era creatures
   * 
   * @param duration - Fade duration in milliseconds
   * @returns Promise that resolves when fade completes
   */
  fadeInAll(duration: number): Promise<void> {
    // Start with opacity 0
    this.setAllCreaturesOpacity(0);
    
    return new Promise((resolve) => {
      const startTime = performance.now();
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        
        this.setAllCreaturesOpacity(progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  /**
   * Swap creatures for a new era with fade transition
   * Requirements: 3.4 - Fade out current creatures, load and fade in new era creatures
   * 
   * @param newEra - The geological era to load creatures for
   * @param fadeDuration - Duration for each fade (in/out) in milliseconds
   * @param center - Center point to distribute creatures around
   * @returns Promise that resolves with new creature instances
   */
  async swapCreaturesForEra(
    newEra: { name: string },
    fadeDuration: number = 500,
    center: THREE.Vector3 = new THREE.Vector3(0, 0, -3)
  ): Promise<CreatureInstance[]> {
    // Fade out current creatures
    if (this.instances.size > 0) {
      await this.fadeOutAll(fadeDuration);
    }
    
    // Clear current creatures
    this.clearAll();
    
    // Load new creatures for the era
    const creatures = getCreaturesForEra(newEra.name);
    
    if (creatures.length === 0) {
      return [];
    }
    
    // Spawn new creatures (they start invisible)
    const newInstances = await this.distributeCreatures(creatures, center);
    
    // Fade in new creatures
    if (newInstances.length > 0) {
      await this.fadeInAll(fadeDuration);
    }
    
    return newInstances;
  }
}

/**
 * Singleton instance for app-wide use
 */
export const creatureManager = new CreatureManager();
