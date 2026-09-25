import { buttonClassName, iconButtonClassName } from './styles'
import { Icon } from './Icon'
import type { CampaignLevel } from '../lib/campaign'
import * as common from '../i18n/common'
import * as m from '../i18n/game'

function showBriefing(dialog: HTMLDialogElement) {
  dialog.showModal()
  return () => dialog.close()
}

export function Briefing({ level }: { level: CampaignLevel }) {
  return (
    <dialog
      ref={showBriefing}
      className="fixed inset-0 m-auto open:flex max-h-[min(720px,calc(100dvh-40px))] w-[min(520px,calc(100vw-28px))] flex-col rounded-2xl border border-[#d1cf9b40] bg-[#20362b] p-0 text-ink shadow-[0_25px_90px_#07180f99] backdrop:bg-[#091910b8] backdrop:backdrop-blur-[7px]"
      aria-labelledby="briefing-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close()
      }}
    >
      <form
        method="dialog"
        className="flex shrink-0 items-center justify-between gap-2.5 border-b border-line px-[25px] pt-[25px] pb-5 [&>button]:shrink-0"
      >
        <div>
          <span className="text-muted text-[9px] font-semibold tracking-[0.17em] uppercase">
            {m.levelNumber(String(level.id).padStart(2, '0'))}
          </span>
          <h2 className="mt-2 font-serif text-[27px] leading-[normal]" id="briefing-title">
            {level.name}
          </h2>
        </div>
        <button className={iconButtonClassName} type="submit" aria-label={common.closeDialog}>
          <Icon name="close" />
        </button>
      </form>
      <div className="min-h-0 flex-1 overflow-y-auto px-[25px]">
        <ul className="m-0 flex list-none flex-col gap-2 p-0 pt-5 pb-5">
          {level.newElements.map((element) => (
            <li
              className="rounded-lg border border-line bg-[#ffffff04] px-3 py-2.5"
              key={element.name}
            >
              <strong className="mb-1 block text-[13px] text-gold">{element.name}</strong>
              <ul className="m-0 list-disc pl-4 text-[12px] leading-[1.5] text-muted">
                {element.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
      <form method="dialog" className="shrink-0 px-[25px] pb-[25px]">
        <button
          type="submit"
          className={
            buttonClassName +
            ' min-h-13 w-full justify-center gap-[30px] border-[#e5d19a] bg-[#d8c38a] px-[25px] text-[#24392a] hover:bg-[#ecdaa3]'
          }
        >
          {m.go}
        </button>
      </form>
    </dialog>
  )
}
