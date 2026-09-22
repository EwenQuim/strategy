import { hexDist, key } from './hex.ts'
import type { Pawn, Side } from './pawns.ts'
import type {
  Action,
  BattleEffect,
  BattleFrame,
  BattleSetup,
  GameState,
  Transition,
} from './types.ts'
import { SeededRandom } from './random.ts'
import { prepareBattle } from './setup.ts'
import {
  canAttack,
  movementDestinations,
  canUseSpecial,
  chargeDestinations,
  jumpDestinations,
  performJump,
  specialTargets,
  performAttack,
  performRally,
  performSpecial,
} from './combat.ts'

function winnerFrom(pawns: Pawn[]): Side | null {
  if (!pawns.some((p) => p.kind === 'king' && p.side === 'enemy')) return 'player'
  if (!pawns.some((p) => p.kind === 'king' && p.side === 'player')) return 'enemy'
  return null
}

function finishTurn(pawn: Pawn, log: string[]): boolean {
  const previousEscape = pawn.escapeChance
  pawn.endTurn()
  const gained = pawn.escapeChance - previousEscape
  if (gained <= 0) return false
  log.push(
    (pawn.side === 'player' ? 'Your ' : 'Enemy ') +
      pawn.kind +
      ' #' +
      pawn.id +
      ' ends turn: +' +
      gained +
      '% escape (' +
      pawn.escapeChance +
      '% total).',
  )
  return true
}

function advanceTurn(state: GameState): GameState {
  const { pawns } = state
  const log = [...state.log]
  let { order, round, logCount } = state
  let active = state.active + 1
  while (true) {
    if (active >= order.length) {
      round++
      order = order.filter((id) => pawns.some((p) => p.id === id))
      for (const pawn of pawns) {
        pawn.energy = pawn.maxEnergy
        pawn.escapeChance = 0
        pawn.specialUsed = false
      }
      active = 0
      log.push('Round ' + round + '. Energy restored; escape chances reset.')
      logCount++
    }
    const next = pawns.find((p) => p.id === order[active])
    if (next) {
      next.protectingId = null
      break
    }
    active++
  }
  return {
    ...state,
    order,
    active,
    round,
    log: log.slice(-40),
    logCount,
  }
}

export function activePawn(state: GameState): Pawn | undefined {
  return state.pawns.find((p) => p.id === state.order[state.active])
}

export function initialState(seed: string, setup?: BattleSetup): GameState {
  return advanceTurn({
    ...prepareBattle(seed, setup),
    active: -1,
    round: 1,
    phase: 'move',
    chargeDestination: null,
    winner: null,
    log: ['The battle begins. Protect your crown.'],
    logCount: 1,
  })
}

export function transition(state: GameState, action: Action): Transition {
  const frames: BattleFrame[] = []
  return { state: reduce(state, action, (frame) => frames.push(frame)), frames }
}

export function reducer(state: GameState, action: Action): GameState {
  return reduce(state, action)
}

export function targetingTiles(state: GameState): Set<string> {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return new Set()
  if (state.phase === 'special' && pawn.kind === 'ninja') {
    return new Set(
      jumpDestinations(state.tiles, state.pawns, pawn).map((tile) => key(tile.q, tile.r)),
    )
  }
  if (state.phase === 'special' && pawn.kind === 'swordsman') {
    return new Set(chargeDestinations(state.tiles, state.pawns, pawn).keys())
  }
  const targets =
    state.phase === 'attack'
      ? state.pawns.filter((target) => canAttack(pawn, target))
      : state.phase === 'special' || state.phase === 'charge'
        ? specialTargets(state.pawns, pawn, state.chargeDestination ?? pawn)
        : []
  return new Set(targets.map((target) => key(target.q, target.r)))
}

type ActionResult = {
  pawns: Pawn[]
  actor: Pawn
  log: string[]
  randomState: number
  effect: BattleEffect | null
}

