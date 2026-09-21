import { distFrom, hexDist, hexOf, key, makeMap, neighbors, reachable } from './hex.ts'
import { ESCAPE_BONUS, MAX_ESCAPE, King, Swordsman, type Pawn, type Side } from './pawns.ts'
import type { Action, GameState, Tile } from './types.ts'
import { nearestTarget, type EnemyStrategy } from './strategies.ts'
import { SeededRandom, seedState } from './random.ts'

export const ATTACK_RANGE = 3
export const ATTACK_DAMAGE = 1

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

function strike(pawns: Pawn[], attacker: Pawn, target: Pawn, log: string[], random: SeededRandom) {
  const side = attacker.side === 'player' ? 'Your' : 'Enemy'
  if (target.escapeChance > 0 && random.next() * 100 < target.escapeChance) {
    log.push(
      `${target.side === 'player' ? 'Your' : 'Enemy'} ${target.kind} #${target.id} escapes the attack.`,
    )
    return
  }
  target.hp -= ATTACK_DAMAGE
  log.push(
    `${side} ${attacker.kind} #${attacker.id} strikes ${target.kind} #${target.id} for ${ATTACK_DAMAGE} damage.`,
  )
  if (target.hp <= 0) {
    pawns.splice(pawns.indexOf(target), 1)
    log.push(
      `${target.side === 'player' ? 'Your' : 'Enemy'} ${target.kind} #${target.id} has fallen.`,
    )
  }
}

function enemyAct(
  pawns: Pawn[],
  pawn: Pawn,
  tiles: Map<string, Tile>,
  log: string[],
  strategy: EnemyStrategy,
  random: SeededRandom,
) {
  const foes = pawns.filter((p) => p.side === 'player')
  if (!foes.length) return
  const dist = distFrom(
    tiles,
    foes.map((p) => ({ q: p.q, r: p.r })),
  )
  const occupied = () => new Set(pawns.filter((p) => p !== pawn).map((p) => key(p.q, p.r)))
  while (pawn.energy > 0) {
    const here = dist.get(key(pawn.q, pawn.r)) ?? Infinity
    if (here <= ATTACK_RANGE) break
    const steps = neighbors(pawn.q, pawn.r)
      .filter((n) => (dist.get(key(n.q, n.r)) ?? Infinity) < here)
      .filter((n) => {
        const t = tiles.get(key(n.q, n.r))
        return t && t.terrain !== 'mountain' && !occupied().has(key(n.q, n.r))
      })
      .sort((a, b) => (dist.get(key(a.q, a.r)) ?? 0) - (dist.get(key(b.q, b.r)) ?? 0))
    if (!steps.length) break
    pawn.q = steps[0].q
    pawn.r = steps[0].r
    pawn.energy--
  }
  const target = strategy.chooseTarget(
    pawn,
    foes.filter((f) => hexDist(pawn, f) <= ATTACK_RANGE),
  )
  if (target && pawn.energy > 0) {
    pawn.energy--
    strike(pawns, pawn, target, log, random)
  }
}

function advance(prev: GameState, strategy: EnemyStrategy): GameState {
  const random = new SeededRandom(prev.randomState)
  const pawns = prev.pawns.map((p) => p.clone())
  const log: string[] = []
  let order = prev.order
  let active = prev.active + 1
  let round = prev.round

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
        winner,
        log: [...prev.log, ...log].slice(-40),
      }
    }
    if (active >= order.length) {
      round++
      order = shuffle(pawns.map((p) => p.id), random)
      for (const p of pawns) {
        p.energy = p.maxEnergy
        p.escapeChance = 0
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
      enemyAct(pawns, pawn, prev.tiles, log, strategy, random)
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
      log: [...prev.log, ...log].slice(-40),
    }
  }
}

export function activePawn(state: GameState): Pawn | undefined {
  return state.pawns.find((p) => p.id === state.order[state.active])
}

