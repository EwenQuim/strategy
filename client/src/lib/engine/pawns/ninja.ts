import {
  advanceAndStrike,
  attackTargets,
  canUseSpecial,
  landingThreatenedTiles,
  pawnAt,
  specialTargets,
} from '../combat.ts'
import type { Action } from '../engine.ts'
import { hexDist, key, passable, sameHex } from '../hex.ts'
import type { Tile } from '../hex.ts'
import { defaultAi, type PawnAi } from '../pawn-ai.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

export function jumpDestinations(tiles: Map<string, Tile>, pawns: Pawn[], pawn: Pawn): Tile[] {
  if (!canUseSpecial(pawn)) return []
  const occupied = new Set(pawns.map((p) => key(p.q, p.r)))
  return [...tiles.values()].filter(
    (tile) =>
      passable(tile) &&
      hexDist(pawn, tile) <= 3 &&
      // Staying in place is a landing only to strike from it: a jump onto itself does nothing.
      (!occupied.has(key(tile.q, tile.r)) ||
        (hexDist(pawn, tile) === 0 && attackTargets(pawn, pawns, tile).length > 0)),
  )
}

const jump: SpecialAbility = {
  name: 'jump',
  cost: 2,
  targeted: true,
  targetOptional: true,
  choosesDestination: true,
  movement: 'jump',
  landingRange: 3,
  targetLabel: 'jumpTo',
  prompt: 'chooseTile',
  description: 'jumpDescription',
  reaches: (pawn, tile) => passable(tile) && hexDist(pawn, tile) <= 3,
  targets: attackTargets,
  threatenedTiles: landingThreatenedTiles,
  candidates: (pawn, { tiles, pawns }) =>
    jumpDestinations(tiles, pawns, pawn).flatMap((destination) => {
      const attacks = attackTargets(pawn, pawns, destination).map((target): Action => ({
        type: 'special',
        target: { q: target.q, r: target.r },
        destination: { q: destination.q, r: destination.r },
      }))
      if (attacks.length > 0) return attacks
      return [{ type: 'special', destination: { q: destination.q, r: destination.r } }]
    }),
  threat: (pawn, { target, from, movementCost, tiles, pawns }) => {
    if (!tiles || !pawns || pawn.energy - movementCost < pawn.special.cost) return 0
    return [...tiles.values()].some(
      (land) =>
        passable(land) &&
        hexDist(from, land) <= 3 &&
        hexDist(land, target) === 1 &&
        (land.terrain !== 'lava' || pawn.hp > 1) &&
        !pawns.some((p) => p.id !== pawn.id && sameHex(p, land)),
    )
      ? pawn.attack.damage
      : 0
  },
  tileTargets: (pawn, tiles, pawns) =>
    new Set(jumpDestinations(tiles, pawns, pawn).map((tile) => key(tile.q, tile.r))),
  perform: (context) => {
    const { pawn, tiles, pawns, tile, destination } = context
    const target = tile && pawnAt(pawns, tile)

    if (
      !destination ||
      (sameHex(pawn, destination) && !tile) ||
      !jumpDestinations(tiles, pawns, pawn).some((land) => sameHex(land, destination)) ||
      (tile && (!target || !specialTargets(pawns, pawn, destination).includes(target)))
    )
      return null
    const path =
      hexDist(pawn, destination) === 0 ? [] : [tiles.get(key(destination.q, destination.r))!]
    const impacts = advanceAndStrike(context, path, target)
    return {
      kind: target && pawn.hp > 0 ? 'attack' : 'move',
      to: target && pawn.hp > 0 ? { q: target.q, r: target.r } : destination,
      ...(impacts.length ? { impacts } : {}),
    }
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
    'Ambush (2): jump up to 3 tiles over terrain and units to empty passable ground, striking an adjacent enemy for 3 if present. May stay in place to strike. 1 hp; once per activation.'
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
