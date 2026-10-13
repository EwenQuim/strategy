import { snapshotState } from '../lib/battleSnapshot.ts'
import type { Action } from '../lib/engine/index.ts'
import { BOTS, getBot, type BotConfig } from './catalog.ts'
import type { Bot } from './bot.ts'

export type BotRequest = {
  config: BotConfig
  state: ReturnType<typeof snapshotState>
}

export function getBrowserBot(config: BotConfig): Bot & { cancel(): void } {
  const bot = getBot(config)
  let cancel = () => {}
  return {
    name: bot.name,
    options: bot.options,
    cancel: () => cancel(),
    chooseActions(state) {
      if (BOTS[config.name].execution === 'main') return bot.chooseActions(state)
      cancel()
      return new Promise<Action[]>((resolve, reject) => {
        const worker = new Worker(new URL('./bot.worker.ts', import.meta.url), {
          type: 'module',
        })
        cancel = () => {
          worker.terminate()
          resolve([])
        }
        worker.onmessage = (event: MessageEvent<Action[]>) => {
          worker.terminate()
          resolve(event.data)
        }
        worker.onerror = (event) => {
          worker.terminate()
          reject(new Error(event.message))
        }
        worker.postMessage({ config, state: snapshotState(state) } satisfies BotRequest)
      })
    },
  }
}
