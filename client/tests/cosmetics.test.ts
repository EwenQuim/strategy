import assert from 'node:assert/strict'
import { test } from 'node:test'
import { COSMETICS, availableCosmetics, isCosmeticUnlocked } from '../src/cosmetics.ts'

test('Three skins ship free and one more opens every five achievements', () => {
  assert.equal(COSMETICS.length, 6)
  assert.deepEqual(
    COSMETICS.map(({ requiredAchievements }) => requiredAchievements),
    [0, 0, 0, 5, 10, 15],
  )
  assert.deepEqual(
    availableCosmetics(0).map(({ id }) => id),
    ['emerald', 'iron', 'royal'],
  )
  assert.deepEqual(
    availableCosmetics(4).map(({ id }) => id),
    ['emerald', 'iron', 'royal'],
  )
  assert.deepEqual(
    availableCosmetics(5).map(({ id }) => id),
    ['emerald', 'iron', 'royal', 'ember'],
  )
  assert.deepEqual(
    availableCosmetics(11).map(({ id }) => id),
    ['emerald', 'iron', 'royal', 'ember', 'shadow'],
  )
  assert.equal(isCosmeticUnlocked(COSMETICS[5], 14), false)
  assert.equal(isCosmeticUnlocked(COSMETICS[5], 15), true)
  assert.equal(availableCosmetics(15).length, COSMETICS.length)
})

test('Every skin defines a full palette', () => {
  for (const cosmetic of COSMETICS) {
    assert.match(cosmetic.base[0], /^#[0-9a-f]{6}$/i)
    assert.match(cosmetic.base[1], /^#[0-9a-f]{6}$/i)
    assert.match(cosmetic.rim, /^#[0-9a-f]{6}$/i)
    assert.match(cosmetic.ink, /^#[0-9a-f]{6}$/i)
  }
})
