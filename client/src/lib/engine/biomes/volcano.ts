import { poolShapes, type BiomeDefinition } from './biome.ts'

export const volcano: BiomeDefinition = {
  ground: 'basalt',
  features: [{ terrain: 'lava', min: 3, max: 6, shapes: poolShapes }],
  theme: {
    '--biome-background': '#2b202b',
    '--biome-glow': '#d56b3b55',
    '--biome-panel': '#241c27',
    '--tile-base': '#44373f',
    '--tile-shade': '#392d33',
    '--move-tint': '#8c7b7c',
    '--plain-tile': '#594e53',
    '--selected-tint': '#b39b86',
    '--tile-stroke-opacity': '0.075',
    '--tile-light-opacity': '0.45',
    '--muted': '#b7a5aa',
    '--battlefield-image':
      'radial-gradient(ellipse at 45% 65%, var(--biome-glow), transparent 65%), radial-gradient(#e9995b33 1px, transparent 1px), none',
    '--battlefield-size': 'auto, 37px 43px, auto',
  },
}
