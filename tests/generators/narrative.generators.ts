import * as fc from 'fast-check';
import type {
  Narrative,
  ClimateDescription,
  ObjectExplanation,
} from '../../src/types';

// Climate description generator
export const climateDescriptionArb: fc.Arbitrary<ClimateDescription> = fc.record({
  temperature: fc.constantFrom(
    'tropical',
    'subtropical',
    'temperate',
    'cold',
    'frigid',
    'hot and humid',
    'warm and dry'
  ),
  humidity: fc.constantFrom('arid', 'semi-arid', 'humid', 'very humid', 'moderate'),
  atmosphere: fc.constantFrom(
    'oxygen-rich',
    'carbon dioxide heavy',
    'similar to modern',
    'thin atmosphere',
    'dense atmosphere'
  ),
});

// Flora generator
const floraArb = fc.array(
  fc.constantFrom(
    'ferns',
    'conifers',
    'flowering plants',
    'mosses',
    'cycads',
    'ginkgos',
    'horsetails',
    'club mosses',
    'seed ferns',
    'grasses',
    'palms',
    'oaks',
    'willows'
  ),
  { minLength: 1, maxLength: 6 }
);

// Fauna generator
const faunaArb = fc.array(
  fc.constantFrom(
    'trilobites',
    'ammonites',
    'dinosaurs',
    'mammals',
    'fish',
    'amphibians',
    'reptiles',
    'birds',
    'insects',
    'brachiopods',
    'crinoids',
    'early tetrapods',
    'therapsids'
  ),
  { minLength: 1, maxLength: 6 }
);


// Narrative generator
export const narrativeArb: fc.Arbitrary<Narrative> = fc.record({
  layerId: fc.uuid(),
  shortDescription: fc.lorem({ maxCount: 2, mode: 'sentences' }),
  fullDescription: fc.lorem({ maxCount: 5, mode: 'sentences' }),
  visualPrompt: fc.lorem({ maxCount: 3, mode: 'sentences' }),
  flora: floraArb,
  fauna: faunaArb,
  climate: climateDescriptionArb,
  soundscape: fc.constantFrom(
    'rushing water and wind',
    'dense jungle sounds',
    'quiet desert winds',
    'ocean waves',
    'volcanic rumbling',
    'forest ambience'
  ),
});

// Narrative with high fossil content (fauna array has at least 3 creatures)
export const highFossilNarrativeArb: fc.Arbitrary<Narrative> = fc.record({
  layerId: fc.uuid(),
  shortDescription: fc.lorem({ maxCount: 2, mode: 'sentences' }),
  fullDescription: fc.lorem({ maxCount: 5, mode: 'sentences' }),
  visualPrompt: fc.lorem({ maxCount: 3, mode: 'sentences' }),
  flora: floraArb,
  fauna: fc.array(
    fc.constantFrom(
      'trilobites',
      'ammonites',
      'dinosaurs',
      'mammals',
      'fish',
      'amphibians',
      'reptiles'
    ),
    { minLength: 3, maxLength: 6 }
  ),
  climate: climateDescriptionArb,
  soundscape: fc.constantFrom(
    'rushing water and wind',
    'dense jungle sounds',
    'quiet desert winds'
  ),
});

// Object explanation generator
export const objectExplanationArb: fc.Arbitrary<ObjectExplanation> = fc.record({
  objectType: fc.constantFrom('rock', 'fossil', 'creature', 'plant', 'structure'),
  name: fc.lorem({ maxCount: 2, mode: 'words' }),
  description: fc.lorem({ maxCount: 3, mode: 'sentences' }),
  audioTranscript: fc.lorem({ maxCount: 5, mode: 'sentences' }),
  relatedFacts: fc.array(fc.lorem({ maxCount: 1, mode: 'sentences' }), { minLength: 1, maxLength: 4 }),
});
