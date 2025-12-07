/**
 * LayerStratum Component
 * Individual geological layer rendering with era-specific styling
 * Requirements: 1.1, 1.2 - Display geological layers with distinct coloring
 */

import type { GeologicalLayer, MaterialType } from 'deep-time-core/types';

export interface LayerStratumProps {
  layer: GeologicalLayer;
  index: number;
  totalLayers: number;
  isActive: boolean;
  depth: number;
  onClick: () => void;
}

export interface LayerColors {
  primary: string;
  secondary: string;
  accent: string;
}

/**
 * Era color palette - earth tones with era-specific accents
 * Requirement 1.2: Distinct coloring based on era and material type
 */
const ERA_COLOR_MAP: Record<string, LayerColors> = {
  // Cenozoic Era (recent)
  holocene: { primary: '#4a5d23', secondary: '#6b8e23', accent: '#9acd32' },
  pleistocene: { primary: '#5c7080', secondary: '#708090', accent: '#87ceeb' },
  pliocene: { primary: '#8b7355', secondary: '#a0826d', accent: '#d2b48c' },
  miocene: { primary: '#9c8b7a', secondary: '#b8a99a', accent: '#dcd0c0' },
  oligocene: { primary: '#a67b5b', secondary: '#c19a6b', accent: '#deb887' },
  eocene: { primary: '#b8860b', secondary: '#daa520', accent: '#ffd700' },
  paleocene: { primary: '#cd853f', secondary: '#deb887', accent: '#f5deb3' },
  
  // Mesozoic Era (dinosaurs)
  cretaceous: { primary: '#556b2f', secondary: '#6b8e23', accent: '#9acd32' },
  jurassic: { primary: '#228b22', secondary: '#32cd32', accent: '#7cfc00' },
  triassic: { primary: '#b8860b', secondary: '#cd853f', accent: '#f4a460' },
  
  // Paleozoic Era
  permian: { primary: '#8b4513', secondary: '#a0522d', accent: '#cd853f' },
  carboniferous: { primary: '#2f4f4f', secondary: '#3d5c5c', accent: '#4a6969' },
  devonian: { primary: '#4682b4', secondary: '#5f9ea0', accent: '#87ceeb' },
  silurian: { primary: '#3cb371', secondary: '#66cdaa', accent: '#98fb98' },
  ordovician: { primary: '#20b2aa', secondary: '#48d1cc', accent: '#7fffd4' },
  cambrian: { primary: '#008b8b', secondary: '#20b2aa', accent: '#40e0d0' },
  
  // Precambrian
  precambrian: { primary: '#8b0000', secondary: '#a52a2a', accent: '#cd5c5c' },
  proterozoic: { primary: '#800000', secondary: '#8b0000', accent: '#b22222' },
  archean: { primary: '#4a0000', secondary: '#660000', accent: '#8b0000' },
  hadean: { primary: '#1a0000', secondary: '#330000', accent: '#4d0000' },
  
  // Quaternary (catch-all for recent)
  quaternary: { primary: '#5c7080', secondary: '#708090', accent: '#87ceeb' },
};

/**
 * Material-based color modifiers
 */
const MATERIAL_COLOR_MODIFIERS: Record<MaterialType, { hueShift: number; saturation: number }> = {
  soil: { hueShift: 0, saturation: 0.8 },
  clay: { hueShift: 10, saturation: 0.7 },
  sand: { hueShift: 20, saturation: 0.6 },
  limestone: { hueShift: -10, saturation: 0.5 },
  granite: { hueShift: -20, saturation: 0.4 },
  shale: { hueShift: 5, saturation: 0.6 },
  sandstone: { hueShift: 15, saturation: 0.7 },
  basalt: { hueShift: -30, saturation: 0.3 },
  fill: { hueShift: 0, saturation: 0.5 },
};

/**
 * Maps era name and material to layer colors
 * Requirement 1.2: Distinct coloring based on era and material type
 */
