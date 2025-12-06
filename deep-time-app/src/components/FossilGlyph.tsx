/**
 * FossilGlyph Component
 * Renders AI-generated glyph codes as beautiful fossil imprint SVG icons
 * 
 * The glyph appears as a circular "rock cross-section" with embedded fossil patterns
 */

import { useMemo } from 'react';
import { parseGlyphCode, type GlyphElement, type GlyphColor, type GlyphShape } from '../services/ai/glyphGenerator';

export interface FossilGlyphProps {
  code: string;
  size?: number;
  className?: string;
  animate?: boolean;
}

// Color palette mapping
const COLOR_MAP: Record<GlyphColor, { primary: string; secondary: string; glow: string }> = {
  amber: { primary: '#f59e0b', secondary: '#d97706', glow: 'rgba(245,158,11,0.3)' },
  teal: { primary: '#14b8a6', secondary: '#0d9488', glow: 'rgba(20,184,166,0.3)' },
  rose: { primary: '#f43f5e', secondary: '#e11d48', glow: 'rgba(244,63,94,0.3)' },
  emerald: { primary: '#10b981', secondary: '#059669', glow: 'rgba(16,185,129,0.3)' },
  slate: { primary: '#64748b', secondary: '#475569', glow: 'rgba(100,116,139,0.3)' },
  copper: { primary: '#c2410c', secondary: '#9a3412', glow: 'rgba(194,65,12,0.3)' },
  ivory: { primary: '#fef3c7', secondary: '#fde68a', glow: 'rgba(254,243,199,0.3)' },
  ochre: { primary: '#ca8a04', secondary: '#a16207', glow: 'rgba(202,138,4,0.3)' },
  cyan: { primary: '#06b6d4', secondary: '#0891b2', glow: 'rgba(6,182,212,0.3)' },
  rust: { primary: '#b45309', secondary: '#92400e', glow: 'rgba(180,83,9,0.3)' },
};

