import type { BattleEffect } from '../lib/engine'

/** Full-screen combat feedback; a kill outranks a plain hit or miss. */
export function CombatFeedback({
  killed,
  effect,
}: {
  killed: boolean
  effect: BattleEffect | null
}) {
  return (
    <div
      data-testid="combat-feedback"
      className={
        'pointer-events-none fixed inset-0 z-4 overflow-hidden before:absolute before:inset-0 motion-reduce:hidden ' +
        (killed
          ? 'combat-feedback--kill before:bg-[radial-gradient(ellipse,transparent_38%,#ff6a5566)] after:absolute after:inset-0 after:bg-[linear-gradient(110deg,transparent_35%,#ff6a554d_50%,transparent_65%)]'
          : effect?.impacts?.some((hit) => hit.damage > 0)
            ? 'combat-feedback--hit before:bg-[radial-gradient(ellipse,transparent_45%,#ffc07966)]'
            : 'combat-feedback--miss before:bg-[linear-gradient(110deg,transparent_35%,#bce6f433_50%,transparent_65%)]')
      }
      aria-hidden="true"
    />
  )
}
