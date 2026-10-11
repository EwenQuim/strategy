import type { BotOptions } from '../lib/engine/ai.ts'

// Own, validate and normalize serializable options in the defaults' key order. The constructor
// adds its domain checks (ranges, enum members); URLs and saves use exactly these same options.
export function readOptions<O extends object>(defaults: O, value: unknown): Readonly<O> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new RangeError('Invalid bot options')
  const supplied = value as Record<string, unknown>
  if (Object.keys(supplied).some((key) => !Object.hasOwn(defaults, key)))
    throw new RangeError('Unknown bot option')
  const options = Object.fromEntries(
    Object.entries(defaults).map(([key, fallback]) => {
      const option = Object.hasOwn(supplied, key) ? supplied[key] : fallback
      if (typeof option !== typeof fallback) throw new RangeError('Invalid bot option')
      return [key, option]
    }),
  )
  return Object.freeze(options) as Readonly<O>
}

export function validOptions(options: BotOptions | undefined): options is BotOptions {
  return (
    !!options &&
    [2, 3, 4].includes(options.depth) &&
    Number.isInteger(options.beamWidth) &&
    options.beamWidth >= 1 &&
    options.beamWidth <= 32 &&
    Number.isFinite(options.riskAppetite) &&
    options.riskAppetite >= -1 &&
    options.riskAppetite <= 1 &&
    ['best', 'nearest', 'weakest'].includes(options.focus) &&
    Number.isFinite(options.latitude) &&
    options.latitude >= 0 &&
    options.latitude <= 100
  )
}
