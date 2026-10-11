import { PAWN_CLASSES, type PawnKind, type Side } from './engine/pawns/index.ts'
import type { Tile } from './engine/hex.ts'
import type { BattleSetup, GameState } from './engine/index.ts'
import type { BotConfig } from './engine/ai/decision.ts'
import type { GameMode } from './game-mode.ts'

// Bump when the saved state shape changes; older records are then discarded.
export const BATTLE_SNAPSHOT_VERSION = 4

type SavedPawn = {
  kind: PawnKind
  id: number
  q: number
  r: number
  side: Side
} & Record<string, unknown>

type SavedState = Omit<GameState, 'tiles' | 'pawns'> & {
  tiles: [string, Tile][]
  pawns: SavedPawn[]
}

export type BattleIdentity = {
  mode: GameMode
  seed: string
  // The whole bot description, so battles that differ only by strategy or difficulty never
  // share a save.
  bot: string
  setup: string
}

export function battleIdentity(
  mode: GameMode,
  seed: string,
  bot: BotConfig,
  setup: BattleSetup | undefined,
): BattleIdentity {
  return { mode, seed, bot: JSON.stringify(bot), setup: JSON.stringify(setup ?? null) }
}

export function isSameBattle(saved: unknown, identity: BattleIdentity): boolean {
  if (typeof saved !== 'object' || saved === null) return false
  const { mode, seed, bot, setup } = saved as Record<string, unknown>
  return (
    mode === identity.mode &&
    seed === identity.seed &&
    bot === identity.bot &&
    setup === identity.setup
  )
}

export function snapshotState(state: GameState): SavedState {
  return {
    ...state,
    tiles: [...state.tiles.entries()],
    // Spread keeps the plain own fields; class getters (special, maxHp) come back with the instance.
    pawns: state.pawns.map((pawn) => ({ ...pawn, kind: pawn.kind })),
  }
}

export function restoreState(saved: unknown): GameState | null {
  try {
    const s = saved as SavedState
    return {
      ...s,
      tiles: new Map(s.tiles),
      pawns: s.pawns.map((pawn) =>
        Object.assign(new PAWN_CLASSES[pawn.kind](pawn.id, pawn.q, pawn.r, pawn.side), pawn),
      ),
    }
  } catch {
    // Not a battle this client can read: start a fresh one instead.
    return null
  }
}
