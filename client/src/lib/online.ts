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
  winner: Side | null
  actions: OnlineAction[]
}
