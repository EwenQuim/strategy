import { desert } from './desert.ts'
import { mountains } from './mountains.ts'
import { verdant } from './verdant.ts'
import { volcano } from './volcano.ts'

export const BIOMES = { verdant, mountains, desert, volcano }

export type Biome = keyof typeof BIOMES
