import { useEffect, useRef } from 'react'
import {
  key,
  walkingPaths,
  TILE_FEATURES,
  protectorFor,
  type Axial,
  type BattleEffect,
  type Pawn,
  type Tile,
} from '../lib/engine'
import { Icon, PawnIcon } from './Icon'
import type { PlayerNames } from '../lib/game-mode'

const SIZE = 34
const hexX = (q: number, r: number) => SIZE * Math.sqrt(3) * (q + r / 2)
const hexY = (r: number) => SIZE * 1.5 * r
const hexPoints = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i - 30)
  return [SIZE * 0.95 * Math.cos(angle), SIZE * 0.95 * Math.sin(angle)].join(',')
}).join(' ')

const terrainColors = {
  plain: 'var(--plain-tile, #7d8963)',
  forest: '#536e51',
  mountain: '#737c69',
  lake: '#4c7186',
  sand: '#e5bc70',
  palm: '#d5b774',
  basalt: '#594e53',
  lava: 'url(#lava-melt)',
}

interface BattlefieldProps {
  labels: PlayerNames
  tiles: Map<string, Tile>
  pawns: Pawn[]
  active?: Pawn
  reach: Map<string, number>
  targets: Set<string>
  targetLabel: string
  preview: Axial | null
  effect: BattleEffect | null
  effectId: number
  onTileClick: (tile: Tile) => void
}

