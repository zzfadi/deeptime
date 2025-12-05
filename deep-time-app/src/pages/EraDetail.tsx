/**
 * EraDetail Page Component
 * Full detailed view of a geological era with narrative, flora/fauna, climate, and AR option
 * Requirements: 2.2, 4.1, 4.4, 4.5
 * 
 * Performance: ARView is lazy loaded to reduce bundle size (Three.js is large)
 */

import { useCallback, useState, lazy, Suspense } from 'react';
import type { GeologicalLayer, Narrative } from 'deep-time-core/types';
import { formatYearsAgo, getEraBackground, getEraIcon, LoadingSpinner } from '../components';
import { useWebXRSupport } from '../hooks';

// Lazy load ARView component - Three.js is a large dependency
// This significantly reduces initial bundle size
const ARView = lazy(() => import('../components/ARView'));

export interface EraDetailProps {
  /** The geological layer/era to display */
  era: GeologicalLayer | null;
  /** The narrative for this era */
  narrative: Narrative | null;
  /** Whether the narrative is loading */
  isLoading: boolean;
  /** Callback to go back to home */
  onBack: () => void;
  /** Callback when AR button is clicked (optional, for external handling) */
  onARClick?: () => void;
}

/**
 * Back button component
 */
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-2 -ml-2 text-gray-300 hover:text-white transition-colors touch-target"
      aria-label="Go back"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="text-sm">Back</span>
    </button>
  );
}

/**
 * AR button component
 * Requirement 4.4: Offer AR view option
 * Requirement 1.1: "Enter AR" button on era detail page
 */
