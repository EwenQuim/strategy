import { hexDist, key, Skeleton, walkingPaths, type Pawn, type Tile } from '../lib/engine'
import { hexX, hexY } from './hex-art'

// The little skulls that mark where the acting Necromancer must stand to summon: the tiles it
// can reach this turn that lie within 2 hexes of an enemy, the proximity Summon demands. They
// stay inside the Necromancer's own stride, so they read as its placement options, never as a
// haze over every enemy on the field.
export function SummonZone({
  pawn,
  tiles,
  pawns,
}: {
  pawn: Pawn
  tiles: Map<string, Tile>
  pawns: Pawn[]
}) {
  const here = key(pawn.q, pawn.r)
  const marks = [...walkingPaths(tiles, pawns, pawn).keys()]
    .filter((tileKey) => tileKey !== here)
    .map((tileKey) => tiles.get(tileKey)!)
    .filter((tile) => pawns.some((foe) => foe.side !== pawn.side && hexDist(foe, tile) <= 2))
  if (!marks.length) return null
  return (
    <g className="pointer-events-none" data-art="summon-zone" aria-hidden="true">
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
            d={Skeleton.icon}
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
