import { useRef, useState, useSyncExternalStore } from 'react'
import { useGame, type GameOptions, type OnlineSession } from '../api/useGame'
import { hapticMove } from '../haptics'
import * as common from '../i18n/common'
import * as m from '../i18n/game'
import { specialTexts } from '../i18n/specialTexts'
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
import { useInspection } from './useInspection'
import { useGameShortcuts } from './useGameShortcuts'
import { tileChoices, type TileChoice, type Targeting } from '../lib/tileChoices'
import {
  activePawn,
  BIOMES,
  canUseSpecial,
  sameHex,
  specialTargetingTiles,
  key,
  movementDestinations,
  type Aim,
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

function resolveTargetLabel(aim: Aim | null, pawn: Pawn | undefined) {
  if (aim?.action === 'special' && !aim.destination && pawn?.special.targetLabel)
    return specialTexts[pawn.special.targetLabel]
  return pawn ? specialTexts[pawn.special.name] : m.special
}

function resolveTargeting(
  usingSpecial: boolean,
  pawn: Pawn | undefined,
  choosingEnemy: boolean,
): Targeting {
  if (choosingEnemy) return 'strike'
  if (usingSpecial && pawn?.special.movement === 'walk') return 'charge'
  if (usingSpecial && pawn?.special.movement === 'jump') return 'jump'
  return 'special'
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
  const hasSpecialTargets =
    !!pawn && specialTargetingTiles(pawn, state.tiles, state.pawns).size > 0
  const canCommand = viewerTurn && !state.winner && !paused && !playing
  // Aiming belongs to the state it started on: any new state, ours or not, drops it.
  const [aiming, setAiming] = useState<{ state: GameState; aim: Aim } | null>(null)
  const aim = canCommand && aiming?.state === state ? aiming.aim : null
  const insight = useInspection(state, !!aim)
  const { inspected } = insight
  const setAim = (next: Aim | null) => {
    insight.close()
    setAiming(next && { state, aim: next })
  }
  const usingSpecial = aim?.action === 'special'
  const destination = usingSpecial ? aim.destination : undefined
  const choices = aim ? tileChoices(state, aim) : new Map<string, TileChoice>()
  const targetLabel = resolveTargetLabel(aim, pawn)
  const targeting = resolveTargeting(usingSpecial, pawn, !!destination)

  const reach =
    canCommand && pawn.energy > 0 && !aim && !inspected
      ? movementDestinations(state.tiles, state.pawns, pawn)
      : new Map<string, number>()

  const onTileClick = (tile: Tile) => {
    if (!canCommand) return
    const at = { q: tile.q, r: tile.r }
    const choice = choices.get(key(at.q, at.r))
    if (choice)
      return choice.kind === 'landing' ? setAim(choice.nextAim) : dispatch(choice.action)
    // Tapping the chosen landing again steps back to re-choosing it.
    if (aim && destination && key(at.q, at.r) === key(destination.q, destination.r))
      return setAim({ action: 'special' })
    // Own moves produce no effect frame in any mode, so they buzz at dispatch; bot moves buzz from their frames.
    if (reach.has(key(at.q, at.r))) {
      hapticMove()
      dispatch({ type: 'move', ...at })
    }
  }

  // Tapping the active character or pressing A toggles between moving and attacking, never previewing.
  const toggleAim = () => {
    if (!canCommand || !pawn) return
    if (aim) setAim(null)
    else if (canUseSpecial(pawn) && hasSpecialTargets) setAim({ action: 'special' })
  }

  const onInspectTile = (tile: Tile) => {
    if (canCommand && pawn && sameHex(pawn, tile)) return toggleAim()
    insight.inspectAt(tile)
  }

  useGameShortcuts({
    endTurn: () => canCommand && dispatch({ type: 'endTurn' }),
    toggleAim,
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
        className="bg-(--biome-background) bg-[image:var(--battlefield-image,radial-gradient(ellipse_at_50%_45%,var(--biome-glow),transparent_66%),radial-gradient(#d7d8b308_1px,transparent_1px),none)] bg-[size:var(--battlefield-size,auto,8px_8px,auto)] before:pointer-events-none before:absolute before:inset-x-1/5 before:inset-y-[10%] before:-z-1 before:rounded-[50%] before:border before:border-[#c5d09c08] before:shadow-[0_0_0_50px_#c5d09c03,0_0_0_100px_#c5d09c02] relative isolate grid min-h-0 grid-rows-[minmax(0,1fr)]"
        aria-label={m.battlefield}
      >
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
        dispatch={dispatch}
        onAim={setAim}
      />

      <GameHelpDialog dialogRef={dialog} biome={state.biome} />
    </main>
  )
}
