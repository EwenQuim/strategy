import { hexDist, key, neighbors, passable, type Axial, type Tile } from './hex.ts'
import type { AttackProfile, Pawn } from './pawns/index.ts'
import type { SeededRandom } from './random.ts'
import type { Action } from './engine.ts'

export type BattleImpact = Axial & { damage: number }

type WalkingPath = { path: Tile[]; damage: number }

export function walkingPaths(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
  maxSteps = Math.max(0, pawn.energy - pawn.moveCost + 1),
): Map<string, WalkingPath> {
  const occupied = new Set(pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)))
  const start = key(pawn.q, pawn.r)
  const paths = new Map<string, WalkingPath>([[start, { path: [], damage: 0 }]])
  const leastDamage = new Map([[start, 0]])
  let frontier = [{ position: pawn as Axial, path: [] as Tile[], damage: 0 }]
  for (let step = 1; step <= maxSteps && frontier.length; step++) {
    const next: typeof frontier = []
    for (const current of frontier) {
      for (const position of neighbors(current.position.q, current.position.r)) {
        const k = key(position.q, position.r)
        const tile = tiles.get(k)
        if (!tile || !passable(tile) || occupied.has(k)) continue
        const damage = current.damage + Number(tile.terrain === 'lava')
        if (damage >= (leastDamage.get(k) ?? Infinity)) continue
        leastDamage.set(k, damage)
        const path = [...current.path, tile]
        const previous = paths.get(k)
        if (!previous || path.length === previous.path.length || previous.damage >= pawn.hp)
          paths.set(k, { path, damage })
        if (damage < pawn.hp) next.push({ position: tile, path, damage })
      }
    }
    frontier = next
  }
  return paths
}

export function enterTiles(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
  path: Tile[],
  round: number,
  log: string[],
): BattleImpact[] {
  const impacts: BattleImpact[] = []
  for (const tile of path) {
    pawn.q = tile.q
    pawn.r = tile.r
    pawn.springSince = tile.feature === 'spring' ? round : null
    if (tile.terrain === 'lava') {
      pawn.hp--
      impacts.push({ q: tile.q, r: tile.r, damage: 1 })
      log.push(label(pawn) + ' takes 1 lava damage.')
      if (pawn.hp <= 0) {
        pawns.splice(pawns.indexOf(pawn), 1)
        log.push(label(pawn) + ' has fallen.')
        break
      }
    }
    if (tile.feature === 'rune') {
      pawn.energy += 2
      pawn.bonusEnergy += 2
      tiles.set(key(tile.q, tile.r), { q: tile.q, r: tile.r, terrain: tile.terrain })
      log.push(label(pawn) + ' collects a power rune: +2 energy this round.')
    }
  }
  return impacts
}

export function movementDestinations(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
): Map<string, number> {
  return new Map(
    [...walkingPaths(tiles, pawns, pawn)].map(([tile, route]) => [
      tile,
      pawn.moveEnergyCost(route.path.length),
    ]),
  )
}

export function protectorFor(pawns: Pawn[], target: Pawn): Pawn | undefined {
  return pawns.find(
    (p) =>
      p.protectingId === target.id &&
      p.side === target.side &&
      p.id !== target.id &&
      p.special.targets(p, [target]).length > 0,
  )
}

export function canAttack(pawn: Pawn, target: Pawn, from: Axial = pawn): boolean {
  const distance = hexDist(from, target)
  const bonus =
    'feature' in from && from.feature === 'watchtower' ? (pawn.attack.rangeBonus ?? 0) : 0
  return (
    pawn.side !== target.side &&
    distance >= pawn.attack.minRange &&
    distance <= pawn.attack.maxRange + bonus
  )
}

export function canUseSpecial(pawn: Pawn): boolean {
  return pawn.energy >= pawn.special.cost && (!pawn.special.oncePerRound || !pawn.specialUsed)
}

export function specialTargets(pawns: Pawn[], pawn: Pawn, from: Axial = pawn): Pawn[] {
  return canUseSpecial(pawn) ? pawn.special.targets(pawn, pawns, from) : []
}

export const label = (pawn: Pawn) =>
  (pawn.side === 'player' ? 'Your ' : 'Enemy ') + pawn.kind + ' #' + pawn.id

export const pawnAt = (pawns: Pawn[], at: Axial): Pawn | undefined =>
  pawns.find((p) => p.q === at.q && p.r === at.r)

export const aimAt = ({ q, r }: Axial): Action[] => [
  { type: 'act', action: 'special' },
  { type: 'specialAt', q, r },
]

export function strike(
  pawns: Pawn[],
  attacker: Pawn,
  target: Pawn,
  profile: AttackProfile,
  log: string[],
  random: SeededRandom,
): BattleImpact {
  if (
    !profile.ignoresEscape &&
    target.escapeChance > 0 &&
    random.next() * 100 < target.escapeChance
  ) {
    log.push(label(target) + ' escapes the attack.')
    return { q: target.q, r: target.r, damage: 0 }
  }
  const protector = protectorFor(pawns, target)
  if (protector) {
    protector.protectingId = null
    log.push(label(protector) + ' takes the hit for ' + target.kind + ' #' + target.id + '.')
    target = protector
  }
  target.hp -= profile.damage
  log.push(
    label(attacker) +
      ' strikes ' +
      target.kind +
      ' #' +
      target.id +
      ' for ' +
      profile.damage +
      ' damage.',
  )
  if (target.hp <= 0) {
    pawns.splice(pawns.indexOf(target), 1)
    log.push(label(target) + ' has fallen.')
  }
  return { q: target.q, r: target.r, damage: profile.damage }
}

export function strikeArea(
  pawns: Pawn[],
  attacker: Pawn,
  targets: Pawn[],
  log: string[],
  random: SeededRandom,
): BattleImpact[] {
  const impacts: BattleImpact[] = []
  for (const target of targets) {
    if (!pawns.includes(target)) continue
    const hit = strike(pawns, attacker, target, { ...attacker.attack, damage: 1 }, log, random)
    const previous = impacts.find((impact) => impact.q === hit.q && impact.r === hit.r)
    if (previous) previous.damage += hit.damage
    else impacts.push(hit)
  }
  return impacts
}

export function performAttack(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
  target: Pawn,
  log: string[],
  random: SeededRandom,
): BattleImpact[] | null {
  if (pawn.energy < 1 || !canAttack(pawn, target, tiles.get(key(pawn.q, pawn.r)))) return null
  pawn.energy--
  return [strike(pawns, pawn, target, pawn.attack, log, random)]
}

export const attackTargets = (pawn: Pawn, pawns: readonly Pawn[], from: Axial = pawn): Pawn[] =>
  pawns.filter((p) => canAttack(pawn, p, from))

export const allyTargets = (pawn: Pawn, pawns: readonly Pawn[], woundedOnly = false): Pawn[] =>
  pawns.filter(
    (p) =>
      p.side === pawn.side &&
      p.id !== pawn.id &&
      hexDist(pawn, p) === 1 &&
      (!woundedOnly || p.hp < p.maxHp),
  )
