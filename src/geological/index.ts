// Geological layer parsing and validation
// Requirements: 1.2, 1.3

import type {
  GeologicalLayer,
  GeologicalStack,
  GeoCoordinate,
  GeologicalEra,
  MaterialType,
  FossilIndex,
  LayerCharacteristics,
} from '../types';

// Valid material types for validation
const VALID_MATERIALS: MaterialType[] = [
  'soil', 'clay', 'sand', 'limestone', 'granite',
  'shale', 'sandstone', 'basalt', 'fill'
];

// Valid fossil index values
const VALID_FOSSIL_INDICES: FossilIndex[] = [
  'none', 'low', 'medium', 'high', 'exceptional'
];

/**
 * Raw API response structure for a geological layer
 */
export interface RawGeologicalLayerResponse {
  id?: unknown;
  depthStart?: unknown;
  depthEnd?: unknown;
  material?: unknown;
  era?: unknown;
  period?: unknown;
  fossilIndex?: unknown;
  characteristics?: unknown;
}

/**
 * Result of parsing a geological response
 */
export interface ParseResult {
  layers: GeologicalLayer[];
  errors: ParseError[];
  warnings: ParseWarning[];
}

export interface ParseError {
  layerIndex: number;
  field: string;
  message: string;
  value?: unknown;
}

export interface ParseWarning {
  layerIndex: number;
  field: string;
  message: string;
  defaultValue?: unknown;
}


/**
 * Validates and parses a material type from raw input
 */
function parseMaterial(value: unknown): MaterialType | null {
  if (typeof value === 'string' && VALID_MATERIALS.includes(value as MaterialType)) {
    return value as MaterialType;
  }
  return null;
}

/**
 * Validates and parses a fossil index from raw input
 */
function parseFossilIndex(value: unknown): FossilIndex | null {
  if (typeof value === 'string' && VALID_FOSSIL_INDICES.includes(value as FossilIndex)) {
    return value as FossilIndex;
  }
  return null;
}

/**
 * Validates and parses a geological era from raw input
 */
function parseEra(value: unknown): GeologicalEra | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const raw = value as Record<string, unknown>;

  // Required fields
  if (typeof raw.name !== 'string' || raw.name.trim() === '') {
    return null;
  }
  if (typeof raw.yearsAgo !== 'number' || !Number.isFinite(raw.yearsAgo) || raw.yearsAgo < 0) {
    return null;
  }
  if (typeof raw.period !== 'string' || raw.period.trim() === '') {
    return null;
  }

  const era: GeologicalEra = {
    name: raw.name,
    yearsAgo: raw.yearsAgo,
    period: raw.period,
  };

  // Optional epoch field
  if (raw.epoch !== undefined) {
    if (typeof raw.epoch === 'string' && raw.epoch.trim() !== '') {
      era.epoch = raw.epoch;
    }
  }

  return era;
}

/**
 * Validates and parses layer characteristics from raw input
 */
function parseCharacteristics(value: unknown): LayerCharacteristics {
  const characteristics: LayerCharacteristics = {};

  if (typeof value !== 'object' || value === null) {
    return characteristics;
  }

  const raw = value as Record<string, unknown>;

  if (typeof raw.color === 'string' && raw.color.trim() !== '') {
    characteristics.color = raw.color;
  }

  if (typeof raw.density === 'number' && Number.isFinite(raw.density) && raw.density > 0) {
    characteristics.density = raw.density;
  }

  if (typeof raw.waterContent === 'number' && Number.isFinite(raw.waterContent) && 
      raw.waterContent >= 0 && raw.waterContent <= 1) {
    characteristics.waterContent = raw.waterContent;
  }

  if (Array.isArray(raw.mineralComposition)) {
    const minerals = raw.mineralComposition.filter(
      (m): m is string => typeof m === 'string' && m.trim() !== ''
    );
    if (minerals.length > 0) {
      characteristics.mineralComposition = minerals;
    }
  }

  return characteristics;
}


/**
 * Validates a single layer's required numeric fields
 */
