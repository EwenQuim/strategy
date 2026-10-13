import { memo } from 'react'
import { featureTexts } from '../i18n/biomes'
import { sameHex, type Pawn, type Tile } from '../lib/engine'
import type { PlayerNames } from '../lib/game-mode'
import { tileAriaLabel, tileFill } from './battlefield-tile'
import { FeatureArt } from './features/FeatureArt'
import { hexPoints, hexX, hexY } from './hex-art'
import { Icon } from './Icon'
import { TerrainArt } from './terrains/TerrainArt'

interface HexTileProps {
  tile: Tile
  occupant?: Pawn
  protector?: Pawn
  active?: Pawn
  // Energy cost of the cheapest walking route here, when the active pawn can move.
  cost?: number
  // Damage the active pawn takes by entering or landing here.
  damage: number
  target: boolean
  strike: boolean
  // Label for targeted tiles; empty when the tile is not a target, so re-aiming
  // leaves every other tile untouched.
  targetLabel: string
  previewed: boolean
  rechoosing: boolean
  inRange: boolean
  threatened: boolean
  warned: boolean
  impactCenter: boolean
  labels: PlayerNames
}

// One hex of the board. Taps are delegated to the battlefield, so a tile holds
// no callbacks. The compiler memoizes whole components but not individual list
// items, so memo lets the many tiles untouched by a tap skip re-rendering.
export const HexTile = memo(function HexTile({
  tile,
  occupant,
  protector,
  active,
  cost,
  damage,
  target,
  strike,
  targetLabel,
  previewed,
  rechoosing,
  inRange,
  threatened,
  warned,
  impactCenter,
  labels,
}: HexTileProps) {
  const canMove = cost !== undefined && cost > 0
  const interactive = target || canMove || rechoosing
  const selected = sameHex(active, tile)
  const lethal = !!active && damage >= active.hp
  const feature = tile.feature && featureTexts[tile.feature]
  const actionLabel = tileAriaLabel({
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
    threatened,
    rechoose: rechoosing,
  })
  const fill = tileFill({
    interactive,
    damage,
    occupant,
    target,
    strike,
    selected,
    previewed,
    canMove,
    terrain: tile.terrain,
    inRange,
  })
  return (
    <g
      transform={'translate(' + hexX(tile.q, tile.r) + ' ' + hexY(tile.r) + ')'}
      data-q={tile.q}
      data-r={tile.r}
      data-terrain={tile.terrain}
      data-feature={tile.feature}
      data-hellfire={warned || undefined}
      data-hellfire-center={impactCenter || undefined}
      className="group/tile outline-none [&[role=button]]:cursor-pointer"
      data-testid="hex-tile"
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-label={actionLabel}
    >
      <title>{actionLabel}</title>
      <polygon
        data-testid="tile-face"
        className={
          'group-focus-visible/tile:fill-[#f1db9c] group-focus-visible/tile:brightness-120' +
          (interactive ? ' group-hover/tile:brightness-120' : '')
        }
        points={hexPoints}
        fill={fill}
        stroke="#ecedcc"
        strokeOpacity="var(--tile-stroke-opacity, .13)"
        strokeWidth="1"
      />
      <polygon
        points={hexPoints}
        fill="url(#tile-light)"
        className="pointer-events-none opacity-[var(--tile-light-opacity,1)]"
      />
      {(tile.terrain === 'lava' || (!occupant && !tile.feature)) && (
        <TerrainArt terrain={tile.terrain} variant={Math.abs(tile.q + tile.r) % 3} />
      )}
      {!occupant && tile.feature && <FeatureArt feature={tile.feature} />}
      {warned && (
        <g className="pointer-events-none" aria-hidden="true">
          <polygon points={hexPoints} fill="url(#hellfire-hatch)" />
        </g>
      )}
      {threatened && (
        <polygon
          points={hexPoints}
          fill="url(#threat-hatch)"
          className="pointer-events-none"
          aria-hidden="true"
        />
      )}
      {canMove && !occupant && (
        <g className="pointer-events-none">
          <circle cy="20" r="7" fill="#213f30" fillOpacity=".8" />
          <text y="23.4" textAnchor="middle" fill="#f0edcc" fontSize="10" fontWeight="600">
            {cost}
          </text>
        </g>
      )}
      {previewed && !occupant && (
        <g transform="translate(-12 -12)" color="#fff4cb" className="pointer-events-none">
          <Icon name="arrow" />
        </g>
      )}
      {target && (
        <circle
          r="26"
          fill="none"
          stroke="#f8d4b0"
          strokeWidth="1.3"
          strokeDasharray="3 4"
          className="pointer-events-none"
        />
      )}
    </g>
  )
})
