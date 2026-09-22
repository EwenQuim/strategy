import { hexDist, key, passable, reachable } from './hex.ts'
import type { AttackProfile, Pawn } from './pawns.ts'
import type { SeededRandom } from './random.ts'
import type { Axial, BattleImpact, Tile } from './types.ts'

export function canAttack(pawn: Pawn, target: Pawn, from: Axial = pawn): boolean {
  const distance = hexDist(from, target)
  return (
    pawn.side !== target.side &&
    distance >= pawn.attack.minRange &&
    distance <= pawn.attack.maxRange
  )
}

export function canUseSpecial(pawn: Pawn): boolean {
  return pawn.energy >= pawn.special.cost && (pawn.kind !== 'king' || !pawn.specialUsed)
}

export function specialTargets(pawns: Pawn[], pawn: Pawn, from: Axial = pawn): Pawn[] {
  if (!canUseSpecial(pawn) || pawn.kind === 'ninja') return []
  if (pawn.kind === 'king') {
    return pawns.filter(
      (p) =>
        p.side === pawn.side && p.id !== pawn.id && p.hp < p.maxHp && hexDist(pawn, p) === 1,
    )
  }
  return pawns.filter((p) => canAttack(pawn, p, from))
}

export function chargeDestinations(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
): Map<string, number> {
  if (pawn.kind !== 'swordsman' || !canUseSpecial(pawn)) return new Map()
  const occupied = new Set(pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)))
  const destinations = reachable(tiles, occupied, pawn, 2)
  return new Map(
    [...destinations].filter(([k]) => specialTargets(pawns, pawn, tiles.get(k)!).length > 0),
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
  pawns: Pawn[],
  pawn: Pawn,
  target: Pawn,
  log: string[],
  random: SeededRandom,
): BattleImpact[] | null {
  if (pawn.energy < 1 || !canAttack(pawn, target)) return null
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

export function performSpecial(
  tiles: Map<string, Tile>,
  pawns: Pawn[],
  pawn: Pawn,
  target: Pawn,
  log: string[],
  random: SeededRandom,
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
    case 'swordsman':
      pawn.q = destination!.q
      pawn.r = destination!.r
      return [strike(pawns, pawn, target, pawn.attack, log, random)]
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
      return pawns
        .filter((p) => p.side !== pawn.side && hexDist(target, p) <= 1)
        .map((enemy) => strike(pawns, pawn, enemy, pawn.attack, log, random))
  }
}
