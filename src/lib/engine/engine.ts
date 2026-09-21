import {
  MAP_WIDTH,
  MAP_HEIGHT,
  distFrom,
  hexDist,
  hexOf,
  key,
  makeMap,
  neighbors,
  reachable,
} from './hex.ts'
import { King, Swordsman, Archer, Magician, type Pawn, type Side } from './pawns.ts'
import type {
  Action,
  Axial,
  BattleEffect,
  BattleFrame,
  GameState,
  Tile,
  Transition,
} from './types.ts'
import { nearestTarget, type EnemyStrategy } from './strategies.ts'
import { SeededRandom, seedState } from './random.ts'

import {
  canAttack,
  canUseSpecial,
  chargeDestinations,
  specialTargets,
  performAttack,
  performSpecial,
} from './combat.ts'

function shuffle(ids: number[], random: SeededRandom): number[] {
  const out = [...ids]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

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

type RecordFrame = (frame: BattleFrame) => void

function enemyAct(
  pawns: Pawn[],
  pawn: Pawn,
  tiles: Map<string, Tile>,
  log: string[],
  strategy: EnemyStrategy,
  random: SeededRandom,
  recordStep?: (effect: BattleEffect) => void,
) {
  while (pawn.energy > 0 && !winnerFrom(pawns)) {
    const from = { q: pawn.q, r: pawn.r }
    const record = (kind: BattleEffect['kind'], to: Axial = pawn) =>
      recordStep?.({ kind, from, to: { q: to.q, r: to.r } })
    const foes = pawns.filter((p) => p.side !== pawn.side)
    const specials = specialTargets(pawns, pawn)
    const special =
      pawn.kind === 'king'
        ? specials.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0]
        : strategy.chooseTarget(
            pawn,
            specials.filter((p) =>
              pawn.kind === 'archer'
                ? p.escapeChance > 0
                : pawn.kind === 'magician' && foes.filter((f) => hexDist(p, f) <= 1).length > 1,
            ),
          )
    if (special && performSpecial(tiles, pawns, pawn, special, log, random)) {
      record(
        pawn.kind === 'king' ? 'rally' : pawn.kind === 'magician' ? 'fireball' : 'attack',
        special,
      )
      continue
    }

    const target = strategy.chooseTarget(
      pawn,
      foes.filter((p) => canAttack(pawn, p)),
    )
    if (target && performAttack(pawns, pawn, target, log, random)) {
      record('attack', target)
      continue
    }

    const charges = chargeDestinations(tiles, pawns, pawn)
    const chargeTiles = [...charges.keys()].map((k) => tiles.get(k)!)
    const chargeTarget = strategy.chooseTarget(
      pawn,
      foes.filter((p) => chargeTiles.some((tile) => canAttack(pawn, p, tile))),
    )
    if (chargeTarget) {
      const destination = chargeTiles.find((tile) => canAttack(pawn, chargeTarget, tile))!
      if (performSpecial(tiles, pawns, pawn, chargeTarget, log, random, destination)) {
        record('attack', chargeTarget)
        continue
      }
    }

    const occupied = new Set(pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)))
    const firingTiles = [...tiles.values()].filter(
      (tile) =>
        tile.terrain !== 'mountain' &&
        !occupied.has(key(tile.q, tile.r)) &&
        foes.some((foe) => canAttack(pawn, foe, tile)),
    )
    const dist = distFrom(tiles, firingTiles)
    const here = dist.get(key(pawn.q, pawn.r)) ?? Infinity
    const step = neighbors(pawn.q, pawn.r)
      .filter((n) => !occupied.has(key(n.q, n.r)) && (dist.get(key(n.q, n.r)) ?? Infinity) < here)
      .sort((a, b) => dist.get(key(a.q, a.r))! - dist.get(key(b.q, b.r))!)[0]
    if (step) {
      pawn.q = step.q
      pawn.r = step.r
      pawn.energy--
      log.push('Enemy ' + pawn.kind + ' #' + pawn.id + ' moves 1 tile.')
      record('move')
      continue
    }
    break
  }
  if (!winnerFrom(pawns) && finishTurn(pawn, log)) {
    const position = { q: pawn.q, r: pawn.r }
    recordStep?.({ kind: 'escape', from: position, to: position })
  }
}

