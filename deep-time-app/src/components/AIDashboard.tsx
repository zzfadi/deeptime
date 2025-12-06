/**
 * AI Dashboard Component
 * Displays AI API usage metrics with dark geological theme
 * Requirements: 1.1, 1.2, 1.3
 * 
 * Property 1: Metrics display accuracy
 * Property 2: Cache hit rate calculation
 * Property 3: Cost breakdown accuracy
 */

import { useEffect, useState, useCallback } from 'react';
import { costTrackingService } from '../services/ai/costTrackingService';
import type { DailyCostRecord } from '../services/ai/types';

// ============================================
// Types
// ============================================

export interface AIDashboardProps {
  onBack: () => void;
}

interface DashboardMetrics {
  apiCalls: number;
  cacheHits: number;
  totalCost: number;
  textCost: number;
  imageCost: number;
  videoCost: number;
  cacheHitRate: number;
}

interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  subtext?: string;
  color?: 'amber' | 'emerald' | 'blue' | 'purple' | 'rose';
}

// ============================================
// Color Themes
// ============================================

const COLOR_THEMES = {
  amber: {
    bg: 'from-amber-950/40 to-amber-900/20',
    border: 'border-amber-800/30',
    icon: 'from-amber-600/30 to-amber-500/10',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/10',
  },
  emerald: {
    bg: 'from-emerald-950/40 to-emerald-900/20',
    border: 'border-emerald-800/30',
    icon: 'from-emerald-600/30 to-emerald-500/10',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
  },
  blue: {
    bg: 'from-blue-950/40 to-blue-900/20',
    border: 'border-blue-800/30',
    icon: 'from-blue-600/30 to-blue-500/10',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/10',
  },
  purple: {
    bg: 'from-purple-950/40 to-purple-900/20',
    border: 'border-purple-800/30',
    icon: 'from-purple-600/30 to-purple-500/10',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/10',
  },
  rose: {
    bg: 'from-rose-950/40 to-rose-900/20',
    border: 'border-rose-800/30',
    icon: 'from-rose-600/30 to-rose-500/10',
    text: 'text-rose-400',
    glow: 'shadow-rose-500/10',
  },
};

// ============================================
// MetricCard Component
// ============================================

