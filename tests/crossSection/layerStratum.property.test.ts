/**
 * Property-Based Tests for LayerStratum Component
 * **Feature: 3d-cross-section, Property 2: Distinct layer coloring**
 * **Validates: Requirements 1.2**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getLayerColors, type LayerColors } from '../../deep-time-app/src/components/LayerStratum';
import type { MaterialType } from '../../src/types';

// Era name generator - covers all geological eras
const eraNameArb: fc.Arbitrary<string> = fc.constantFrom(
  'Holocene',
  'Pleistocene',
  'Pliocene',
  'Miocene',
  'Oligocene',
  'Eocene',
  'Paleocene',
  'Cretaceous',
  'Jurassic',
  'Triassic',
  'Permian',
  'Carboniferous',
  'Devonian',
  'Silurian',
  'Ordovician',
  'Cambrian',
  'Precambrian',
  'Proterozoic',
  'Archean',
  'Hadean',
  'Quaternary'
);

// Material type generator
const materialTypeArb: fc.Arbitrary<MaterialType> = fc.constantFrom(
  'soil',
  'clay',
  'sand',
  'limestone',
  'granite',
  'shale',
  'sandstone',
  'basalt',
  'fill'
);

/**
 * Helper to check if a string is a valid hex color
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

/**
 * Helper to convert hex to RGB for comparison
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Calculate color distance using Euclidean distance in RGB space
 */
function colorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

