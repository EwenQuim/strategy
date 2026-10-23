import { poolShapes, type BiomeDefinition } from './biome.ts'

// Two-tile-wide ice strips: every tile keeps at least two ice neighbours, and
// entering from either end slides across the whole strip in one step.
const stripShape = (length: number) =>
  Array.from({ length: length * 2 }, (_, i) => [Math.floor(i / 2), i % 2] as [number, number])

export const banquise: BiomeDefinition = {
  ground: 'plain',
  features: [
    { terrain: 'ice', min: 2, max: 4, shapes: [3, 4, 5].map(stripShape) },
    { terrain: 'lake', min: 1, max: 2, shapes: [poolShapes[0]!, poolShapes[1]!], anchorBias: 'bay' },
  ],
  theme: {
    '--biome-background': '#20364d',
    '--biome-glow': '#a7d3ea80',
    '--biome-panel': '#16273a',
    '--tile-base': '#5f7d99',
    '--tile-shade': '#3d5a75',
    '--move-tint': '#d7ecf7',
    '--plain-tile': '#cfe3ef',
  },
}
