import { hexOf, key, type Terrain, type Tile, type TileFeature } from './hex.ts'

const terrainSymbols: Record<string, Terrain> = {
  '.': 'plain',
  f: 'forest',
  '^': 'mountain',
  '~': 'lake',
  s: 'sand',
  p: 'palm',
  b: 'basalt',
  l: 'lava',
}

const featureSymbols: Record<string, TileFeature> = {
  W: 'watchtower',
  H: 'spring',
  R: 'rune',
  P: 'portal',
  D: 'den',
}

export function mapFromRows(rows: readonly string[]): Map<string, Tile> {
  if (!Array.isArray(rows) || !rows.length) throw new Error('Map must contain at least one row')
  const tiles = new Map<string, Tile>()
  for (let row = 0; row < rows.length; row++) {
    const line = rows[row]
    if (typeof line !== 'string') throw new Error('Map row ' + row + ' must be a string')
    for (let col = 0; col < line.length; col++) {
      const symbol = line[col]
      if (symbol === '_') continue
      const feature = Object.hasOwn(featureSymbols, symbol) ? featureSymbols[symbol] : undefined
      if (!feature && !Object.hasOwn(terrainSymbols, symbol))
        throw new Error('Unknown map terrain: ' + symbol)
      const { q, r } = hexOf(col, row)
      tiles.set(key(q, r), {
        q,
        r,
        terrain: feature ? 'plain' : terrainSymbols[symbol],
        ...(feature ? { feature } : {}),
      })
    }
  }
  if (!tiles.size) throw new Error('Map must contain at least one tile')
  const features = [...tiles.values()].filter((tile) => tile.feature)
  if (features.length > 2) throw new Error('Map features must be limited to two tiles')
  if (features.filter((tile) => tile.feature === 'portal').length === 1)
    throw new Error('Portals must be authored in pairs')
  return tiles
}
