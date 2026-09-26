import { poolShapes, type BiomeDefinition } from './biome.ts'

export const verdant: BiomeDefinition = {
  ground: 'plain',
  scatter: { terrain: 'forest', chance: 0.25 },
  features: [{ terrain: 'lake', min: 3, max: 6, shapes: poolShapes }],
  theme: {
    '--biome-background': '#1c3025',
    '--biome-glow': '#51634069',
    '--biome-panel': '#172a21',
    '--tile-base': '#263f30',
    '--tile-shade': '#10291b',
    '--move-tint': '#a3bd88',
  },
}
