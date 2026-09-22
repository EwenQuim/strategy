import { createFileRoute, Link } from '@tanstack/react-router'
import { Icon } from '../components/Icon'
import { MAP_WIDTH, MAP_HEIGHT } from '../lib/engine'

export const Route = createFileRoute('/')({
  component: () => (
    <main className="landing">
      <header className="landing-header">
        <span className="wordmark">
          <span className="brand-crest">
            <Icon name="crown" />
          </span>
          <span>
            HEX<span className="wordmark-sub">STRATEGY</span>
          </span>
        </span>
        <span className="eyebrow">A small battlefield. A thousand possibilities.</span>
      </header>
      <div className="landing-content">
        <div className="landing-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <svg viewBox="0 0 360 260" className="hero-tiles">
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
          <div className="hero-crown">
            <Icon name="crown" />
          </div>
          <span className="art-caption">LAKES. MOUNTAINS. DESERT.</span>
        </div>
        <span className="eyebrow landing-kicker">Turn-based tactics, distilled.</span>
        <h1>
          Every move.
          <br />
          <em>A little more legend.</em>
        </h1>
        <p className="landing-description">
          Three biomes. A new army every game.
          <br />
          Outthink your rival and claim the crown.
        </p>
        <div className="mode-options" role="group" aria-label="Choose game mode">
          <Link to="/game" search={{ mode: 'ai' }} className="primary-button" preload={false}>
            VS AI
            <Icon name="arrow" />
          </Link>
          <Link
            to="/game"
            search={{ mode: 'local' }}
            className="primary-button local-button"
            preload={false}
            title="Play together on this device"
          >
            2 players
            <Icon name="arrow" />
          </Link>
        </div>
        <div className="landing-facts">
          <span>
            <Icon name="hex" />
            {MAP_WIDTH * MAP_HEIGHT} hexes
          </span>
          <span>
            <Icon name="energy" />3 energy
          </span>
          <span>
            <Icon name="crown" />1 crown to claim
          </span>
        </div>
      </div>
      <footer className="landing-footer">
        <span title="Git commit used for this build">
          Build {import.meta.env.VITE_GIT_COMMIT}
        </span>
        <span>Made for a moment of strategy.</span>
      </footer>
    </main>
  ),
})
