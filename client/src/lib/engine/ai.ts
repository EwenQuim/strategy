import { activePawn, reducer } from './engine.ts'
import { inHellfire } from './hellfire.ts'
import { canAttack, movementDestinations, walkingPaths, protectorFor } from './combat.ts'
import { distFrom, hexDist, key, neighbors, passable } from './hex.ts'
import {
  START_ENERGY,
  jumpDestinations,
  type Pawn,
  type Side,
  type ThreatPosition,
} from './pawns/index.ts'
import type { Action, GameState } from './engine.ts'

export type BotOptions = {
  depth: 1 | 2 | 3
  beamWidth: number
  caution: number
}

export const BOT_LEVELS = {
  easy: { depth: 1, beamWidth: 2, caution: 0.25 },
  normal: { depth: 2, beamWidth: 4, caution: 0.7 },
  hard: { depth: 3, beamWidth: 8, caution: 1 },
} as const satisfies Record<string, BotOptions>

export type BotDifficulty = keyof typeof BOT_LEVELS

function generateCandidates(state: GameState): Action[][] {
  const pawn = activePawn(state)!
  const actions: Action[][] = [[{ type: 'endTurn' }]]
  if (pawn.energy <= 0) return actions
  const foes = state.pawns.filter((p) => p.side !== pawn.side)
  const moves = movementDestinations(state.tiles, state.pawns, pawn)
  const destinations =
    pawn.kind === 'king' || inHellfire(state.hellfire, pawn)
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
    const actsNextRound = state.order.indexOf(foe.id) < state.active
    if (actsNextRound && foe.hp <= 1 && inHellfire(state.hellfire, foe)) continue
    const attacker = foe.clone()
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
  hellfireDamage: 24,
}
const UNREACHABLE_DISTANCE = 100

function evaluatePosition(
  state: GameState,
  actor: Pawn,
  caution: number,
  distance: Map<string, number>,
): number {
  const sameTurn = activePawn(state)?.id === actor.id
  const settled = sameTurn ? reducer(state, { type: 'endTurn' }) : state
  if (settled.winner)
    return settled.winner === 'draw'
      ? 0
      : settled.winner === actor.side
        ? SCORE.victory
        : -SCORE.victory
  const danger = estimateIncomingDamage(settled, actor.side)
  let score = 0
  for (const pawn of settled.pawns) {
    const allied = pawn.side === actor.side
    const hellfireDamage = Number(
      settled.order.indexOf(pawn.id) < settled.active && inHellfire(settled.hellfire, pawn),
    )
    const health = pawn.hp - hellfireDamage
    const value =
      health <= 0
        ? 0
        : pawn.kind === 'king'
          ? SCORE.king + health * SCORE.kingHealth
          : SCORE.unit + pawn.attack.damage * SCORE.attackDamage + health * SCORE.unitHealth
    score += allied ? value : -value
    if (!allied) continue
    const incoming = danger.get(pawn.id) ?? 0
    score -= hellfireDamage * SCORE.hellfireDamage
    if (pawn.kind === 'king') {
      score -= (incoming + hellfireDamage) * SCORE.kingIncomingDamage
      if (incoming >= health) score -= SCORE.kingLethalThreat
    } else {
      const expected = incoming * (1 - pawn.escapeChance / 100)
      score -=
        caution *
        (Math.min(health, expected) * SCORE.unitHealth + (expected >= health ? value : 0))
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

type Outcome = { state: GameState; weight: number }

function withFoeEscape(state: GameState, side: Side, escape: (foe: Pawn) => number): GameState {
  return {
    ...state,
    pawns: state.pawns.map((pawn) => {
      if (pawn.side === side) return pawn
      const foe = pawn.clone()
      foe.escapeChance = escape(pawn)
      return foe
    }),
  }
}

const hpOf = (state: GameState, id: number) => state.pawns.find((p) => p.id === id)?.hp ?? 0

// Escape rolls are scored by their odds: a 20% escape keeps 80% of the hit's value.
function expectedOutcomes(state: GameState, actions: Action[]): Outcome[] {
  const apply = (from: GameState) => actions.reduce(reducer, from)
  const side = activePawn(state)!.side
  const foes = state.pawns.filter((p) => p.side !== side)
  if (
    !actions.some((action) => action.type === 'attackAt' || action.type === 'specialAt') ||
    !foes.some((foe) => foe.escapeChance > 0)
  )
    return [{ state: apply(state), weight: 1 }]
  const original = new Map(foes.map((foe) => [foe.id, foe.escapeChance]))
  const hit = apply(withFoeEscape(state, side, () => 0))
  const dodge = apply(withFoeEscape(state, side, (foe) => (foe.escapeChance > 0 ? 100 : 0)))
  const struck = foes.filter((foe) => hpOf(hit, foe.id) !== hpOf(dodge, foe.id))
  const reset = (next: GameState) =>
    withFoeEscape(next, side, (foe) => original.get(foe.id) ?? foe.escapeChance)
  if (!struck.length) return [{ state: reset(hit), weight: 1 }]
  const escape = struck.reduce((sum, foe) => sum + foe.escapeChance, 0) / struck.length / 100
  return [
    { state: reset(hit), weight: 1 - escape },
    { state: reset(dodge), weight: escape },
  ]
}

const expected = (outcomes: Outcome[], value: (state: GameState) => number) =>
  outcomes.reduce((sum, outcome) => sum + outcome.weight * value(outcome.state), 0)

function rankCandidates(state: GameState, score: (state: GameState) => number) {
  return generateCandidates(state)
    .map((actions) => {
      const outcomes = expectedOutcomes(state, actions)
      return { actions, outcomes, score: expected(outcomes, score) }
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

  const ranked = rankCandidates(state, score)
  if (depth === 1) return ranked[0].score
  return Math.max(
    ...ranked
      .slice(0, beamWidth)
      .map((candidate) =>
        expected(candidate.outcomes, (next) =>
          searchTurn(next, depth - 1, beamWidth, startingState, score),
        ),
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
  // A fixed random stream keeps the analysis from seeing the battle's future rolls, such as Hellfire.
  const analysis = { ...state, randomState: 0 }
  const ranked = rankCandidates(analysis, score)
  if (options.depth === 1) return ranked[0].actions
  let best = ranked[0]
  let bestScore = -Infinity
  for (const candidate of ranked.slice(0, options.beamWidth)) {
    const value = expected(candidate.outcomes, (next) =>
      searchTurn(next, options.depth - 1, options.beamWidth, analysis, score),
    )
    if (value > bestScore) {
      best = candidate
      bestScore = value
    }
  }
  return best.actions
}
