/**
 * iOS AR View Component
 * Uses model-viewer for AR on iOS devices since WebXR is not supported
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
 * This provides a basic AR experience on iOS using the model-viewer web component
 */
export function IOSARView({ era, onExit }: IOSARViewProps) {
  const [selectedCreature, setSelectedCreature] = useState(0);
  const creatures = getCreaturesForEra(era.era.name);

  useEffect(() => {
    // Load model-viewer script if not already loaded
    if (!customElements.get('model-viewer')) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
      document.head.appendChild(script);
    }
  }, []);

  const currentCreature = creatures[selectedCreature];

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 safe-top">
        <div className="flex items-center justify-between">
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Exit AR
          </button>
          <div className="text-white text-right">
            <div className="font-semibold">{era.era.name}</div>
            <div className="text-sm text-gray-300">{era.era.period}</div>
          </div>
        </div>
      </div>

      {/* Model Viewer */}
      {currentCreature ? (
        <div className="w-full h-full">
          <model-viewer
            src={currentCreature.modelUrl}
            alt={currentCreature.name}
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            touch-action="pan-y"
            auto-rotate
            style={{ width: '100%', height: '100%' }}
          >
            <button
              slot="ar-button"
              className="absolute bottom-24 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-blue-600 text-white rounded-full font-semibold shadow-lg"
            >
              View in AR
            </button>
          </model-viewer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-white">
          <div className="text-center">
            <div className="text-4xl mb-4">🦕</div>
            <p>No creatures available for this era</p>
          </div>
        </div>
      )}

      {/* Creature Info */}
      {currentCreature && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent safe-bottom">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <h3 className="text-white font-semibold text-lg mb-1">{currentCreature.name}</h3>
            <p className="text-gray-300 text-sm mb-3">{currentCreature.scientificName}</p>
            <p className="text-gray-200 text-sm">{currentCreature.description}</p>
            
            {/* Creature selector */}
            {creatures.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto">
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

      {/* Instructions */}
      <div className="absolute top-20 left-4 right-4 bg-blue-600/90 backdrop-blur-sm rounded-lg p-3 text-white text-sm safe-top">
        <p className="font-semibold mb-1">📱 iOS AR Instructions:</p>
        <p>Tap "View in AR" to place the creature in your space using AR Quick Look</p>
      </div>
    </div>
  );
}

export default IOSARView;
