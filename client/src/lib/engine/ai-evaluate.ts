import { activePawn, reducer, type GameState } from './engine.ts'
import { inHellfire } from './hellfire.ts'
import { canAttack, walkingPaths, protectorFor } from './combat.ts'
import type { SidePlan } from './ai-plan.ts'
import { distFrom, hexDist, key, passable, type Axial, type Tile } from './hex.ts'
import {
  START_ENERGY,
  jumpDestinations,
  type Pawn,
  type Side,
  type ThreatPosition,
} from './pawns/index.ts'

function damageFromPosition(attacker: Pawn, position: ThreatPosition): number {
  const base = canAttack(attacker, position.target, position.from)
    ? (attacker.energy - position.movementCost) * attacker.attack.damage
    : 0
  return Math.max(base, attacker.special.threat?.(attacker, position) ?? 0)
}

type Reach = {
  positions: { from: Axial; movementCost: number }[]
  jumps: Tile[]
  damageAt: Map<string, number>
}
export type ReachCache = Map<string, Reach>

// Only units and runes within walking or jumping range can change where an attacker reaches.
function reachOf(state: GameState, attacker: Pawn, runes: Tile[], cache: ReachCache): Reach {
  const radius = Math.max(3, attacker.energy - attacker.moveCost + 1)
  const nearby = (items: Axial[]) =>
    items
      .filter((item) => hexDist(attacker, item) <= radius)
      .map((item) => key(item.q, item.r))
      .join('|')
  const { id, q, r, hp, energy, specialUsed } = attacker
  const cacheKey = [
    id,
    q,
    r,
    hp,
    energy,
    specialUsed,
    nearby(state.pawns),
    nearby(runes),
  ].join()
  const cached = cache.get(cacheKey)
  if (cached) return cached
  const reach = {
    positions: [...walkingPaths(state.tiles, state.pawns, attacker)]
      .filter(([, route]) => route.damage < attacker.hp)
      .map(([position, route]) => ({
        from: state.tiles.get(position) ?? attacker,
        movementCost:
          attacker.moveEnergyCost(route.path.length) -
          route.path.filter((tile) => tile.feature === 'rune').length * 2,
      })),
    jumps: jumpDestinations(state.tiles, state.pawns, attacker).filter(
      (tile) => tile.terrain !== 'lava',
    ),
    damageAt: new Map<string, number>(),
  }
  cache.set(cacheKey, reach)
  return reach
}

function maxDamage(attacker: Pawn, reach: Reach, target: Pawn): number {
  const at = key(target.q, target.r)
  const cached = reach.damageAt.get(at)
  if (cached !== undefined) return cached
  let damage = 0
  for (const { from, movementCost } of reach.positions)
    damage = Math.max(damage, damageFromPosition(attacker, { target, from, movementCost }))
  if (reach.jumps.some((from) => canAttack(attacker, target, from)))
    damage = Math.max(
      damage,
      (attacker.energy - attacker.special.cost) * attacker.attack.damage,
    )
  reach.damageAt.set(at, damage)
  return damage
}

function estimateIncomingDamage(
  state: GameState,
  side: Side,
  cache: ReachCache,
): Map<number, number> {
  const targets = state.pawns.filter((p) => p.side === side)
  const damageByTarget = new Map(targets.map((p) => [p.id, 0]))
  const smallestHitByTarget = new Map<number, number>()
  const lastAttackerTurn = new Map<number, number>()
  const runes = [...state.tiles.values()].filter((tile) => tile.feature === 'rune')
  const turnOffset = (id: number) =>
    (state.order.indexOf(id) - state.active + state.order.length) % state.order.length
  for (const foe of state.pawns.filter((p) => p.side !== side)) {
    const actsNextRound = state.order.indexOf(foe.id) < state.active
    if (actsNextRound && foe.hp <= 1 && inHellfire(state.hellfire, foe)) continue
    const attacker = foe.clone()
    attacker.energy = actsNextRound ? START_ENERGY : attacker.energy
    if (attacker.energy <= 0) continue
    const reach = reachOf(state, attacker, runes, cache)
    for (const target of targets) {
      const damage = maxDamage(attacker, reach, target)
      damageByTarget.set(target.id, damageByTarget.get(target.id)! + damage)
      if (damage > 0) {
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

const SCORE = { victory: 1_000_000, hellfireDamage: 24 }

export function evaluatePosition(
  state: GameState,
  actor: Pawn,
  plan: SidePlan,
  distance: Map<string, number>,
  cache: ReachCache,
): number {
  const sameTurn = activePawn(state)?.id === actor.id
  const settled = sameTurn ? reducer(state, { type: 'endTurn' }) : state
  if (settled.winner)
    return settled.winner === 'draw'
      ? 0
      : settled.winner === actor.side
        ? SCORE.victory
        : -SCORE.victory
  const danger = estimateIncomingDamage(settled, actor.side, cache)
  let score = 0
  let survivingActor = actor
  for (const pawn of settled.pawns) {
    const allied = pawn.side === actor.side
    const hellfireDamage = Number(
      settled.order.indexOf(pawn.id) < settled.active && inHellfire(settled.hellfire, pawn),
    )
    const health = pawn.hp - hellfireDamage
    if (pawn.id === actor.id && health > 0) survivingActor = pawn
    const value = health <= 0 ? 0 : pawn.ai.value(pawn, health)
    score += allied ? value : -value
    if (!allied) continue
    const incoming = danger.get(pawn.id) ?? 0
    score -= hellfireDamage * SCORE.hellfireDamage
    score -= pawn.ai.risk(pawn, {
      incoming,
      health,
      hellfireDamage,
      value,
      caution: plan.caution,
    })
  }
  const allies = settled.pawns.filter((p) => p.side === actor.side && p.id !== actor.id)
  score += survivingActor.ai.goal(survivingActor, {
    allies,
    attackDistance: distance.get(key(survivingActor.q, survivingActor.r)),
    aggression: plan.aggression,
  })
  return score
}

// Allies make way over a few turns, so only enemies block the route toward attack range.
export function distancesToAttack(state: GameState, pawn: Pawn): Map<string, number> {
  const foes = state.pawns.filter((p) => p.side !== pawn.side)
  const blocked = new Set(foes.map((foe) => key(foe.q, foe.r)))
  const paths = new Map([...state.tiles].filter(([position]) => !blocked.has(position)))
  return distFrom(
    paths,
    [...paths.values()].filter(
      (tile) => passable(tile) && foes.some((foe) => canAttack(pawn, foe, tile)),
    ),
  )
}
