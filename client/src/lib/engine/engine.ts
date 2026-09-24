import { key } from './hex.ts'
import type { Pawn, Side, SpecialResult } from './pawns/index.ts'
import type {
  Action,
  Axial,
  BattleEffect,
  BattleFrame,
  BattleSetup,
  GameState,
  Transition,
  Tile,
} from './types.ts'
import { SeededRandom } from './random.ts'
import { prepareBattle } from './setup.ts'
import { inHellfire, markHellfire } from './hellfire.ts'
import {
  canAttack,
  walkingPaths,
  enterTiles,
  canUseSpecial,
  specialTargets,
  performAttack,
  label,
} from './combat.ts'

function winnerFrom(pawns: Pawn[], actingSide: Side): Side | null {
  if (!pawns.some((p) => p.kind === 'king' && p.side === actingSide))
    return actingSide === 'player' ? 'enemy' : 'player'
  if (!pawns.some((p) => p.kind === 'king' && p.side === 'enemy')) return 'player'
  if (!pawns.some((p) => p.kind === 'king' && p.side === 'player')) return 'enemy'
  return null
}

function finishTurn(pawn: Pawn, log: string[]): boolean {
  const previousEscape = pawn.escapeChance
  pawn.endTurn()
  const gained = pawn.escapeChance - previousEscape
  if (gained <= 0) return false
  log.push(`${label(pawn)} ends turn: +${gained}% escape (${pawn.escapeChance}% total).`)
  return true
}

function endBattle(state: GameState, winner: NonNullable<GameState['winner']>): GameState {
  const message =
    winner === 'draw'
      ? 'Both crowns have fallen. Draw.'
      : winner === 'player'
        ? 'The enemy crown has fallen. Victory!'
        : 'Your crown has fallen.'
  return {
    ...state,
    winner,
    phase: 'over',
    log: [...state.log, message].slice(-40),
    logCount: state.logCount + 1,
  }
}

function advanceTurn(state: GameState, record?: (frame: BattleFrame) => void): GameState {
  let { pawns, hellfire, randomState } = state
  const log = [...state.log]
  let { order, round, logCount } = state
  let active = state.active + 1
  while (true) {
    if (active >= order.length) {
      if (hellfire.length) {
        const impacts = pawns
          .filter((pawn) => inHellfire(hellfire, pawn))
          .map((pawn) => {
            pawn.hp--
            log.push(label(pawn) + ' takes 1 Hellfire damage.')
            logCount++
            if (pawn.hp <= 0) {
              log.push(label(pawn) + ' has fallen.')
              logCount++
            }
            return { q: pawn.q, r: pawn.r, damage: 1 }
          })
        const burned = { ...state, pawns, log, logCount }
        record?.(
          captureFrame(burned, {
            kind: 'hellfire',
            from: hellfire[0],
            to: hellfire[0],
            centers: hellfire,
            impacts,
          }),
        )
        pawns = pawns.filter((pawn) => pawn.hp > 0)
        clearBrokenProtection(pawns)
        const winner = pawns.some((pawn) => pawn.kind === 'king')
          ? winnerFrom(pawns, 'player')
          : 'draw'
        if (winner) return endBattle({ ...burned, pawns, hellfire: [] }, winner)
      }
      round++
      order = order.filter((id) => pawns.some((p) => p.id === id))
      for (const pawn of pawns) {
        pawn.bonusEnergy = 0
        pawn.energy = pawn.maxEnergy
        pawn.escapeChance = 0
        pawn.specialUsed = false
      }
      ;({ hellfire, randomState } = markHellfire({ ...state, pawns, round, randomState }))
      active = 0
      log.push('Round ' + round + '. Energy restored; escape chances reset.')
      logCount++
    }
    const next = pawns.find((p) => p.id === order[active])
    if (next) {
      next.protectingId = null
      if (
        next.springSince !== null &&
        round > next.springSince &&
        state.tiles.get(key(next.q, next.r))?.feature === 'spring' &&
        next.hp < next.maxHp
      ) {
        next.hp++
        log.push(label(next) + ' recovers 1 health at the spring.')
        logCount++
      }
      break
    }
    active++
  }
  return {
    ...state,
    pawns,
    hellfire,
    randomState,
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
  const battle = prepareBattle(seed, setup)
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

export function targetingTiles(state: GameState): Set<string> {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return new Set()
  if (state.phase === 'attack')
    return new Set(
      state.pawns
        .filter((target) => canAttack(pawn, target, state.tiles.get(key(pawn.q, pawn.r))))
        .map((target) => key(target.q, target.r)),
    )
  if (state.phase === 'special')
    return (
      pawn.special.tileTargets?.(pawn, state.tiles, state.pawns) ??
      new Set(specialTargets(state.pawns, pawn).map((target) => key(target.q, target.r)))
    )
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

function clearBrokenProtection(pawns: Pawn[]): void {
  for (const protector of pawns) {
    if (protector.protectingId === null) continue
    const ally = pawns.find((pawn) => pawn.id === protector.protectingId)
    if (!ally || !protector.special.targets(protector, [ally]).length)
      protector.protectingId = null
  }
}

function captureFrame(state: GameState, effect: BattleEffect, actor?: Pawn): BattleFrame {
  return {
    state: {
      ...state,
      tiles: new Map([...state.tiles].map(([k, tile]) => [k, { ...tile }])),
      hellfire: state.hellfire.map((center) => ({ ...center })),
      pawns: (actor && actor.hp <= 0 ? [...state.pawns, actor] : state.pawns).map((pawn) =>
        pawn.clone(),
      ),
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
