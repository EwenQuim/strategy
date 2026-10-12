import { withFallback, type Bot } from './bot.ts'

// One registration path for every strategy, including parameterized ones. Constructors own
// defaults and validation; adding an option never adds a branch to the registry or serializer.
export function registerBot<B extends Bot>(
  BotClass: new (options?: Partial<B['options']>) => B,
  fallback?: Bot,
  presets: Record<string, B['options']> = {},
) {
  const defaults = new BotClass()
  const defaultConfig: Pick<B, 'name' | 'options'> = {
    name: defaults.name,
    options: defaults.options,
  }
  return {
    name: defaults.name as B['name'],
    presets,
    defaultConfig,
    resolve(value: unknown) {
      const bot = new BotClass(value as Partial<B['options']>)
      return fallback ? withFallback(bot, fallback) : bot
    },
  }
}
