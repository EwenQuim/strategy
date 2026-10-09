export const buttonClassName =
  'inline-flex items-center rounded-md border py-3.5 text-[13px] font-semibold shadow-[0_6px_24px_#07180f30] hover:shadow-[0_8px_30px_#07180f50] [&>svg]:size-[19px]'

export const iconButtonClassName =
  'grid h-11 w-10 place-items-center rounded-[10px] border border-transparent bg-transparent text-muted hover:border-line hover:bg-[#ffffff09] hover:text-ink [&>svg]:size-[19px]'

export const primaryButtonClassName =
  buttonClassName +
  ' justify-center gap-[30px] border-transparent bg-gold px-[25px] text-[15px] text-[var(--biome-panel,#20362b)] hover:brightness-110'

const panelClassName =
  'rounded-2xl border border-[#d1cf9b40] bg-[var(--biome-panel,#20362b)] text-ink shadow-[0_25px_90px_#0000008c]'

export const menuCardClassName =
  'rounded-2xl border border-line bg-gradient-to-br from-white/7 to-white/2 shadow-[0_8px_24px_#0002]'

export const menuInputClassName =
  'min-h-12 w-full min-w-0 rounded-xl border border-line bg-[#152b24] px-3 py-2 text-[16px] text-ink [color-scheme:dark] disabled:opacity-50'

export const menuPrimaryButtonClassName =
  primaryButtonClassName +
  ' min-h-12 rounded-xl bg-gradient-to-b from-[#eddbab] to-gold shadow-[0_3px_0_#0003,inset_0_1px_0_#fff5] active:translate-y-px'

export const dialogClassName =
  panelClassName +
  ' fixed inset-0 m-auto open:flex max-h-[min(720px,calc(100dvh-40px))] w-[min(520px,calc(100vw-28px))] flex-col p-0 backdrop:bg-black/50 backdrop:backdrop-blur-[7px]'
