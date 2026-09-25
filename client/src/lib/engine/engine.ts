import { key, type Axial, type Tile } from './hex.ts'
import type { Pawn, Side, SpecialResult } from './pawns/index.ts'
import { SeededRandom } from './random.ts'
import { prepareBattle, type BattleSetup } from './setup.ts'
import type { Biome } from './biomes/index.ts'
import {
  advanceTurn,
  captureFrame,
  clearBrokenProtection,
  endBattle,
  finishTurn,
  winnerFrom,
} from './turn.ts'
import { markHellfire } from './hellfire.ts'
import {
  canAttack,
  walkingPaths,
  enterTiles,
  canUseSpecial,
  specialTargets,
  performAttack,
  type BattleImpact,
} from './combat.ts'

type Phase = 'move' | 'attack' | 'special' | 'charge' | 'over'

export type Action =
  | { type: 'move'; q: number; r: number }
  | { type: 'act'; action: 'attack' | 'special' }
  | { type: 'attackAt'; q: number; r: number }
  | { type: 'specialAt'; q: number; r: number }
  | { type: 'cancelTargeting' }
  | { type: 'endTurn' }
  | { type: 'restart' }

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
  phase: Phase
  chargeDestination: Axial | null
  winner: Side | 'draw' | null
  log: string[]
  logCount: number
}

export type BattleEffect = {
  kind: 'move' | 'attack' | 'rally' | 'fireball' | 'bomb' | 'escape' | 'protect' | 'hellfire'
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
    phase: 'move',
    chargeDestination: null,
    winner: null,
    log: ['The battle begins. Protect your crown.'],
    logCount: 1,
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

export function specialTargetingTiles(
  pawn: Pawn,
  tiles: Map<string, Tile>,
  pawns: Pawn[],
): Set<string> {
  return (
    pawn.special.tileTargets?.(pawn, tiles, pawns) ??
    new Set(specialTargets(pawns, pawn).map((target) => key(target.q, target.r)))
  )
}

export function targetingTiles(state: GameState): Set<string> {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return new Set()
  if (state.phase === 'attack')
    return new Set(
      state.pawns
        .filter((target) => canAttack(pawn, target, state.tiles.get(key(pawn.q, pawn.r))))
        .map((target) => key(target.q, target.r)),
    )
  if (state.phase === 'special') return specialTargetingTiles(pawn, state.tiles, state.pawns)
  if (state.phase === 'charge')
    return new Set(
      specialTargets(state.pawns, pawn, state.chargeDestination ?? pawn).map((target) =>
        key(target.q, target.r),
      ),
    )
  return new Set()
}

type ActionResult = {
  tiles: Map<string, Tile>
  pawns: Pawn[]
  actor: Pawn
  log: string[]
  randomState: number
  effect: BattleEffect | null
}

const effectFrom = ({ kind, ...rest }: SpecialResult, from: Axial): BattleEffect => ({
  kind,
  from,
  ...rest,
})

function executeAction(state: GameState, action: Action): ActionResult | null {
  const tiles = new Map(state.tiles)
  const pawns = state.pawns.map((pawn) => pawn.clone())
  const actor = pawns.find((pawn) => pawn.id === state.order[state.active])!
  const log: string[] = []
  const random = new SeededRandom(state.randomState)
  const from = { q: actor.q, r: actor.r }
  const context = {
    pawn: actor,
    tiles,
    pawns,
    round: state.round,
    log,
    random,
  }
  let effect: BattleEffect | null = null

  switch (action.type) {
    case 'act': {
      if (action.action !== 'special') return null
      const result = actor.special.perform(context)
      if (!result) return null
      effect = effectFrom(result, from)
      break
    }
    case 'move': {
      if (state.phase !== 'move' || actor.energy <= 0) return null
      const route = walkingPaths(tiles, pawns, actor).get(key(action.q, action.r))
      if (!route?.path.length) return null
      actor.energy -= actor.moveEnergyCost(route.path.length)
      const impacts = enterTiles(tiles, pawns, actor, route.path, state.round, log)
      effect = {
        kind: 'move',
        from,
        to: { q: actor.q, r: actor.r },
        ...(impacts.length ? { impacts } : {}),
      }
      break
    }
    case 'attackAt': {
      if (state.phase !== 'attack') return null
      const target = pawns.find((pawn) => pawn.q === action.q && pawn.r === action.r)
      if (!target) return null
      const impacts = performAttack(tiles, pawns, actor, target, log, random)
      if (!impacts) return null
      effect = { kind: 'attack', from, to: { q: target.q, r: target.r }, impacts }
      break
    }
    case 'specialAt': {
      if (state.phase !== 'special' && state.phase !== 'charge') return null
      const result = actor.special.perform({
        ...context,
        tile: { q: action.q, r: action.r },
        destination: state.chargeDestination ?? undefined,
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
  return { tiles, pawns, actor, log, randomState: random.state, effect }
}

function reduce(
  state: GameState,
  action: Action,
  record?: (frame: BattleFrame) => void,
): GameState {
  if (action.type === 'restart') return initialState(state.seed, state.setup)
  const pawn = activePawn(state)
  if (!pawn || state.winner) return state

  switch (action.type) {
    case 'cancelTargeting':
      return state.phase === 'move'
        ? state
        : { ...state, phase: 'move', chargeDestination: null }
    case 'act':
      if (state.phase !== 'move' || pawn.energy <= 0) return state
      if (action.action === 'attack') return { ...state, phase: 'attack' }
      if (action.action === 'special' && pawn.special.targeted)
        return canUseSpecial(pawn) ? { ...state, phase: 'special' } : state
      break
    case 'specialAt':
      if (state.phase === 'special' && pawn.special.choosesDestination) {
        if (
          !pawn.special
            .tileTargets?.(pawn, state.tiles, state.pawns)
            .has(key(action.q, action.r))
        )
          return state
        return { ...state, phase: 'charge', chargeDestination: { q: action.q, r: action.r } }
      }
      break
  }

  const result = executeAction(state, action)
  if (!result) return state
  const { tiles, pawns, actor, log, randomState } = result
  let { effect } = result
  clearBrokenProtection(pawns)
  const winner = winnerFrom(pawns, actor.side)
  const turnEnded =
    !winner && (action.type === 'endTurn' || actor.energy === 0 || actor.hp <= 0)
  if (turnEnded && actor.hp > 0 && finishTurn(actor, log) && action.type === 'endTurn') {
    const position = { q: pawn.q, r: pawn.r }
    effect = { kind: 'escape', from: position, to: position }
  }
  const next: GameState = {
    ...state,
    tiles,
    pawns,
    randomState,
    phase: winner ? 'over' : 'move',
    winner,
    chargeDestination: null,
    log: [...state.log, ...log].slice(-40),
    logCount: state.logCount + log.length,
  }
  if (effect) record?.(captureFrame(next, effect, actor))
  if (winner) return endBattle(next, winner)
  return turnEnded ? advanceTurn(next, record) : next
}