function executeAction(state: GameState, action: Action): ActionResult | null {
  const pawns = state.pawns.map((pawn) => pawn.clone())
  const actor = pawns.find((pawn) => pawn.id === state.order[state.active])!
  const log: string[] = []
  const random = new SeededRandom(state.randomState)
  const from = { q: actor.q, r: actor.r }
  let effect: BattleEffect | null = null

  switch (action.type) {
    case 'act':
      if (action.action !== 'special' || !performRally(pawns, actor, log)) return null
      effect = { kind: 'rally', from, to: from }
      break
    case 'move': {
      if (state.phase !== 'move' || actor.energy <= 0) return null
      const energyCost = movementDestinations(state.tiles, pawns, actor).get(
        key(action.q, action.r),
      )
      if (!energyCost) return null
      actor.q = action.q
      actor.r = action.r
      actor.energy -= energyCost
      effect = { kind: 'move', from, to: { q: actor.q, r: actor.r } }
      break
    }
    case 'attackAt':
    case 'specialAt': {
      if (action.type === 'specialAt' && actor.kind === 'ninja') {
        if (state.phase !== 'special' || !performJump(state.tiles, pawns, actor, action))
          return null
        effect = { kind: 'move', from, to: { q: actor.q, r: actor.r } }
        break
      }
      const expectedPhase =
        action.type === 'attackAt'
          ? 'attack'
          : actor.kind === 'swordsman'
            ? 'charge'
            : 'special'
      if (state.phase !== expectedPhase) return null
      const target = pawns.find((pawn) => pawn.q === action.q && pawn.r === action.r)
      if (!target) return null
      const impacts =
        action.type === 'attackAt'
          ? performAttack(pawns, actor, target, log, random)
          : performSpecial(
              state.tiles,
              pawns,
              actor,
              target,
              log,
              random,
              state.chargeDestination ?? undefined,
            )
      if (!impacts) return null
      let kind: BattleEffect['kind'] = 'attack'
      if (action.type === 'specialAt') {
        if (actor.kind === 'magician') kind = 'fireball'
        if (actor.kind === 'bulwark') kind = 'protect'
      }
      effect = { kind, from, to: { q: target.q, r: target.r }, impacts }
      break
    }
    case 'endTurn':
      break
    default:
      return null
  }
  return { pawns, actor, log, randomState: random.state, effect }
}

function clearBrokenProtection(pawns: Pawn[]): void {
  for (const protector of pawns) {
    if (protector.protectingId === null) continue
    const ally = pawns.find((pawn) => pawn.id === protector.protectingId)
    if (!ally || hexDist(protector, ally) !== 1) protector.protectingId = null
  }
}

function captureFrame(state: GameState, effect: BattleEffect): BattleFrame {
  return {
    state: {
      ...state,
      pawns: state.pawns.map((pawn) => pawn.clone()),
      order: [...state.order],
      log: [...state.log],
      winner: null,
      phase: 'move',
    },
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

  switch (action.type) {
    case 'cancelTargeting':
      return state.phase === 'move'
        ? state
        : { ...state, phase: 'move', chargeDestination: null }
    case 'act':
      if (state.phase !== 'move' || pawn.energy <= 0) return state
      if (action.action === 'attack') return { ...state, phase: 'attack' }
      if (action.action === 'special' && pawn.kind !== 'king')
        return canUseSpecial(pawn) ? { ...state, phase: 'special' } : state
      break
    case 'specialAt':
      if (state.phase === 'special' && pawn.kind === 'swordsman') {
        if (!chargeDestinations(state.tiles, state.pawns, pawn).has(key(action.q, action.r)))
          return state
        return { ...state, phase: 'charge', chargeDestination: { q: action.q, r: action.r } }
      }
      break
  }

  const result = executeAction(state, action)
  if (!result) return state
  const { pawns, actor, log, randomState } = result
  let { effect } = result
  clearBrokenProtection(pawns)
  const winner = winnerFrom(pawns)
  const turnEnded = !winner && (action.type === 'endTurn' || actor.energy === 0)
  if (turnEnded && finishTurn(actor, log) && action.type === 'endTurn') {
    const position = { q: pawn.q, r: pawn.r }
    effect = { kind: 'escape', from: position, to: position }
  }
  const next: GameState = {
    ...state,
    pawns,
    randomState,
    phase: winner ? 'over' : 'move',
    winner,
    chargeDestination: null,
    log: [...state.log, ...log].slice(-40),
    logCount: state.logCount + log.length,
  }
  if (effect) record?.(captureFrame(next, effect))
  if (winner) {
    next.log = [
      ...next.log,
      winner === 'player' ? 'The enemy crown has fallen. Victory!' : 'Your crown has fallen.',
    ].slice(-40)
    next.logCount++
  }
  return turnEnded ? advanceTurn(next) : next
}
