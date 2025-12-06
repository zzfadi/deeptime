/**
 * useEraGlyph Hook
 * Manages AI-generated glyph codes for era icons with caching
 */

import { useState, useEffect, useCallback } from 'react';
import { generateGlyphCode, getDefaultGlyphCode } from '../services/ai/glyphGenerator';
import type { Narrative } from 'deep-time-core/types';

interface UseEraGlyphOptions {
  eraName: string;
  narrative?: Narrative | null;
  enabled?: boolean;
}

interface UseEraGlyphResult {
  glyphCode: string;
  isLoading: boolean;
  isAIGenerated: boolean;
  refresh: () => void;
}

// In-memory cache for session
const glyphCache = new Map<string, string>();

export function useEraGlyph({ eraName, narrative, enabled = true }: UseEraGlyphOptions): UseEraGlyphResult {
  const [glyphCode, setGlyphCode] = useState<string>(() => getDefaultGlyphCode(eraName));
  const [isLoading, setIsLoading] = useState(false);
  const [isAIGenerated, setIsAIGenerated] = useState(false);

  const cacheKey = `${eraName}:${narrative?.climate?.temperature || ''}`;

  const fetchGlyph = useCallback(async () => {
    if (!enabled || !eraName) return;

    // Check memory cache first
    const cached = glyphCache.get(cacheKey);
    if (cached) {
      setGlyphCode(cached);
      setIsAIGenerated(true);
      return;
    }

    setIsLoading(true);
    try {
      const code = await generateGlyphCode(eraName, {
        climate: narrative?.climate?.temperature,
        dominantLife: [
          ...(narrative?.fauna?.slice(0, 2) || []),
          ...(narrative?.flora?.slice(0, 2) || []),
        ],
      });

      glyphCache.set(cacheKey, code);
      setGlyphCode(code);
      setIsAIGenerated(code !== getDefaultGlyphCode(eraName));
    } catch (error) {
      console.warn('[useEraGlyph] Failed to generate glyph:', error);
      // Keep default
    } finally {
      setIsLoading(false);
    }
  }, [eraName, narrative, enabled, cacheKey]);

  useEffect(() => {
    // Set default immediately
    setGlyphCode(getDefaultGlyphCode(eraName));
    setIsAIGenerated(false);
    
    // Then try to fetch AI-generated one
    fetchGlyph();
  }, [eraName, fetchGlyph]);

  const refresh = useCallback(() => {
    glyphCache.delete(cacheKey);
    fetchGlyph();
  }, [cacheKey, fetchGlyph]);

  return {
    glyphCode,
    isLoading,
    isAIGenerated,
    refresh,
  };
}

export default useEraGlyph;
