/**
 * NarrationToast Component
 * Displays AI-generated narration text overlay for AR experience
 * Requirements: 4.3, 4.4
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Narration } from '../ar/types';

export interface NarrationToastProps {
  /** The narration to display */
  narration: Narration | null;
  /** Callback when narration is dismissed (auto or manual) */
  onDismiss: () => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Animation duration for fade in/out in milliseconds
 */
const ANIMATION_DURATION = 300;

/**
 * NarrationToast Component
 * Displays narration text with auto-dismiss and tap-to-dismiss functionality
 * 
 * Requirements:
 * - 4.3: Display text overlay synchronized with content
 * - 4.4: Auto-dismiss after reading time or on user tap
 */
export function NarrationToast({ 
  narration, 
  onDismiss,
  className = '',
}: NarrationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Clear all timeouts
   */
  const clearTimeouts = useCallback(() => {
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = null;
    }
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handle dismissal with exit animation
   * Requirement 4.4: Dismiss on user tap or auto-dismiss
   */
  const handleDismiss = useCallback(() => {
    clearTimeouts();
    setIsExiting(true);
    
    // Wait for exit animation to complete before calling onDismiss
    animationTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      onDismiss();
    }, ANIMATION_DURATION);
  }, [clearTimeouts, onDismiss]);

  /**
   * Handle tap/click to dismiss
   * Requirement 4.4: Auto-dismiss after reading time or on user tap
   */
  const handleClick = useCallback(() => {
    handleDismiss();
  }, [handleDismiss]);

  /**
   * Handle keyboard dismiss (Escape key)
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isVisible) {
      handleDismiss();
    }
  }, [isVisible, handleDismiss]);

  // Set up auto-dismiss timer when narration changes
  useEffect(() => {
    if (narration) {
      clearTimeouts();
      setIsExiting(false);
      setIsVisible(true);
      
      // Set up auto-dismiss timer
      // Requirement 4.4: Auto-dismiss after reading time
      dismissTimeoutRef.current = setTimeout(() => {
        handleDismiss();
      }, narration.duration);
    } else {
      setIsVisible(false);
      setIsExiting(false);
    }

    return () => {
      clearTimeouts();
    };
  }, [narration, clearTimeouts, handleDismiss]);

  // Set up keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Don't render if no narration or not visible
  if (!narration || !isVisible) {
    return null;
  }

  // Get icon based on narration type
  const getTypeIcon = () => {
    switch (narration.type) {
      case 'creature':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'era':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'discovery':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      onClick={handleClick}
      className={`
        fixed bottom-24 left-4 right-4 z-50
        bg-black/80 backdrop-blur-md rounded-2xl
        p-4 shadow-2xl
        cursor-pointer select-none
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
        ${className}
      `}
      style={{
        animation: !isExiting ? `slideUp ${ANIMATION_DURATION}ms ease-out` : undefined,
      }}
    >
      {/* Header with type icon and dismiss hint */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-amber-400">
          {getTypeIcon()}
          <span className="text-xs font-medium uppercase tracking-wide">
            {narration.type === 'creature' ? 'Creature Info' : 
             narration.type === 'era' ? 'Era Overview' : 'Discovery'}
          </span>
        </div>
        <span className="text-xs text-gray-500">Tap to dismiss</span>
      </div>
      
      {/* Narration text */}
      <p className="text-white text-sm leading-relaxed">
        {narration.text}
      </p>
      
      {/* Progress bar for auto-dismiss */}
      <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-amber-500 rounded-full"
          style={{
            animation: `shrink ${narration.duration}ms linear forwards`,
          }}
        />
      </div>
      
      {/* Inline styles for animations */}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

export default NarrationToast;