export function getLayerColors(eraName: string, material: MaterialType): LayerColors {
  const normalizedEra = eraName.toLowerCase().trim();
  
  // Find matching era colors
  let baseColors: LayerColors = { primary: '#6b5b4f', secondary: '#8b7b6f', accent: '#ab9b8f' };
  
  // Sort keys by length descending to match longer/more specific era names first
  // This prevents "cambrian" from matching "precambrian" before "precambrian" is checked
  const sortedEntries = Object.entries(ERA_COLOR_MAP).sort((a, b) => b[0].length - a[0].length);
  
  for (const [key, colors] of sortedEntries) {
    if (normalizedEra.includes(key)) {
      baseColors = colors;
      break;
    }
  }
  
  // Apply material modifier for additional distinction
  const modifier = MATERIAL_COLOR_MODIFIERS[material] || { hueShift: 0, saturation: 1 };
  
  // Simple color modification - shift hue slightly based on material
  // This ensures different materials in the same era have slightly different colors
  if (modifier.hueShift !== 0) {
    baseColors = {
      primary: adjustColorBrightness(baseColors.primary, modifier.hueShift),
      secondary: adjustColorBrightness(baseColors.secondary, modifier.hueShift),
      accent: adjustColorBrightness(baseColors.accent, modifier.hueShift),
    };
  }
  
  return baseColors;
}

/**
 * Adjusts color brightness by a percentage
 */
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Calculates 3D transform for layer based on position
 */
export function calculateLayerTransform(
  layerIndex: number,
  totalLayers: number,
  scrollPosition: number
): { translateY: number; translateZ: number; rotateX: number } {
  // Base depth offset per layer
  const baseDepth = 20;
  const layerOffset = layerIndex * baseDepth;
  
  // Scroll affects the Y position - layers move up as user scrolls down
  const scrollOffset = scrollPosition * totalLayers * 60;
  const translateY = layerOffset - scrollOffset;
  
  // Z depth creates 3D stacking effect
  const translateZ = -layerIndex * 10;
  
  // Slight rotation for perspective
  const rotateX = 5 + (layerIndex * 0.5);
  
  return { translateY, translateZ, rotateX };
}

/**
 * LayerStratum Component
 * Renders a single geological layer with 3D styling
 */
export function LayerStratum({
  layer,
  index,
  totalLayers,
  isActive,
  depth,
  onClick,
}: LayerStratumProps) {
  const colors = getLayerColors(layer.era.name, layer.material);
  const transform = calculateLayerTransform(index, totalLayers, 0);
  
  // Calculate layer height based on depth range
  const layerThickness = Math.max(40, Math.min(120, (layer.depthEnd - layer.depthStart) * 2));
  
  return (
    <button
      onClick={onClick}
      className={`
        relative w-full transition-all duration-300 ease-out
        border-0 cursor-pointer text-left
        ${isActive ? 'z-10 scale-[1.02]' : 'z-0'}
      `}
      style={{
        height: `${layerThickness}px`,
        transform: `
          translateY(${depth}px)
          translateZ(${transform.translateZ}px)
          rotateX(${transform.rotateX}deg)
        `,
        transformStyle: 'preserve-3d',
      }}
      aria-label={`${layer.era.name} layer, ${layer.depthStart} to ${layer.depthEnd} meters deep`}
      aria-pressed={isActive}
    >
      {/* Main layer body */}
      <div
        className={`
          absolute inset-0 rounded-sm overflow-hidden
          transition-all duration-300
          ${isActive ? 'ring-2 ring-white/40 shadow-lg' : 'shadow-md'}
        `}
        style={{
          background: `linear-gradient(180deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.primary} 100%)`,
        }}
      >
        {/* Texture overlay - CSS noise/grain effect */}
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px',
          }}
        />
        
        {/* Horizontal strata lines */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-px opacity-20"
              style={{
                top: `${25 + i * 25}%`,
                background: `linear-gradient(90deg, transparent 0%, ${colors.accent} 20%, ${colors.accent} 80%, transparent 100%)`,
              }}
            />
          ))}
        </div>
        
        {/* Active glow effect */}
        {isActive && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{
              background: `radial-gradient(ellipse at center, ${colors.accent}30 0%, transparent 70%)`,
            }}
          />
        )}
        
        {/* Layer info overlay */}
        <div className="absolute inset-0 flex items-center justify-between px-4 py-2">
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm drop-shadow-md">
              {layer.era.name}
            </span>
            <span className="text-white/70 text-xs drop-shadow-sm">
              {layer.material}
            </span>
          </div>
          <div className="text-right">
            <span className="text-white/80 text-xs drop-shadow-sm">
              {layer.depthStart}m - {layer.depthEnd}m
            </span>
          </div>
        </div>
      </div>
      
      {/* 3D edge effect - bottom */}
      <div
        className="absolute left-0 right-0 h-2 origin-top"
        style={{
          bottom: '-8px',
          background: `linear-gradient(180deg, ${colors.primary}80 0%, ${colors.primary}40 100%)`,
          transform: 'rotateX(-90deg)',
          transformOrigin: 'top',
        }}
      />
    </button>
  );
}

export default LayerStratum;
