import { readHapticsEnabled } from './preferences'
import type { BattleFrame } from './lib/engine'

function vibrate(pattern: number | number[]): void {
  if (!readHapticsEnabled()) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  try {
    navigator.vibrate(pattern)
  } catch {
    // Vibration API unavailable: silently skip.
  }
}

/** A unit was hit (damage dealt). */
function hapticHit(): void {
  vibrate([12, 40, 18])
}

/** A unit was killed. */
function hapticKill(): void {
  vibrate([20, 50, 30])
}

/** An attack missed or the target escaped. */
function hapticMiss(): void {
  vibrate(15)
}

/** Hellfire or area damage tick. */
function hapticHellfire(): void {
  vibrate([15, 35, 15, 35, 15])
}

/** A unit moved (light feedback). */
export function hapticMove(): void {
  vibrate(10)
}

/**
 * Buzzes for a playback frame as it appears. A frame still shows the pawns
 * that die on it (hp <= 0), so a kill is detectable from the frame alone.
 */
export function hapticForFrame(frame: BattleFrame): void {
  const { effect, state } = frame
  if (effect?.kind === 'hellfire') return hapticHellfire()
  if (state.pawns.some((pawn) => pawn.hp <= 0)) return hapticKill()
  if (!effect) return
  if (effect.impacts?.length) {
    return effect.impacts.some((impact) => impact.damage > 0) ? hapticHit() : hapticMiss()
  }
  if (effect.kind === 'move') hapticMove()
}
