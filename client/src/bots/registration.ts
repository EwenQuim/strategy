import { withFallback, type Bot } from './bot.ts'
import { readOptions } from './options.ts'

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
  const wrap = (bot: B) => (fallback ? withFallback(bot, fallback) : bot)
  let current = wrap(defaults)
  return {
    name: defaults.name as B['name'],
    presets,
    defaultConfig,
    resolve(value: unknown) {
      const options = readOptions(defaults.options, value)
      // Retain only the most recent instance. Equivalent configs stay stable across renders,
      // without caching every possible combination of parameters for the lifetime of the app.
      if (JSON.stringify(options) !== JSON.stringify(current.options))
        current = wrap(new BotClass(options))
      return current
    },
  }
}
