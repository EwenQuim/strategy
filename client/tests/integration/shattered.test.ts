import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGNS } from '../../src/lib/campaign.ts'
import { winnableAgainst } from '../campaign-actions.ts'

test('Every shattered encounter stays winnable at its own difficulty', () => {
  const shattered = CAMPAIGNS[3]
  assert.equal(shattered.levels.length, 10)
  for (const level of shattered.levels)
    assert.ok(
      winnableAgainst(level, level.difficulty),
      'Shattered level ' + level.id + ': ' + level.name,
    )
})
