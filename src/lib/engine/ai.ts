import { activePawn, reducer } from './engine.ts'
import {
  canAttack,
  chargeDestinations,
  jumpDestinations,
  movementDestinations,
  protectorFor,
  specialTargets,
} from './combat.ts'
import { distFrom, hexDist, key, neighbors, passable } from './hex.ts'
import type { Pawn, Side } from './pawns.ts'
import type { Action, GameState } from './types.ts'

export type BotOptions = {
  depth: 1 | 2 | 3
  beamWidth: number
  samples: number
  caution: number
}

export const BOT_LEVELS = {
  easy: { depth: 1, beamWidth: 2, samples: 2, caution: 0.25 },
  normal: { depth: 2, beamWidth: 4, samples: 3, caution: 0.7 },
  hard: { depth: 3, beamWidth: 8, samples: 5, caution: 1 },
} as const satisfies Record<string, BotOptions>

export type BotDifficulty = keyof typeof BOT_LEVELS

function candidates(state: GameState): Action[][] {
  const pawn = activePawn(state)!
  const actions: Action[][] = [[{ type: 'endTurn' }]]
  if (pawn.energy <= 0) return actions
  const foes = state.pawns.filter((p) => p.side !== pawn.side)
  const moves = movementDestinations(state.tiles, state.pawns, pawn)
  const destinations =
    pawn.kind === 'king'
      ? [...moves.keys()].map((position) => state.tiles.get(position)!).filter(Boolean)
      : neighbors(pawn.q, pawn.r)
  for (const tile of destinations) {
    if (moves.get(key(tile.q, tile.r))) actions.push([{ type: 'move', q: tile.q, r: tile.r }])
  }
  for (const target of foes.filter((p) => canAttack(pawn, p))) {
    actions.push([
      { type: 'act', action: 'attack' },
      { type: 'attackAt', q: target.q, r: target.r },
    ])
  }
  const specials = specialTargets(state.pawns, pawn)
  if (pawn.kind === 'king') {
    if (specials.length) actions.push([{ type: 'act', action: 'special' }])
  } else if (pawn.kind === 'swordsman') {
    for (const position of chargeDestinations(state.tiles, state.pawns, pawn).keys()) {
      const tile = state.tiles.get(position)!
      for (const target of foes.filter((p) => canAttack(pawn, p, tile))) {
        actions.push([
          { type: 'act', action: 'special' },
          { type: 'specialAt', q: tile.q, r: tile.r },
          { type: 'specialAt', q: target.q, r: target.r },
        ])
      }
    }
  } else {
    const targets =
      pawn.kind === 'ninja'
        ? jumpDestinations(state.tiles, state.pawns, pawn)
        : specials.filter((p) => pawn.kind !== 'bulwark' || !protectorFor(state.pawns, p))
    for (const target of targets) {
      actions.push([
        { type: 'act', action: 'special' },
        { type: 'specialAt', q: target.q, r: target.r },
      ])
    }
  }
  return actions
}

function apply(state: GameState, actions: Action[]): GameState {
  return actions.reduce(reducer, state)
}

function threats(state: GameState, side: Side): Map<number, number> {
  const targets = state.pawns.filter((p) => p.side === side)
  const damage = new Map(targets.map((p) => [p.id, 0]))
  const smallestHit = new Map<number, number>()
  const lastThreat = new Map<number, number>()
  const turnOffset = (id: number) =>
    (state.order.indexOf(id) - state.active + state.order.length) % state.order.length
  for (const foe of state.pawns.filter((p) => p.side !== side)) {
    const attacker = foe.clone()
    const nextRound = state.order.indexOf(foe.id) < state.active
    attacker.energy = nextRound ? attacker.maxEnergy : attacker.energy
    if (attacker.energy <= 0) continue
    const moves = movementDestinations(state.tiles, state.pawns, attacker)
    const jumps = jumpDestinations(state.tiles, state.pawns, attacker)
    for (const target of targets) {
      let worst = 0
      for (const [position, cost] of moves) {
        const from = state.tiles.get(position) ?? attacker
        const energy = attacker.energy - cost
        if (canAttack(attacker, target, from)) {
          worst = Math.max(worst, energy * attacker.attack.damage)
          const chargeCost = Math.max(0, cost - 2) + attacker.special.cost
          if (attacker.kind === 'swordsman' && attacker.energy >= chargeCost)
            worst = Math.max(worst, (1 + attacker.energy - chargeCost) * attacker.attack.damage)
        }
        if (
          attacker.kind === 'magician' &&
          energy >= attacker.special.cost &&
          targets.some((p) => hexDist(p, target) <= 1 && canAttack(attacker, p, from))
        ) {
          worst = Math.max(worst, Math.floor(energy / attacker.special.cost))
        }
      }
      if (jumps.some((from) => canAttack(attacker, target, from))) {
        worst = Math.max(
          worst,
          (attacker.energy - attacker.special.cost) * attacker.attack.damage,
        )
      }
      damage.set(target.id, damage.get(target.id)! + worst)
      if (worst > 0) {
        smallestHit.set(
          target.id,
          Math.min(smallestHit.get(target.id) ?? Infinity, attacker.attack.damage),
        )
        lastThreat.set(target.id, Math.max(lastThreat.get(target.id) ?? 0, turnOffset(foe.id)))
      }
    }
  }
  for (const target of targets) {
    const guard = protectorFor(state.pawns, target)
    if (
      guard &&
      damage.get(guard.id)! < guard.hp &&
      turnOffset(guard.id) > (lastThreat.get(target.id) ?? -1)
    ) {
      const hit = smallestHit.get(target.id) ?? 0
      damage.set(target.id, Math.max(0, damage.get(target.id)! - hit))
      damage.set(guard.id, damage.get(guard.id)! + hit)
    }
  }
  return damage
}

