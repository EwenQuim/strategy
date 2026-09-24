import { useEffect, useRef } from 'react'
import {
  key,
  walkingPaths,
  TILE_FEATURES,
  protectorFor,
  inHellfire,
  type Axial,
  type BattleEffect,
  type Pawn,
  type Tile,
} from '../lib/engine'
import { Icon } from './Icon'
import { BattlefieldEffects } from './BattlefieldEffects'
import { PawnChip } from './PawnChip'
import { TerrainArt } from './TerrainArt'
import { FeatureArt } from './features/FeatureArt'
import { SIZE, hexPoints, hexX, hexY, terrainColors } from './hex-art'
import type { PlayerNames } from '../lib/game-mode'

interface BattlefieldProps {
  labels: PlayerNames
  tiles: Map<string, Tile>
  pawns: Pawn[]
  hellfire: readonly Axial[]
  active?: Pawn
  reach: Map<string, number>
  targets: Set<string>
  targetLabel: string
  preview: Axial | null
  effect: BattleEffect | null
  effectId: number
  onTileClick: (tile: Tile) => void
}

function tileAriaLabel({
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

export function Battlefield({
  labels,
  tiles,
  pawns,
  hellfire,
  active,
  reach,
  targets,
  targetLabel,
  preview,
  effect,
  effectId,
  onTileClick,
}: BattlefieldProps) {
  const board = useRef<SVGSVGElement>(null)
  const paths =
    active && (reach.size || targetLabel === 'Charge to')
      ? walkingPaths(tiles, pawns, active, targetLabel === 'Charge to' ? 2 : undefined)
      : new Map()
  useEffect(() => {
    if (
      !effect?.impacts?.some((hit) => hit.damage > 0) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const animation = board.current?.animate(
      [
        { transform: 'translate(0, 0)' },
        { transform: 'translate(-4px, 2px)' },
        { transform: 'translate(3px, -2px)' },
        { transform: 'translate(-2px, 1px)' },
        { transform: 'translate(0, 0)' },
      ],
      { duration: 260, easing: 'ease-out' },
    )
    return () => animation?.cancel()
  }, [effect, effectId])
  const allTiles = [...tiles.values()]
  const xs = allTiles.map((t) => hexX(t.q, t.r))
  const ys = allTiles.map((t) => hexY(t.r))
  const pad = SIZE * 1.35
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const viewBox = [minX, minY, Math.max(...xs) - minX + pad, Math.max(...ys) - minY + pad].join(
    ' ',
  )

  return (
    <svg
      ref={board}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className="block size-full max-w-[860px] touch-manipulation select-none drop-shadow-[0_18px_20px_#0a211b60]"
      data-testid="battlefield"
      role="group"
      aria-label="Battlefield. Select a highlighted tile to move or an enemy to attack."
    >
      <defs>
        <pattern id="hellfire-hatch" width="9" height="9" patternUnits="userSpaceOnUse">
          <path
            d="M-2 2 2-2M0 9 9 0M7 11 11 7"
            fill="none"
            stroke="var(--hellfire-warning, #ffb27f)"
            strokeWidth="1.5"
            opacity=".6"
          />
        </pattern>
        <linearGradient id="lava-melt" x1="0" y1="0" x2=".8" y2="1">
          <stop stopColor="#815c51" />
          <stop offset=".45" stopColor="#b9825d" />
          <stop offset="1" stopColor="#8e5d4b" />
        </linearGradient>
        <radialGradient id="lava-glow" cx=".4" cy=".45" r=".6">
          <stop stopColor="#deb17c" stopOpacity=".5" />
          <stop offset=".5" stopColor="#c59164" stopOpacity=".22" />
          <stop offset="1" stopColor="#a86650" stopOpacity="0" />
        </radialGradient>
        <clipPath id="lava-hex">
          <polygon points={hexPoints} />
        </clipPath>
        <linearGradient id="player-chip" x2="0" y2="1">
          <stop stopColor="#407265" />
          <stop offset="1" stopColor="#193e35" />
        </linearGradient>
        <linearGradient id="enemy-chip" x2="0" y2="1">
          <stop stopColor="#a35f4d" />
          <stop offset="1" stopColor="#623a33" />
        </linearGradient>
        <linearGradient id="tile-light" x2="0.7" y2="1">
          <stop stopColor="#fff6cc" stopOpacity=".13" />
          <stop offset="1" stopColor="var(--tile-shade)" stopOpacity=".12" />
        </linearGradient>
      </defs>
      <g data-art="tile-bases" transform="translate(0 5)" fill="var(--tile-base)">
        {allTiles.map((tile) => (
          <polygon
            key={key(tile.q, tile.r)}
            transform={'translate(' + hexX(tile.q, tile.r) + ' ' + hexY(tile.r) + ')'}
            points={hexPoints}
          />
        ))}
      </g>
      {allTiles.map((tile) => {
        const tileKey = key(tile.q, tile.r)
        const warned = inHellfire(hellfire, tile)
        const impactCenter = hellfire.some(
          (center) => center.q === tile.q && center.r === tile.r,
        )
        const occupant = pawns.find((p) => p.q === tile.q && p.r === tile.r)
        const protector = occupant && protectorFor(pawns, occupant)
        const selected = active?.q === tile.q && active.r === tile.r
        const target = targets.has(tileKey)
        const previewed = preview?.q === tile.q && preview.r === tile.r
        const cost = reach.get(tileKey)
        const canMove = cost !== undefined && cost > 0
        const interactive = !!target || canMove
        const feature = tile.feature && TILE_FEATURES[tile.feature]
        const damage =
          target && targetLabel === 'Jump to'
            ? Number(tile.terrain === 'lava')
            : (paths.get(tileKey)?.damage ?? 0)
        const lethal = !!active && damage >= active.hp
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
        })
        const fill =
          interactive && damage > 0 && !occupant
            ? '#94716d'
            : target
              ? targetLabel === 'Attack'
                ? '#b98370'
                : '#b79dce'
              : selected || previewed
                ? 'var(--selected-tint, #c9b77f)'
                : canMove
                  ? 'var(--move-tint)'
                  : terrainColors[tile.terrain]
        return (
          <g
            key={tileKey}
            transform={'translate(' + hexX(tile.q, tile.r) + ' ' + hexY(tile.r) + ')'}
            data-terrain={tile.terrain}
            data-feature={tile.feature}
            data-hellfire={warned || undefined}
            data-hellfire-center={impactCenter || undefined}
            className="group/tile outline-none [&[role=button]]:cursor-pointer"
            data-testid="hex-tile"
            role={interactive ? 'button' : 'img'}
            tabIndex={interactive ? 0 : undefined}
            aria-label={actionLabel}
            onClick={interactive ? () => onTileClick(tile) : undefined}
            onKeyDown={
              interactive
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onTileClick(tile)
                    }
                  }
                : undefined
            }
          >
            <title>{actionLabel}</title>
            <polygon
              data-testid="tile-face"
              className={
                'transition-[fill,filter] duration-200 ease-[ease] group-focus-visible/tile:fill-[#f1db9c] group-focus-visible/tile:brightness-120' +
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
            {canMove && !occupant && (
              <g className="pointer-events-none">
                <circle cy="20" r="7" fill="#213f30" fillOpacity=".8" />
                <text
                  y="23.4"
                  textAnchor="middle"
                  fill="#f0edcc"
                  fontSize="10"
                  fontWeight="600"
                >
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
      })}
      {pawns.map((pawn) => (
        <PawnChip
          key={pawn.id}
          pawn={pawn}
          feature={tiles.get(key(pawn.q, pawn.r))?.feature}
          active={active?.id === pawn.id}
          protectedAlly={!!protectorFor(pawns, pawn)}
        />
      ))}
      <BattlefieldEffects effect={effect} effectId={effectId} />
    </svg>
  )
}
