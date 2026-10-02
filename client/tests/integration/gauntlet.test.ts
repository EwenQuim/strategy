import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CAMPAIGNS,
  isCampaignUnlocked,
  isLevelUnlocked,
  type AchievementCampaignLevel,
} from '../../src/lib/campaign.ts'
import { ACHIEVEMENTS, type AchievementId } from '../../src/lib/achievements.ts'
import { initialState as coreState } from '../../src/lib/engine/index.ts'
import { winnableAgainst } from '../campaign-actions.ts'

const gauntlet = CAMPAIGNS.find((pack) => pack.slug === 'gauntlet')!

test('The Gauntlet opens with achievements and gates each level on its own', () => {
  assert.ok(gauntlet.achievementGated)
  assert.equal(gauntlet.levels.length, ACHIEVEMENTS.length)
  assert.equal(gauntlet.levels.length, new Set(gauntlet.levels.map((level) => level.seed)).size)
  assert.equal(gauntlet.levels.length, new Set(gauntlet.levels.map((level) => level.name)).size)

  assert.equal(
    isCampaignUnlocked(gauntlet, () => 0, []),
    false,
  )
  assert.equal(
    isCampaignUnlocked(gauntlet, () => 0, ['speedrun']),
    true,
  )

  const level1 = gauntlet.levels[0] as AchievementCampaignLevel as unknown as {
    achievement: AchievementId
  }
  assert.equal(level1.achievement, 'speedrun')
  assert.equal(isLevelUnlocked(gauntlet, 1, [], []), false)
  assert.equal(isLevelUnlocked(gauntlet, 1, [], ['speedrun']), true)
  assert.equal(isLevelUnlocked(gauntlet, 2, [], ['speedrun']), false)
  assert.equal(isLevelUnlocked(gauntlet, 2, [], ['speedrun', 'reaper']), true)
})

test('Every Gauntlet level mirrors one distinct achievement and is replayable', () => {
  const mirrored = gauntlet.levels.map(
    (level) => (level as AchievementCampaignLevel).achievement,
  )
  assert.deepEqual([...mirrored].sort(), [...ACHIEVEMENTS.map(({ id }) => id)].sort())
  for (const level of gauntlet.levels) {
    const core = coreState(level.seed, level.setup)
    assert.deepEqual(core, coreState(level.seed, level.setup))
    assert.equal(core.pawns.length, level.setup.player.length + level.setup.enemy.length)
  }
})

test('All fifteen Gauntlet challenges stay winnable against their own difficulty', () => {
  for (const level of gauntlet.levels) {
    assert.ok(
      winnableAgainst(level, level.difficulty),
      'Gauntlet level ' + level.id + ': ' + level.name,
    )
  }
})
