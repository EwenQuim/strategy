import { useEffect, useReducer } from 'react'
import { initialPlayback, playbackReducer } from './lib/playback.ts'
import type { GameMode } from './lib/game-mode.ts'
import type { BattleSetup, Transition } from './lib/engine/types.ts'
import type { BotDifficulty } from './lib/bot.ts'

export function useGame(
  seed: string,
  mode: GameMode,
  setup?: BattleSetup,
  difficulty: BotDifficulty = 'normal',
  onVictory?: () => void,
) {
  const [playback, dispatch] = useReducer(
    (playback: Transition, action: Parameters<typeof playbackReducer>[1]) => {
      const next = playbackReducer(playback, action, mode, difficulty)
      if (next.state.winner === 'player' && playback.state.winner !== 'player') onVictory?.()
      return next
    },
    seed,
    (seed) => initialPlayback(seed, mode, setup),
  )
  const frame = playback.frames[0]

  useEffect(() => {
    if (!frame) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => dispatch({ type: 'playbackNext' }),
      frame.effect?.impacts?.length ? 700 : reducedMotion ? 0 : frame.effect ? 460 : 180,
    )
    return () => window.clearTimeout(timer)
  }, [frame])

  return {
    state: frame?.state ?? playback.state,
    effect: frame?.effect ?? null,
    effectId: playback.frames.length,
    playing: !!frame,
    dispatch,
  }
}
