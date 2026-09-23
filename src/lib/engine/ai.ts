import { activePawn, reducer } from './engine.ts'
import {
  canAttack,
  jumpDestinations,
  movementDestinations,
  walkingPaths,
  protectorFor,
} from './combat.ts'
import { distFrom, hexDist, key, neighbors, passable } from './hex.ts'
import { START_ENERGY, type Pawn, type Side, type ThreatPosition } from './pawns.ts'
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

function generateCandidates(state: GameState): Action[][] {
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
  for (const target of foes.filter((p) =>
    canAttack(pawn, p, state.tiles.get(key(pawn.q, pawn.r))),
  )) {
    actions.push([
      { type: 'act', action: 'attack' },
      { type: 'attackAt', q: target.q, r: target.r },
    ])
  }
  return [...actions, ...pawn.special.candidates(pawn, state)]
}

function damageFromPosition(attacker: Pawn, position: ThreatPosition): number {
  const base = canAttack(attacker, position.target, position.from)
    ? (attacker.energy - position.movementCost) * attacker.attack.damage
    : 0
  return Math.max(base, attacker.special.threat?.(attacker, position) ?? 0)
}

function estimateIncomingDamage(state: GameState, side: Side): Map<number, number> {
  const targets = state.pawns.filter((p) => p.side === side)
  const damageByTarget = new Map(targets.map((p) => [p.id, 0]))
  const smallestHitByTarget = new Map<number, number>()
  const lastAttackerTurn = new Map<number, number>()
  const turnOffset = (id: number) =>
    (state.order.indexOf(id) - state.active + state.order.length) % state.order.length
  for (const foe of state.pawns.filter((p) => p.side !== side)) {
    const attacker = foe.clone()
    const actsNextRound = state.order.indexOf(foe.id) < state.active
    attacker.energy = actsNextRound ? START_ENERGY : attacker.energy
    if (attacker.energy <= 0) continue
    const moves = walkingPaths(state.tiles, state.pawns, attacker)
    const jumps = jumpDestinations(state.tiles, state.pawns, attacker)
    for (const target of targets) {
      let maxDamage = 0
      for (const [position, route] of moves) {
        if (route.damage >= attacker.hp) continue
        const cost =
          attacker.moveEnergyCost(route.path.length) -
          route.path.filter((tile) => tile.feature === 'rune').length * 2
        const from = state.tiles.get(position) ?? attacker
        maxDamage = Math.max(
          maxDamage,
          damageFromPosition(attacker, { target, targets, from, movementCost: cost }),
        )
      }
      if (jumps.some((from) => from.terrain !== 'lava' && canAttack(attacker, target, from))) {
        maxDamage = Math.max(
          maxDamage,
          (attacker.energy - attacker.special.cost) * attacker.attack.damage,
        )
      }
      damageByTarget.set(target.id, damageByTarget.get(target.id)! + maxDamage)
      if (maxDamage > 0) {
        smallestHitByTarget.set(
          target.id,
          Math.min(smallestHitByTarget.get(target.id) ?? Infinity, attacker.attack.damage),
        )
        lastAttackerTurn.set(
          target.id,
          Math.max(lastAttackerTurn.get(target.id) ?? 0, turnOffset(foe.id)),
        )
      }
    }
  }
  for (const target of targets) {
    const guard = protectorFor(state.pawns, target)
    if (
      guard &&
      damageByTarget.get(guard.id)! < guard.hp &&
      turnOffset(guard.id) > (lastAttackerTurn.get(target.id) ?? -1)
    ) {
      const hit = smallestHitByTarget.get(target.id) ?? 0
      damageByTarget.set(target.id, Math.max(0, damageByTarget.get(target.id)! - hit))
      damageByTarget.set(guard.id, damageByTarget.get(guard.id)! + hit)
    }
  }
  return damageByTarget
}

const SCORE = {
  victory: 1_000_000,
  king: 1000,
  kingHealth: 30,
  unit: 12,
  attackDamage: 3,
  unitHealth: 4,
  kingIncomingDamage: 120,
  kingLethalThreat: 100_000,
  kingAllyDistance: 0.5,
  attackDistance: 8,
}
const UNREACHABLE_DISTANCE = 100

