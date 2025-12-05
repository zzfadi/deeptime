// Narrative generation from geological layers
// Requirements: 2.1, 2.3

import type {
  GeologicalLayer,
  Narrative,
  ClimateDescription,
  FossilIndex,
} from '../types';

// ============================================
// Era-based Flora Data
// ============================================

const ERA_FLORA: Record<string, string[]> = {
  // Modern and recent eras
  Holocene: ['grasses', 'flowering plants', 'oaks', 'willows', 'palms', 'conifers'],
  Pleistocene: ['grasses', 'conifers', 'willows', 'mosses', 'flowering plants'],
  
  // Cenozoic
  Pliocene: ['grasses', 'flowering plants', 'oaks', 'conifers', 'palms'],
  Miocene: ['grasses', 'flowering plants', 'oaks', 'conifers'],
  Oligocene: ['flowering plants', 'conifers', 'palms', 'ferns'],
  Eocene: ['flowering plants', 'palms', 'ferns', 'conifers'],
  Paleocene: ['flowering plants', 'ferns', 'conifers', 'ginkgos'],
  
  // Mesozoic
  Cretaceous: ['flowering plants', 'conifers', 'ferns', 'cycads', 'ginkgos'],
  Jurassic: ['conifers', 'ferns', 'cycads', 'ginkgos', 'horsetails'],
  Triassic: ['conifers', 'ferns', 'cycads', 'ginkgos', 'seed ferns'],
  
  // Paleozoic
  Permian: ['seed ferns', 'conifers', 'ferns', 'horsetails', 'cycads'],
  Carboniferous: ['ferns', 'horsetails', 'club mosses', 'seed ferns'],
  Devonian: ['ferns', 'horsetails', 'club mosses', 'mosses'],
  Silurian: ['mosses', 'club mosses', 'early vascular plants'],
  Ordovician: ['mosses', 'algae', 'early land plants'],
  Cambrian: ['algae', 'cyanobacteria', 'early mosses'],
  
  // Precambrian
  Precambrian: ['cyanobacteria', 'algae', 'stromatolites'],
};

// ============================================
// Era-based Fauna Data
// ============================================

const ERA_FAUNA: Record<string, string[]> = {
  // Modern and recent eras
  Holocene: ['mammals', 'birds', 'fish', 'reptiles', 'amphibians', 'insects'],
  Pleistocene: ['mammals', 'birds', 'fish', 'reptiles', 'megafauna'],
  
  // Cenozoic
  Pliocene: ['mammals', 'birds', 'fish', 'early hominids'],
  Miocene: ['mammals', 'birds', 'fish', 'apes'],
  Oligocene: ['mammals', 'birds', 'fish', 'early primates'],
  Eocene: ['mammals', 'birds', 'fish', 'early whales'],
  Paleocene: ['mammals', 'birds', 'fish', 'early primates'],
  
  // Mesozoic
  Cretaceous: ['dinosaurs', 'pterosaurs', 'mammals', 'birds', 'ammonites'],
  Jurassic: ['dinosaurs', 'pterosaurs', 'mammals', 'ammonites', 'fish'],
  Triassic: ['early dinosaurs', 'therapsids', 'amphibians', 'fish', 'ammonites'],
  
  // Paleozoic
  Permian: ['therapsids', 'reptiles', 'amphibians', 'fish', 'insects'],
  Carboniferous: ['amphibians', 'early reptiles', 'fish', 'insects', 'arachnids'],
  Devonian: ['fish', 'early tetrapods', 'trilobites', 'ammonites', 'brachiopods'],
  Silurian: ['fish', 'trilobites', 'brachiopods', 'crinoids', 'eurypterids'],
  Ordovician: ['trilobites', 'brachiopods', 'crinoids', 'fish', 'nautiloids'],
  Cambrian: ['trilobites', 'brachiopods', 'anomalocaris', 'early fish'],
  
  // Precambrian
  Precambrian: ['ediacaran fauna', 'early multicellular organisms', 'bacteria'],
};

// ============================================
// Era-based Climate Data
// ============================================

