// Scene Composition implementation
// Requirements: 3.4, 3.5, 3.6, 7.1, 7.3

import type {
  ARScene,
  ARObject,
  ARObjectType,
  GeologicalEra,
  Narrative,
  EnvironmentSettings,
  Vector3,
} from '../types';

// ============================================
// Constants
// ============================================

/**
 * Time thresholds for era-appropriate content filtering
 */
export const TIME_THRESHOLDS = {
  /** Recent history: 0-100 years ago - may include utilities and structures */
  RECENT_HISTORY_MAX: 100,
  /** Deep history: 10,000+ years ago - no modern structures or utilities */
  DEEP_HISTORY_MIN: 10_000,
} as const;

/**
 * Object types allowed in recent history (0-100 years)
 */
export const RECENT_HISTORY_ALLOWED_TYPES: ARObjectType[] = [
  'creature',
  'plant',
  'rock',
  'fossil',
  'structure',
  'utility',
];

/**
 * Object types allowed in deep history (10,000+ years)
 * Per Requirement 3.5: dissolve modern structures
 */
export const DEEP_HISTORY_ALLOWED_TYPES: ARObjectType[] = [
  'creature',
  'plant',
  'rock',
  'fossil',
];

// ============================================
// Helper Functions
// ============================================

/**
 * Generates a unique ID for scene objects
 */
