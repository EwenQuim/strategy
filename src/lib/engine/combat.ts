import { hexDist, key, neighbors, passable } from './hex.ts'
import type { AttackProfile, Pawn, SpecialAbility } from './pawns.ts'
import type { SeededRandom } from './random.ts'
import type { Action, Axial, BattleImpact, Tile } from './types.ts'

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

export function chargeDestinations(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
): Map<string, number> {
  if (pawn.special !== charge || !canUseSpecial(pawn)) return new Map()
  return new Map(
    [...walkingPaths(tiles, pawns, pawn, 2)]
      .filter(([k]) => specialTargets(pawns, pawn, tiles.get(k)!).length > 0)
      .map(([k, route]) => [k, route.path.length]),
  )
}

export function jumpDestinations(tiles: Map<string, Tile>, pawns: Pawn[], pawn: Pawn): Tile[] {
  if (pawn.special !== jump || !canUseSpecial(pawn)) return []
  const occupied = new Set(pawns.map((p) => key(p.q, p.r)))
  return [...tiles.values()].filter(
    (tile) => passable(tile) && !occupied.has(key(tile.q, tile.r)) && hexDist(pawn, tile) <= 3,
  )
}

export const label = (pawn: Pawn) =>
  (pawn.side === 'player' ? 'Your ' : 'Enemy ') + pawn.kind + ' #' + pawn.id

const pawnAt = (pawns: Pawn[], at: Axial): Pawn | undefined =>
  pawns.find((p) => p.q === at.q && p.r === at.r)

const aimAt = ({ q, r }: Axial): Action[] => [
  { type: 'act', action: 'special' },
  { type: 'specialAt', q, r },
]

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

const attackTargets = (pawn: Pawn, pawns: readonly Pawn[], from: Axial = pawn): Pawn[] =>
  pawns.filter((p) => canAttack(pawn, p, from))

const allyTargets = (pawn: Pawn, pawns: readonly Pawn[], woundedOnly = false): Pawn[] =>
  pawns.filter(
    (p) =>
      p.side === pawn.side &&
      p.id !== pawn.id &&
      hexDist(pawn, p) === 1 &&
      (!woundedOnly || p.hp < p.maxHp),
  )

export const rally: SpecialAbility = {
  name: 'Rally',
  cost: 1,
  targeted: false,
  oncePerRound: true,
  description:
    'Restore 1 health to every adjacent ally, once per round. Activates immediately. Cannot heal yourself or exceed maximum health.',
  targets: (pawn, pawns) => allyTargets(pawn, pawns, true),
  candidates: (pawn, { pawns }) =>
    specialTargets(pawns, pawn).length ? [[{ type: 'act', action: 'special' }]] : [],
  perform: ({ pawn, pawns, log }) => {
    const allies = specialTargets(pawns, pawn)
    if (!allies.length) return null
    pawn.energy -= pawn.special.cost
    pawn.specialUsed = true
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    for (const ally of allies) {
      ally.hp = Math.min(ally.maxHp, ally.hp + 1)
      log.push(label(ally) + ' recovers 1 health.')
    }
    return { kind: 'rally', to: { q: pawn.q, r: pawn.r } }
  },
}

export const charge: SpecialAbility = {
  name: 'Charge',
  cost: 2,
  targeted: true,
  choosesDestination: true,
  description:
    'Choose a tile up to 2 steps away, then an adjacent enemy. Move and strike for 2 damage. Mountains, lakes, and occupied tiles block the path.',
  targets: attackTargets,
  tileTargets: (pawn, tiles, pawns) => new Set(chargeDestinations(tiles, pawns, pawn).keys()),
  candidates: (pawn, { tiles, pawns }) =>
    [...chargeDestinations(tiles, pawns, pawn).keys()].flatMap((position) => {
      const tile = tiles.get(position)!
      return pawns
        .filter((target) => canAttack(pawn, target, tile))
        .map((target): Action[] => [
          ...aimAt(tile),
          { type: 'specialAt', q: target.q, r: target.r },
        ])
    }),
  threat: (pawn, { target, from, movementCost }) => {
    if (!canAttack(pawn, target, from)) return 0
    const chargeCost = Math.max(0, movementCost - 2) + pawn.special.cost
    return pawn.energy >= chargeCost ? (1 + pawn.energy - chargeCost) * pawn.attack.damage : 0
  },
  perform: ({ pawn, tiles, pawns, tile, destination, round, log, random }) => {
    const target = tile && pawnAt(pawns, tile)
    if (
      !target ||
      !destination ||
      !chargeDestinations(tiles, pawns, pawn).has(key(destination.q, destination.r)) ||
      !specialTargets(pawns, pawn, destination).includes(target)
    )
      return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    const route = walkingPaths(tiles, pawns, pawn, 2).get(key(destination.q, destination.r))!
    const impacts = enterTiles(tiles, pawns, pawn, route.path, round, log)
    if (pawn.hp > 0) impacts.push(strike(pawns, pawn, target, pawn.attack, log, random))
    return { kind: 'attack', to: { q: target.q, r: target.r }, impacts }
  },
}

