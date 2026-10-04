import { useId, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Icon } from './Icon'
import * as common from '../i18n/common'
import * as m from '../i18n/menus'
import * as n from '../i18n/navigation'

const destinations = [
  ['play', '/', 'sword', n.play],
  ['campaign', '/campaign', 'crown', m.campaigns],
  ['achievements', '/achievements', 'trophy', m.achievements],
  ['settings', '/settings', 'gear', m.settings],
] as const

export function MenuLayout({
  title,
  section = 'play',
  backTo = '/',
  scroll = true,
  children,
}: {
  title: string
  section?: (typeof destinations)[number][0]
  backTo?: '/' | '/campaign' | '/online' | null
  scroll?: boolean
  children: ReactNode
}) {
  const id = useId()
  return (
    <main className="relative isolate flex h-dvh flex-col overflow-hidden bg-[#101f1b] text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-1 overflow-hidden bg-[radial-gradient(ellipse_at_15%_0%,#657d4d40,transparent_50%),radial-gradient(ellipse_at_100%_70%,#214d4940,transparent_60%),linear-gradient(160deg,#ffffff03,transparent)]"
      >
        <svg className="absolute inset-0 size-full text-gold/5 mask-[linear-gradient(#000,transparent_85%)]">
          <defs>
            <pattern id={id} width="56" height="96" patternUnits="userSpaceOnUse">
              <path
                d="M28 0 56 16v32L28 64 0 48V16ZM0 48v32l28 16 28-16V48"
                fill="none"
                stroke="currentColor"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={'url(#' + id + ')'} />
        </svg>
      </div>
      <header className="mx-auto flex w-full max-w-[900px] shrink-0 items-center gap-2 px-[max(12px,env(safe-area-inset-left))] pt-[max(8px,env(safe-area-inset-top))] pb-2 pr-[max(12px,env(safe-area-inset-right))]">
        {backTo ? (
          <Link
            to={backTo}
            preload={false}
            aria-label={
              backTo === '/campaign'
                ? n.backToCampaigns
                : backTo === '/online'
                  ? common.backToLobby
                  : common.backToHome
            }
            className="grid size-11 shrink-0 place-items-center rounded-2xl border border-line bg-white/5 text-gold hover:bg-white/10"
          >
            <Icon name="arrow" className="size-5 rotate-180" />
          </Link>
        ) : (
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/20 to-transparent text-gold shadow-[0_6px_24px_#dcc48a0c]">
            <Icon name="crown" className="size-6" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-xl leading-tight font-bold tracking-tight min-[601px]:text-2xl">
            {title}
          </h1>
        </div>
      </header>
      <div
        data-testid="menu-content"
        className={
          'mx-auto flex min-h-0 w-full max-w-[900px] flex-1 flex-col gap-2 px-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] pb-2 [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-2 [&_input:focus-visible]:outline-gold [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-2 [&_select:focus-visible]:outline-gold ' +
          (scroll ? 'overflow-y-auto overscroll-contain [&>*]:shrink-0' : 'overflow-hidden')
        }
      >
        {children}
      </div>
      <footer className="mx-auto w-full max-w-[900px] shrink-0 border-t border-line bg-[#142720] px-[max(8px,env(safe-area-inset-left))] pr-[max(8px,env(safe-area-inset-right))] pt-1 pb-[max(4px,env(safe-area-inset-bottom))]">
        <nav aria-label={n.navigation} className="grid grid-cols-4 gap-1">
          {destinations.map(([key, to, icon, label]) => (
            <Link
              key={key}
              to={to}
              preload={false}
              activeOptions={{ exact: true }}
              aria-current={section === key ? 'page' : undefined}
              data-active={section === key}
              className="flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1 text-center text-[10px] leading-tight font-semibold text-muted hover:bg-white/5 hover:text-ink data-[active=true]:bg-gold/15 data-[active=true]:text-gold"
            >
              <Icon name={icon} className="size-5" />
              <span className="max-w-full wrap-anywhere">{label}</span>
            </Link>
          ))}
        </nav>
      </footer>
    </main>
  )
}
