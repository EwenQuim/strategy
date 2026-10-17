import { restoreState } from '../lib/battleSnapshot.ts'
import { getBot } from './catalog.ts'
import type { BotRequest, BotResponse } from './worker.ts'

self.onmessage = async ({ data }: MessageEvent<BotRequest>) => {
  try {
    const state = restoreState(data.state)
    if (!state) throw new Error('Unreadable bot state')
    const actions = await getBot(data.config).chooseActions(state)
    self.postMessage({ actions } satisfies BotResponse)
  } catch (error) {
    self.postMessage({ error: String(error) } satisfies BotResponse)
  }
}
