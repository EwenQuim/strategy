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

// Declarative domain checks, declared next to each strategy and run by its constructor.
export const intInRange =
  (min: number, max: number) =>
  (value: unknown): boolean =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max

export const numberInRange =
  (min: number, max: number) =>
  (value: unknown): boolean =>
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

export const oneOf =
  (values: readonly unknown[]) =>
  (value: unknown): boolean =>
    values.includes(value)

export const nonEmptyText = (): ((value: unknown) => boolean) => (value) =>
  typeof value === 'string' && !!value.trim()

export function optionsMatch(
  options: object,
  checks: Record<string, (value: unknown) => boolean>,
): boolean {
  const record = options as Record<string, unknown>
  return Object.keys(checks).every((key) => checks[key](record[key]))
}

const BOT_CHECKS: Record<string, (value: unknown) => boolean> = {
  depth: intInRange(2, 4),
  beamWidth: intInRange(1, 32),
  riskAppetite: numberInRange(-1, 1),
  focus: oneOf(['best', 'nearest', 'weakest']),
  latitude: numberInRange(0, 100),
}

export function validOptions(options: BotOptions | undefined): options is BotOptions {
  return !!options && optionsMatch(options, BOT_CHECKS)
}