function ARButton({ onClick, disabled, variant = 'default' }: { 
  onClick?: () => void; 
  disabled?: boolean;
  variant?: 'default' | 'prominent';
}) {
  const baseClasses = "flex items-center gap-2 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-target";
  const variantClasses = variant === 'prominent' 
    ? "px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:from-blue-800 active:to-purple-800 shadow-lg hover:shadow-xl transform hover:scale-105"
    : "px-4 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800";
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses}`}
      aria-label="Enter AR experience"
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
      <span className="font-medium">Enter AR</span>
    </button>
  );
}

/**
 * Loading skeleton for EraDetail
 */
function EraDetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-deep-900 text-white">
      <header className="px-4 py-3 safe-top">
        <BackButton onClick={onBack} />
      </header>
      
      <div className="p-4 animate-pulse">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full skeleton" />
          <div className="flex-1">
            <div className="h-6 w-40 skeleton mb-2" />
            <div className="h-4 w-32 skeleton" />
          </div>
        </div>
        
        {/* Description skeleton */}
        <div className="space-y-3 mb-6">
          <div className="h-4 w-full skeleton" />
          <div className="h-4 w-5/6 skeleton" />
          <div className="h-4 w-4/6 skeleton" />
        </div>
        
        {/* Climate skeleton */}
        <div className="h-32 w-full skeleton rounded-xl mb-6" />
        
        {/* Flora/Fauna skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <div className="h-40 skeleton rounded-xl" />
          <div className="h-40 skeleton rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Climate information card
 */
function ClimateCard({ climate }: { climate: Narrative['climate'] }) {
  if (!climate) return null;

  return (
    <div className="bg-deep-700/50 rounded-xl p-4 mb-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>🌡️</span> Climate Conditions
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-deep-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Temperature</div>
          <div className="text-white font-medium">{climate.temperature}</div>
        </div>
        <div className="bg-deep-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Humidity</div>
          <div className="text-white font-medium">{climate.humidity}</div>
        </div>
        <div className="bg-deep-800/50 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Atmosphere</div>
          <div className="text-white font-medium">{climate.atmosphere}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Flora list component
 */
function FloraList({ flora }: { flora: string[] }) {
  if (!flora || flora.length === 0) return null;

  return (
    <div className="bg-green-900/20 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
        <span>🌿</span> Flora
      </h3>
      <ul className="space-y-2">
        {flora.map((plant, index) => (
          <li key={index} className="flex items-start gap-2 text-gray-200">
            <span className="text-green-500 mt-1">•</span>
            <span>{plant}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Fauna list component
 */
function FaunaList({ fauna }: { fauna: string[] }) {
  if (!fauna || fauna.length === 0) return null;

  return (
    <div className="bg-amber-900/20 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-amber-400 mb-3 flex items-center gap-2">
        <span>🦎</span> Fauna
      </h3>
      <ul className="space-y-2">
        {fauna.map((creature, index) => (
          <li key={index} className="flex items-start gap-2 text-gray-200">
            <span className="text-amber-500 mt-1">•</span>
            <span>{creature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * EraDetail Page
 * Full detailed view of a geological era
 * 
 * Requirements:
 * - 2.2: Display era-appropriate description with flora, fauna, and climate
 * - 4.1: Display era-appropriate background image or scene
 * - 4.4: Offer AR view option when WebXR is supported
 * - 4.5: Gracefully fall back to 2D card-based visualization when WebXR not supported
 */
export function EraDetail({
  era,
  narrative,
  isLoading,
  onBack,
  onARClick,
}: EraDetailProps) {
  const webXRSupport = useWebXRSupport();
  const [isARActive, setIsARActive] = useState(false);

  // Handle AR button click
  // Requirements: 1.1 - "Enter AR" button on era detail page with smooth transition
  const handleARClick = useCallback(() => {
    if (!webXRSupport.isARSupported) return;
    
    // Prefer external handler for app-level routing (smooth transition)
    // This allows App.tsx to manage the AR view state centrally
    if (onARClick) {
      onARClick();
    } else {
      // Fallback to local AR view if no external handler
      setIsARActive(true);
    }
  }, [webXRSupport.isARSupported, onARClick]);

  const handleARExit = useCallback(() => {
    setIsARActive(false);
  }, []);

  // Show loading skeleton
  if (isLoading || !era) {
    return <EraDetailSkeleton onBack={onBack} />;
  }

  // Show AR view when active
  // Requirement 4.4: Offer AR view option when WebXR is supported
  // ARView is lazy loaded to reduce initial bundle size
  if (isARActive && era) {
    return (
      <Suspense fallback={
        <div className="min-h-screen bg-deep-900 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-gray-400 mt-4">Loading AR experience...</p>
          </div>
        </div>
      }>
        <ARView
          era={era}
          narrative={narrative}
          onExit={handleARExit}
        />
      </Suspense>
    );
  }

  const background = getEraBackground(era.era.name);
  const icon = getEraIcon(era.era.name);

  // Requirement 4.5: Show/hide AR button based on WebXR support
  const showARButton = webXRSupport.isARSupported && !webXRSupport.isChecking;

  return (
    <div className={`min-h-screen ${background} text-white`}>
      {/* Header */}
      <header className="px-4 py-3 safe-top bg-black/20 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <BackButton onClick={onBack} />
          {showARButton && (
            <ARButton onClick={handleARClick} />
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="p-4 pb-8">
        {/* Era header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-4xl">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{era.era.name}</h1>
            <p className="text-gray-300">
              {formatYearsAgo(era.era.yearsAgo)} years ago • {era.era.period}
            </p>
          </div>
        </div>

        {/* Layer info */}
        <div className="flex items-center gap-4 mb-6 text-sm text-gray-400">
          <span>Depth: {era.depthStart}m - {era.depthEnd}m</span>
          <span>•</span>
          <span className="capitalize">{era.material}</span>
          {era.fossilIndex !== 'none' && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span>🦴</span>
                <span className="capitalize">{era.fossilIndex} fossils</span>
              </span>
            </>
          )}
        </div>

        {/* Narrative */}
        {narrative ? (
          <>
            {/* Full description */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">About This Era</h2>
              <p className="text-gray-200 leading-relaxed text-lg">
                {narrative.shortDescription}
              </p>
            </div>

            {/* Climate information */}
            <ClimateCard climate={narrative.climate} />

            {/* Flora and Fauna */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <FloraList flora={narrative.flora} />
              <FaunaList fauna={narrative.fauna} />
            </div>

            {/* AR prompt for supported devices */}
            {/* Requirement 4.4: Offer AR view option when WebXR is supported */}
            {/* Requirement 1.1: "Enter AR" button on era detail page with smooth transition */}
            {showARButton && (
              <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl p-6 text-center border border-blue-500/20">
                <div className="text-3xl mb-2">🦖</div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Step Into the Past
                </h3>
                <p className="text-gray-300 mb-4">
                  Experience this era in augmented reality. See prehistoric creatures come to life around you.
                </p>
                <ARButton onClick={handleARClick} variant="prominent" />
              </div>
            )}

            {/* Fallback for non-AR devices */}
            {/* Requirement 4.5: Gracefully fall back to 2D card-based visualization */}
            {!showARButton && !webXRSupport.isChecking && (
              <div className="bg-deep-700/50 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm">
                  AR view is not available on this device. 
                  Enjoy the detailed information above to imagine what this era looked like.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400">
              No detailed narrative available for this era.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default EraDetail;