// Shape renderers - each returns SVG path/elements
const SHAPE_RENDERERS: Record<GlyphShape, (x: number, y: number, scale: number, color: string) => JSX.Element> = {
  spiral: (x, y, scale, color) => {
    const r = 4 * scale;
    // Ammonite spiral path
    const path = `M ${x} ${y} 
      q ${r * 0.3} ${-r * 0.1} ${r * 0.4} ${-r * 0.3}
      q ${r * 0.2} ${-r * 0.3} ${r * 0.1} ${-r * 0.5}
      q ${-r * 0.2} ${-r * 0.3} ${-r * 0.5} ${-r * 0.3}
      q ${-r * 0.4} ${r * 0.1} ${-r * 0.5} ${r * 0.4}
      q ${-r * 0.1} ${r * 0.4} ${r * 0.2} ${r * 0.6}
      q ${r * 0.4} ${r * 0.2} ${r * 0.7} ${r * 0.1}`;
    return (
      <g key={`spiral-${x}-${y}`}>
        <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" opacity={0.9} />
        <circle cx={x} cy={y} r={1} fill={color} opacity={0.6} />
      </g>
    );
  },

  shell: (x, y, scale, color) => {
    const r = 5 * scale;
    return (
      <g key={`shell-${x}-${y}`}>
        {/* Bivalve shell curves */}
        <ellipse cx={x} cy={y} rx={r} ry={r * 0.6} fill="none" stroke={color} strokeWidth={1.2} opacity={0.8} />
        <path d={`M ${x - r * 0.8} ${y} Q ${x} ${y - r * 0.4} ${x + r * 0.8} ${y}`} fill="none" stroke={color} strokeWidth={0.8} opacity={0.5} />
        <path d={`M ${x - r * 0.5} ${y} Q ${x} ${y - r * 0.2} ${x + r * 0.5} ${y}`} fill="none" stroke={color} strokeWidth={0.6} opacity={0.4} />
      </g>
    );
  },

  trilobite: (x, y, scale, color) => {
    const w = 4 * scale;
    const h = 6 * scale;
    return (
      <g key={`trilobite-${x}-${y}`}>
        {/* Head */}
        <ellipse cx={x} cy={y - h * 0.35} rx={w} ry={w * 0.5} fill="none" stroke={color} strokeWidth={1.2} opacity={0.9} />
        {/* Body segments */}
        {[0, 1, 2, 3].map(i => (
          <ellipse key={i} cx={x} cy={y + i * h * 0.15} rx={w * (1 - i * 0.15)} ry={h * 0.08} fill="none" stroke={color} strokeWidth={0.8} opacity={0.7 - i * 0.1} />
        ))}
        {/* Center line */}
        <line x1={x} y1={y - h * 0.3} x2={x} y2={y + h * 0.4} stroke={color} strokeWidth={0.6} opacity={0.5} />
      </g>
    );
  },

  fern: (x, y, scale, color) => {
    const h = 8 * scale;
    return (
      <g key={`fern-${x}-${y}`}>
        {/* Main stem */}
        <path d={`M ${x} ${y + h * 0.4} Q ${x + 1} ${y} ${x} ${y - h * 0.4}`} fill="none" stroke={color} strokeWidth={1} opacity={0.9} />
        {/* Fronds */}
        {[-1, 1].map(side => (
          [0.3, 0.15, 0, -0.15, -0.25].map((offset, i) => (
            <path
              key={`${side}-${i}`}
              d={`M ${x} ${y + h * offset} q ${side * h * 0.2} ${-h * 0.05} ${side * h * 0.25} ${-h * 0.1}`}
              fill="none"
              stroke={color}
              strokeWidth={0.6}
              opacity={0.6 - i * 0.08}
            />
          ))
        ))}
      </g>
    );
  },

  bone: (x, y, scale, color) => {
    const r = 4 * scale;
    return (
      <g key={`bone-${x}-${y}`}>
        {/* Bone cross-section - concentric rings */}
        <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={1.5} opacity={0.9} />
        <circle cx={x} cy={y} r={r * 0.65} fill="none" stroke={color} strokeWidth={1} opacity={0.6} />
        <circle cx={x} cy={y} r={r * 0.35} fill={color} opacity={0.3} />
        {/* Marrow dots */}
        <circle cx={x} cy={y} r={r * 0.15} fill={color} opacity={0.7} />
      </g>
    );
  },

  ring: (x, y, scale, color) => {
    const r = 5 * scale;
    return (
      <g key={`ring-${x}-${y}`}>
        {/* Growth rings like tree or shell */}
        {[1, 0.75, 0.5, 0.3].map((ratio, i) => (
          <circle key={i} cx={x} cy={y} r={r * ratio} fill="none" stroke={color} strokeWidth={0.8} opacity={0.8 - i * 0.15} strokeDasharray={i > 1 ? '2 1' : 'none'} />
        ))}
      </g>
    );
  },

  wave: (x, y, scale, color) => {
    const w = 8 * scale;
    return (
      <g key={`wave-${x}-${y}`}>
        {[0, 1, 2].map(i => (
          <path
            key={i}
            d={`M ${x - w * 0.4} ${y + i * 2.5 - 2.5} q ${w * 0.2} ${-2} ${w * 0.4} 0 t ${w * 0.4} 0`}
            fill="none"
            stroke={color}
            strokeWidth={1}
            opacity={0.7 - i * 0.15}
          />
        ))}
      </g>
    );
  },

  scale: (x, y, scale, color) => {
    const r = 3 * scale;
    return (
      <g key={`scale-${x}-${y}`}>
        {/* Fish/reptile scale pattern */}
        <path d={`M ${x} ${y - r} Q ${x + r} ${y} ${x} ${y + r} Q ${x - r} ${y} ${x} ${y - r}`} fill="none" stroke={color} strokeWidth={1.2} opacity={0.8} />
        <path d={`M ${x - r * 0.3} ${y} L ${x + r * 0.3} ${y}`} stroke={color} strokeWidth={0.6} opacity={0.4} />
      </g>
    );
  },

  tooth: (x, y, scale, color) => {
    const h = 6 * scale;
    return (
      <g key={`tooth-${x}-${y}`}>
        {/* Predator tooth shape */}
        <path
          d={`M ${x} ${y - h * 0.4} 
             Q ${x + h * 0.15} ${y - h * 0.2} ${x + h * 0.2} ${y + h * 0.3}
             Q ${x} ${y + h * 0.35} ${x - h * 0.2} ${y + h * 0.3}
             Q ${x - h * 0.15} ${y - h * 0.2} ${x} ${y - h * 0.4}`}
          fill="none"
          stroke={color}
          strokeWidth={1.2}
          opacity={0.9}
        />
        {/* Serration hints */}
        <path d={`M ${x + h * 0.1} ${y} l ${h * 0.05} ${h * 0.08}`} stroke={color} strokeWidth={0.5} opacity={0.4} />
        <path d={`M ${x - h * 0.1} ${y} l ${-h * 0.05} ${h * 0.08}`} stroke={color} strokeWidth={0.5} opacity={0.4} />
      </g>
    );
  },

  leaf: (x, y, scale, color) => {
    const h = 7 * scale;
    return (
      <g key={`leaf-${x}-${y}`}>
        {/* Leaf outline */}
        <path
          d={`M ${x} ${y - h * 0.4} 
             Q ${x + h * 0.25} ${y - h * 0.1} ${x + h * 0.2} ${y + h * 0.3}
             Q ${x} ${y + h * 0.4} ${x - h * 0.2} ${y + h * 0.3}
             Q ${x - h * 0.25} ${y - h * 0.1} ${x} ${y - h * 0.4}`}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.85}
        />
        {/* Veins */}
        <line x1={x} y1={y - h * 0.35} x2={x} y2={y + h * 0.35} stroke={color} strokeWidth={0.6} opacity={0.5} />
        {[-1, 1].map(side => (
          [0.1, -0.1].map((offset, i) => (
            <line key={`${side}-${i}`} x1={x} y1={y + h * offset} x2={x + side * h * 0.12} y2={y + h * (offset - 0.08)} stroke={color} strokeWidth={0.4} opacity={0.4} />
          ))
        ))}
      </g>
    );
  },

  cell: (x, y, scale, color) => {
    const r = 3 * scale;
    return (
      <g key={`cell-${x}-${y}`}>
        {/* Cellular/microscopic pattern */}
        <circle cx={x} cy={y} r={r} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
        <circle cx={x - r * 0.3} cy={y - r * 0.2} r={r * 0.25} fill={color} opacity={0.4} />
        <circle cx={x + r * 0.2} cy={y + r * 0.3} r={r * 0.2} fill={color} opacity={0.3} />
      </g>
    );
  },

  crystal: (x, y, scale, color) => {
    const h = 5 * scale;
    return (
      <g key={`crystal-${x}-${y}`}>
        {/* Hexagonal crystal */}
        <polygon
          points={`${x},${y - h * 0.4} ${x + h * 0.3},${y - h * 0.15} ${x + h * 0.3},${y + h * 0.2} ${x},${y + h * 0.4} ${x - h * 0.3},${y + h * 0.2} ${x - h * 0.3},${y - h * 0.15}`}
          fill="none"
          stroke={color}
          strokeWidth={1}
          opacity={0.8}
        />
        {/* Internal facets */}
        <line x1={x} y1={y - h * 0.4} x2={x} y2={y + h * 0.4} stroke={color} strokeWidth={0.5} opacity={0.4} />
        <line x1={x - h * 0.3} y1={y - h * 0.15} x2={x + h * 0.3} y2={y + h * 0.2} stroke={color} strokeWidth={0.4} opacity={0.3} />
      </g>
    );
  },
};

