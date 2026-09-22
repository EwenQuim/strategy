import { hexDist, key, neighbors, passable } from './hex.ts'
import type { AttackProfile, Pawn } from './pawns.ts'
import type { SeededRandom } from './random.ts'
import type { Axial, BattleImpact, Tile } from './types.ts'

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
      p.kind === 'bulwark' &&
      p.protectingId === target.id &&
      p.side === target.side &&
      p.id !== target.id &&
      hexDist(p, target) === 1,
  )
}

export function canAttack(pawn: Pawn, target: Pawn, from: Axial = pawn): boolean {
  const distance = hexDist(from, target)
  const bonus =
    (pawn.kind === 'archer' || pawn.kind === 'magician') &&
    'feature' in from &&
    from.feature === 'watchtower'
      ? 1
      : 0
  return (
    pawn.side !== target.side &&
    distance >= pawn.attack.minRange &&
    distance <= pawn.attack.maxRange + bonus
  )
}

export function canUseSpecial(pawn: Pawn): boolean {
  return pawn.energy >= pawn.special.cost && (pawn.kind !== 'king' || !pawn.specialUsed)
}

export function specialTargets(pawns: Pawn[], pawn: Pawn, from: Axial = pawn): Pawn[] {
  if (!canUseSpecial(pawn) || pawn.kind === 'ninja') return []
  if (pawn.kind === 'king' || pawn.kind === 'bulwark') {
    return pawns.filter(
      (p) =>
        p.side === pawn.side &&
        p.id !== pawn.id &&
        hexDist(pawn, p) === 1 &&
        (pawn.kind === 'bulwark' || p.hp < p.maxHp),
    )
  }
  return pawns.filter((p) => canAttack(pawn, p, { q: from.q, r: from.r }))
}

export function chargeDestinations(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
): Map<string, number> {
  if (pawn.kind !== 'swordsman' || !canUseSpecial(pawn)) return new Map()
  return new Map(
    [...walkingPaths(tiles, pawns, pawn, 2)]
      .filter(([k]) => specialTargets(pawns, pawn, tiles.get(k)!).length > 0)
      .map(([k, route]) => [k, route.path.length]),
  )
}

export function jumpDestinations(tiles: Map<string, Tile>, pawns: Pawn[], pawn: Pawn): Tile[] {
  if (pawn.kind !== 'ninja' || !canUseSpecial(pawn)) return []
  const occupied = new Set(pawns.map((p) => key(p.q, p.r)))
  return [...tiles.values()].filter(
    (tile) => passable(tile) && !occupied.has(key(tile.q, tile.r)) && hexDist(pawn, tile) <= 3,
  )
}

export function performJump(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
  destination: Axial,
): boolean {
  if (
    !jumpDestinations(tiles, pawns, pawn).some(
      (tile) => tile.q === destination.q && tile.r === destination.r,
    )
  )
    return false
  pawn.q = destination.q
  pawn.r = destination.r
  pawn.energy -= pawn.special.cost
  return true
}

const label = (pawn: Pawn) =>
  (pawn.side === 'player' ? 'Your ' : 'Enemy ') + pawn.kind + ' #' + pawn.id

function strike(
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

export function performRally(pawns: Pawn[], pawn: Pawn, log: string[]): boolean {
  if (pawn.kind !== 'king') return false
  const allies = specialTargets(pawns, pawn)
  if (!allies.length) return false
  pawn.energy -= pawn.special.cost
  pawn.specialUsed = true
  log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
  for (const ally of allies) {
    ally.hp = Math.min(ally.maxHp, ally.hp + 1)
    log.push(label(ally) + ' recovers 1 health.')
  }
  return true
}

function performFireball(
  pawns: Pawn[],
  pawn: Pawn,
  target: Pawn,
  log: string[],
  random: SeededRandom,
): BattleImpact[] {
  const enemies = pawns.filter((p) => p.side !== pawn.side && hexDist(target, p) <= 1)
  const impacts: BattleImpact[] = []
  for (const enemy of enemies) {
    if (!pawns.includes(enemy)) continue
    const hit = strike(pawns, pawn, enemy, pawn.attack, log, random)
    const previous = impacts.find((impact) => impact.q === hit.q && impact.r === hit.r)
    if (previous) previous.damage += hit.damage
    else impacts.push(hit)
  }
  return impacts
}

export function performSpecial(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
  target: Pawn,
  log: string[],
  random: SeededRandom,
  round: number,
  destination?: Axial,
): BattleImpact[] | null {
  if (pawn.kind === 'king' || pawn.kind === 'ninja') return null
  if (
    pawn.kind === 'swordsman' &&
    (!destination ||
      !chargeDestinations(tiles, pawns, pawn).has(key(destination.q, destination.r)))
  )
    return null
  if (!specialTargets(pawns, pawn, destination ?? pawn).includes(target)) return null
  pawn.energy -= pawn.special.cost
  log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
  switch (pawn.kind) {
    case 'swordsman': {
      const route = walkingPaths(tiles, pawns, pawn, 2).get(
        key(destination!.q, destination!.r),
      )!
      const impacts = enterTiles(tiles, pawns, pawn, route.path, round, log)
      if (pawn.hp > 0) impacts.push(strike(pawns, pawn, target, pawn.attack, log, random))
      return impacts
    }
    case 'archer':
      return [
        strike(
          pawns,
          pawn,
          target,
          { ...pawn.attack, damage: 2, ignoresEscape: true },
          log,
          random,
        ),
      ]
    case 'magician':
      return performFireball(pawns, pawn, target, log, random)
    case 'bulwark':
      pawn.protectingId = target.id
      log.push(label(pawn) + ' protects ' + target.kind + ' #' + target.id + '.')
      return []
  }
}
