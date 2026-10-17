import { snapshotState } from '../lib/battleSnapshot.ts'
import type { Action } from '../lib/engine/index.ts'
import { BOTS, getBot, type BotConfig } from './catalog.ts'
import type { Bot } from './bot.ts'

export type BotRequest = {
  config: BotConfig
  state: ReturnType<typeof snapshotState>
}

export type BotResponse = { actions: Action[] } | { error: string }

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
      let cancelled = false
      let worker: Worker | undefined
      const decision = new Promise<Action[]>((resolve, reject) => {
        cancel = () => {
          cancelled = true
          worker?.terminate()
          resolve([])
        }
        worker = new Worker(new URL('./bot.worker.ts', import.meta.url), {
          type: 'module',
        })
        worker.onmessage = ({ data }: MessageEvent<BotResponse>) => {
          worker?.terminate()
          if ('error' in data) reject(new Error(data.error))
          else resolve(data.actions)
        }
        worker.onerror = (event) => {
          event.preventDefault()
          worker?.terminate()
          reject(new Error(event.message))
        }
        worker.onmessageerror = () => reject(new Error('Unreadable bot response'))
        worker.postMessage({ config, state: snapshotState(state) } satisfies BotRequest)
      })
      return decision.catch(async () => {
        worker?.terminate()
        if (cancelled) return []
        const actions = await bot.chooseActions(state)
        return cancelled ? [] : actions
      })
    },
  }
}
