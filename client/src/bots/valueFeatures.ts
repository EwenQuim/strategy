import type { GameState } from '../lib/engine/engine.ts'
import { abilityDamage } from '../lib/engine/combat.ts'
import { hexDist, key } from '../lib/engine/hex.ts'
import { hazardDamage } from '../lib/engine/hazards.ts'
import { PAWN_CLASSES, type Side } from '../lib/engine/pawns/index.ts'
import { estimateIncomingDamage, type ReachCache } from '../lib/engine/ai/evaluate.ts'

// Antisymmetric, size-independent features. No seed, pawn id or training map identity is input.
export const VALUE_FEATURES = [
  'kingHealth',
  'kingCritical',
  'material',
  'soldierHealth',
  'kingExposure',
  'soldierExposure',
  'soldierLethal',
  'kingPressure',
  'directDamage',
  'focusFire',
  'development',
  'kingDistance',
  'protection',
  'energy',
  'spring',
  'tower',
  'hellfire',
  ...Object.keys(PAWN_CLASSES)
    .filter((kind) => kind !== 'king')
    .map((kind) => `units:${kind}`),
] as const

export type ValueCache = { reach: ReachCache }

export function valueFeatures(
  state: GameState,
  side: Side,
  cache: ValueCache,
  tactical = true,
): number[] {
  const danger = tactical
    ? {
        player: estimateIncomingDamage(state, 'player', cache.reach),
        enemy: estimateIncomingDamage(state, 'enemy', cache.reach),
      }
    : null
  const extract = (owner: Side): number[] => {
    const army = state.pawns.filter((p) => p.side === owner)
    const foes = state.pawns.filter((p) => p.side !== owner)
    const king = army.find((p) => p.kind === 'king')!
    const enemyKing = foes.find((p) => p.kind === 'king')!
    const soldiers = army.filter((p) => p.kind !== 'king')
    const kingHit = danger?.[owner].get(king.id) ?? 0
    const hits = foes.map((target) =>
      army.reduce(
        (sum, pawn) =>
          sum +
          abilityDamage(pawn, {
            target,
            from: state.tiles.get(key(pawn.q, pawn.r)) ?? pawn,
            movementCost: 0,
            tiles: state.tiles,
            pawns: state.pawns,
          }),
        0,
      ),
    )
    return [
      king.hp / 7,
      Math.max(0, 4 - king.hp) / 3,
      soldiers.reduce((sum, p) => sum + p.ai.value(p, p.hp), 0) / 100,
      soldiers.reduce((sum, p) => sum + p.hp / p.maxHp, 0) / 5,
      Math.min(king.hp, kingHit) / 7,
      soldiers.reduce((sum, p) => sum + Math.min(p.hp, danger?.[owner].get(p.id) ?? 0), 0) / 10,
      soldiers.filter((p) => (danger?.[owner].get(p.id) ?? 0) >= p.hp).length / 5,
      Math.max(0, kingHit - king.hp + 1) / 3,
      hits.reduce((sum, hit) => sum + hit, 0) / 10,
      foes.filter((p, i) => hits[i] >= p.hp).length / 5,
      -soldiers.reduce(
        (sum, p) =>
          sum +
          Math.min(
            12,
            Math.max(0, Math.min(...foes.map((foe) => hexDist(p, foe))) - p.attack.maxRange),
          ),
        0,
      ) / Math.max(1, soldiers.length * 12),
      -Math.min(16, hexDist(king, enemyKing)) / 16,
      army.filter((p) => p.protectingId !== null).length / 3,
      army.reduce((sum, p) => sum + p.bonusEnergy, 0) / 6,
      army.filter((p) => p.hp < p.maxHp && state.tiles.get(key(p.q, p.r))?.feature === 'spring')
        .length / 3,
      army.filter(
        (p) => p.kind === 'archer' && state.tiles.get(key(p.q, p.r))?.feature === 'watchtower',
      ).length / 3,
      army.filter(
        (p) => state.order.indexOf(p.id) < state.active && hazardDamage(state.hazards, p) > 0,
      ).length / 5,
      ...Object.keys(PAWN_CLASSES)
        .filter((kind) => kind !== 'king')
        .map((kind) => soldiers.filter((p) => p.kind === kind).length / 5),
    ]
  }
  if (state.winner) return Array(VALUE_FEATURES.length).fill(0)
  const own = extract(side),
    opponent = extract(side === 'player' ? 'enemy' : 'player')
  return own.map((value, index) => value - opponent[index])
}

export function outcome(state: GameState, side: Side): number | null {
  if (!state.winner) return null
  return state.winner === 'draw' ? 0.5 : state.winner === side ? 1 : 0
}
