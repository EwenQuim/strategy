import { specialTexts } from '../i18n/specialTexts'
import { pawnPalette, tilePalette } from './art-palette'
import type { Targeting, TileChoice } from '../lib/tileChoices'
import {
  key,
  walkingPaths,
  protectorFor,
  inHellfire,
  pawnAt,
  sameHex,
  type Axial,
  type Pawn,
  type Tile,
} from '../lib/engine'
import { HexTile } from './HexTile'
import { hexPoints, hexX, hexY } from './hex-art'
import type { PlayerNames } from '../lib/game-mode'

interface TileLayerProps {
  viewBox: string
  tiles: Map<string, Tile>
  // Tiles rattled by the current bomb or fireball effect, null when none.
  quakeKeys: Set<string> | null
  // Alternating class so consecutive effects restart the keyframes.
  quakeClass: string
  pawns: Pawn[]
  hellfire: readonly Axial[]
  labels: PlayerNames
  active?: Pawn
  reach: Map<string, number>
  targets: Map<string, TileChoice>
  targetLabel: string
  targeting: Targeting
  preview: Axial | null
  rechoose?: Axial | null
  range: Set<string>
  onTileClick: (tile: Tile) => void
  onInspect: (tile: Tile) => void
}

// The board itself: the shared defs, the tile bases and the hex tiles, in one
// stateless svg. The compiler caches the call site, so renders that only touch
// the pawn layer skip this whole subtree without memo.
export function TileLayer({
  viewBox,
  tiles,
  quakeKeys,
  quakeClass,
  pawns,
  hellfire,
  labels,
  active,
  reach,
  targets,
  targetLabel,
  targeting,
  preview,
  rechoose,
  range,
  onTileClick,
  onInspect,
}: TileLayerProps) {
  const allTiles = [...tiles.values()]
  const chargeTargeting = targeting === 'charge'
  const paths =
    active && (reach.size || chargeTargeting)
      ? walkingPaths(tiles, pawns, active, chargeTargeting ? 2 : undefined)
      : new Map()

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
        <linearGradient id="lava-melt" x1="0" y1="0" x2=".8" y2="1">
          <stop stopColor={tilePalette.lavaStart} />
          <stop offset=".45" stopColor={tilePalette.lavaMiddle} />
          <stop offset="1" stopColor={tilePalette.lavaEnd} />
        </linearGradient>
        <radialGradient id="lava-glow" cx=".4" cy=".45" r=".6">
          <stop stopColor={tilePalette.glowStart} stopOpacity=".5" />
          <stop offset=".5" stopColor={tilePalette.glowMiddle} stopOpacity=".22" />
          <stop offset="1" stopColor={tilePalette.glowEnd} stopOpacity="0" />
        </radialGradient>
        <clipPath id="lava-hex">
          <polygon points={hexPoints} />
        </clipPath>
        <radialGradient id="active-halo">
          <stop stopColor={pawnPalette.active} stopOpacity=".7" />
          <stop offset=".4" stopColor={pawnPalette.halo} stopOpacity=".35" />
          <stop offset="1" stopColor={pawnPalette.halo} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="player-chip" x2="0" y2="1">
          <stop stopColor={pawnPalette.playerStart} />
          <stop offset="1" stopColor={pawnPalette.playerEnd} />
        </linearGradient>
        <linearGradient id="enemy-chip" x2="0" y2="1">
          <stop stopColor={pawnPalette.enemyStart} />
          <stop offset="1" stopColor={pawnPalette.enemyEnd} />
        </linearGradient>
        <linearGradient id="tile-light" x2="0.7" y2="1">
          <stop stopColor={tilePalette.light} stopOpacity=".13" />
          <stop offset="1" stopColor="var(--tile-shade)" stopOpacity=".12" />
        </linearGradient>
      </defs>
      <g data-art="tile-bases" transform="translate(0 5)" fill="var(--tile-base)">
        {allTiles.map((tile) => (
          <polygon
            key={key(tile.q, tile.r)}
            transform={'translate(' + hexX(tile.q, tile.r) + ' ' + hexY(tile.r) + ')'}
            points={hexPoints}
            className={
              quakeKeys?.has(key(tile.q, tile.r))
                ? quakeClass + ' motion-reduce:animate-none'
                : undefined
            }
          />
        ))}
      </g>
      {allTiles.map((tile) => {
        const tileKey = key(tile.q, tile.r)
        const occupant = pawnAt(pawns, tile)
        const choice = targets.get(tileKey)
        const target = !!choice
        const strike = choice?.kind === 'attack' || choice?.kind === 'pounce'
        const cost = reach.get(tileKey)
        const damage =
          target && !strike && targeting === 'jump'
            ? Number(tile.terrain === 'lava')
            : (paths.get(tileKey)?.damage ?? 0)
        return (
          <HexTile
            key={tileKey}
            tile={tile}
            occupant={occupant}
            protector={occupant && protectorFor(pawns, occupant)}
            selected={sameHex(active, tile)}
            cost={cost}
            damage={damage}
            lethal={!!active && damage >= active.hp}
            target={target}
            strike={strike}
            targetLabel={
              target ? (strike ? specialTexts[active!.special.name] : targetLabel) : ''
            }
            previewed={sameHex(preview, tile)}
            rechoosing={!!rechoose && sameHex(rechoose, tile)}
            inRange={range.has(tileKey)}
            quakeClass={quakeKeys?.has(tileKey) ? quakeClass : ''}
            warned={inHellfire(hellfire, tile)}
            impactCenter={hellfire.some((center) => sameHex(center, tile))}
            labels={labels}
          />
        )
      })}
    </svg>
  )
}
