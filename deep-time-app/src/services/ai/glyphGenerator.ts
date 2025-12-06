/**
 * Glyph Generator Service
 * Generates compact glyph codes from AI that render as fossil imprint icons
 * 
 * Glyph Code Format: "shape:color:size|shape:color:size|..."
 * Example: "spiral:amber:3|shell:teal:2|dot:rose:5"
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getActiveApiKey } from '../../components/ApiKeyModal';

// Simple localStorage cache for glyph codes
const GLYPH_CACHE_PREFIX = 'deeptime_glyph_';

function getCachedGlyph(key: string): string | null {
  try {
    return localStorage.getItem(GLYPH_CACHE_PREFIX + key);
  } catch {
    return null;
  }
}

function setCachedGlyph(key: string, code: string): void {
  try {
    localStorage.setItem(GLYPH_CACHE_PREFIX + key, code);
  } catch {
    // Storage full or unavailable
  }
}

// Available shapes for fossil imprints
export type GlyphShape = 
  | 'spiral'      // Ammonite-like spiral
  | 'shell'       // Bivalve shell curves
  | 'trilobite'   // Segmented trilobite pattern
  | 'fern'        // Fern frond pattern
  | 'bone'        // Bone cross-section
  | 'ring'        // Concentric rings (tree rings/growth)
  | 'wave'        // Ocean wave patterns
  | 'scale'       // Fish/reptile scales
  | 'tooth'       // Predator tooth shape
  | 'leaf'        // Leaf imprint
  | 'cell'        // Cellular/microscopic pattern
  | 'crystal';    // Mineral crystal formation

// Color palette for geological themes
export type GlyphColor = 
  | 'amber'    // Warm fossil tones
  | 'teal'     // Ocean/marine
  | 'rose'     // Volcanic/ancient
  | 'emerald'  // Plant life
  | 'slate'    // Stone/mineral
  | 'copper'   // Metallic deposits
  | 'ivory'    // Bone/shell
  | 'ochre'    // Earth pigments
  | 'cyan'     // Ice age/water
  | 'rust';    // Iron-rich deposits

export interface GlyphElement {
  shape: GlyphShape;
  color: GlyphColor;
  size: number; // 1-5 scale
  rotation?: number; // 0-360 degrees
}

export interface GlyphCode {
  elements: GlyphElement[];
  background: GlyphColor;
  style: 'imprint' | 'relief' | 'cross-section';
}

// Default glyph codes for each era (fallback when AI unavailable)
const DEFAULT_GLYPHS: Record<string, string> = {
  precambrian: 'cell:rose:3|ring:amber:2|crystal:slate:1',
  archean: 'crystal:amber:3|ring:rose:2|cell:ochre:2',
  cambrian: 'trilobite:teal:4|shell:cyan:2|wave:slate:1',
  ordovician: 'shell:teal:3|trilobite:cyan:2|wave:slate:2',
  silurian: 'shell:emerald:3|wave:teal:2|fern:slate:1',
  devonian: 'scale:teal:3|bone:ivory:2|fern:emerald:2',
  carboniferous: 'fern:emerald:4|scale:slate:2|ring:amber:1',
  permian: 'bone:ivory:3|scale:rust:2|fern:ochre:2',
  triassic: 'bone:amber:3|tooth:ivory:2|scale:ochre:2',
  jurassic: 'bone:emerald:4|tooth:ivory:2|fern:teal:1',
  cretaceous: 'bone:amber:3|tooth:ivory:3|leaf:emerald:2',
  paleocene: 'leaf:emerald:3|bone:ivory:2|shell:amber:1',
  eocene: 'leaf:amber:3|bone:ivory:2|fern:emerald:2',
  oligocene: 'bone:ochre:3|leaf:amber:2|ring:slate:1',
  miocene: 'bone:ivory:3|tooth:amber:2|leaf:ochre:2',
  pliocene: 'bone:slate:3|tooth:ivory:2|ring:ochre:1',
  pleistocene: 'bone:cyan:3|ring:slate:2|crystal:ivory:2',
  holocene: 'leaf:emerald:3|ring:amber:2|shell:teal:1',
  quaternary: 'ring:slate:3|leaf:emerald:2|bone:ivory:1',
};

/**
 * Parse a glyph code string into structured data
 */
