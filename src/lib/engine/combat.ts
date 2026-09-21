import { hexDist, key, reachable } from './hex.ts'
import type { AttackProfile, Pawn } from './pawns.ts'
import type { SeededRandom } from './random.ts'
import type { Axial, Tile } from './types.ts'

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
  if (!canUseSpecial(pawn)) return []
  if (pawn.kind === 'king') {
    return pawns.filter(
      (p) => p.side === pawn.side && p.id !== pawn.id && p.hp < p.maxHp && hexDist(pawn, p) === 1,
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

const label = (pawn: Pawn) =>
  (pawn.side === 'player' ? 'Your ' : 'Enemy ') + pawn.kind + ' #' + pawn.id

function strike(
  pawns: Pawn[],
  attacker: Pawn,
  target: Pawn,
  profile: AttackProfile,
  log: string[],
  random: SeededRandom,
) {
  if (
    !profile.ignoresEscape &&
    target.escapeChance > 0 &&
    random.next() * 100 < target.escapeChance
  ) {
    log.push(label(target) + ' escapes the attack.')
    return
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
}

export function performAttack(
  pawns: Pawn[],
  pawn: Pawn,
  target: Pawn,
  log: string[],
  random: SeededRandom,
): boolean {
  if (pawn.energy < 1 || !canAttack(pawn, target)) return false
  pawn.energy--
  strike(pawns, pawn, target, pawn.attack, log, random)
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
): boolean {
  if (
    pawn.kind === 'swordsman' &&
    (!destination || !chargeDestinations(tiles, pawns, pawn).has(key(destination.q, destination.r)))
  )
    return false
  if (!specialTargets(pawns, pawn, destination ?? pawn).includes(target)) return false
  pawn.energy -= pawn.special.cost
  log.push(label(pawn) + ' uses ' + pawn.special.name + '.')
  switch (pawn.kind) {
    case 'king':
      target.hp = Math.min(target.maxHp, target.hp + 1)
      pawn.specialUsed = true
      log.push(label(target) + ' recovers 1 health.')
      break
    case 'swordsman':
      pawn.q = destination!.q
      pawn.r = destination!.r
      strike(pawns, pawn, target, pawn.attack, log, random)
      break
    case 'archer':
      strike(pawns, pawn, target, { ...pawn.attack, damage: 2, ignoresEscape: true }, log, random)
      break
    case 'magician':
      for (const enemy of pawns.filter((p) => p.side !== pawn.side && hexDist(target, p) <= 1)) {
        strike(pawns, pawn, enemy, pawn.attack, log, random)
      }
      break
  }
  return true
}
