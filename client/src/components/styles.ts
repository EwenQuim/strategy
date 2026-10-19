export const buttonClassName =
  'inline-flex items-center rounded-md border py-3.5 text-[13px] font-semibold shadow-control hover:shadow-control-hover [&>svg]:size-[19px]'

export const iconButtonClassName =
  'grid h-11 w-10 place-items-center rounded-[10px] border border-transparent bg-transparent text-muted hover:border-line hover:bg-surface-soft hover:text-ink [&>svg]:size-[19px]'

export const primaryButtonClassName =
  buttonClassName +
  ' justify-center gap-[30px] border-transparent bg-gold px-[25px] text-[15px] text-[var(--biome-panel,var(--panel))] hover:brightness-110'

const panelClassName =
  'rounded-2xl border border-[#d1cf9b40] bg-[var(--biome-panel,var(--panel))] text-ink shadow-[0_25px_90px_#0000008c]'

export const menuCardClassName =
  'rounded-2xl border border-line bg-gradient-to-br from-card-start to-card-end shadow-menu-card'

export const menuInputClassName =
  'min-h-12 w-full min-w-0 rounded-xl border border-line bg-input px-3 py-2 text-[16px] text-ink [color-scheme:dark] disabled:opacity-50'

export const switchClassName =
  'relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full border border-line bg-surface-raised transition-colors after:absolute after:top-1 after:left-1 after:size-[18px] after:rounded-full after:bg-muted after:transition-transform checked:bg-gold checked:after:translate-x-5 checked:after:bg-switch-knob motion-reduce:transition-none motion-reduce:after:transition-none'

export const menuPrimaryButtonClassName =
  primaryButtonClassName +
  ' min-h-12 rounded-xl bg-gradient-to-b from-[#eddbab] to-gold shadow-press active:translate-y-px'

export const dialogClassName =
  panelClassName +
  ' fixed inset-0 m-auto open:flex max-h-[min(720px,calc(100dvh-40px))] w-[min(520px,calc(100vw-28px))] flex-col p-0 backdrop:bg-scrim/50 backdrop:backdrop-blur-[7px]'
