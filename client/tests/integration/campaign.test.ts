import { test } from 'node:test'
import { CAMPAIGNS } from '../../src/campaign.ts'
import { replayVictory, replayAgainstBot } from '../campaign-replays.ts'

for (const pack of CAMPAIGNS)
  test(`${pack.name}: every level has a reproducible player victory against its configured bot`, async () => {
    for (const level of pack.levels) {
      replayVictory(level)
      await replayAgainstBot(level)
    }
  })
