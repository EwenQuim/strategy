import { buttonClassName, iconButtonClassName } from './styles'
import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useGame } from '../useGame'
import { armyLabels, playerNames, type GameMode } from '../lib/game-mode'
import { CAMPAIGN_LEVELS } from '../lib/campaign'
import type { BotDifficulty } from '../lib/bot'
import {
  recordCampaignVictory,
  subscribeCampaignProgress,
  campaignProgressSaved,
} from '../campaignProgress'
import { Battlefield } from './Battlefield'
import { BattleNotifications } from './BattleNotifications'
import { Icon, PawnIcon } from './Icon'
import {
  activePawn,
  BIOMES,
  TILE_FEATURES,
  King,
  RECRUIT_CLASSES,
  canAttack,
  canUseSpecial,
  specialTargets,
  targetingTiles,
  ESCAPE_BONUS,
  MAX_ESCAPE,
  key,
  movementDestinations,
  type Tile,
  type BattleSetup,
} from '../lib/engine'

const actionButtonClassName =
  'grid min-h-16 grid-cols-[auto_1fr] items-center gap-x-2.5 rounded-[9px] border px-4 py-3 text-left [&:enabled:hover]:border-[#bcc8a670] [&:enabled:hover]:bg-[#ffffff0c] compact:min-h-[76px] compact:grid-cols-1 compact:justify-items-center compact:gap-y-[3px] compact:rounded-lg compact:px-0.5 compact:pt-[9px] compact:pb-2 compact:text-center short:min-h-[65px] short:py-1.5 flat:min-h-12 flat:px-3 flat:py-1.5'

const classes = [King, ...RECRUIT_CLASSES].map((Unit) => new Unit(0, 0, 0, 'player'))

