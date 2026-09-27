import { activePawn, reducer, type GameState } from './engine.ts'
import { inHellfire } from './hellfire.ts'
import { canAttack, walkingPaths, protectorFor } from './combat.ts'
import { distFrom, key, passable } from './hex.ts'
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

const SCORE = { victory: 1_000_000, hellfireDamage: 24 }

export function evaluatePosition(
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
    const value = health <= 0 ? 0 : pawn.ai.value(pawn, health)
    score += allied ? value : -value
    if (!allied) continue
    const incoming = danger.get(pawn.id) ?? 0
    score -= hellfireDamage * SCORE.hellfireDamage
    score -= pawn.ai.risk(pawn, { incoming, health, hellfireDamage, value, caution })
  }
  const pawn = settled.pawns.find((p) => p.id === actor.id) ?? actor
  const allies = settled.pawns.filter((p) => p.side === pawn.side && p.id !== pawn.id)
  score += pawn.ai.goal(pawn, { allies, attackDistance: distance.get(key(pawn.q, pawn.r)) })
  return score
}

export function distancesToAttack(state: GameState, pawn: Pawn): Map<string, number> {
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
