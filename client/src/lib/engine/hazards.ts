import { hexDist, type Axial } from './hex.ts'
import { SeededRandom } from './random.ts'
import type { Biome } from './biomes/index.ts'
import type { BattleImpact } from './combat.ts'
import type { BattleEffect, GameState } from './engine.ts'
import type { Pawn } from './pawns/index.ts'

// Round-boundary environment hazards: scheduled when a round starts, resolved
// when it ends. They have no striker and take no turn, so they stay engine rules.
// New environment events (collapsing tiles, ...) join this union.
export type Hazard = { kind: 'hellfire'; centers: Axial[] } | { kind: 'sandstorm' }

// While a sandstorm blows, every pawn starts the round with this much energy.
export const STORM_ENERGY = 2

const inBlast = (centers: readonly Axial[], at: Axial): boolean =>
  centers.some((center) => hexDist(center, at) <= 1)

// Unavoidable damage the scheduled hazards deal at this position at round end.
export function hazardDamage(hazards: readonly Hazard[], at: Axial): number {
  return hazards.some((hazard) =>
    hazard.kind === 'hellfire' ? inBlast(hazard.centers, at) : false,
  )
    ? 1
    : 0
}

// Hellfire blast centers, for the board's warning markers.
export function hellfireCenters(hazards: readonly Hazard[]): Axial[] {
  return hazards.flatMap((hazard) => (hazard.kind === 'hellfire' ? hazard.centers : []))
}

export function cloneHazards(hazards: readonly Hazard[]): Hazard[] {
  return hazards.map((hazard) =>
    hazard.kind === 'hellfire'
      ? { ...hazard, centers: hazard.centers.map(({ q, r }) => ({ q, r })) }
      : { ...hazard },
  )
}

type Schedule = (state: GameState) => Pick<GameState, 'hazards' | 'randomState'>

// Each biome schedules its own hazards; battles in the others run hazard-free.
const SCHEDULERS: Partial<Record<Biome, Schedule>> = {
  hell: scheduleHellfire,
  desert: scheduleSandstorm,
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

// Every third round a sandstorm covers the whole desert: no damage, but every
// pawn starts the round short of energy. It resolves at round end as a no-op.
function scheduleSandstorm(state: GameState): Pick<GameState, 'hazards' | 'randomState'> {
  return {
    hazards: state.round % 3 ? [] : [{ kind: 'sandstorm' }],
    randomState: state.randomState,
  }
}

// Applies the scheduled hazards at round end: mutates the hp of every pawn they
// cover and returns the effect recording them, null when none is scheduled.
export function applyHazards(hazards: readonly Hazard[], pawns: Pawn[]): BattleEffect | null {
  const centers = hellfireCenters(hazards)
  if (!centers.length) return null
  const impacts: BattleImpact[] = pawns
    .filter((pawn) => inBlast(centers, pawn))
    .map((pawn) => {
      pawn.hp--
      return { q: pawn.q, r: pawn.r, damage: 1 }
    })
  return { kind: 'hellfire', from: centers[0], to: centers[0], centers, impacts }
}
