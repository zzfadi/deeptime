/**
 * AR Session Manager
 * Manages WebXR session lifecycle and camera passthrough
 * Requirements: 1.2, 1.3
 */

import * as THREE from 'three';
import type {
  ARSessionState,
  IARSessionManager,
  XRSupportLevel,
  CameraPermission,
} from './types';

/**
 * Default initial state for AR session
 */
const DEFAULT_STATE: ARSessionState = {
  isActive: false,
  hasGroundPlane: false,
  groundPlaneAnchor: null,
  cameraPermission: 'prompt',
  xrSupport: 'none',
  groundPlaneY: null,
};

/**
 * Ground plane anchoring tolerance in meters
 * Property 1: Ground Plane Anchoring requires 0.01m tolerance
 */
export const GROUND_PLANE_TOLERANCE = 0.01;

/**
 * ARSessionManager implementation
 * Handles WebXR 'immersive-ar' mode with camera passthrough and hit-testing
 * 
 * Requirements:
 * - 1.2: Initialize WebXR AR session with camera passthrough
 * - 1.3: Anchor 3D content to detected ground plane
 */
export class ARSessionManager implements IARSessionManager {
  private state: ARSessionState = { ...DEFAULT_STATE };
  private xrSession: XRSession | null = null;
  private hitTestSource: XRHitTestSource | null = null;
  private _renderer: THREE.WebGLRenderer | null = null;
  private referenceSpace: XRReferenceSpace | null = null;

  /**
   * Check if AR is supported on this device
   * Requirements: 1.2
   */
  async isSupported(): Promise<boolean> {
    if (!('xr' in navigator) || !navigator.xr) {
      return false;
    }

    try {
      const xr = navigator.xr as XRSystem;
      return await xr.isSessionSupported('immersive-ar');
    } catch {
      return false;
    }
  }

  /**
   * Determine the XR support level
   */
  private async determineXRSupport(): Promise<XRSupportLevel> {
    if (!('xr' in navigator) || !navigator.xr) {
      return 'none';
    }

    try {
      const xr = navigator.xr as XRSystem;
      const arSupported = await xr.isSessionSupported('immersive-ar');
      
      if (arSupported) {
        return 'full';
      }

      // Check for inline AR as limited support
      const inlineSupported = await xr.isSessionSupported('inline');
      if (inlineSupported) {
        return 'limited';
      }

      return 'none';
    } catch {
      return 'none';
    }
  }

