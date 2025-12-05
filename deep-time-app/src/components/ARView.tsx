/**
 * ARView Component
 * WebXR-based AR visualization for geological eras
 * Requirements: 4.4 - Offer AR view option when WebXR is supported
 * Requirements: 1.1 - Sync era selection with time slider and location with geological data
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { GeologicalLayer, Narrative } from 'deep-time-core/types';
import { useAppStore, getEraBoundaries } from '../store/appStore';
import { ARTimeSlider, AROverlay } from './index';
import { useIdleFade } from '../hooks';

export interface ARViewProps {
  /** The geological era to visualize */
  era: GeologicalLayer;
  /** The narrative for this era */
  narrative: Narrative | null;
  /** Callback when exiting AR view */
  onExit: () => void;
}

/**
 * Get era-appropriate 3D scene configuration
 * Returns colors and objects based on the geological era
 */
function getEraSceneConfig(eraName: string): {
  groundColor: number;
  skyColor: number;
  fogColor: number;
  objectColor: number;
  objectType: 'tree' | 'rock' | 'crystal' | 'fern';
} {
  const name = eraName.toLowerCase();
  
  if (name.includes('quaternary') || name.includes('holocene') || name.includes('pleistocene')) {
    return {
      groundColor: 0x3d5c3d,
      skyColor: 0x87ceeb,
      fogColor: 0xcccccc,
      objectColor: 0x228b22,
      objectType: 'tree',
    };
  }
  
  if (name.includes('cretaceous') || name.includes('jurassic') || name.includes('triassic')) {
    return {
      groundColor: 0x4a6741,
      skyColor: 0x98d1e8,
      fogColor: 0xaaddaa,
      objectColor: 0x2e8b57,
      objectType: 'fern',
    };
  }
  
  if (name.includes('permian') || name.includes('carboniferous')) {
    return {
      groundColor: 0x5c4033,
      skyColor: 0x708090,
      fogColor: 0x888888,
      objectColor: 0x556b2f,
      objectType: 'fern',
    };
  }
  
  if (name.includes('precambrian') || name.includes('archean') || name.includes('proterozoic')) {
    return {
      groundColor: 0x8b4513,
      skyColor: 0xff6347,
      fogColor: 0xcd853f,
      objectColor: 0x9932cc,
      objectType: 'crystal',
    };
  }
  
  // Default for other eras
  return {
    groundColor: 0x696969,
    skyColor: 0xb0c4de,
    fogColor: 0x999999,
    objectColor: 0x808080,
    objectType: 'rock',
  };
}

/**
 * Create a simple 3D object based on type
 */
function createEraObject(
  type: 'tree' | 'rock' | 'crystal' | 'fern',
  color: number
): THREE.Group {
  const group = new THREE.Group();
  
  switch (type) {
    case 'tree': {
      // Simple tree: cylinder trunk + cone foliage
      const trunkGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.2, 8);
      const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
      const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
      trunk.position.y = 0.1;
      
      const foliageGeometry = new THREE.ConeGeometry(0.1, 0.2, 8);
      const foliageMaterial = new THREE.MeshLambertMaterial({ color });
      const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
      foliage.position.y = 0.3;
      
      group.add(trunk);
      group.add(foliage);
      break;
    }
    
    case 'fern': {
      // Simple fern: multiple flat planes arranged in a fan
      const fernMaterial = new THREE.MeshLambertMaterial({ 
        color, 
        side: THREE.DoubleSide 
      });
      
      for (let i = 0; i < 5; i++) {
        const leafGeometry = new THREE.PlaneGeometry(0.05, 0.15);
        const leaf = new THREE.Mesh(leafGeometry, fernMaterial);
        leaf.rotation.y = (i / 5) * Math.PI;
        leaf.rotation.x = -0.3;
        leaf.position.y = 0.08;
        group.add(leaf);
      }
      break;
    }
    
    case 'rock': {
      // Simple rock: dodecahedron
      const rockGeometry = new THREE.DodecahedronGeometry(0.08, 0);
      const rockMaterial = new THREE.MeshLambertMaterial({ color });
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      rock.position.y = 0.04;
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      group.add(rock);
      break;
    }
    
    case 'crystal': {
      // Simple crystal: octahedron
      const crystalGeometry = new THREE.OctahedronGeometry(0.06, 0);
      const crystalMaterial = new THREE.MeshLambertMaterial({ 
        color, 
        transparent: true, 
        opacity: 0.8 
      });
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      crystal.position.y = 0.06;
      group.add(crystal);
      break;
    }
  }
  
  return group;
}

