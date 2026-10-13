import { aimAt, attackTargets, enterTiles, pawnAt, specialTargets, strike } from '../combat.ts'
import { hexDist, key, passable, sameHex } from '../hex.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const phalanx: SpecialAbility = {
  name: 'phalanx',
  cost: 2,
  targeted: true,
  prompt: 'chooseEnemy',
  noTargets: 'noEnemiesInRange',
  description: 'phalanxDescription',
  reaches: (pawn, tile) => hexDist(pawn, tile) >= 1 && hexDist(pawn, tile) <= 2,
  targets: attackTargets,
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  perform: ({ pawn, pawns, tiles, tile, round, log }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.energy -= pawn.special.cost
    const impacts = [strike(pawns, pawn, target, pawn.attack, log)]
    const q = target.q - pawn.q
    const r = target.r - pawn.r
    if (
      (q === 0 || r === 0 || q + r === 0) &&
      pawns.includes(target) &&
      sameHex(impacts[0]!, target)
    ) {
      const beyond = tiles.get(
        key(target.q + Math.sign(target.q - pawn.q), target.r + Math.sign(target.r - pawn.r)),
      )
      if (
        beyond &&
        passable(beyond) &&
        hexDist(target, beyond) === 1 &&
        hexDist(pawn, beyond) === hexDist(pawn, target) + 1 &&
        !pawnAt(pawns, beyond)
      ) {
        impacts.push(...enterTiles(tiles, pawns, target, [beyond], round, log))
      }
    }
    return { kind: 'attack', to: { q: target.q, r: target.r }, impacts }
  },
}

export class Hoplite extends Pawn {
  static override readonly startsOnFrontRow = true
  static override readonly accent = '#4a8a8a'
  static override readonly icon =
    'M12 3a8 8 0 0 1 8 8v10H4V11a8 8 0 0 1 8-8Zm-3 8h1.5m3.5 0h1.5M12 3V1M8.5 3.5 7 1.5m8.5 2L17 1.5'
  static override readonly aiInstructions =
    'Thrust (2): 1 damage at distance 1-2; push the target one tile directly away when on a straight hex line and the tile is empty and passable. Once per activation.'
  readonly kind = 'hoplite' as const
  get maxHp(): number {
    return 5
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  get special(): SpecialAbility {
    return phalanx
  }
}
