import { useRef, useState, useSyncExternalStore } from 'react'
import { useGame, type GameOptions, type OnlineSession } from '../api/useGame'
import { hapticMove } from '../haptics'
import * as common from '../i18n/common'
import * as m from '../i18n/game'
import { specialTexts } from '../i18n/specialTexts'
import type { PlayerNames } from '../lib/game-mode'
import { DEFAULT_BOT_CONFIG } from '../bots/catalog'
import { possessiveArmyLabels, playerNames } from '../army-labels'
import type { Campaign } from '../lib/campaign'
import {
  subscribeCampaignProgress,
  campaignProgressSaved,
  readClearedLevels,
} from '../campaignProgress'
import { useFreshAchievements } from '../achievementProgress'
import { Battlefield, type Targeting } from './Battlefield'
import { GameHeader } from './GameHeader'
import { AchievementToast } from './AchievementToast'
import { UnitUnlockToast } from './UnitUnlockToast'
import { GameResult } from './GameResult'
import { GameCommandDeck } from './GameCommandDeck'
import { GameHelpDialog } from './GameHelpDialog'
import { useInspection } from './useInspection'
import {
  activePawn,
  BIOMES,
  specialTargetingTiles,
  targetingTiles,
  key,
  movementDestinations,
  type Aim,
  type GameState,
  type Pawn,
  type Tile,
} from '../lib/engine'

function isCampaignComplete(campaign: Campaign | undefined, campaignLevel: number | undefined) {
  return !!campaign && campaignLevel === campaign.levels.length
}

function campaignUnlocks(
  campaign: Campaign | undefined,
  level: number | undefined,
  alreadyCleared: boolean,
  winner: GameState['winner'],
) {
  return winner === 'player' &&
    campaign &&
    campaign.unlockToasts !== false &&
    level &&
    !alreadyCleared
    ? campaign.levels[level - 1].unlocks
    : []
}

function clearedAtStart(campaign: Campaign | undefined, level: number | undefined) {
  return !!campaign && !!level && readClearedLevels(campaign.slug).includes(level)
}

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

export function Game({
  seed,
  mode,
  paused,
  setup,
  campaign,
  campaignLevel,
  bot = DEFAULT_BOT_CONFIG,
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
  const viewerSide = online?.side
  const names = players ?? playerNames
  const labels = possessiveArmyLabels(mode, names)
  const { state, dispatch, effect, effectId, playing } = useGame({
    seed,
    mode,
    paused,
    setup,
    bot,
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
    campaign?.achievements !== false,
  )
  const winnerLabel = resolveWinnerLabel(
    state.winner,
    isCampaignComplete(campaign, campaignLevel),
    local || isOnline,
    names,
  )
  const dialog = useRef<HTMLDialogElement>(null)
  const pawn = activePawn(state)
  const hasSpecialTargets =
    !!pawn && specialTargetingTiles(pawn, state.tiles, state.pawns).size > 0
  const myTurn =
    !!pawn &&
    (isOnline ? pawn.side === viewerSide : local || pawn.side === 'player') &&
    !state.winner &&
    !paused &&
    !playing
  // Aiming belongs to the state it started on: any new state, ours or not, drops it.
  const [aiming, setAiming] = useState<{ state: GameState; aim: Aim } | null>(null)
  const aim = myTurn && aiming?.state === state ? aiming.aim : null
  const insight = useInspection(state, viewerSide, local)
  const { inspected } = insight
  const setAim = (next: Aim | null) => {
    insight.close()
    setAiming(next && { state, aim: next })
  }
  const usingSpecial = aim?.action === 'special'
  const destination = usingSpecial ? aim.destination : undefined
  const targets = aim && !inspected ? targetingTiles(state, aim) : new Set<string>()
  const targetLabel = resolveTargetLabel(aim, pawn)
  const targeting = resolveTargeting(usingSpecial, pawn, !!destination)

  const reach =
    myTurn && pawn.energy > 0 && !aim && !inspected
      ? movementDestinations(state.tiles, state.pawns, pawn)
      : new Map<string, number>()

  const onTileClick = (tile: Tile) => {
    if (!myTurn) return
    const at = { q: tile.q, r: tile.r }
    if (aim && targets.has(key(at.q, at.r))) {
      if (pawn.special.choosesDestination && !destination)
        return setAim({ action: 'special', destination: at })
      return dispatch({ type: 'special', target: at, destination })
    }
    // Own moves produce no effect frame in any mode, so they buzz at dispatch; bot moves buzz from their frames.
    if (reach.has(key(at.q, at.r))) {
      hapticMove()
      dispatch({ type: 'move', ...at })
    }
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
      <GameHeader
        biome={state.biome}
        mode={mode}
        names={names}
        online={online}
        pawn={pawn}
        winner={state.winner}
        playing={playing}
        order={state.order}
        pawns={state.pawns}
        active={state.active}
        campaign={campaign}
        campaignLevel={campaignLevel}
        threatsShown={insight.threatsShown}
        onHelp={() => dialog.current?.showModal()}
        onToggleThreats={insight.toggleThreats}
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
            targets={targets}
            targetLabel={targetLabel}
            targeting={targeting}
            preview={inspected ?? destination ?? null}
            range={insight.range}
            threats={insight.threats}
            effect={effect}
            effectId={effectId}
            onTileClick={onTileClick}
            onInspect={insight.inspectAt}
          />
        </div>
        {state.winner && (
          <GameResult
            winner={state.winner}
            viewerSide={viewerSide}
            winnerLabel={winnerLabel}
            mode={mode}
            bot={bot}
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
        myTurn={myTurn}
        commanding={myTurn && !inspected}
        previewed={insight.previewed}
        onPreview={insight.preview}
        onPeek={insight.peek}
        usingSpecial={usingSpecial}
        hasSpecialTargets={hasSpecialTargets}
        choosingTarget={!!destination}
        targetCount={targets.size}
        dispatch={dispatch}
        onAim={setAim}
      />

      <GameHelpDialog
        dialogRef={dialog}
        mode={mode}
        bot={bot}
        setup={setup}
        biome={state.biome}
        campaignLevel={campaignLevel}
      />
    </main>
  )
}
