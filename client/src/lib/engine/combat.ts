import { hexDist, key, neighborKeys, passable, sameHex, type Axial, type Tile } from './hex.ts'
import type { AttackProfile, Pawn, Side, ThreatPosition } from './pawns/index.ts'
import type { Action } from './engine.ts'
import type { SpecialAbility } from './pawns/pawn.ts'

export type BattleImpact = Axial & { damage: number }

export type WalkRoute = {
  key: string
  tile: Tile | null
  damage: number
  steps: number
  parent: WalkRoute | null
}

export function routePath(route: WalkRoute): Tile[] {
  const path: Tile[] = []
  for (let node = route; node.parent; node = node.parent) path.push(node.tile!)
  return path.reverse()
}

export function walkingPaths(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
  maxSteps = Math.max(0, pawn.energy - pawn.moveCost + 1),
  destination?: string,
): Map<string, WalkRoute> {
  const occupied = new Set(pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)))
  const start = key(pawn.q, pawn.r)
  const root: WalkRoute = { key: start, tile: null, damage: 0, steps: 0, parent: null }
  const paths = new Map([[start, root]])
  const leastDamage = new Map([[start, 0]])
  const grid = neighborKeys(tiles)
  let frontier: WalkRoute[] = [root]
  for (let step = 1; step <= maxSteps && frontier.length; step++) {
    const next: WalkRoute[] = []
    for (const current of frontier) {
      for (const k of grid.get(current.key) ?? []) {
        const tile = tiles.get(k)
        if (!tile || !passable(tile) || occupied.has(k)) continue
        const damage = current.damage + Number(tile.terrain === 'lava')
        if (damage >= (leastDamage.get(k) ?? Infinity)) continue
        leastDamage.set(k, damage)
        const node: WalkRoute = { key: k, tile, damage, steps: step, parent: current }
        const previous = paths.get(k)
        if (!previous || step === previous.steps || previous.damage >= pawn.hp)
          paths.set(k, node)
        if (damage < pawn.hp) next.push(node)
      }
    }
    frontier = next
    // A settled non-lethal route is final: later steps can only replace lethal ones.
    if (destination) {
      const settled = paths.get(destination)
      if (settled && settled.damage < pawn.hp) break
    }
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
      pawn.moveEnergyCost(route.steps),
    ]),
  )
}

export function advanceAndStrike(
  { pawn, tiles, pawns, round, log }: Parameters<SpecialAbility['perform']>[0],
  path: Tile[],
  target?: Pawn,
): BattleImpact[] {
  pawn.energy -= pawn.special.cost
  const impacts = enterTiles(tiles, pawns, pawn, path, round, log)
  if (pawn.hp > 0 && target) impacts.push(strike(pawns, pawn, target, pawn.attack, log))
  return impacts
}

export function protectorFor(pawns: Pawn[], target: Pawn): Pawn | undefined {
  return pawns.find(
    (p) => p.protectingId === target.id && p.side === target.side && p.id !== target.id,
  )
}

export function inAttackRange(pawn: Pawn, at: Axial, from: Axial = pawn): boolean {
  const distance = hexDist(from, at)
  const bonus =
    'feature' in from && from.feature === 'watchtower' ? (pawn.attack.rangeBonus ?? 0) : 0
  return distance >= pawn.attack.minRange && distance <= pawn.attack.maxRange + bonus
}

export function canAttack(pawn: Pawn, target: Pawn, from: Axial = pawn): boolean {
  return pawn.side !== target.side && inAttackRange(pawn, target, from)
}

export function canUseSpecial(pawn: Pawn): boolean {
  return pawn.energy >= pawn.special.cost && !pawn.specialUsed
}

export function abilityDamage(pawn: Pawn, position: ThreatPosition): number {
  if (pawn.specialUsed || pawn.energy < position.movementCost + pawn.special.cost) return 0
  return (
    pawn.special.threat?.(pawn, position) ??
    (canAttack(pawn, position.target, position.from) ? pawn.attack.damage : 0)
  )
}

