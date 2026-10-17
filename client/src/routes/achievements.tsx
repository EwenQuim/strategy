import { createFileRoute } from '@tanstack/react-router'
import { MenuLayout } from '../components/MenuLayout'
import { menuCardClassName } from '../components/styles'
import * as m from '../i18n/achievements'
import * as menus from '../i18n/menus'
import { Icon } from '../components/Icon'
import { ACHIEVEMENTS } from '../lib/achievements'
import { readUnlockedAchievements } from '../achievementProgress'

export const Route = createFileRoute('/achievements')({
  component: function Achievements() {
    const unlocked = readUnlockedAchievements()
    return (
      <MenuLayout title={menus.achievements} wide>
        <div className="flex items-center gap-4 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 to-transparent p-4 min-[900px]:p-6">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold/10 text-gold">
            <Icon name="trophy" className="size-6" />
          </span>
          <div className="flex-1">
            <p className="text-sm min-[900px]:text-base font-bold text-gold" role="status">
              {m.unlockedCount(unlocked.length, ACHIEVEMENTS.length)}
            </p>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/20"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: (unlocked.length / ACHIEVEMENTS.length) * 100 + '%' }}
              />
            </div>
          </div>
        </div>
        <ul className="m-0 grid list-none gap-3 p-0 min-[601px]:grid-cols-2 min-[900px]:gap-4">
          {ACHIEVEMENTS.map(({ id, logo }) => {
            const earned = unlocked.includes(id)
            const { title, description } = m.achievements[id]
            return (
              <li
                key={id}
                className={
                  menuCardClassName +
                  ' flex items-start gap-3 p-4 min-[900px]:gap-4 min-[900px]:p-6 data-[earned=true]:border-gold/40 data-[earned=true]:from-gold/10'
                }
                data-earned={earned}
                aria-label={earned ? title : title + ', ' + m.locked}
              >
                <span
                  className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/5 text-[24px] data-[earned=false]:grayscale"
                  data-earned={earned}
                  aria-hidden="true"
                >
                  {logo}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <strong className="text-sm min-[900px]:text-base leading-snug font-semibold text-ink">
                    {title}
                  </strong>
                  <small className="text-xs min-[900px]:text-sm leading-relaxed text-muted">
                    {description}
                  </small>
                </span>
                <Icon
                  name={earned ? 'check' : 'lock'}
                  className={
                    'mt-1 size-3.5 shrink-0 ' + (earned ? 'text-gold' : 'text-muted/60')
                  }
                />
              </li>
            )
          })}
        </ul>
        <p className="text-center text-xs min-[900px]:text-sm leading-relaxed text-muted">
          {menus.achievementsEarnedIn}
        </p>
      </MenuLayout>
    )
  },
})
