/**
 * EraCard Component
 * Displays era information with narrative and era-appropriate visuals
 * Requirements: 2.2, 4.1, 4.2, 4.3
 */

import type { GeologicalLayer, Narrative } from 'deep-time-core/types';
import { formatYearsAgo } from './TimeSlider';

export interface EraCardProps {
  era: GeologicalLayer | null;
  narrative: Narrative | null;
  isLoading: boolean;
  onARClick?: () => void;
  webXRSupported?: boolean;
}

interface EraTheme {
  gradient: string;
  accent: string;
  icon: string;
}

const ERA_THEMES: Record<string, EraTheme> = {
  precambrian: { gradient: 'from-rose-950/80 via-deep-800 to-amber-950/40', accent: '#f87171', icon: '🌋' },
  archean: { gradient: 'from-rose-950/80 via-deep-800 to-orange-950/40', accent: '#fb923c', icon: '🌋' },
  cambrian: { gradient: 'from-teal-950/80 via-deep-800 to-cyan-950/40', accent: '#2dd4bf', icon: '🦐' },
  ordovician: { gradient: 'from-cyan-950/80 via-deep-800 to-teal-950/40', accent: '#22d3d1', icon: '🐚' },
  silurian: { gradient: 'from-emerald-950/80 via-deep-800 to-teal-950/40', accent: '#34d399', icon: '🐚' },
  devonian: { gradient: 'from-blue-950/80 via-deep-800 to-cyan-950/40', accent: '#60a5fa', icon: '🐟' },
  carboniferous: { gradient: 'from-slate-900/80 via-deep-800 to-zinc-900/40', accent: '#94a3b8', icon: '🌿' },
  permian: { gradient: 'from-orange-950/80 via-deep-800 to-red-950/40', accent: '#f97316', icon: '🦎' },
  triassic: { gradient: 'from-amber-950/80 via-deep-800 to-orange-950/40', accent: '#fbbf24', icon: '🦕' },
  jurassic: { gradient: 'from-green-950/80 via-deep-800 to-emerald-950/40', accent: '#4ade80', icon: '🦖' },
  cretaceous: { gradient: 'from-lime-950/80 via-deep-800 to-green-950/40', accent: '#a3e635', icon: '🦴' },
  paleocene: { gradient: 'from-yellow-950/80 via-deep-800 to-amber-950/40', accent: '#facc15', icon: '🐎' },
  eocene: { gradient: 'from-amber-950/80 via-deep-800 to-yellow-950/40', accent: '#fcd34d', icon: '🐎' },
  oligocene: { gradient: 'from-orange-950/80 via-deep-800 to-amber-950/40', accent: '#fdba74', icon: '🦣' },
  miocene: { gradient: 'from-stone-900/80 via-deep-800 to-amber-950/40', accent: '#d6d3d1', icon: '🦣' },
  pliocene: { gradient: 'from-zinc-900/80 via-deep-800 to-stone-900/40', accent: '#a1a1aa', icon: '🦍' },
  pleistocene: { gradient: 'from-sky-950/80 via-deep-800 to-blue-950/40', accent: '#38bdf8', icon: '🧊' },
  holocene: { gradient: 'from-emerald-950/80 via-deep-800 to-green-950/40', accent: '#10b981', icon: '🌍' },
  quaternary: { gradient: 'from-blue-950/80 via-deep-800 to-sky-950/40', accent: '#3b82f6', icon: '🌍' },
  default: { gradient: 'from-deep-700 via-deep-800 to-deep-900', accent: '#6b7280', icon: '🪨' },
};

function getEraTheme(eraName: string): EraTheme {
  const name = eraName.toLowerCase();
  for (const [key, theme] of Object.entries(ERA_THEMES)) {
    if (name.includes(key)) return theme;
  }
  return ERA_THEMES.default;
}

/** Legacy helper for background gradient class */
export function getEraBackground(eraName: string): string {
  const theme = getEraTheme(eraName);
  return `bg-gradient-to-br ${theme.gradient}`;
}

/** Legacy helper for era icon */
export function getEraIcon(eraName: string): string {
  return getEraTheme(eraName).icon;
}

function EraCardSkeleton() {
  return (
    <div className="rounded-2xl p-5 animate-pulse bg-deep-800">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-xl bg-white/5" />
        <div className="flex-1">
          <div className="h-5 w-32 bg-white/10 rounded mb-2" />
          <div className="h-4 w-24 bg-white/5 rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full bg-white/5 rounded" />
        <div className="h-4 w-5/6 bg-white/5 rounded" />
        <div className="h-4 w-4/6 bg-white/5 rounded" />
      </div>
    </div>
  );
}


export function EraCard({ era, narrative, isLoading, onARClick, webXRSupported = false }: EraCardProps) {
  if (!era) return <EraCardSkeleton />;

  const theme = getEraTheme(era.era.name);

  return (
    <div
      className={`rounded-2xl overflow-hidden bg-gradient-to-br ${theme.gradient}`}
      style={{ boxShadow: `0 4px 30px ${theme.accent}15, inset 0 1px 0 rgba(255,255,255,0.05)` }}
    >
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent}10)` }}
            >
              {theme.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{era.era.name}</h2>
              <p className="text-sm text-white/50">
                {formatYearsAgo(era.era.yearsAgo)} years ago
              </p>
            </div>
          </div>

          {webXRSupported && onARClick && (
            <button
              onClick={onARClick}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
              style={{ background: `${theme.accent}20`, color: theme.accent }}
            >
              <span className="text-sm font-medium">AR</span>
            </button>
          )}
        </div>
      </div>

      <div className="px-5 pb-5">
        {isLoading && !narrative ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-full bg-white/5 rounded" />
            <div className="h-4 w-5/6 bg-white/5 rounded" />
            <div className="h-4 w-4/6 bg-white/5 rounded" />
          </div>
        ) : narrative ? (
          <div>
            <p className="text-white/80 leading-relaxed mb-4">{narrative.shortDescription}</p>

            {narrative.climate && (
              <div className="mb-4 p-3 rounded-xl bg-black/20">
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-white/40 block mb-1">Temp</span>
                    <span className="text-white/80">{narrative.climate.temperature}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block mb-1">Humidity</span>
                    <span className="text-white/80">{narrative.climate.humidity}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block mb-1">Atmosphere</span>
                    <span className="text-white/80">{narrative.climate.atmosphere}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {narrative.flora && narrative.flora.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 text-green-400">🌿 Flora</h3>
                  <ul className="text-sm text-white/60 space-y-1">
                    {narrative.flora.slice(0, 3).map((plant, i) => (
                      <li key={i} className="truncate">• {plant}</li>
                    ))}
                  </ul>
                </div>
              )}
              {narrative.fauna && narrative.fauna.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold mb-2 text-amber-400">🦎 Fauna</h3>
                  <ul className="text-sm text-white/60 space-y-1">
                    {narrative.fauna.slice(0, 3).map((creature, i) => (
                      <li key={i} className="truncate">• {creature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-white/40 italic">No narrative available.</p>
        )}
      </div>

      <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between text-xs text-white/40">
        <span>Depth: {era.depthStart}m – {era.depthEnd}m</span>
        <span className="capitalize">{era.material}</span>
        {era.fossilIndex !== 'none' && (
          <span>🦴 {era.fossilIndex}</span>
        )}
      </div>
    </div>
  );
}

export default EraCard;
