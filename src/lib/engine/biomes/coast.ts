import { poolShapes, type BiomeDefinition } from './biome.ts'

export const coast: BiomeDefinition = {
  name: 'Tidal Shallows',
  description: 'shallow lagoons and palm banks',
  ground: 'sand',
  scatter: { terrain: 'palm', chance: 0.08 },
  feature: { terrain: 'lake', min: 4, max: 8, shapes: poolShapes },
  theme: {
    '--biome-background': '#1f4148',
    '--biome-glow': '#69cfd070',
    '--biome-panel': '#173035',
    '--tile-base': '#2f6068',
    '--tile-shade': '#1d454b',
    '--move-tint': '#9fd2cf',
    '--plain-tile': '#e0cf8f',
  },
}
