const panelClassName =
  'rounded-2xl border border-[#d1cf9b40] bg-[var(--biome-panel,var(--panel))] text-ink shadow-[0_25px_90px_#0000008c]'

export const menuCardClassName =
  'rounded-2xl border border-line bg-gradient-to-br from-card-start to-card-end shadow-menu-card'

// Flat reference lists: rows breathe through padding, hairlines separate them.
export const dividedListClassName = 'm-0 flex list-none flex-col divide-y divide-line/60 p-0'

export const menuInputClassName =
  'min-h-12 w-full min-w-0 rounded-xl border border-line bg-input px-3 py-2 text-[16px] text-ink [color-scheme:dark] disabled:opacity-50'

export const switchClassName =
  'relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full border border-line bg-surface-raised transition-colors after:absolute after:top-1 after:left-1 after:size-[18px] after:rounded-full after:bg-muted after:transition-transform checked:bg-gold checked:after:translate-x-5 checked:after:bg-switch-knob motion-reduce:transition-none motion-reduce:after:transition-none'

export const smallSwitchClassName =
  'relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full border border-line bg-surface-raised transition-colors after:absolute after:top-[2px] after:left-[2px] after:size-3.5 after:rounded-full after:bg-muted after:transition-transform checked:bg-gold checked:after:translate-x-4 checked:after:bg-switch-knob motion-reduce:transition-none motion-reduce:after:transition-none'

export const dialogClassName =
  panelClassName +
  ' fixed inset-0 m-auto open:flex max-h-[min(720px,calc(100dvh-40px))] w-[min(520px,calc(100vw-28px))] flex-col p-0 backdrop:bg-scrim/50 backdrop:backdrop-blur-[7px]'
