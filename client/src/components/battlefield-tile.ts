import type { Axial, BattleEffect, Pawn, Tile } from '../lib/engine'
import { hexDist, key } from '../lib/engine'
import type { PlayerNames } from '../lib/game-mode'
import { energyCost } from '../i18n/game'
import * as bf from '../i18n/battlefield'
import { unitNames } from '../i18n/units'
import { terrainNames } from '../i18n/biomes'
import { terrainColors } from './hex-art'

// A tile is on the fireball beam when it lies on the straight hex line from the caster to the line end.
function onBeam(from: Axial, to: Axial, tile: Tile): boolean {
  const sq = Math.sign(to.q - from.q)
  const sr = Math.sign(to.r - from.r)
  const steps = hexDist(from, to)
  for (let step = 1; step <= steps; step++) {
    if (tile.q === from.q + sq * step && tile.r === from.r + sr * step) return true
  }
  return false
}

export function quakeTileKeys(
  effect: BattleEffect | null,
  tiles: Map<string, Tile>,
): Set<string> | null {
  if (!effect) return null
  const inBlast =
    effect.kind === 'bomb'
      ? (tile: Tile) => hexDist(effect.to, tile) <= 1
      : effect.kind === 'fireball'
        ? (tile: Tile) => onBeam(effect.from, effect.to, tile)
        : () => false
  const hit = [...tiles.values()].filter(inBlast).map((tile) => key(tile.q, tile.r))
  return hit.length ? new Set(hit) : null
}

export function tileAriaLabel({
  tile,
  occupant,
  protector,
  feature,
  labels,
  warned,
  impactCenter,
  target,
  targetLabel,
  damage,
  lethal,
  canMove,
  cost,
  inRange,
  rechoose,
}: {
  tile: Tile
  occupant?: Pawn
  protector?: Pawn
  feature?: { name: string; description: string }
  labels: PlayerNames
  warned: boolean
  impactCenter: boolean
  target: boolean
  targetLabel: string
  damage: number
  lethal: boolean
  canMove: boolean
  cost?: number
  inRange: boolean
  rechoose: boolean
}): string {
  const label =
    (occupant
      ? labels[occupant.side] +
        ' ' +
        unitNames[occupant.kind] +
        ' #' +
        occupant.id +
        ', ' +
        bf.healthAmount(occupant.hp) +
        (protector ? ', ' + bf.protectedBy(unitNames[protector.kind], protector.id) : '')
      : terrainNames[tile.terrain] +
        ', ' +
        bf.tilePosition(tile.q + Math.floor(tile.r / 2) + 1, tile.r + 1)) +
    (feature ? ', ' + feature.name + '. ' + feature.description : '')
  const warning =
    (inRange ? ', ' + bf.inRange : '') + (warned ? ', ' + bf.hellfireWarning(impactCenter) : '')
  return (
    (target
      ? targetLabel + ' ' + label + (damage ? ', ' + bf.lavaDamage(damage, lethal) : '')
      : canMove
        ? bf.moveTo +
          ' ' +
          label +
          (damage ? ', ' + bf.lavaDamage(damage, lethal) : '') +
          (cost ? ', ' + energyCost(cost) : '')
        : rechoose
          ? bf.chooseAgain + ' ' + label
          : label) + warning
  )
}

export function tileFill({
  interactive,
  damage,
  occupant,
  target,
  strike,
  selected,
  previewed,
  canMove,
  terrain,
  inRange,
}: {
  interactive: boolean
  damage: number
  occupant?: Pawn
  target: boolean
  strike: boolean
  selected: boolean
  previewed: boolean
  canMove: boolean
  terrain: Tile['terrain']
  inRange: boolean
}): string {
  if (target && strike) return '#b98370'
  if (interactive && damage > 0 && !occupant) return '#94716d'
  if (target) return '#b79dce'
  if (selected || previewed) return 'var(--selected-tint, #c9b77f)'
  if (inRange) return '#b79dce'
  return canMove ? 'var(--move-tint)' : terrainColors[terrain]
}
