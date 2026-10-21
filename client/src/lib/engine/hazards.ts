import { hexDist, type Axial } from './hex.ts'
import { SeededRandom } from './random.ts'
import type { Biome } from './biomes/index.ts'
import type { BattleImpact } from './combat.ts'
import type { BattleEffect, GameState } from './engine.ts'
import type { Pawn } from './pawns/index.ts'

// Round-boundary environment hazards: scheduled when a round starts, resolved
// when it ends. They have no striker and take no turn, so they stay engine rules.
// New environment events (collapsing tiles, ...) join this union.
export type Hazard = { kind: 'hellfire' | 'flood'; centers: Axial[] }

// The flood spreads one ring around the lakes every this many rounds.
const FLOOD_RING_ROUNDS = 3

const inBlast = (centers: readonly Axial[], at: Axial): boolean =>
  centers.some((center) => hexDist(center, at) <= 1)

// Unavoidable damage the scheduled hazards deal at this position at round end.
export function hazardDamage(hazards: readonly Hazard[], at: Axial): number {
  return hazards.some((hazard) =>
    hazard.kind === 'hellfire'
      ? inBlast(hazard.centers, at)
      : hazard.centers.some((c) => hexDist(c, at) === 0),
  )
    ? 1
    : 0
}

// Hellfire blast centers, for the board's warning markers.
export function hellfireCenters(hazards: readonly Hazard[]): Axial[] {
  return hazards.flatMap((hazard) => (hazard.kind === 'hellfire' ? hazard.centers : []))
}

export function cloneHazards(hazards: readonly Hazard[]): Hazard[] {
  return hazards.map((hazard) => ({
    ...hazard,
    centers: hazard.centers.map(({ q, r }) => ({ q, r })),
  }))
}

type Schedule = (state: GameState) => Pick<GameState, 'hazards' | 'randomState'>

// Each biome schedules its own hazards; battles in the others run hazard-free.
const SCHEDULERS: Partial<Record<Biome, Schedule>> = {
  hell: scheduleHellfire,
  verdant: scheduleFlood,
}

export function scheduleHazards(state: GameState): Pick<GameState, 'hazards' | 'randomState'> {
  return SCHEDULERS[state.biome]?.(state) ?? { hazards: [], randomState: state.randomState }
}

function scheduleHellfire(state: GameState): Pick<GameState, 'hazards' | 'randomState'> {
  const random = new SeededRandom(state.randomState)
  const count = state.setup?.map !== undefined ? (state.setup.hellfireCount ?? 2) : 2
  const sides = count === 1 ? [state.round % 2 ? 'player' : 'enemy'] : ['player', 'enemy']
  const centers = sides.flatMap((side) => {
    const army = state.pawns.filter((pawn) => pawn.side === side)
    if (!army.length) return []
    const { q, r } = army[Math.floor(random.next() * army.length)]
    return [{ q, r }]
  })
  return {
    hazards: centers.length ? [{ kind: 'hellfire', centers }] : [],
    randomState: random.state,
  }
}

// The verdant flood rises one ring around every lake each FLOOD_RING_ROUNDS rounds.
// Anyone standing in the flooded ring when the round ends takes a hit.
function scheduleFlood(state: GameState): Pick<GameState, 'hazards' | 'randomState'> {
  const radius = Math.floor(state.round / FLOOD_RING_ROUNDS)
  const lakes = [...state.tiles.values()].filter((tile) => tile.terrain === 'lake')
  if (!radius || !lakes.length) return { hazards: [], randomState: state.randomState }
  const centers = [...state.tiles.values()]
    .filter(
      (tile) => tile.terrain !== 'lake' && lakes.some((lake) => hexDist(lake, tile) <= radius),
    )
    .map(({ q, r }) => ({ q, r }))
  return {
    hazards: centers.length ? [{ kind: 'flood', centers }] : [],
    randomState: state.randomState,
  }
}

// Applies the scheduled hazards at round end: mutates the hp of every pawn they
// cover and returns the effect recording them, null when none is scheduled.
export function applyHazards(hazards: readonly Hazard[], pawns: Pawn[]): BattleEffect | null {
  const centers = hellfireCenters(hazards)
  const flood = hazards.find((hazard) => hazard.kind === 'flood')
  if (!centers.length && !flood) return null
  const impacts: BattleImpact[] = pawns
    .filter((pawn) => hazardDamage(hazards, pawn))
    .map((pawn) => {
      pawn.hp--
      return { q: pawn.q, r: pawn.r, damage: 1 }
    })
  const from = centers[0] ?? flood!.centers[0]!
  return {
    kind: flood && !centers.length ? 'flood' : 'hellfire',
    from,
    to: from,
    ...(centers.length ? { centers } : {}),
    impacts,
  }
}