export function Game({
  seed,
  mode,
  setup,
  campaignLevel,
  difficulty = 'normal',
}: {
  seed: string
  mode: GameMode
  setup?: BattleSetup
  campaignLevel?: number
  difficulty?: BotDifficulty
}) {
  const local = mode === 'local'
  const labels = armyLabels[mode]
  const { state, dispatch, effect, effectId, playing } = useGame(seed, mode, setup, difficulty)
  const progressSaved = useSyncExternalStore(subscribeCampaignProgress, campaignProgressSaved)
  useEffect(() => {
    if (campaignLevel && state.winner === 'player') recordCampaignVictory(campaignLevel)
  }, [campaignLevel, state.winner])
  const winnerLabel =
    campaignLevel === CAMPAIGN_LEVELS.length && state.winner === 'player'
      ? 'Campaign complete!'
      : state.winner && local
        ? playerNames[state.winner] + ' wins!'
        : null
  const dialog = useRef<HTMLDialogElement>(null)
  const pawn = activePawn(state)
  const hasAllies = !!pawn && specialTargets(state.pawns, pawn).length > 0
  const hasFoes =
    !!pawn &&
    state.pawns.some((target) => canAttack(pawn, target, state.tiles.get(key(pawn.q, pawn.r))))
  const myTurn = !!pawn && (local || pawn.side === 'player') && !state.winner && !playing
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
    return movementDestinations(state.tiles, state.pawns, pawn)
  }, [state.pawns, state.tiles, state.phase, myTurn, pawn])

  const onTileClick = (tile: Tile) => {
    if (!myTurn) return
    if (targets.has(key(tile.q, tile.r)))
      return dispatch({ type: attacking ? 'attackAt' : 'specialAt', q: tile.q, r: tile.r })
    if (reach.has(key(tile.q, tile.r))) dispatch({ type: 'move', q: tile.q, r: tile.r })
  }

  return (
    <main
      className="battlefield-theme grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-(--biome-background)"
      data-biome={state.biome}
    >
      {!!effect?.impacts?.length && (
        <div
          key={effectId}
          className={
            'combat-feedback ' +
            (effect.impacts.some((hit) => hit.damage > 0)
              ? 'combat-feedback--hit'
              : 'combat-feedback--miss')
          }
          aria-hidden="true"
        />
      )}
      <header
        className="relative z-2 bg-(--biome-panel) px-[max(16px,env(safe-area-inset-left))] pt-[max(8px,env(safe-area-inset-top))] shadow-[0_8px_30px_#0a1e1a22] wide:pt-[max(13px,env(safe-area-inset-top))] compact:px-4 narrow:px-3 flat:pt-[3px]"
        data-testid="game-header"
      >
        <div className="m-auto flex min-h-[50px] max-w-[1040px] items-center justify-between wide:min-h-[53px] short:min-h-[43px] flat:min-h-[42px]">
          <Link
            to={campaignLevel ? '/campaign' : '/'}
            className="flex items-center gap-2.5 font-display text-[23px] leading-none tracking-[0.15em] wide:text-[26px]"
            aria-label={campaignLevel ? 'Campaign levels' : 'Hexmate home'}
          >
            <span className="grid h-10 w-[34px] place-items-center rounded-[4px_4px_15px_15px] border border-[#dcc48a4a] bg-[linear-gradient(150deg,#dcc48a12,transparent)] text-gold [&>svg]:size-[22px]">
              <Icon name="crown" />
            </span>
            <span>
              HEX
              <span
                className="mt-[5px] block font-label text-[7px] leading-[normal] tracking-[0.29em] text-muted"
                data-testid="battle-subtitle"
              >
                {campaignLevel
                  ? 'Level ' + campaignLevel + ' / ' + CAMPAIGN_LEVELS.length
                  : BIOMES[state.biome].name}
              </span>
            </span>
          </Link>
          <div className="flex gap-0">
            {local && pawn && !state.winner && (
              <span
                className="mr-2.5 self-center text-[10px] text-[#d69b81] data-[side=player]:text-[#b6d2b5]"
                data-testid="player-turn"
                data-side={pawn.side}
                role="status"
              >
                {playerNames[pawn.side]} turn
              </span>
            )}
            {!local && playing && pawn?.side === 'enemy' && (
              <span
                className="mr-2.5 self-center text-[10px] text-[#d69b81]"
                data-testid="enemy-turn"
                role="status"
              >
                Enemy turn
              </span>
            )}
            <button
              className={iconButtonClassName}
              onClick={() => dialog.current?.showModal()}
              aria-label="How to play"
              title="How to play"
            >
              <Icon name="help" />
            </button>
          </div>
        </div>
        <div className="m-auto flex min-h-[41px] max-w-[1040px] items-center gap-3 border-t border-line wide:min-h-[43px] compact:gap-2 short:min-h-[34px] flat:hidden">
          <ol
            className="m-0 flex min-w-0 flex-1 list-none gap-[5px] overflow-x-auto p-0 [scrollbar-width:thin] compact:gap-[3px]"
            aria-label="Round turn order"
          >
            {turnOrder.map(({ unit, index }) => (
              <li
                key={unit.id}
                className="flex min-w-6 flex-1 items-center justify-center gap-1 rounded-[5px] border border-transparent px-[5px] py-1 text-[8px] text-[#b6d2b5] data-[side=enemy]:not-aria-[current=step]:text-[#d69b81] data-[acted=true]:opacity-35 aria-[current=step]:border-[#d7c78a66] aria-[current=step]:bg-[#d7c78a14] aria-[current=step]:text-[#ead99e] [&>svg]:size-3.5 wide:px-[9px] compact:flex-col compact:gap-0 compact:px-0.5 compact:py-[3px] compact:[&>svg]:size-3"
                data-testid="initiative-unit"
                data-side={unit.side}
                data-acted={index < state.active}
                aria-current={index === state.active && !state.winner ? 'step' : undefined}
                title={labels[unit.side] + ' ' + unit.kind + ' #' + unit.id}
              >
                <PawnIcon kind={unit.kind} />
                <span>{unit.id.toString().padStart(2, '0')}</span>
                <span className="sr-only">
                  {labels[unit.side]} {unit.kind}
                  {index < state.active ? ', already acted' : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <section
        className="battlefield-backdrop relative isolate grid min-h-0 grid-rows-[minmax(0,1fr)]"
        aria-label="The battlefield"
      >
        <div className="flex min-h-0 items-center justify-center px-2.5 py-[3px] compact:px-[3px]">
          <Battlefield
            mode={mode}
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
        <BattleNotifications log={state.log} logCount={state.logCount} mode={mode} />
        {state.winner && (
          <div
            className="absolute inset-0 grid place-items-center bg-[#14281eab] p-4 backdrop-blur-[5px]"
            data-testid="battle-result"
            role="status"
          >
            <div
              className="max-w-[390px] rounded-2xl border border-[#dcc48a59] bg-[#20362bee] p-7 text-center shadow-[0_20px_60px_#07180f80] [&_h1]:mt-2 [&_h1]:mb-3 [&_h1]:font-serif [&_h1]:text-[32px] [&_h1]:leading-[normal] [&_p]:text-[12px] [&_p]:leading-[1.7] [&_p]:text-[#bfccb4] short:px-5 short:py-4 short:[&_h1]:text-[25px]"
              data-testid="result-card"
            >
              <div className="mx-auto mb-4 grid size-13 place-items-center rounded-full border border-[#dcc48a40] text-gold [&>svg]:size-[29px] short:hidden">
                <Icon name="crown" />
              </div>
              <span className="text-muted text-[9px] font-semibold tracking-[0.17em] uppercase">
                {campaignLevel
                  ? 'Level ' + campaignLevel + ': ' + CAMPAIGN_LEVELS[campaignLevel - 1].name
                  : 'The battle is over'}
              </span>
              <h1>
                {winnerLabel ??
                  (state.winner === 'player'
                    ? 'The battlefield is yours.'
                    : 'A crown has fallen.')}
              </h1>
              <p>
                {local
                  ? labels[state.winner === 'player' ? 'enemy' : 'player'] + ' king has fallen.'
                  : state.winner === 'player'
                    ? 'Their king has fallen. Your guard stands victorious.'
                    : 'Your king has fallen. Regroup, rethink, and return.'}
              </p>
              {campaignLevel ? (
                <div
                  className="flex flex-col items-center"
                  data-testid="campaign-result-actions"
                >
                  {state.winner === 'player' ? (
                    campaignLevel < CAMPAIGN_LEVELS.length ? (
                      <Link
                        to="/campaign/$level"
                        params={{ level: String(campaignLevel + 1) }}
                        className={
                          buttonClassName +
                          ' mt-5 min-h-[46px] short:mt-3 justify-center gap-[30px] border-[#e5d19a] bg-[#d8c38a] px-[25px] text-[#24392a] hover:bg-[#ecdaa3]'
                        }
                        preload={false}
                      >
                        Next level
                        <Icon name="arrow" />
                      </Link>
                    ) : (
                      <Link
                        to="/campaign"
                        className={
                          buttonClassName +
                          ' mt-5 min-h-[46px] short:mt-3 justify-center gap-[30px] border-[#e5d19a] bg-[#d8c38a] px-[25px] text-[#24392a] hover:bg-[#ecdaa3]'
                        }
                      >
                        Back to campaign
                      </Link>
                    )
                  ) : (
                    <button
                      className={
                        buttonClassName +
                        ' mt-5 min-h-[46px] short:mt-3 justify-center gap-[30px] border-[#e5d19a] bg-[#d8c38a] px-[25px] text-[#24392a] hover:bg-[#ecdaa3]'
                      }
                      onClick={() => dispatch({ type: 'restart' })}
                    >
                      Retry level
                    </button>
                  )}
                  {!(state.winner === 'player' && campaignLevel === CAMPAIGN_LEVELS.length) && (
                    <Link to="/campaign" className="p-3 text-[11px] underline">
                      Level selection
                    </Link>
                  )}
                  {!progressSaved && (
                    <p role="status">
                      Progress could not be saved. It will last only for this tab.
                    </p>
                  )}
                </div>
              ) : (
                <Link
                  to="/game"
                  search={{
                    mode,
                    difficulty,
                    setup: setup?.map === undefined ? setup : undefined,
                  }}
                  className={
                    buttonClassName +
                    ' mt-5 min-h-[46px] short:mt-3 justify-center gap-[30px] border-[#e5d19a] bg-[#d8c38a] px-[25px] text-[#24392a] hover:bg-[#ecdaa3]'
                  }
                  preload={false}
                >
                  New game
                  <Icon name="arrow" />
                </Link>
              )}
            </div>
          </div>
        )}
      </section>

      <footer
        className="relative z-2 border-t border-[#c4d1a530] bg-(--biome-panel) pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_#10201840]"
        data-testid="command-deck"
      >
        <div className="m-auto max-w-[920px] px-[18px] pt-3.5 pb-2.5 wide:pt-[17px] wide:pb-3 compact:px-3.5 compact:pt-3 compact:pb-[9px] narrow:px-2.5 short:pt-2 short:pb-1.5 flat:flex flat:items-center flat:gap-5 flat:px-[18px] flat:py-2">
          <div className="mb-3.5 flex items-center justify-between gap-[15px] wide:mb-[17px] compact:mb-3 compact:gap-2.5 short:mb-2 flat:m-0 flat:flex-col flat:items-start flat:gap-1.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid h-[46px] w-[42px] shrink-0 place-items-center rounded-[10px_10px_16px_16px] border border-[#c4d1a53b] bg-[linear-gradient(135deg,#4c604038,#203d3077)] text-gold [&>svg]:size-[26px] wide:h-[49px] wide:w-[47px] compact:hidden flat:hidden">
                <PawnIcon kind={pawn?.kind ?? 'swordsman'} />
              </div>
              <div>
                <h2 className="font-display text-[20px] leading-[normal] capitalize whitespace-nowrap wide:text-[24px] compact:text-[19px] narrow:text-[16px] flat:text-[16px]">
                  {state.winner
                    ? (winnerLabel ?? (state.winner === 'player' ? 'Victory' : 'Defeat'))
                    : (pawn?.kind ?? 'Your guard')}
                  {!state.winner && pawn && (
                    <span className="font-label text-[10px] leading-[normal] tracking-[0.05em] text-[#7f957e] compact:text-[9px] narrow:hidden">
                      {' '}
                      / {pawn.id.toString().padStart(2, '0')}
                    </span>
                  )}
                </h2>
              </div>
            </div>
            {pawn && !state.winner && (
              <div
                className="flex items-center gap-[18px] wide:gap-7 compact:gap-2.5 narrow:gap-2 flat:gap-2.5"
                data-testid="unit-stats"
              >
                <div className="w-[60px] min-w-[60px] wide:w-[83px] wide:min-w-[83px] compact:w-[49px] compact:min-w-[49px] flat:w-[45px] flat:min-w-[45px]">
                  <span className="flex justify-between gap-2.5 text-[9px] text-muted compact:gap-[5px] compact:text-[8px]">
                    Health{' '}
                    <b className="text-[9px] font-medium text-[#d9dfc9] compact:text-[8px]">
                      {pawn.hp}/{pawn.maxHp}
                    </b>
                  </span>
                  <div
                    className="mt-[7px] flex w-full gap-[3px]"
                    role="meter"
                    aria-label="Health"
                    aria-valuenow={pawn.hp}
                    aria-valuemin={0}
                    aria-valuemax={pawn.maxHp}
                  >
                    {Array.from({ length: pawn.maxHp }, (_, i) => (
                      <i
                        key={i}
                        data-filled={i < pawn.hp}
                        className="h-[5px] min-w-0 flex-1 rounded-[1px] bg-[#34483a] data-[filled=true]:bg-[#b7c9a0] compact:h-1"
                      />
                    ))}
                  </div>
                </div>
                <div className="w-[60px] min-w-[60px] wide:w-[83px] wide:min-w-[83px] compact:w-[49px] compact:min-w-[49px] flat:w-[45px] flat:min-w-[45px]">
                  <span className="flex justify-between gap-2.5 text-[9px] text-muted compact:gap-[5px] compact:text-[8px]">
                    Energy{pawn.bonusEnergy ? ' +' + pawn.bonusEnergy : ''}{' '}
                    <b className="text-[9px] font-medium text-[#d9dfc9] compact:text-[8px]">
                      {pawn.energy}/{pawn.maxEnergy}
                    </b>
                  </span>
                  <div
                    className="mt-[7px] flex w-full gap-[3px]"
                    role="meter"
                    aria-label="Energy"
                    aria-valuenow={pawn.energy}
                    aria-valuemin={0}
                    aria-valuemax={pawn.maxEnergy}
                  >
                    {Array.from({ length: pawn.maxEnergy }, (_, i) => (
                      <i
                        key={i}
                        data-filled={i < pawn.energy}
                        className="h-[5px] min-w-0 flex-1 rounded-[1px] bg-[#34483a] data-[filled=true]:bg-[#d4bb7b] compact:h-1"
                      />
                    ))}
                  </div>
                </div>
                <div className="w-[60px] min-w-[43px] wide:w-[83px] wide:min-w-[83px] compact:w-[49px] compact:min-w-[41px] flat:w-[45px] flat:min-w-[45px] border-l border-line pl-3.5 [&_svg]:size-[15px] [&_small]:-ml-[3px] [&_small]:text-[10px] compact:pl-2 compact:[&_svg]:hidden flat:pl-2">
                  <span className="flex justify-between gap-2.5 text-[9px] text-muted compact:gap-[5px] compact:text-[8px]">
                    Escape
                  </span>
                  <strong className="mt-0.5 flex items-center gap-1 text-[18px] leading-none font-medium text-[#bad0bb] compact:text-[17px]">
                    <Icon name="escape" />
                    {pawn.escapeChance}
                    <small>%</small>
                  </strong>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 wide:gap-3 compact:gap-1.5 flat:flex-1">
            <button
              className={
                actionButtonClassName +
                ' border-[#d69e803d] bg-[#b8795809] text-[#e3b096] aria-pressed:border-[#e0a586] aria-pressed:bg-[#ab695333]'
              }
              data-action="attack"
              disabled={!myTurn || usingSpecial || !pawn?.energy || (!attacking && !hasFoes)}
              onClick={() =>
                dispatch(
                  attacking ? { type: 'cancelTargeting' } : { type: 'act', action: 'attack' },
                )
              }
              aria-pressed={attacking}
            >
              <Icon
                className="row-span-2 size-[22px] compact:row-auto compact:mb-0.5 compact:size-5"
                name={attacking ? 'close' : 'sword'}
              />
              <span className="text-[13px] font-semibold whitespace-nowrap compact:text-[11px] narrow:text-[10px] flat:text-[11px]">
                {attacking ? 'Cancel' : 'Attack'}
              </span>
              <small className="mt-0.5 block text-[9px] compact:mt-0 compact:text-[8px] text-[#b5a997]">
                {attacking ? 'Choose enemy' : '1 energy'}
              </small>
            </button>
            <button
              className={
                actionButtonClassName +
                ' border-[#bcc8a62e] bg-[#ffffff04] text-[#d0b6e7] aria-pressed:border-[#c4a6db] aria-pressed:bg-[#9f82b933]'
              }
              data-action="special"
              disabled={
                !myTurn ||
                attacking ||
                !pawn ||
                !canUseSpecial(pawn) ||
                ((pawn.kind === 'king' || pawn.kind === 'bulwark') && !hasAllies)
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
              <Icon
                className="row-span-2 size-[22px] compact:row-auto compact:mb-0.5 compact:size-5"
                name={usingSpecial ? 'close' : 'spark'}
              />
              <span className="text-[13px] font-semibold whitespace-nowrap compact:text-[11px] narrow:text-[10px] flat:text-[11px]">
                {usingSpecial ? 'Cancel' : (pawn?.special.name ?? 'Special')}
              </span>
              <small className="mt-0.5 block text-[9px] text-[#a1b29b] compact:mt-0 compact:text-[8px]">
                {usingSpecial
                  ? !targets.size
                    ? 'No targets'
                    : state.phase === 'charge'
                      ? 'Choose enemy'
                      : pawn?.kind === 'swordsman' || pawn?.kind === 'ninja'
                        ? 'Choose tile'
                        : pawn?.kind === 'bulwark'
                          ? 'Choose ally'
                          : 'Choose enemy'
                  : pawn?.kind === 'king' && pawn.specialUsed
                    ? 'Used this round'
                    : pawn?.kind === 'king' && !hasAllies
                      ? 'No allies to heal'
                      : pawn?.kind === 'bulwark' && !hasAllies
                        ? 'No nearby allies'
                        : (pawn?.special.cost ?? 2) + ' energy'}
              </small>
            </button>
            <button
              className={
                actionButtonClassName + ' border-[#bcc8a62e] bg-[#ffffff04] text-[#e6e7d4]'
              }
              data-action="endTurn"
              disabled={!myTurn}
              onClick={() => dispatch({ type: 'endTurn' })}
              title={
                'Spend all remaining energy and end this turn. Escape: ' +
                (pawn?.endTurnEscapeChance ?? 0) +
                '% until the round ends.'
              }
            >
              <Icon
                className="row-span-2 size-[22px] compact:row-auto compact:mb-0.5 compact:size-5"
                name="escape"
              />
              <span className="text-[13px] font-semibold whitespace-nowrap compact:text-[11px] narrow:text-[10px] flat:text-[11px]">
                End turn
              </span>
              <small className="mt-0.5 block text-[9px] text-[#a1b29b] compact:mt-0 compact:text-[8px]">
                +{pawn ? pawn.endTurnEscapeChance - pawn.escapeChance : 0}% escape
              </small>
            </button>
          </div>
        </div>
      </footer>

      <dialog
        ref={dialog}
        className="fixed inset-0 m-auto max-h-[min(720px,calc(100dvh-40px))] w-[min(520px,calc(100vw-28px))] rounded-2xl border border-[#d1cf9b40] bg-[#20362b] p-0 text-ink shadow-[0_25px_90px_#07180f99] backdrop:bg-[#091910b8] backdrop:backdrop-blur-[7px]"
        aria-labelledby="dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close()
        }}
      >
        <div className="p-[25px]">
          <div className="flex items-center justify-between gap-2.5 border-b border-line pb-5 [&>button]:shrink-0">
            <div>
              <span className="text-muted text-[9px] font-semibold tracking-[0.17em] uppercase">
                Commander's field notes
              </span>
              <h2 className="mt-2 font-serif text-[27px] leading-[normal]" id="dialog-title">
                The art of the turn.
              </h2>
            </div>
            <button
              className={iconButtonClassName}
              onClick={() => dialog.current?.close()}
              aria-label="Close dialog"
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="text-[12px] leading-[1.8] text-[#c5ceba] [&>p]:pt-5 [&>section]:flex [&>section]:gap-[15px] [&>section]:pt-[22px] [&>section>svg]:mt-[3px] [&>section>svg]:w-[21px] [&>section>svg]:shrink-0 [&>section>svg]:text-gold">
            <p>
              {campaignLevel
                ? 'This campaign battle has fixed armies and terrain. Defeat the enemy king to unlock the next level. Losing or leaving does not erase completed levels.'
                : setup
                  ? 'This custom battle uses your chosen armies and biome. Defeat the opposing king to win; losing yours ends the battle.'
                  : 'Each army has one king, at least one swordsman, and three random recruits. Repeated classes are possible. Both sides get the same lineup, chosen by the game seed. Defeat the enemy king to win; losing yours ends the battle.'}{' '}
              {setup && !campaignLevel && !local && 'AI difficulty: ' + difficulty + '. '}
              {setup?.map
                ? 'Terrain and starting positions are designed for this level; the biome sets its visual theme.'
                : 'Verdant Vale has lakes and forests, Mountain Ranges has mountain chains, Open Desert has oases and rare decorative palms, and Ember Caldera has lava pools over dark basalt.'}
            </p>
            <section>
              <Icon name="energy" />
              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-ink">
                  Three energy. Every round.
                </h3>
                <p>
                  Each unit starts with 3 energy. The lit unit is yours to command. Moving costs
                  1 energy per tile, or 2 for a Bulwark; numbers show the full cost. Mountains
                  and lakes block walking and Charge. Arrows and magic pass over them.
                </p>
              </div>
            </section>
            <section>
              <Icon name="sword" />
              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-ink">Make your move.</h3>
                <p>
                  Normal attacks cost 1 energy. Each class has its own damage and range. Choose
                  Attack or a targeted special, then a highlighted target. Jump selects an empty
                  landing tile, not an enemy. Rally heals every adjacent ally immediately.
                  Protect selects an adjacent ally; a shield marks the protected unit. Charge
                  first asks for a destination, then an adjacent enemy. Cancelling either step
                  costs nothing. Ranged attacks can pass over terrain.
                </p>
              </div>
            </section>
            <section>
              <Icon name="hex" />
              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-ink">Control the center.</h3>
                <p>
                  Random maps have zero (50%), one (40%), or two (10%) special tiles, only in
                  the two middle rows.
                </p>
                {Object.values(TILE_FEATURES).map((feature) => (
                  <p key={feature.name}>
                    <b>{feature.name}.</b> {feature.description}
                  </p>
                ))}
                <p>
                  Lava costs 1 health for every tile entered, including during Charge. Damage
                  cannot be escaped or redirected by Protect and can be lethal. Jump crosses
                  lava safely but landing on it deals damage. Forests and palms are decorative.
                </p>
              </div>
            </section>
            {classes.map((unit) => (
              <section key={unit.kind}>
                <PawnIcon kind={unit.kind} />
                <div>
                  <h3 className="mb-1 text-[13px] font-semibold text-ink capitalize">
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
                <h3 className="mb-1 text-[13px] font-semibold text-ink">
                  Live to fight another turn.
                </h3>
                <p>
                  End turn converts all remaining energy into Escape: +{ESCAPE_BONUS} percentage
                  points per energy, up to {MAX_ESCAPE}% chance to avoid each incoming attack.
                  The bonus lasts until the round ends. It is not a movement action.
                </p>
              </div>
            </section>
            <section>
              <Icon name="history" />
              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-ink">
                  A fresh round. The same order.
                </h3>
                <p>
                  End turn spends your remaining energy and passes to the next unit. Running out
                  of energy also ends your turn, with no extra Escape bonus.{' '}
                  {local
                    ? 'Share this device: Player 1 commands green units and Player 2 commands red units. Follow the turn indicator for each unit; the same player may act several times in a row.'
                    : 'You move first; enemy units act automatically.'}{' '}
                  Turn order is decided once at the start and stays the same, skipping fallen
                  units. Each new round restores all energy and resets Escape to 0%.
                </p>
              </div>
            </section>
          </div>
        </div>
      </dialog>
    </main>
  )
}
