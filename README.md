# 🦖 DeepTime - Resurrect the Past in AR

> **Kiroween Hackathon Entry** | Category: **Resurrection** 🎃
> 
> *Bringing prehistoric life back from extinction through augmented reality*

![DeepTime Banner](docs/banner.png)

## 🌋 What is DeepTime?

DeepTime is a mobile AR application that resurrects prehistoric creatures at your location. Point your phone at the ground and watch as dinosaurs, mammoths, and ancient life forms emerge from the geological layers beneath your feet.

**The dead don't stay buried.** Using real geological data from USGS and AI-powered narration from Gemini, DeepTime brings Earth's 4.5 billion year history back to life—right where you're standing.

## ✨ Features

- 🦕 **AR Creature Encounters** - See animated 3D prehistoric creatures in your environment
- 🗺️ **Location-Based Geology** - Real geological data for your exact location
- ⏰ **Time Travel Slider** - Scrub through millions of years of Earth's history
- 🎙️ **AI Narration** - Gemini-powered storytelling about each era and creature
- 📳 **Haptic Feedback** - Feel the passage of time as you cross era boundaries
- 📱 **PWA** - Install on any device, works offline

## 🎬 Demo

[Watch the 3-minute demo video](https://youtube.com/your-demo-link)

**Live App:** [https://deeptime.app](https://deeptime.app)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| 3D/AR | Three.js + WebXR |
| AI | Google Gemini 1.5 Flash |
| Backend | Firebase (Firestore + Hosting) |
| Geological Data | USGS Macrostrat API |
| State | Zustand |
| Build | Vite + PWA Plugin |

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/zzfadi/deeptime.git
cd deeptime

# Install dependencies
npm install
cd deep-time-app && npm install

# Set up environment variables
cp deep-time-app/.env.example deep-time-app/.env
# Edit .env with your API keys

# Run development server
cd deep-time-app && npm run dev
```

## 🔑 Environment Variables

Create `deep-time-app/.env`:

```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_GEMINI_API_KEY=your-gemini-api-key
```

## 🎃 Kiroween: How Kiro Was Used

This project was built entirely with [Kiro](https://kiro.dev), demonstrating its full feature set:

### Spec-Driven Development
The entire application was designed using Kiro's spec workflow:
- **3 complete specs** in `.kiro/specs/`:
  - `deep-time/` - Core geological data types and services
  - `deep-time-pwa/` - PWA implementation with offline support
  - `enhanced-ar/` - WebXR AR experience with creatures

Each spec includes:
- `requirements.md` - EARS-formatted requirements with acceptance criteria
- `design.md` - Architecture, interfaces, and correctness properties
- `tasks.md` - Implementation checklist with requirement traceability

### Property-Based Testing
Kiro helped design correctness properties that were implemented as property-based tests using fast-check:
- Era-creature mapping consistency
- Ground plane anchoring tolerance
- Transition duration bounds
- Creature distribution non-overlap

### MCP Integration
Used Firebase MCP server for:
- Project configuration
- Environment management
- Deployment automation

### Vibe Coding
Iterative development through natural conversation for:
- UI component refinement
- Animation tuning
- Error handling improvements

## 📁 Project Structure

```
deeptime/
├── .kiro/                    # Kiro specs, hooks, steering (REQUIRED for hackathon)
│   └── specs/
│       ├── deep-time/        # Core types spec
│       ├── deep-time-pwa/    # PWA spec
│       └── enhanced-ar/      # AR experience spec
├── src/                      # Core library (types, services)
├── deep-time-app/            # React PWA application
│   ├── src/
│   │   ├── ar/              # AR session, creatures, transitions
│   │   ├── components/      # React components
│   │   ├── services/        # Firebase, Gemini, geological APIs
│   │   └── data/            # Creature manifest
│   └── public/
│       └── models/          # GLTF creature models
└── tests/                    # Property-based tests
```

## 🦴 Creatures

DeepTime features 12 prehistoric creatures across 6 geological eras:

| Era | Creatures |
|-----|-----------|
| Cretaceous | T-Rex, Triceratops, Velociraptor |
| Jurassic | Brachiosaurus, Stegosaurus, Allosaurus |
| Pleistocene | Woolly Mammoth, Saber-tooth, Giant Sloth |
| Triassic | Coelophysis |
| Permian | Dimetrodon |
| Carboniferous | Meganeura |

## 📜 License

MIT License - see [LICENSE](LICENSE)

## 🙏 Acknowledgments

- USGS Macrostrat for geological data
- Sketchfab/Poly Pizza for 3D models
- Google Gemini for AI narration
- The Kiro team for an amazing AI-powered IDE

---

*Built with 🦖 and Kiro for Kiroween 2024*
