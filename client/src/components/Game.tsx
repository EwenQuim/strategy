import { useRef, useState, useSyncExternalStore } from 'react'
import { useGame, type GameOptions, type OnlineSession } from '../api/useGame'
import * as common from '../i18n/common'
import * as m from '../i18n/game'
import type { PlayerNames } from '../lib/game-mode'
import { DEFAULT_BOT_CONFIG } from '../bots/catalog'
import { battleControl } from '../bots/participants'
import { possessiveArmyLabels, playerNames } from '../army-labels'
import { campaignUnlocks, type Campaign } from '../campaign'
import {
  subscribeCampaignProgress,
  campaignProgressSaved,
  clearedAtStart,
} from '../campaignProgress'
import { useFreshAchievements } from '../achievementProgress'
import { Battlefield } from './Battlefield'
import { CombatFeedback } from './CombatFeedback'
import { GameHeader } from './GameHeader'
import { AchievementToast } from './AchievementToast'
import { UnitUnlockToast } from './UnitUnlockToast'
import { GameResult } from './GameResult'
import { GameCommandDeck } from './GameCommandDeck'
import { GameHelpDialog } from './GameHelpDialog'
import { useCommanding } from './useCommanding'
import { pounceLanding } from '../lib/tileChoices'
import { useGameShortcuts } from './useGameShortcuts'
import {
  activePawn,
  BIOMES,
  sameHex,
  key,
  type GameState,
  type Pawn,
  type Side,
  type Tile,
} from '../lib/engine'

function resolveWinnerLabel(
  winner: GameState['winner'],
  campaignComplete: boolean,
  versus: boolean,
  names: PlayerNames,
) {
  if (winner === 'draw') return m.draw
  if (campaignComplete && winner === 'player') return common.campaignComplete
  return winner && versus ? m.wins(names[winner]) : null
}

function isViewerTurn(
  pawn: Pawn | undefined,
  local: boolean,
  online: boolean,
  viewerSide: Side | undefined,
  automated: boolean,
): pawn is Pawn {
  return (
    !!pawn &&
    !automated &&
    (online ? pawn.side === viewerSide : local || pawn.side === 'player')
  )
}