function validateLayerDepths(
  raw: RawGeologicalLayerResponse,
  index: number
): { depthStart: number; depthEnd: number } | ParseError[] {
  const errors: ParseError[] = [];

  // Validate depthStart
  if (raw.depthStart === undefined || raw.depthStart === null) {
    errors.push({
      layerIndex: index,
      field: 'depthStart',
      message: 'Missing required field depthStart',
    });
  } else if (typeof raw.depthStart !== 'number' || !Number.isFinite(raw.depthStart)) {
    errors.push({
      layerIndex: index,
      field: 'depthStart',
      message: 'depthStart must be a finite number',
      value: raw.depthStart,
    });
  } else if (raw.depthStart < 0) {
    errors.push({
      layerIndex: index,
      field: 'depthStart',
      message: 'depthStart must be non-negative',
      value: raw.depthStart,
    });
  }

  // Validate depthEnd
  if (raw.depthEnd === undefined || raw.depthEnd === null) {
    errors.push({
      layerIndex: index,
      field: 'depthEnd',
      message: 'Missing required field depthEnd',
    });
  } else if (typeof raw.depthEnd !== 'number' || !Number.isFinite(raw.depthEnd)) {
    errors.push({
      layerIndex: index,
      field: 'depthEnd',
      message: 'depthEnd must be a finite number',
      value: raw.depthEnd,
    });
  }

  if (errors.length > 0) {
    return errors;
  }

  const depthStart = raw.depthStart as number;
  const depthEnd = raw.depthEnd as number;

  // Validate depthEnd > depthStart
  if (depthEnd <= depthStart) {
    return [{
      layerIndex: index,
      field: 'depthEnd',
      message: 'depthEnd must be greater than depthStart',
      value: { depthStart, depthEnd },
    }];
  }

  return { depthStart, depthEnd };
}

/**
 * Parses a single geological layer from raw API response data
 */
function parseLayer(
  raw: RawGeologicalLayerResponse,
  index: number
): { layer: GeologicalLayer; warnings: ParseWarning[] } | { errors: ParseError[] } {
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];

  // Validate depths
  const depthResult = validateLayerDepths(raw, index);
  if (Array.isArray(depthResult)) {
    errors.push(...depthResult);
  }

  // Validate id
  let id: string;
  if (raw.id === undefined || raw.id === null) {
    id = `layer-${index}`;
    warnings.push({
      layerIndex: index,
      field: 'id',
      message: 'Missing id, generated default',
      defaultValue: id,
    });
  } else if (typeof raw.id !== 'string' || raw.id.trim() === '') {
    id = `layer-${index}`;
    warnings.push({
      layerIndex: index,
      field: 'id',
      message: 'Invalid id, generated default',
      defaultValue: id,
    });
  } else {
    id = raw.id;
  }

  // Validate material
  const material = parseMaterial(raw.material);
  if (material === null) {
    errors.push({
      layerIndex: index,
      field: 'material',
      message: `Invalid or missing material type. Must be one of: ${VALID_MATERIALS.join(', ')}`,
      value: raw.material,
    });
  }

  // Validate era
  const era = parseEra(raw.era);
  if (era === null) {
    errors.push({
      layerIndex: index,
      field: 'era',
      message: 'Invalid or missing era. Must have name (string), yearsAgo (number >= 0), and period (string)',
      value: raw.era,
    });
  }

  // Validate period
  let period: string;
  if (raw.period === undefined || raw.period === null) {
    // Use era.period as fallback if available
    if (era !== null) {
      period = era.period;
      warnings.push({
        layerIndex: index,
        field: 'period',
        message: 'Missing period, using era.period as default',
        defaultValue: period,
      });
    } else {
      errors.push({
        layerIndex: index,
        field: 'period',
        message: 'Missing required field period',
      });
      period = '';
    }
  } else if (typeof raw.period !== 'string' || raw.period.trim() === '') {
    errors.push({
      layerIndex: index,
      field: 'period',
      message: 'period must be a non-empty string',
      value: raw.period,
    });
    period = '';
  } else {
    period = raw.period;
  }

  // Validate fossilIndex
  let fossilIndex = parseFossilIndex(raw.fossilIndex);
  if (fossilIndex === null) {
    fossilIndex = 'none';
    warnings.push({
      layerIndex: index,
      field: 'fossilIndex',
      message: `Invalid or missing fossilIndex, defaulting to 'none'`,
      defaultValue: fossilIndex,
    });
  }

  // Parse characteristics (optional, defaults to empty object)
  const characteristics = parseCharacteristics(raw.characteristics);

  // If there are critical errors, return them
  if (errors.length > 0) {
    return { errors };
  }

  // Build the layer
  const { depthStart, depthEnd } = depthResult as { depthStart: number; depthEnd: number };
  const layer: GeologicalLayer = {
    id,
    depthStart,
    depthEnd,
    material: material!,
    era: era!,
    period,
    fossilIndex,
    characteristics,
  };

  return { layer, warnings };
}


