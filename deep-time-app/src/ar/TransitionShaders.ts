/**
 * Transition Shader Effects
 * Custom shaders for era transition visual effects
 * Requirements: 3.2, 3.3
 */

import * as THREE from 'three';
import type { TransitionEffectType } from './types';

/**
 * Dissolve shader for going to past (older eras)
 * Requirements: 3.2 - "dissolve into the past" visual effect
 * 
 * Creates a particle-like dissolve effect where the scene
 * appears to break apart and fade into the past
 */
export const dissolveVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const dissolveFragmentShader = `
  uniform float uProgress;
  uniform float uTime;
  uniform sampler2D uTexture;
  uniform vec3 uDissolveColor;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  // Noise function for organic dissolve pattern
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Create dissolve pattern using noise
    float noiseValue = noise(vUv * 10.0 + uTime * 0.5);
    
    // Threshold based on progress
    float threshold = uProgress;
    
    // Edge glow effect
    float edge = smoothstep(threshold - 0.1, threshold, noiseValue);
    float edgeGlow = smoothstep(threshold - 0.15, threshold - 0.05, noiseValue) - edge;
    
    // Discard pixels that have dissolved
    if (noiseValue < threshold) {
      discard;
    }
    
    // Add amber/sepia glow at dissolve edge (going into the past)
    vec3 glowColor = uDissolveColor * edgeGlow * 2.0;
    vec3 finalColor = texColor.rgb + glowColor;
    
    gl_FragColor = vec4(finalColor, texColor.a * edge);
  }
`;


/**
 * Emerge shader for going to future (newer eras)
 * Requirements: 3.3 - "emerge from the past" visual effect
 * 
 * Creates a crystallization/materialization effect where the scene
 * appears to form and solidify from particles
 */
export const emergeVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const emergeFragmentShader = `
  uniform float uProgress;
  uniform float uTime;
  uniform sampler2D uTexture;
  uniform vec3 uEmergeColor;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  // Noise function for organic emerge pattern
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  void main() {
    vec4 texColor = texture2D(uTexture, vUv);
    
    // Create emerge pattern using noise (inverse of dissolve)
    float noiseValue = noise(vUv * 10.0 + uTime * 0.5);
    
    // Threshold based on progress (inverted for emerge effect)
    float threshold = 1.0 - uProgress;
    
    // Edge glow effect
    float edge = smoothstep(threshold, threshold + 0.1, noiseValue);
    float edgeGlow = smoothstep(threshold + 0.05, threshold + 0.15, noiseValue) - edge;
    
    // Discard pixels that haven't emerged yet
    if (noiseValue < threshold) {
      discard;
    }
    
    // Add blue/cyan glow at emerge edge (coming from the past)
    vec3 glowColor = uEmergeColor * (1.0 - edge) * 2.0;
    vec3 finalColor = texColor.rgb + glowColor;
    
    gl_FragColor = vec4(finalColor, texColor.a * edge);
  }
`;

/**
 * Default colors for transition effects
 */
export const DISSOLVE_COLOR = new THREE.Color(0xd4a574); // Amber/sepia for past
export const EMERGE_COLOR = new THREE.Color(0x74b4d4);   // Cyan/blue for future

/**
 * Create a dissolve shader material
 * Requirements: 3.2
 * 
 * @param texture - Optional texture to apply effect to
 * @returns ShaderMaterial configured for dissolve effect
 */
export function createDissolveShaderMaterial(
  texture?: THREE.Texture
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uTexture: { value: texture || null },
      uDissolveColor: { value: DISSOLVE_COLOR },
    },
    vertexShader: dissolveVertexShader,
    fragmentShader: dissolveFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  });
}

/**
 * Create an emerge shader material
 * Requirements: 3.3
 * 
 * @param texture - Optional texture to apply effect to
 * @returns ShaderMaterial configured for emerge effect
 */
export function createEmergeShaderMaterial(
  texture?: THREE.Texture
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0.0 },
      uTime: { value: 0.0 },
      uTexture: { value: texture || null },
      uEmergeColor: { value: EMERGE_COLOR },
    },
    vertexShader: emergeVertexShader,
    fragmentShader: emergeFragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  });
}


/**
 * Create shader material based on effect type
 * Property 7: Transition Effect Direction
 * 
 * @param effectType - 'dissolve' for past, 'emerge' for future
 * @param texture - Optional texture to apply effect to
 * @returns Appropriate ShaderMaterial for the effect type
 */
export function createTransitionShaderMaterial(
  effectType: TransitionEffectType,
  texture?: THREE.Texture
): THREE.ShaderMaterial {
  switch (effectType) {
    case 'dissolve':
      return createDissolveShaderMaterial(texture);
    case 'emerge':
      return createEmergeShaderMaterial(texture);
    case 'ripple':
      // Ripple effect uses dissolve as fallback for now
      return createDissolveShaderMaterial(texture);
    default:
      return createDissolveShaderMaterial(texture);
  }
}

/**
 * TransitionEffectManager
 * Manages shader-based transition effects for the AR scene
 * Requirements: 3.2, 3.3
 */
export class TransitionEffectManager {
  private scene: THREE.Scene | null = null;
  private effectMaterial: THREE.ShaderMaterial | null = null;
  private originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();
  private startTime: number = 0;
  private isActive: boolean = false;
  private animationFrameId: number | null = null;

  /**
   * Set the Three.js scene
   */
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  /**
   * Start a transition effect
   * Requirements: 3.2, 3.3
   * 
   * @param effectType - Type of effect ('dissolve' or 'emerge')
   * @param duration - Duration in milliseconds
   * @param onComplete - Callback when effect completes
   */
  startEffect(
    effectType: TransitionEffectType,
    duration: number,
    onComplete?: () => void
  ): void {
    if (!this.scene || this.isActive) return;

    this.isActive = true;
    this.startTime = performance.now();
    this.effectMaterial = createTransitionShaderMaterial(effectType);

    // Store original materials and apply effect material
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        this.originalMaterials.set(object, object.material);
        object.material = this.effectMaterial!;
      }
    });

    // Animate the effect
    const animate = () => {
      const elapsed = performance.now() - this.startTime;
      const progress = Math.min(1, elapsed / duration);

      if (this.effectMaterial) {
        this.effectMaterial.uniforms.uProgress.value = progress;
        this.effectMaterial.uniforms.uTime.value = elapsed / 1000;
      }

      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.stopEffect();
        onComplete?.();
      }
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Stop the current effect and restore original materials
   */
  stopEffect(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Restore original materials
    for (const [mesh, material] of this.originalMaterials) {
      mesh.material = material;
    }
    this.originalMaterials.clear();

    // Dispose effect material
    if (this.effectMaterial) {
      this.effectMaterial.dispose();
      this.effectMaterial = null;
    }

    this.isActive = false;
  }

  /**
   * Check if an effect is currently active
   */
  isEffectActive(): boolean {
    return this.isActive;
  }

  /**
   * Update effect progress manually (for external control)
   * 
   * @param progress - Progress value (0-1)
   */
  setProgress(progress: number): void {
    if (this.effectMaterial) {
      this.effectMaterial.uniforms.uProgress.value = Math.max(0, Math.min(1, progress));
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.stopEffect();
    this.scene = null;
  }
}

/**
 * Singleton instance for app-wide use
 */
export const transitionEffectManager = new TransitionEffectManager();
