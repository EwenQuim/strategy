import { BOT_LEVELS, type BotDifficulty } from './bot.ts'
import { validateSetup } from './engine/setup.ts'
import type { BattleSetup } from './engine/types.ts'

export type GameMode = 'ai' | 'local' | 'online'

export type GameSearch = {
  mode: GameMode
  difficulty?: BotDifficulty
  setup?: Extract<BattleSetup, { map?: undefined }>
}

export function parseGameSearch(search: Record<string, unknown>): GameSearch {
  const result: GameSearch = {
    mode: search.mode === 'local' ? 'local' : search.mode === 'online' ? 'online' : 'ai',
  }
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

export type PlayerNames = { player: string; enemy: string }

export const playerNames: PlayerNames = { player: 'Player 1', enemy: 'Player 2' }

export function possessiveArmyLabels(mode: GameMode, names: PlayerNames = playerNames) {
  if (mode === 'ai') return { player: 'Your', enemy: 'Enemy' }
  return { player: names.player + "'s", enemy: names.enemy + "'s" }
}

export function battleMessage(
  message: string,
  mode: GameMode,
  names: PlayerNames = playerNames,
): string {
  if (mode === 'ai') return message
  const labels = possessiveArmyLabels(mode, names)
  if (mode !== 'local') {
    if (message === 'The battle begins. Protect your crown.')
      return 'The battle begins. ' + names.player + ' is green; ' + names.enemy + ' is red.'
    if (message === 'The enemy crown has fallen. Victory!')
      return labels.enemy + ' king has fallen. ' + names.player + ' wins!'
    if (message === 'Your crown has fallen.')
      return labels.player + ' king has fallen. ' + names.enemy + ' wins!'
  } else {
    if (message === 'The battle begins. Protect your crown.')
      return 'The battle begins. Player 1 is green; Player 2 is red.'
    if (message === 'The enemy crown has fallen. Victory!')
      return "Player 2's king has fallen. Player 1 wins!"
    if (message === 'Your crown has fallen.')
      return "Player 1's king has fallen. Player 2 wins!"
  }
  return message
    .replaceAll('Your ', labels.player + ' ')
    .replaceAll('Enemy ', labels.enemy + ' ')
}
