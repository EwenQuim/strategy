import { poolShapes, type BiomeDefinition } from './biome.ts'

export const desert: BiomeDefinition = {
  name: 'Open Desert',
  description: 'oases and rare decorative palms',
  ground: 'sand',
  scatter: { terrain: 'palm', chance: 0.04 },
  features: [{ terrain: 'lake', min: 1, max: 3, shapes: poolShapes }],
  theme: {
    '--biome-background': '#805537',
    '--biome-glow': '#f4c46e85',
    '--biome-panel': '#3f2b20',
    '--tile-base': '#996437',
    '--tile-shade': '#8b4e28',
    '--move-tint': '#c7c79b',
    '--plain-tile': '#e5bc70',
  },
}