function advance(prev: GameState, strategy: EnemyStrategy, record?: RecordFrame): GameState {
  const random = new SeededRandom(prev.randomState)
  const pawns = prev.pawns.map((p) => p.clone())
  const log: string[] = []
  let order = prev.order
  let active = prev.active + 1
  let round = prev.round
  const capture = (effect: BattleEffect | null) =>
    record?.({
      state: {
        ...prev,
        pawns: pawns.map((p) => p.clone()),
        order: [...order],
        active,
        round,
        randomState: random.state,
        phase: 'move',
        chargeDestination: null,
        winner: null,
        log: [...prev.log, ...log].slice(-40),
        logCount: prev.logCount + log.length,
      },
      effect,
    })

  while (true) {
    const winner = winnerFrom(pawns)
    if (winner) {
      log.push(
        winner === 'player' ? 'The enemy crown has fallen. Victory!' : 'Your crown has fallen.',
      )
      return {
        ...prev,
        pawns,
        order,
        active,
        round,
        randomState: random.state,
        phase: 'over',
        chargeDestination: null,
        winner,
        log: [...prev.log, ...log].slice(-40),
        logCount: prev.logCount + log.length,
      }
    }
    if (active >= order.length) {
      round++
      order = shuffle(
        pawns.map((p) => p.id),
        random,
      )
      for (const p of pawns) {
        p.energy = p.maxEnergy
        p.escapeChance = 0
        p.specialUsed = false
      }
      active = 0
      log.push(`Round ${round}. Energy restored; escape chances reset.`)
    }
    const pawn = pawns.find((p) => p.id === order[active])
    if (!pawn) {
      active++
      continue
    }
    if (pawn.side === 'enemy') {
      capture(null)
      enemyAct(pawns, pawn, prev.tiles, log, strategy, random, record ? capture : undefined)
      active++
      continue
    }
    return {
      ...prev,
      pawns,
      order,
      active,
      round,
      randomState: random.state,
      phase: 'move',
      chargeDestination: null,
      log: [...prev.log, ...log].slice(-40),
      logCount: prev.logCount + log.length,
    }
  }
}

export function activePawn(state: GameState): Pawn | undefined {
  return state.pawns.find((p) => p.id === state.order[state.active])
}

function createInitialState(
  seed: string,
  strategy: EnemyStrategy,
  record?: RecordFrame,
): GameState {
  const random = new SeededRandom(seedState(seed))
  const spawn = (
    Ctor: new (id: number, q: number, r: number, side: Side) => Pawn,
    id: number,
    col: number,
    row: number,
    side: Side,
  ) => {
    const { q, r } = hexOf(col, row)
    return new Ctor(id, q, r, side)
  }
  const center = Math.floor(MAP_WIDTH / 2)
  const pawns = [
    spawn(Swordsman, 1, center - 1, MAP_HEIGHT - 3, 'player'),
    spawn(King, 2, center, MAP_HEIGHT - 2, 'player'),
    spawn(Swordsman, 3, center + 1, MAP_HEIGHT - 3, 'player'),
    spawn(Archer, 4, center - 2, MAP_HEIGHT - 2, 'player'),
    spawn(Magician, 5, center + 2, MAP_HEIGHT - 2, 'player'),
    spawn(Swordsman, 6, center - 1, 2, 'enemy'),
    spawn(King, 7, center, 1, 'enemy'),
    spawn(Swordsman, 8, center + 1, 2, 'enemy'),
    spawn(Archer, 9, center + 2, 1, 'enemy'),
    spawn(Magician, 10, center - 2, 1, 'enemy'),
  ]
  const tiles = makeMap(random)
  for (const pawn of pawns) tiles.get(key(pawn.q, pawn.r))!.terrain = 'plain'
  const base: GameState = {
    tiles,
    pawns,
    order: shuffle(
      pawns.map((p) => p.id),
      random,
    ),
    seed,
    randomState: random.state,
    active: -1,
    round: 1,
    phase: 'move',
    chargeDestination: null,
    winner: null,
    log: ['The battle begins. Protect your crown.'],
    logCount: 1,
  }
  return advance(base, strategy, record)
}