function generateId(): string {
  return `scene-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a default position vector
 */
function defaultPosition(): Vector3 {
  return { x: 0, y: 0, z: 0 };
}

/**
 * Creates a default scale vector
 */
function defaultScale(): Vector3 {
  return { x: 1, y: 1, z: 1 };
}

/**
 * Determines which object types are allowed for a given time position.
 * 
 * Per Property 5: Era-Appropriate Scene Composition:
 * - For yearsAgo 0-100: scene MAY contain objects of type 'utility' and 'structure'
 * - For yearsAgo > 10,000: scene SHALL NOT contain objects of type 'structure' or 'utility'
 * 
 * @param yearsAgo - The time position in years before present
 * @returns Array of allowed object types
 */
export function getAllowedObjectTypes(yearsAgo: number): ARObjectType[] {
  if (yearsAgo <= TIME_THRESHOLDS.RECENT_HISTORY_MAX) {
    // Recent history: all types allowed including structures and utilities
    return [...RECENT_HISTORY_ALLOWED_TYPES];
  }
  
  // Deep history (> 100 years): no structures or utilities
  // This covers both intermediate (100-10,000) and deep history (10,000+)
  return [...DEEP_HISTORY_ALLOWED_TYPES];
}

/**
 * Filters objects based on era-appropriate types.
 * 
 * @param objects - Array of AR objects to filter
 * @param yearsAgo - The time position in years before present
 * @returns Filtered array of objects appropriate for the era
 */
export function filterObjectsByEra(objects: ARObject[], yearsAgo: number): ARObject[] {
  const allowedTypes = getAllowedObjectTypes(yearsAgo);
  return objects.filter(obj => allowedTypes.includes(obj.type));
}

/**
 * Checks if a scene should include creatures based on the era.
 * 
 * Per Requirement 3.6: For prehistoric eras, populate scenes with 
 * era-appropriate creatures at accurate scale.
 * 
 * @param _yearsAgo - The time position in years before present (reserved for future use)
 * @returns True if the scene should include creatures
 */
export function shouldIncludeCreatures(_yearsAgo: number): boolean {
  // Creatures are appropriate for all eras, but especially prehistoric
  return true;
}

/**
 * Checks if structures and utilities are allowed for the era.
 * 
 * @param yearsAgo - The time position in years before present
 * @returns True if structures and utilities are allowed
 */
export function areModernObjectsAllowed(yearsAgo: number): boolean {
  return yearsAgo <= TIME_THRESHOLDS.RECENT_HISTORY_MAX;
}

// ============================================
// Scene Object Builders
// ============================================

/**
 * Creates a creature object for the scene.
 * 
 * @param creatureName - Name of the creature
 * @param position - Optional position
 * @param scale - Optional scale
 * @returns ARObject representing the creature
 */
export function createCreatureObject(
  creatureName: string,
  position?: Vector3,
  scale?: Vector3
): ARObject {
  return {
    id: generateId(),
    type: 'creature',
    position: position ?? defaultPosition(),
    scale: scale ?? defaultScale(),
    modelId: `creature-${creatureName.toLowerCase().replace(/\s+/g, '-')}`,
    interactable: true,
    metadata: { name: creatureName },
  };
}

/**
 * Creates a plant object for the scene.
 * 
 * @param plantName - Name of the plant
 * @param position - Optional position
 * @param scale - Optional scale
 * @returns ARObject representing the plant
 */
export function createPlantObject(
  plantName: string,
  position?: Vector3,
  scale?: Vector3
): ARObject {
  return {
    id: generateId(),
    type: 'plant',
    position: position ?? defaultPosition(),
    scale: scale ?? defaultScale(),
    modelId: `plant-${plantName.toLowerCase().replace(/\s+/g, '-')}`,
    interactable: true,
    metadata: { name: plantName },
  };
}

/**
 * Creates a structure object for the scene (only for recent history).
 * 
 * @param structureName - Name of the structure
 * @param position - Optional position
 * @param scale - Optional scale
 * @returns ARObject representing the structure
 */
export function createStructureObject(
  structureName: string,
  position?: Vector3,
  scale?: Vector3
): ARObject {
  return {
    id: generateId(),
    type: 'structure',
    position: position ?? defaultPosition(),
    scale: scale ?? defaultScale(),
    modelId: `structure-${structureName.toLowerCase().replace(/\s+/g, '-')}`,
    interactable: true,
    metadata: { name: structureName },
  };
}

/**
 * Creates a utility object for the scene (only for recent history).
 * 
 * @param utilityName - Name of the utility
 * @param position - Optional position
 * @param scale - Optional scale
 * @returns ARObject representing the utility
 */
export function createUtilityObject(
  utilityName: string,
  position?: Vector3,
  scale?: Vector3
): ARObject {
  return {
    id: generateId(),
    type: 'utility',
    position: position ?? defaultPosition(),
    scale: scale ?? defaultScale(),
    modelId: `utility-${utilityName.toLowerCase().replace(/\s+/g, '-')}`,
    interactable: true,
    metadata: { name: utilityName },
  };
}

// ============================================
// Environment Settings
// ============================================

/**
 * Gets default environment settings for an era.
 * 
 * @param yearsAgo - The time position in years before present
 * @returns Environment settings appropriate for the era
 */
export function getEnvironmentForEra(yearsAgo: number): EnvironmentSettings {
  if (yearsAgo <= TIME_THRESHOLDS.RECENT_HISTORY_MAX) {
    return {
      skybox: 'modern-sky',
      lighting: 'daylight',
      fog: 0.1,
      ambientColor: '#ffffff',
    };
  }
  
  if (yearsAgo <= TIME_THRESHOLDS.DEEP_HISTORY_MIN) {
    // Intermediate history (100 - 10,000 years)
    return {
      skybox: 'ancient-sky',
      lighting: 'natural',
      fog: 0.2,
      ambientColor: '#f5f5dc',
    };
  }
  
  // Deep history / prehistoric
  return {
    skybox: 'prehistoric-sky',
    lighting: 'primordial',
    fog: 0.3,
    ambientColor: '#e6d5a8',
  };
}

// ============================================
// Main Scene Building Functions
// Requirements: 3.4, 3.5, 3.6
// ============================================

/**
 * Builds an AR scene for a given era and narrative.
 * 
 * This function creates an era-appropriate scene by:
 * 1. Filtering object types based on yearsAgo value
 * 2. Including/excluding structures and utilities appropriately
 * 3. Populating with era-appropriate creatures for prehistoric eras
 * 
 * Per Requirement 3.4: For recent history (0-100 years), display utility 
 * infrastructure where data exists.
 * 
 * Per Requirement 3.5: For deep history (10,000+ years), dissolve modern 
 * structures and show era-appropriate landscapes.
 * 
 * Per Requirement 3.6: For prehistoric eras, populate scenes with 
 * era-appropriate creatures at accurate scale.
 * 
 * @param narrative - The narrative containing era and content information
 * @param existingObjects - Optional array of existing objects to filter
 * @returns ARScene with era-appropriate content
 */
export function buildSceneForEra(
  narrative: Narrative,
  existingObjects: ARObject[] = []
): ARScene {
  const yearsAgo = extractYearsAgoFromNarrative(narrative);
  const era = extractEraFromNarrative(narrative);
  
  // Filter existing objects by era appropriateness
  const filteredObjects = filterObjectsByEra(existingObjects, yearsAgo);
  
  // Build scene objects from narrative content
  const sceneObjects: ARObject[] = [...filteredObjects];
  
  // Add creatures from narrative fauna
  for (const creature of narrative.fauna) {
    sceneObjects.push(createCreatureObject(creature));
  }
  
  // Add plants from narrative flora
  for (const plant of narrative.flora) {
    sceneObjects.push(createPlantObject(plant));
  }
  
  // Get era-appropriate environment
  const environment = getEnvironmentForEra(yearsAgo);
  
  return {
    id: generateId(),
    era,
    objects: sceneObjects,
    environment,
    isPlaceholder: false,
  };
}

/**
 * Extracts yearsAgo from a narrative.
 * This parses the shortDescription to find the years ago value.
 * 
 * @param narrative - The narrative to extract from
 * @returns The yearsAgo value, defaulting to 0 if not found
 */
function extractYearsAgoFromNarrative(narrative: Narrative): number {
  // Try to extract from the narrative's visual prompt or description
  // The narrative contains era information in the visualPrompt
  const match = narrative.visualPrompt.match(/(\d+(?:\.\d+)?)\s*(billion|million|thousand)?\s*years?\s*ago/i);
  
  if (match) {
    let value = parseFloat(match[1]);
    const unit = match[2]?.toLowerCase();
    
    if (unit === 'billion') {
      value *= 1_000_000_000;
    } else if (unit === 'million') {
      value *= 1_000_000;
    } else if (unit === 'thousand') {
      value *= 1_000;
    }
    
    return value;
  }
  
  // Default to 0 (present) if we can't extract
  return 0;
}

/**
 * Extracts GeologicalEra from a narrative.
 * 
 * @param narrative - The narrative to extract from
 * @returns GeologicalEra object
 */
function extractEraFromNarrative(narrative: Narrative): GeologicalEra {
  // Extract era name from visual prompt
  const eraMatch = narrative.visualPrompt.match(/Render a (\w+) landscape/);
  const eraName = eraMatch ? eraMatch[1] : 'Unknown';
  
  return {
    name: eraName,
    yearsAgo: extractYearsAgoFromNarrative(narrative),
    period: eraName,
  };
}

// ============================================
// Placeholder Scene Generation
// Requirements: 7.1, 7.3
// ============================================

/**
 * Generic placeholder content for different era categories
 */
const PLACEHOLDER_CONTENT = {
  recent: {
    flora: ['generic trees', 'grass'],
    fauna: ['birds', 'small mammals'],
  },
  intermediate: {
    flora: ['ancient trees', 'ferns'],
    fauna: ['megafauna', 'birds'],
  },
  prehistoric: {
    flora: ['ferns', 'cycads'],
    fauna: ['prehistoric creatures'],
  },
  ancient: {
    flora: ['primitive plants', 'algae'],
    fauna: ['marine life', 'invertebrates'],
  },
};

/**
 * Renders a placeholder scene for an era while data loads.
 * 
 * Per Requirement 7.1: WHEN geological data is requested THEN the DeepTime_App 
 * SHALL immediately render procedurally generated placeholder content.
 * 
 * Per Requirement 7.3: WHEN placeholder content is displayed THEN the DeepTime_App 
 * SHALL indicate loading status with a subtle visual marker.
 * 
 * The isPlaceholder flag is set to true to indicate this is placeholder content.
 * 
 * @param era - The geological era to generate placeholder content for
 * @returns ARScene with placeholder content and isPlaceholder=true
 */
export function renderPlaceholder(era: GeologicalEra): ARScene {
  const yearsAgo = era.yearsAgo;
  
  // Select appropriate placeholder content based on era
  let content: { flora: string[]; fauna: string[] };
  
  if (yearsAgo <= TIME_THRESHOLDS.RECENT_HISTORY_MAX) {
    content = PLACEHOLDER_CONTENT.recent;
  } else if (yearsAgo <= TIME_THRESHOLDS.DEEP_HISTORY_MIN) {
    content = PLACEHOLDER_CONTENT.intermediate;
  } else if (yearsAgo <= 66_000_000) {
    // Mesozoic and Cenozoic
    content = PLACEHOLDER_CONTENT.prehistoric;
  } else {
    // Paleozoic and earlier
    content = PLACEHOLDER_CONTENT.ancient;
  }
  
  // Build placeholder objects
  const objects: ARObject[] = [];
  
  // Add placeholder creatures
  for (const creature of content.fauna) {
    objects.push({
      id: generateId(),
      type: 'creature',
      position: defaultPosition(),
      scale: defaultScale(),
      modelId: `placeholder-creature-${creature.toLowerCase().replace(/\s+/g, '-')}`,
      interactable: false, // Placeholders are not interactable
      metadata: { 
        name: creature,
        isPlaceholder: true,
      },
    });
  }
  
  // Add placeholder plants
  for (const plant of content.flora) {
    objects.push({
      id: generateId(),
      type: 'plant',
      position: defaultPosition(),
      scale: defaultScale(),
      modelId: `placeholder-plant-${plant.toLowerCase().replace(/\s+/g, '-')}`,
      interactable: false,
      metadata: { 
        name: plant,
        isPlaceholder: true,
      },
    });
  }
  
  // Get era-appropriate environment
  const environment = getEnvironmentForEra(yearsAgo);
  
  return {
    id: generateId(),
    era,
    objects,
    environment,
    isPlaceholder: true, // Key flag per Requirement 7.3
  };
}

/**
 * Builds a scene directly from era and yearsAgo, useful when narrative
 * is not yet available.
 * 
 * @param era - The geological era
 * @param yearsAgo - The time position in years before present
 * @param fauna - Array of fauna names
 * @param flora - Array of flora names
 * @param existingObjects - Optional existing objects to include
 * @returns ARScene with era-appropriate content
 */
export function buildSceneFromEra(
  era: GeologicalEra,
  yearsAgo: number,
  fauna: string[] = [],
  flora: string[] = [],
  existingObjects: ARObject[] = []
): ARScene {
  // Filter existing objects by era appropriateness
  const filteredObjects = filterObjectsByEra(existingObjects, yearsAgo);
  
  // Build scene objects
  const sceneObjects: ARObject[] = [...filteredObjects];
  
  // Add creatures
  for (const creature of fauna) {
    sceneObjects.push(createCreatureObject(creature));
  }
  
  // Add plants
  for (const plant of flora) {
    sceneObjects.push(createPlantObject(plant));
  }
  
  // Get era-appropriate environment
  const environment = getEnvironmentForEra(yearsAgo);
  
  return {
    id: generateId(),
    era: { ...era, yearsAgo },
    objects: sceneObjects,
    environment,
    isPlaceholder: false,
  };
}
