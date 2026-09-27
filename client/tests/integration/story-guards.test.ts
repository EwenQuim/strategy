import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGNS } from '../../src/lib/campaign.ts'
import { winnableAgainst } from '../campaign-actions.ts'

for (const [slug, id] of [
  ['war-of-the-ring', 2],
  ['iron-throne', 3],
  ['iron-throne', 4],
] as const) {
  const level = CAMPAIGNS.find((pack) => pack.slug === slug)!.levels[id - 1]
  test(level.name + ' stays winnable after the AI safety fixes', () => {
    assert.ok(winnableAgainst(level, level.difficulty), level.name)
  })
}
