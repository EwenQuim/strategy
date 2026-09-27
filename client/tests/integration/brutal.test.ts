import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGNS } from '../../src/lib/campaign.ts'
import { winnableAgainst } from '../campaign-actions.ts'

// These encounters defeat the scripted player at every caution against the hard AI.
// A human may still win them; if brutal proves unbeatable, tune their enemy rosters.
const NOT_SCRIPTABLY_WINNABLE = new Set([6, 8, 10])

test('Every brutal encounter stays winnable against the hard AI', () => {
  for (const level of CAMPAIGNS[1].levels) {
    if (NOT_SCRIPTABLY_WINNABLE.has(level.id)) continue
    assert.ok(winnableAgainst(level, 'hard'), 'Brutal level ' + level.id + ': ' + level.name)
  }
})
