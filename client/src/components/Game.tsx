import { buttonClassName, iconButtonClassName } from './styles'
import { Link } from '@tanstack/react-router'
import { useRef, useSyncExternalStore } from 'react'
import { useGame, type GameOptions, type OnlineSession } from '../api/useGame'
import { possessiveArmyLabels, playerNames, type PlayerNames } from '../lib/game-mode'
import { CAMPAIGN_LEVELS } from '../lib/campaign'
import { subscribeCampaignProgress, campaignProgressSaved } from '../campaignProgress'
import { Battlefield } from './Battlefield'
import { BattleNotifications } from './BattleNotifications'
import { Icon, PawnIcon } from './Icon'
import {
  activePawn,
  BIOMES,
  TILE_FEATURES,
  PAWN_CLASSES,
  canAttack,
  canUseSpecial,
  specialTargets,
  targetingTiles,
  ESCAPE_BONUS,
  MAX_ESCAPE,
  key,
  movementDestinations,
  type Tile,
} from '../lib/engine'

const resultButtonClassName =
  buttonClassName +
  ' mt-5 min-h-[46px] [@media(max-height:650px)]:mt-3 justify-center gap-[30px] border-[#e5d19a] bg-[#d8c38a] px-[25px] text-[#24392a] hover:bg-[#ecdaa3]'

const actionButtonClassName =
  'grid min-h-16 grid-cols-[auto_1fr] items-center gap-x-2.5 rounded-[9px] border px-4 py-3 text-left [&:enabled:hover]:border-[#bcc8a670] [&:enabled:hover]:bg-[#ffffff0c] max-[601px]:min-h-[76px] max-[601px]:grid-cols-1 max-[601px]:justify-items-center max-[601px]:gap-y-[3px] max-[601px]:rounded-lg max-[601px]:px-0.5 max-[601px]:pt-[9px] max-[601px]:pb-2 max-[601px]:text-center [@media(max-height:650px)]:min-h-[65px] [@media(max-height:650px)]:py-1.5 [@media(min-width:600px)_and_(max-height:480px)]:min-h-12 [@media(min-width:600px)_and_(max-height:480px)]:px-3 [@media(min-width:600px)_and_(max-height:480px)]:py-1.5'

const classes = Object.values(PAWN_CLASSES).map((Unit) => new Unit(0, 0, 0, 'player'))

