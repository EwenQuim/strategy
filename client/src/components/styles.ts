export const buttonClassName =
  'inline-flex items-center rounded-md border py-3.5 text-sm font-semibold shadow-[0_6px_24px_#07180f30] hover:shadow-[0_8px_30px_#07180f50] [&>svg]:size-[19px]'

export const iconButtonClassName =
  'grid h-11 w-10 place-items-center rounded-[10px] border border-transparent bg-transparent text-muted hover:border-line hover:bg-[#ffffff09] hover:text-ink [&>svg]:size-[19px]'

export const primaryButtonClassName =
  buttonClassName +
  ' justify-center gap-[30px] border-transparent bg-gold px-[25px] text-base text-[var(--biome-panel,#20362b)] hover:brightness-110'

export const panelClassName =
  'rounded-2xl border border-[#d1cf9b40] bg-[var(--biome-panel,#20362b)] text-ink shadow-[0_25px_90px_#0000008c]'

export const dialogClassName =
  panelClassName +
  ' fixed inset-0 m-auto open:flex max-h-[min(720px,calc(100dvh-40px))] w-[min(520px,calc(100vw-28px))] flex-col p-0 backdrop:bg-black/50 backdrop:backdrop-blur-[7px]'
