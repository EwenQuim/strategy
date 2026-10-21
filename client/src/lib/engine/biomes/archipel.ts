import { poolShapes, type BiomeDefinition } from './biome.ts'

// Two-tile-wide shoal strips ford the archipel's waters: always walkable, but
// the rising tide strikes anyone standing on them when an even round ends.
const stripShape = (length: number) =>
  Array.from({ length: length * 2 }, (_, i) => [Math.floor(i / 2), i % 2] as [number, number])

export const archipel: BiomeDefinition = {
  ground: 'sand',
  features: [
    { terrain: 'lake', min: 3, max: 5, shapes: poolShapes, anchorBias: 'bay' },
    { terrain: 'shoal', min: 2, max: 4, shapes: [2, 3, 4].map(stripShape) },
  ],
  theme: {
    '--biome-background': '#1d4e5f',
    '--biome-glow': '#7fd4d480',
    '--biome-panel': '#12333f',
    '--tile-base': '#8aa876',
    '--tile-shade': '#5f8a6a',
    '--move-tint': '#d7f7ea',
    '--plain-tile': '#e5d9a0',
  },
}
