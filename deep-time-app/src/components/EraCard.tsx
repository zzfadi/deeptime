/**
 * EraCard Component
 * Displays era information with narrative, flora/fauna, and era-appropriate visuals
 * Requirements: 2.2, 4.1, 4.2, 4.3
 */

import type { GeologicalLayer, Narrative } from 'deep-time-core/types';
import { formatYearsAgo } from './TimeSlider';

export interface EraCardProps {
  /** The geological layer/era to display */
  era: GeologicalLayer | null;
  /** The narrative for this era */
  narrative: Narrative | null;
  /** Whether the narrative is loading */
  isLoading: boolean;
  /** Callback when AR button is clicked */
  onARClick?: () => void;
  /** Whether WebXR is supported */
  webXRSupported?: boolean;
}

/**
 * Maps era names to background gradient classes
 * Requirement 4.1: Display era-appropriate background image or scene
 * Requirement 4.2: Show era-appropriate creatures and landscapes
 * Requirement 4.3: Show relevant historical context for recent history
 */
export function getEraBackground(eraName: string): string {
  const name = eraName.toLowerCase();
  
  // Precambrian - volcanic, primordial
  if (name.includes('precambrian') || name.includes('archean') || name.includes('proterozoic')) {
    return 'bg-gradient-to-br from-era-precambrian via-deep-800 to-red-900/30';
  }
  
  // Paleozoic - ancient seas and early life
  if (name.includes('cambrian') || name.includes('ordovician') || name.includes('silurian') ||
      name.includes('devonian') || name.includes('carboniferous') || name.includes('permian')) {
    return 'bg-gradient-to-br from-era-paleozoic via-deep-800 to-teal-900/30';
  }
  
  // Mesozoic - dinosaur era
  if (name.includes('triassic') || name.includes('jurassic') || name.includes('cretaceous')) {
    return 'bg-gradient-to-br from-era-mesozoic via-deep-800 to-amber-900/30';
  }
  
  // Cenozoic - mammals and modern life
  if (name.includes('paleocene') || name.includes('eocene') || name.includes('oligocene') ||
      name.includes('miocene') || name.includes('pliocene')) {
    return 'bg-gradient-to-br from-era-cenozoic via-deep-800 to-green-900/30';
  }
  
  // Quaternary - ice ages and humans
  if (name.includes('pleistocene') || name.includes('holocene') || name.includes('quaternary')) {
    return 'bg-gradient-to-br from-era-quaternary via-deep-800 to-blue-900/30';
  }
  
  // Default
  return 'bg-gradient-to-br from-deep-700 via-deep-800 to-deep-900';
}


/**
 * Gets era-appropriate icon/emoji for visual representation
 * Requirement 4.2: Show era-appropriate creatures and landscapes
 */
export function getEraIcon(eraName: string): string {
  const name = eraName.toLowerCase();
  
  if (name.includes('precambrian') || name.includes('archean')) return '🌋';
  if (name.includes('cambrian')) return '🦐';
  if (name.includes('ordovician') || name.includes('silurian')) return '🐚';
  if (name.includes('devonian')) return '🐟';
  if (name.includes('carboniferous')) return '🌿';
  if (name.includes('permian')) return '🦎';
  if (name.includes('triassic')) return '🦕';
  if (name.includes('jurassic')) return '🦖';
  if (name.includes('cretaceous')) return '🦴';
  if (name.includes('paleocene') || name.includes('eocene')) return '🐎';
  if (name.includes('oligocene') || name.includes('miocene')) return '🦣';
  if (name.includes('pliocene')) return '🦍';
  if (name.includes('pleistocene')) return '🧊';
  if (name.includes('holocene')) return '🌍';
  
  return '🪨';
}

/**
 * Loading skeleton for the EraCard
 */
