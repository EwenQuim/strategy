import { aimAt, canUseSpecial, enterTiles, label } from '../combat.ts'
import { key, passable, type Axial, type Tile } from '../hex.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

// The six straight lines of a hex grid: a dash runs along one of them until something blocks it.
const LINES: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
]

export function dashDestinations(tiles: Map<string, Tile>, pawns: Pawn[], pawn: Pawn): Tile[] {
  if (pawn.special !== dash || !canUseSpecial(pawn)) return []
  const occupied = new Set(pawns.map((p) => key(p.q, p.r)))
  const destinations: Tile[] = []
  for (const [dq, dr] of LINES) {
    for (let q = pawn.q + dq, r = pawn.r + dr; ; q += dq, r += dr) {
      const tile = tiles.get(key(q, r))
      if (!tile || !passable(tile) || occupied.has(key(q, r))) break
      destinations.push(tile)
    }
  }
  return destinations
}

// The tiles a dash crosses on its way to a landing tile, or null when the landing is not on one
// of the six straight lines.
function dashPath(pawn: Pawn, tiles: Map<string, Tile>, landing: Axial): Tile[] | null {
  const [dq, dr] = [landing.q - pawn.q, landing.r - pawn.r]
  const line = LINES.find(([lq, lr]) => lq === Math.sign(dq) && lr === Math.sign(dr))
  if (!line || !(dq === 0 || dr === 0 || dq + dr === 0)) return null
  const path: Tile[] = []
  for (let q = pawn.q + line[0], r = pawn.r + line[1]; ; q += line[0], r += line[1]) {
    const tile = tiles.get(key(q, r))
    if (!tile) return null
    path.push(tile)
    if (q === landing.q && r === landing.r) return path
  }
}

const dash: SpecialAbility = {
  name: 'dash',
  cost: 2,
  targeted: true,
  targetLabel: 'dashTo',
  prompt: 'chooseTile',
  description: 'dashDescription',
  noTargets: 'noOpenLine',
  reaches: (pawn, tile, tiles) => dashPath(pawn, tiles, tile) !== null,
  targets: () => [],
  tileTargets: (pawn, tiles, pawns) =>
    new Set(dashDestinations(tiles, pawns, pawn).map((tile) => key(tile.q, tile.r))),
  candidates: (pawn, { tiles, pawns }) => dashDestinations(tiles, pawns, pawn).map(aimAt),
  perform: ({ pawn, tiles, pawns, tile, round, log, spawn }) => {
    if (!tile) return null
    const path = dashDestinations(tiles, pawns, pawn).some(
      (dest) => dest.q === tile.q && dest.r === tile.r,
    )
      ? dashPath(pawn, tiles, tile)
      : null
    if (!path) return null
    pawn.paySpecial()
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    const impacts = enterTiles(tiles, pawns, pawn, path, round, log, spawn)
    return {
      kind: 'move',
      to: { q: tile.q, r: tile.r },
      ...(impacts.length ? { impacts } : {}),
    }
  },
}

export class Lancer extends Pawn {
  static override readonly accent = '#6b8fc9'
  static override readonly icon =
    'M5 19 17 7M17 7l2.5-4.5L15 5l2 2ZM8.5 15.5l-4 4M12 12l-2.5 1 1 2.5'
  static override readonly aiInstructions =
    'melee, 1 damage at distance 1-2. Dash (2): run in a straight line, any distance until blocked, landing on empty ground; it collects ground effects along the way.'
  readonly kind = 'lancer' as const
  get maxHp(): number {
    return 3
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  // Momentum: every banked energy point adds 1 damage to the lancer's basic attacks.
  override adrenalineDamage(): number {
    return this.adrenaline
  }
  get special(): SpecialAbility {
    return dash
  }
}
