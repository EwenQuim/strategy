import {
  DEFAULT_MAP_SIZE,
  distFrom,
  hexDist,
  hexOf,
  key,
  mirrorAxial,
  neighbors,
  passable,
  type Axial,
  type MapSize,
  type Terrain,
  type Tile,
  type TileFeature,
} from './hex.ts'
import { BIOMES, type Biome } from './biomes/index.ts'
import type { MapFeature, Shape } from './biomes/biome.ts'
import type { SeededRandom } from './random.ts'

const roll = (min: number, max: number, random: SeededRandom) =>
  min + Math.floor(random.next() * (max - min + 1))

export const TILE_FEATURES: readonly TileFeature[] = ['watchtower', 'spring', 'rune']

function orient(shape: Shape, random: SeededRandom): Shape {
  const rotations = Math.floor(random.next() * 6)
  const flip = random.next() < 0.5
  return shape.map(([q, r]) => {
    if (flip) [q, r] = [r, q]
    for (let i = 0; i < rotations; i++) [q, r] = [-r, q + r]
    return [q, r]
  })
}

function shapeFits(
  tiles: Map<string, Tile>,
  reserved: Set<string>,
  anchor: Axial,
  shape: Shape,
  terrain: Terrain,
) {
  return shape.every(([q, r]) => {
    const k = key(anchor.q + q, anchor.r + r)
    const tile = tiles.get(k)
    if (!passable(tile) || reserved.has(k)) return false
    return neighbors(anchor.q + q, anchor.r + r).every((n) => {
      const nt = tiles.get(key(n.q, n.r))
      return !nt || nt.terrain !== terrain
    })
  })
}

function tryPlaceConnectedTerrain(
  tiles: Map<string, Tile>,
  allTiles: Tile[],
  featureTiles: Tile[],
  terrain: Terrain,
): boolean {
  const previousTerrain = featureTiles.map((tile) => tile.terrain)
  for (const tile of featureTiles) tile.terrain = terrain
  const land = allTiles.filter(passable)
  if (distFrom(tiles, land.slice(0, 1)).size === land.length) return true
  featureTiles.forEach((tile, index) => {
    tile.terrain = previousTerrain[index]
  })
  return false
}

type Placement = { anchor: Axial; shape: Shape }

const placementCells = ({ anchor, shape }: Placement): Axial[] =>
  shape.map(([q, r]) => ({ q: anchor.q + q, r: anchor.r + r }))

function placementsTouch(a: Placement, b: Placement): boolean {
  const aKeys = new Set(placementCells(a).map((cell) => key(cell.q, cell.r)))
  const bKeys = new Set(placementCells(b).map((cell) => key(cell.q, cell.r)))
  return placementCells(a).some(
    (cell) =>
      bKeys.has(key(cell.q, cell.r)) ||
      neighbors(cell.q, cell.r).some((n) => {
        const k = key(n.q, n.r)
        return bKeys.has(k) && !aKeys.has(k)
      }),
  )
}

const inRectangle = (axial: Axial, size: MapSize): boolean => {
  const col = axial.q + Math.floor(axial.r / 2)
  return axial.r >= 0 && axial.r < size.height && col >= 0 && col < size.width
}

function anchorScore(
  tiles: Map<string, Tile>,
  size: MapSize,
  bias: NonNullable<MapFeature['anchorBias']>,
  tile: Tile,
): number {
  if (bias === 'bay')
    // Carved gaps inside the map outline read as bays that pools of water or lava extend.
    return -neighbors(tile.q, tile.r).filter(
      (n) => !tiles.has(key(n.q, n.r)) && inRectangle(n, size),
    ).length
  const center = hexOf((size.width - 1) >> 1, (size.height - 1) >> 1)
  return hexDist(tile, center)
}

function orderAnchors(
  tiles: Map<string, Tile>,
  size: MapSize,
  feature: MapFeature,
  random: SeededRandom,
  anchors: Tile[],
): Tile[] {
  const offset = Math.floor(random.next() * anchors.length)
  const rotated = [...anchors.slice(offset), ...anchors.slice(0, offset)]
  if (!feature.anchorBias) return rotated
  const scored = rotated.map((tile, index) => ({
    tile,
    index,
    score: anchorScore(tiles, size, feature.anchorBias!, tile),
  }))
  scored.sort((a, b) => a.score - b.score || a.index - b.index)
  return scored.map((entry) => entry.tile)
}

