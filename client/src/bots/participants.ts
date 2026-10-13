import {
  BOTS,
  DEFAULT_BOT_CONFIG,
  parseBotConfig,
  type BotConfig,
  type BotName,
} from './catalog.ts'
import type { GameMode } from '../lib/game-mode.ts'
import type { Side } from '../lib/engine/index.ts'

export type SideBots = Record<Side, BotConfig | null>

export type Participant = {
  human: boolean
  name: BotName
  options: Record<string, unknown>
}

export function defaultParticipant(human: boolean): Participant {
  return { human, name: DEFAULT_BOT_CONFIG.name, options: { ...DEFAULT_BOT_CONFIG.options } }
}

export function participantBot(participant: Participant): BotConfig | null {
  if (participant.human) return null
  const bot = BOTS[participant.name].resolve(participant.options)
  return { name: bot.name, options: bot.options } as BotConfig
}

export function battleControl(
  mode: GameMode,
  bot: BotConfig,
  sides?: SideBots,
  onlineSide?: Side,
) {
  const bots = battleBots(mode, bot, sides)
  return {
    bots,
    spectator: !!bots.player && !!bots.enemy,
    viewerSide: onlineSide ?? (bots.player && !bots.enemy ? 'enemy' : 'player'),
  } as const
}

export function parseSideBots(value: unknown): SideBots | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const sides = value as Record<string, unknown>
  if (!Object.hasOwn(sides, 'player') || !Object.hasOwn(sides, 'enemy')) return undefined
  return {
    player: sides.player === null ? null : parseBotConfig(sides.player),
    enemy: sides.enemy === null ? null : parseBotConfig(sides.enemy),
  }
}

export function battleBots(
  mode: GameMode,
  bot: BotConfig = DEFAULT_BOT_CONFIG,
  sides?: SideBots,
): SideBots {
  if (mode === 'online') return { player: null, enemy: null }
  return sides ?? { player: null, enemy: mode === 'ai' ? bot : null }
}
