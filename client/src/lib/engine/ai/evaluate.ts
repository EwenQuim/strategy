import { activePawn, reducer, type GameState } from '../engine.ts'
import { inHellfire } from '../hellfire.ts'
import { abilityDamage, routePath, walkingPaths, protectorFor } from '../combat.ts'
import type { SidePlan } from './plan.ts'
import { distFrom, hexDist, key, passable, type Axial, type Tile } from '../hex.ts'
import { START_ENERGY, type Pawn, type Side } from '../pawns/index.ts'

type Reach = {
  positions: { from: Axial; movementCost: number }[]
  damageAt: Map<string, number>
  tiles: Map<string, Tile>
  pawns: readonly Pawn[]
  landings: Axial[]
}
export type ReachCache = Map<string, Reach>

// Keep every blocker in the key. Only the attacker's health affects its surviving routes;
// changing another unit's health does not change occupancy.
function reachOf(state: GameState, attacker: Pawn, runes: Tile[], cache: ReachCache): Reach {
  const { id, q, r, hp, energy, specialUsed } = attacker
  const cacheKey = [
    id,
    q,
    r,
    hp,
    energy,
    specialUsed,
    state.pawns.map((p) => `${p.id}:${p.q}:${p.r}`).join('|'),
    runes.map((rune) => key(rune.q, rune.r)).join('|'),
  ].join()
  const cached = cache.get(cacheKey)
  if (cached) return cached
  const maxSteps = runes.length
    ? undefined
    : Math.max(0, attacker.energy - attacker.special.cost - attacker.moveCost + 1)
  const positions = [...walkingPaths(state.tiles, state.pawns, attacker, maxSteps)]
    .filter(([, route]) => route.damage < attacker.hp)
    .map(([position, route]) => ({
      from: state.tiles.get(position) ?? attacker,
      movementCost:
        attacker.moveEnergyCost(route.steps) -
        routePath(route).filter((tile) => tile.feature === 'rune').length * 2,
    }))
  const landings = new Map<string, Axial>()
  const range = attacker.special.landingRange
  if (range && !attacker.specialUsed)
    for (const position of positions) {
      if (position.movementCost + attacker.special.cost > attacker.energy) continue
      const actor = attacker.clone()
      Object.assign(actor, position.from)
      if (attacker.special.movement === 'walk') {
        for (const [at, route] of walkingPaths(state.tiles, state.pawns, actor, range))
          if (route.damage < attacker.hp) landings.set(at, route.tile ?? position.from)
      } else {
        for (const tile of state.tiles.values())
          if (
            passable(tile) &&
            hexDist(position.from, tile) <= range &&
            (tile.terrain !== 'lava' || attacker.hp > 1) &&
            !state.pawns.some((p) => p.id !== attacker.id && p.q === tile.q && p.r === tile.r)
          )
            landings.set(key(tile.q, tile.r), tile)
      }
    }
  const reach = {
    landings: [...landings.values()],
    positions,
    damageAt: new Map<string, number>(),
    tiles: state.tiles,
    pawns: state.pawns,
  }
  cache.set(cacheKey, reach)
  return reach
}

function maxDamage(attacker: Pawn, reach: Reach, target: Pawn): number {
  const at = key(target.q, target.r)
  const cached = reach.damageAt.get(at)
  if (cached !== undefined) return cached
  let damage = 0
  if (attacker.special.landingRange) {
    damage = reach.landings.some((from) => hexDist(from, target) === 1)
      ? attacker.attack.damage
      : 0
    reach.damageAt.set(at, damage)
    return damage
  }
  for (const { from, movementCost } of reach.positions)
    damage = Math.max(
      damage,
      abilityDamage(attacker, {
        target,
        from,
        movementCost,
        tiles: reach.tiles,
        pawns: reach.pawns,
      }),
    )
  reach.damageAt.set(at, damage)
  return damage
}

