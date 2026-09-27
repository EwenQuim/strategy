export type BotOptions = {
  depth: 1 | 2 | 3
  beamWidth: number
  caution: number
}

export const BOT_LEVELS = {
  easy: { depth: 1, beamWidth: 2, caution: 0.25 },
  normal: { depth: 2, beamWidth: 4, caution: 0.7 },
  hard: { depth: 3, beamWidth: 8, caution: 1 },
} as const satisfies Record<string, BotOptions>

export type BotDifficulty = keyof typeof BOT_LEVELS

export { chooseTacticalActions } from './ai-search.ts'