/**
 * Era info overlay component (legacy - shows narrative at bottom)
 */
function EraInfoOverlay({ era, narrative }: { era: GeologicalLayer; narrative: Narrative | null }) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 bg-black/70 backdrop-blur-sm rounded-xl p-4 safe-bottom">
      <h2 className="text-lg font-bold text-white mb-1">{era.era.name}</h2>
      <p className="text-sm text-gray-300 mb-2">{era.era.period}</p>
      {narrative && (
        <p className="text-xs text-gray-400 line-clamp-2">
          {narrative.shortDescription}
        </p>
      )}
    </div>
  );
}

/**
 * Exit AR button - always visible at bottom
 */
function ExitARButton({ onExit }: { onExit: () => void }) {
  return (
    <button
      onClick={onExit}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-full shadow-lg flex items-center gap-2 safe-bottom"
      aria-label="Exit AR"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      Exit AR
    </button>
  );
}

/**
 * Loading overlay for AR initialization
 */
function ARLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-40 bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-lg">Initializing AR...</p>
        <p className="text-gray-400 text-sm mt-2">Point your camera at a flat surface</p>
      </div>
    </div>
  );
}

/**
 * Error overlay for AR failures
 */
function ARErrorOverlay({ message, onExit }: { message: string; onExit: () => void }) {
  return (
    <div className="fixed inset-0 z-40 bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">AR Not Available</h2>
        <p className="text-gray-400 mb-6">{message}</p>
        <button
          onClick={onExit}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
        >
          Return to Details
        </button>
      </div>
    </div>
  );
}



/**
 * ARView Component
 * Renders an immersive AR experience for geological eras using WebXR
 * 
 * Requirements:
 * - 4.4: Offer AR view option when WebXR is supported
 * - 1.1: Sync era selection with time slider and location with geological data
 * - Initialize WebXR session
 * - Render simple era-appropriate 3D scene
 * - Exit button overlay
 */
