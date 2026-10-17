import type { Action, Aim, Axial, Pawn, Side } from '../lib/engine'
import * as m from '../i18n/game'
import { specialTexts } from '../i18n/specialTexts'
import { CommandButton } from './CommandAction'
import { GameCommandSummary } from './GameCommandSummary'
import { GameSpecialButton } from './GameSpecialButton'
import { GameUnitPreview } from './GameUnitPreview'

const actionGridClassName =
  'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem] gap-2 min-[900px]:gap-3 max-[601px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem] max-[601px]:gap-1.5'

// Walking steps the active pawn's energy still pays for.
function moveSteps(pawn?: Pawn): number {
  return Math.max(0, (pawn?.energy ?? 0) - (pawn?.moveCost ?? 1) + 1)
}

interface GameCommandDeckProps {
  pawn?: Pawn
  active?: Pawn
  winner: Side | 'draw' | null
  winnerLabel: string | null
  canCommand: boolean
  opponentActive: boolean
  previewed: boolean
  onPreview: () => void
  onPeek: (shown: boolean) => void
  onCloseFocus: () => void
  usingSpecial: boolean
  hasSpecialTargets: boolean
  destination?: Axial
  targetCount: number
  moveMode: boolean
  onToggleMove: () => void
  dispatch: (action: Action) => void
  onAim: (aim: Aim | null) => void
}

export function GameCommandDeck({
  pawn,
  active,
  winner,
  winnerLabel,
  canCommand,
  opponentActive,
  previewed,
  onPreview,
  onPeek,
  onCloseFocus,
  usingSpecial,
  hasSpecialTargets,
  destination,
  targetCount,
  moveMode,
  onToggleMove,
  dispatch,
  onAim,
}: GameCommandDeckProps) {
  const showingPreview = previewed || opponentActive
  return (
    <footer
      className="relative z-2 border-t border-[#c4d1a530] bg-(--biome-panel) pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_#10201840]"
      data-testid="command-deck"
    >
      <div className="m-auto max-w-[920px] px-[18px] pt-3.5 pb-2.5 min-[900px]:pt-[17px] min-[900px]:pb-3 max-[601px]:px-3.5 max-[601px]:pt-3 max-[601px]:pb-[9px] max-[360px]:px-2.5 [@media(max-height:650px)]:pt-2 [@media(max-height:650px)]:pb-1.5 [@media(min-width:600px)_and_(max-height:480px)]:flex [@media(min-width:600px)_and_(max-height:480px)]:items-center [@media(min-width:600px)_and_(max-height:480px)]:gap-5 [@media(min-width:600px)_and_(max-height:480px)]:px-[18px] [@media(min-width:600px)_and_(max-height:480px)]:py-2">
        <GameCommandSummary pawn={pawn} winner={winner} winnerLabel={winnerLabel} />
        <div className="relative min-w-0 [@media(min-width:600px)_and_(max-height:480px)]:flex-1">
          <div
            className={actionGridClassName + ' data-[previewed=true]:invisible'}
            data-previewed={showingPreview}
            inert={showingPreview}
          >
            <CommandButton
              variant="special"
              icon="hex"
              label={m.move}
              note={specialTexts.chooseTile}
              data-action="move"
              disabled={!canCommand || moveSteps(active) < 1}
              onClick={onToggleMove}
              title={`${specialTexts.chooseTile} (M)`}
              aria-pressed={moveMode}
            />
            <GameSpecialButton
              pawn={active}
              commanding={canCommand}
              previewed={previewed}
              usingSpecial={usingSpecial}
              hasSpecialTargets={hasSpecialTargets}
              targetCount={targetCount}
              destination={destination}
              dispatch={dispatch}
              onAim={onAim}
              onPreview={onPreview}
              onPeek={onPeek}
            />
            {!opponentActive && (
              <CommandButton
                variant="compact"
                icon="arrow"
                label={m.endTurn}
                note={m.remainingEnergy(active?.energy ?? 0)}
                data-action="endTurn"
                disabled={!canCommand}
                onClick={() => dispatch({ type: 'endTurn' })}
                title={`${m.endTurnHint} (E)`}
              />
            )}
          </div>
          {showingPreview && pawn && !winner && (
            <div className={actionGridClassName + ' absolute inset-0'} data-testid="unit-focus">
              <GameUnitPreview
                pawn={pawn}
                onClose={opponentActive ? undefined : onCloseFocus}
              />
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
