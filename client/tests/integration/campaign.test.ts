import { test } from 'node:test'
import { CAMPAIGNS } from '../../src/lib/campaign.ts'
import { replayVictory } from '../campaign-replays.ts'

for (const pack of CAMPAIGNS)
  test(`${pack.name}: every level has a reproducible player victory`, () => {
    for (const level of pack.levels) replayVictory(level)
  })