function createInitialState(seed: string, strategy: EnemyStrategy): GameState {
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
  const pawns = [
    spawn(Swordsman, 1, 4, 7, 'player'),
    spawn(King, 2, 5, 8, 'player'),
    spawn(Swordsman, 3, 6, 7, 'player'),
    spawn(Swordsman, 4, 3, 2, 'enemy'),
    spawn(King, 5, 4, 1, 'enemy'),
    spawn(Swordsman, 6, 6, 2, 'enemy'),
  ]
  const base: GameState = {
    tiles: makeMap(),
    pawns,
    order: shuffle(pawns.map((p) => p.id), random),
    seed,
    randomState: random.state,
    active: -1,
    round: 1,
    phase: 'move',
    winner: null,
    log: ['The battle begins. Protect your crown.'],
  }
  return advance(base, strategy)
}

export function createGameEngine(strategy: EnemyStrategy = nearestTarget) {
  return {
    initialState: (seed: string) => createInitialState(seed, strategy),
    reducer: (state: GameState, action: Action) => reduce(state, action, strategy),
  }
}

export const { initialState, reducer } = createGameEngine()

function reduce(state: GameState, action: Action, strategy: EnemyStrategy): GameState {
  if (action.type === 'restart') return createInitialState(state.seed, strategy)

  const pawn = activePawn(state)
  if (!pawn || pawn.side !== 'player' || state.winner) return state

  if (action.type === 'endTurn') return advance(state, strategy)

  if (action.type === 'cancelAttack') {
    return state.phase === 'attack' ? { ...state, phase: 'move' } : state
  }

  if (action.type === 'act') {
    if (state.phase !== 'move' || pawn.energy <= 0) return state
    if (action.action === 'escape' && pawn.escapeChance >= MAX_ESCAPE) return state
    const pawns = state.pawns.map((p) => p.clone())
    const me = pawns.find((p) => p.id === pawn.id)!
    const log = [...state.log]
    if (action.action === 'attack') return { ...state, pawns, log, phase: 'attack' }
    me.energy--
    if (action.action === 'escape') {
      me.escapeChance = Math.min(MAX_ESCAPE, me.escapeChance + ESCAPE_BONUS)
      log.push(`Your ${me.kind} #${me.id} prepares to escape: ${me.escapeChance}% chance.`)
    } else {
      log.push(`${me.kind} ${me.id} uses special (nothing happens yet)`)
    }
    const next: GameState = { ...state, pawns, log: log.slice(-40) }
    return me.energy === 0 ? advance(next, strategy) : next
  }

  if (action.type === 'attackAt') {
    if (state.phase !== 'attack' || pawn.energy <= 0) return state
    if (hexDist(pawn, action) > ATTACK_RANGE) return state
    const pawns = state.pawns.map((p) => p.clone())
    const me = pawns.find((p) => p.id === pawn.id)!
    me.energy--
    const log = [...state.log]
    const target = pawns.find((p) => p.q === action.q && p.r === action.r && p.side !== me.side)
    const random = new SeededRandom(state.randomState)
    if (target) strike(pawns, me, target, log, random)
    else log.push(`Your ${me.kind} #${me.id} strikes empty ground.`)
    const winner = winnerFrom(pawns)
    const next: GameState = { ...state, pawns, log: log.slice(-40), randomState: random.state, phase: 'move', winner }
    if (winner) return { ...next, phase: 'over' }
    return me.energy === 0 ? advance(next, strategy) : next
  }

  if (action.type === 'move') {
    if (state.phase !== 'move' || pawn.energy <= 0) return state
    const occupied = new Set(state.pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)))
    const steps = reachable(state.tiles, occupied, pawn, pawn.energy).get(key(action.q, action.r))
    if (steps === undefined || steps === 0) return state
    const pawns = state.pawns.map((p) => p.clone())
    const me = pawns.find((p) => p.id === pawn.id)!
    me.q = action.q
    me.r = action.r
    me.energy -= steps
    const log = [
      ...state.log,
      `Your ${me.kind} #${me.id} moves ${steps} ${steps === 1 ? 'tile' : 'tiles'}.`,
    ].slice(-40)
    const next: GameState = { ...state, pawns, log }
    return me.energy === 0 ? advance(next, strategy) : next
  }

  return state
}
