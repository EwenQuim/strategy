import { aimAt, canUseSpecial, label, pawnAt } from '../combat.ts'
import { hexDist, key, passable, type Tile } from '../hex.ts'
import type { Action, GameState } from '../engine.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

function summonTiles(pawn: Pawn, tiles: Map<string, Tile>, pawns: Pawn[]): Tile[] {
  return [...tiles.values()].filter(
    (tile) => hexDist(pawn, tile) === 1 && passable(tile) && !pawnAt(pawns, tile),
  )
}

// Repeatable on purpose: while energy lasts, a Necromancer can flood the field with skeletons.
const summon: SpecialAbility = {
  name: 'summon',
  cost: 2,
  targeted: true,
  targetLabel: 'summonTo',
  prompt: 'chooseTile',
  description: 'summonDescription',
  noTargets: 'noSpaceToSummon',
  reaches: (pawn, tile) => hexDist(pawn, tile) === 1,
  targets: () => [],
  tileTargets: (pawn, tiles, pawns) =>
    canUseSpecial(pawn)
      ? new Set(summonTiles(pawn, tiles, pawns).map((tile) => key(tile.q, tile.r)))
      : new Set<string>(),
  candidates: (pawn, state: GameState): Action[] =>
    canUseSpecial(pawn) ? summonTiles(pawn, state.tiles, state.pawns).map(aimAt) : [],
  perform: ({ pawn, tiles, pawns, tile, log, spawn }) => {
    if (!tile) return null
    const target = tiles.get(key(tile.q, tile.r))
    if (!target || !passable(target) || pawnAt(pawns, tile) || hexDist(pawn, tile) !== 1)
      return null
    pawn.energy -= pawn.specialCost
    pawn.specialUsed = true
    const skeleton = spawn('skeleton', pawn.side, tile.q, tile.r, { energy: 1 })
    if (!skeleton) return null
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    log.push('A skeleton rises for ' + (pawn.side === 'player' ? 'you' : 'the enemy') + '.')
    return { kind: 'summon', to: { q: tile.q, r: tile.r } }
  },
}

export class Necromancer extends Pawn {
  static override readonly accent = '#8a7bb5'
  static override readonly icon =
    'M12 3a7 7 0 0 0-7 7c0 2.6 1.6 4.6 3 5.6V19h8v-3.4c1.4-1 3-3 3-5.6a7 7 0 0 0-7-7ZM9.5 11h.01M14.5 11h.01M10 15.5h4M4 4l2 2M20 4l-2 2'
  static override readonly aiInstructions =
    'ranged, 1 damage at distance 1-2. Summon (2): spawn a skeleton (2 health, 1 damage, stronger beside other skeletons) on an adjacent empty tile; repeatable while energy lasts.'
  readonly kind = 'necromancer' as const
  get maxHp(): number {
    return 3
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  // Channel: every banked energy point makes Summon cheaper, down to 1.
  override get specialCost(): number {
    return Math.max(1, this.special.cost - this.adrenaline)
  }
  get special(): SpecialAbility {
    return summon
  }
}
