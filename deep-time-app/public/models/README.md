# 3D Creature Models

This directory contains GLTF/GLB models for the AR creature experience.

## Model Requirements

Each model should:
- Be in GLTF 2.0 format (.glb preferred for single-file distribution)
- Be under 5MB (compressed with Draco)
- Include skeletal animations (not morph targets)
- Have at least an "idle" animation

## Required Models

### Cretaceous Era
| Model | File | Scale (meters) | Required Animations |
|-------|------|----------------|---------------------|
| Tyrannosaurus Rex | trex.glb | 12.0 | idle, walk, roar |
| Triceratops | triceratops.glb | 9.0 | idle, walk, graze |
| Velociraptor | velociraptor.glb | 2.0 | idle, walk, attention |

### Jurassic Era
| Model | File | Scale (meters) | Required Animations |
|-------|------|----------------|---------------------|
| Brachiosaurus | brachiosaurus.glb | 25.0 | idle, walk, eat |
| Stegosaurus | stegosaurus.glb | 9.0 | idle, walk, graze |
| Allosaurus | allosaurus.glb | 8.5 | idle, walk, roar |

### Pleistocene Era (Ice Age)
| Model | File | Scale (meters) | Required Animations |
|-------|------|----------------|---------------------|
| Woolly Mammoth | mammoth.glb | 4.0 | idle, walk, trumpet |
| Saber-toothed Cat | sabertooth.glb | 1.2 | idle, walk, roar |
| Giant Ground Sloth | megatherium.glb | 6.0 | idle, walk, eat |

### Triassic Era
| Model | File | Scale (meters) | Required Animations |
|-------|------|----------------|---------------------|
| Coelophysis | coelophysis.glb | 3.0 | idle, walk, attention |

### Permian Era
| Model | File | Scale (meters) | Required Animations |
|-------|------|----------------|---------------------|
| Dimetrodon | dimetrodon.glb | 3.5 | idle, walk, attention |

### Carboniferous Era
| Model | File | Scale (meters) | Required Animations |
|-------|------|----------------|---------------------|
| Meganeura | meganeura.glb | 0.7 | idle, walk |

## Recommended Sources (Free/CC0)

1. **Sketchfab** - https://sketchfab.com
   - Search for "dinosaur animated glb"
   - Filter by "Downloadable" and "Animated"
   - Check license (CC0, CC-BY preferred)

2. **Poly Pizza** - https://poly.pizza
   - Low-poly animated creatures
   - All models are CC0

3. **Quaternius** - https://quaternius.com
   - Free game-ready animal packs
   - Includes prehistoric creatures

4. **Kenney** - https://kenney.nl
   - Free game assets
   - Some animated creatures available

## Compression with Draco

To compress models with Draco, use gltf-pipeline:

```bash
npm install -g gltf-pipeline
gltf-pipeline -i input.glb -o output.glb -d
```

Or use the online tool: https://gltf.report/

## Animation Naming Convention

When exporting models, ensure animations are named:
- `idle` - Default standing/breathing animation
- `walk` - Walking/moving animation
- `roar` / `trumpet` - Vocalization animation
- `eat` / `graze` - Feeding animation
- `attention` - Alert/looking around animation

If the source model has different animation names, you can remap them in the creatures.json manifest.