function evaluatePosition(
  state: GameState,
  actor: Pawn,
  caution: number,
  distance: Map<string, number>,
): number {
  if (state.winner) return state.winner === actor.side ? SCORE.victory : -SCORE.victory
  const sameTurn = activePawn(state)?.id === actor.id
  const settled = sameTurn ? reducer(state, { type: 'endTurn' }) : state
  const danger = estimateIncomingDamage(settled, actor.side)
  let score = 0
  for (const pawn of settled.pawns) {
    const allied = pawn.side === actor.side
    const value =
      pawn.kind === 'king'
        ? SCORE.king + pawn.hp * SCORE.kingHealth
        : SCORE.unit + pawn.attack.damage * SCORE.attackDamage + pawn.hp * SCORE.unitHealth
    score += allied ? value : -value
    if (!allied) continue
    const incoming = danger.get(pawn.id) ?? 0
    if (pawn.kind === 'king') {
      score -= incoming * SCORE.kingIncomingDamage
      if (incoming >= pawn.hp) score -= SCORE.kingLethalThreat
    } else {
      const expected = incoming * (1 - pawn.escapeChance / 100)
      score -=
        caution *
        (Math.min(pawn.hp, expected) * SCORE.unitHealth + (expected >= pawn.hp ? value : 0))
    }
  }
  const pawn = settled.pawns.find((p) => p.id === actor.id) ?? actor
  const allies = settled.pawns.filter((p) => p.side === pawn.side && p.id !== pawn.id)
  if (pawn.kind === 'king' && allies.length) {
    score -= Math.min(...allies.map((p) => hexDist(pawn, p))) * SCORE.kingAllyDistance
  } else {
    score -= (distance.get(key(pawn.q, pawn.r)) ?? UNREACHABLE_DISTANCE) * SCORE.attackDistance
  }
  return score
}

function distancesToAttack(state: GameState, pawn: Pawn): Map<string, number> {
  const occupied = new Set(
    state.pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)),
  )
  const foes = state.pawns.filter((p) => p.side !== pawn.side)
  const paths = new Map([...state.tiles].filter(([position]) => !occupied.has(position)))
  return distFrom(
    paths,
    [...paths.values()].filter(
      (tile) => passable(tile) && foes.some((foe) => canAttack(pawn, foe, tile)),
    ),
  )
}

function rankCandidates(states: GameState[], score: (state: GameState) => number) {
  return generateCandidates(states[0])
    .map((actions) => {
      const outcomes = states.map((state) => actions.reduce(reducer, state))
      return {
        actions,
        states: outcomes,
        score: outcomes.reduce((sum, state) => sum + score(state), 0) / outcomes.length,
      }
    })
    .sort((a, b) => b.score - a.score)
}

function searchTurn(
  state: GameState,
  depth: number,
  beamWidth: number,
  startingState: GameState,
  score: (state: GameState) => number,
): number {
  if (
    depth === 0 ||
    state.winner ||
    state.round !== startingState.round ||
    activePawn(state)?.id !== activePawn(startingState)?.id
  )
    return score(state)

  const ranked = rankCandidates([state], score)
  if (depth === 1) return ranked[0].score
  return Math.max(
    ...ranked
      .slice(0, beamWidth)
      .map((candidate) =>
        searchTurn(candidate.states[0], depth - 1, beamWidth, startingState, score),
      ),
  )
}

export function chooseTacticalActions(state: GameState, options: BotOptions): Action[] {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return []
  if (state.phase !== 'move') return [{ type: 'cancelTargeting' }]
  if (pawn.energy <= 0) return [{ type: 'endTurn' }]
  const distance = distancesToAttack(state, pawn)
  const score = (next: GameState) => evaluatePosition(next, pawn, options.caution, distance)
  // Separate analysis streams keep the bot from seeing the battle's future Escape rolls.
  const samples = Array.from({ length: options.samples }, (_, randomState) => ({
    ...state,
    randomState,
  }))
  const ranked = rankCandidates(samples, score)
  if (options.depth === 1) return ranked[0].actions
  let best = ranked[0]
  let bestScore = -Infinity
  for (const candidate of ranked.slice(0, options.beamWidth)) {
    const value =
      candidate.states.reduce(
        (sum, next) =>
          sum + searchTurn(next, options.depth - 1, options.beamWidth, state, score),
        0,
      ) / candidate.states.length
    if (value > bestScore) {
      best = candidate
      bestScore = value
    }
  }
  return best.actions
}
