import { useRef, useState, useSyncExternalStore } from 'react'
import { useGame, type GameOptions, type OnlineSession } from '../api/useGame'
import * as common from '../i18n/common'
import * as m from '../i18n/game'
import { specialTexts, unitNames } from '../i18n/units'
import type { PlayerNames } from '../lib/game-mode'
import { possessiveArmyLabels, playerNames } from '../army-labels'
import type { Campaign } from '../lib/campaign'
import { subscribeCampaignProgress, campaignProgressSaved } from '../campaignProgress'
import { useFreshAchievements } from '../achievementProgress'
import { Battlefield, type Targeting } from './Battlefield'
import { GameHeader } from './GameHeader'
import { GameResult } from './GameResult'
import { GameCommandDeck } from './GameCommandDeck'
import { GameHelpDialog } from './GameHelpDialog'
import { PawnIcon } from './Icon'
import {
  activePawn,
  BIOMES,
  canAttack,
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

function resolveTargetLabel(aim: Aim | null, pawn: Pawn | undefined) {
  if (aim?.action === 'attack') return m.attack
  if (aim?.action === 'special' && !aim.destination && pawn?.special.targetLabel)
    return specialTexts[pawn.special.targetLabel]
  return pawn ? specialTexts[pawn.special.name] : m.special
}

function resolveTargeting(
  attacking: boolean,
  usingSpecial: boolean,
  pawn: Pawn | undefined,
): Targeting {
  if (attacking) return 'attack'
  if (usingSpecial && pawn?.special.name === 'charge') return 'charge'
  if (usingSpecial && pawn?.special.name === 'jump') return 'jump'
  return 'special'
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
  const viewerSide = online?.side
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
  const freshAchievements = useFreshAchievements(state, mode, viewerSide)
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
  const hasSpecialTargets =
    !!pawn && specialTargetingTiles(pawn, state.tiles, state.pawns).size > 0
  const hasFoes =
    !!pawn &&
    state.pawns.some((target) => canAttack(pawn, target, state.tiles.get(key(pawn.q, pawn.r))))
  const myTurn =
    !!pawn &&
    (isOnline ? pawn.side === viewerSide : local || pawn.side === 'player') &&
    !state.winner &&
    !playing
  // Aiming belongs to the state it started on: any new state, ours or not, drops it.
  const [aiming, setAiming] = useState<{ state: GameState; aim: Aim } | null>(null)
  const aim = myTurn && aiming?.state === state ? aiming.aim : null
  const setAim = (next: Aim | null) => setAiming(next && { state, aim: next })
  const attacking = aim?.action === 'attack'
  const usingSpecial = aim?.action === 'special'
  const destination = usingSpecial ? aim.destination : undefined
  const targets = aim ? targetingTiles(state, aim) : new Set<string>()
  const targetLabel = resolveTargetLabel(aim, pawn)
  const targeting = resolveTargeting(attacking, usingSpecial, pawn)

  const reach =
    myTurn && pawn.energy > 0 && !aim
      ? movementDestinations(state.tiles, state.pawns, pawn)
      : new Map<string, number>()

  const onTileClick = (tile: Tile) => {
    if (!myTurn) return
    const at = { q: tile.q, r: tile.r }
    if (aim && targets.has(key(at.q, at.r))) {
      if (aim.action === 'attack') return dispatch({ type: 'attack', ...at })
      if (pawn.special.choosesDestination && !destination)
        return setAim({ action: 'special', destination: at })
      return dispatch({ type: 'special', target: at, destination })
    }
    if (reach.has(key(at.q, at.r))) dispatch({ type: 'move', ...at })
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
            targeting={targeting}
            preview={destination ?? null}
            effect={effect}
            effectId={effectId}
            onTileClick={onTileClick}
          />
        </div>
        {myTurn && (
          <div
            key={pawn.id}
            data-testid="turn-banner"
            className="turn-banner pointer-events-none absolute top-4 left-1/2 z-3 flex -translate-x-1/2 items-center gap-3 rounded-[12px] border border-[#dcc48a59] bg-[linear-gradient(150deg,#2c4a3be6,#14291ff0)] py-2 pr-5 pl-2 whitespace-nowrap shadow-[0_10px_30px_#0a211b80,inset_0_1px_0_#f2df9e1f] backdrop-blur-[4px] max-[601px]:top-2 max-[601px]:gap-2.5 max-[601px]:py-1.5 max-[601px]:pr-4"
          >
            <span className="grid size-9 place-items-center rounded-full border border-[#dcc48a4a] bg-[radial-gradient(circle,#dcc48a1f,transparent_70%)] text-gold [&>svg]:size-5 max-[601px]:size-8 max-[601px]:[&>svg]:size-[18px]">
              <PawnIcon kind={pawn.kind} />
            </span>
            <span className="grid gap-0.5">
              <span className="font-label text-[8px] leading-none tracking-[0.29em] text-[#dcc48aa6] uppercase">
                {m.yourTurn}
              </span>
              <span className="font-display text-[18px] leading-none text-ink max-[601px]:text-[16px]">
                {unitNames[pawn.kind]}
                <span className="font-label text-[10px] tracking-[0.05em] text-[#7f957e]">
                  {' '}
                  / {pawn.id.toString().padStart(2, '0')}
                </span>
              </span>
            </span>
          </div>
        )}
        {state.winner && (
          <GameResult
            winner={state.winner}
            viewerSide={viewerSide}
            winnerLabel={winnerLabel}
            mode={mode}
            difficulty={difficulty}
            setup={setup}
            names={names}
            campaign={campaign}
            campaignLevel={campaignLevel}
            progressSaved={progressSaved}
            achievements={freshAchievements}
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
        choosingTarget={!!destination}
        targetCount={targets.size}
        dispatch={dispatch}
        onAim={setAim}
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
