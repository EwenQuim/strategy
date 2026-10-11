import { poolShapes, type BiomeDefinition } from './biome.ts'

export const magic: BiomeDefinition = {
  ground: 'plain',
  scatter: { terrain: 'forest', chance: 0.15 },
  features: [{ terrain: 'lake', min: 2, max: 4, shapes: poolShapes.slice(0, 3) }],
  rareFeature: { feature: 'portal', chance: 1 },
  theme: {
    '--biome-background': '#241d3d',
    '--biome-glow': '#9a6cf065',
    '--biome-panel': '#1c1731',
    '--tile-base': '#352b55',
    '--tile-shade': '#1d1735',
    '--move-tint': '#b7a6e6',
    '--plain-tile': '#6f6a94',
    '--selected-tint': '#d4c4f5',
    '--muted': '#b4a9cf',
    '--line': '#b9a3f22a',
    '--battlefield-image':
      'radial-gradient(ellipse at 50% 50%, var(--biome-glow), transparent 68%), radial-gradient(#d6c4ff2e 1px, transparent 1px), none',
    '--battlefield-size': 'auto, 29px 31px, auto',
  },
}
