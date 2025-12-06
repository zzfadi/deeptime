/**
 * TimeSlider Component - Geological Time Navigation
 * Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { hapticController, getHapticIntensityForEra } from '../services/haptics';

export interface EraBoundary {
  yearsAgo: number;
  eraName: string;
  layerId: string;
}

export interface TransitionState {
  isDragging: boolean;
  currentEra: EraBoundary | null;
  nextEra: EraBoundary | null;
  progress: number;
  direction: 'forward' | 'backward' | null;
}

export interface TimeSliderProps {
  value: number;
  onChange: (yearsAgo: number) => void;
  eraBoundaries: EraBoundary[];
  minYearsAgo?: number;
  maxYearsAgo?: number;
  snapToEra?: boolean;
  onEraSelect?: (boundary: EraBoundary) => void;
  enableHaptics?: boolean;
  onEraBoundaryCrossed?: (previousEra: EraBoundary | null, newEra: EraBoundary) => void;
  onTransitionChange?: (state: TransitionState) => void;
}

const ERA_PALETTE = [
  { bg: '#4a6741', accent: '#7cb668' },
  { bg: '#5c6b3d', accent: '#9aab6e' },
  { bg: '#6b5d3d', accent: '#b39b6b' },
  { bg: '#6b4d3d', accent: '#b3836b' },
  { bg: '#5c3d4a', accent: '#a36b83' },
  { bg: '#4a3d5c', accent: '#836ba3' },
  { bg: '#3d4a5c', accent: '#6b83a3' },
  { bg: '#3d5c5c', accent: '#6ba3a3' },
];

export function getEraColor(index: number, total: number) {
  const i = Math.floor((index / Math.max(total - 1, 1)) * (ERA_PALETTE.length - 1));
  return ERA_PALETTE[Math.min(i, ERA_PALETTE.length - 1)];
}

export function formatYearsAgo(yearsAgo: number): string {
  if (yearsAgo >= 1_000_000_000) return `${(yearsAgo / 1_000_000_000).toFixed(1)}B`;
  if (yearsAgo >= 1_000_000) return `${(yearsAgo / 1_000_000).toFixed(0)}M`;
  if (yearsAgo >= 1_000) return `${(yearsAgo / 1_000).toFixed(0)}K`;
  return yearsAgo.toString();
}

export function mapTimeToEra(yearsAgo: number, boundaries: EraBoundary[]): EraBoundary | null {
  if (boundaries.length === 0) return null;
  const sorted = [...boundaries].sort((a, b) => a.yearsAgo - b.yearsAgo);
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (yearsAgo >= sorted[i].yearsAgo) return sorted[i];
  }
  return sorted[0];
}

function findNearest(yearsAgo: number, boundaries: EraBoundary[]): EraBoundary | null {
  if (boundaries.length === 0) return null;
  return boundaries.reduce((n, b) => Math.abs(yearsAgo - b.yearsAgo) < Math.abs(yearsAgo - n.yearsAgo) ? b : n);
}

function toPercent(yearsAgo: number, min: number, max: number): number {
  const logMin = Math.log10(Math.max(min, 1));
  const logMax = Math.log10(Math.max(max, 1));
  const logVal = Math.log10(Math.max(yearsAgo, 1));
  return ((logVal - logMin) / (logMax - logMin)) * 100;
}

function toYearsAgo(pct: number, min: number, max: number): number {
  const logMin = Math.log10(Math.max(min, 1));
  const logMax = Math.log10(Math.max(max, 1));
  return Math.pow(10, logMin + (pct / 100) * (logMax - logMin));
}

function calcTransition(yearsAgo: number, boundaries: EraBoundary[]) {
  if (boundaries.length === 0) return { currentEra: null, nextEra: null, progress: 0 };
  const sorted = [...boundaries].sort((a, b) => a.yearsAgo - b.yearsAgo);
  let idx = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (yearsAgo >= sorted[i].yearsAgo) { idx = i; break; }
  }
  const curr = sorted[idx];
  const next = sorted[idx + 1] || null;
  if (!next) return { currentEra: curr, nextEra: null, progress: 0 };
  const prog = Math.max(0, Math.min(1, (yearsAgo - curr.yearsAgo) / (next.yearsAgo - curr.yearsAgo)));
  return { currentEra: curr, nextEra: next, progress: prog };
}

export function TimeSlider(props: TimeSliderProps) {
  const {
    value, onChange, eraBoundaries, minYearsAgo = 1000, maxYearsAgo,
    snapToEra = true, onEraSelect, enableHaptics = true, onEraBoundaryCrossed, onTransitionChange,
  } = props;

  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(value);
  const trackRef = useRef<HTMLDivElement>(null);
  const prevEraRef = useRef<EraBoundary | null>(null);
  const lastValRef = useRef(value);

  const maxVal = maxYearsAgo ?? Math.max(...eraBoundaries.map(b => b.yearsAgo), 1_000_000_000);
  const currEra = mapTimeToEra(isDragging ? dragValue : value, eraBoundaries);
  const sorted = [...eraBoundaries].sort((a, b) => a.yearsAgo - b.yearsAgo);
  const currIdx = currEra ? sorted.findIndex(b => b.layerId === currEra.layerId) : 0;
  const currColor = getEraColor(currIdx, sorted.length);

  useEffect(() => {
    if (!onTransitionChange) return;
    const val = isDragging ? dragValue : value;
    const { currentEra: ce, nextEra: ne, progress: p } = calcTransition(val, eraBoundaries);
    const dir = val > lastValRef.current ? 'forward' : val < lastValRef.current ? 'backward' : null;
    onTransitionChange({ isDragging, currentEra: ce, nextEra: ne, progress: p, direction: dir });
    lastValRef.current = val;
  }, [isDragging, dragValue, value, eraBoundaries, onTransitionChange]);

  useEffect(() => { if (!isDragging) setDragValue(value); }, [value, isDragging]);
  useEffect(() => { if (!isDragging) prevEraRef.current = mapTimeToEra(value, eraBoundaries); }, [value, eraBoundaries, isDragging]);

  const onPointerMove = useCallback((clientY: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    const newVal = toYearsAgo(pct, minYearsAgo, maxVal);
    const newEra = mapTimeToEra(newVal, eraBoundaries);
    if (newEra && prevEraRef.current && newEra.layerId !== prevEraRef.current.layerId) {
      if (enableHaptics && hapticController.isSupported()) {
        hapticController.pulseEraBoundary(getHapticIntensityForEra(newEra.eraName));
      }
      onEraBoundaryCrossed?.(prevEraRef.current, newEra);
    }
    prevEraRef.current = newEra;
    setDragValue(newVal);
  }, [minYearsAgo, maxVal, eraBoundaries, enableHaptics, onEraBoundaryCrossed]);

  const onPointerEnd = useCallback(() => {
    setIsDragging(false);
    if (enableHaptics && hapticController.isSupported()) hapticController.pulseConfirm();
    if (snapToEra && eraBoundaries.length > 0) {
      const nearest = findNearest(dragValue, eraBoundaries);
      if (nearest) { onChange(nearest.yearsAgo); return; }
    }
    onChange(dragValue);
  }, [dragValue, snapToEra, eraBoundaries, onChange, enableHaptics]);

  const onEraClick = useCallback((b: EraBoundary) => { onChange(b.yearsAgo); onEraSelect?.(b); }, [onChange, onEraSelect]);
  const handleMouseDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); setIsDragging(true); onPointerMove(e.clientY); }, [onPointerMove]);
  const handleTouchStart = useCallback((e: React.TouchEvent) => { setIsDragging(true); onPointerMove(e.touches[0].clientY); }, [onPointerMove]);
  const handleTouchMove = useCallback((e: React.TouchEvent) => { if (isDragging) onPointerMove(e.touches[0].clientY); }, [isDragging, onPointerMove]);

  useEffect(() => {
    if (!isDragging) return;
    const move = (e: MouseEvent) => onPointerMove(e.clientY);
    const up = () => onPointerEnd();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [isDragging, onPointerMove, onPointerEnd]);

  const thumbPct = toPercent(isDragging ? dragValue : value, minYearsAgo, maxVal);

  return (
    <div className="flex h-full gap-3 select-none">
      <div ref={trackRef} className="relative w-14 h-full rounded-xl cursor-pointer overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #1a1f1a 0%, #1a1a1f 100%)', boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}
        onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={() => isDragging && onPointerEnd()}>
        {sorted.map((b, i) => {
          const start = toPercent(b.yearsAgo, minYearsAgo, maxVal);
          const next = sorted[i + 1];
          const end = next ? toPercent(next.yearsAgo, minYearsAgo, maxVal) : 100;
          const c = getEraColor(i, sorted.length);
          const active = currEra?.layerId === b.layerId;
          return (
            <button key={b.layerId} className="absolute inset-x-1 rounded transition-all duration-200"
              style={{ top: `calc(${start}% + 2px)`, height: `calc(${Math.max(end - start, 2)}% - 4px)`,
                background: active ? `linear-gradient(135deg, ${c.accent}40, ${c.bg})` : `linear-gradient(135deg, ${c.bg}80, ${c.bg}40)`,
                opacity: active ? 1 : 0.6, boxShadow: active ? `0 0 20px ${c.accent}40` : 'none' }}
              onClick={(e) => { e.stopPropagation(); onEraClick(b); }} aria-label={`Select ${b.eraName}`} />
          );
        })}
        <div className="absolute left-0 right-0 h-0.5 pointer-events-none transition-all duration-75"
          style={{ top: `${thumbPct}%`, transform: 'translateY(-50%)', background: `linear-gradient(90deg, transparent, ${currColor.accent}, transparent)`, boxShadow: `0 0 16px ${currColor.accent}` }} />
        <div className={`absolute pointer-events-none transition-all duration-100 ${isDragging ? 'scale-110' : ''}`}
          style={{ top: `${thumbPct}%`, left: '50%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-5 h-5 rounded-full border-2 border-white"
            style={{ background: `radial-gradient(circle at 30% 30%, ${currColor.accent}, ${currColor.bg})`, boxShadow: `0 0 20px ${currColor.accent}, 0 2px 8px rgba(0,0,0,0.5)` }} />
        </div>
        <div className="absolute top-3 left-0 right-0 text-center pointer-events-none">
          <span className="text-[8px] font-semibold text-white/30 uppercase tracking-widest">Now</span>
        </div>
        <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
          <span className="text-[8px] font-semibold text-white/30 uppercase tracking-widest">Deep</span>
        </div>
      </div>
      <div className="flex flex-col justify-center min-w-[90px]">
        {currEra && (
          <div className={`transition-all duration-150 ${isDragging ? 'opacity-100' : 'opacity-70'}`}>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: currColor.accent }}>{currEra.eraName}</div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-light text-white tabular-nums">{formatYearsAgo(isDragging ? dragValue : value)}</span>
              <span className="text-[9px] text-white/40">ya</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TimeSlider;
