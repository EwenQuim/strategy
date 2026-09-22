import { useEffect, useRef } from 'react'
import { key, type Axial, type BattleEffect, type Pawn, type Tile } from '../lib/engine'
import { Icon, PawnIcon } from './Icon'

const SIZE = 34
const hexX = (q: number, r: number) => SIZE * Math.sqrt(3) * (q + r / 2)
const hexY = (r: number) => SIZE * 1.5 * r
const hexPoints = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i - 30)
  return [SIZE * 0.95 * Math.cos(angle), SIZE * 0.95 * Math.sin(angle)].join(',')
}).join(' ')

const terrainColors = {
  plain: '#7d8963',
  forest: '#536e51',
  mountain: '#737c69',
  lake: '#4c7186',
  sand: '#ceb27a',
}

interface BattlefieldProps {
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
      className="battlefield"
      role="group"
      aria-label="Battlefield. Select a highlighted tile to move or an enemy to attack."
    >
      <defs>
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
          <stop offset="1" stopColor="#10291b" stopOpacity=".12" />
        </linearGradient>
      </defs>
      <g transform="translate(0 5)" fill="#263f30">
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
        const selected = active?.q === tile.q && active.r === tile.r
        const target = targets.has(tileKey)
        const previewed = preview?.q === tile.q && preview.r === tile.r
        const cost = reach.get(tileKey)
        const canMove = cost !== undefined && cost > 0
        const interactive = !!target || canMove
        const fill = target
          ? targetLabel === 'Attack'
            ? '#b98370'
            : '#b79dce'
          : selected || previewed
            ? '#c9b77f'
            : canMove
              ? '#a3bd88'
              : terrainColors[tile.terrain]
        const label = occupant
          ? (occupant.side === 'player' ? 'Your ' : 'Enemy ') +
            occupant.kind +
            ' #' +
            occupant.id +
            ', ' +
            occupant.hp +
            ' health'
          : tile.terrain +
            ', column ' +
            (tile.q + Math.floor(tile.r / 2) + 1) +
            ', row ' +
            (tile.r + 1)
        const actionLabel = target
          ? targetLabel + ' ' + label
          : canMove
            ? 'Move to ' + label + ', ' + cost + ' energy'
            : label
        return (
          <g
            key={tileKey}
            transform={'translate(' + hexX(tile.q, tile.r) + ' ' + hexY(tile.r) + ')'}
            className={'hex-tile' + (interactive ? ' is-interactive' : '')}
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
              className="tile-face"
              points={hexPoints}
              fill={fill}
              stroke="#ecedcc"
              strokeOpacity=".13"
              strokeWidth="1"
            />
            <polygon points={hexPoints} fill="url(#tile-light)" className="tile-detail" />
            {!occupant && (
              <TerrainArt terrain={tile.terrain} variant={Math.abs(tile.q + tile.r) % 3} />
            )}
            {canMove && !occupant && (
              <g className="move-cost">
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
              <g transform="translate(-12 -12)" color="#fff4cb" className="tile-detail">
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
                className="target-ring"
              />
            )}
          </g>
        )
      })}
      {pawns.map((pawn) => (
        <PawnChip key={pawn.id} pawn={pawn} active={active?.id === pawn.id} />
      ))}
      {effect && (
        <g key={effectId} className={'battle-effect effect-' + effect.kind} aria-hidden="true">
          {effect.kind !== 'escape' && effect.kind !== 'rally' && (
            <line
              x1={hexX(effect.from.q, effect.from.r)}
              y1={hexY(effect.from.r)}
              x2={hexX(effect.to.q, effect.to.r)}
              y2={hexY(effect.to.r)}
              pathLength="1"
              className="battle-trail"
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
                className="battle-impact"
              />
            </g>
          )}
        </g>
      )}
      {!!effect?.impacts?.length && (
        <g key={'impacts-' + effectId} className="combat-impacts" aria-hidden="true">
          {effect.impacts.map((hit) => (
            <g
              key={key(hit.q, hit.r)}
              transform={'translate(' + hexX(hit.q, hit.r) + ' ' + hexY(hit.r) + ')'}
            >
              <g className={'combat-impact ' + (hit.damage > 0 ? 'impact-hit' : 'impact-miss')}>
                <circle r="28" className="impact-ring" />
                {hit.damage > 0 && (
                  <path
                    className="impact-rays"
                    d="M0-34v-8M24-24l6-6M34 0h8M24 24l6 6M0 34v8M-24 24l-6 6M-34 0h-8M-24-24l-6-6"
                  />
                )}
                <text y="8" textAnchor="middle" className="impact-label">
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

function TerrainArt({ terrain, variant }: { terrain: Tile['terrain']; variant: number }) {
  if (terrain === 'sand')
    return (
      <g
        className="tile-detail"
        fill="none"
        stroke="#f3d9a2"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity=".65"
      >
        <path d="m-19 5q10-12 22-4t17 0m-28 11q8-6 16-3" />
      </g>
    )
  if (terrain === 'lake')
    return (
      <g className="tile-detail">
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
      <g className="tile-detail">
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
      <g className="tile-detail">
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
      className="tile-detail"
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

function PawnChip({ pawn, active }: { pawn: Pawn; active: boolean }) {
  const enemy = pawn.side === 'enemy'
  return (
    <g
      className="pawn-chip"
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
          className="active-halo"
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