function MetricCard({ icon, label, value, subtext, color = 'amber' }: MetricCardProps) {
  const theme = COLOR_THEMES[color];
  
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl p-5
        bg-gradient-to-br ${theme.bg}
        border ${theme.border}
        shadow-lg ${theme.glow}
        transition-all duration-300 hover:scale-[1.02]
      `}
    >
      {/* Subtle grain texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center text-xl
              bg-gradient-to-br ${theme.icon}
            `}
          >
            {icon}
          </div>
        </div>
        
        <div className={`text-3xl font-bold ${theme.text} mb-1 tracking-tight`}>
          {value}
        </div>
        
        <div className="text-sm text-white/50 font-medium">
          {label}
        </div>
        
        {subtext && (
          <div className="text-xs text-white/30 mt-1">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// CacheHitRateIndicator Component
// ============================================

interface CacheHitRateIndicatorProps {
  rate: number; // 0-1
}

function CacheHitRateIndicator({ rate }: CacheHitRateIndicatorProps) {
  const percentage = Math.round(rate * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (rate * circumference);
  
  // Color based on rate
  const getColor = () => {
    if (percentage >= 70) return { stroke: '#10b981', text: 'text-emerald-400' };
    if (percentage >= 40) return { stroke: '#fbbf24', text: 'text-amber-400' };
    return { stroke: '#f87171', text: 'text-rose-400' };
  };
  
  const colors = getColor();
  
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-28 h-28">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={colors.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 8px ${colors.stroke}40)`,
            }}
          />
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${colors.text}`}>
            {percentage}%
          </span>
        </div>
      </div>
      
      <div>
        <div className="text-lg font-semibold text-white/90 mb-1">
          Cache Hit Rate
        </div>
        <div className="text-sm text-white/40">
          {percentage >= 70 ? 'Excellent efficiency' : 
           percentage >= 40 ? 'Good efficiency' : 
           'Consider caching more'}
        </div>
      </div>
    </div>
  );
}

// ============================================
// CostBreakdown Component
// ============================================

interface CostBreakdownProps {
  textCost: number;
  imageCost: number;
  videoCost: number;
  totalCost: number;
}

function CostBreakdown({ textCost, imageCost, videoCost, totalCost }: CostBreakdownProps) {
  const items = [
    { label: 'Text Generation', cost: textCost, icon: '📝', color: 'bg-blue-500' },
    { label: 'Image Generation', cost: imageCost, icon: '🖼️', color: 'bg-purple-500' },
    { label: 'Video Generation', cost: videoCost, icon: '🎬', color: 'bg-rose-500' },
  ];
  
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const percentage = totalCost > 0 ? (item.cost / totalCost) * 100 : 0;
        
        return (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm text-white/70">{item.label}</span>
              </div>
              <span className="text-sm font-medium text-white/90">
                ${item.cost.toFixed(4)}
              </span>
            </div>
            
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className={`h-full ${item.color} rounded-full transition-all duration-700 ease-out`}
                style={{ 
                  width: `${percentage}%`,
                  boxShadow: `0 0 10px ${item.color}40`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Main AIDashboard Component
// ============================================

/**
 * Calculate cache hit rate from API calls and cache hits
 * Property 2: Cache hit rate calculation
 * For any combination of apiCalls and cacheHits where total > 0,
 * the rate equals cacheHits / (apiCalls + cacheHits)
 */
export function calculateCacheHitRate(apiCalls: number, cacheHits: number): number {
  const total = apiCalls + cacheHits;
  if (total === 0) return 0;
  return cacheHits / total;
}

/**
 * Transform DailyCostRecord to DashboardMetrics
 * Property 1: Metrics display accuracy
 * Property 3: Cost breakdown accuracy
 */
export function transformToDashboardMetrics(record: DailyCostRecord | null): DashboardMetrics {
  if (!record) {
    return {
      apiCalls: 0,
      cacheHits: 0,
      totalCost: 0,
      textCost: 0,
      imageCost: 0,
      videoCost: 0,
      cacheHitRate: 0,
    };
  }
  
  return {
    apiCalls: record.apiCalls,
    cacheHits: record.cacheHits,
    totalCost: record.totalCost,
    textCost: record.textCost,
    imageCost: record.imageCost,
    videoCost: record.videoCost,
    cacheHitRate: calculateCacheHitRate(record.apiCalls, record.cacheHits),
  };
}

export function AIDashboard({ onBack }: AIDashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const loadMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const dailyCost = await costTrackingService.getDailyCost();
      const dashboardMetrics = transformToDashboardMetrics(dailyCost);
      setMetrics(dashboardMetrics);
    } catch (err) {
      setError('Failed to load metrics');
      console.error('[AIDashboard] Error loading metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);
  
  const formatCost = (cost: number): string => {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };
  
  return (
    <div className="min-h-screen bg-deep-900 text-white">
      {/* Subtle background texture */}
      <div 
        className="fixed inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-deep-900/95 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            aria-label="Go back"
          >
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div>
            <h1 className="text-xl font-bold text-white">AI Usage Dashboard</h1>
            <p className="text-sm text-white/40">Today's API metrics</p>
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {isLoading ? (
          <DashboardSkeleton />
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-white/60 mb-4">{error}</p>
            <button
              onClick={loadMetrics}
              className="px-4 py-2 bg-amber-600/20 text-amber-400 rounded-lg hover:bg-amber-600/30 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : metrics ? (
          <div className="space-y-6 animate-fadeIn">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MetricCard
                icon="📡"
                label="API Calls"
                value={metrics.apiCalls}
                subtext="Requests to AI services"
                color="blue"
              />
              <MetricCard
                icon="💾"
                label="Cache Hits"
                value={metrics.cacheHits}
                subtext="Served from cache"
                color="emerald"
              />
              <MetricCard
                icon="💰"
                label="Total Cost"
                value={formatCost(metrics.totalCost)}
                subtext="Estimated spend today"
                color="amber"
              />
            </div>
            
            {/* Cache Hit Rate Section */}
            <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900/60 to-slate-800/30 border border-white/5">
              <CacheHitRateIndicator rate={metrics.cacheHitRate} />
            </div>
            
            {/* Cost Breakdown Section */}
            <div className="rounded-2xl p-6 bg-gradient-to-br from-slate-900/60 to-slate-800/30 border border-white/5">
              <h2 className="text-lg font-semibold text-white/90 mb-4 flex items-center gap-2">
                <span>📊</span>
                Cost Breakdown
              </h2>
              <CostBreakdown
                textCost={metrics.textCost}
                imageCost={metrics.imageCost}
                videoCost={metrics.videoCost}
                totalCost={metrics.totalCost}
              />
            </div>
            
            {/* No usage message */}
            {metrics.apiCalls === 0 && metrics.cacheHits === 0 && (
              <div className="text-center py-8 text-white/40">
                <div className="text-4xl mb-3">🌙</div>
                <p>No usage today</p>
                <p className="text-sm mt-1">Start exploring eras to see metrics here</p>
              </div>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

// ============================================
// Skeleton Loading State
// ============================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl p-5 bg-white/5 h-36" />
        ))}
      </div>
      <div className="rounded-2xl p-6 bg-white/5 h-40" />
      <div className="rounded-2xl p-6 bg-white/5 h-48" />
    </div>
  );
}

export default AIDashboard;
