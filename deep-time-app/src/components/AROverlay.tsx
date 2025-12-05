/**
 * AROverlay Component
 * Displays era name, date, and exit button for AR view
 * Requirements: 6.2 - Display current era name and date at the top
 * Requirements: 6.3 - Display an exit button to return to card view
 */

import { useCallback } from 'react';

export interface AROverlayProps {
  /** Current era name */
  eraName: string;
  /** Current era period/date description */
  eraPeriod: string;
  /** Years ago for the current era */
  yearsAgo: number;
  /** Callback when exit button is clicked */
  onExit: () => void;
  /** Opacity for idle fade effect (0-1) */
  opacity?: number;
  /** Whether a transition is in progress */
  isTransitioning?: boolean;
}

/**
 * Formats years ago into human-readable string
 */
function formatYearsAgo(yearsAgo: number): string {
  if (yearsAgo >= 1_000_000_000) {
    return `${(yearsAgo / 1_000_000_000).toFixed(1)} billion years ago`;
  }
  if (yearsAgo >= 1_000_000) {
    return `${(yearsAgo / 1_000_000).toFixed(0)} million years ago`;
  }
  if (yearsAgo >= 1_000) {
    return `${(yearsAgo / 1_000).toFixed(0)} thousand years ago`;
  }
  return `${yearsAgo} years ago`;
}

/**
 * Exit button component
 * Requirements: 6.3 - Display an exit button to return to card view
 */
function ExitButton({ onClick, opacity }: { onClick: () => void; opacity: number }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-all backdrop-blur-sm"
      style={{ opacity }}
      aria-label="Exit AR view"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span className="text-sm font-medium">Exit</span>
    </button>
  );
}

/**
 * Era info header component
 * Requirements: 6.2 - Display current era name and date at the top
 */
function EraHeader({ 
  eraName, 
  eraPeriod, 
  yearsAgo, 
  opacity,
  isTransitioning 
}: { 
  eraName: string; 
  eraPeriod: string; 
  yearsAgo: number; 
  opacity: number;
  isTransitioning: boolean;
}) {
  return (
    <div 
      className={`flex flex-col items-center text-center transition-all duration-300 ${isTransitioning ? 'scale-105' : ''}`}
      style={{ opacity }}
    >
      <h1 className="text-lg font-bold text-white drop-shadow-lg">
        {eraName}
      </h1>
      <p className="text-sm text-white/80 drop-shadow">
        {eraPeriod}
      </p>
      <p className="text-xs text-white/60 drop-shadow mt-0.5">
        {formatYearsAgo(yearsAgo)}
      </p>
    </div>
  );
}

/**
 * AROverlay Component
 * Displays minimal but informative UI overlaid on the AR view
 * 
 * Requirements:
 * - 6.2: Display current era name and date at the top
 * - 6.3: Display an exit button to return to card view
 */
export function AROverlay({
  eraName,
  eraPeriod,
  yearsAgo,
  onExit,
  opacity = 1,
  isTransitioning = false,
}: AROverlayProps) {
  const handleExit = useCallback(() => {
    onExit();
  }, [onExit]);

  return (
    <>
      {/* Top bar with era info and exit button */}
      <div 
        className="fixed top-0 left-0 right-0 z-50 safe-top transition-opacity duration-300"
        style={{ opacity }}
      >
        <div className="flex items-start justify-between p-4">
          {/* Era info - centered */}
          <div className="flex-1 flex justify-center">
            <EraHeader 
              eraName={eraName}
              eraPeriod={eraPeriod}
              yearsAgo={yearsAgo}
              opacity={1}
              isTransitioning={isTransitioning}
            />
          </div>
          
          {/* Exit button - top right */}
          <div className="absolute top-4 right-4">
            <ExitButton onClick={handleExit} opacity={1} />
          </div>
        </div>
      </div>

      {/* Transition indicator */}
      {isTransitioning && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
          <div className="bg-black/30 backdrop-blur-sm rounded-xl px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-white text-sm font-medium">Traveling through time...</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AROverlay;
