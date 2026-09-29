import { iconButtonClassName } from '../components/styles'
import { createFileRoute, Link } from '@tanstack/react-router'
import * as common from '../i18n/common'
import * as m from '../i18n/achievements'
import { Icon } from '../components/Icon'
import { ACHIEVEMENTS } from '../lib/achievements'
import { readUnlockedAchievements } from '../achievementProgress'

export const Route = createFileRoute('/achievements')({
  component: function Achievements() {
    const unlocked = readUnlockedAchievements()
    return (
      <main className="m-auto flex h-dvh max-w-[800px] flex-col gap-3 pt-[max(16px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(12px,env(safe-area-inset-left))]">
        <header className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-[32px] leading-[normal]">{m.title}</h1>
          <Link to="/" className={iconButtonClassName} aria-label={common.backToHome}>
            <Icon name="close" />
          </Link>
        </header>
        <p className="text-[10px] text-muted" role="status">
          {m.unlockedCount(unlocked.length, ACHIEVEMENTS.length)}
        </p>
        <ul className="m-0 grid min-h-0 flex-1 list-none content-start gap-2 overflow-y-auto p-0 min-[601px]:grid-cols-2">
          {ACHIEVEMENTS.map(({ id, logo }) => {
            const earned = unlocked.includes(id)
            const { title, description } = m.achievements[id]
            return (
              <li
                key={id}
                className="flex items-center gap-3 rounded-lg border border-line p-3 data-[earned=false]:opacity-45 data-[earned=true]:border-gold/60"
                data-earned={earned}
                aria-label={earned ? title : title + ', ' + m.locked}
              >
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ffffff09] text-[24px] data-[earned=false]:grayscale"
                  data-earned={earned}
                  aria-hidden="true"
                >
                  {logo}
                </span>
                <span className="flex flex-col gap-0.5">
                  <strong className="font-serif font-normal text-gold">{title}</strong>
                  <small className="text-[12px] text-muted">{description}</small>
                </span>
              </li>
            )
          })}
        </ul>
        <p className="text-center text-[10px] text-muted">{m.countedModes}</p>
      </main>
    )
  },
})
