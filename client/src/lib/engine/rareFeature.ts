import type { SeededRandom } from './random.ts'
import {
  MAP_HEIGHT,
  distFrom,
  key,
  mirrorAxial,
  passable,
  type Tile,
  type TileFeature,
} from './hex.ts'

// A den blocks the ground between the armies; a portal pair links mirrored spots on opposite
// flanks. Either way the land must stay connected.
export function placeRareFeature(
  tiles: Map<string, Tile>,
  reserved: Set<string>,
  feature: TileFeature,
  random: SeededRandom,
  symmetric: boolean,
) {
  const paired = feature === 'portal' || symmetric
  const group = (tile: Tile) => {
    const mirror = mirrorAxial(tile)
    return paired ? [tile, tiles.get(key(mirror.q, mirror.r))!] : [tile]
  }
  const candidates = [...tiles.values()].filter(
    (tile) =>
      (feature === 'portal'
        ? tile.r === 3 || tile.r === 4
        : tile.r === MAP_HEIGHT / 2 - 1 || tile.r === MAP_HEIGHT / 2) &&
      group(tile).every(
        (t) =>
          passable(t) && t.terrain !== 'lava' && !t.feature && !reserved.has(key(t.q, t.r)),
      ),
  )
  const offset = Math.floor(random.next() * candidates.length)
  for (let i = 0; i < candidates.length; i++) {
    const placed = group(candidates[(offset + i) % candidates.length])
    for (const tile of placed) tile.feature = feature
    const land = [...tiles.values()].filter(passable)
    if (distFrom(tiles, land.slice(0, 1)).size === land.length) return
    for (const tile of placed) delete tile.feature
  }
}
