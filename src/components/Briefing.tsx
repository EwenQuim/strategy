import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Icon } from './Icon'
import { readHideFutureHints, writeHideFutureHints } from '../campaignProgress'
import type { CampaignLevel } from '../lib/campaign'

export function Briefing({ level, onStart }: { level: CampaignLevel; onStart: () => void }) {
  const [hideFutureHints, setHideFutureHints] = useState(readHideFutureHints)
  const [showElements] = useState(() => !readHideFutureHints())
  return (
    <main className="briefing-screen">
      <header className="briefing-heading">
        <div>
          <span className="eyebrow">Level {String(level.id).padStart(2, '0')}</span>
          <h1>{level.name}</h1>
        </div>
        <Link to="/campaign" className="icon-button" aria-label="Back to campaign">
          <Icon name="close" />
        </Link>
      </header>
      <div className="briefing-content">
        <p className="briefing-roleplay">{level.intro.roleplay}</p>
        {showElements && level.intro.newElements.length > 0 && (
          <ul className="briefing-elements">
            {level.intro.newElements.map((element) => (
              <li key={element.name}>
                <strong>{element.name}</strong>
                <p>{element.description}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <footer className="briefing-actions">
        <label className="briefing-toggle">
          <input
            type="checkbox"
            checked={hideFutureHints}
            onChange={() => {
              setHideFutureHints(!hideFutureHints)
              writeHideFutureHints(!hideFutureHints)
            }}
          />
          Hide future hints
        </label>
        <button type="button" className="primary-button" onClick={onStart}>
          Go !
        </button>
      </footer>
    </main>
  )
}
