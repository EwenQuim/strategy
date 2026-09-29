import { BIOMES } from './engine/biomes/index.ts'
import { PAWN_CLASSES, type Pawn, type PawnKind } from './engine/pawns/index.ts'
import type { Axial, Terrain, Tile, TileFeature } from './engine/hex.ts'
import type { BattleSetup, GameState } from './engine/index.ts'
import type { BotDifficulty } from './engine/ai.ts'
import type { GameMode } from './game-mode.ts'

const PHASES = new Set(['move', 'attack', 'special', 'charge', 'over'])
const FEATURES = new Set(['watchtower', 'spring', 'rune'])

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export type BattleIdentity = {
  mode: GameMode
  seed: string
  difficulty: BotDifficulty
  setup: string
}

export function battleIdentity(
  mode: GameMode,
  seed: string,
  difficulty: BotDifficulty,
  setup: BattleSetup | undefined,
): BattleIdentity {
  return { mode, seed, difficulty, setup: JSON.stringify(setup ?? null) }
}

export function sameBattle(saved: unknown, identity: BattleIdentity): boolean {
  if (typeof saved !== 'object' || saved === null) return false
  const { mode, seed, difficulty, setup } = saved as Record<string, unknown>
  return (
    mode === identity.mode &&
    seed === identity.seed &&
    difficulty === identity.difficulty &&
    setup === identity.setup
  )
}

export function snapshotState(state: GameState): Record<string, unknown> {
  return {
    ...state,
    tiles: [...state.tiles.entries()],
    // Spread keeps the plain own fields; class getters (special, maxHp) come back with the instance.
    pawns: state.pawns.map((pawn) => ({ ...pawn, kind: pawn.kind })),
  }
}

function restoreTile(saved: unknown): Tile | null {
  if (typeof saved !== 'object' || saved === null) return null
  const { q, r, terrain, feature } = saved as Record<string, unknown>
  if (!isFiniteNumber(q) || !isFiniteNumber(r) || typeof terrain !== 'string') return null
  if (feature !== undefined && (typeof feature !== 'string' || !FEATURES.has(feature)))
    return null
  return { q, r, terrain: terrain as Terrain, feature: feature as TileFeature | undefined }
}

function restorePawn(saved: unknown): Pawn | null {
  if (typeof saved !== 'object' || saved === null) return null
  const { kind, id, q, r, side } = saved as Record<string, unknown>
  if (typeof kind !== 'string' || !Object.hasOwn(PAWN_CLASSES, kind)) return null
  if (!isFiniteNumber(id) || !isFiniteNumber(q) || !isFiniteNumber(r)) return null
  if (side !== 'player' && side !== 'enemy') return null
  const pawn = new PAWN_CLASSES[kind as PawnKind](id, q, r, side)
  return Object.assign(pawn, saved)
}

const restoreAxial = (saved: unknown): Axial | null => {
  if (typeof saved !== 'object' || saved === null) return null
  const { q, r } = saved as Record<string, unknown>
  return isFiniteNumber(q) && isFiniteNumber(r) ? { q, r } : null
}

export function restoreState(saved: unknown): GameState | null {
  if (typeof saved !== 'object' || saved === null) return null
  const s = saved as Record<string, unknown>
  if (
    typeof s.seed !== 'string' ||
    typeof s.biome !== 'string' ||
    !Object.hasOwn(BIOMES, s.biome) ||
    typeof s.phase !== 'string' ||
    !PHASES.has(s.phase) ||
    !isFiniteNumber(s.randomState) ||
    !isFiniteNumber(s.active) ||
    !isFiniteNumber(s.round) ||
    !isFiniteNumber(s.lastClashRound) ||
    !isFiniteNumber(s.logCount) ||
    (s.winner !== null &&
      s.winner !== 'player' &&
      s.winner !== 'enemy' &&
      s.winner !== 'draw') ||
    !Array.isArray(s.tiles) ||
    !Array.isArray(s.pawns) ||
    !Array.isArray(s.order) ||
    !s.order.every(isFiniteNumber) ||
    !Array.isArray(s.hellfire) ||
    !Array.isArray(s.log) ||
    !s.log.every((entry) => typeof entry === 'string') ||
    (s.chargeDestination !== null && !restoreAxial(s.chargeDestination))
  )
    return null
  const tiles = new Map<string, Tile>()
  for (const entry of s.tiles) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') return null
    const tile = restoreTile(entry[1])
    if (!tile) return null
    tiles.set(entry[0], tile)
  }
  const pawns: Pawn[] = []
  for (const savedPawn of s.pawns) {
    const pawn = restorePawn(savedPawn)
    if (!pawn) return null
    pawns.push(pawn)
  }
  const hellfire: Axial[] = []
  for (const savedAxial of s.hellfire) {
    const axial = restoreAxial(savedAxial)
    if (!axial) return null
    hellfire.push(axial)
  }
  return {
    seed: s.seed,
    setup: s.setup as BattleSetup | undefined,
    biome: s.biome as GameState['biome'],
    randomState: s.randomState,
    tiles,
    hellfire,
    pawns,
    order: s.order as number[],
    active: s.active,
    round: s.round,
    lastClashRound: s.lastClashRound,
    phase: s.phase as GameState['phase'],
    chargeDestination: s.chargeDestination as Axial | null,
    winner: s.winner as GameState['winner'],
    log: s.log as string[],
    logCount: s.logCount,
  }
}
