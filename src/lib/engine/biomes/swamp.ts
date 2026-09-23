import { poolShapes, type BiomeDefinition } from './biome.ts'

export const swamp: BiomeDefinition = {
  name: 'Sunken Mire',
  description: 'dense thickets and murky water',
  ground: 'plain',
  scatter: { terrain: 'forest', chance: 0.4 },
  feature: { terrain: 'lake', min: 4, max: 7, shapes: poolShapes },
  theme: {
    '--biome-background': '#25301f',
    '--biome-glow': '#6f7a3a5c',
    '--biome-panel': '#1c2517',
    '--tile-base': '#39421f',
    '--tile-shade': '#252d14',
    '--move-tint': '#9fac72',
    '--plain-tile': '#5c6a3a',
  },
}
