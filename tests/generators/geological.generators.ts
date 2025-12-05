import * as fc from 'fast-check';
import type {
  GeoCoordinate,
  GeologicalEra,
  GeologicalLayer,
  GeologicalStack,
  MaterialType,
  FossilIndex,
  LayerCharacteristics,
} from '../../src/types';

// Material type generator
export const materialTypeArb: fc.Arbitrary<MaterialType> = fc.constantFrom(
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

// Fossil index generator
export const fossilIndexArb: fc.Arbitrary<FossilIndex> = fc.constantFrom(
  'none',
  'low',
  'medium',
  'high',
  'exceptional'
);

// GeoCoordinate generator
export const geoCoordinateArb: fc.Arbitrary<GeoCoordinate> = fc.record({
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  altitude: fc.double({ min: -500, max: 10000, noNaN: true }),
  accuracy: fc.double({ min: 0.1, max: 100, noNaN: true }),
});


// Geological era generator
export const geologicalEraArb: fc.Arbitrary<GeologicalEra> = fc.record({
  name: fc.constantFrom(
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
    'Precambrian'
  ),
  yearsAgo: fc.integer({ min: 0, max: 4_600_000_000 }),
  period: fc.constantFrom(
    'Quaternary',
    'Neogene',
    'Paleogene',
    'Cretaceous',
    'Jurassic',
    'Triassic',
    'Permian',
    'Carboniferous',
    'Devonian',
    'Silurian',
    'Ordovician',
    'Cambrian',
    'Precambrian'
  ),
  epoch: fc.option(
    fc.constantFrom('Early', 'Middle', 'Late'),
    { nil: undefined }
  ),
});

// Layer characteristics generator
export const layerCharacteristicsArb: fc.Arbitrary<LayerCharacteristics> = fc.record({
  color: fc.option(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`), { nil: undefined }),
  density: fc.option(fc.double({ min: 1000, max: 3500, noNaN: true }), { nil: undefined }),
  waterContent: fc.option(fc.double({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
  mineralComposition: fc.option(
    fc.array(fc.constantFrom('quartz', 'feldspar', 'ite', 'calcite', 'clay minerals'), { minLength: 1, maxLength: 5 }),
    { nil: undefined }
  ),
});


// Single geological layer generator
export const geologicalLayerArb: fc.Arbitrary<GeologicalLayer> = fc
  .record({
    id: fc.uuid(),
    depthStart: fc.double({ min: 0, max: 500, noNaN: true }),
    thickness: fc.double({ min: 0.1, max: 100, noNaN: true }),
    material: materialTypeArb,
    era: geologicalEraArb,
    period: fc.constantFrom(
      'Quaternary',
      'Neogene',
      'Paleogene',
      'Cretaceous',
      'Jurassic',
      'Triassic'
    ),
    fossilIndex: fossilIndexArb,
    characteristics: layerCharacteristicsArb,
  })
  .map(({ thickness, ...rest }) => ({
    ...rest,
    depthEnd: rest.depthStart + thickness,
  }));

// Geological stack generator with proper layer ordering (no gaps/overlaps)
export const geologicalStackArb: fc.Arbitrary<GeologicalStack> = fc
  .record({
    location: geoCoordinateArb,
    layerCount: fc.integer({ min: 1, max: 10 }),
    queryTimestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
    dataSource: fc.constantFrom('USGS', 'local_survey', 'satellite', 'manual_entry'),
    confidence: fc.double({ min: 0, max: 1, noNaN: true }),
  })
  .chain(({ location, layerCount, queryTimestamp, dataSource, confidence }) =>
    fc
      .array(
        fc.record({
          thickness: fc.double({ min: 0.5, max: 50, noNaN: true }),
          material: materialTypeArb,
          era: geologicalEraArb,
          period: fc.constantFrom('Quaternary', 'Neogene', 'Paleogene', 'Cretaceous'),
          fossilIndex: fossilIndexArb,
          characteristics: layerCharacteristicsArb,
        }),
        { minLength: layerCount, maxLength: layerCount }
      )
      .map((layerData) => {
        let currentDepth = 0;
        const layers: GeologicalLayer[] = layerData.map((data, index) => {
          const layer: GeologicalLayer = {
            id: `layer-${index}`,
            depthStart: currentDepth,
            depthEnd: currentDepth + data.thickness,
            material: data.material,
            era: data.era,
            period: data.period,
            fossilIndex: data.fossilIndex,
            characteristics: data.characteristics,
          };
          currentDepth = layer.depthEnd;
          return layer;
        });

        return {
          location,
          layers,
          queryTimestamp,
          dataSource,
          confidence,
        };
      })
  );