export function Game({
  seed,
  mode,
  paused,
  setup,
  campaign,
  campaignLevel,
  bot = DEFAULT_BOT_CONFIG,
  sideBots,
  onVictory,
  online,
  players,
}: GameOptions & {
  campaign?: Campaign
  campaignLevel?: number
  online?: OnlineSession
  players?: PlayerNames
}) {
  const local = mode === 'local'
  const [levelAlreadyCleared] = useState(() => clearedAtStart(campaign, campaignLevel))
  const isOnline = mode === 'online'
  const { bots, spectator, viewerSide } = battleControl(mode, bot, sideBots, online?.side)
  const names = players ?? playerNames
  const labels = possessiveArmyLabels(mode, names)
  const { state, dispatch, effect, effectId, playing } = useGame({
    seed,
    mode,
    paused,
    setup,
    bot,
    sideBots,
    onVictory,
    online,
  })
  const progressSaved = useSyncExternalStore(subscribeCampaignProgress, () =>
    campaignProgressSaved(campaign?.slug ?? ''),
  )
  const freshAchievements = useFreshAchievements(
    state,
    mode,
    viewerSide,
    campaign?.achievements !== false && !spectator,
  )
  const winnerLabel = resolveWinnerLabel(
    state.winner,
    !!campaign && campaignLevel === campaign.levels.length,
    local || isOnline,
    names,
  )
  const dialog = useRef<HTMLDialogElement>(null)
  const pawn = activePawn(state)
  const viewerTurn = isViewerTurn(
    pawn,
    local,
    isOnline,
    viewerSide,
    !!pawn && !!bots[pawn.side],
  )
  const opponentActive = !!pawn && !state.winner && !viewerTurn
  // A frame still shows the pawns that die on it, so a kill is detectable from the state alone.
  const killed = state.pawns.some((unit) => unit.hp <= 0)
  const commanding = viewerTurn && !state.winner && !paused
  const canCommand = commanding && !playing
  const {
    aim,
    moveMode,
    usingSpecial,
    destination,
    choices,
    targetLabel,
    targeting,
    reach,
    hasSpecialTargets,
    commandMode,
    insight,
    setAim,
    setMoveMode,
    toggleAim,
    cycleCommand,
    commandedMove,
  } = useCommanding(state, pawn, commanding, canCommand)
  const { inspected } = insight

  const onTileClick = (tile: Tile) => {
    if (!canCommand) return
    const at = { q: tile.q, r: tile.r }
    const choice = choices.get(key(at.q, at.r))
    if (choice) {
      if (choice.kind === 'landing') return setAim(choice.nextAim)
      if (choice.kind === 'pounce') {
        const landing = pounceLanding(state, choice.target)
        if (landing) dispatch({ type: 'special', target: at, destination: landing })
        return
      }
      return dispatch(choice.action)
    }
    // Tapping the chosen landing again steps back to re-choosing it.
    if (aim && destination && key(at.q, at.r) === key(destination.q, destination.r))
      return setAim({ action: 'special' })
    // Own moves now play their effect frame, so their buzz comes from the frame like bot moves.
    if (reach.has(key(at.q, at.r))) {
      commandedMove()
      dispatch({ type: 'move', ...at })
    }
  }

  const onInspectTile = (tile: Tile) => {
    if (canCommand && pawn && sameHex(pawn, tile)) return cycleCommand()
    insight.inspectAt(tile)
  }

  useGameShortcuts({
    endTurn: () => canCommand && dispatch({ type: 'endTurn' }),
    toggleAim,
    toggleMove: () => canCommand && setMoveMode(!moveMode),
    cancel: () => setAim(null),
    help: () => dialog.current?.showModal(),
  })

  return (
    <main
      className="grid h-dvh grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-(--biome-background) text-ink"
      data-biome={state.biome}
      style={BIOMES[state.biome].theme}
    >
      {(killed || !!effect?.impacts?.length) && (
        <CombatFeedback key={effectId} killed={killed} effect={effect} />
      )}
      <GameHeader
        biome={state.biome}
        mode={mode}
        names={names}
        online={online}
        pawn={pawn}
        winner={state.winner}
        order={state.order}
        pawns={state.pawns}
        active={state.active}
        campaign={campaign}
        campaignLevel={campaignLevel}
        onHelp={() => dialog.current?.showModal()}
        onInspect={insight.inspect}
      />

      <section
        className="bg-(--biome-background) bg-[image:var(--battlefield-image,radial-gradient(ellipse_at_50%_45%,var(--biome-glow),transparent_66%),radial-gradient(#d7d8b308_1px,transparent_1px),none)] bg-[size:var(--battlefield-size,auto,8px_8px,auto)] before:pointer-events-none before:absolute before:inset-x-1/5 before:inset-y-[10%] before:-z-1 before:rounded-[50%] before:border before:border-[#c5d09c08] before:shadow-[0_0_0_50px_#c5d09c03,0_0_0_100px_#c5d09c02] relative isolate grid min-h-0 grid-rows-[auto_minmax(0,1fr)]"
        aria-label={m.battlefield}
      >
        <div
          className="flex items-center justify-center border-b border-line py-[3px] data-[mode=ability]:border-[#b9837040] data-[mode=ability]:bg-[#b9837017] data-[mode=move]:border-[#b79dce40] data-[mode=move]:bg-[#b79dce17]"
          data-testid="mode-banner"
          data-mode={commandMode.mode}
        >
          {/* The key replays the slide animation on each mode switch. */}
          <span
            key={commandMode.label}
            className="mode-banner-slide motion-reduce:animate-none text-[11px] font-semibold tracking-[0.06em] uppercase text-muted data-[mode=ability]:text-[#e0a987] data-[mode=move]:text-[#c9bce4]"
            data-mode={commandMode.mode}
          >
            {commandMode.label}
          </span>
        </div>
        <div className="flex min-h-0 items-center justify-center px-2.5 py-[3px] max-[601px]:px-[3px]">
          <Battlefield
            labels={labels}
            tiles={state.tiles}
            pawns={state.pawns}
            hellfire={state.hellfire}
            active={state.winner ? undefined : pawn}
            reach={reach}
            targets={choices}
            targetLabel={targetLabel}
            targeting={targeting}
            preview={inspected ?? destination ?? null}
            rechoose={destination}
            range={insight.range}
            effect={effect}
            effectId={effectId}
            onTileClick={onTileClick}
            onInspect={onInspectTile}
          />
        </div>
        {state.winner && (
          <GameResult
            winner={state.winner}
            viewerSide={viewerSide}
            winnerLabel={winnerLabel}
            mode={mode}
            bot={bot}
            sideBots={sideBots}
            setup={setup}
            names={names}
            campaign={campaign}
            campaignLevel={campaignLevel}
            progressSaved={progressSaved}
            onRestart={() => dispatch({ type: 'restart' })}
          />
        )}
        {state.winner && freshAchievements.length > 0 && (
          <AchievementToast achievements={freshAchievements} />
        )}
        <UnitUnlockToast
          units={campaignUnlocks(campaign, campaignLevel, levelAlreadyCleared, state.winner)}
        />
      </section>

      <GameCommandDeck
        pawn={insight.shown}
        active={pawn}
        winner={state.winner}
        winnerLabel={winnerLabel}
        canCommand={canCommand}
        opponentActive={opponentActive}
        previewed={insight.previewed}
        onPreview={insight.preview}
        onPeek={insight.peek}
        onCloseFocus={insight.close}
        usingSpecial={usingSpecial}
        hasSpecialTargets={hasSpecialTargets}
        destination={destination}
        targetCount={choices.size}
        moveMode={moveMode}
        onToggleMove={() => setMoveMode(!moveMode)}
        dispatch={dispatch}
        onAim={setAim}
      />

      <GameHelpDialog dialogRef={dialog} biome={state.biome} />
    </main>
  )
}
