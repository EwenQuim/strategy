import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  BIOMES,
  MAP_WIDTH,
  MAP_HEIGHT,
  key,
  makeMap,
  neighbors,
  passable,
  distFrom,
  initialState,
  reducer,
  targetingTiles,
  chargeDestinations,
  jumpDestinations,
  King,
  Swordsman,
  Archer,
  Magician,
  Ninja,
  RECRUIT_CLASSES,
  type Biome,
  type GameState,
  type Side,
  type Tile,
} from '../src/lib/engine/index.ts'
import { chooseBotActions } from '../src/lib/engine/bot.ts'
import { SeededRandom, seedState } from '../src/lib/engine/random.ts'

function components(tiles: Map<string, Tile>, terrain: Tile['terrain']): Tile[][] {
  const seen = new Set<string>()
  const found: Tile[][] = []
  for (const tile of tiles.values()) {
    const start = key(tile.q, tile.r)
    if (tile.terrain !== terrain || seen.has(start)) continue
    const group: Tile[] = []
    const frontier = [tile]
    seen.add(start)
    while (frontier.length) {
      const cur = frontier.pop()!
      group.push(cur)
      for (const n of neighbors(cur.q, cur.r)) {
        const k = key(n.q, n.r)
        const t = tiles.get(k)
        if (t && t.terrain === terrain && !seen.has(k)) {
          seen.add(k)
          frontier.push(t)
        }
      }
    }
    found.push(group)
  }
  return found
}

test('Each biome has deterministic, connected terrain and the intended obstacle shapes', () => {
  for (const biome of Object.keys(BIOMES) as Biome[]) {
    for (let index = 0; index < 100; index++) {
      const seed = 'review-' + index
      const tiles = makeMap(new SeededRandom(seedState(seed)), biome)
      assert.deepEqual(tiles, makeMap(new SeededRandom(seedState(seed)), biome))
      assert.equal(tiles.size, MAP_WIDTH * MAP_HEIGHT)
      const land = [...tiles.values()].filter(passable)
      assert.equal(distFrom(tiles, [land[0]]).size, land.length, biome + ': ' + seed)
      const { features } = BIOMES[biome]
      for (const obstacle of ['mountain', 'lake', 'lava'] as const) {
        if (!features.some((feature) => feature.terrain === obstacle))
          assert.equal(components(tiles, obstacle).length, 0)
      }
      if (features.some((feature) => feature.terrain === 'mountain'))
        assert.ok([...tiles.values()].every((tile) => tile.terrain !== 'forest'))
      for (const { terrain, min, max, shapes } of features) {
        const groups = components(tiles, terrain)
        assert.ok(groups.length >= min && groups.length <= max, biome + ': ' + seed)
        for (const group of groups) {
          assert.ok(shapes.some((shape) => shape.length === group.length))
          for (const tile of group) {
            const adjacent = neighbors(tile.q, tile.r).filter(
              (n) => tiles.get(key(n.q, n.r))?.terrain === terrain,
            ).length
            assert.ok(terrain === 'mountain' ? adjacent <= 2 : adjacent >= 2)
          }
        }
      }
    }
  }
})

test('Seeded games cover random biomes without Hell, broken shapes or isolated spawn tiles', () => {
  const biomes = new Set<Biome>()
  for (let index = 0; index < 100; index++) {
    const state = initialState('biome-' + index)
    biomes.add(state.biome)
    assert.deepEqual(reducer(state, { type: 'restart' }), state)
    const land = [...state.tiles.values()].filter(passable)
    const connected = distFrom(state.tiles, [state.pawns[0]])
    assert.equal(connected.size, land.length)
    for (const pawn of state.pawns) {
      assert.ok(connected.has(key(pawn.q, pawn.r)))
      assert.equal(state.tiles.get(key(pawn.q, pawn.r))?.terrain, BIOMES[state.biome].ground)
    }
    for (const terrain of ['lake', 'lava', 'mountain'] as const) {
      for (const feature of components(state.tiles, terrain)) {
        assert.ok(feature.length >= (terrain === 'mountain' ? 4 : 3))
      }
    }
  }
  assert.deepEqual(biomes, new Set(Object.keys(BIOMES).filter((biome) => biome !== 'hell')))
})

function lakeBattle(side: Side): GameState {
  const other = side === 'player' ? 'enemy' : 'player'
  return {
    ...initialState('lake-battle'),
    biome: 'verdant',
    hellfire: [],
    tiles: new Map(
      Array.from({ length: 7 }, (_, q) => [
        key(q, 0),
        { q, r: 0, terrain: q === 2 ? 'lake' : 'plain' },
      ]),
    ),
    pawns: [new Swordsman(1, 1, 0, side), new King(2, 0, 0, side), new King(3, 4, 0, other)],
    order: [1, 2, 3],
    active: 0,
  }
}

test('Lakes block walking and Charge for both sides, and cannot be Ninja landing tiles', () => {
  for (const side of ['player', 'enemy'] as const) {
    for (const Unit of [King, ...RECRUIT_CLASSES]) {
      const state = lakeBattle(side)
      state.pawns[0] = new Unit(1, 1, 0, side)
      for (const q of [2, 3]) assert.equal(reducer(state, { type: 'move', q, r: 0 }), state)
      assert.equal(distFrom(state.tiles, [state.pawns[0]]).has('3,0'), false)
      if (Unit === Swordsman) {
        assert.equal(chargeDestinations(state.tiles, state.pawns, state.pawns[0]).size, 0)
      }
      if (Unit === Ninja) {
        assert.ok(
          !jumpDestinations(state.tiles, state.pawns, state.pawns[0]).some(
            (t) => t.terrain === 'lake',
          ),
        )
        const targeting = reducer(state, { type: 'act', action: 'special' })
        assert.ok(!targetingTiles(targeting).has('2,0'))
        assert.equal(reducer(targeting, { type: 'specialAt', q: 2, r: 0 }), targeting)
      }
      let next = state
      for (const action of chooseBotActions(state)) {
        const result = reducer(next, action)
        assert.notEqual(result, next)
        next = result
        assert.ok(next.pawns.every((p) => passable(next.tiles.get(key(p.q, p.r)))))
      }
    }
  }
})

test('Arrows, Aimed shot, magic, and Fireball cross lakes for both sides', () => {
  for (const side of ['player', 'enemy'] as const) {
    for (const Unit of [Archer, Magician]) {
      const state = lakeBattle(side)
      state.pawns[0] = new Unit(1, 1, 0, side)
      state.pawns[2].q = 3
      for (const action of ['attack', 'special'] as const) {
        const targeting = reducer(state, { type: 'act', action })
        assert.ok(targetingTiles(targeting).has('3,0'))
        const next = reducer(targeting, {
          type: action === 'attack' ? 'attackAt' : 'specialAt',
          q: 3,
          r: 0,
        })
        assert.equal(next.pawns[2].hp, 7 - (Unit === Archer && action === 'special' ? 2 : 1))
        assert.equal(state.pawns[2].hp, 7)
        assert.equal(next.tiles.get('2,0')?.terrain, 'lake')
      }
    }
  }
})
