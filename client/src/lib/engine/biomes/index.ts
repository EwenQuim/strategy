import { desert } from './desert.ts'
import { hell } from './hell.ts'
import { mountains } from './mountains.ts'
import { verdant } from './verdant.ts'
import { volcano } from './volcano.ts'

export const BIOMES = { verdant, mountains, desert, volcano, hell }

export type Biome = keyof typeof BIOMES
