import { useRef, useSyncExternalStore } from 'react'
import { useGame, type GameOptions, type OnlineSession } from '../api/useGame'
import * as common from '../i18n/common'
import * as m from '../i18n/game'
import { possessiveArmyLabels, playerNames, type PlayerNames } from '../lib/game-mode'
import type { Campaign } from '../lib/campaign'
import { subscribeCampaignProgress, campaignProgressSaved } from '../campaignProgress'
import { Battlefield } from './Battlefield'
import { GameHeader } from './GameHeader'
import { GameResult } from './GameResult'
import { GameCommandDeck } from './GameCommandDeck'
import { GameHelpDialog } from './GameHelpDialog'
import {
  activePawn,
  BIOMES,
  canAttack,
  specialTargets,
  targetingTiles,
  key,
  movementDestinations,
  type Tile,
} from '../lib/engine'

function isCampaignComplete(campaign: Campaign | undefined, campaignLevel: number | undefined) {
  return !!campaign && campaignLevel === campaign.levels.length
}

export function Game({
  seed,
  mode,
  setup,
  campaign,
  campaignLevel,
  difficulty = 'normal',
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
  const progressSaved = useSyncExternalStore(subscribeCampaignProgress, () =>
    campaignProgressSaved(campaign?.slug ?? ''),
  )
  const winnerLabel =
    state.winner === 'draw'
      ? m.draw
      : isCampaignComplete(campaign, campaignLevel) && state.winner === 'player'
        ? common.campaignComplete
        : state.winner && (local || isOnline)
          ? m.wins(names[state.winner])
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
    ? m.attack
    : (state.phase === 'special' && pawn?.special.targetLabel) ||
      (pawn?.special.name ?? m.special)

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
        onHelp={() => dialog.current?.showModal()}
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
            preview={state.chargeDestination}
            effect={effect}
            effectId={effectId}
            onTileClick={onTileClick}
          />
        </div>
        {state.winner && (
          <GameResult
            winner={state.winner}
            winnerLabel={winnerLabel}
            mode={mode}
            difficulty={difficulty}
            setup={setup}
            names={names}
            campaign={campaign}
            campaignLevel={campaignLevel}
            progressSaved={progressSaved}
            onRestart={() => dispatch({ type: 'restart' })}
          />
        )}
      </section>

      <GameCommandDeck
        pawn={pawn}
        winner={state.winner}
        winnerLabel={winnerLabel}
        myTurn={myTurn}
        attacking={attacking}
        usingSpecial={usingSpecial}
        hasFoes={hasFoes}
        hasSpecialTargets={hasSpecialTargets}
        phase={state.phase}
        targetCount={targets.size}
        dispatch={dispatch}
      />

      <GameHelpDialog
        dialogRef={dialog}
        mode={mode}
        difficulty={difficulty}
        setup={setup}
        biome={state.biome}
        campaignLevel={campaignLevel}
      />
    </main>
  )
}
