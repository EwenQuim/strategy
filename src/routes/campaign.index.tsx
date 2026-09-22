import { iconButtonClassName } from '../components/styles'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import { Icon } from '../components/Icon'
import { CAMPAIGN_LEVELS, isLevelUnlocked } from '../lib/campaign'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'

export const Route = createFileRoute('/campaign/')({
  component: function Campaign() {
    const completed = useSyncExternalStore(subscribeCampaignProgress, readCampaignProgress)
    return (
      <main className="m-auto flex h-dvh max-w-[800px] flex-col gap-3 pt-[max(16px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(12px,env(safe-area-inset-left))]">
        <header className="flex items-center justify-between gap-3">
          <div>
            <span className="text-muted text-[9px] font-semibold tracking-[0.17em] uppercase">
              Twenty battles. One crown.
            </span>
            <h1 className="mt-1 font-serif text-[32px] leading-[normal]">Campaign</h1>
          </div>
          <Link to="/" className={iconButtonClassName} aria-label="Back to home">
            <Icon name="close" />
          </Link>
        </header>
        <div
          className="flex items-center justify-between gap-3 text-[10px] text-muted"
          data-testid="campaign-progress"
          role="status"
        >
          <span>
            {completed} / {CAMPAIGN_LEVELS.length} completed
          </span>
          <span>
            {completed === CAMPAIGN_LEVELS.length
              ? 'Campaign complete!'
              : 'Win to unlock the next level.'}
          </span>
        </div>
        <ol
          className="m-0 grid min-h-0 flex-1 list-none grid-cols-4 grid-rows-5 gap-2 p-0"
          aria-label="Campaign levels"
        >
          {CAMPAIGN_LEVELS.map((level) => {
            const unlocked = isLevelUnlocked(level.id, completed)
            const cleared = level.id <= completed
            const status = cleared ? 'Completed' : unlocked ? 'Ready' : 'Locked'
            const content = (
              <>
                <strong className="font-serif text-[20px] leading-[normal] font-normal text-gold">
                  {level.id.toString().padStart(2, '0')}
                </strong>
                <span>{level.name}</span>
                <small className="text-[8px] text-muted">{status}</small>
              </>
            )
            return (
              <li key={level.id}>
                {unlocked ? (
                  <Link
                    to="/campaign/$level"
                    params={{ level: String(level.id) }}
                    className="flex size-full flex-col items-center justify-center gap-[3px] rounded-lg border border-line bg-[#ffffff04] p-[5px] text-center text-[clamp(9px,2.5vw,12px)] leading-[1.15] text-ink wrap-anywhere data-[status=ready]:border-gold data-[status=ready]:bg-[#dcc48a16] data-[status=completed]:border-[#89bba477] data-[status=completed]:bg-[#89bba412] [&:not(:disabled):hover]:bg-[#ffffff12]"
                    data-testid="campaign-level"
                    data-status={cleared ? 'completed' : 'ready'}
                    aria-label={'Level ' + level.id + ': ' + level.name + ', ' + status}
                    preload={false}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    className="flex size-full flex-col items-center justify-center gap-[3px] rounded-lg border border-line bg-[#ffffff04] p-[5px] text-center text-[clamp(9px,2.5vw,12px)] leading-[1.15] text-ink wrap-anywhere data-[status=ready]:border-gold data-[status=ready]:bg-[#dcc48a16] data-[status=completed]:border-[#89bba477] data-[status=completed]:bg-[#89bba412] [&:not(:disabled):hover]:bg-[#ffffff12]"
                    data-testid="campaign-level"
                    disabled
                    aria-label={'Level ' + level.id + ': ' + level.name + ', Locked'}
                  >
                    {content}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
        <p className="text-center text-[10px] text-muted">
          Wins are saved on this device. Finished levels can be replayed.
        </p>
      </main>
    )
  },
})