function evaluate(
  state: GameState,
  actor: Pawn,
  caution: number,
  distance: Map<string, number>,
): number {
  if (state.winner) return state.winner === actor.side ? 1_000_000 : -1_000_000
  const sameTurn = activePawn(state)?.id === actor.id
  const settled = sameTurn ? reducer(state, { type: 'endTurn' }) : state
  const danger = threats(settled, actor.side)
  let score = 0
  for (const pawn of settled.pawns) {
    const allied = pawn.side === actor.side
    const value =
      pawn.kind === 'king' ? 1000 + pawn.hp * 30 : 12 + pawn.attack.damage * 3 + pawn.hp * 4
    score += allied ? value : -value
    if (!allied) continue
    const incoming = danger.get(pawn.id) ?? 0
    if (pawn.kind === 'king') {
      score -= incoming * 120
      if (incoming >= pawn.hp) score -= 100_000
    } else {
      const expected = incoming * (1 - pawn.escapeChance / 100)
      score -= caution * (Math.min(pawn.hp, expected) * 4 + (expected >= pawn.hp ? value : 0))
    }
  }
  const pawn = settled.pawns.find((p) => p.id === actor.id)!
  const allies = settled.pawns.filter((p) => p.side === pawn.side && p.id !== pawn.id)
  if (pawn.kind === 'king' && allies.length) {
    score -= Math.min(...allies.map((p) => hexDist(pawn, p))) * 0.5
  } else {
    score -= (distance.get(key(pawn.q, pawn.r)) ?? 100) * 8
  }
  return score
}

export function chooseTacticalActions(state: GameState, options: BotOptions): Action[] {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return []
  if (state.phase !== 'move') return [{ type: 'cancelTargeting' }]
  if (pawn.energy <= 0) return [{ type: 'endTurn' }]
  const occupied = new Set(
    state.pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)),
  )
  const foes = state.pawns.filter((p) => p.side !== pawn.side)
  const paths = new Map([...state.tiles].filter(([position]) => !occupied.has(position)))
  const distance = distFrom(
    paths,
    [...paths.values()].filter(
      (tile) => passable(tile) && foes.some((foe) => canAttack(pawn, foe, tile)),
    ),
  )
  const score = (next: GameState) => evaluate(next, pawn, options.caution, distance)
  const rank = (states: GameState[]) =>
    candidates(states[0])
      .map((actions) => {
        const next = states.map((s) => apply(s, actions))
        return {
          actions,
          states: next,
          score: next.reduce((sum, s) => sum + score(s), 0) / next.length,
        }
      })
      .sort((a, b) => b.score - a.score)
  const search = (current: GameState, depth: number): number => {
    if (
      depth === 0 ||
      current.winner ||
      current.round !== state.round ||
      activePawn(current)?.id !== pawn.id
    )
      return score(current)
    const ranked = rank([current])
    if (depth === 1) return ranked[0].score
    return Math.max(
      ...ranked
        .slice(0, options.beamWidth)
        .map((candidate) => search(candidate.states[0], depth - 1)),
    )
  }
  // Separate analysis streams keep the bot from seeing the battle's future Escape rolls.
  const samples = Array.from({ length: options.samples }, (_, randomState) => ({
    ...state,
    randomState,
  }))
  const ranked = rank(samples)
  if (options.depth === 1) return ranked[0].actions
  let best = ranked[0]
  let bestScore = -Infinity
  for (const candidate of ranked.slice(0, options.beamWidth)) {
    const value =
      candidate.states.reduce((sum, next) => sum + search(next, options.depth - 1), 0) /
      candidate.states.length
    if (value > bestScore) {
      best = candidate
      bestScore = value
    }
  }
  return best.actions
}