  /**
   * Check camera permission status
   */
  private async checkCameraPermission(): Promise<CameraPermission> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state as CameraPermission;
    } catch {
      // Permissions API not supported, assume prompt
      return 'prompt';
    }
  }

  /**
   * Initialize AR session with camera passthrough
   * Requirements: 1.2, 1.3
   */
  async initSession(): Promise<ARSessionState> {
    // Check XR support
    const xrSupport = await this.determineXRSupport();
    this.state.xrSupport = xrSupport;

    if (xrSupport === 'none') {
      this.state.cameraPermission = 'denied';
      return this.state;
    }

    // Check camera permission
    this.state.cameraPermission = await this.checkCameraPermission();

    if (this.state.cameraPermission === 'denied') {
      return this.state;
    }

    try {
      const xr = navigator.xr as XRSystem;

      // Request immersive-ar session with hit-test for ground plane detection
      this.xrSession = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor'],
        optionalFeatures: ['dom-overlay', 'anchors'],
      });

      // Set up session end handler
      this.xrSession.addEventListener('end', this.handleSessionEnd.bind(this));

      // Get reference space for hit testing
      this.referenceSpace = await this.xrSession.requestReferenceSpace('local-floor');

      // Set up hit test source for ground plane detection
      await this.setupHitTestSource();

      this.state.isActive = true;
      this.state.cameraPermission = 'granted';

      return this.state;
    } catch (error) {
      console.error('Failed to initialize AR session:', error);
      
      // Check if it was a permission error
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.state.cameraPermission = 'denied';
      }

      return this.state;
    }
  }

  /**
   * Set up hit test source for ground plane detection
   * Requirements: 1.3
   */
  private async setupHitTestSource(): Promise<void> {
    if (!this.xrSession || !this.referenceSpace) {
      return;
    }

    try {
      // Create a hit test source from viewer space looking down
      const viewerSpace = await this.xrSession.requestReferenceSpace('viewer');
      
      const hitTestSource = await this.xrSession.requestHitTestSource?.({
        space: viewerSpace,
        offsetRay: new XRRay(
          { x: 0, y: 0, z: 0, w: 1 },
          { x: 0, y: -1, z: 0, w: 0 } // Looking down for floor detection
        ),
      });
      
      this.hitTestSource = hitTestSource ?? null;
    } catch (error) {
      console.warn('Hit test source setup failed:', error);
    }
  }

  /**
   * Handle session end event
   */
  private handleSessionEnd(): void {
    this.cleanup();
    this.state = { ...DEFAULT_STATE };
    this.state.xrSupport = 'full'; // Keep XR support status
  }

  /**
   * End AR session and cleanup
   * Requirements: 1.2
   */
  endSession(): void {
    if (this.xrSession) {
      this.xrSession.end().catch(() => {
        // Session may already be ended
      });
    }
    this.cleanup();
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.hitTestSource) {
      this.hitTestSource.cancel();
      this.hitTestSource = null;
    }

    this.xrSession = null;
    this.referenceSpace = null;
    this.state.isActive = false;
    this.state.hasGroundPlane = false;
    this.state.groundPlaneAnchor = null;
    this.state.groundPlaneY = null;
  }

  /**
   * Get current session state
   */
  getState(): ARSessionState {
    return { ...this.state };
  }

  /**
   * Request hit test for ground plane detection
   * Requirements: 1.3
   * 
   * @param _origin - Ray origin in world space (unused in current implementation)
   * @param _direction - Ray direction in world space (unused in current implementation)
   * @returns Array of hit test results
   */
  async requestHitTest(
    _origin: THREE.Vector3,
    _direction: THREE.Vector3
  ): Promise<XRHitTestResult[]> {
    if (!this.xrSession || !this.hitTestSource || !this.referenceSpace) {
      return [];
    }

    // Note: In a real implementation, we would use the XRFrame from the render loop
    // This is a simplified version that demonstrates the interface
    return [];
  }

  /**
   * Process hit test results from XR frame
   * Called during the render loop with the current XR frame
   * Requirements: 1.3
   * 
   * @param frame - Current XR frame
   * @returns Ground plane Y coordinate if detected, null otherwise
   */
  processHitTestResults(frame: XRFrame): number | null {
    if (!this.hitTestSource || !this.referenceSpace) {
      return null;
    }

    const hitTestResults = frame.getHitTestResults(this.hitTestSource);

    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(this.referenceSpace);

      if (pose) {
        const groundY = pose.transform.position.y;
        
        // Update state with ground plane info
        this.state.hasGroundPlane = true;
        this.state.groundPlaneY = groundY;

        return groundY;
      }
    }

    return this.state.groundPlaneY;
  }

  /**
   * Anchor content to the detected ground plane
   * Requirements: 1.3
   * Property 1: Ground Plane Anchoring - Y-position within 0.01m tolerance
   * 
   * @param position - Position to anchor
   * @returns Anchored position with Y aligned to ground plane
   */
  anchorToGroundPlane(position: THREE.Vector3): THREE.Vector3 {
    const anchored = position.clone();

    if (this.state.groundPlaneY !== null) {
      // Align Y to ground plane within tolerance
      anchored.y = this.state.groundPlaneY;
    }

    return anchored;
  }

  /**
   * Check if a position is properly anchored to ground plane
   * Property 1: Ground Plane Anchoring validation
   * 
   * @param position - Position to check
   * @returns True if within tolerance of ground plane
   */
  isAnchoredToGroundPlane(position: THREE.Vector3): boolean {
    if (this.state.groundPlaneY === null) {
      return false;
    }

    const difference = Math.abs(position.y - this.state.groundPlaneY);
    return difference <= GROUND_PLANE_TOLERANCE;
  }

  /**
   * Get the XR session for renderer integration
   */
  getXRSession(): XRSession | null {
    return this.xrSession;
  }

  /**
   * Get the reference space for coordinate transforms
   */
  getReferenceSpace(): XRReferenceSpace | null {
    return this.referenceSpace;
  }

  /**
   * Set the Three.js renderer for XR integration
   */
  setRenderer(renderer: THREE.WebGLRenderer): void {
    this._renderer = renderer;
    
    if (this.xrSession) {
      renderer.xr.setSession(this.xrSession);
    }
  }

  /**
   * Get the current renderer
   */
  getRenderer(): THREE.WebGLRenderer | null {
    return this._renderer;
  }
}

/**
 * Singleton instance for app-wide use
 */
export const arSessionManager = new ARSessionManager();