function EraCardSkeleton() {
  return (
    <div className="era-card animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full skeleton" />
        <div className="flex-1">
          <div className="h-5 w-32 skeleton mb-2" />
          <div className="h-4 w-24 skeleton" />
        </div>
      </div>
      
      {/* Description skeleton */}
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full skeleton" />
        <div className="h-4 w-5/6 skeleton" />
        <div className="h-4 w-4/6 skeleton" />
      </div>
      
      {/* Flora/Fauna skeleton */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="h-4 w-16 skeleton mb-2" />
          <div className="h-3 w-full skeleton" />
        </div>
        <div className="flex-1">
          <div className="h-4 w-16 skeleton mb-2" />
          <div className="h-3 w-full skeleton" />
        </div>
      </div>
    </div>
  );
}

/**
 * AR button component
 */
function ARButton({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="View in AR"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      <span className="text-sm font-medium">View in AR</span>
    </button>
  );
}


/**
 * EraCard Component
 * Displays geological era information with narrative and visual elements
 * 
 * Requirements:
 * - 2.2: Display era-appropriate description with flora, fauna, and climate
 * - 4.1: Display era-appropriate background image or scene
 * - 4.2: Show era-appropriate creatures and landscapes for prehistoric eras
 * - 4.3: Show relevant historical context for recent history
 */
export function EraCard({
  era,
  narrative,
  isLoading,
  onARClick,
  webXRSupported = false,
}: EraCardProps) {
  // Only show full skeleton if we have no era data at all
  if (!era) {
    return <EraCardSkeleton />;
  }

  const background = getEraBackground(era.era.name);
  const icon = getEraIcon(era.era.name);

  return (
    <div className={`era-card ${background} overflow-hidden`}>
      {/* Header with era name and time */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl">
            {icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{era.era.name}</h2>
            <p className="text-sm text-gray-300">
              {formatYearsAgo(era.era.yearsAgo)} years ago • {era.era.period}
            </p>
          </div>
        </div>
        
        {/* AR button - only show if WebXR is supported */}
        {webXRSupported && onARClick && (
          <ARButton onClick={onARClick} />
        )}
      </div>

      {/* Narrative description - show loading only for this section */}
      {isLoading && !narrative ? (
        <div className="animate-pulse">
          <div className="space-y-2 mb-4">
            <div className="h-4 w-full skeleton" />
            <div className="h-4 w-5/6 skeleton" />
            <div className="h-4 w-4/6 skeleton" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="h-4 w-16 skeleton mb-2" />
              <div className="h-3 w-full skeleton" />
            </div>
            <div className="flex-1">
              <div className="h-4 w-16 skeleton mb-2" />
              <div className="h-3 w-full skeleton" />
            </div>
          </div>
        </div>
      ) : narrative ? (
        <>
          <p className="text-gray-200 leading-relaxed mb-4">
            {narrative.shortDescription}
          </p>

          {/* Climate info */}
          {narrative.climate && (
            <div className="mb-4 p-3 bg-white/5 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Climate</h3>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">Temp:</span>
                  <span className="ml-1 text-white">{narrative.climate.temperature}</span>
                </div>
                <div>
                  <span className="text-gray-400">Humidity:</span>
                  <span className="ml-1 text-white">{narrative.climate.humidity}</span>
                </div>
                <div>
                  <span className="text-gray-400">Atmosphere:</span>
                  <span className="ml-1 text-white">{narrative.climate.atmosphere}</span>
                </div>
              </div>
            </div>
          )}

          {/* Flora and Fauna */}
          <div className="grid grid-cols-2 gap-4">
            {/* Flora */}
            {narrative.flora && narrative.flora.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-1">
                  <span>🌿</span> Flora
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  {narrative.flora.slice(0, 4).map((plant, index) => (
                    <li key={index} className="truncate">• {plant}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fauna */}
            {narrative.fauna && narrative.fauna.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-1">
                  <span>🦎</span> Fauna
                </h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  {narrative.fauna.slice(0, 4).map((creature, index) => (
                    <li key={index} className="truncate">• {creature}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-gray-400 italic">
          No narrative available for this era.
        </p>
      )}

      {/* Layer info footer */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
        <span>Depth: {era.depthStart}m - {era.depthEnd}m</span>
        <span className="capitalize">{era.material}</span>
        {era.fossilIndex !== 'none' && (
          <span className="flex items-center gap-1">
            <span>🦴</span>
            <span className="capitalize">{era.fossilIndex} fossils</span>
          </span>
        )}
      </div>
    </div>
  );
}

export default EraCard;