const ERA_CLIMATE: Record<string, ClimateDescription> = {
  Holocene: { temperature: 'temperate', humidity: 'moderate', atmosphere: 'similar to modern' },
  Pleistocene: { temperature: 'cold', humidity: 'moderate', atmosphere: 'similar to modern' },
  Pliocene: { temperature: 'warm and dry', humidity: 'semi-arid', atmosphere: 'similar to modern' },
  Miocene: { temperature: 'warm and dry', humidity: 'moderate', atmosphere: 'similar to modern' },
  Oligocene: { temperature: 'temperate', humidity: 'moderate', atmosphere: 'similar to modern' },
  Eocene: { temperature: 'tropical', humidity: 'humid', atmosphere: 'similar to modern' },
  Paleocene: { temperature: 'subtropical', humidity: 'humid', atmosphere: 'similar to modern' },
  Cretaceous: { temperature: 'hot and humid', humidity: 'very humid', atmosphere: 'oxygen-rich' },
  Jurassic: { temperature: 'hot and humid', humidity: 'humid', atmosphere: 'oxygen-rich' },
  Triassic: { temperature: 'hot and humid', humidity: 'semi-arid', atmosphere: 'oxygen-rich' },
  Permian: { temperature: 'warm and dry', humidity: 'arid', atmosphere: 'oxygen-rich' },
  Carboniferous: { temperature: 'tropical', humidity: 'very humid', atmosphere: 'oxygen-rich' },
  Devonian: { temperature: 'warm and dry', humidity: 'moderate', atmosphere: 'oxygen-rich' },
  Silurian: { temperature: 'warm and dry', humidity: 'moderate', atmosphere: 'thin atmosphere' },
  Ordovician: { temperature: 'temperate', humidity: 'moderate', atmosphere: 'thin atmosphere' },
  Cambrian: { temperature: 'temperate', humidity: 'humid', atmosphere: 'thin atmosphere' },
  Precambrian: { temperature: 'cold', humidity: 'arid', atmosphere: 'carbon dioxide heavy' },
};

// ============================================
// Era-based Soundscape Data
// ============================================

const ERA_SOUNDSCAPE: Record<string, string> = {
  Holocene: 'forest ambience',
  Pleistocene: 'rushing water and wind',
  Pliocene: 'quiet desert winds',
  Miocene: 'forest ambience',
  Oligocene: 'forest ambience',
  Eocene: 'dense jungle sounds',
  Paleocene: 'dense jungle sounds',
  Cretaceous: 'dense jungle sounds',
  Jurassic: 'dense jungle sounds',
  Triassic: 'quiet desert winds',
  Permian: 'quiet desert winds',
  Carboniferous: 'dense jungle sounds',
  Devonian: 'ocean waves',
  Silurian: 'ocean waves',
  Ordovician: 'ocean waves',
  Cambrian: 'ocean waves',
  Precambrian: 'volcanic rumbling',
};

// Default values for unknown eras
const DEFAULT_FLORA = ['ferns', 'mosses'];
const DEFAULT_FAUNA = ['fish', 'invertebrates'];
const DEFAULT_CLIMATE: ClimateDescription = {
  temperature: 'temperate',
  humidity: 'moderate',
  atmosphere: 'similar to modern',
};
const DEFAULT_SOUNDSCAPE = 'rushing water and wind';


// ============================================
// Helper Functions
// ============================================

/**
 * Gets era-appropriate flora based on the geological era name.
 * 
 * @param eraName - The name of the geological era
 * @returns Array of flora species appropriate for the era
 */
export function getEraFlora(eraName: string): string[] {
  return ERA_FLORA[eraName] ?? DEFAULT_FLORA;
}

/**
 * Gets era-appropriate fauna based on the geological era name.
 * When fossil index is high or exceptional, returns at least 3 creature types.
 * 
 * @param eraName - The name of the geological era
 * @param fossilIndex - The fossil index of the layer
 * @returns Array of fauna species appropriate for the era
 */
export function getEraFauna(eraName: string, fossilIndex: FossilIndex): string[] {
  const baseFauna = ERA_FAUNA[eraName] ?? DEFAULT_FAUNA;
  
  // For high/exceptional fossil index, ensure at least 3 creatures
  // per Requirement 2.4
  if (fossilIndex === 'high' || fossilIndex === 'exceptional') {
    if (baseFauna.length >= 3) {
      return baseFauna;
    }
    // Pad with additional creatures if needed
    const additionalCreatures = ['ancient invertebrates', 'early arthropods', 'marine organisms'];
    const needed = 3 - baseFauna.length;
    return [...baseFauna, ...additionalCreatures.slice(0, needed)];
  }
  
  return baseFauna;
}

/**
 * Gets era-appropriate climate description.
 * 
 * @param eraName - The name of the geological era
 * @returns Climate description for the era
 */
function getEraClimate(eraName: string): ClimateDescription {
  return ERA_CLIMATE[eraName] ?? DEFAULT_CLIMATE;
}

/**
 * Gets era-appropriate soundscape description.
 * 
 * @param eraName - The name of the geological era
 * @returns Soundscape description for the era
 */
function getEraSoundscape(eraName: string): string {
  return ERA_SOUNDSCAPE[eraName] ?? DEFAULT_SOUNDSCAPE;
}

/**
 * Generates a short description for a geological layer.
 * 
 * @param layer - The geological layer
 * @returns A 1-2 sentence description
 */