export function ARView({ era, narrative, onExit }: ARViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const xrSessionRef = useRef<XRSession | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Connect to app state for era selection sync
  // Requirements: 1.1 - Sync era selection with time slider
  const { 
    geologicalStack, 
    timePosition, 
    setTimePosition,
    currentEra 
  } = useAppStore();

  // Get era boundaries for the time slider
  const eraBoundaries = getEraBoundaries(geologicalStack);

  // Use idle fade hook for UI elements
  // Requirements: 6.4, 6.5 - Fade UI on idle, restore on touch
  const { opacity, resetIdleTimer } = useIdleFade({
    idleTimeout: 5000,
    idleOpacity: 0.5,
  });

  // Handle time slider change with transition effect
  const handleTimeChange = useCallback((yearsAgo: number) => {
    resetIdleTimer(); // Reset idle timer on interaction
    
    // Check if this is a significant era change
    const currentYearsAgo = currentEra?.era.yearsAgo ?? 0;
    const isSignificantChange = Math.abs(yearsAgo - currentYearsAgo) > 1000000;
    
    if (isSignificantChange) {
      setIsTransitioning(true);
      // Simulate transition effect duration
      setTimeout(() => {
        setTimePosition(yearsAgo);
        setIsTransitioning(false);
      }, 500);
    } else {
      setTimePosition(yearsAgo);
    }
  }, [currentEra, setTimePosition, resetIdleTimer]);

  // Use the current era from app state (synced with time slider)
  const displayEra = currentEra ?? era;

  /**
   * Initialize Three.js scene with era-appropriate objects
   */
  const initScene = useCallback(() => {
    const scene = new THREE.Scene();
    const config = getEraSceneConfig(displayEra.era.name);
    
    // Set scene background and fog
    scene.background = new THREE.Color(config.skyColor);
    scene.fog = new THREE.Fog(config.fogColor, 1, 10);
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Add directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 1);
    scene.add(directionalLight);
    
    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: config.groundColor });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);
    
    // Add era-appropriate objects in a circle around the user
    const objectCount = 8;
    const radius = 1.5;
    
    for (let i = 0; i < objectCount; i++) {
      const angle = (i / objectCount) * Math.PI * 2;
      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.3;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.3;
      
      const object = createEraObject(config.objectType, config.objectColor);
      object.position.set(x, 0, z);
      object.scale.setScalar(0.8 + Math.random() * 0.4);
      scene.add(object);
    }
    
    return scene;
  }, [displayEra.era.name]);

  /**
   * Initialize WebXR session
   */
  const initWebXR = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      // Check WebXR support
      if (!navigator.xr) {
        throw new Error('WebXR is not supported on this device');
      }
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const xr = navigator.xr as any;
      const isSupported = await xr.isSessionSupported('immersive-ar');
      
      if (!isSupported) {
        throw new Error('Immersive AR is not supported on this device');
      }
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true 
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.xr.enabled = true;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
      );
      cameraRef.current = camera;
      
      // Create scene
      const scene = initScene();
      sceneRef.current = scene;
      
      // Request XR session
      const session = await xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test', 'local-floor'],
        optionalFeatures: ['dom-overlay'],
        domOverlay: { root: containerRef.current },
      });
      
      xrSessionRef.current = session;
      renderer.xr.setSession(session);
      
      // Handle session end
      session.addEventListener('end', () => {
        onExit();
      });
      
      // Animation loop
      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
      });
      
      setIsLoading(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize AR';
      setError(message);
      setIsLoading(false);
    }
  }, [initScene, onExit]);

  /**
   * Cleanup WebXR session and Three.js resources
   */
  const cleanup = useCallback(() => {
    if (xrSessionRef.current) {
      xrSessionRef.current.end().catch(() => {});
      xrSessionRef.current = null;
    }
    
    if (rendererRef.current) {
      rendererRef.current.setAnimationLoop(null);
      rendererRef.current.dispose();
      if (rendererRef.current.domElement.parentNode) {
        rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current = null;
    }
    
    if (sceneRef.current) {
      sceneRef.current.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (object.material instanceof THREE.Material) {
            object.material.dispose();
          }
        }
      });
      sceneRef.current = null;
    }
  }, []);

  /**
   * Handle exit button click
   */
  const handleExit = useCallback(() => {
    cleanup();
    onExit();
  }, [cleanup, onExit]);

  // Initialize WebXR on mount
  useEffect(() => {
    initWebXR();
    
    return () => {
      cleanup();
    };
  }, [initWebXR, cleanup]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current && cameraRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show error state
  if (error) {
    return <ARErrorOverlay message={error} onExit={handleExit} />;
  }

  return (
    <div className="fixed inset-0 z-30" onTouchStart={resetIdleTimer} onClick={resetIdleTimer}>
      {/* Three.js canvas container */}
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Loading overlay */}
      {isLoading && <ARLoadingOverlay />}
      
      {/* UI overlays (visible when AR is active) */}
      {/* Requirements: 6.1, 6.2, 6.3, 6.4, 6.5 - AR UI overlay with fade on idle */}
      {!isLoading && (
        <>
          {/* AR Overlay with era info and exit button */}
          <AROverlay
            eraName={displayEra.era.name}
            eraPeriod={displayEra.era.period}
            yearsAgo={displayEra.era.yearsAgo}
            onExit={handleExit}
            opacity={opacity}
            isTransitioning={isTransitioning}
          />
          
          {/* AR Time Slider - synced with app state */}
          {/* Requirements: 6.1 - Compact time slider on left edge */}
          {eraBoundaries.length > 0 && (
            <ARTimeSlider
              value={timePosition}
              onChange={handleTimeChange}
              eraBoundaries={eraBoundaries}
              snapToEra={true}
              enableHaptics={true}
              disabled={isTransitioning}
              opacity={opacity}
            />
          )}
          
          {/* Legacy era info overlay for narrative display */}
          <EraInfoOverlay era={displayEra} narrative={narrative} />
          
          {/* Always visible Exit AR button */}
          <ExitARButton onExit={handleExit} />
        </>
      )}
    </div>
  );
}

export default ARView;
