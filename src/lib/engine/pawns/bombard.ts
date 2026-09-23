import { aimAt, label, strike } from '../combat.ts'
import { hexDist, key, neighbors, passable } from '../hex.ts'
import type { Axial, Tile } from '../types.ts'
import { Pawn, type AttackProfile, type SpecialAbility } from './pawn.ts'

const RANGE = 4
const DIRS = neighbors(0, 0)

function lineFrom(tiles: Map<string, Tile>, origin: Axial, dir: Axial): string[] {
  const line: string[] = []
  for (let step = 1; step <= RANGE; step++) {
    const k = key(origin.q + dir.q * step, origin.r + dir.r * step)
    const tile = tiles.get(k)
    if (!tile || !passable(tile)) break
    line.push(k)
  }
  return line
}

function aimTiles(tiles: Map<string, Tile>, pawn: Pawn): string[] {
  return DIRS.map((dir) => key(pawn.q + dir.q, pawn.r + dir.r)).filter((k) => {
    const tile = tiles.get(k)
    return !!tile && passable(tile)
  })
}

const barrage: SpecialAbility = {
  name: 'Barrage',
  cost: 2,
  targeted: true,
  targetLabel: 'Aim along',
  prompt: 'Choose a direction',
  noTargets: 'Nowhere to aim',
  description:
    'Turn one: spend the turn aiming down a straight line (up to 4 tiles), stopping at mountains and lakes. Next turn: fire and hit every enemy on that line. The line is telegraphed while charging.',
  targets: (pawn, pawns) =>
    pawns.filter((p) => p.side !== pawn.side && hexDist(pawn, p) <= RANGE),
  tileTargets: (pawn, tiles) => new Set((pawn as Bombard).barrageLine ?? aimTiles(tiles, pawn)),
  candidates: (pawn, { tiles }) =>
    ((pawn as Bombard).barrageLine ?? aimTiles(tiles, pawn)).map((k) => {
      const tile = tiles.get(k)!
      return aimAt(tile)
    }),
  perform: ({ pawn, tiles, pawns, log, random, tile }) => {
    const self = pawn as Bombard
    if (self.barrageLine) {
      const line = self.barrageLine
      self.barrageLine = null
      pawn.energy -= pawn.special.cost
      log.push(label(pawn) + ' fires the Barrage.')
      const profile = { ...pawn.attack, ignoresEscape: true }
      const impacts = pawns
        .filter((p) => p.side !== pawn.side && line.includes(key(p.q, p.r)))
        .map((enemy) => strike(pawns, pawn, enemy, profile, log, random))
      const [q, r] = line[line.length - 1].split(',').map(Number)
      return { kind: 'fireball', to: { q, r }, impacts }
    }
    if (!tile) return null
    const dir = DIRS.find((d) => pawn.q + d.q === tile.q && pawn.r + d.r === tile.r)
    if (!dir) return null
    const line = lineFrom(tiles, pawn, dir)
    if (!line.length) return null
    self.barrageLine = line
    pawn.energy = 0
    log.push(label(pawn) + ' aims a Barrage.')
    const [q, r] = line[line.length - 1].split(',').map(Number)
    return { kind: 'attack', to: { q, r } }
  },
}

export class Bombard extends Pawn {
  static override readonly icon = 'M4 16a4 4 0 1 0 8 0 4 4 0 0 0-8 0Zm8-3 7-5m-2-2 3 1v3'
  readonly kind = 'bombard' as const
  barrageLine: string[] | null = null
  get maxHp(): number {
    return 4
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  get special(): SpecialAbility {
    return barrage
  }
}