export function Battlefield({
  labels,
  tiles,
  pawns,
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
        const actionLabel = target
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
            : label
        return (
          <g
            key={tileKey}
            transform={'translate(' + hexX(tile.q, tile.r) + ' ' + hexY(tile.r) + ')'}
            data-terrain={tile.terrain}
            data-feature={tile.feature}
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
      {effect && (
        <g
          key={effectId}
          className="battle-effect pointer-events-none text-[#ffd4a1] data-[kind=move]:text-[#ead695] data-[kind=rally]:text-[#b7e5c8] data-[kind=escape]:text-[#b7e5c8] data-[kind=fireball]:text-[#ffab78]"
          data-kind={effect.kind}
          aria-hidden="true"
        >
          {effect.kind !== 'escape' && effect.kind !== 'rally' && (
            <line
              x1={hexX(effect.from.q, effect.from.r)}
              y1={hexY(effect.from.r)}
              x2={hexX(effect.to.q, effect.to.r)}
              y2={hexY(effect.to.r)}
              pathLength="1"
              className={
                'battle-trail stroke-current [stroke-linecap:round] [stroke-dasharray:1] ' +
                (effect.kind === 'move' ? 'stroke-2' : 'stroke-[4]')
              }
            />
          )}
          {!effect.impacts?.length && (
            <g
              transform={
                'translate(' + hexX(effect.to.q, effect.to.r) + ' ' + hexY(effect.to.r) + ')'
              }
            >
              <circle
                r={effect.kind === 'fireball' || effect.kind === 'rally' ? 66 : 29}
                className="battle-impact origin-center fill-current stroke-current stroke-2 [fill-opacity:0.18] [transform-box:fill-box]"
              />
            </g>
          )}
        </g>
      )}
      {!!effect?.impacts?.length && (
        <g
          key={'impacts-' + effectId}
          className="pointer-events-none"
          data-testid="combat-impacts"
          aria-hidden="true"
        >
          {effect.impacts.map((hit) => (
            <g
              key={key(hit.q, hit.r)}
              transform={'translate(' + hexX(hit.q, hit.r) + ' ' + hexY(hit.r) + ')'}
            >
              <g className={hit.damage > 0 ? 'text-[#ffe1a3]' : 'text-[#c9eaf4]'}>
                <circle
                  r="28"
                  className={
                    'combat-impact-burst origin-center fill-none stroke-current stroke-[3] [transform-box:fill-box] motion-reduce:hidden' +
                    (hit.damage > 0 ? '' : ' [stroke-dasharray:4_7]')
                  }
                />
                {hit.damage > 0 && (
                  <path
                    className="combat-impact-burst origin-center fill-none stroke-current stroke-[3] [transform-box:fill-box] motion-reduce:hidden"
                    d="M0-34v-8M24-24l6-6M34 0h8M24 24l6 6M0 34v8M-24 24l-6 6M-34 0h-8M-24-24l-6-6"
                  />
                )}
                <text
                  y="8"
                  textAnchor="middle"
                  className={
                    'combat-impact-label fill-current stroke-[#14271f] stroke-[5] font-black [paint-order:stroke] ' +
                    (hit.damage > 0
                      ? 'text-[32px]'
                      : 'combat-impact-label--miss text-[24px] italic')
                  }
                >
                  {hit.damage > 0 ? '-' + hit.damage : 'MISS'}
                </text>
              </g>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

function FeatureArt({ feature }: { feature: NonNullable<Tile['feature']> }) {
  return (
    <g className="pointer-events-none" data-art="feature" data-feature-art={feature}>
      {feature === 'watchtower' ? (
        <>
          <ellipse cy="17" rx="19" ry="5" fill="#26312c" opacity=".4" />
          <path d="M-13 16-10-9h20l3 25Z" fill="#d2b984" />
          <path d="M2-9h8l3 25H2Z" fill="#94765d" />
          <path d="M-15-9v-13h7v6h5v-6h6v6h5v-6h7v13Z" fill="#f0d4a0" />
          <path d="M-4 16V6a4 4 0 0 1 8 0v10M-3-7h6v6h-6Z" fill="#463d39" />
        </>
      ) : feature === 'spring' ? (
        <>
          <ellipse cy="7" rx="22" ry="13" fill="#a9bbb0" />
          <ellipse cy="5" rx="18" ry="10" fill="#287c87" />
          <ellipse cy="4" rx="11" ry="5" fill="none" stroke="#91efda" strokeWidth="2" />
          <path d="M0-21C-13-7-9 0 0 0s13-7 0-21Z" fill="#a6f5e4" />
          <path d="M-17 14q17 10 34 0" fill="none" stroke="#647e76" strokeWidth="3" />
        </>
      ) : (
        <>
          <ellipse cy="17" rx="17" ry="5" fill="#392851" opacity=".4" />
          <path d="m0-23 15 17L0 12-15-6Z" fill="#c8a2ed" stroke="#f1d4ff" strokeWidth="1.5" />
          <path d="m0-23 4 17L0 12-4-6Z" fill="#f8e4ff" />
          <text y="24" textAnchor="middle" fill="#f8e4ff" fontSize="11" fontWeight="700">
            +2
          </text>
        </>
      )}
    </g>
  )
}

function TerrainArt({ terrain, variant }: { terrain: Tile['terrain']; variant: number }) {
  if (terrain === 'lava')
    return (
      <g className="pointer-events-none" data-art="lava">
        <g clipPath="url(#lava-hex)">
          <polygon points={hexPoints} fill="url(#lava-glow)" />
          <g transform={'rotate(' + variant * 120 + ') scale(1.4)'}>
            <path
              d="M-29 4C-14-10-7 12 7 2S21-8 30-2M-15 21C-7 13-2 14 3 8"
              fill="none"
              stroke="#d7a674"
              strokeWidth="2.5"
              opacity=".42"
            />
            <path
              d="M-18 6Q-10 3-4 6T7 3"
              fill="none"
              stroke="#e0b47f"
              strokeWidth="1"
              opacity=".6"
            />
            <ellipse
              cx="4"
              cy="-8"
              rx="2.7"
              ry="1.5"
              fill="none"
              stroke="#d2a376"
              strokeWidth=".8"
              opacity=".6"
            />
            <ellipse cx="-8" cy="11" rx="1.6" ry=".9" fill="#d6ab7d" opacity=".5" />
          </g>
        </g>
      </g>
    )
  if (terrain === 'basalt')
    return (
      <g
        className="pointer-events-none"
        data-art="basalt"
        transform={'rotate(' + variant * 120 + ')'}
      >
        <path d="m-23-7 14-11 15 5 12 12-15 5-15-3Z" fill="#75666b" opacity=".18" />
        <path d="m-20 9 10-6 16 4 13 9-15 6-16-5Z" fill="#433b42" opacity=".18" />
        <path
          d="m-21-7 12 3 9-4 14 7M0-8l4-9"
          fill="none"
          stroke="#40373e"
          strokeWidth=".8"
          opacity=".4"
        />
        <path
          d="m-19-8 10 3M-7 14l8 2"
          fill="none"
          stroke="#9a8388"
          strokeWidth=".7"
          opacity=".22"
        />
        <ellipse cx="12" cy="10" rx="3.5" ry="1.8" fill="#6c5c62" opacity=".65" />
        <ellipse cx="-12" cy="12" rx="1.5" ry=".8" fill="#a28b88" opacity=".25" />
      </g>
    )
  if (terrain === 'palm')
    return (
      <g className="pointer-events-none" data-art="palm">
        <ellipse cy="17" rx="19" ry="5" fill="#886039" opacity=".25" />
        <path d="M2 18Q-6 5 0-10" fill="none" stroke="#86603c" strokeWidth="5" />
        <path
          d="M0-10Q-18-23-23-6q12-7 23-4M0-10Q-4-30 11-24L0-10M0-10Q18-22 24-6q-12-7-24-4M0-10Q-15-5-13 7L0-10M0-10Q14-8 15 6Z"
          fill="#4f7751"
        />
        <path d="M0-10-17-12M0-10 18-12M0-10 7-23" stroke="#96a467" strokeWidth="1.4" />
        <circle cy="-8" r="2.5" fill="#bc864c" />
      </g>
    )
  if (terrain === 'sand')
    return (
      <g
        className="pointer-events-none"
        data-art="sand"
        transform={'translate(0 ' + (variant * 3 - 3) + ')'}
      >
        <path
          d="M-22 8Q-4-10 8-2T22 6"
          fill="none"
          stroke="#e6c081"
          strokeOpacity=".28"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="m-16 16q13-6 30-1"
          fill="none"
          stroke="#8b5c30"
          strokeOpacity=".22"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>
    )
  if (terrain === 'lake')
    return (
      <g className="pointer-events-none">
        <path
          d="m-16-4q6-5 12 0t12 0 12 0"
          fill="none"
          stroke="#bfe0ea"
          strokeOpacity=".5"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="m-12 6q6-5 12 0t12 0"
          fill="none"
          stroke="#bfe0ea"
          strokeOpacity=".3"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    )
  if (terrain === 'mountain')
    return (
      <g className="pointer-events-none">
        <ellipse cy="15" rx="20" ry="5" fill="#263c2e" opacity=".25" />
        <path d="m-23 15 13-23 13 23Z" fill="#8f9980" />
        <path d="m-10-8 13 23h-13Z" fill="#576651" />
        <path d="m-10 17 16-36 19 36Z" fill="#b2b69a" />
        <path d="M6-19 25 17H6Z" fill="#7d8b70" />
        <path d="m6-19-6 14 6-3 7 3Z" fill="#dedec0" />
      </g>
    )
  if (terrain === 'forest')
    return (
      <g className="pointer-events-none">
        <ellipse cy="16" rx="21" ry="6" fill="#1b3429" opacity=".3" />
        {[-12, 11, 0].map((x, i) => (
          <g key={x} transform={'translate(' + x + ' ' + (i === 2 ? 2 : -4) + ')'}>
            <path d="M0 7v10" stroke="#c2b085" strokeWidth="2" />
            <path d="m0-18-10 15h4l-8 13h28L6-3h4Z" fill={i === 2 ? '#344f39' : '#3d5b40'} />
            <path d="M0-18V10h14L6-3h4Z" fill="#254332" opacity=".7" />
            <path d="m0-18-10 15h4l-8 13" fill="none" stroke="#9baf79" strokeOpacity=".4" />
          </g>
        ))}
      </g>
    )
  return (
    <g
      className="pointer-events-none"
      opacity=".48"
      transform={'translate(' + (variant * 4 - 4) + ' ' + (variant * 3 - 5) + ')'}
    >
      <path
        d="m-8 5-3-5m3 5 1-8m0 8 4-3m11 8-2-6m2 6 3-4"
        fill="none"
        stroke="#d0d4a4"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <ellipse cx="11" cy="-8" rx="2.5" ry="1.4" fill="#4a6446" />
      <circle cx="-15" cy="13" r="1.2" fill="#d2c391" />
    </g>
  )
}

function PawnChip({
  pawn,
  active,
  protectedAlly,
  feature,
}: {
  pawn: Pawn
  active: boolean
  protectedAlly: boolean
  feature?: Tile['feature']
}) {
  const enemy = pawn.side === 'enemy'
  return (
    <g
      data-testid="pawn-chip"
      className="pointer-events-none transition-transform duration-350 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ transform: 'translate(' + hexX(pawn.q, pawn.r) + 'px, ' + hexY(pawn.r) + 'px)' }}
      aria-hidden="true"
    >
      <ellipse cy="17" rx="23" ry="9" fill="#10281e" opacity=".5" />
      {active && (
        <circle
          r="28"
          fill="#ead695"
          fillOpacity=".18"
          stroke="#f2df9e"
          strokeWidth="1.5"
          className="pawn-active-halo"
        />
      )}
      {pawn.escapeChance > 0 && (
        <circle r="25" fill="none" stroke="#b7e5de" strokeWidth="2" strokeDasharray="4 4" />
      )}
      {enemy ? (
        <path
          d="m0-23 20 11v24L0 23-20 12v-24Z"
          fill="url(#enemy-chip)"
          stroke="#d59d81"
          strokeWidth="1.5"
        />
      ) : (
        <circle r="22" fill="url(#player-chip)" stroke="#b2ceaa" strokeWidth="1.5" />
      )}
      <circle r="17.5" fill="none" stroke="#f5e5bf" strokeOpacity=".15" />
      <g transform="translate(-12 -15)" color={pawn.kind === 'king' ? '#f0d38e' : '#f1e8d2'}>
        <PawnIcon kind={pawn.kind} />
      </g>
      <text y="13" textAnchor="middle" fontSize="8" fontWeight="600" fill="#e9e5ce">
        {pawn.id.toString().padStart(2, '0')}
      </text>
      {feature && (
        <g data-art="feature-badge" transform="translate(-20 -19) scale(.43)">
          <circle r="28" fill="#24342e" stroke="#dec89a" strokeWidth="2" />
          <FeatureArt feature={feature} />
        </g>
      )}
      {protectedAlly && (
        <g data-art="protection-badge" transform="translate(10 -26) scale(.65)" color="#f6e5a6">
          <circle cx="12" cy="12" r="14" fill="#17362b" />
          <Icon name="shield" />
        </g>
      )}
      <rect x="-15" y="24" width="30" height="5" rx="2.5" fill="#17362b" />
      {Array.from({ length: pawn.maxHp }, (_, i) => (
        <rect
          key={i}
          x={-13 + (i * 26) / pawn.maxHp}
          y="25"
          width={26 / pawn.maxHp - 1}
          height="3"
          rx="1"
          fill={i < pawn.hp ? (enemy ? '#db9b7e' : '#d5deb0') : '#47614c'}
        />
      ))}
      {active && <path d="m0-35 4-5h-8Z" fill="#f2df9e" />}
    </g>
  )
}
