import type { Action as EngineAction } from './engine/types.ts'
import type { Side } from './engine/pawns/pawn.ts'

export type StoredGame = { code: string; token: string; side: Side }

export type OnlineAction = { side: Side; action: EngineAction; winner?: Side | null }
