import { createFileRoute, Link } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import { Icon } from '../components/Icon'
import { CAMPAIGN_LEVELS, isLevelUnlocked } from '../lib/campaign'
import { readCampaignProgress, subscribeCampaignProgress } from '../campaignProgress'

export const Route = createFileRoute('/campaign/')({
  component: function Campaign() {
    const completed = useSyncExternalStore(subscribeCampaignProgress, readCampaignProgress)
    return (
      <main className="campaign-screen">
        <header className="campaign-heading">
          <div>
            <span className="eyebrow">Twenty battles. One crown.</span>
            <h1>Campaign</h1>
          </div>
          <Link to="/" className="icon-button" aria-label="Back to home">
            <Icon name="close" />
          </Link>
        </header>
        <div className="campaign-progress" role="status">
          <span>
            {completed} / {CAMPAIGN_LEVELS.length} completed
          </span>
          <span>
            {completed === CAMPAIGN_LEVELS.length
              ? 'Campaign complete!'
              : 'Win to unlock the next level.'}
          </span>
        </div>
        <ol className="campaign-grid" aria-label="Campaign levels">
          {CAMPAIGN_LEVELS.map((level) => {
            const unlocked = isLevelUnlocked(level.id, completed)
            const cleared = level.id <= completed
            const status = cleared ? 'Completed' : unlocked ? 'Ready' : 'Locked'
            const content = (
              <>
                <strong>{level.id.toString().padStart(2, '0')}</strong>
                <span>{level.name}</span>
                <small>{status}</small>
              </>
            )
            return (
              <li key={level.id}>
                {unlocked ? (
                  <Link
                    to="/campaign/$level"
                    params={{ level: String(level.id) }}
                    className={'campaign-level' + (cleared ? ' is-completed' : ' is-next')}
                    aria-label={'Level ' + level.id + ': ' + level.name + ', ' + status}
                    preload={false}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    className="campaign-level"
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
        <p className="campaign-note">
          Wins are saved on this device. Finished levels can be replayed.
        </p>
      </main>
    )
  },
})