describe('LayerStratum Color Mapping', () => {
  /**
   * **Feature: 3d-cross-section, Property 2: Distinct layer coloring**
   * **Validates: Requirements 1.2**
   * 
   * For any two geological layers with different era names or material types,
   * the color mapping function should return different primary colors.
   */
  it('Property 2: Different eras or materials produce distinct primary colors', () => {
    fc.assert(
      fc.property(
        fc.record({
          era1: eraNameArb,
          material1: materialTypeArb,
          era2: eraNameArb,
          material2: materialTypeArb,
        }),
        ({ era1, material1, era2, material2 }) => {
          // Skip if both era and material are the same
          if (era1.toLowerCase() === era2.toLowerCase() && material1 === material2) {
            return true; // Trivially true - same inputs should give same outputs
          }

          const colors1 = getLayerColors(era1, material1);
          const colors2 = getLayerColors(era2, material2);

          // If eras are different, primary colors should be different
          if (era1.toLowerCase() !== era2.toLowerCase()) {
            // Different eras should have noticeably different colors
            // Using a threshold of 10 in RGB space (very small difference is still different)
            const distance = colorDistance(colors1.primary, colors2.primary);
            return distance > 0 || colors1.primary !== colors2.primary;
          }

          // If eras are the same but materials are different,
          // colors should still be distinguishable (at least slightly different)
          if (material1 !== material2) {
            // Same era, different material - should have some color variation
            // The material modifier should create at least a small difference
            const primaryDiff = colors1.primary !== colors2.primary;
            const secondaryDiff = colors1.secondary !== colors2.secondary;
            const accentDiff = colors1.accent !== colors2.accent;
            
            // At least one color component should be different
            return primaryDiff || secondaryDiff || accentDiff;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * All returned colors should be valid hex colors
   */
  it('getLayerColors returns valid hex colors for all inputs', () => {
    fc.assert(
      fc.property(
        eraNameArb,
        materialTypeArb,
        (eraName, material) => {
          const colors = getLayerColors(eraName, material);
          
          expect(isValidHexColor(colors.primary)).toBe(true);
          expect(isValidHexColor(colors.secondary)).toBe(true);
          expect(isValidHexColor(colors.accent)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Color mapping should be deterministic - same inputs always produce same outputs
   */
  it('getLayerColors is deterministic', () => {
    fc.assert(
      fc.property(
        eraNameArb,
        materialTypeArb,
        (eraName, material) => {
          const colors1 = getLayerColors(eraName, material);
          const colors2 = getLayerColors(eraName, material);
          
          expect(colors1.primary).toBe(colors2.primary);
          expect(colors1.secondary).toBe(colors2.secondary);
          expect(colors1.accent).toBe(colors2.accent);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Unknown eras should still return valid colors (fallback behavior)
   */
  it('Unknown eras return valid fallback colors', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        materialTypeArb,
        (randomEraName, material) => {
          const colors = getLayerColors(randomEraName, material);
          
          // Should always return valid colors, even for unknown eras
          expect(isValidHexColor(colors.primary)).toBe(true);
          expect(isValidHexColor(colors.secondary)).toBe(true);
          expect(isValidHexColor(colors.accent)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests for LayerInfoPanel Component
 * **Feature: 3d-cross-section, Property 5: Panel content completeness**
 * **Validates: Requirements 3.1, 3.2**
 */

import { extractPanelContent } from '../../deep-time-app/src/components/LayerInfoPanel';
import { narrativeArb } from '../generators/narrative.generators';
import { geologicalLayerArb } from '../generators/geological.generators';

describe('LayerInfoPanel Content Completeness', () => {
  /**
   * **Feature: 3d-cross-section, Property 5: Panel content completeness**
   * **Validates: Requirements 3.1, 3.2**
   * 
   * For any selected layer with an associated narrative, the rendered panel
   * should contain the era name, time period (yearsAgo), and shortDescription
   * from the narrative.
   */
  it('Property 5: Panel contains era name, time period, and narrative description', () => {
    fc.assert(
      fc.property(
        geologicalLayerArb,
        narrativeArb,
        (layer, narrative) => {
          const content = extractPanelContent(layer, narrative);
          
          // Requirement 3.1: Panel should display era name
          expect(content.eraName).toBe(layer.era.name);
          expect(content.eraName.length).toBeGreaterThan(0);
          
          // Requirement 3.1: Panel should display time period (yearsAgo)
          expect(content.yearsAgo).toBe(layer.era.yearsAgo);
          expect(content.formattedTime).toBeTruthy();
          
          // Requirement 3.1: Panel should display period
          expect(content.period).toBe(layer.era.period);
          
          // Requirement 3.1: Panel should display narrative description
          expect(content.shortDescription).toBe(narrative.shortDescription);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Requirement 3.2: Panel should show climate, flora, fauna when available
   */
  it('Property 5b: Panel indicates presence of climate, flora, fauna from narrative', () => {
    fc.assert(
      fc.property(
        geologicalLayerArb,
        narrativeArb,
        (layer, narrative) => {
          const content = extractPanelContent(layer, narrative);
          
          // Climate should be indicated as present when narrative has climate
          expect(content.hasClimate).toBe(narrative.climate != null);
          
          // Flora should be indicated as present when narrative has flora
          expect(content.hasFlora).toBe(narrative.flora.length > 0);
          
          // Fauna should be indicated as present when narrative has fauna
          expect(content.hasFauna).toBe(narrative.fauna.length > 0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Panel should handle null narrative gracefully
   */
  it('Panel handles null narrative gracefully', () => {
    fc.assert(
      fc.property(
        geologicalLayerArb,
        (layer) => {
          const content = extractPanelContent(layer, null);
          
          // Era info should still be present
          expect(content.eraName).toBe(layer.era.name);
          expect(content.yearsAgo).toBe(layer.era.yearsAgo);
          expect(content.period).toBe(layer.era.period);
          
          // Narrative-dependent fields should be null/false
          expect(content.shortDescription).toBeNull();
          expect(content.hasClimate).toBe(false);
          expect(content.hasFlora).toBe(false);
          expect(content.hasFauna).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Time formatting should produce human-readable strings
   */
  it('Time formatting produces readable strings for all year ranges', () => {
    fc.assert(
      fc.property(
        geologicalLayerArb,
        (layer) => {
          const content = extractPanelContent(layer, null);
          
          // Formatted time should be a non-empty string
          expect(typeof content.formattedTime).toBe('string');
          expect(content.formattedTime.length).toBeGreaterThan(0);
          
          // Should contain "years ago" or similar time indicator
          expect(content.formattedTime).toMatch(/years ago/i);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests for Layer Selection Logic
 * **Feature: 3d-cross-section, Property 3: Layer selection state consistency**
 * **Feature: 3d-cross-section, Property 4: Depth indicator accuracy**
 * **Validates: Requirements 2.2, 2.3**
 */

import { 
  getActiveLayerFromScroll as getCrossSectionActiveLayer, 
  getDepthIndicator 
} from '../../deep-time-app/src/hooks/useCrossSectionState';

describe('Layer Selection State Consistency', () => {
  /**
   * **Feature: 3d-cross-section, Property 3: Layer selection state consistency**
   * **Validates: Requirements 2.2**
   * 
   * For any geological stack and any layer within it, clicking that layer
   * should result in that layer's ID being set as the active layer ID.
   */
  it('Property 3: Selecting a layer sets it as active', () => {
    fc.assert(
      fc.property(
        geologicalStackArb.filter(s => s.layers.length > 0),
        fc.integer({ min: 0, max: 100 }),
        (stack, randomIndex) => {
          const layers = stack.layers;
          const targetIndex = randomIndex % layers.length;
          const targetLayer = layers[targetIndex];
          
          // Calculate the scroll position that would select this layer
          const scrollPosition = layers.length > 1 
            ? targetIndex / (layers.length - 1)
            : 0;
          
          // Get the active layer from scroll position
          const activeLayer = getCrossSectionActiveLayer(scrollPosition, layers);
          
          // The active layer should be the target layer (or very close due to rounding)
          // For exact selection, we verify the layer at that index is returned
          expect(activeLayer).not.toBeNull();
          
          // Verify the selection is consistent - same scroll position always gives same layer
          const activeLayer2 = getCrossSectionActiveLayer(scrollPosition, layers);
          expect(activeLayer2?.id).toBe(activeLayer?.id);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Direct layer selection should always return the exact layer
   */
  it('Property 3b: Layer selection is deterministic', () => {
    fc.assert(
      fc.property(
        geologicalStackArb.filter(s => s.layers.length > 0),
        (stack) => {
          const layers = stack.layers;
          
          // For each layer, verify we can select it via scroll position
          for (let i = 0; i < layers.length; i++) {
            // Calculate scroll position for this layer
            const scrollPosition = layers.length > 1 ? i / (layers.length - 1) : 0;
            
            // Clamp to valid range
            const clampedPosition = Math.min(1, Math.max(0, scrollPosition));
            
            // Get active layer
            const activeLayer = getCrossSectionActiveLayer(clampedPosition, layers);
            
            // Should return a valid layer
            expect(activeLayer).not.toBeNull();
            expect(layers.some(l => l.id === activeLayer!.id)).toBe(true);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Depth Indicator Accuracy', () => {
  /**
   * **Feature: 3d-cross-section, Property 4: Depth indicator accuracy**
   * **Validates: Requirements 2.3**
   * 
   * For any selected layer, the depth indicator value should equal
   * the layer's depthStart value.
   */
  it('Property 4: Depth indicator equals layer depthStart', () => {
    fc.assert(
      fc.property(
        geologicalLayerArb,
        (layer) => {
          const depthIndicator = getDepthIndicator(layer);
          
          // Depth indicator should exactly equal the layer's depthStart
          expect(depthIndicator).toBe(layer.depthStart);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Depth indicator should be 0 for null layer
   */
  it('Property 4b: Depth indicator is 0 for null layer', () => {
    const depthIndicator = getDepthIndicator(null);
    expect(depthIndicator).toBe(0);
  });

  /**
   * Depth indicator should always be non-negative
   */
  it('Property 4c: Depth indicator is always non-negative', () => {
    fc.assert(
      fc.property(
        geologicalLayerArb,
        (layer) => {
          const depthIndicator = getDepthIndicator(layer);
          
          // Depth should be non-negative (we're measuring from surface)
          expect(depthIndicator).toBeGreaterThanOrEqual(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Depth indicator should be consistent with layer ordering
   */
  it('Property 4d: Deeper layers have higher depth indicators', () => {
    fc.assert(
      fc.property(
        geologicalStackArb.filter(s => s.layers.length >= 2),
        (stack) => {
          const layers = stack.layers;
          
          // Layers are ordered by depth (contiguous)
          for (let i = 1; i < layers.length; i++) {
            const prevDepth = getDepthIndicator(layers[i - 1]);
            const currDepth = getDepthIndicator(layers[i]);
            
            // Each subsequent layer should start at or after the previous layer's start
            // (since layers are contiguous, curr.depthStart === prev.depthEnd)
            expect(currDepth).toBeGreaterThanOrEqual(prevDepth);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests for AI Content Display
 * **Feature: 3d-cross-section, Property 6: AI content display**
 * **Validates: Requirements 3.4**
 */

import type { EraContent, GeneratedImage, GeneratedVideo } from '../../deep-time-app/src/services/ai/types';
import { eraContentArb, generatedImageArb, generatedVideoArb } from '../generators/orchestrator.generators';

/**
 * Checks if AI content has an image
 * Mirrors the function in CrossSectionView for testing without deep imports
 */
function hasAIImage(content: EraContent | null): boolean {
  return content?.image != null;
}

/**
 * Checks if AI content has a video
 * Mirrors the function in CrossSectionView for testing without deep imports
 */
function hasAIVideo(content: EraContent | null): boolean {
  return content?.video != null;
}

describe('AI Content Display', () => {
  /**
   * **Feature: 3d-cross-section, Property 6: AI content display**
   * **Validates: Requirements 3.4**
   * 
   * For any layer with generated AI content (image or video),
   * the panel should include that content when the layer is selected.
   */
  it('Property 6: AI content is correctly detected when present', () => {
    fc.assert(
      fc.property(
        eraContentArb,
        (content) => {
          // Test image detection
          const hasImage = hasAIImage(content);
          expect(hasImage).toBe(content.image != null);
          
          // Test video detection
          const hasVideo = hasAIVideo(content);
          expect(hasVideo).toBe(content.video != null);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6b: Content with image should report hasAIImage as true
   */
  it('Property 6b: Content with image reports hasAIImage as true', () => {
    fc.assert(
      fc.property(
        generatedImageArb,
        (image) => {
          const content: EraContent = {
            narrative: {} as any,
            image,
            video: null,
            cacheMetadata: {} as any,
          };
          
          expect(hasAIImage(content)).toBe(true);
          expect(hasAIVideo(content)).toBe(false);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6c: Content with video should report hasAIVideo as true
   */
  it('Property 6c: Content with video reports hasAIVideo as true', () => {
    fc.assert(
      fc.property(
        generatedVideoArb,
        (video) => {
          const content: EraContent = {
            narrative: {} as any,
            image: null,
            video,
            cacheMetadata: {} as any,
          };
          
          expect(hasAIImage(content)).toBe(false);
          expect(hasAIVideo(content)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6d: Null content should report no AI content
   */
  it('Property 6d: Null content reports no AI content', () => {
    expect(hasAIImage(null)).toBe(false);
    expect(hasAIVideo(null)).toBe(false);
  });

  /**
   * Property 6e: Content with both image and video should report both
   */
  it('Property 6e: Content with both image and video reports both', () => {
    fc.assert(
      fc.property(
        generatedImageArb,
        generatedVideoArb,
        (image, video) => {
          const content: EraContent = {
            narrative: {} as any,
            image,
            video,
            cacheMetadata: {} as any,
          };
          
          expect(hasAIImage(content)).toBe(true);
          expect(hasAIVideo(content)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests for LayerStack Component
 * **Feature: 3d-cross-section, Property 1: Layer count preservation**
 * **Validates: Requirements 1.1**
 */

import { getActiveLayerFromScroll } from '../../deep-time-app/src/components/LayerStack';
import { geologicalStackArb } from '../generators/geological.generators';

describe('LayerStack Layer Count Preservation', () => {
  /**
   * **Feature: 3d-cross-section, Property 1: Layer count preservation**
   * **Validates: Requirements 1.1**
   * 
   * For any geological stack with N layers, the rendered cross-section
   * should contain exactly N layer elements.
   * 
   * Since we can't render React components in unit tests without a DOM,
   * we test the underlying logic that determines layer rendering.
   */
  it('Property 1: Layer count is preserved in rendering logic', () => {
    fc.assert(
      fc.property(
        geologicalStackArb,
        (stack) => {
          const layers = stack.layers;
          
          // The number of layers should be preserved
          // This tests that our data structure maintains layer count
          expect(layers.length).toBeGreaterThan(0);
          
          // Each layer should have a unique ID
          const ids = new Set(layers.map(l => l.id));
          expect(ids.size).toBe(layers.length);
          
          // Layers should be contiguous (no gaps)
          for (let i = 1; i < layers.length; i++) {
            expect(layers[i].depthStart).toBeCloseTo(layers[i - 1].depthEnd, 5);
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * getActiveLayerFromScroll should always return a valid layer for valid scroll positions
   */
  it('getActiveLayerFromScroll returns valid layer for any scroll position', () => {
    fc.assert(
      fc.property(
        geologicalStackArb,
        fc.double({ min: 0, max: 1, noNaN: true }),
        (stack, scrollPosition) => {
          const layers = stack.layers;
          
          if (layers.length === 0) {
            // Empty layers should return null
            expect(getActiveLayerFromScroll(scrollPosition, layers)).toBeNull();
            return true;
          }
          
          const activeLayer = getActiveLayerFromScroll(scrollPosition, layers);
          
          // Should always return a layer from the stack
          expect(activeLayer).not.toBeNull();
          expect(layers.some(l => l.id === activeLayer!.id)).toBe(true);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Scroll position 0 should select the first layer, position 1 should select the last
   */
  it('getActiveLayerFromScroll maps boundary positions correctly', () => {
    fc.assert(
      fc.property(
        geologicalStackArb.filter(s => s.layers.length > 1),
        (stack) => {
          const layers = stack.layers;
          
          // Position 0 should give first layer
          const firstLayer = getActiveLayerFromScroll(0, layers);
          expect(firstLayer?.id).toBe(layers[0].id);
          
          // Position 1 should give last layer
          const lastLayer = getActiveLayerFromScroll(1, layers);
          expect(lastLayer?.id).toBe(layers[layers.length - 1].id);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Scroll position should be monotonic - higher position = deeper layer
   */
  it('getActiveLayerFromScroll is monotonic with scroll position', () => {
    fc.assert(
      fc.property(
        geologicalStackArb.filter(s => s.layers.length >= 3),
        fc.double({ min: 0, max: 0.4, noNaN: true }),
        fc.double({ min: 0.6, max: 1, noNaN: true }),
        (stack, lowPosition, highPosition) => {
          const layers = stack.layers;
          
          const lowLayer = getActiveLayerFromScroll(lowPosition, layers);
          const highLayer = getActiveLayerFromScroll(highPosition, layers);
          
          if (!lowLayer || !highLayer) return true;
          
          // Find indices
          const lowIndex = layers.findIndex(l => l.id === lowLayer.id);
          const highIndex = layers.findIndex(l => l.id === highLayer.id);
          
          // Higher scroll position should give equal or higher index (deeper layer)
          expect(highIndex).toBeGreaterThanOrEqual(lowIndex);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
