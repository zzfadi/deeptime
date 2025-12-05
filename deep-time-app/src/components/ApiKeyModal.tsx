/**
 * API Key Modal Component
 * Allows users to enter their own Gemini API key at runtime
 * This enables the app to work without a pre-configured API key
 */

import { useState, useEffect } from 'react';

const API_KEY_STORAGE_KEY = 'deeptime_gemini_api_key';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (apiKey: string) => void;
}

/**
 * Get stored API key from localStorage
 */
export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(API_KEY_STORAGE_KEY);
}

/**
 * Store API key in localStorage
 */
export function storeApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
}

/**
 * Clear stored API key
 */
export function clearApiKey(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

/**
 * Check if API key is configured (either env or localStorage)
 */
export function hasApiKey(): boolean {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  const storedKey = getStoredApiKey();
  return !!(envKey || storedKey);
}

/**
 * Get the active API key (env takes precedence)
 */
export function getActiveApiKey(): string | null {
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (envKey) return envKey;
  return getStoredApiKey();
}

export function ApiKeyModal({ isOpen, onClose, onSave }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredApiKey();
      if (stored) {
        setApiKey(stored);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    const trimmedKey = apiKey.trim();
    
    if (!trimmedKey) {
      setError('Please enter an API key');
      return;
    }

    // Basic validation - Gemini keys start with "AI"
    if (!trimmedKey.startsWith('AI')) {
      setError('Invalid API key format. Gemini keys start with "AI"');
      return;
    }

    storeApiKey(trimmedKey);
    onSave(trimmedKey);
    onClose();
  };

  const handleClear = () => {
    clearApiKey();
    setApiKey('');
    onSave('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-2">🔑 Gemini API Key</h2>
        <p className="text-gray-400 text-sm mb-4">
          Enter your Google Gemini API key to enable AI-powered narration.
          Your key is stored locally and never sent to our servers.
        </p>

        <div className="mb-4">
          <label className="block text-sm text-gray-300 mb-2">API Key</label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(null);
              }}
              placeholder="AIza..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showKey ? '🙈' : '👁️'}
            </button>
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-2">{error}</p>
          )}
        </div>

        <div className="bg-slate-900/50 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-300 mb-2">📝 How to get a key:</p>
          <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google AI Studio</a></li>
            <li>Sign in with your Google account</li>
            <li>Click "Create API Key"</li>
            <li>Copy and paste it here</li>
          </ol>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors"
          >
            Cancel
          </button>
          {apiKey && (
            <button
              onClick={handleClear}
              className="px-4 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl transition-colors"
            >
              Clear
            </button>
          )}
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApiKeyModal;