/**
 * Calculate positions for elements in a circular layout
 */
function calculatePositions(elements: GlyphElement[], viewSize: number): Array<{ x: number; y: number; element: GlyphElement }> {
  const center = viewSize / 2;
  const radius = viewSize * 0.28;
  
  if (elements.length === 1) {
    return [{ x: center, y: center, element: elements[0] }];
  }
  
  // Sort by size (largest in center)
  const sorted = [...elements].sort((a, b) => b.size - a.size);
  
  return sorted.map((element, i) => {
    if (i === 0) {
      // Largest element in center
      return { x: center, y: center, element };
    }
    // Others arranged in a circle
    const angle = ((i - 1) / (sorted.length - 1)) * Math.PI * 2 - Math.PI / 2;
    const r = radius * (0.6 + element.size * 0.08);
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
      element,
    };
  });
}

export function FossilGlyph({ code, size = 56, className = '', animate = false }: FossilGlyphProps) {
  const glyph = useMemo(() => parseGlyphCode(code), [code]);
  const viewSize = 60;
  
  const positions = useMemo(
    () => calculatePositions(glyph.elements, viewSize),
    [glyph.elements]
  );

  const bgColor = COLOR_MAP[glyph.background] || COLOR_MAP.slate;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewSize} ${viewSize}`}
      className={`${className} ${animate ? 'animate-pulse' : ''}`}
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Rock texture filter */}
        <filter id="rockTexture" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        
        {/* Glow effect */}
        <filter id="fossilGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Radial gradient for depth */}
        <radialGradient id={`bg-${code.slice(0, 8)}`} cx="30%" cy="30%">
          <stop offset="0%" stopColor={bgColor.glow} />
          <stop offset="100%" stopColor="rgba(15,18,25,0.95)" />
        </radialGradient>
      </defs>

      {/* Background circle - rock cross-section */}
      <circle
        cx={viewSize / 2}
        cy={viewSize / 2}
        r={viewSize / 2 - 2}
        fill={`url(#bg-${code.slice(0, 8)})`}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
      />

      {/* Subtle ring texture */}
      {[0.9, 0.7, 0.5].map((ratio, i) => (
        <circle
          key={i}
          cx={viewSize / 2}
          cy={viewSize / 2}
          r={(viewSize / 2 - 2) * ratio}
          fill="none"
          stroke="rgba(255,255,255,0.03)"
          strokeWidth="0.5"
        />
      ))}

      {/* Fossil elements */}
      <g filter="url(#fossilGlow)">
        {positions.map(({ x, y, element }, i) => {
          const colors = COLOR_MAP[element.color] || COLOR_MAP.slate;
          const renderer = SHAPE_RENDERERS[element.shape];
          if (!renderer) return null;
          
          const scale = 0.5 + element.size * 0.15;
          
          return (
            <g key={i} transform={element.rotation ? `rotate(${element.rotation} ${x} ${y})` : undefined}>
              {renderer(x, y, scale, colors.primary)}
            </g>
          );
        })}
      </g>

      {/* Subtle highlight */}
      <ellipse
        cx={viewSize * 0.35}
        cy={viewSize * 0.35}
        rx={viewSize * 0.15}
        ry={viewSize * 0.1}
        fill="rgba(255,255,255,0.05)"
      />
    </svg>
  );
}

export default FossilGlyph;
