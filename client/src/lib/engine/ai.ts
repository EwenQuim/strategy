export type BotOptions = {
  depth: 2 | 3
  beamWidth: number
  // How much danger the AI knowingly accepts: 0 is calibrated, 1 ignores threats to its units.
  riskAppetite: number
  // The enemy it prefers to hurt when options are close in value.
  focus: 'best' | 'nearest' | 'weakest'
  // Score margin within which it may pick a more tempting option over the best one.
  latitude: number
}

export const BOT_LEVELS = {
  easy: { depth: 2, beamWidth: 3, riskAppetite: 0.9, focus: 'nearest', latitude: 60 },
  normal: { depth: 2, beamWidth: 4, riskAppetite: 0.65, focus: 'weakest', latitude: 25 },
  hard: { depth: 3, beamWidth: 8, riskAppetite: 0, focus: 'best', latitude: 0 },
} as const satisfies Record<string, BotOptions>

export type BotDifficulty = keyof typeof BOT_LEVELS

export { chooseTacticalActions } from './ai-search.ts'
