import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGNS } from '../../src/lib/campaign.ts'
import { playToTheEnd } from '../campaign-actions.ts'

// Battles are deterministic, so each level replays only the caution the scripted player wins with.
const WINNING_CAUTION: Record<string, readonly number[]> = {
  'war-of-the-ring': [0.25, 1, 0.25, 0.25, 0.25, 0.25, 1.5, 1.5],
  'iron-throne': [0.25, 0.25, 2, 2, 1.5, 1, 0.25, 0.25],
}

test('Every story pack encounter is winnable against the hard AI', () => {
  const packs = CAMPAIGNS.filter((pack) => pack.requiredVictories)
  assert.deepEqual(
    packs.map((pack) => pack.slug),
    Object.keys(WINNING_CAUTION),
  )
  for (const pack of packs) {
    assert.equal(WINNING_CAUTION[pack.slug].length, pack.levels.length)
    for (const level of pack.levels)
      assert.equal(
        playToTheEnd(level, 'hard', WINNING_CAUTION[pack.slug][level.id - 1]).winner,
        'player',
        pack.slug + ' level ' + level.id + ': ' + level.name,
      )
  }
})
