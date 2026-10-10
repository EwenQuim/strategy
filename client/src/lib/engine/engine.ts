import { key, type Axial, type Tile } from './hex.ts'
import { PAWN_CLASSES } from './pawns/index.ts'
import type { Pawn, PawnSpawner, Side, SpecialResult, Unit } from './pawns/index.ts'
import { SeededRandom } from './random.ts'
import { prepareBattle, type BattleSetup } from './setup.ts'
import type { Biome } from './biomes/index.ts'
import {
  advanceTurn,
  captureFrame,
  clearFallenProtection,
  endBattle,
  finishTurn,
  winnerFrom,
} from './turn.ts'
import { markHellfire } from './hellfire.ts'
import {
  walkingPaths,
  routePath,
  enterTiles,
  canUseSpecial,
  performAttack,
  type BattleImpact,
} from './combat.ts'

export type Action =
  | { type: 'move'; q: number; r: number }
  | { type: 'attack'; q: number; r: number }
  | { type: 'special'; target?: Axial; destination?: Axial }
  | { type: 'endTurn' }
  | { type: 'restart' }

// A hellfire blow has no striker.
type Blow = {
  by?: Unit & { id: number; hp: number; special: boolean; watchtower: boolean }
  fallen: Unit[]
}

export type GameState = {
  seed: string
  readonly setup?: BattleSetup
  biome: Biome
  randomState: number
  tiles: Map<string, Tile>
  hellfire: Axial[]
  pawns: Pawn[]
  order: number[]
  active: number
  round: number
  lastClashRound: number
  winner: Side | 'draw' | null
  log: string[]
  logCount: number
  blows: Blow[]
  escapes: Unit[]
}

export type BattleEffect = {
  kind:
    | 'move'
    | 'attack'
    | 'rally'
    | 'fireball'
    | 'bomb'
    | 'escape'
    | 'protect'
    | 'hellfire'
    | 'raise'
  from: Axial
  to: Axial
  centers?: Axial[]
  impacts?: BattleImpact[]
}

export type BattleFrame = { state: GameState; effect: BattleEffect | null }

export const isImpactFrame = (frame: BattleFrame): boolean =>
  frame.effect?.kind === 'bomb' ||
  frame.effect?.kind === 'hellfire' ||
  !!frame.effect?.impacts?.length

export type Transition = { state: GameState; frames: BattleFrame[] }

export function activePawn(state: GameState): Pawn | undefined {
  return state.pawns.find((p) => p.id === state.order[state.active])
}

export function initialState(
  seed: string,
  setup?: BattleSetup,
  startingSide?: Side,
): GameState {
  const battle = prepareBattle(seed, setup, startingSide)
  for (const pawn of battle.pawns) {
    if (battle.tiles.get(key(pawn.q, pawn.r))?.feature === 'spring') pawn.springSince = 1
  }
  const state: GameState = {
    ...battle,
    hellfire: [],
    active: -1,
    round: 1,
    lastClashRound: 0,
    winner: null,
    log: ['The battle begins. Protect your crown.'],
    logCount: 1,
    blows: [],
    escapes: [],
  }
  return advanceTurn({ ...state, ...markHellfire(state) })
}

export function transition(state: GameState, action: Action): Transition {
  const frames: BattleFrame[] = []
  return { state: reduce(state, action, (frame) => frames.push(frame)), frames }
}

export function reducer(state: GameState, action: Action): GameState {
  return reduce(state, action)
}

type ActionResult = {
  tiles: Map<string, Tile>
  pawns: Pawn[]
  order: number[]
  actor: Pawn
  fallen: Pawn[]
  spawned: Pawn[]
  log: string[]
  randomState: number
  effect: BattleEffect | null
}

const effectFrom = ({ kind, ...rest }: SpecialResult, from: Axial): BattleEffect => ({
  kind,
  from,
  ...rest,
})

// Battle-spawned pawns continue the id sequence of the armies.
const nextPawnId = (pawns: readonly Pawn[]) => Math.max(0, ...pawns.map((p) => p.id)) + 1

// Picking up a rune or waking a beast changes the map, so other maps are shared between states.
const mutableMap = new WeakMap<Map<string, Tile>, boolean>()
function mapIsMutable(tiles: Map<string, Tile>): boolean {
  let mutable = mutableMap.get(tiles)
  if (mutable === undefined) {
    mutable = [...tiles.values()].some(
      (tile) => tile.feature === 'rune' || tile.feature === 'den',
    )
    mutableMap.set(tiles, mutable)
  }
  return mutable
}

