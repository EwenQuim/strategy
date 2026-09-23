import { ashlands } from './ashlands.ts'
import { coast } from './coast.ts'
import { desert } from './desert.ts'
import { mountains } from './mountains.ts'
import { savanna } from './savanna.ts'
import { swamp } from './swamp.ts'
import { tundra } from './tundra.ts'
import { verdant } from './verdant.ts'
import { volcano } from './volcano.ts'

export const BIOMES = {
  verdant,
  mountains,
  desert,
  volcano,
  tundra,
  swamp,
  savanna,
  ashlands,
  coast,
}

export type Biome = keyof typeof BIOMES
