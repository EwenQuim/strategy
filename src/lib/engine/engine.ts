import { distFrom, hexDist, hexOf, key, makeMap, neighbors, reachable } from './hex'
import { King, Swordsman, type Pawn, type Side } from './pawns'
import type { Action, GameState, Tile } from './types'

export const ATTACK_RANGE = 3
export const ATTACK_DAMAGE = 1

function shuffle(ids: number[]): number[] {
  const out = [...ids]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function winnerFrom(pawns: Pawn[]): Side | null {
  if (!pawns.some((p) => p.kind === 'king' && p.side === 'enemy')) return 'player'
  if (!pawns.some((p) => p.kind === 'king' && p.side === 'player')) return 'enemy'
  return null
}

function strike(pawns: Pawn[], attacker: Pawn, target: Pawn, log: string[]) {
  log.push(`${attacker.side} ${attacker.kind} ${attacker.id} attacks ${target.kind} ${target.id}`)
  if (target.defending && Math.random() < 0.5) {
    log.push(`${target.kind} ${target.id} evades`)
    return
  }
  target.hp -= ATTACK_DAMAGE
  log.push(`${target.kind} ${target.id} takes ${ATTACK_DAMAGE} damage (${target.hp} hp)`)
  if (target.hp <= 0) {
    pawns.splice(pawns.indexOf(target), 1)
    log.push(`${target.kind} ${target.id} falls`)
  }
}

function enemyAct(pawns: Pawn[], pawn: Pawn, tiles: Map<string, Tile>, log: string[]) {
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
  const target = foes
    .filter((f) => hexDist(pawn, f) <= ATTACK_RANGE)
    .sort((a, b) => hexDist(pawn, a) - hexDist(pawn, b))[0]
  if (target && pawn.energy > 0) {
    pawn.energy--
    strike(pawns, pawn, target, log)
  }
}

function advance(prev: GameState): GameState {
  const pawns = prev.pawns.map((p) => p.clone())
  const log: string[] = []
  let order = prev.order
  let active = prev.active + 1

  while (true) {
    if (active >= order.length) {
      order = shuffle(pawns.map((p) => p.id))
      for (const p of pawns) {
        p.energy = p.maxEnergy
        p.defending = false
      }
      active = 0
    }
    const winner = winnerFrom(pawns)
    if (winner) {
      log.push(`Game over: ${winner} wins`)
      return { ...prev, pawns, order, active, phase: 'over', winner, log: [...prev.log, ...log].slice(-40) }
    }
    const pawn = pawns.find((p) => p.id === order[active])
    if (!pawn) {
      active++
      continue
    }
    if (pawn.side === 'enemy') {
      enemyAct(pawns, pawn, prev.tiles, log)
      active++
      continue
    }
    return { ...prev, pawns, order, active, phase: 'move', log: [...prev.log, ...log].slice(-40) }
  }
}

export function activePawn(state: GameState): Pawn | undefined {
  return state.pawns.find((p) => p.id === state.order[state.active])
}

export function initialState(): GameState {
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
    order: shuffle(pawns.map((p) => p.id)),
    active: -1,
    phase: 'move',
    winner: null,
    log: [],
  }
  return advance(base)
}

export function reducer(state: GameState, action: Action): GameState {
  if (action.type === 'restart') return initialState()

  const pawn = activePawn(state)
  if (!pawn || pawn.side !== 'player' || state.winner) return state

  if (action.type === 'endTurn') return advance(state)

  if (action.type === 'cancelAttack') {
    return state.phase === 'attack' ? { ...state, phase: 'move' } : state
  }

  if (action.type === 'act') {
    if (state.phase !== 'move' || pawn.energy <= 0) return state
    const pawns = state.pawns.map((p) => p.clone())
    const me = pawns.find((p) => p.id === pawn.id)!
    const log = [...state.log]
    if (action.action === 'attack') return { ...state, pawns, log, phase: 'attack' }
    me.energy--
    if (action.action === 'defense') {
      me.defending = true
      log.push(`${me.kind} ${me.id} takes a defensive stance`)
    } else {
      log.push(`${me.kind} ${me.id} uses special (nothing happens yet)`)
    }
    const next: GameState = { ...state, pawns, log }
    return me.energy === 0 ? advance(next) : next
  }

  if (action.type === 'attackAt') {
    if (state.phase !== 'attack' || pawn.energy <= 0) return state
    if (hexDist(pawn, action) > ATTACK_RANGE) return state
    const pawns = state.pawns.map((p) => p.clone())
    const me = pawns.find((p) => p.id === pawn.id)!
    me.energy--
    const log = [...state.log]
    const target = pawns.find((p) => p.q === action.q && p.r === action.r && p.side !== me.side)
    if (target) strike(pawns, me, target, log)
    else log.push(`${me.kind} ${me.id} hits empty ground`)
    const winner = winnerFrom(pawns)
    const next: GameState = { ...state, pawns, log, phase: 'move', winner }
    if (winner) return { ...next, phase: 'over' }
    return me.energy === 0 ? advance(next) : next
  }

  if (action.type === 'move') {
    if (state.phase !== 'move' || pawn.energy <= 0) return state
    const occupied = new Set(state.pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)))
    const steps = reachable(state.tiles, occupied, pawn, pawn.energy).get(key(action.q, action.r))
    if (steps === undefined) return state
    const pawns = state.pawns.map((p) => p.clone())
    const me = pawns.find((p) => p.id === pawn.id)!
    me.q = action.q
    me.r = action.r
    me.energy -= steps
    const next: GameState = { ...state, pawns }
    return me.energy === 0 ? advance(next) : next
  }

  return state
}
