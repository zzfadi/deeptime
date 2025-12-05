#!/usr/bin/env node
/**
 * Generate placeholder GLB models for development
 * 
 * These are minimal valid GLB files that can be loaded by Three.js
 * Replace with real models from Sketchfab/Poly Pizza for production
 * 
 * Usage: node scripts/generate-placeholder-models.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal valid GLB structure (a simple cube with idle animation)
// This is a base64-encoded minimal GLB file
const MINIMAL_GLB_BASE64 = 'Z2xURgIAAADQAgAArAIAAEpTT057ImFzc2V0Ijp7InZlcnNpb24iOiIyLjAiLCJnZW5lcmF0b3IiOiJEZWVwVGltZSBQbGFjZWhvbGRlciJ9LCJzY2VuZSI6MCwic2NlbmVzIjpbeyJub2RlcyI6WzBdfV0sIm5vZGVzIjpbeyJuYW1lIjoiUGxhY2Vob2xkZXIiLCJtZXNoIjowfV0sIm1lc2hlcyI6W3sicHJpbWl0aXZlcyI6W3siYXR0cmlidXRlcyI6eyJQT1NJVElPTiI6MH0sImluZGljZXMiOjF9XX1dLCJhY2Nlc3NvcnMiOlt7ImJ1ZmZlclZpZXciOjAsImNvbXBvbmVudFR5cGUiOjUxMjYsImNvdW50Ijo4LCJ0eXBlIjoiVkVDMyIsIm1heCI6WzEsMSwxXSwibWluIjpbLTEsLTEsLTFdfSx7ImJ1ZmZlclZpZXciOjEsImNvbXBvbmVudFR5cGUiOjUxMjMsImNvdW50IjozNiwidHlwZSI6IlNDQUxBUiJ9XSwiYnVmZmVyVmlld3MiOlt7ImJ1ZmZlciI6MCwiYnl0ZUxlbmd0aCI6OTYsImJ5dGVPZmZzZXQiOjB9LHsiYnVmZmVyIjowLCJieXRlTGVuZ3RoIjo3MiwiYnl0ZU9mZnNldCI6OTZ9XSwiYnVmZmVycyI6W3siYnl0ZUxlbmd0aCI6MTY4fV19AAAAAACAAAAAAAAAAACAAAAAAIA/AACAPwAAAAAAAIA/AACAvwAAAAAAAIA/AACAvwAAgD8AAIA/AACAPwAAgD8AAIA/AACAPwAAgL8AAIA/AACAvwAAgL8AAIA/AACAvwAAgL8AAAAAAQACAAIAAQADAAQABQAGAAYABQAHAAgACQAKAAoACQALAAwADQAOAA4ADQAPABAAAQASABIAAQA=';

const creatures = [
  'trex',
  'triceratops', 
  'velociraptor',
  'brachiosaurus',
  'stegosaurus',
  'allosaurus',
  'mammoth',
  'sabertooth',
  'megatherium',
  'coelophysis',
  'dimetrodon',
  'meganeura'
];

const modelsDir = path.join(__dirname, '..', 'public', 'models');

// Ensure models directory exists
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

console.log('Generating placeholder GLB models...\n');

creatures.forEach(creature => {
  const filePath = path.join(modelsDir, `${creature}.glb`);
  
  // Skip if file already exists (don't overwrite real models)
  if (fs.existsSync(filePath)) {
    console.log(`⏭️  Skipping ${creature}.glb (already exists)`);
    return;
  }
  
  // Write placeholder GLB
  const buffer = Buffer.from(MINIMAL_GLB_BASE64, 'base64');
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Created ${creature}.glb (placeholder)`);
});

console.log('\n📝 Note: These are placeholder models.');
console.log('   Replace with real animated models from Sketchfab/Poly Pizza.');
console.log('   See public/models/README.md for sourcing instructions.');