// Rune pickup is the only map mutation, and it always lands on a fresh copy, so a map's runes
// never change after the state holding the map is built.
const runesByMap = new WeakMap<Map<string, Tile>, Tile[]>()
function runeTiles(tiles: Map<string, Tile>): Tile[] {
  let runes = runesByMap.get(tiles)
  if (!runes)
    runesByMap.set(
      tiles,
      (runes = [...tiles.values()].filter((tile) => tile.feature === 'rune')),
    )
  return runes
}

export function estimateIncomingDamage(
  state: GameState,
  side: Side,
  cache: ReachCache,
): Map<number, number> {
  const targets = state.pawns.filter((p) => p.side === side)
  const damageByTarget = new Map(targets.map((p) => [p.id, 0]))
  const smallestHitByTarget = new Map<number, number>()
  const lastAttackerTurn = new Map<number, number>()
  const runes = runeTiles(state.tiles)
  const order = state.order
  const turnOffset = new Map(
    order.map((id, index) => [id, (index - state.active + order.length) % order.length]),
  )
  for (const foe of state.pawns.filter((p) => p.side !== side)) {
    const actsNextRound = order.indexOf(foe.id) < state.active
    if (actsNextRound && foe.hp <= 1 && inHellfire(state.hellfire, foe)) continue
    const attacker = foe.clone()
    attacker.energy = actsNextRound ? START_ENERGY : attacker.energy
    if (actsNextRound) attacker.specialUsed = false
    if (
      attacker.energy <= 0 ||
      attacker.specialUsed ||
      (attacker.energy < attacker.special.cost && !runes.length)
    )
      continue
    // Runes can extend movement, and custom threats such as Rush can be unbounded.
    const hasBoundedRange = attacker.special.landingRange || !attacker.special.threat
    const threatRange =
      !runes.length && hasBoundedRange
        ? Math.max(0, attacker.energy - attacker.special.cost - attacker.moveCost + 1) +
          (attacker.special.landingRange ?? 0) +
          attacker.attack.maxRange +
          (attacker.attack.rangeBonus ?? 0)
        : Infinity
    let reach: Reach | undefined
    // A target that acts before this attacker can move away or strike first, so only attackers
    // acting before the target's next turn threaten it.
    for (const target of targets) {
      if (turnOffset.get(foe.id)! >= turnOffset.get(target.id)!) continue
      if (hexDist(attacker, target) > threatRange) continue
      reach ??= reachOf(state, attacker, runes, cache)
      const damage = maxDamage(attacker, reach, target)
      damageByTarget.set(target.id, damageByTarget.get(target.id)! + damage)
      if (damage > 0) {
        smallestHitByTarget.set(
          target.id,
          Math.min(smallestHitByTarget.get(target.id) ?? Infinity, attacker.attack.damage),
        )
        lastAttackerTurn.set(
          target.id,
          Math.max(lastAttackerTurn.get(target.id) ?? 0, turnOffset.get(foe.id)!),
        )
      }
    }
  }
  for (const target of targets) {
    const guard = protectorFor(state.pawns, target)
    if (
      guard &&
      damageByTarget.get(guard.id)! < guard.hp &&
      turnOffset.get(guard.id)! > (lastAttackerTurn.get(target.id) ?? -1)
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
  const actedAt = new Map(settled.order.map((id, index) => [id, index]))
  let score = 0
  let survivingActor = actor
  for (const pawn of settled.pawns) {
    const allied = pawn.side === actor.side
    const hellfireDamage = Number(
      (actedAt.get(pawn.id) ?? -1) < settled.active && inHellfire(settled.hellfire, pawn),
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
  score += survivingActor.ai.goal(survivingActor, {
    allies: settled.pawns.filter((p) => p.side === actor.side && p.id !== actor.id),
    foes: settled.pawns.filter((p) => p.side !== actor.side),
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
      (tile) => passable(tile) && pawn.special.targets(pawn, state.pawns, tile).length > 0,
    ),
  )
}
