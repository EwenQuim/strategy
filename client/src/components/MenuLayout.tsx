import type { ReactNode } from 'react'
import { MenuBackground } from './MenuBackground'
import { Link } from '@tanstack/react-router'
import { Icon } from './Icon'
import * as common from '../i18n/common'
import * as n from '../i18n/navigation'

export function MenuLayout({
  title,
  backTo = '/',
  scroll = true,
  wide = false,
  children,
}: {
  title: string
  backTo?: '/' | '/campaign' | '/online'
  scroll?: boolean
  wide?: boolean
  children: ReactNode
}) {
  const widthClassName = wide ? 'max-w-[1100px]' : 'max-w-[640px]'
  return (
    <main className="relative isolate flex h-dvh flex-col overflow-hidden bg-[#101f1b] text-ink">
      <MenuBackground />
      <header
        className={
          widthClassName +
          ' mx-auto flex w-full shrink-0 items-center gap-3 px-[max(12px,env(safe-area-inset-left))] pt-[max(12px,env(safe-area-inset-top))] pb-3 pr-[max(12px,env(safe-area-inset-right))] min-[900px]:px-[max(24px,env(safe-area-inset-left))] min-[900px]:pr-[max(24px,env(safe-area-inset-right))] [@media(min-width:900px)_and_(min-height:651px)]:pt-[max(32px,env(safe-area-inset-top))] [@media(min-width:900px)_and_(min-height:651px)]:pb-6'
        }
      >
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
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-bold tracking-tight min-[900px]:text-[32px] [@media(max-height:650px)]:text-xl">
            {title}
          </h1>
        </div>
      </header>
      <div
        data-testid="menu-content"
        className={
          widthClassName +
          ' mx-auto flex min-h-0 w-full flex-1 flex-col gap-3 min-[900px]:gap-4 min-[900px]:px-[max(24px,env(safe-area-inset-left))] min-[900px]:pr-[max(24px,env(safe-area-inset-right))] min-[900px]:pb-[max(24px,env(safe-area-inset-bottom))] px-[max(12px,env(safe-area-inset-left))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(8px,env(safe-area-inset-bottom))] [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-offset-2 [&_input:focus-visible]:outline-gold [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-offset-2 [&_select:focus-visible]:outline-gold ' +
          (scroll ? 'overflow-y-auto overscroll-contain [&>*]:shrink-0' : 'overflow-hidden')
        }
      >
        {children}
      </div>
    </main>
  )
}
