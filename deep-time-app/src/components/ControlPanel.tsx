/**
 * Control Panel Component
 * A unified, sleek floating panel combining settings and AI dashboard
 * Mobile-first design with geological theme
 */

import { useState, useEffect, useCallback } from 'react';
import { costTrackingService } from '../services/ai/costTrackingService';
import type { DailyCostRecord } from '../services/ai/types';
import { getStoredApiKey, storeApiKey, clearApiKey, hasApiKey } from './ApiKeyModal';

// ============================================
// Types
// ============================================

export interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyChange?: (hasKey: boolean) => void;
}

type TabId = 'dashboard' | 'settings';

interface DashboardMetrics {
  apiCalls: number;
  cacheHits: number;
  totalCost: number;
  textCost: number;
  imageCost: number;
  videoCost: number;
  cacheHitRate: number;
}

// ============================================
// Utility Functions (exported for testing)
// ============================================

export function calculateCacheHitRate(apiCalls: number, cacheHits: number): number {
  const total = apiCalls + cacheHits;
  if (total === 0) return 0;
  return cacheHits / total;
}

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

// ============================================
// Main Component
// ============================================

export function ControlPanel({ isOpen, onClose, onApiKeyChange }: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  
  // Settings state
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState(hasApiKey());

  // Load metrics
  const loadMetrics = useCallback(async () => {
    try {
      setIsLoadingMetrics(true);
      const dailyCost = await costTrackingService.getDailyCost();
      setMetrics(transformToDashboardMetrics(dailyCost));
    } catch (err) {
      console.error('[ControlPanel] Error loading metrics:', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadMetrics();
      const stored = getStoredApiKey();
      if (stored) setApiKey(stored);
    }
  }, [isOpen, loadMetrics]);

  // Handle API key save
  const handleSaveKey = () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setKeyError('Please enter an API key');
      return;
    }
    if (!trimmedKey.startsWith('AI')) {
      setKeyError('Invalid format. Gemini keys start with "AI"');
      return;
    }
    storeApiKey(trimmedKey);
    setHasKey(true);
    setKeyError(null);
    onApiKeyChange?.(true);
  };

  const handleClearKey = () => {
    clearApiKey();
    setApiKey('');
    setHasKey(false);
    onApiKeyChange?.(false);
  };

  if (!isOpen) return null;

  const formatCost = (cost: number): string => {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slideUp">
        <div 
          className="mx-auto max-w-lg rounded-t-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #1a1f2e 0%, #0f1219 100%)',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header with tabs */}
          <div className="px-5 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white/90 tracking-tight">
                Control Center
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab switcher */}
            <div 
              className="flex p-1 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <TabButton
                active={activeTab === 'dashboard'}
                onClick={() => setActiveTab('dashboard')}
                icon="📊"
                label="Dashboard"
              />
              <TabButton
                active={activeTab === 'settings'}
                onClick={() => setActiveTab('settings')}
                icon={hasKey ? '⚙️' : '🔑'}
                label="Settings"
              />
            </div>
          </div>

          {/* Content area */}
          <div 
            className="px-5 pb-8 max-h-[60vh] overflow-y-auto"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.1) transparent',
            }}
          >
            {activeTab === 'dashboard' ? (
              <DashboardTab metrics={metrics} isLoading={isLoadingMetrics} formatCost={formatCost} />
            ) : (
              <SettingsTab
                apiKey={apiKey}
                setApiKey={setApiKey}
                showKey={showKey}
                setShowKey={setShowKey}
                keyError={keyError}
                setKeyError={setKeyError}
                hasKey={hasKey}
                onSave={handleSaveKey}
                onClear={handleClearKey}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================
// Tab Button
// ============================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg
        text-sm font-medium transition-all duration-200
        ${active 
          ? 'bg-gradient-to-r from-amber-600/30 to-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/10' 
          : 'text-white/40 hover:text-white/60 hover:bg-white/5'
        }
      `}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ============================================
// Dashboard Tab
// ============================================

interface DashboardTabProps {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  formatCost: (cost: number) => string;
}

function DashboardTab({ metrics, isLoading, formatCost }: DashboardTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-white/5" />
          ))}
        </div>
        <div className="h-24 rounded-xl bg-white/5" />
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-white/40">
        <span className="text-3xl mb-2 block">⚠️</span>
        <p>Unable to load metrics</p>
      </div>
    );
  }

  const cachePercent = Math.round(metrics.cacheHitRate * 100);
  const getCacheColor = () => {
    if (cachePercent >= 70) return { ring: '#10b981', text: 'text-emerald-400', bg: 'from-emerald-500/20' };
    if (cachePercent >= 40) return { ring: '#fbbf24', text: 'text-amber-400', bg: 'from-amber-500/20' };
    return { ring: '#f87171', text: 'text-rose-400', bg: 'from-rose-500/20' };
  };
  const cacheColor = getCacheColor();

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <MiniMetricCard
          value={metrics.apiCalls}
          label="API Calls"
          gradient="from-blue-500/20 to-blue-600/5"
          textColor="text-blue-400"
        />
        <MiniMetricCard
          value={metrics.cacheHits}
          label="Cache Hits"
          gradient="from-emerald-500/20 to-emerald-600/5"
          textColor="text-emerald-400"
        />
        <MiniMetricCard
          value={formatCost(metrics.totalCost)}
          label="Cost"
          gradient="from-amber-500/20 to-amber-600/5"
          textColor="text-amber-400"
        />
      </div>

      {/* Cache efficiency ring */}
      <div 
        className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${cacheColor.bg} to-transparent`}
        style={{ border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <CacheRing percent={cachePercent} color={cacheColor.ring} />
        <div>
          <div className={`text-2xl font-bold ${cacheColor.text}`}>{cachePercent}%</div>
          <div className="text-xs text-white/40">Cache efficiency</div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div 
        className="p-4 rounded-2xl"
        style={{ 
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="text-xs text-white/40 uppercase tracking-wider mb-3">Cost Breakdown</div>
        <div className="space-y-3">
          <CostBar label="Text" cost={metrics.textCost} total={metrics.totalCost} color="bg-blue-500" />
          <CostBar label="Image" cost={metrics.imageCost} total={metrics.totalCost} color="bg-purple-500" />
          <CostBar label="Video" cost={metrics.videoCost} total={metrics.totalCost} color="bg-rose-500" />
        </div>
      </div>

      {metrics.apiCalls === 0 && metrics.cacheHits === 0 && (
        <div className="text-center py-4 text-white/30 text-sm">
          <span className="text-2xl block mb-1">🌙</span>
          No usage today
        </div>
      )}
    </div>
  );
}

// ============================================
// Mini Metric Card
// ============================================

interface MiniMetricCardProps {
  value: string | number;
  label: string;
  gradient: string;
  textColor: string;
}

function MiniMetricCard({ value, label, gradient, textColor }: MiniMetricCardProps) {
  return (
    <div 
      className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}
      style={{ border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className={`text-xl font-bold ${textColor} mb-0.5`}>{value}</div>
      <div className="text-[10px] text-white/40 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ============================================
// Cache Ring
// ============================================

interface CacheRingProps {
  percent: number;
  color: string;
}

function CacheRing({ percent, color }: CacheRingProps) {
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width="56" height="56" viewBox="0 0 50 50" className="-rotate-90">
      <circle
        cx="25" cy="25" r="20"
        fill="none"
        stroke="rgba(255,255,255,0.05)"
        strokeWidth="5"
      />
      <circle
        cx="25" cy="25" r="20"
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ 
          transition: 'stroke-dashoffset 0.8s ease-out',
          filter: `drop-shadow(0 0 6px ${color}50)`,
        }}
      />
    </svg>
  );
}

// ============================================
// Cost Bar
// ============================================

interface CostBarProps {
  label: string;
  cost: number;
  total: number;
  color: string;
}

function CostBar({ label, cost, total, color }: CostBarProps) {
  const percent = total > 0 ? (cost / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 text-xs text-white/50">{label}</div>
      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="w-16 text-right text-xs text-white/60">
        ${cost.toFixed(4)}
      </div>
    </div>
  );
}

// ============================================
// Settings Tab
// ============================================

interface SettingsTabProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  showKey: boolean;
  setShowKey: (show: boolean) => void;
  keyError: string | null;
  setKeyError: (error: string | null) => void;
  hasKey: boolean;
  onSave: () => void;
  onClear: () => void;
}

function SettingsTab({
  apiKey,
  setApiKey,
  showKey,
  setShowKey,
  keyError,
  setKeyError,
  hasKey,
  onSave,
  onClear,
}: SettingsTabProps) {
  return (
    <div className="space-y-5">
      {/* API Key Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔑</span>
          <span className="text-sm font-medium text-white/80">Gemini API Key</span>
          {hasKey && (
            <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400">
              Configured
            </span>
          )}
        </div>
        
        <div className="relative mb-3">
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setKeyError(null);
            }}
            placeholder="AIza..."
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 pr-12 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>

        {keyError && (
          <p className="text-rose-400 text-xs mb-3">{keyError}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white text-sm font-medium hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg shadow-amber-500/20"
          >
            Save Key
          </button>
          {hasKey && (
            <button
              onClick={onClear}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 text-rose-400 text-sm font-medium hover:bg-rose-500/20 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Help section */}
      <div 
        className="p-4 rounded-xl"
        style={{ 
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="text-xs text-white/40 uppercase tracking-wider mb-2">How to get a key</div>
        <ol className="text-xs text-white/50 space-y-1.5 list-decimal list-inside">
          <li>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Google AI Studio</a></li>
          <li>Sign in with Google</li>
          <li>Click "Create API Key"</li>
          <li>Paste it above</li>
        </ol>
      </div>

      {/* App info */}
      <div className="text-center pt-2">
        <div className="text-xs text-white/20">
          DeepTime v1.0 • Your key stays on device
        </div>
      </div>
    </div>
  );
}

export default ControlPanel;
