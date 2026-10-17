import { Link } from '@tanstack/react-router'
import * as m from '../i18n/achievements'
import { ACHIEVEMENTS, type AchievementId } from '../lib/achievements'

export function AchievementToast({ achievements }: { achievements: readonly AchievementId[] }) {
  return (
    <ul
      className="pointer-events-none absolute inset-x-3 top-3 z-10 flex list-none flex-col items-center gap-2 p-0"
      aria-label={m.justUnlocked}
      role="status"
    >
      {ACHIEVEMENTS.filter(({ id }) => achievements.includes(id)).map(({ id, logo }, index) => (
        <li
          key={id}
          className="achievement-toast pointer-events-auto motion-reduce:animate-none"
          style={{ animationDelay: 900 + index * 250 + 'ms' }}
        >
          <Link
            to="/achievements"
            className="flex items-center gap-2.5 rounded-full border border-gold/50 bg-[#141a17ee] py-1.5 pr-4 pl-1.5 text-left shadow-[0_10px_30px_#0009]"
          >
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-full bg-gold/15 text-base"
            >
              {logo}
            </span>
            <span className="flex flex-col leading-tight">
              <small className="text-[9px] tracking-[0.12em] text-muted uppercase">
                {m.justUnlocked}
              </small>
              <span className="font-serif text-[13px] text-gold">
                {m.achievements[id].title}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
