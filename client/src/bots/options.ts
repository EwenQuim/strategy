import type { BotOptions } from '../lib/engine/ai.ts'

export function validOptions(options: BotOptions | undefined): options is BotOptions {
  return (
    !!options &&
    [2, 3].includes(options.depth) &&
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
