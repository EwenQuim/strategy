import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  Archer,
  hexDist,
  key,
  rangeTiles,
  threatenedTiles,
  type Tile,
} from '../src/lib/engine/index.ts'
import { Wolf } from '../src/lib/engine/pawns/wolf.ts'

function plains(): Map<string, Tile> {
  const tiles = new Map<string, Tile>()
  for (let q = -5; q <= 5; q++)
    for (let r = -5; r <= 5; r++) tiles.set(key(q, r), { q, r, terrain: 'plain' })
  return tiles
}

test('Range previews follow the attack band, the special shape and the watchtower bonus', () => {
  const tiles = plains()
  const archer = new Archer(1, 0, 0, 'enemy')
  const attack = rangeTiles(archer, tiles, 'attack')
  assert.ok(
    [...tiles.values()].every(
      (tile) =>
        attack.has(key(tile.q, tile.r)) ===
        (hexDist(archer, tile) >= 2 && hexDist(archer, tile) <= 3),
    ),
  )

  const wolf = new Wolf(2, 0, 0, 'enemy')
  const cry = rangeTiles(wolf, tiles, 'special')
  assert.ok(cry.has(key(2, 0)) && !cry.has(key(3, 0)))

  tiles.set(key(0, 0), { q: 0, r: 0, terrain: 'plain', feature: 'watchtower' })
  assert.ok(rangeTiles(archer, tiles, 'attack').has(key(4, 0)))
})

test('Threat zone covers tiles a foe can walk to and then strike, but not beyond', () => {
  const tiles = plains()
  const wolf = new Wolf(1, 0, 0, 'enemy')
  const threats = threatenedTiles(tiles, [wolf], 'enemy')
  assert.ok(threats.has(key(3, 0)))
  assert.ok(!threats.has(key(4, 0)))
  assert.equal(threatenedTiles(tiles, [wolf], 'player').size, 0)
})
