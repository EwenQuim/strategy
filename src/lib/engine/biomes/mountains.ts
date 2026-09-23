import { bendShape, lineShape, type BiomeDefinition } from './biome.ts'

export const mountains: BiomeDefinition = {
  name: 'Mountain Ranges',
  description: 'mountain chains',
  ground: 'plain',
  feature: {
    terrain: 'mountain',
    min: 3,
    max: 5,
    shapes: [
      ...[4, 5, 6, 7].map(lineShape),
      ...[2, 3].flatMap((first) => [3, 4].map((second) => bendShape(first, second))),
    ],
  },
  theme: {
    '--biome-background': '#263b4c',
    '--biome-glow': '#9db9d078',
    '--biome-panel': '#1b2935',
    '--tile-base': '#435562',
    '--tile-shade': '#263544',
    '--move-tint': '#a3bd88',
  },
}
