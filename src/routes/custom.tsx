import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Icon, PawnIcon } from '../components/Icon'
import { BOT_LEVELS, type BotDifficulty } from '../lib/bot'
import { BIOMES, MAP_WIDTH, RECRUIT_CLASSES, type Biome, type Pawn } from '../lib/engine'
import type { GameMode } from '../lib/game-mode'

const recruits = RECRUIT_CLASSES.map((Unit) => new Unit(0, 0, 0, 'player'))

export const Route = createFileRoute('/custom')({
  component: function CustomPlay() {
    const navigate = Route.useNavigate()
    const [mode, setMode] = useState<GameMode>('ai')
    const [difficulty, setDifficulty] = useState<BotDifficulty>('normal')
    const [biome, setBiome] = useState<Biome>('verdant')
    const [player, setPlayer] = useState<Pawn['kind'][]>([
      'king',
      'swordsman',
      'archer',
      'magician',
      'ninja',
    ])
    const [enemy, setEnemy] = useState<Pawn['kind'][] | null>(null)
    const enemyRoster = enemy ?? player
    const labels = mode === 'local' ? ['Player 1', 'Player 2'] : ['Player', 'Enemy']

    return (
      <main className="custom-screen">
        <header className="campaign-heading">
          <h1>Custom play</h1>
          <Link to="/" className="icon-button" aria-label="Back to home">
            <Icon name="close" />
          </Link>
        </header>
        <form
          className="custom-form"
          onSubmit={(event) => {
            event.preventDefault()
            void navigate({
              to: '/game',
              search: { mode, difficulty, setup: { biome, player, enemy: enemyRoster } },
            })
          }}
        >
          <div className="custom-options">
            <div className="custom-settings">
              <div>
                <label htmlFor="custom-mode">Mode</label>
                <select
                  id="custom-mode"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as GameMode)}
                >
                  <option value="ai">Solo vs AI</option>
                  <option value="local">2 players</option>
                </select>
              </div>
              <div>
                <label htmlFor="custom-difficulty">
                  Difficulty{mode === 'local' ? ' (AI only)' : ''}
                </label>
                <select
                  id="custom-difficulty"
                  value={difficulty}
                  disabled={mode === 'local'}
                  onChange={(event) => setDifficulty(event.target.value as BotDifficulty)}
                >
                  {Object.keys(BOT_LEVELS).map((level) => (
                    <option key={level} value={level}>
                      {level[0].toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="custom-biome">
                <label htmlFor="custom-biome">Biome</label>
                <select
                  id="custom-biome"
                  value={biome}
                  onChange={(event) => setBiome(event.target.value as Biome)}
                >
                  {Object.entries(BIOMES).map(([value, biome]) => (
                    <option key={value} value={value}>
                      {biome.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="roster-mirror">
              <input
                type="checkbox"
                checked={enemy === null}
                onChange={(event) => setEnemy(event.target.checked ? null : [...player])}
              />
              Mirror player roster
            </label>
            <table className="roster-table">
              <caption>Rosters</caption>
              <thead>
                <tr>
                  <th scope="col">Unit</th>
                  <th scope="col">{labels[0]}</th>
                  <th scope="col">{labels[1]}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">
                    <span>
                      <PawnIcon kind="king" />
                      King
                    </span>
                  </th>
                  <td>1</td>
                  <td>1</td>
                </tr>
                {recruits.map(({ kind }) => (
                  <tr key={kind}>
                    <th scope="row">
                      <span>
                        <PawnIcon kind={kind} />
                        {kind}
                      </span>
                    </th>
                    {[player, enemyRoster].map((roster, side) => {
                      const count = roster.filter((unit) => unit === kind).length
                      const max = Math.min(
                        MAP_WIDTH * 3 - roster.length + count,
                        side === 0 && kind === 'bulwark' ? MAP_WIDTH : MAP_WIDTH * 3 - 1,
                      )
                      return (
                        <td key={side}>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={max}
                            step={1}
                            value={count}
                            aria-label={labels[side] + ' ' + kind}
                            disabled={side === 1 && enemy === null}
                            onChange={(event) => {
                              const value = Number(event.target.value)
                              if (!Number.isInteger(value) || value < 0 || value > max) return
                              const next = [
                                ...roster.filter((unit) => unit !== kind),
                                ...Array<Pawn['kind']>(value).fill(kind),
                              ]
                              if (side === 0) setPlayer(next)
                              else setEnemy(next)
                            }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td>{player.length}</td>
                  <td>{enemyRoster.length}</td>
                </tr>
              </tfoot>
            </table>
            <p className="custom-note">
              One king per side. Up to {MAP_WIDTH * 3} units; player Bulwarks are limited to{' '}
              {MAP_WIDTH}.
            </p>
          </div>
          <button type="submit" className="primary-button">
            Start battle
            <Icon name="arrow" />
          </button>
        </form>
      </main>
    )
  },
})
