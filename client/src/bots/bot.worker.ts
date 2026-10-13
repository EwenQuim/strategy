import { restoreState } from '../lib/battleSnapshot.ts'
import { getBot } from './catalog.ts'
import type { BotRequest } from './worker.ts'

self.onmessage = async ({ data }: MessageEvent<BotRequest>) => {
  const state = restoreState(data.state)
  const actions = state
    ? await getBot(data.config)
        .chooseActions(state)
        .catch(() => [])
    : []
  self.postMessage(actions)
}
