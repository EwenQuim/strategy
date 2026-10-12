import {
  initialState,
  symmetricSeed,
  type GameState,
  type Biome,
} from '../src/lib/engine/index.ts'
import type { PawnKind } from '../src/lib/engine/pawns/index.ts'

export const TRAINING_ROSTERS: PawnKind[][] = [
  ['king', 'swordsman', 'archer'],
  ['king', 'swordsman', 'archer', 'ninja', 'lancer'],
  ['king', 'bulwark', 'bomber', 'magician', 'archer'],
  ['king', 'swordsman', 'archer', 'ninja', 'bulwark', 'wolf', 'hoplite'],
]
export const TRAINING_BIOMES: Biome[] = ['verdant', 'desert', 'mountains', 'volcano']

export function trainingBattle(
  seed: string,
  index: number,
  rosters = TRAINING_ROSTERS,
  biomes = TRAINING_BIOMES,
): GameState {
  const roster = rosters[index % rosters.length]
  return initialState(
    symmetricSeed(seed),
    {
      biome: biomes[Math.floor(index / rosters.length) % biomes.length],
      player: roster,
      enemy: roster,
    },
    'player',
  )
}
