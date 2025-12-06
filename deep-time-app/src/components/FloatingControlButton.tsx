/**
 * Floating Control Button Component
 * A beautiful, animated FAB that opens the Control Panel
 * Designed with geological/fossil aesthetic
 */

import { useState, useEffect } from 'react';
import { hasApiKey } from './ApiKeyModal';

export interface FloatingControlButtonProps {
  onClick: () => void;
  isPanelOpen?: boolean;
}

export function FloatingControlButton({ onClick, isPanelOpen = false }: FloatingControlButtonProps) {
  const [hasKey, setHasKey] = useState(hasApiKey());
  const [isHovered, setIsHovered] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);

  // Check API key status periodically
  useEffect(() => {
    const checkKey = () => setHasKey(hasApiKey());
    checkKey();
    const interval = setInterval(checkKey, 2000);
    return () => clearInterval(interval);
  }, []);

  // Pulse animation when no key configured
  useEffect(() => {
    if (!hasKey) {
      const interval = setInterval(() => {
        setPulseKey(k => k + 1);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [hasKey]);

  if (isPanelOpen) return null;

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-40 group"
      aria-label="Open control panel"
    >
      {/* Outer glow ring */}
      <div 
        className={`
          absolute inset-0 rounded-2xl transition-all duration-500
          ${isHovered ? 'scale-110 opacity-100' : 'scale-100 opacity-60'}
        `}
        style={{
          background: hasKey 
            ? 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(16,185,129,0.2))'
            : 'linear-gradient(135deg, rgba(245,158,11,0.4), rgba(239,68,68,0.3))',
          filter: 'blur(12px)',
        }}
      />

      {/* Pulse ring for attention (when no key) */}
      {!hasKey && (
        <div 
          key={pulseKey}
          className="absolute inset-0 rounded-2xl animate-ping"
          style={{
            background: 'rgba(245,158,11,0.3)',
            animationDuration: '2s',
          }}
        />
      )}

      {/* Main button */}
      <div 
        className={`
          relative w-14 h-14 rounded-2xl flex items-center justify-center
          transition-all duration-300 ease-out
          ${isHovered ? 'scale-105' : 'scale-100'}
        `}
        style={{
          background: 'linear-gradient(145deg, #1e2433 0%, #141820 100%)',
          boxShadow: `
            0 4px 20px rgba(0,0,0,0.4),
            0 0 0 1px rgba(255,255,255,0.05),
            inset 0 1px 0 rgba(255,255,255,0.05)
          `,
        }}
      >
        {/* Fossil-like decorative ring */}
        <div 
          className="absolute inset-1.5 rounded-xl pointer-events-none"
          style={{
            border: '1px dashed rgba(245,158,11,0.2)',
            borderRadius: '10px',
          }}
        />

        {/* Icon container with geological texture */}
        <div 
          className={`
            relative w-9 h-9 rounded-lg flex items-center justify-center
            transition-transform duration-300
            ${isHovered ? 'rotate-12' : 'rotate-0'}
          `}
          style={{
            background: hasKey
              ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(16,185,129,0.1))'
              : 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(239,68,68,0.15))',
          }}
        >
          {/* Layered icon representing geological strata */}
          <svg 
            width="22" 
            height="22" 
            viewBox="0 0 24 24" 
            fill="none"
            className="transition-transform duration-300"
          >
            {/* Top layer - amber */}
            <path 
              d="M4 6h16" 
              stroke={hasKey ? '#f59e0b' : '#f59e0b'}
              strokeWidth="2.5" 
              strokeLinecap="round"
              className={isHovered ? 'translate-y-[-1px]' : ''}
              style={{ transition: 'transform 0.3s' }}
            />
            {/* Middle layer - emerald/amber */}
            <path 
              d="M4 12h16" 
              stroke={hasKey ? '#10b981' : '#f59e0b'}
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
            {/* Bottom layer - blue/red */}
            <path 
              d="M4 18h16" 
              stroke={hasKey ? '#3b82f6' : '#ef4444'}
              strokeWidth="2.5" 
              strokeLinecap="round"
              className={isHovered ? 'translate-y-[1px]' : ''}
              style={{ transition: 'transform 0.3s' }}
            />
            {/* Vertical connector dots */}
            <circle cx="12" cy="9" r="1.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="12" cy="15" r="1.5" fill="rgba(255,255,255,0.3)" />
          </svg>
        </div>

        {/* Status indicator dot */}
        <div 
          className={`
            absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full
            ${hasKey ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}
          `}
          style={{
            boxShadow: hasKey 
              ? '0 0 8px rgba(16,185,129,0.6)' 
              : '0 0 8px rgba(245,158,11,0.6)',
          }}
        />
      </div>

      {/* Tooltip */}
      <div 
        className={`
          absolute right-full mr-3 top-1/2 -translate-y-1/2
          px-3 py-1.5 rounded-lg whitespace-nowrap
          text-xs font-medium
          transition-all duration-200
          ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'}
        `}
        style={{
          background: 'rgba(20,24,32,0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        <span className="text-white/80">
          {hasKey ? 'Control Center' : 'Setup Required'}
        </span>
        {/* Arrow */}
        <div 
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full"
          style={{
            width: 0,
            height: 0,
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderLeft: '5px solid rgba(20,24,32,0.95)',
          }}
        />
      </div>
    </button>
  );
}

export default FloatingControlButton;
