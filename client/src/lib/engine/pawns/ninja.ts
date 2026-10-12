import {
  attackTargets,
  canUseSpecial,
  enterTiles,
  landingThreatenedTiles,
  pawnAt,
  specialTargets,
  strike,
} from '../combat.ts'
import type { Action } from '../engine.ts'
import { hexDist, key, passable } from '../hex.ts'
import type { Tile } from '../hex.ts'
import { defaultAi, type PawnAi } from '../pawn-ai.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

export function jumpDestinations(tiles: Map<string, Tile>, pawns: Pawn[], pawn: Pawn): Tile[] {
  if (pawn.special !== jump || !canUseSpecial(pawn)) return []
  const occupied = new Set(pawns.map((p) => key(p.q, p.r)))
  return [...tiles.values()].filter(
    (tile) =>
      passable(tile) &&
      (!occupied.has(key(tile.q, tile.r)) || hexDist(pawn, tile) === 0) &&
      hexDist(pawn, tile) <= 3 &&
      attackTargets(pawn, pawns, tile).length > 0,
  )
}

const jump: SpecialAbility = {
  name: 'jump',
  cost: 2,
  targeted: true,
  choosesDestination: true,
  movement: 'jump',
  landingRange: 3,
  noTargets: 'noEnemiesWithinReach',
  targetLabel: 'jumpTo',
  prompt: 'chooseTile',
  description: 'jumpDescription',
  reaches: (pawn, tile) => passable(tile) && hexDist(pawn, tile) <= 3,
  targets: attackTargets,
  threatenedTiles: landingThreatenedTiles,
  candidates: (pawn, { tiles, pawns }) =>
    jumpDestinations(tiles, pawns, pawn).flatMap((destination) =>
      attackTargets(pawn, pawns, destination).map((target): Action => ({
        type: 'special',
        target: { q: target.q, r: target.r },
        destination: { q: destination.q, r: destination.r },
      })),
    ),
  threat: (pawn, { target, from, movementCost, tiles, pawns }) => {
    if (!tiles || !pawns || pawn.energy - movementCost < pawn.special.cost) return 0
    return [...tiles.values()].some(
      (land) =>
        passable(land) &&
        hexDist(from, land) <= 3 &&
        hexDist(land, target) === 1 &&
        (land.terrain !== 'lava' || pawn.hp > 1) &&
        !pawns.some((p) => p.id !== pawn.id && p.q === land.q && p.r === land.r),
    )
      ? pawn.attack.damage
      : 0
  },
  tileTargets: (pawn, tiles, pawns) =>
    new Set(jumpDestinations(tiles, pawns, pawn).map((tile) => key(tile.q, tile.r))),
  perform: ({ pawn, tiles, pawns, tile, destination, round, log, random }) => {
    const target = tile && pawnAt(pawns, tile)
    if (
      !target ||
      !destination ||
      !jumpDestinations(tiles, pawns, pawn).some(
        (land) => land.q === destination.q && land.r === destination.r,
      ) ||
      !specialTargets(pawns, pawn, destination).includes(target)
    )
      return null
    pawn.energy -= pawn.special.cost
    const impacts = enterTiles(
      tiles,
      pawns,
      pawn,
      hexDist(pawn, destination) === 0 ? [] : [tiles.get(key(destination.q, destination.r))!],
      round,
      log,
    )
    if (pawn.hp > 0) impacts.push(strike(pawns, pawn, target, pawn.attack, log, random))
    return { kind: 'attack', to: { q: target.q, r: target.r }, impacts }
  },
}

const BACKLINE_REACH = 6
const MIN_CAUTION = 0.7

// A one-health assassin stays cautious whatever the temperament, and hunts ranged units and kings
// it can strike next turn.
const ninjaAi: PawnAi = {
  ...defaultAi,
  risk: (ninja, threat) =>
    defaultAi.risk(ninja, { ...threat, caution: Math.max(MIN_CAUTION, threat.caution) }),
  goal: (ninja, surroundings) =>
    defaultAi.goal(ninja, surroundings) +
    surroundings.foes.filter(
      (foe) => hexDist(ninja, foe) === 1 && (foe.attack.maxRange > 1 || foe.kind === 'king'),
    ).length *
      BACKLINE_REACH,
}

export class Ninja extends Pawn {
  static override readonly accent = '#5a6578'
  static override readonly icon =
    'M4 9a8 8 0 0 1 16 0v6a8 8 0 0 1-16 0V9Zm0 0h16M4 15h16M7 12h2m6 0h2M4 9 1 5m3 4L1 12'
  static override readonly aiInstructions =
    'Ambush (2): jump up to 3 tiles over terrain and units to empty passable ground, then choose an adjacent enemy and strike for 3. May stay in place. 1 hp; once per activation.'
  readonly kind = 'ninja' as const
  get maxHp(): number {
    return 1
  }
  readonly attack: AttackProfile = { damage: 3, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return jump
  }
  override get ai(): PawnAi {
    return ninjaAi
  }
}
