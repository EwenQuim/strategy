import { initialPlayback, playbackReducer, type PlaybackAction } from './playback.ts'
import type { Action, BattleSetup, Transition } from './engine/index.ts'
import type { BotDifficulty } from './engine/ai.ts'
import type { GameMode } from './game-mode.ts'

const RECORDED_ACTION_TYPES = new Set([
  'move',
  'act',
  'attackAt',
  'specialAt',
  'cancelTargeting',
  'endTurn',
  'restart',
])

export const isRecordedAction = (action: PlaybackAction): action is Action =>
  RECORDED_ACTION_TYPES.has(action.type)

const COORDINATE_ACTION_TYPES = new Set(['move', 'attackAt', 'specialAt'])

const isAction = (value: unknown): value is Action => {
  if (typeof value !== 'object' || value === null) return false
  const { type, q, r } = value as { type?: unknown; q?: unknown; r?: unknown }
  if (typeof type !== 'string' || !RECORDED_ACTION_TYPES.has(type)) return false
  if (COORDINATE_ACTION_TYPES.has(type)) return Number.isFinite(q) && Number.isFinite(r)
  return true
}

type BattleRecord = { setup: string; actions: Action[] }

export function battleSetupTag(setup: BattleSetup | undefined): string {
  return JSON.stringify(setup ?? null)
}

export function parseBattleRecord(raw: string | null, setupTag: string): Action[] | null {
  if (!raw) return null
  try {
    const record: unknown = JSON.parse(raw)
    if (typeof record !== 'object' || record === null) return null
    const { setup, actions } = record as Partial<BattleRecord>
    if (setup !== setupTag || !Array.isArray(actions)) return null
    return actions.every(isAction) ? actions : null
  } catch {
    return null
  }
}

export function replayBattle(
  seed: string,
  mode: GameMode,
  setup: BattleSetup | undefined,
  difficulty: BotDifficulty,
  actions: readonly Action[],
): Transition {
  let playback = initialPlayback(seed, mode, setup)
  for (const action of actions) {
    // Frames are cleared so replaying never re-animates past turns and no
    // action is dropped the way it would be while frames are still playing.
    playback = { ...playbackReducer(playback, action, mode, difficulty), frames: [] }
  }
  return playback
}