export function parseGlyphCode(code: string): GlyphCode {
  const elements: GlyphElement[] = [];
  const parts = code.split('|').filter(p => p.trim());
  
  for (const part of parts) {
    const [shape, color, sizeStr, rotStr] = part.split(':');
    if (shape && color) {
      elements.push({
        shape: shape as GlyphShape,
        color: color as GlyphColor,
        size: Math.min(5, Math.max(1, parseInt(sizeStr) || 2)),
        rotation: rotStr ? parseInt(rotStr) : undefined,
      });
    }
  }
  
  // Determine background from dominant color
  const colorCounts = elements.reduce((acc, el) => {
    acc[el.color] = (acc[el.color] || 0) + el.size;
    return acc;
  }, {} as Record<string, number>);
  
  const dominantColor = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as GlyphColor || 'slate';
  
  return {
    elements,
    background: dominantColor,
    style: 'imprint',
  };
}

/**
 * Generate a glyph code string from structured data
 */
export function stringifyGlyphCode(glyph: GlyphCode): string {
  return glyph.elements
    .map(el => `${el.shape}:${el.color}:${el.size}${el.rotation ? ':' + el.rotation : ''}`)
    .join('|');
}

/**
 * Get default glyph code for an era
 */
export function getDefaultGlyphCode(eraName: string): string {
  const name = eraName.toLowerCase();
  for (const [key, code] of Object.entries(DEFAULT_GLYPHS)) {
    if (name.includes(key)) return code;
  }
  return 'ring:slate:3|crystal:amber:2|cell:ochre:1';
}

/**
 * Generate a glyph code using AI
 * Returns a compact string that can be rendered as an SVG fossil imprint
 */
export async function generateGlyphCode(
  eraName: string,
  characteristics?: {
    climate?: string;
    dominantLife?: string[];
    geologicalFeatures?: string[];
  }
): Promise<string> {
  const apiKey = getActiveApiKey();
  if (!apiKey) {
    return getDefaultGlyphCode(eraName);
  }

  // Check cache first
  const cacheKey = `${eraName}:${characteristics?.climate || ''}`;
  const cached = getCachedGlyph(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const shapes = 'spiral,shell,trilobite,fern,bone,ring,wave,scale,tooth,leaf,cell,crystal';
    const colors = 'amber,teal,rose,emerald,slate,copper,ivory,ochre,cyan,rust';

    const prompt = `Generate a fossil imprint glyph code for the ${eraName} era.
${characteristics?.dominantLife ? `Dominant life: ${characteristics.dominantLife.join(', ')}` : ''}
${characteristics?.climate ? `Climate: ${characteristics.climate}` : ''}

Return ONLY a glyph code in this exact format (no explanation):
shape:color:size|shape:color:size|shape:color:size

Rules:
- Use 2-4 elements
- Shapes: ${shapes}
- Colors: ${colors}
- Size: 1-5 (importance/prominence)
- Choose shapes that represent the era's dominant life forms
- Choose colors that match the era's environment

Example for Jurassic: bone:emerald:4|tooth:ivory:2|fern:teal:1`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Validate the response format
    const isValid = text.split('|').every(part => {
      const [shape, color, size] = part.split(':');
      return shape && color && size && !isNaN(parseInt(size));
    });

    if (isValid) {
      // Cache the result
      setCachedGlyph(cacheKey, text);
      return text;
    }
  } catch (error) {
    console.warn('[GlyphGenerator] AI generation failed, using default:', error);
  }

  return getDefaultGlyphCode(eraName);
}

export default {
  generateGlyphCode,
  parseGlyphCode,
  stringifyGlyphCode,
  getDefaultGlyphCode,
};
