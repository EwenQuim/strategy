import * as m from '../i18n/game'
import { specialTexts } from '../i18n/specialTexts'
import type { TileChoice, Targeting } from '../lib/tileChoices'
import {
  key,
  walkingPaths,
  inHellfire,
  sameHex,
  type Axial,
  type BattleEffect,
  type Pawn,
  type Tile,
} from '../lib/engine'
import { SupportHalos } from './SupportFeedback'
import { BattlefieldEffects } from './BattlefieldEffects'
import { HexTile } from './HexTile'
import { PawnChip } from './PawnChip'
import { SIZE, hexPoints, hexX, hexY } from './hex-art'
import type { PlayerNames } from '../lib/game-mode'

interface BattlefieldProps {
  labels: PlayerNames
  tiles: Map<string, Tile>
  pawns: Pawn[]
  hellfire: readonly Axial[]
  active?: Pawn
  reach: Map<string, number>
  targets: Map<string, TileChoice>
  targetLabel: string
  targeting: Targeting
  preview: Axial | null
  rechoose?: Axial | null
  range: Set<string>
  threats: Set<string>
  effect: BattleEffect | null
  effectId: number
  onTileClick: (tile: Tile) => void
  onInspect: (tile: Tile) => void
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
  targeting,
  preview,
  rechoose,
  range,
  threats,
  effect,
  effectId,
  onTileClick,
  onInspect,
}: BattlefieldProps) {
  const chargeTargeting = targeting === 'charge'
  const paths =
    active && (reach.size || chargeTargeting)
      ? walkingPaths(tiles, pawns, active, chargeTargeting ? 2 : undefined)
      : new Map()
  const shake = !!effect?.impacts?.some((hit) => hit.damage > 0)
  const allTiles = [...tiles.values()]
  const xs = allTiles.map((t) => hexX(t.q, t.r))
  const ys = allTiles.map((t) => hexY(t.r))
  const pad = SIZE * 1.35
  const [minX, minY] = [Math.min(...xs) - pad, Math.min(...ys) - pad]
  const viewBox = [minX, minY, Math.max(...xs) - minX + pad, Math.max(...ys) - minY + pad].join(
    ' ',
  )

  // These indexes answer every per-tile lookup below in one pass over the army.
  const occupants = new Map<string, Pawn>()
  const byId = new Map<number, Pawn>()
  for (const pawn of pawns) {
    occupants.set(key(pawn.q, pawn.r), pawn)
    byId.set(pawn.id, pawn)
  }
  const protectors = new Map<number, Pawn>()
  for (const protector of pawns) {
    const ally = protector.protectingId === null ? undefined : byId.get(protector.protectingId)
    if (ally && ally.side === protector.side && ally.id !== protector.id)
      protectors.set(ally.id, protector)
  }

  // Taps bubble up from the tiles to here, so tiles carry no callbacks and
  // unchanged ones skip rendering entirely. The role attribute mirrors each
  // tile's own interactive decision.
  const onTileTap = (event: React.MouseEvent | React.KeyboardEvent) => {
    const el =
      event.target instanceof Element ? event.target.closest<SVGElement>('[data-q]') : null
    const tile = el && tiles.get(key(Number(el.dataset.q), Number(el.dataset.r)))
    if (!el || !tile) return
    if (el.getAttribute('role') === 'button') onTileClick(tile)
    else onInspect(tile)
  }
  const onTileKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onTileTap(event)
  }

  return (
    <div
      className={
        'relative size-full max-w-[860px] touch-manipulation select-none motion-reduce:animate-none' +
        // Alternating keyframe names restart the shake on consecutive hits.
        (shake
          ? effectId % 2
            ? ' battlefield-shake'
            : ' battlefield-shake battlefield-shake--alt'
          : '')
      }
      data-testid="battlefield"
      role="group"
      aria-label={m.battlefieldHint}
    >
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 size-full drop-shadow-[0_18px_20px_#0a211b60]"
        onClick={onTileTap}
        onKeyDown={onTileKeyDown}
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
          <pattern id="threat-hatch" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="3.5" cy="3.5" r="1.1" fill="#ff8a6e" opacity=".75" />
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
          const occupant = occupants.get(tileKey)
          const target = targets.has(tileKey)
          const strike = targets.get(tileKey)?.kind === 'attack'
          const cost = reach.get(tileKey)
          return (
            <HexTile
              key={tileKey}
              tile={tile}
              occupant={occupant}
              protector={occupant && protectors.get(occupant.id)}
              active={active}
              cost={cost}
              damage={
                target && !strike && targeting === 'jump'
                  ? Number(tile.terrain === 'lava')
                  : (paths.get(tileKey)?.damage ?? 0)
              }
              target={target}
              strike={strike}
              targetLabel={
                target ? (strike ? specialTexts[active!.special.name] : targetLabel) : undefined
              }
              previewed={sameHex(preview, tile)}
              rechoosing={!!rechoose && sameHex(rechoose, tile)}
              inRange={range.has(tileKey)}
              threatened={threats.has(tileKey)}
              warned={inHellfire(hellfire, tile)}
              impactCenter={hellfire.some((center) => sameHex(center, tile))}
              labels={labels}
            />
          )
        })}
      </svg>
      <SupportHalos key={'halos-' + effectId} effect={effect} tiles={tiles} viewBox={viewBox} />
      {/* Pawn moves and combat effects repaint only this composited layer, never the tiles and their drop-shadow. */}
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="pointer-events-none absolute inset-0 size-full will-change-transform"
        aria-hidden="true"
      >
        {pawns.map((pawn) => (
          <PawnChip
            key={pawn.id}
            pawn={pawn}
            feature={tiles.get(key(pawn.q, pawn.r))?.feature}
            active={active?.id === pawn.id}
            protectedAlly={protectors.has(pawn.id)}
            topRow={hexY(pawn.r) === minY + pad}
          />
        ))}
        <BattlefieldEffects effect={effect} effectId={effectId} />
      </svg>
    </div>
  )
}
