import type { Aim, GameState, Pawn } from './engine/index.ts'

// What the player last chose, and the state it was chosen on. Every choice expires on its own
// scope: an aim, a canceled aim and a pending attack last one state, a dismissed Move mode lasts
// the whole activation, through the pawn's own actions.
export type CommandMemory = {
  state: GameState
  pawnId: number
  round: number
  aim?: Aim
  quiet?: 'state' | 'activation'
  attackNext?: boolean
}

export function remember(
  state: GameState,
  pawn: Pawn,
  choice: Pick<CommandMemory, 'aim' | 'quiet' | 'attackNext'>,
): CommandMemory {
  return { state, pawnId: pawn.id, round: state.round, ...choice }
}

export function recall(
  memory: CommandMemory | null,
  state: GameState,
  pawn: Pawn | undefined,
  canCommand: boolean,
): { aim: Aim | null; moveMode: boolean; dismissed: boolean } {
  const sameState = memory?.state === state
  const sameActivation = memory?.pawnId === pawn?.id && memory?.round === state.round
  const aim = (canCommand && sameState && memory?.aim) || null
  const dismissed = memory?.quiet === 'activation' && sameActivation
  const quiet = dismissed || (memory?.quiet === 'state' && sameState)
  return { aim, moveMode: !!pawn && !aim && !quiet, dismissed }
}
