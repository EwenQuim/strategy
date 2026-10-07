import { readHapticsEnabled } from './preferences'

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
export function hapticHit(): void {
  vibrate([12, 40, 18])
}

/** A unit was killed. */
export function hapticKill(): void {
  vibrate([20, 50, 30])
}

/** An attack missed or the target escaped. */
export function hapticMiss(): void {
  vibrate(6)
}

/** Hellfire or area damage tick. */
export function hapticHellfire(): void {
  vibrate([15, 35, 15, 35, 15])
}

/** A unit moved (light feedback). */
export function hapticMove(): void {
  vibrate(4)
}
