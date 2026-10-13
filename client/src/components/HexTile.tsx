import { memo } from 'react'
import { featureTexts } from '../i18n/biomes'
import type { Pawn, Tile } from '../lib/engine'
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
  // Whether the active pawn stands on this tile.
  selected: boolean
  // Energy cost of the cheapest walking route here, when the active pawn can move.
  cost?: number
  // Damage the active pawn takes by entering or landing here.
  damage: number
  // Whether entering this tile would kill the active pawn.
  lethal: boolean
  target: boolean
  strike: boolean
  // Rattle class during a bomb or fireball effect; empty otherwise, so
  // unaffected tiles keep their memoized render.
  quakeClass: string
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

// Playback frames deep-copy tiles and pawns, so their identities churn on
// every frame; a tile only cares about the values it displays.
const sameTile = (a: Tile, b: Tile) =>
  a.q === b.q && a.r === b.r && a.terrain === b.terrain && a.feature === b.feature

const samePawn = (a?: Pawn, b?: Pawn) =>
  a?.id === b?.id && a?.side === b?.side && a?.kind === b?.kind && a?.hp === b?.hp

// Every prop beyond the three objects is a primitive, so the loop covers any
// prop added later; only new object props would need an explicit comparison.
function tilePropsEqual(prev: HexTileProps, next: HexTileProps) {
  if (
    !sameTile(prev.tile, next.tile) ||
    !samePawn(prev.occupant, next.occupant) ||
    !samePawn(prev.protector, next.protector)
  )
    return false
  for (const key of Object.keys(prev) as (keyof HexTileProps)[]) {
    if (key !== 'tile' && key !== 'occupant' && key !== 'protector' && prev[key] !== next[key])
      return false
  }
  return true
}

// Render counter read by tests/perf.browser.ts: taps must not re-render the
// whole board, and this regression is invisible to timing metrics. The flag is
// false in production builds, so the whole branch is dead-code eliminated and
// clients ship no counter. The increment lives outside the component so
// neither lint nor the React Compiler sees a mutation of outer-scope state in
// the render path.
function countTileRender() {
  if (import.meta.env.VITE_TILE_RENDER_COUNTER) {
    const counter = window as { __hexmateTileRenders?: number }
    counter.__hexmateTileRenders = (counter.__hexmateTileRenders ?? 0) + 1
  }
}

// One hex of the board. Taps are delegated to the battlefield, so a tile holds
// no callbacks. The compiler memoizes whole components but not individual list
// items, so memo lets the many tiles untouched by a tap skip re-rendering.
export const HexTile = memo(function HexTile({
  tile,
  occupant,
  protector,
  selected,
  lethal,
  cost,
  damage,
  target,
  strike,
  quakeClass,
  targetLabel,
  previewed,
  rechoosing,
  inRange,
  threatened,
  warned,
  impactCenter,
  labels,
}: HexTileProps) {
  countTileRender()
  const canMove = cost !== undefined && cost > 0
  const interactive = target || canMove || rechoosing
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
      className={
        'group/tile outline-none [&[role=button]]:cursor-pointer' +
        (quakeClass ? ' ' + quakeClass + ' motion-reduce:animate-none' : '')
      }
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
}, tilePropsEqual)
