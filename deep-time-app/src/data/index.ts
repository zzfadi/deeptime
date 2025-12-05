/**
 * Creature Data Module
 * Loads and provides access to creature manifest data
 * Requirements: 2.1
 */

import type { Creature, CreatureManifest } from '../ar/types';
import creaturesData from './creatures.json';

/**
 * The loaded creature manifest
 */
export const creatureManifest: CreatureManifest = creaturesData as CreatureManifest;

/**
 * Get all creatures for a specific era
 * @param eraName - The name of the geological era
 * @returns Array of creatures for that era, or empty array if none found
 */
export function getCreaturesForEra(eraName: string): Creature[] {
  return creatureManifest.creatures[eraName] || [];
}

/**
 * Get a specific creature by ID
 * @param creatureId - The unique creature identifier
 * @returns The creature if found, or undefined
 */
export function getCreatureById(creatureId: string): Creature | undefined {
  for (const creatures of Object.values(creatureManifest.creatures)) {
    const found = creatures.find(c => c.id === creatureId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Get all available era names that have creatures
 * @returns Array of era names
 */
export function getAvailableEras(): string[] {
  return Object.keys(creatureManifest.creatures);
}

/**
 * Get all creatures across all eras
 * @returns Array of all creatures
 */
export function getAllCreatures(): Creature[] {
  return Object.values(creatureManifest.creatures).flat();
}