/**
 * Parses an array of raw geological layer responses from an API.
 * 
 * This function validates each layer for data completeness and handles
 * missing or malformed fields according to Requirements 1.2 and 1.3.
 * 
 * - Required fields: depthStart, depthEnd, material, era, period
 * - Optional fields with defaults: id (generated), fossilIndex ('none'), characteristics ({})
 * - Layers with critical errors are excluded from the result
 * - Warnings are generated for fields that use default values
 * 
 * @param rawLayers - Array of raw layer data from API response
 * @returns ParseResult containing valid layers, errors, and warnings
 */
export function parseGeologicalResponse(rawLayers: unknown): ParseResult {
  const result: ParseResult = {
    layers: [],
    errors: [],
    warnings: [],
  };

  // Handle null/undefined input
  if (rawLayers === null || rawLayers === undefined) {
    result.errors.push({
      layerIndex: -1,
      field: 'response',
      message: 'Response is null or undefined',
    });
    return result;
  }

  // Handle non-array input
  if (!Array.isArray(rawLayers)) {
    result.errors.push({
      layerIndex: -1,
      field: 'response',
      message: 'Response must be an array of layers',
      value: typeof rawLayers,
    });
    return result;
  }

  // Handle empty array
  if (rawLayers.length === 0) {
    result.warnings.push({
      layerIndex: -1,
      field: 'response',
      message: 'Response contains no layers',
    });
    return result;
  }

  // Parse each layer
  for (let i = 0; i < rawLayers.length; i++) {
    const rawLayer = rawLayers[i];

    // Handle null/undefined layer entries
    if (rawLayer === null || rawLayer === undefined) {
      result.errors.push({
        layerIndex: i,
        field: 'layer',
        message: 'Layer entry is null or undefined',
      });
      continue;
    }

    // Handle non-object layer entries
    if (typeof rawLayer !== 'object') {
      result.errors.push({
        layerIndex: i,
        field: 'layer',
        message: 'Layer entry must be an object',
        value: typeof rawLayer,
      });
      continue;
    }

    const parseResult = parseLayer(rawLayer as RawGeologicalLayerResponse, i);

    if ('errors' in parseResult) {
      result.errors.push(...parseResult.errors);
    } else {
      result.layers.push(parseResult.layer);
      result.warnings.push(...parseResult.warnings);
    }
  }

  return result;
}


// ============================================
// Geological Stack Building
// Requirements: 1.3
// ============================================

/**
 * Error types for geological stack building
 */
export interface StackBuildError {
  type: 'gap' | 'overlap' | 'empty_layers' | 'invalid_layer';
  message: string;
  layerIndex?: number;
  details?: {
    previousLayerEnd?: number;
    currentLayerStart?: number;
    gapSize?: number;
    overlapSize?: number;
  };
}

/**
 * Result of building a geological stack
 */
export interface StackBuildResult {
  stack: GeologicalStack | null;
  errors: StackBuildError[];
}

/**
 * Options for building a geological stack
 */
export interface BuildStackOptions {
  location: GeoCoordinate;
  dataSource?: string;
  confidence?: number;
  queryTimestamp?: Date;
}

/**
 * Sorts geological layers by depth (depthStart ascending).
 * 
 * @param layers - Array of geological layers to sort
 * @returns New array of layers sorted by depthStart
 */
function sortLayersByDepth(layers: GeologicalLayer[]): GeologicalLayer[] {
  return [...layers].sort((a, b) => a.depthStart - b.depthStart);
}

