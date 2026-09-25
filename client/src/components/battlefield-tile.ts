import type { Pawn, Tile } from '../lib/engine'
import type { PlayerNames } from '../lib/game-mode'
import { energyCost } from '../i18n/game'
import * as bf from '../i18n/battlefield'
import { unitNames } from '../i18n/units'
import { terrainNames } from '../i18n/biomes'
import { terrainColors } from './hex-art'

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
  const warning = warned ? ', ' + bf.hellfireWarning(impactCenter) : ''
  return (
    (target
      ? targetLabel + ' ' + label + (damage ? ', ' + bf.lavaDamage(damage, lethal) : '')
      : canMove
        ? bf.moveTo +
          ' ' +
          label +
          (damage ? ', ' + bf.lavaDamage(damage, lethal) : '') +
          (cost ? ', ' + energyCost(cost) : '')
        : label) + warning
  )
}

export function tileFill({
  interactive,
  damage,
  occupant,
  target,
  attack,
  selected,
  previewed,
  canMove,
  terrain,
}: {
  interactive: boolean
  damage: number
  occupant?: Pawn
  target: boolean
  attack: boolean
  selected: boolean
  previewed: boolean
  canMove: boolean
  terrain: Tile['terrain']
}): string {
  if (interactive && damage > 0 && !occupant) return '#94716d'
  if (target) return attack ? '#b98370' : '#b79dce'
  if (selected || previewed) return 'var(--selected-tint, #c9b77f)'
  return canMove ? 'var(--move-tint)' : terrainColors[terrain]
}
