import { buttonClassName } from '../components/styles'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon } from '../components/Icon'
import { CAMPAIGN_LEVELS } from '../lib/campaign'
import { health } from '../../generated/sdk.gen.ts'
import { onlineEnabled } from '../online.ts'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'

export const Route = createFileRoute('/')({
  component: function Landing() {
    const completed = useSyncExternalStore(subscribeCampaignProgress, readCampaignProgress)
    const done = completed === CAMPAIGN_LEVELS.length
    const flagged = onlineEnabled()
    const [apiUp, setApiUp] = useState(false)
    useEffect(() => {
      if (!flagged) return
      let cancelled = false
      health()
        .then((res) => {
          if (!cancelled) setApiUp(res.status === 200)
        })
        .catch(() => {})
      return () => {
        cancelled = true
      }
    }, [flagged])
    const online = flagged && apiUp
    return (
      <main className="[background:radial-gradient(ellipse_at_50%_38%,#465c3880,transparent_60%),#182c22] flex min-h-dvh flex-col">
        <header className="m-auto flex w-full max-w-7xl items-center justify-between px-9 py-6 max-[601px]:px-[23px] max-[601px]:py-5 [@media(max-height:650px)]:py-3">
          <span className="flex items-center gap-2.5 font-display text-[23px] leading-none tracking-[0.15em] min-[900px]:text-[26px]">
            <span className="grid h-10 w-[34px] place-items-center rounded-[4px_4px_15px_15px] border border-[#dcc48a4a] bg-[linear-gradient(150deg,#dcc48a12,transparent)] text-gold [&>svg]:size-[22px]">
              <Icon name="crown" />
            </span>
            <span>
              HEX
              <span
                className="mt-[5px] block font-label text-[7px] leading-[normal] tracking-[0.29em] text-muted"
                data-testid="battle-subtitle"
              >
                MATE
              </span>
            </span>
          </span>
        </header>
        <div className="flex flex-1 flex-col items-center px-5 pt-[5px] pb-9 text-center [@media(max-height:650px)]:pb-4">
          <div
            className="relative h-[260px] w-[340px] max-w-[90vw] max-[601px]:h-[235px] max-[601px]:w-[285px] [@media(height<=800px)]:hidden"
            aria-hidden="true"
          >
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2 rounded-full border border-[#d7c18212] size-[290px] max-[601px]:size-[250px]" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-1/2 rounded-full border border-[#d7c18212] size-[370px] max-[601px]:size-[310px]" />
            <svg
              viewBox="0 0 360 260"
              className="absolute inset-0 size-full drop-shadow-[0_20px_15px_#08190f55]"
            >
              <defs>
                <linearGradient id="hero-tile" x2="0" y2="1">
                  <stop stopColor="#8f9f73" />
                  <stop offset="1" stopColor="#516d4d" />
                </linearGradient>
              </defs>
              {[
                [180, 73],
                [118, 109],
                [242, 109],
                [56, 145],
                [180, 145],
                [304, 145],
                [118, 181],
                [242, 181],
                [180, 217],
              ].map(([x, y], i) => (
                <g key={i} transform={'translate(' + x + ' ' + y + ')'}>
                  <path d="m0-32 55 32v9L0 41-55 9V0Z" fill="#2d4634" />
                  <path
                    d="m0-32 55 32L0 32-55 0Z"
                    fill="url(#hero-tile)"
                    stroke="#c5cc96"
                    strokeOpacity=".25"
                  />
                  {i !== 4 && (
                    <path
                      d="m-5-3 5-13 5 13M0-16v19"
                      stroke="#c3ce94"
                      strokeOpacity=".4"
                      fill="none"
                    />
                  )}
                </g>
              ))}
            </svg>
            <div className="absolute top-20 left-1/2 grid h-[78px] w-[74px] -translate-x-1/2 place-items-center rounded-[12px_12px_30px_30px] border-2 border-[#d7c182] bg-[linear-gradient(145deg,#4e7460,#204732)] text-[#ecd290] shadow-[0_8px_0_#153621,0_13px_20px_#102d2066] [&>svg]:size-[45px] max-[601px]:top-[78px] max-[601px]:h-[68px] max-[601px]:w-16 max-[601px]:[&>svg]:size-[38px]">
              <Icon name="crown" />
            </div>
          </div>
          <h1 className="font-display text-[clamp(36px,5vw,64px)] leading-[1.12] font-normal tracking-[-0.04em] [@media(max-height:650px)]:text-[32px]">
            Hexmate.
            <br />
            <em className="font-normal text-[#c7d1b0]">Corner the king.</em>
          </h1>
          <div
            className="mt-[27px] flex w-[min(100%,300px)] flex-col gap-3 [@media(max-height:650px)]:mt-[18px]"
            role="group"
            aria-label="Choose game mode"
          >
            <Link
              to="/campaign"
              className={
                buttonClassName +
                ' min-h-13 justify-between gap-3 border-[#e5d19a] bg-[#d8c38a] px-[18px] text-[#24392a] hover:bg-[#ecdaa3]'
              }
              preload={false}
            >
              Campaign
              <span className="flex items-center gap-2 text-[10px] tracking-[0.08em] [&>svg]:size-4">
                {completed} / {CAMPAIGN_LEVELS.length}
                <Icon name="crown" className={done ? 'fill-current' : undefined} />
              </span>
            </Link>
            <Link
              to="/game"
              search={{ mode: 'ai' }}
              className={
                buttonClassName +
                ' min-h-13 justify-between gap-3 border-line bg-[#ffffff04] px-[18px] text-ink hover:bg-[#ffffff0c]'
              }
              preload={false}
              title="Play a new seeded battle against AI"
            >
              Quick play
              <Icon name="arrow" />
            </Link>
            <Link
              to="/custom"
              className={
                buttonClassName +
                ' min-h-13 justify-between gap-3 border-line bg-[#ffffff04] px-[18px] text-ink hover:bg-[#ffffff0c]'
              }
              preload={false}
            >
              Custom play
              <Icon name="hex" />
            </Link>
            <Link
              to="/game"
              search={{ mode: 'local' }}
              className={
                buttonClassName +
                ' min-h-13 justify-between gap-3 border-line bg-[#ffffff04] px-[18px] text-ink hover:bg-[#ffffff0c]'
              }
              preload={false}
              title="Play together on this device"
            >
              2 players
              <Icon name="arrow" />
            </Link>
            <Link
              to="/online"
              className={
                buttonClassName +
                ' min-h-13 justify-between gap-3 border-line bg-[#ffffff04] px-[18px] text-ink hover:bg-[#ffffff0c] data-[enabled=false]:pointer-events-none data-[enabled=false]:opacity-35 data-[enabled=false]:hover:shadow-[0_6px_24px_#07180f30]'
              }
              preload={false}
              data-enabled={online}
              aria-disabled={!online}
              title={
                online
                  ? 'Play online, turn by turn'
                  : flagged
                    ? 'Game server unreachable'
                    : 'Online play is not available yet'
              }
            >
              Online
              <Icon name="arrow" />
            </Link>
          </div>
        </div>
        <footer className="m-auto flex w-full max-w-7xl justify-between gap-[15px] border-t border-line px-9 py-5 text-[9px] tracking-[0.05em] text-[#9caf92] [&>span:first-child]:text-[8px] [&>span:first-child]:tracking-[0.17em] max-[601px]:px-[23px] max-[601px]:py-[18px] max-[601px]:text-[8px] max-[601px]:[&>span:last-child]:hidden [@media(max-height:650px)]:py-3">
          <span title="Git commit used for this build">
            Build {import.meta.env.VITE_GIT_COMMIT}
          </span>
          <span>Made with ❤️ by EwenQuim</span>
        </footer>
      </main>
    )
  },
})