export function Game({
  seed,
  mode,
  setup,
  campaignLevel,
  difficulty = 'normal',
  onVictory,
  online,
  players,
}: GameOptions & { campaignLevel?: number; online?: OnlineSession; players?: PlayerNames }) {
  const local = mode === 'local'
  const isOnline = mode === 'online'
  const names = players ?? playerNames
  const labels = possessiveArmyLabels(mode, names)
  const { state, dispatch, effect, effectId, playing } = useGame({
    seed,
    mode,
    setup,
    difficulty,
    onVictory,
    online,
  })
  const progressSaved = useSyncExternalStore(subscribeCampaignProgress, campaignProgressSaved)
  const winnerLabel =
    state.winner === 'draw'
      ? 'Draw'
      : campaignLevel === CAMPAIGN_LEVELS.length && state.winner === 'player'
        ? 'Campaign complete!'
        : state.winner && (local || isOnline)
          ? names[state.winner] + ' wins!'
          : null
  const dialog = useRef<HTMLDialogElement>(null)
  const pawn = activePawn(state)
  const hasSpecialTargets = !!pawn && specialTargets(state.pawns, pawn).length > 0
  const hasFoes =
    !!pawn &&
    state.pawns.some((target) => canAttack(pawn, target, state.tiles.get(key(pawn.q, pawn.r))))
  const myTurn =
    !!pawn &&
    (isOnline ? pawn.side === online?.side : local || pawn.side === 'player') &&
    !state.winner &&
    !playing
  const attacking = myTurn && state.phase === 'attack'
  const usingSpecial = myTurn && (state.phase === 'special' || state.phase === 'charge')
  const targets = targetingTiles(state)
  const targetLabel = attacking
    ? 'Attack'
    : (state.phase === 'special' && pawn?.special.targetLabel) ||
      (pawn?.special.name ?? 'Special')
  const turnOrder = state.order.flatMap((id, index) => {
    const unit = state.pawns.find((p) => p.id === id)
    return unit ? [{ unit, index }] : []
  })

  const reach =
    myTurn && pawn.energy > 0 && state.phase === 'move'
      ? movementDestinations(state.tiles, state.pawns, pawn)
      : new Map<string, number>()

  const onTileClick = (tile: Tile) => {
    if (!myTurn) return
    if (targets.has(key(tile.q, tile.r)))
      return dispatch({ type: attacking ? 'attackAt' : 'specialAt', q: tile.q, r: tile.r })
    if (reach.has(key(tile.q, tile.r))) dispatch({ type: 'move', q: tile.q, r: tile.r })
  }

  return (
    <main
      className="grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-(--biome-background) text-ink"
      data-biome={state.biome}
      style={BIOMES[state.biome].theme}
    >
      {!!effect?.impacts?.length && (
        <div
          key={effectId}
          data-testid="combat-feedback"
          className={
            'pointer-events-none fixed inset-0 z-4 overflow-hidden before:absolute before:inset-0 motion-reduce:hidden ' +
            (effect.impacts.some((hit) => hit.damage > 0)
              ? 'combat-feedback--hit before:bg-[radial-gradient(ellipse,transparent_45%,#ffc07966)]'
              : 'combat-feedback--miss before:bg-[linear-gradient(110deg,transparent_35%,#bce6f433_50%,transparent_65%)]')
          }
          aria-hidden="true"
        />
      )}
      <header
        className="relative z-2 bg-(--biome-panel) px-[max(16px,env(safe-area-inset-left))] pt-[max(8px,env(safe-area-inset-top))] shadow-[0_8px_30px_#0a1e1a22] min-[900px]:pt-[max(13px,env(safe-area-inset-top))] max-[601px]:px-4 max-[360px]:px-3 [@media(min-width:600px)_and_(max-height:480px)]:pt-[3px]"
        data-testid="game-header"
      >
        <div className="m-auto flex min-h-[50px] max-w-[1040px] items-center justify-between min-[900px]:min-h-[53px] [@media(max-height:650px)]:min-h-[43px] [@media(min-width:600px)_and_(max-height:480px)]:min-h-[42px]">
          <Link
            to={campaignLevel ? '/campaign' : isOnline ? '/online' : '/'}
            className="flex items-center gap-2.5 font-display text-[23px] leading-none tracking-[0.15em] min-[900px]:text-[26px]"
            aria-label={
              campaignLevel ? 'Campaign levels' : isOnline ? 'Online lobby' : 'Hexmate home'
            }
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
          {state.hellfire.length > 0 && !state.winner && (
            <span
              className="px-2 text-center text-[10px] leading-snug text-gold"
              data-testid="hellfire-cue"
              data-hellfire-round={state.round}
              role="status"
              aria-label={
                'Round ' +
                state.round +
                '. Hellfire: hatched tiles take 1 unavoidable damage at round end. Warnings stay fixed for the full round.'
              }
            >
              Hellfire / Round {state.round}
              <span className="block text-[9px] text-muted">1 damage at round end</span>
            </span>
          )}
          <div className="flex gap-0">
            {(local || isOnline) && pawn && !state.winner && (
              <span
                className="mr-2.5 self-center text-[10px] text-[#d69b81] data-[side=player]:text-[#b6d2b5]"
                data-testid="player-turn"
                data-side={pawn.side}
                role="status"
              >
                {isOnline && pawn.side === online?.side
                  ? 'Your turn'
                  : names[pawn.side] + ' turn'}
              </span>
            )}
            {mode === 'ai' && playing && pawn?.side === 'enemy' && (
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
        <div className="m-auto flex min-h-[41px] max-w-[1040px] items-center gap-3 border-t border-line min-[900px]:min-h-[43px] max-[601px]:gap-2 [@media(max-height:650px)]:min-h-[34px] [@media(min-width:600px)_and_(max-height:480px)]:hidden">
          <ol
            className="m-0 flex min-w-0 flex-1 list-none gap-[5px] overflow-x-auto p-0 [scrollbar-width:thin] max-[601px]:gap-[3px]"
            aria-label="Round turn order"
          >
            {turnOrder.map(({ unit, index }) => (
              <li
                key={unit.id}
                className="flex min-w-6 flex-1 items-center justify-center gap-1 rounded-[5px] border border-transparent px-[5px] py-1 text-[8px] text-[#b6d2b5] data-[side=enemy]:not-aria-[current=step]:text-[#d69b81] data-[acted=true]:opacity-35 aria-[current=step]:border-[#d7c78a66] aria-[current=step]:bg-[#d7c78a14] aria-[current=step]:text-[#ead99e] [&>svg]:size-3.5 min-[900px]:px-[9px] max-[601px]:flex-col max-[601px]:gap-0 max-[601px]:px-0.5 max-[601px]:py-[3px] max-[601px]:[&>svg]:size-3"
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
        className="bg-(--biome-background) bg-[image:var(--battlefield-image,radial-gradient(ellipse_at_50%_45%,var(--biome-glow),transparent_66%),radial-gradient(#d7d8b308_1px,transparent_1px),none)] bg-[size:var(--battlefield-size,auto,8px_8px,auto)] before:pointer-events-none before:absolute before:inset-x-1/5 before:inset-y-[10%] before:-z-1 before:rounded-[50%] before:border before:border-[#c5d09c08] before:shadow-[0_0_0_50px_#c5d09c03,0_0_0_100px_#c5d09c02] relative isolate grid min-h-0 grid-rows-[minmax(0,1fr)]"
        aria-label="The battlefield"
      >
        <div className="flex min-h-0 items-center justify-center px-2.5 py-[3px] max-[601px]:px-[3px]">
          <Battlefield
            labels={labels}
            tiles={state.tiles}
            pawns={state.pawns}
            hellfire={state.hellfire}
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
        <BattleNotifications
          log={state.log}
          logCount={state.logCount}
          mode={mode}
          names={names}
        />
        {state.winner && (
          <div
            className="absolute inset-0 grid place-items-center bg-[var(--result-scrim,#14281eab)] p-4 backdrop-blur-[5px]"
            data-testid="battle-result"
            role="status"
          >
            <div
              className="max-w-[390px] rounded-2xl border border-[#dcc48a59] bg-[var(--result-panel,#20362bee)] p-7 text-center shadow-[0_20px_60px_#07180f80] [&_h1]:mt-2 [&_h1]:mb-3 [&_h1]:font-serif [&_h1]:text-[32px] [&_h1]:leading-[normal] [&_p]:text-[12px] [&_p]:leading-[1.7] [&_p]:text-[#bfccb4] [@media(max-height:650px)]:px-5 [@media(max-height:650px)]:py-4 [@media(max-height:650px)]:[&_h1]:text-[25px]"
              data-testid="result-card"
            >
              <div className="mx-auto mb-4 grid size-13 place-items-center rounded-full border border-[#dcc48a40] text-gold [&>svg]:size-[29px] [@media(max-height:650px)]:hidden">
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
                {state.winner === 'draw'
                  ? 'Both kings have fallen. Neither army wins.'
                  : local || isOnline
                    ? labels[state.winner === 'player' ? 'enemy' : 'player'] +
                      ' king has fallen.'
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
                        className={resultButtonClassName}
                        preload={false}
                      >
                        Next level
                        <Icon name="arrow" />
                      </Link>
                    ) : (
                      <Link to="/campaign" className={resultButtonClassName}>
                        Back to campaign
                      </Link>
                    )
                  ) : (
                    <button
                      className={resultButtonClassName}
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
              ) : isOnline ? (
                <Link to="/online" className={resultButtonClassName} preload={false}>
                  New online game
                  <Icon name="arrow" />
                </Link>
              ) : (
                <Link
                  to="/game"
                  search={{
                    mode,
                    difficulty,
                    setup: setup?.map === undefined ? setup : undefined,
                  }}
                  className={resultButtonClassName}
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
        <div className="m-auto max-w-[920px] px-[18px] pt-3.5 pb-2.5 min-[900px]:pt-[17px] min-[900px]:pb-3 max-[601px]:px-3.5 max-[601px]:pt-3 max-[601px]:pb-[9px] max-[360px]:px-2.5 [@media(max-height:650px)]:pt-2 [@media(max-height:650px)]:pb-1.5 [@media(min-width:600px)_and_(max-height:480px)]:flex [@media(min-width:600px)_and_(max-height:480px)]:items-center [@media(min-width:600px)_and_(max-height:480px)]:gap-5 [@media(min-width:600px)_and_(max-height:480px)]:px-[18px] [@media(min-width:600px)_and_(max-height:480px)]:py-2">
          <div className="mb-3.5 flex items-center justify-between gap-[15px] min-[900px]:mb-[17px] max-[601px]:mb-3 max-[601px]:gap-2.5 [@media(max-height:650px)]:mb-2 [@media(min-width:600px)_and_(max-height:480px)]:m-0 [@media(min-width:600px)_and_(max-height:480px)]:flex-col [@media(min-width:600px)_and_(max-height:480px)]:items-start [@media(min-width:600px)_and_(max-height:480px)]:gap-1.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid h-[46px] w-[42px] shrink-0 place-items-center rounded-[10px_10px_16px_16px] border border-[#c4d1a53b] bg-[linear-gradient(135deg,#4c604038,#203d3077)] text-gold [&>svg]:size-[26px] min-[900px]:h-[49px] min-[900px]:w-[47px] max-[601px]:hidden [@media(min-width:600px)_and_(max-height:480px)]:hidden">
                <PawnIcon kind={pawn?.kind ?? 'swordsman'} />
              </div>
              <div>
                <h2 className="font-display text-[20px] leading-[normal] capitalize whitespace-nowrap min-[900px]:text-[24px] max-[601px]:text-[19px] max-[360px]:text-[16px] [@media(min-width:600px)_and_(max-height:480px)]:text-[16px]">
                  {state.winner
                    ? (winnerLabel ?? (state.winner === 'player' ? 'Victory' : 'Defeat'))
                    : (pawn?.kind ?? 'Your guard')}
                  {!state.winner && pawn && (
                    <span className="font-label text-[10px] leading-[normal] tracking-[0.05em] text-[#7f957e] max-[601px]:text-[9px] max-[360px]:hidden">
                      {' '}
                      / {pawn.id.toString().padStart(2, '0')}
                    </span>
                  )}
                </h2>
              </div>
            </div>
            {pawn && !state.winner && (
              <div
                className="flex items-center gap-[18px] min-[900px]:gap-7 max-[601px]:gap-2.5 max-[360px]:gap-2 [@media(min-width:600px)_and_(max-height:480px)]:gap-2.5"
                data-testid="unit-stats"
              >
                <div className="w-[60px] min-w-[60px] min-[900px]:w-[83px] min-[900px]:min-w-[83px] max-[601px]:w-[49px] max-[601px]:min-w-[49px] [@media(min-width:600px)_and_(max-height:480px)]:w-[45px] [@media(min-width:600px)_and_(max-height:480px)]:min-w-[45px]">
                  <span className="flex justify-between gap-2.5 text-[9px] text-muted max-[601px]:gap-[5px] max-[601px]:text-[8px]">
                    Health{' '}
                    <b className="text-[9px] font-medium text-[#d9dfc9] max-[601px]:text-[8px]">
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
                        className="h-[5px] min-w-0 flex-1 rounded-[1px] bg-[#34483a] data-[filled=true]:bg-[#b7c9a0] max-[601px]:h-1"
                      />
                    ))}
                  </div>
                </div>
                <div className="w-[60px] min-w-[60px] min-[900px]:w-[83px] min-[900px]:min-w-[83px] max-[601px]:w-[49px] max-[601px]:min-w-[49px] [@media(min-width:600px)_and_(max-height:480px)]:w-[45px] [@media(min-width:600px)_and_(max-height:480px)]:min-w-[45px]">
                  <span className="flex justify-between gap-2.5 text-[9px] text-muted max-[601px]:gap-[5px] max-[601px]:text-[8px]">
                    Energy{pawn.bonusEnergy ? ' +' + pawn.bonusEnergy : ''}{' '}
                    <b className="text-[9px] font-medium text-[#d9dfc9] max-[601px]:text-[8px]">
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
                        className="h-[5px] min-w-0 flex-1 rounded-[1px] bg-[#34483a] data-[filled=true]:bg-[#d4bb7b] max-[601px]:h-1"
                      />
                    ))}
                  </div>
                </div>
                <div className="w-[60px] min-w-[43px] min-[900px]:w-[83px] min-[900px]:min-w-[83px] max-[601px]:w-[49px] max-[601px]:min-w-[41px] [@media(min-width:600px)_and_(max-height:480px)]:w-[45px] [@media(min-width:600px)_and_(max-height:480px)]:min-w-[45px] border-l border-line pl-3.5 [&_svg]:size-[15px] [&_small]:-ml-[3px] [&_small]:text-[10px] max-[601px]:pl-2 max-[601px]:[&_svg]:hidden [@media(min-width:600px)_and_(max-height:480px)]:pl-2">
                  <span className="flex justify-between gap-2.5 text-[9px] text-muted max-[601px]:gap-[5px] max-[601px]:text-[8px]">
                    Escape
                  </span>
                  <strong className="mt-0.5 flex items-center gap-1 text-[18px] leading-none font-medium text-[#bad0bb] max-[601px]:text-[17px]">
                    <Icon name="escape" />
                    {pawn.escapeChance}
                    <small>%</small>
                  </strong>
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 min-[900px]:gap-3 max-[601px]:gap-1.5 [@media(min-width:600px)_and_(max-height:480px)]:flex-1">
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
                className="row-span-2 size-[22px] max-[601px]:row-auto max-[601px]:mb-0.5 max-[601px]:size-5"
                name={attacking ? 'close' : 'sword'}
              />
              <span className="text-[13px] font-semibold whitespace-nowrap max-[601px]:text-[11px] max-[360px]:text-[10px] [@media(min-width:600px)_and_(max-height:480px)]:text-[11px]">
                {attacking ? 'Cancel' : 'Attack'}
              </span>
              <small className="mt-0.5 block text-[9px] max-[601px]:mt-0 max-[601px]:text-[8px] text-[#b5a997]">
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
                (!!pawn.special.noTargets && !hasSpecialTargets)
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
                className="row-span-2 size-[22px] max-[601px]:row-auto max-[601px]:mb-0.5 max-[601px]:size-5"
                name={usingSpecial ? 'close' : 'spark'}
              />
              <span className="text-[13px] font-semibold whitespace-nowrap max-[601px]:text-[11px] max-[360px]:text-[10px] [@media(min-width:600px)_and_(max-height:480px)]:text-[11px]">
                {usingSpecial ? 'Cancel' : (pawn?.special.name ?? 'Special')}
              </span>
              <small className="mt-0.5 block text-[9px] text-[#a1b29b] max-[601px]:mt-0 max-[601px]:text-[8px]">
                {usingSpecial
                  ? !targets.size
                    ? 'No targets'
                    : state.phase === 'charge'
                      ? 'Choose enemy'
                      : (pawn?.special.prompt ?? 'Choose enemy')
                  : pawn?.special.oncePerRound && pawn.specialUsed
                    ? 'Used this round'
                    : pawn?.special.noTargets && !hasSpecialTargets
                      ? pawn.special.noTargets
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
                className="row-span-2 size-[22px] max-[601px]:row-auto max-[601px]:mb-0.5 max-[601px]:size-5"
                name="escape"
              />
              <span className="text-[13px] font-semibold whitespace-nowrap max-[601px]:text-[11px] max-[360px]:text-[10px] [@media(min-width:600px)_and_(max-height:480px)]:text-[11px]">
                End turn
              </span>
              <small className="mt-0.5 block text-[9px] text-[#a1b29b] max-[601px]:mt-0 max-[601px]:text-[8px]">
                +{pawn ? pawn.endTurnEscapeChance - pawn.escapeChance : 0}% escape
              </small>
            </button>
          </div>
        </div>
      </footer>

      <dialog
        ref={dialog}
        className="fixed inset-0 m-auto max-h-[min(720px,calc(100dvh-40px))] w-[min(520px,calc(100vw-28px))] rounded-2xl border border-[#d1cf9b40] bg-[var(--biome-panel,#20362b)] p-0 text-ink shadow-[0_25px_90px_#07180f99] backdrop:bg-[#091910b8] backdrop:backdrop-blur-[7px]"
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
                : Object.values(BIOMES)
                    .map((biome) => biome.name + ' has ' + biome.description + '.')
                    .join(' ')}
            </p>
            <section>
              <Icon name="energy" />
              <div>
                <h3 className="mb-1 text-[13px] font-semibold text-ink">
                  Three energy. Every round.
                </h3>
                <p>
                  Each unit starts with 3 energy. The lit unit is yours to command. Moving costs
                  1 energy per tile; a Bulwark pays 2 for its first tile and 1 after. Numbers
                  show the full cost. Mountains and lakes block walking and Charge. Arrows and
                  magic pass over them.
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
                {state.biome === 'hell' && (
                  <p>
                    Hellfire warnings stay fixed for the full round. At round end, units on
                    hatched tiles take 1 damage, ignoring Escape and Protect. Move clear before
                    the last unit finishes. If both kings fall, the battle is a draw.
                  </p>
                )}
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
                    : isOnline
                      ? 'You play against a real opponent online. Only your own units answer to you; wait while the opponent acts. Moves sync every few seconds.'
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
