import { aimAt, canUseSpecial, label, pawnAt } from '../combat.ts'
import { hexDist, key, passable, type Tile } from '../hex.ts'
import type { Action, GameState } from '../engine.ts'
import { Pawn, type AttackProfile, type SpecialAbility, type Unit } from './pawn.ts'

// The corpse a Raise pulls back: the most recently struck-down unit that is not a king.
export const raisable = (fallen: readonly Unit[]): Unit | undefined =>
  fallen.filter((unit) => unit.kind !== 'king').at(-1)

function raiseTiles(pawn: Pawn, tiles: Map<string, Tile>, pawns: Pawn[]): Tile[] {
  return [...tiles.values()].filter(
    (tile) => hexDist(pawn, tile) === 1 && passable(tile) && !pawnAt(pawns, tile),
  )
}

const raise: SpecialAbility = {
  name: 'raise',
  cost: 3,
  targeted: true,
  oncePerRound: true,
  targetLabel: 'raiseTo',
  prompt: 'chooseTile',
  description: 'raiseDescription',
  noTargets: 'noFallenToRaise',
  reaches: (pawn, tile) => hexDist(pawn, tile) === 1,
  targets: () => [],
  tileTargets: (pawn, tiles, pawns, state: GameState) =>
    canUseSpecial(pawn) && raisable(state.blows.flatMap((blow) => blow.fallen))
      ? new Set(raiseTiles(pawn, tiles, pawns).map((tile) => key(tile.q, tile.r)))
      : new Set<string>(),
  candidates: (pawn, state): Action[] =>
    canUseSpecial(pawn) && raisable(state.blows.flatMap((blow) => blow.fallen))
      ? raiseTiles(pawn, state.tiles, state.pawns).map(aimAt)
      : [],
  perform: ({ pawn, tiles, pawns, tile, log, fallen, spawn }) => {
    if (!tile) return null
    const target = tiles.get(key(tile.q, tile.r))
    if (!target || !passable(target) || pawnAt(pawns, tile) || hexDist(pawn, tile) !== 1)
      return null
    const corpse = raisable(fallen)
    if (!corpse) return null
    pawn.energy -= pawn.specialCost
    pawn.specialUsed = true
    const raised = spawn(corpse.kind, pawn.side, tile.q, tile.r, { hp: 1, energy: 1 })
    if (!raised) return null
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    log.push(
      'A ' +
        corpse.kind +
        ' rises from the dead for ' +
        (pawn.side === 'player' ? 'you' : 'the enemy') +
        '.',
    )
    return { kind: 'raise', to: { q: tile.q, r: tile.r } }
  },
}

export class Necromancer extends Pawn {
  static override readonly accent = '#8a7bb5'
  static override readonly icon =
    'M12 3a7 7 0 0 0-7 7c0 2.6 1.6 4.6 3 5.6V19h8v-3.4c1.4-1 3-3 3-5.6a7 7 0 0 0-7-7ZM9.5 11h.01M14.5 11h.01M10 15.5h4M4 4l2 2M20 4l-2 2'
  static override readonly aiInstructions =
    'ranged, 1 damage at distance 1-2. Raise (3): the most recently fallen non-king unit returns at 1 health on an adjacent empty tile, on your side; once per round.'
  readonly kind = 'necromancer' as const
  get maxHp(): number {
    return 3
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  // Channel: every banked energy point makes Raise cheaper, down to 1.
  override get specialCost(): number {
    return Math.max(1, this.special.cost - this.adrenaline)
  }
  get special(): SpecialAbility {
    return raise
  }
}