export const aimedShot: SpecialAbility = {
  name: 'Aimed shot',
  cost: 2,
  targeted: true,
  description:
    'Deal 2 damage to an enemy 2 to 3 tiles away, ignoring Escape. Cannot shoot adjacent enemies.',
  targets: attackTargets,
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  perform: ({ pawn, pawns, log, random, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    return {
      kind: 'attack',
      to: { q: target.q, r: target.r },
      impacts: [
        strike(
          pawns,
          pawn,
          target,
          { ...pawn.attack, damage: 2, ignoresEscape: true },
          log,
          random,
        ),
      ],
    }
  },
}

export const fireball: SpecialAbility = {
  name: 'Fireball',
  cost: 2,
  targeted: true,
  description:
    'Target an enemy within 2 tiles. Deal 1 damage to it and every adjacent enemy. Each may Escape; allies are unharmed.',
  targets: attackTargets,
  candidates: (pawn, { pawns }) => specialTargets(pawns, pawn).map(aimAt),
  threat: (pawn, { target, targets, from, movementCost }) => {
    const remainingEnergy = pawn.energy - movementCost
    return remainingEnergy >= pawn.special.cost &&
      targets.some(
        (neighbor) =>
          hexDist(neighbor, target) <= 1 && canAttack(pawn, neighbor, { q: from.q, r: from.r }),
      )
      ? Math.floor(remainingEnergy / pawn.special.cost)
      : 0
  },
  perform: ({ pawn, pawns, log, random, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    const impacts: BattleImpact[] = []
    for (const enemy of pawns.filter((p) => p.side !== pawn.side && hexDist(target, p) <= 1)) {
      if (!pawns.includes(enemy)) continue
      const hit = strike(pawns, pawn, enemy, pawn.attack, log, random)
      const previous = impacts.find((impact) => impact.q === hit.q && impact.r === hit.r)
      if (previous) previous.damage += hit.damage
      else impacts.push(hit)
    }
    return { kind: 'fireball', to: { q: target.q, r: target.r }, impacts }
  },
}

export const protect: SpecialAbility = {
  name: 'Protect',
  cost: 2,
  targeted: true,
  description:
    'Protect an adjacent ally until your next turn. Take its next hit instead, without a second Escape roll. Ends if you separate. Moving costs 2 energy for the first tile, then 1 per extra tile.',
  targets: (pawn, pawns) => allyTargets(pawn, pawns),
  candidates: (pawn, { pawns }) =>
    specialTargets(pawns, pawn)
      .filter((target) => !protectorFor(pawns, target))
      .map(aimAt),
  perform: ({ pawn, pawns, log, tile }) => {
    const target = tile && pawnAt(pawns, tile)
    if (!target || !specialTargets(pawns, pawn).includes(target)) return null
    pawn.energy -= pawn.special.cost
    log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
    pawn.protectingId = target.id
    log.push(label(pawn) + ' protects ' + target.kind + ' #' + target.id + '.')
    return { kind: 'protect', to: { q: target.q, r: target.r }, impacts: [] }
  },
}

export const jump: SpecialAbility = {
  name: 'Jump',
  cost: 2,
  targeted: true,
  description:
    'Jump up to 3 tiles, passing over terrain and units. Land on empty ground, never a mountain or lake. Jump does not attack.',
  targets: () => [],
  candidates: (pawn, { tiles, pawns }) => jumpDestinations(tiles, pawns, pawn).map(aimAt),
  tileTargets: (pawn, tiles, pawns) =>
    new Set(jumpDestinations(tiles, pawns, pawn).map((tile) => key(tile.q, tile.r))),
  perform: ({ pawn, tiles, pawns, tile, round, log }) => {
    if (
      !tile ||
      !jumpDestinations(tiles, pawns, pawn).some(
        (land) => land.q === tile.q && land.r === tile.r,
      )
    )
      return null
    pawn.q = tile.q
    pawn.r = tile.r
    pawn.energy -= pawn.special.cost
    const impacts = enterTiles(
      tiles,
      pawns,
      pawn,
      [tiles.get(key(tile.q, tile.r))!],
      round,
      log,
    )
    return { kind: 'move', to: tile, ...(impacts.length ? { impacts } : {}) }
  },
}
