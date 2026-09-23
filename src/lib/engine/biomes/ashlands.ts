import { bendShape, lineShape, type BiomeDefinition } from './biome.ts'

export const ashlands: BiomeDefinition = {
  name: 'Ashfall Barrens',
  description: 'cinder cones over cold basalt',
  ground: 'basalt',
  feature: {
    terrain: 'mountain',
    min: 3,
    max: 5,
    shapes: [
      ...[3, 4, 5].map(lineShape),
      ...[2, 3].flatMap((first) => [2, 3].map((second) => bendShape(first, second))),
    ],
  },
  theme: {
    '--biome-background': '#2c2a2b',
    '--biome-glow': '#b3aca86e',
    '--biome-panel': '#232122',
    '--tile-base': '#494446',
    '--tile-shade': '#353133',
    '--move-tint': '#a89f9a',
    '--plain-tile': '#5a5155',
  },
}
