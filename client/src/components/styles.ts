const panelClassName =
  'rounded-2xl border border-[#d1cf9b40] bg-[var(--biome-panel,#20362b)] text-ink shadow-[0_25px_90px_#0000008c]'

export const menuCardClassName =
  'rounded-2xl border border-line bg-gradient-to-br from-white/7 to-white/2 shadow-[0_8px_24px_#0002]'

// Flat reference lists: rows breathe through padding, hairlines separate them.
export const dividedListClassName = 'm-0 flex list-none flex-col divide-y divide-line/60 p-0'

export const menuInputClassName =
  'min-h-12 w-full min-w-0 rounded-xl border border-line bg-[#152b24] px-3 py-2 text-[16px] text-ink [color-scheme:dark] disabled:opacity-50'

export const switchClassName =
  'relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full border border-line bg-white/10 transition-colors after:absolute after:top-1 after:left-1 after:size-[18px] after:rounded-full after:bg-muted after:transition-transform checked:bg-gold checked:after:translate-x-5 checked:after:bg-[#172a21] motion-reduce:transition-none motion-reduce:after:transition-none'

export const dialogClassName =
  panelClassName +
  ' fixed inset-0 m-auto open:flex max-h-[min(720px,calc(100dvh-40px))] w-[min(520px,calc(100vw-28px))] flex-col p-0 backdrop:bg-black/50 backdrop:backdrop-blur-[7px]'
