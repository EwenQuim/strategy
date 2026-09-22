import { BOT_LEVELS, type BotDifficulty } from './bot.ts'
import { validateSetup } from './engine/setup.ts'
import type { BattleSetup } from './engine/types.ts'

export type GameMode = 'ai' | 'local'

export type GameSearch = {
  mode: GameMode
  difficulty?: BotDifficulty
  setup?: Extract<BattleSetup, { map?: undefined }>
}

export function parseGameSearch(search: Record<string, unknown>): GameSearch {
  const result: GameSearch = { mode: search.mode === 'local' ? 'local' : 'ai' }
  if (typeof search.difficulty === 'string' && Object.hasOwn(BOT_LEVELS, search.difficulty))
    result.difficulty = search.difficulty as BotDifficulty
  if (search.setup && typeof search.setup === 'object' && !('map' in search.setup)) {
    const setup = search.setup as NonNullable<GameSearch['setup']>
    try {
      validateSetup(setup)
      result.setup = { biome: setup.biome, player: [...setup.player], enemy: [...setup.enemy] }
    } catch {
      return result
    }
  }
  return result
}

export const playerNames = { player: 'Player 1', enemy: 'Player 2' }
export const armyLabels = {
  ai: { player: 'Your', enemy: 'Enemy' },
  local: { player: "Player 1's", enemy: "Player 2's" },
}

export function battleMessage(message: string, mode: GameMode): string {
  if (mode === 'ai') return message
  if (message === 'The battle begins. Protect your crown.')
    return 'The battle begins. Player 1 is green; Player 2 is red.'
  if (message === 'The enemy crown has fallen. Victory!')
    return "Player 2's king has fallen. Player 1 wins!"
  if (message === 'Your crown has fallen.') return "Player 1's king has fallen. Player 2 wins!"
  return message
    .replaceAll('Your ', armyLabels.local.player + ' ')
    .replaceAll('Enemy ', armyLabels.local.enemy + ' ')
}