function generateShortDescription(layer: GeologicalLayer): string {
  const { era, material, depthStart, depthEnd } = layer;
  const depth = ((depthStart + depthEnd) / 2).toFixed(1);
  
  return `At ${depth} meters depth, you encounter ${material} from the ${era.name} epoch, approximately ${formatYearsAgo(era.yearsAgo)} years ago.`;
}

/**
 * Formats years ago into a human-readable string.
 * 
 * @param yearsAgo - Number of years ago
 * @returns Formatted string
 */
function formatYearsAgo(yearsAgo: number): string {
  if (yearsAgo >= 1_000_000_000) {
    return `${(yearsAgo / 1_000_000_000).toFixed(1)} billion`;
  }
  if (yearsAgo >= 1_000_000) {
    return `${(yearsAgo / 1_000_000).toFixed(1)} million`;
  }
  if (yearsAgo >= 1_000) {
    return `${(yearsAgo / 1_000).toFixed(1)} thousand`;
  }
  return yearsAgo.toString();
}

/**
 * Generates a full narrative description for a geological layer.
 * 
 * @param layer - The geological layer
 * @param flora - Era-appropriate flora
 * @param fauna - Era-appropriate fauna
 * @param climate - Era-appropriate climate
 * @returns A detailed narrative description
 */
function generateFullDescription(
  layer: GeologicalLayer,
  flora: string[],
  fauna: string[],
  climate: ClimateDescription
): string {
  const { era, material, fossilIndex } = layer;
  
  const floraText = flora.length > 0 ? flora.join(', ') : 'sparse vegetation';
  const faunaText = fauna.length > 0 ? fauna.join(', ') : 'various organisms';
  
  let fossilText = '';
  if (fossilIndex === 'exceptional') {
    fossilText = ' This layer is exceptionally rich in fossils, preserving remarkable specimens.';
  } else if (fossilIndex === 'high') {
    fossilText = ' Numerous fossils can be found throughout this layer.';
  } else if (fossilIndex === 'medium') {
    fossilText = ' Some fossil remains are present in this layer.';
  }
  
  return `During the ${era.name} epoch of the ${era.period} period, this region was characterized by ${climate.temperature} temperatures and ${climate.humidity} conditions. The ${climate.atmosphere} atmosphere supported diverse life forms. The landscape featured ${floraText}, while ${faunaText} inhabited the area. The ${material} composition of this layer reflects the environmental conditions of the time.${fossilText}`;
}

/**
 * Generates a visual prompt for the render engine.
 * 
 * @param layer - The geological layer
 * @param flora - Era-appropriate flora
 * @param fauna - Era-appropriate fauna
 * @param climate - Era-appropriate climate
 * @returns A prompt string for visual rendering
 */
function generateVisualPrompt(
  layer: GeologicalLayer,
  flora: string[],
  fauna: string[],
  climate: ClimateDescription
): string {
  const { era } = layer;
  
  const floraText = flora.slice(0, 3).join(', ');
  const faunaText = fauna.slice(0, 3).join(', ');
  
  return `Render a ${era.name} landscape with ${climate.temperature} climate. Include ${floraText} as vegetation. Populate with ${faunaText}. Atmosphere: ${climate.atmosphere}.`;
}


// ============================================
// Main Narrative Generation Function
// Requirements: 2.1, 2.3
// ============================================

/**
 * Generates a narrative from a geological layer.
 * 
 * This function extracts era, material, and fossil data from the layer
 * and constructs a complete narrative with era-appropriate flora, fauna,
 * climate, and environmental conditions.
 * 
 * Per Requirement 2.1: Sends layer metadata (depth, material, fossil index, era)
 * to the Narrative_Interpolation engine.
 * 
 * Per Requirement 2.3: Includes era-appropriate flora, fauna, climate, and
 * environmental conditions.
 * 
 * Per Requirement 2.4: When fossil index is 'high' or 'exceptional', the fauna
 * array contains at least 3 specific creature types.
 * 
 * @param layer - The geological layer to generate a narrative for
 * @returns A complete Narrative object
 */
export function generateNarrative(layer: GeologicalLayer): Narrative {
  const { era, fossilIndex } = layer;
  const eraName = era.name;
  
  // Extract era-appropriate content
  const flora = getEraFlora(eraName);
  const fauna = getEraFauna(eraName, fossilIndex);
  const climate = getEraClimate(eraName);
  const soundscape = getEraSoundscape(eraName);
  
  // Generate narrative components
  const shortDescription = generateShortDescription(layer);
  const fullDescription = generateFullDescription(layer, flora, fauna, climate);
  const visualPrompt = generateVisualPrompt(layer, flora, fauna, climate);
  
  return {
    layerId: layer.id,
    shortDescription,
    fullDescription,
    visualPrompt,
    flora,
    fauna,
    climate,
    soundscape,
  };
}
