import type { Pawn, Tile } from '../lib/engine'
import type { PlayerNames } from '../lib/game-mode'
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
        occupant.kind +
        ' #' +
        occupant.id +
        ', ' +
        occupant.hp +
        ' health' +
        (protector ? ', protected by bulwark #' + protector.id : '')
      : tile.terrain +
        ', column ' +
        (tile.q + Math.floor(tile.r / 2) + 1) +
        ', row ' +
        (tile.r + 1)) + (feature ? ', ' + feature.name + '. ' + feature.description : '')
  const warning = warned
    ? ', Hellfire' +
      (impactCenter ? ' impact center' : ' blast area') +
      ', 1 unavoidable damage at round end'
    : ''
  return (
    (target
      ? targetLabel +
        ' ' +
        label +
        (damage ? ', ' + damage + ' lava damage' + (lethal ? ' (lethal)' : '') : '')
      : canMove
        ? 'Move to ' +
          label +
          (damage ? ', ' + damage + ' lava damage' + (lethal ? ' (lethal)' : '') : '') +
          ', ' +
          cost +
          ' energy'
        : label) + warning
  )
}

export function tileFill({
  interactive,
  damage,
  occupant,
  target,
  targetLabel,
  selected,
  previewed,
  canMove,
  terrain,
}: {
  interactive: boolean
  damage: number
  occupant?: Pawn
  target: boolean
  targetLabel: string
  selected: boolean
  previewed: boolean
  canMove: boolean
  terrain: Tile['terrain']
}): string {
  if (interactive && damage > 0 && !occupant) return '#94716d'
  if (target) return targetLabel === 'Attack' ? '#b98370' : '#b79dce'
  if (selected || previewed) return 'var(--selected-tint, #c9b77f)'
  return canMove ? 'var(--move-tint)' : terrainColors[terrain]
}
