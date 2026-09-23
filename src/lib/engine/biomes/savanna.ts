import { poolShapes, type BiomeDefinition } from './biome.ts'

export const savanna: BiomeDefinition = {
  name: 'Golden Savanna',
  description: 'grassland with acacia clumps and watering holes',
  ground: 'sand',
  scatter: { terrain: 'forest', chance: 0.15 },
  feature: { terrain: 'lake', min: 1, max: 2, shapes: poolShapes },
  theme: {
    '--biome-background': '#5f5426',
    '--biome-glow': '#d8c66d78',
    '--biome-panel': '#332d15',
    '--tile-base': '#8a7a34',
    '--tile-shade': '#6f6026',
    '--move-tint': '#c3c383',
    '--plain-tile': '#cdb964',
  },
}
