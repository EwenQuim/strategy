import {
  hexDist,
  key,
  passable,
  Skeleton,
  type Pawn,
  type Side,
  type Tile,
} from '../lib/engine'
import { hexX, hexY } from './hex-art'

// The little skulls that mark where a Necromancer must stand to summon: free ground within
// 2 hexes of an enemy. Shown while a Necromancer acts, so the class reads as a front-line
// unit that cannot flood the field from the safety of its back line.
export function SummonZone({
  tiles,
  pawns,
  side,
}: {
  tiles: Map<string, Tile>
  pawns: readonly Pawn[]
  side: Side
}) {
  const marks = [...tiles.values()].filter(
    (tile) =>
      passable(tile) &&
      !pawns.some((pawn) => pawn.q === tile.q && pawn.r === tile.r) &&
      pawns.some((foe) => foe.side !== side && hexDist(foe, tile) <= 2),
  )
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
