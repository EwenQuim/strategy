import { key, walkingPaths, type Pawn, type Tile } from '../lib/engine'
import { hexX, hexY } from './hex-art'

// Marks the tiles the acting unit can reach this turn and use its special from, such as the
// skulls where a Necromancer stands close enough to an enemy to summon. They stay inside the
// unit's own stride, so they read as its placement options, never as a haze over the field.
export function ReadyZone({
  pawn,
  tiles,
  pawns,
}: {
  pawn: Pawn
  tiles: Map<string, Tile>
  pawns: Pawn[]
}) {
  const zone = pawn.special.readyZone
  if (!zone) return null
  const here = key(pawn.q, pawn.r)
  const marks = [...walkingPaths(tiles, pawns, pawn).keys()]
    .filter((tileKey) => tileKey !== here)
    .map((tileKey) => tiles.get(tileKey)!)
    .filter((tile) => zone.from(pawn, tile, pawns))
  if (!marks.length) return null
  return (
    <g className="pointer-events-none" data-art="ready-zone" aria-hidden="true">
      {marks.map((tile) => (
        <g
          key={key(tile.q, tile.r)}
          transform={
            'translate(' +
            hexX(tile.q, tile.r) +
            ' ' +
            hexY(tile.r) +
            ') translate(-6.6 -6.6) scale(.55)'
          }
          opacity=".6"
        >
          <path
            d={zone.icon}
            fill="none"
            stroke="#cfc9b9"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
    </g>
  )
}
