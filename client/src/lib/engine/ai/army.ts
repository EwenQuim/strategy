import type { GameState } from '../engine.ts'
import { hexDist, key } from '../hex.ts'
import { inHellfire } from '../hellfire.ts'
import type { Pawn, Side } from '../pawns/index.ts'
import { distancesToAttack, estimateIncomingDamage, type ReachCache } from './evaluate.ts'

export type ArmyWeights = { aggression: number; caution: number }
export type ArmyCache = {
  reach: ReachCache
  distances: WeakMap<GameState['tiles'], Map<string, Map<string, number>>>
}

const WIN_SCORE = 1_000_000

function attackDistances(state: GameState, pawn: Pawn, cache: ArmyCache): Map<string, number> {
  const foes = state.pawns.filter((p) => p.side !== pawn.side)
  const signature = `${pawn.kind}:${pawn.side}:${foes.map((p) => `${p.id}:${p.q}:${p.r}`).join('|')}`
  let byArmy = cache.distances.get(state.tiles)
  if (!byArmy) cache.distances.set(state.tiles, (byArmy = new Map()))
  let distances = byArmy.get(signature)
  if (!distances) {
    distances = distancesToAttack(state, pawn)
    byArmy.set(signature, distances)
  }
  return distances
}

// Score both armies, not the pawn that happened to start the search. Cheap ordering and
// tactical scoring share the same positional terms; only the latter computes threats.
export function evaluateArmy(
  state: GameState,
  side: Side,
  weights: ArmyWeights,
  cache: ArmyCache,
  tactical = true,
): number {
  if (state.winner)
    return state.winner === 'draw' ? 0 : state.winner === side ? WIN_SCORE : -WIN_SCORE
  const danger = tactical
    ? {
        player: estimateIncomingDamage(state, 'player', cache.reach),
        enemy: estimateIncomingDamage(state, 'enemy', cache.reach),
      }
    : null
  let score = 0
  for (const pawn of state.pawns) {
    const allied = pawn.side === side
    const allies = state.pawns.filter((p) => p.side === pawn.side && p.id !== pawn.id)
    const foes = state.pawns.filter((p) => p.side !== pawn.side)
    const burns =
      state.order.indexOf(pawn.id) < state.active && inHellfire(state.hellfire, pawn)
    const health = pawn.hp - Number(burns)
    let value = health > 0 ? pawn.ai.value(pawn, health) : 0
    // Preserve future attacking capacity, not just HP: removing a signature matters.
    if (health > 0 && pawn.kind !== 'king') value += 6
    const distance = tactical
      ? attackDistances(state, pawn, cache).get(key(pawn.q, pawn.r))
      : Math.min(...foes.map((foe) => Math.max(0, hexDist(pawn, foe) - pawn.attack.maxRange)))
    value +=
      pawn.ai.goal(pawn, {
        allies,
        foes,
        attackDistance: Math.min(distance ?? 12, 12),
        aggression: (allied ? weights.aggression : 1) * 0.35,
      }) * (pawn.kind === 'king' ? 0.25 : 1)
    if (danger && allied) {
      value -= pawn.ai.risk(pawn, {
        incoming: danger[pawn.side].get(pawn.id) ?? 0,
        health,
        hellfireDamage: Number(burns),
        value: health > 0 ? pawn.ai.value(pawn, health) + 6 : 0,
        caution: allied ? weights.caution : 1,
      })
    }
    if (health <= 0 && pawn.kind === 'king') value -= WIN_SCORE / 2
    // A guard is valuable while it covers a real ally; rollouts decide whether it survives.
    const protectedPawn = allies.find((p) => p.id === pawn.protectingId)
    if (protectedPawn) value += protectedPawn.kind === 'king' ? 10 : 4
    value += pawn.bonusEnergy * 3
    const tile = state.tiles.get(key(pawn.q, pawn.r))
    if (tile?.feature === 'spring' && pawn.hp < pawn.maxHp) value += 3
    if (pawn.kind === 'archer' && tile?.feature === 'watchtower') value += 2
    // Reward pressure on the crown only when the unit can actually participate.
    const king = foes.find((p) => p.kind === 'king')
    if (king && distance !== undefined && distance <= 2)
      value += Math.max(0, 4 - hexDist(pawn, king)) * 2
    score += allied ? value : -value
  }
  return score
}