/**
 * Validates that layers have no gaps or overlaps.
 * 
 * A gap exists when layer N+1's depthStart > layer N's depthEnd.
 * An overlap exists when layer N+1's depthStart < layer N's depthEnd.
 * 
 * @param sortedLayers - Layers already sorted by depthStart
 * @returns Array of validation errors (empty if valid)
 */
function validateLayerContinuity(sortedLayers: GeologicalLayer[]): StackBuildError[] {
  const errors: StackBuildError[] = [];

  for (let i = 0; i < sortedLayers.length - 1; i++) {
    const currentLayer = sortedLayers[i];
    const nextLayer = sortedLayers[i + 1];

    const currentEnd = currentLayer.depthEnd;
    const nextStart = nextLayer.depthStart;

    // Check for gap: next layer starts after current layer ends
    if (nextStart > currentEnd) {
      const gapSize = nextStart - currentEnd;
      errors.push({
        type: 'gap',
        message: `Gap detected between layer ${i} and layer ${i + 1}: ${gapSize.toFixed(2)}m gap from depth ${currentEnd.toFixed(2)}m to ${nextStart.toFixed(2)}m`,
        layerIndex: i + 1,
        details: {
          previousLayerEnd: currentEnd,
          currentLayerStart: nextStart,
          gapSize,
        },
      });
    }

    // Check for overlap: next layer starts before current layer ends
    if (nextStart < currentEnd) {
      const overlapSize = currentEnd - nextStart;
      errors.push({
        type: 'overlap',
        message: `Overlap detected between layer ${i} and layer ${i + 1}: ${overlapSize.toFixed(2)}m overlap at depth ${nextStart.toFixed(2)}m`,
        layerIndex: i + 1,
        details: {
          previousLayerEnd: currentEnd,
          currentLayerStart: nextStart,
          overlapSize,
        },
      });
    }
  }

  return errors;
}

/**
 * Builds a GeologicalStack from an array of geological layers.
 * 
 * This function:
 * 1. Sorts layers by depth (depthStart ascending)
 * 2. Validates that there are no gaps between consecutive layers
 * 3. Validates that there are no overlaps between consecutive layers
 * 
 * Per Requirement 1.3: The constructed GeologicalStack SHALL have layers
 * ordered by increasing depth (depthStart of layer N+1 >= depthEnd of layer N)
 * with no gaps or overlaps.
 * 
 * @param layers - Array of geological layers to build into a stack
 * @param options - Configuration options including location and metadata
 * @returns StackBuildResult containing the stack (if valid) or errors
 */
export function buildGeologicalStack(
  layers: GeologicalLayer[],
  options: BuildStackOptions
): StackBuildResult {
  const errors: StackBuildError[] = [];

  // Validate non-empty layers
  if (!layers || layers.length === 0) {
    return {
      stack: null,
      errors: [{
        type: 'empty_layers',
        message: 'Cannot build geological stack: no layers provided',
      }],
    };
  }

  // Validate each layer has valid depth values
  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer.depthStart < 0 || layer.depthEnd <= layer.depthStart) {
      errors.push({
        type: 'invalid_layer',
        message: `Invalid layer at index ${i}: depthStart must be >= 0 and depthEnd must be > depthStart`,
        layerIndex: i,
        details: {
          previousLayerEnd: layer.depthStart,
          currentLayerStart: layer.depthEnd,
        },
      });
    }
  }

  if (errors.length > 0) {
    return { stack: null, errors };
  }

  // Sort layers by depth
  const sortedLayers = sortLayersByDepth(layers);

  // Validate no gaps or overlaps
  const continuityErrors = validateLayerContinuity(sortedLayers);
  if (continuityErrors.length > 0) {
    return { stack: null, errors: continuityErrors };
  }

  // Build the stack
  const stack: GeologicalStack = {
    location: options.location,
    layers: sortedLayers,
    queryTimestamp: options.queryTimestamp ?? new Date(),
    dataSource: options.dataSource ?? 'unknown',
    confidence: options.confidence ?? 0,
  };

  return { stack, errors: [] };
}