export function specialTargets(pawns: Pawn[], pawn: Pawn, from: Axial = pawn): Pawn[] {
  return canUseSpecial(pawn) ? pawn.special.targets(pawn, pawns, from) : []
}

export const label = (pawn: Pawn) =>
  (pawn.side === 'player' ? 'Your ' : 'Enemy ') + pawn.kind + ' #' + pawn.id

export const pawnAt = (pawns: Pawn[], at: Axial): Pawn | undefined =>
  pawns.find((p) => sameHex(p, at))

export const aimAt = ({ q, r }: Axial): Action => ({ type: 'special', target: { q, r } })

export function strike(
  pawns: Pawn[],
  attacker: Pawn,
  target: Pawn,
  profile: AttackProfile,
  log: string[],
): BattleImpact {
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
): BattleImpact[] {
  const impacts: BattleImpact[] = []
  for (const target of targets) {
    if (!pawns.includes(target)) continue
    const hit = strike(pawns, attacker, target, { ...attacker.attack, damage: 1 }, log)
    const previous = impacts.find((impact) => sameHex(impact, hit))
    if (previous) previous.damage += hit.damage
    else impacts.push(hit)
  }
  return impacts
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

export function rangeTiles(pawn: Pawn, tiles: Map<string, Tile>): Set<string> {
  return new Set(
    [...tiles.values()]
      .filter((tile) => pawn.special.reaches(pawn, tile, tiles))
      .map((tile) => key(tile.q, tile.r)),
  )
}

// Charge and Ambush share adjacent strikes: build their landing reach once per origin.
export function landingThreatenedTiles(
  pawn: Pawn,
  tiles: Map<string, Tile>,
  pawns: Pawn[],
): Set<string> {
  const range = pawn.special.landingRange!
  const landings =
    pawn.special.movement === 'walk'
      ? [...walkingPaths(tiles, pawns, pawn, range).values()]
          .filter((route) => route.damage < pawn.hp)
          .map((route) => route.tile ?? pawn)
      : [...tiles.values()].filter(
          (tile) =>
            passable(tile) &&
            hexDist(pawn, tile) <= range &&
            (tile.terrain !== 'lava' || pawn.hp > 1) &&
            !pawns.some((p) => p.id !== pawn.id && sameHex(p, tile)),
        )
  const threatened = new Set<string>()
  const grid = neighborKeys(tiles)
  for (const landing of landings)
    for (const at of grid.get(key(landing.q, landing.r)) ?? [])
      if (tiles.has(at)) threatened.add(at)
  return threatened
}

export function threatenedTiles(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  side: Side,
): Set<string> {
  const threatened = new Set<string>()
  for (const pawn of pawns) {
    if (pawn.side !== side || pawn.hp <= 0 || pawn.special.damage === 0) continue
    const attacker = pawn.clone()
    attacker.energy = attacker.maxEnergy
    attacker.specialUsed = false
    const maxSteps = Math.max(
      0,
      attacker.energy - attacker.special.cost - attacker.moveCost + 1,
    )
    const target = pawn.clone()
    Object.assign(target, { id: -1, side: side === 'player' ? 'enemy' : 'player' })
    for (const route of walkingPaths(tiles, pawns, attacker, maxSteps).values()) {
      if (route.damage >= pawn.hp) continue
      const from = route.tile ?? tiles.get(route.key)!
      const movementCost = attacker.moveEnergyCost(route.steps)
      if (attacker.energy < movementCost + attacker.special.cost) continue
      if (attacker.special.threatenedTiles) {
        const actor = attacker.clone()
        actor.q = from.q
        actor.r = from.r
        actor.energy -= movementCost
        for (const at of attacker.special.threatenedTiles(actor, tiles, pawns))
          threatened.add(at)
        continue
      }
      for (const tile of tiles.values()) {
        target.q = tile.q
        target.r = tile.r
        if (
          abilityDamage(attacker, {
            target,
            from,
            movementCost,
            tiles,
            pawns,
          }) > 0
        )
          threatened.add(key(tile.q, tile.r))
      }
    }
  }
  return threatened
}
