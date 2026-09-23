import { poolShapes, type BiomeDefinition } from './biome.ts'

export const tundra: BiomeDefinition = {
  name: 'Frozen Tundra',
  description: 'frozen ponds and frostpines',
  ground: 'plain',
  scatter: { terrain: 'forest', chance: 0.12 },
  feature: { terrain: 'lake', min: 3, max: 6, shapes: poolShapes },
  theme: {
    '--biome-background': '#26333f',
    '--biome-glow': '#bcd7e85e',
    '--biome-panel': '#1d2830',
    '--tile-base': '#4a5b66',
    '--tile-shade': '#33424c',
    '--move-tint': '#a9c6d6',
    '--plain-tile': '#c4d4dc',
  },
}