function placeFeature(
  tiles: Map<string, Tile>,
  anchors: Tile[],
  reserved: Set<string>,
  feature: MapFeature,
  random: SeededRandom,
  symmetric = false,
  size: MapSize = DEFAULT_MAP_SIZE,
) {
  const ordered = orderAnchors(tiles, size, feature, random, anchors)
  const count = roll(feature.min, feature.max, random)
  const placementsWanted = symmetric ? Math.ceil(count / 2) : count
  for (let i = 0; i < placementsWanted; i++) {
    const first = Math.floor(random.next() * feature.shapes.length)
    let placed = false
    for (let s = 0; s < feature.shapes.length && !placed; s++) {
      const shape = orient(feature.shapes[(first + s) % feature.shapes.length], random)
      for (const anchor of ordered) {
        const placements: Placement[] = symmetric
          ? [
              { anchor, shape },
              {
                anchor: mirrorAxial(anchor, size),
                shape: shape.map(([q, r]) => [-q, -r] as [number, number]),
              },
            ]
          : [{ anchor, shape }]
        if (
          !placements.every((p) =>
            shapeFits(tiles, reserved, p.anchor, p.shape, feature.terrain),
          )
        )
          continue
        if (symmetric && placementsTouch(placements[0], placements[1])) continue
        const placedTiles = placements.flatMap((p) =>
          placementCells(p).map((cell) => tiles.get(key(cell.q, cell.r))!),
        )
        if (!tryPlaceConnectedTerrain(tiles, anchors, placedTiles, feature.terrain)) continue
        for (const tile of placedTiles) reserved.add(key(tile.q, tile.r))
        placed = true
        break
      }
    }
  }
}

// Applies biome ground, scatter and features to an existing map shape, never
// touching the protected spawn tiles.
export function decorateMap(
  random: SeededRandom,
  biome: Biome,
  tiles: Map<string, Tile>,
  protectedTiles: readonly Axial[] = [],
  symmetric = false,
  size: MapSize = DEFAULT_MAP_SIZE,
): Map<string, Tile> {
  const { ground, scatter, features: terrainFeatures } = BIOMES[biome]
  const reserved = new Set(protectedTiles.map((p) => key(p.q, p.r)))
  if (symmetric)
    for (const p of protectedTiles) {
      const mirror = mirrorAxial(p, size)
      reserved.add(key(mirror.q, mirror.r))
    }
  const rows = symmetric ? size.height / 2 : size.height
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < size.width; col++) {
      const { q, r } = hexOf(col, row)
      if (!tiles.has(key(q, r))) continue
      const pair: Axial[] = symmetric ? [{ q, r }, mirrorAxial({ q, r }, size)] : [{ q, r }]
      const blocked = pair.some((t) => reserved.has(key(t.q, t.r)))
      const terrain =
        scatter && !blocked && random.next() < scatter.chance ? scatter.terrain : ground
      for (const t of pair) tiles.get(key(t.q, t.r))!.terrain = terrain
    }
  }
  for (const feature of terrainFeatures)
    placeFeature(tiles, [...tiles.values()], reserved, feature, random, symmetric, size)
  const featureRoll = random.next()
  const drawn = featureRoll < 0.5 ? 0 : featureRoll < 0.9 ? 1 : 2
  const count = symmetric ? Math.ceil(drawn / 2) : drawn
  const candidates = [...tiles.values()].filter(
    (tile) =>
      (tile.r === size.height / 2 - 1 || tile.r === size.height / 2) &&
      passable(tile) &&
      tile.terrain !== 'lava' &&
      !reserved.has(key(tile.q, tile.r)),
  )
  const features = [...TILE_FEATURES]
  for (let i = 0; i < count && candidates.length; i++) {
    const [tile] = candidates.splice(Math.floor(random.next() * candidates.length), 1)
    const [feature] = features.splice(Math.floor(random.next() * features.length), 1)
    tile.feature = feature
    if (symmetric) {
      const mirror = mirrorAxial(tile, size)
      const mirrorTile = tiles.get(key(mirror.q, mirror.r))!
      mirrorTile.feature = feature
      candidates.splice(candidates.indexOf(mirrorTile), 1)
    }
  }
  return tiles
}
