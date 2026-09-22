import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMemo, useRef } from 'react'
import { useGame } from '../useGame'
import { Battlefield } from '../components/Battlefield'
import { BattleNotifications } from '../components/BattleNotifications'
import { Icon, PawnIcon } from '../components/Icon'
import {
  activePawn,
  BIOMES,
  King,
  RECRUIT_CLASSES,
  canUseSpecial,
  specialTargets,
  targetingTiles,
  ESCAPE_BONUS,
  MAX_ESCAPE,
  key,
  reachable,
  type Tile,
} from '../lib/engine'

const classes = [King, ...RECRUIT_CLASSES].map((Unit) => new Unit(0, 0, 0, 'player'))

export const Route = createFileRoute('/game/$seed')({
  beforeLoad: ({ params }) => {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(params.seed)) throw redirect({ to: '/' })
  },
  remountDeps: ({ params }) => params.seed,
  component: function Game() {
    const { seed } = Route.useParams()
    const { state, dispatch, effect, effectId, playing } = useGame(seed)
    const dialog = useRef<HTMLDialogElement>(null)
    const pawn = activePawn(state)
    const canRally = pawn?.kind === 'king' && specialTargets(state.pawns, pawn).length > 0
    const myTurn = !!pawn && pawn.side === 'player' && !state.winner && !playing
    const attacking = myTurn && state.phase === 'attack'
    const usingSpecial = myTurn && (state.phase === 'special' || state.phase === 'charge')
    const targets = useMemo(() => targetingTiles(state), [state])
    const targetLabel = attacking
      ? 'Attack'
      : state.phase === 'special' && pawn?.kind === 'swordsman'
        ? 'Charge to'
        : pawn?.kind === 'ninja'
          ? 'Jump to'
          : (pawn?.special.name ?? 'Special')
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
      if (!myTurn) return
      if (targets.has(key(tile.q, tile.r)))
        return dispatch({ type: attacking ? 'attackAt' : 'specialAt', q: tile.q, r: tile.r })
      if (reach.has(key(tile.q, tile.r))) dispatch({ type: 'move', q: tile.q, r: tile.r })
    }

    return (
      <main className="game-shell">
        {!!effect?.impacts?.length && (
          <div
            key={effectId}
            className={
              'combat-feedback ' +
              (effect.impacts.some((hit) => hit.damage > 0) ? 'feedback-hit' : 'feedback-miss')
            }
            aria-hidden="true"
          />
        )}
        <header className="game-header">
          <div className="header-main">
            <Link to="/" className="wordmark" aria-label="Hex Strategy home">
              <span className="brand-crest">
                <Icon name="crown" />
              </span>
              <span>
                HEX<span className="wordmark-sub">{BIOMES[state.biome].name}</span>
              </span>
            </Link>
            <div className="header-tools">
              {playing && pawn?.side === 'enemy' && (
                <span className="enemy-turn" role="status">
                  Enemy turn
                </span>
              )}
              <button
                className="icon-button"
                onClick={() => dialog.current?.showModal()}
                aria-label="How to play"
                title="How to play"
              >
                <Icon name="help" />
              </button>
            </div>
          </div>
          <div className="initiative-bar">
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
                  title={
                    (unit.side === 'player' ? 'Your ' : 'Enemy ') + unit.kind + ' #' + unit.id
                  }
                >
                  <PawnIcon kind={unit.kind} />
                  <span>{unit.id.toString().padStart(2, '0')}</span>
                  <span className="sr-only">
                    {unit.side} {unit.kind}
                    {index < state.active ? ', already acted' : ''}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </header>

        <section
          className={'battle-stage' + (attacking ? ' is-attacking' : '')}
          aria-label="The battlefield"
        >
          <div className="board-container">
            <Battlefield
              tiles={state.tiles}
              pawns={state.pawns}
              active={state.winner ? undefined : pawn}
              reach={reach}
              targets={targets}
              targetLabel={targetLabel}
              preview={state.chargeDestination}
              effect={effect}
              effectId={effectId}
              onTileClick={onTileClick}
            />
          </div>
          <BattleNotifications log={state.log} logCount={state.logCount} />
          {state.winner && (
            <div className="battle-result" role="status">
              <div className="result-card">
                <div className="result-crest">
                  <Icon name="crown" />
                </div>
                <span className="eyebrow">The battle is over</span>
                <h1>
                  {state.winner === 'player'
                    ? 'The battlefield is yours.'
                    : 'A crown has fallen.'}
                </h1>
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
          <div className="command-content">
            <div className="unit-panel">
              <div className="unit-identity">
                <div className="unit-portrait">
                  <PawnIcon kind={pawn?.kind ?? 'swordsman'} />
                </div>
                <div>
                  <h2>
                    {state.winner
                      ? state.winner === 'player'
                        ? 'Victory'
                        : 'Defeat'
                      : (pawn?.kind ?? 'Your guard')}
                    {!state.winner && pawn && (
                      <span className="unit-number">
                        {' '}
                        / {pawn.id.toString().padStart(2, '0')}
                      </span>
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
                disabled={!myTurn || usingSpecial || !pawn?.energy}
                onClick={() =>
                  dispatch(
                    attacking ? { type: 'cancelTargeting' } : { type: 'act', action: 'attack' },
                  )
                }
                aria-pressed={attacking}
              >
                <Icon name={attacking ? 'close' : 'sword'} />
                <span>{attacking ? 'Cancel' : 'Attack'}</span>
                <small>
                  {attacking ? (targets.size ? 'Choose enemy' : 'No targets') : '1 energy'}
                </small>
              </button>
              <button
                className={
                  'action-button special-action' + (usingSpecial ? ' is-selected' : '')
                }
                disabled={
                  !myTurn ||
                  attacking ||
                  !pawn ||
                  !canUseSpecial(pawn) ||
                  (pawn.kind === 'king' && !canRally)
                }
                title={pawn?.special.description}
                aria-pressed={usingSpecial}
                onClick={() =>
                  dispatch(
                    usingSpecial
                      ? { type: 'cancelTargeting' }
                      : { type: 'act', action: 'special' },
                  )
                }
              >
                <Icon name={usingSpecial ? 'close' : 'spark'} />
                <span>{usingSpecial ? 'Cancel' : (pawn?.special.name ?? 'Special')}</span>
                <small>
                  {usingSpecial
                    ? !targets.size
                      ? 'No targets'
                      : state.phase === 'charge'
                        ? 'Choose enemy'
                        : pawn?.kind === 'swordsman' || pawn?.kind === 'ninja'
                          ? 'Choose tile'
                          : 'Choose enemy'
                    : pawn?.kind === 'king' && pawn.specialUsed
                      ? 'Used this round'
                      : pawn?.kind === 'king' && !canRally
                        ? 'No allies to heal'
                        : (pawn?.special.cost ?? 2) + ' energy'}
                </small>
              </button>
              <button
                className="action-button end-action"
                disabled={!myTurn}
                onClick={() => dispatch({ type: 'endTurn' })}
                title={
                  'Spend all remaining energy and end this turn. Escape: ' +
                  (pawn?.endTurnEscapeChance ?? 0) +
                  '% until the round ends.'
                }
              >
                <Icon name="escape" />
                <span>End turn</span>
                <small>
                  +{pawn ? pawn.endTurnEscapeChance - pawn.escapeChance : 0}% escape
                </small>
              </button>
            </div>
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
                <h2 id="dialog-title">The art of the turn.</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => dialog.current?.close()}
                aria-label="Close dialog"
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="rules-list">
              <p>
                Each army has one king, at least one swordsman, and three random recruits.
                Repeated classes are possible. Both sides get the same lineup, chosen by the
                game seed. Defeat the enemy king to win; losing yours ends the battle. The seed
                also chooses the biome: Verdant Vale has lakes and forests, Mountain Ranges has
                mountain chains, and Open Desert is all sand with no obstacles.
              </p>
              <section>
                <Icon name="energy" />
                <div>
                  <h3>Three energy. Every round.</h3>
                  <p>
                    Each unit starts with 3 energy. The lit unit is yours to command. Moving
                    costs 1 energy per tile; numbers show the full cost. Mountains and lakes
                    block walking and Charge. Arrows and magic pass over them.
                  </p>
                </div>
              </section>
              <section>
                <Icon name="sword" />
                <div>
                  <h3>Make your move.</h3>
                  <p>
                    Normal attacks cost 1 energy. Each class has its own damage and range.
                    Choose Attack or a targeted special, then a highlighted target. Jump selects
                    an empty landing tile, not an enemy. Rally heals every adjacent ally
                    immediately. Charge first asks for a destination, then an adjacent enemy.
                    Cancelling either step costs nothing. Ranged attacks can pass over terrain.
                  </p>
                </div>
              </section>
              {classes.map((unit) => (
                <section key={unit.kind}>
                  <PawnIcon kind={unit.kind} />
                  <div>
                    <h3 className="class-name">
                      {unit.kind}: {unit.maxHp} health
                    </h3>
                    <p>
                      {unit.attack.damage} damage, range{' '}
                      {unit.attack.minRange === unit.attack.maxRange
                        ? unit.attack.maxRange
                        : unit.attack.minRange + '-' + unit.attack.maxRange}
                      . {unit.special.name} costs {unit.special.cost} energy.{' '}
                      {unit.special.description}
                    </p>
                  </div>
                </section>
              ))}
              <section>
                <Icon name="escape" />
                <div>
                  <h3>Live to fight another turn.</h3>
                  <p>
                    End turn converts all remaining energy into Escape: +{ESCAPE_BONUS}{' '}
                    percentage points per energy, up to {MAX_ESCAPE}% chance to avoid each
                    incoming attack. The bonus lasts until the round ends. It is not a movement
                    action.
                  </p>
                </div>
              </section>
              <section>
                <Icon name="history" />
                <div>
                  <h3>A fresh round. A new order.</h3>
                  <p>
                    End turn spends your remaining energy and passes to the next unit. Running
                    out of energy also ends your turn, with no extra Escape bonus. Enemy units
                    act automatically. Each new round shuffles the order, restores all energy,
                    and resets Escape to 0%.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </dialog>
      </main>
    )
  },
})
