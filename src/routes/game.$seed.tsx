import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMemo, useReducer, useRef, useState } from 'react'
import { Battlefield } from '../components/Battlefield'
import { Icon } from '../components/Icon'
import {
  activePawn,
  ATTACK_RANGE,
  ESCAPE_BONUS,
  MAX_ESCAPE,
  hexDist,
  initialState,
  key,
  reducer,
  reachable,
  type Tile,
} from '../lib/engine'

export const Route = createFileRoute('/game/$seed')({
  beforeLoad: ({ params }) => {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(params.seed)) throw redirect({ to: '/' })
  },
  remountDeps: ({ params }) => params.seed,
  component: function Game() {
    const { seed } = Route.useParams()
    const [state, dispatch] = useReducer(reducer, seed, initialState)
    const [panel, setPanel] = useState<'rules' | 'history'>('rules')
    const dialog = useRef<HTMLDialogElement>(null)
    const pawn = activePawn(state)
    const myTurn = !!pawn && pawn.side === 'player' && !state.winner
    const attacking = myTurn && state.phase === 'attack'
    const enemies = state.pawns.filter((p) => p.side === 'enemy')
    const targetCount = pawn ? enemies.filter((p) => hexDist(pawn, p) <= ATTACK_RANGE).length : 0
    const turnOrder = state.order.flatMap((id, index) => {
      const unit = state.pawns.find((p) => p.id === id)
      return unit ? [{ unit, index }] : []
    })

    const reach = useMemo(() => {
      if (!myTurn || !pawn || pawn.energy <= 0 || state.phase !== 'move')
        return new Map<string, number>()
      const occupied = new Set(
        state.pawns.filter((p) => p.id !== pawn.id).map((p) => key(p.q, p.r)),
      )
      return reachable(state.tiles, occupied, pawn, pawn.energy)
    }, [state.pawns, state.tiles, state.phase, myTurn, pawn])

    const onTileClick = (tile: Tile) => {
      if (attacking && pawn && hexDist(pawn, tile) <= ATTACK_RANGE)
        return dispatch({ type: 'attackAt', q: tile.q, r: tile.r })
      if (myTurn && reach.has(key(tile.q, tile.r))) dispatch({ type: 'move', q: tile.q, r: tile.r })
    }

    const openPanel = (next: typeof panel) => {
      setPanel(next)
      dialog.current?.showModal()
    }

    const instruction = state.winner
      ? 'The battle is decided. A new story awaits.'
      : attacking
        ? targetCount
          ? 'Choose a marked enemy to strike.'
          : 'No enemies in range. Cancel to reposition.'
        : 'Select a lit tile to move, or choose your next action.'

    return (
      <main className="game-shell">
        <header className="game-header">
          <div className="header-main">
            <Link to="/" className="wordmark" aria-label="Hex Strategy home">
              <span className="brand-crest">
                <Icon name="crown" />
              </span>
              <span>
                HEX<span className="wordmark-sub">STRATEGY</span>
              </span>
            </Link>
            <div className="header-tools">
              <button
                className="icon-button"
                onClick={() => openPanel('history')}
                aria-label="Battle history"
                title="Battle history"
              >
                <Icon name="history" />
              </button>
              <button
                className="icon-button"
                onClick={() => openPanel('rules')}
                aria-label="How to play"
                title="How to play"
              >
                <Icon name="help" />
              </button>
            </div>
          </div>
          <div className="initiative-bar">
            <span className="eyebrow">Turn order</span>
            <ol className="turn-order" aria-label="Round turn order">
              {turnOrder.map(({ unit, index }) => (
                <li
                  key={unit.id}
                  className={
                    'initiative-unit ' +
                    unit.side +
                    (index < state.active ? ' has-acted' : '') +
                    (index === state.active && !state.winner ? ' is-current' : '')
                  }
                  aria-current={index === state.active && !state.winner ? 'step' : undefined}
                  title={(unit.side === 'player' ? 'Your ' : 'Enemy ') + unit.kind + ' #' + unit.id}
                >
                  <Icon name={unit.kind === 'king' ? 'crown' : 'sword'} />
                  <span>{unit.id.toString().padStart(2, '0')}</span>
                  <span className="sr-only">
                    {unit.side} {unit.kind}
                    {index < state.active ? ', already acted' : ''}
                  </span>
                </li>
              ))}
            </ol>
            <span className="turn-status">{state.winner ? 'Battle ended' : 'Your move'}</span>
          </div>
        </header>

        <section
          className={'battle-stage' + (attacking ? ' is-attacking' : '')}
          aria-label="The battlefield"
        >
          <div className="stage-heading">
            <span className="eyebrow">The Verdant Vale</span>
            <span className="map-coordinate">FIELD 01 / 10 x 10</span>
          </div>
          <div className="board-container">
            <Battlefield
              tiles={state.tiles}
              pawns={state.pawns}
              active={state.winner ? undefined : pawn}
              reach={reach}
              attacking={attacking}
              onTileClick={onTileClick}
            />
          </div>
          {state.winner && (
            <div className="battle-result" role="status">
              <div className="result-card">
                <div className="result-crest">
                  <Icon name="crown" />
                </div>
                <span className="eyebrow">The battle is over</span>
                <h1>{state.winner === 'player' ? 'The vale is yours.' : 'A crown has fallen.'}</h1>
                <p>
                  {state.winner === 'player'
                    ? 'Their king has fallen. Your guard stands victorious.'
                    : 'Your king has fallen. Regroup, rethink, and return.'}
                </p>
                <Link to="/game/" className="primary-button" preload={false}>
                  New game
                  <Icon name="arrow" />
                </Link>
              </div>
            </div>
          )}
        </section>

        <footer className="command-deck">
          <div className="battle-feed" role="status" aria-live="polite" aria-atomic="true">
            <span className="feed-dot" />
            <p>{state.log.at(-1) ?? 'The vale awaits your command.'}</p>
            <button onClick={() => openPanel('history')} aria-label="Open full battle history">
              <Icon name="history" />
            </button>
          </div>
          <div className="command-content">
            <div className="unit-panel">
              <div className="unit-identity">
                <div className="unit-portrait">
                  <Icon name={pawn?.kind === 'king' ? 'crown' : 'sword'} />
                </div>
                <div>
                  <h2>
                    {state.winner
                      ? state.winner === 'player'
                        ? 'Victory'
                        : 'Defeat'
                      : (pawn?.kind ?? 'Your guard')}
                    {!state.winner && pawn && (
                      <span className="unit-number"> / {pawn.id.toString().padStart(2, '0')}</span>
                    )}
                  </h2>
                </div>
              </div>
              {pawn && !state.winner && (
                <div className="unit-stats">
                  <div className="unit-stat">
                    <span className="stat-label">
                      Health{' '}
                      <b>
                        {pawn.hp}/{pawn.maxHp}
                      </b>
                    </span>
                    <div
                      className="stat-pips health-pips"
                      role="meter"
                      aria-label="Health"
                      aria-valuenow={pawn.hp}
                      aria-valuemin={0}
                      aria-valuemax={pawn.maxHp}
                    >
                      {Array.from({ length: pawn.maxHp }, (_, i) => (
                        <i key={i} className={i < pawn.hp ? 'is-filled' : ''} />
                      ))}
                    </div>
                  </div>
                  <div className="unit-stat">
                    <span className="stat-label">
                      Energy{' '}
                      <b>
                        {pawn.energy}/{pawn.maxEnergy}
                      </b>
                    </span>
                    <div
                      className="stat-pips energy-pips"
                      role="meter"
                      aria-label="Energy"
                      aria-valuenow={pawn.energy}
                      aria-valuemin={0}
                      aria-valuemax={pawn.maxEnergy}
                    >
                      {Array.from({ length: pawn.maxEnergy }, (_, i) => (
                        <i key={i} className={i < pawn.energy ? 'is-filled' : ''} />
                      ))}
                    </div>
                  </div>
                  <div className="unit-stat escape-stat">
                    <span className="stat-label">Escape</span>
                    <strong>
                      <Icon name="escape" />
                      {pawn.escapeChance}
                      <small>%</small>
                    </strong>
                  </div>
                </div>
              )}
            </div>
            <div className="action-grid">
              <button
                className={'action-button attack-action' + (attacking ? ' is-selected' : '')}
                disabled={!myTurn || !pawn?.energy}
                onClick={() =>
                  dispatch(attacking ? { type: 'cancelAttack' } : { type: 'act', action: 'attack' })
                }
                aria-pressed={attacking}
              >
                <Icon name={attacking ? 'close' : 'sword'} />
                <span>{attacking ? 'Cancel' : 'Attack'}</span>
                <small>{attacking ? 'Back to move' : '1 energy'}</small>
              </button>
              <button
                className="action-button escape-action"
                disabled={!myTurn || attacking || !pawn?.energy || pawn.escapeChance >= MAX_ESCAPE}
                onClick={() => dispatch({ type: 'act', action: 'escape' })}
                title={
                  'Spend 1 energy for +' +
                  ESCAPE_BONUS +
                  '% escape chance this round. Maximum ' +
                  MAX_ESCAPE +
                  '%.'
                }
              >
                <Icon name="escape" />
                <span>
                  Escape <b>+{ESCAPE_BONUS}%</b>
                </span>
                <small>
                  {pawn && pawn.escapeChance >= MAX_ESCAPE ? 'Maximum reached' : '1 energy'}
                </small>
              </button>
              <button
                className="action-button special-action"
                disabled
                title="Special abilities are not available yet"
              >
                <Icon name="spark" />
                <span>Special</span>
                <small>Coming soon</small>
              </button>
              <button
                className="action-button end-action"
                disabled={!myTurn}
                onClick={() => dispatch({ type: 'endTurn' })}
              >
                <Icon name="arrow" />
                <span>End turn</span>
                <small>Next unit</small>
              </button>
            </div>
            <p className="action-hint" aria-live="polite">
              {instruction}
            </p>
          </div>
        </footer>

        <dialog
          ref={dialog}
          className="game-dialog"
          aria-labelledby="dialog-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) dialog.current?.close()
          }}
        >
          <div className="dialog-content">
            <div className="dialog-heading">
              <div>
                <span className="eyebrow">Commander's field notes</span>
                <h2 id="dialog-title">
                  {panel === 'rules' ? 'The art of the turn.' : 'Battle chronicle.'}
                </h2>
              </div>
              <button
                className="icon-button"
                onClick={() => dialog.current?.close()}
                aria-label="Close dialog"
              >
                <Icon name="close" />
              </button>
            </div>
            {panel === 'rules' ? (
              <div className="rules-list">
                <p>
                  Lead your king and two swordsmen across the vale. Defeat the enemy king to win.
                  Losing yours ends the battle.
                </p>
                <section>
                  <Icon name="energy" />
                  <div>
                    <h3>Three energy. Every round.</h3>
                    <p>
                      Each unit starts with 3 health and 3 energy. The lit unit is yours to command.
                      Moving costs 1 energy per tile; numbers show the full cost. Mountains cannot
                      be crossed.
                    </p>
                  </div>
                </section>
                <section>
                  <Icon name="sword" />
                  <div>
                    <h3>Make your move.</h3>
                    <p>
                      Attack spends 1 energy to deal 1 damage to an enemy within {ATTACK_RANGE}{' '}
                      tiles. Choose Attack, then a marked enemy. Cancel costs nothing.
                    </p>
                  </div>
                </section>
                <section>
                  <Icon name="escape" />
                  <div>
                    <h3>Live to fight another turn.</h3>
                    <p>
                      Escape spends 1 energy to add {ESCAPE_BONUS} percentage points to your chance
                      of avoiding each incoming attack: 20%, 40%, then {MAX_ESCAPE}%. It is not a
                      movement action. The bonus lasts until the round ends.
                    </p>
                  </div>
                </section>
                <section>
                  <Icon name="history" />
                  <div>
                    <h3>A fresh round. A new order.</h3>
                    <p>
                      End turn passes to the next unit. Running out of energy also ends your turn.
                      Enemy units act automatically. Each new round shuffles the order, restores all
                      energy, and resets Escape to 0%.
                    </p>
                  </div>
                </section>
              </div>
            ) : (
              <ol className="history-list">
                {state.log.map((entry, index) => (
                  <li key={index}>
                    <span>{(index + 1).toString().padStart(2, '0')}</span>
                    <p>{entry}</p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </dialog>
      </main>
    )
  },
})
