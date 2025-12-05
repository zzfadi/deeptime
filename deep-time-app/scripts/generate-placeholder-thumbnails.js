#!/usr/bin/env node
/**
 * Generate placeholder thumbnail SVGs for development
 * 
 * These are simple colored placeholders that can be replaced with real images
 * 
 * Usage: node scripts/generate-placeholder-thumbnails.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const creatures = [
  { id: 'trex', name: 'T-Rex', color: '#8B4513' },
  { id: 'triceratops', name: 'Triceratops', color: '#556B2F' },
  { id: 'velociraptor', name: 'Velociraptor', color: '#CD853F' },
  { id: 'brachiosaurus', name: 'Brachiosaurus', color: '#6B8E23' },
  { id: 'stegosaurus', name: 'Stegosaurus', color: '#8FBC8F' },
  { id: 'allosaurus', name: 'Allosaurus', color: '#A0522D' },
  { id: 'mammoth', name: 'Mammoth', color: '#8B7355' },
  { id: 'sabertooth', name: 'Sabertooth', color: '#D2691E' },
  { id: 'megatherium', name: 'Sloth', color: '#9ACD32' },
  { id: 'coelophysis', name: 'Coelophysis', color: '#BDB76B' },
  { id: 'dimetrodon', name: 'Dimetrodon', color: '#BC8F8F' },
  { id: 'meganeura', name: 'Meganeura', color: '#4682B4' }
];

const thumbnailsDir = path.join(__dirname, '..', 'public', 'thumbnails');

// Ensure thumbnails directory exists
if (!fs.existsSync(thumbnailsDir)) {
  fs.mkdirSync(thumbnailsDir, { recursive: true });
}

console.log('Generating placeholder thumbnail SVGs...\n');

creatures.forEach(creature => {
  const filePath = path.join(thumbnailsDir, `${creature.id}.svg`);
  
  // Skip if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${creature.id}.svg (already exists)`);
    return;
  }
  
  // Create simple SVG placeholder
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${creature.color}" rx="16"/>
  <text x="128" y="120" text-anchor="middle" fill="white" font-family="system-ui" font-size="16" font-weight="bold">${creature.name}</text>
  <text x="128" y="150" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-family="system-ui" font-size="12">Placeholder</text>
</svg>`;
  
  fs.writeFileSync(filePath, svg);
  console.log(`✅ Created ${creature.id}.svg (placeholder)`);
});

console.log('\n📝 Note: These are placeholder thumbnails.');
console.log('   Replace with real creature images for production.');
