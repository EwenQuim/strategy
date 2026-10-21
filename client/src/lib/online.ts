import { seededBiome, type BattleSetup } from './engine/index.ts'
import type { Pawn } from './engine/pawns/pawn.ts'
import type { Action as EngineAction } from './engine/index.ts'
import type { Side } from './engine/pawns/pawn.ts'

export type StoredGame = { code: string; token: string; side: Side }

export type OnlineAction = { side: Side; action: EngineAction; winner?: Side | null }

export type OnlineGame = {
  code: string
  status: 'waiting' | 'active' | 'finished'
  version: number
  seed: string
  namePlayer: string
  nameEnemy: string
  roster?: string[]
  winner: Side | null
  actions: OnlineAction[]
}

// The host's roster applies to both sides, like the mirrored armies of quick online battles.
export function rosterSetup(
  seed: string,
  roster: readonly string[] | undefined,
): BattleSetup | undefined {
  if (!roster?.length) return undefined
  const army = ['king', ...roster] as Pawn['kind'][]
  return { biome: seededBiome(seed), player: army, enemy: army }
}
