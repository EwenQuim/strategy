import { initialState, symmetricSeed, type GameState } from '../src/lib/engine/index.ts'
import type { PawnKind } from '../src/lib/engine/pawns/index.ts'

export function trainingBattle(seed: string, index: number): GameState {
  const rosters: PawnKind[][] = [
    ['king', 'swordsman', 'archer'],
    ['king', 'swordsman', 'archer', 'ninja', 'lancer'],
    ['king', 'bulwark', 'bomber', 'magician', 'archer'],
    ['king', 'swordsman', 'archer', 'ninja', 'bulwark', 'wolf', 'hoplite'],
  ]
  const biomes = ['verdant', 'desert', 'mountains', 'volcano'] as const
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
