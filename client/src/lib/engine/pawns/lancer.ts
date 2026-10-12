import { aimAt, canUseSpecial, enterTiles, strike } from '../combat.ts'
import { hexDist, key, passable, type Axial, type Tile } from '../hex.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const LINES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
] as const

function sprints(
  pawn: Pawn,
  tiles: Map<string, Tile>,
  pawns: readonly Pawn[],
  from: Axial = pawn,
) {
  return LINES.flatMap(([dq, dr]) => {
    const landings: { tile: Tile; path: Tile[]; target?: Pawn }[] = []
    const path: Tile[] = []
    for (let q = from.q + dq, r = from.r + dr; ; q += dq, r += dr) {
      const tile = tiles.get(key(q, r))
      if (!tile || !passable(tile)) break
      const occupant = pawns.find((p) => p.id !== pawn.id && p.q === q && p.r === r)
      if (occupant) {
        if (occupant.side !== pawn.side && landings.length)
          landings[landings.length - 1]!.target = occupant
        break
      }
      path.push(tile)
      landings.push({ tile, path: [...path] })
    }
    return landings
  })
}

function dashDestinations(tiles: Map<string, Tile>, pawns: Pawn[], pawn: Pawn): Tile[] {
  return canUseSpecial(pawn) ? sprints(pawn, tiles, pawns).map(({ tile }) => tile) : []
}

const dash: SpecialAbility = {
  name: 'dash',
  cost: 2,
  targeted: true,
  targetLabel: 'dashTo',
  prompt: 'chooseTile',
  description: 'dashDescription',
  noTargets: 'noOpenLine',
  reaches: (pawn, tile) => {
    const q = tile.q - pawn.q,
      r = tile.r - pawn.r
    return !!(q || r) && (q === 0 || r === 0 || q + r === 0)
  },
  targets: (pawn, pawns, from = pawn) =>
    pawns.filter((p) => {
      const q = p.q - from.q,
        r = p.r - from.r
      return p.side !== pawn.side && hexDist(from, p) > 1 && (q === 0 || r === 0 || q + r === 0)
    }),
  tileTargets: (pawn, tiles, pawns) =>
    new Set(dashDestinations(tiles, pawns, pawn).map((tile) => key(tile.q, tile.r))),
  candidates: (pawn, { tiles, pawns }) => dashDestinations(tiles, pawns, pawn).map(aimAt),
  threatenedTiles: (pawn, tiles, pawns) => {
    const threatened = new Set<string>()
    const occupied = new Set(pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)))
    for (const [dq, dr] of LINES) {
      let damage = 0
      for (let step = 1; ; step++) {
        const at = key(pawn.q + dq * step, pawn.r + dr * step)
        const tile = tiles.get(at)
        if (!tile || !passable(tile)) break
        // A hypothetical enemy can be hit only after a surviving, empty sprint landing.
        if (step > 1 && damage < pawn.hp) threatened.add(at)
        if (occupied.has(at)) break
        damage += Number(tile.terrain === 'lava')
        if (damage >= pawn.hp) break
      }
    }
    return threatened
  },
  threat: (pawn, { target, from, tiles, pawns }) => {
    if (!tiles || !pawns) return 0
    const occupants = [
      ...pawns.filter((p) => p.id !== target.id && (p.q !== target.q || p.r !== target.r)),
      target,
    ]
    return sprints(pawn, tiles, occupants, from).some(
      (sprint) =>
        sprint.target === target &&
        sprint.path.filter((tile) => tile.terrain === 'lava').length < pawn.hp,
    )
      ? pawn.attack.damage
      : 0
  },
  perform: ({ pawn, tiles, pawns, tile, round, log, random }) => {
    const sprint =
      tile &&
      sprints(pawn, tiles, pawns).find(
        (entry) => entry.tile.q === tile.q && entry.tile.r === tile.r,
      )
    if (!sprint) return null
    pawn.energy -= pawn.special.cost
    const impacts = enterTiles(tiles, pawns, pawn, sprint.path, round, log)
    if (pawn.hp > 0 && sprint.target)
      impacts.push(strike(pawns, pawn, sprint.target, pawn.attack, log, random))
    return {
      kind: sprint.target ? 'attack' : 'move',
      to: sprint.target ?? sprint.tile,
      ...(impacts.length ? { impacts } : {}),
    }
  },
}

export class Lancer extends Pawn {
  static override readonly accent = '#6b8fc9'
  static override readonly icon =
    'M5 19 17 7M17 7l2.5-4.5L15 5l2 2ZM8.5 15.5l-4 4M12 12l-2.5 1 1 2.5'
  static override readonly aiInstructions =
    'Rush (2): sprint any distance to an empty tile along a clear hex line. Automatically strike for 2 if an enemy is immediately ahead in the sprint direction. Hitting is optional, no sideways strikes; terrain, gaps and units block movement. Once per activation.'
  readonly kind = 'lancer' as const
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return dash
  }
}