function recordTransition(run: (record: RecordFrame) => GameState): Transition {
  const frames: BattleFrame[] = []
  const state = run((frame) => frames.push(frame))
  return { state, frames }
}

export function createGameEngine(strategy: EnemyStrategy = nearestTarget) {
  return {
    initialState: (seed: string) => createInitialState(seed, strategy),
    reducer: (state: GameState, action: Action) => reduce(state, action, strategy),
    initialTransition: (seed: string) =>
      recordTransition((record) => createInitialState(seed, strategy, record)),
    transition: (state: GameState, action: Action) =>
      recordTransition((record) => reduce(state, action, strategy, record)),
  }
}

export const { initialState, reducer, initialTransition, transition } = createGameEngine()

export function targetingTiles(state: GameState): Set<string> {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return new Set()
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

function reduce(
  state: GameState,
  action: Action,
  strategy: EnemyStrategy,
  record?: RecordFrame,
): GameState {
  if (action.type === 'restart') return createInitialState(state.seed, strategy, record)
  const pawn = activePawn(state)
  if (!pawn || pawn.side !== 'player' || state.winner) return state
  if (action.type === 'cancelTargeting') {
    return state.phase === 'move' ? state : { ...state, phase: 'move', chargeDestination: null }
  }
  if (action.type === 'act') {
    if (state.phase !== 'move' || pawn.energy <= 0) return state
    if (action.action === 'attack') return { ...state, phase: 'attack' }
    if (action.action === 'special') {
      return canUseSpecial(pawn) ? { ...state, phase: 'special' } : state
    }
  }

  if (action.type === 'specialAt' && state.phase === 'special' && pawn.kind === 'swordsman') {
    if (!chargeDestinations(state.tiles, state.pawns, pawn).has(key(action.q, action.r)))
      return state
    return { ...state, phase: 'charge', chargeDestination: { q: action.q, r: action.r } }
  }

  const pawns = state.pawns.map((p) => p.clone())
  const me = pawns.find((p) => p.id === pawn.id)!
  const log: string[] = []
  const random = new SeededRandom(state.randomState)

  if (action.type === 'attackAt' || action.type === 'specialAt') {
    const expectedPhase =
      action.type === 'attackAt' ? 'attack' : me.kind === 'swordsman' ? 'charge' : 'special'
    if (state.phase !== expectedPhase) return state
    const target = pawns.find((p) => p.q === action.q && p.r === action.r)
    if (!target) return state
    const performed =
      action.type === 'attackAt'
        ? performAttack(pawns, me, target, log, random)
        : performSpecial(
            state.tiles,
            pawns,
            me,
            target,
            log,
            random,
            state.chargeDestination ?? undefined,
          )
    if (!performed) return state
  } else if (action.type === 'move') {
    if (state.phase !== 'move' || me.energy <= 0) return state
    const occupied = new Set(pawns.filter((p) => p.id !== me.id).map((p) => key(p.q, p.r)))
    const steps = reachable(state.tiles, occupied, me, me.energy).get(key(action.q, action.r))
    if (!steps) return state
    me.q = action.q
    me.r = action.r
    me.energy -= steps
    log.push(
      'Your ' + me.kind + ' #' + me.id + ' moves ' + steps + (steps === 1 ? ' tile.' : ' tiles.'),
    )
  } else if (action.type !== 'endTurn') return state

  const winner = winnerFrom(pawns)
  const turnEnded = !winner && (action.type === 'endTurn' || me.energy === 0)
  if (turnEnded) finishTurn(me, log)
  const next: GameState = {
    ...state,
    pawns,
    randomState: random.state,
    phase: winner ? 'over' : 'move',
    winner,
    chargeDestination: null,
    log: [...state.log, ...log].slice(-40),
    logCount: state.logCount + log.length,
  }
  return turnEnded ? advance(next, strategy, record) : next
}
