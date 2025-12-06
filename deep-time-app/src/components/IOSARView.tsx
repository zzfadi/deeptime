/**
 * iOS AR View Component
 * Uses model-viewer for 3D viewing on iOS devices since WebXR is not supported
 * Note: Full AR Quick Look requires USDZ files - this provides interactive 3D viewing
 * Requirements: 1.4, 1.5 - Fallback AR experience for iOS
 */

import { useEffect, useState } from 'react';
import type { GeologicalLayer, Narrative } from 'deep-time-core/types';
import { getCreaturesForEra } from '../data';

export interface IOSARViewProps {
  era: GeologicalLayer;
  narrative: Narrative | null;
  onExit: () => void;
}

/**
 * iOS AR View using model-viewer
 * Provides interactive 3D model viewing on iOS
 * Full AR would require USDZ files for AR Quick Look
 */
export function IOSARView({ era, onExit }: IOSARViewProps) {
  const [selectedCreature, setSelectedCreature] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const creatures = getCreaturesForEra(era.era.name);

  useEffect(() => {
    // Load model-viewer script if not already loaded
    if (!customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      script.onload = () => setModelLoaded(true);
      document.head.appendChild(script);
    } else {
      setModelLoaded(true);
    }
  }, []);

  // Reset model loaded state when creature changes
  useEffect(() => {
    setModelLoaded(false);
    const timer = setTimeout(() => setModelLoaded(true), 100);
    return () => clearTimeout(timer);
  }, [selectedCreature]);

  const currentCreature = creatures[selectedCreature];

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-deep-900 via-deep-800 to-deep-900 z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-black/50 backdrop-blur-sm z-10 safe-top">
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white active:bg-white/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Back
          </button>
          <div className="text-white text-right">
            <div className="font-semibold">{era.era.name}</div>
            <div className="text-sm text-gray-300">{era.era.period}</div>
          </div>
        </div>
      </div>

      {/* 3D Model Viewer */}
      {currentCreature ? (
        <div className="absolute top-24 left-0 right-0 bottom-56 flex items-center justify-center">
          {modelLoaded ? (
            <model-viewer
              src={currentCreature.modelUrl}
              alt={currentCreature.name}
              camera-controls
              touch-action="pan-y"
              auto-rotate
              style={{ 
                width: '100%', 
                height: '100%',
                backgroundColor: 'transparent'
              }}
            />
          ) : (
            <div className="text-white text-center">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
              <p>Loading 3D model...</p>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute top-24 left-0 right-0 bottom-56 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="text-6xl mb-4">🦕</div>
            <p className="text-gray-400">No creatures available for this era</p>
          </div>
        </div>
      )}

      {/* Instructions banner */}
      <div className="absolute top-20 left-4 right-4 mt-2 bg-blue-600/80 backdrop-blur-sm rounded-lg p-3 text-white text-sm z-10">
        <p className="text-center">
          <span className="font-semibold">🔄 Interactive 3D View</span> — Pinch to zoom, drag to rotate
        </p>
      </div>

      {/* Creature Info - fixed at bottom */}
      {currentCreature && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent safe-bottom">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <h3 className="text-white font-semibold text-lg mb-1">{currentCreature.name}</h3>
            <p className="text-gray-300 text-sm mb-2">{currentCreature.scientificName}</p>
            <p className="text-gray-200 text-sm line-clamp-2">{currentCreature.description}</p>
            
            {/* Creature selector */}
            {creatures.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {creatures.map((creature, index) => (
                  <button
                    key={creature.id}
                    onClick={() => setSelectedCreature(index)}
                    className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      index === selectedCreature
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {creature.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default IOSARView;
