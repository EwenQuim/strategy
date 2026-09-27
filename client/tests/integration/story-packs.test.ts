import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGNS } from '../../src/lib/campaign.ts'
import { initialState as coreState } from '../../src/lib/engine/index.ts'
import { winnableAgainst } from '../campaign-actions.ts'

const sparta = CAMPAIGNS.find((pack) => pack.slug === 'hot-gates')!
const ragnarok = CAMPAIGNS.find((pack) => pack.slug === 'ragnarok')!

test('The Hot Gates and Ragnarok packs stay winnable level by level', () => {
  for (const pack of [sparta, ragnarok]) {
    assert.equal(pack.levels.length, 5)
    assert.equal(new Set(pack.levels.map((level) => level.seed)).size, 5)
    assert.equal(new Set(pack.levels.map((level) => level.name)).size, 5)
    for (const level of pack.levels) {
      const core = coreState(level.seed, level.setup)
      assert.deepEqual(core, coreState(level.seed, level.setup))
      assert.ok(
        winnableAgainst(level, level.difficulty),
        pack.slug + ' level ' + level.id + ': ' + level.name,
      )
    }
  }
})

test('The Hot Gates pass funnels every horde through a two-tile corridor', () => {
  for (const id of [2, 3]) {
    const level = sparta.levels[id - 1]
    const tiles = coreState(level.seed, level.setup).tiles
    for (const row of [3, 4, 5, 6]) {
      const open = [...tiles.values()].filter(
        (tile) => tile.r === row && tile.terrain === 'plain',
      )
      assert.equal(open.length, 2, 'Two open tiles per pass row in level ' + id)
    }
  }
})

test('The Ragnarok finale burns on hellfire with two centers', () => {
  const level = ragnarok.levels[4]
  assert.equal(level.setup.biome, 'hell')
  assert.equal(level.setup.hellfireCount, 2)
  const state = coreState(level.seed, level.setup)
  assert.equal(state.hellfire.length, 2)
  assert.ok(state.pawns.some((pawn) => pawn.kind === 'berserker'))
  assert.ok(state.pawns.some((pawn) => pawn.kind === 'wolf'))
})