function executeAction(state: GameState, action: Action): ActionResult | null {
  const tiles = mapIsMutable(state.tiles) ? new Map(state.tiles) : state.tiles
  const participants = state.pawns.map((pawn) => pawn.clone())
  const pawns = [...participants]
  const order = [...state.order]
  const spawned: Pawn[] = []
  const actor = pawns.find((pawn) => pawn.id === state.order[state.active])!
  const log: string[] = []
  const random = new SeededRandom(state.randomState)
  const from = { q: actor.q, r: actor.r }
  const spawn: PawnSpawner = (kind, side, q, r, options) => {
    if (pawns.some((pawn) => pawn.q === q && pawn.r === r)) return null
    const Unit = PAWN_CLASSES[kind]
    const pawn = new Unit(nextPawnId(pawns), q, r, side, options?.hp, options?.energy)
    pawns.push(pawn)
    order.push(pawn.id)
    spawned.push(pawn)
    return pawn
  }
  const context = {
    pawn: actor,
    tiles,
    pawns,
    round: state.round,
    log,
    random,
    fallen: state.blows.flatMap((blow) => blow.fallen),
    spawn,
  }
  let effect: BattleEffect | null = null

  switch (action.type) {
    case 'move': {
      if (actor.energy <= 0) return null
      const route = walkingPaths(tiles, pawns, actor, undefined, key(action.q, action.r)).get(
        key(action.q, action.r),
      )
      if (!route?.steps) return null
      actor.energy -= actor.moveEnergyCost(route.steps)
      const impacts = enterTiles(tiles, pawns, actor, routePath(route), state.round, log, spawn)
      effect = {
        kind: 'move',
        from,
        to: { q: actor.q, r: actor.r },
        ...(impacts.length ? { impacts } : {}),
      }
      break
    }
    case 'attack': {
      const target = pawns.find((pawn) => pawn.q === action.q && pawn.r === action.r)
      if (!target) return null
      const impacts = performAttack(tiles, pawns, actor, target, log, random)
      if (!impacts) return null
      effect = { kind: 'attack', from, to: { q: target.q, r: target.r }, impacts }
      break
    }
    case 'special': {
      const { special } = actor
      if (
        !canUseSpecial(actor) ||
        special.targeted !== !!action.target ||
        !!special.choosesDestination !== !!action.destination
      )
        return null
      const result = special.perform({
        ...context,
        tile: action.target,
        destination: action.destination,
      })
      if (!result) return null
      effect = effectFrom(result, from)
      break
    }
    case 'endTurn':
      break
    default:
      return null
  }
  return {
    tiles,
    pawns,
    order,
    actor,
    fallen: participants.filter((pawn) => pawn.hp <= 0),
    spawned,
    log,
    randomState: random.state,
    effect,
  }
}

function reduce(
  state: GameState,
  action: Action,
  record?: (frame: BattleFrame) => void,
): GameState {
  if (action.type === 'restart') return initialState(state.seed, state.setup)
  const pawn = activePawn(state)
  if (!pawn || state.winner) return state

  const result = executeAction(state, action)
  if (!result) return state
  const { tiles, pawns, order, actor, fallen, spawned, log, randomState } = result
  let { effect } = result
  clearFallenProtection(pawns)
  const winner = winnerFrom(pawns, actor.side)
  const turnEnded =
    !winner && (action.type === 'endTurn' || actor.energy === 0 || actor.hp <= 0)
  if (turnEnded && actor.hp > 0 && finishTurn(pawns, actor, log) && action.type === 'endTurn') {
    const position = { q: pawn.q, r: pawn.r }
    effect = { kind: 'escape', from: position, to: position }
  }
  const health = (army: Pawn[]) => army.reduce((sum, p) => sum + p.hp, 0)
  const escapes = (result.effect?.impacts ?? []).flatMap((impact) => {
    const dodger =
      impact.damage === 0 && pawns.find((p) => p.q === impact.q && p.r === impact.r)
    return dodger ? [{ kind: dodger.kind, side: dodger.side }] : []
  })
  const blow: Blow = {
    by: {
      id: actor.id,
      kind: actor.kind,
      side: actor.side,
      hp: actor.hp,
      special: action.type === 'special',
      watchtower: state.tiles.get(key(pawn.q, pawn.r))?.feature === 'watchtower',
    },
    fallen: fallen.map(({ kind, side }) => ({ kind, side })),
  }
  const next: GameState = {
    ...state,
    tiles,
    pawns,
    order,
    randomState,
    lastClashRound: health(pawns) < health(state.pawns) ? state.round : state.lastClashRound,
    winner,
    log: log.length ? [...state.log, ...log].slice(-40) : state.log,
    logCount: state.logCount + log.length,
    blows: fallen.length ? [...state.blows, blow] : state.blows,
    escapes: escapes.length ? [...state.escapes, ...escapes] : state.escapes,
  }
  if (effect) record?.(captureFrame(next, effect, fallen))
  for (const arrival of spawned)
    record?.(
      captureFrame(next, {
        kind: 'raise',
        from: { q: arrival.q, r: arrival.r },
        to: { q: arrival.q, r: arrival.r },
      }),
    )
  if (winner) return endBattle(next, winner)
  return turnEnded ? advanceTurn(next, record) : next
}
