import {
  activePawn,
  PAWN_CLASSES,
  reducer,
  type Action,
  type GameState,
  type PawnKind,
} from '../lib/engine/index.ts'

// Provider-agnostic pieces shared by every remote bot adapter (Mistral, Jev, ...): the
// position as text, action descriptions and the engine-as-judge rule.
// Each strategy keeps its own prompt shape and API call.

// The shared rule summary every remote bot needs to judge a position.
export const RULES_TEXT = `Rules: the active unit acts alone with 3 energy. Move for 1 energy per step and use its one signature ability at the listed cost, at most once per activation. There is no basic attack and no random dodge. Move before or after the ability; leftover energy is lost when ending the turn. Terrain never blocks ranged abilities. Mountains, lakes and absent tiles cannot be walked through; lava deals 1 damage on entry; watchtowers extend Archer shots by 1; springs heal 1 hp per round; runes give +2 energy when picked up. Charge and Rush cannot cross absent tiles; Ambush can jump over terrain, gaps and units.`

function describeUnit(pawn: {
  kind: PawnKind
  id: number
  q: number
  r: number
  hp: number
  maxHp: number
  energy: number
  maxEnergy: number
}): string {
  return `${pawn.kind} #${pawn.id} at (${pawn.q},${pawn.r}), hp ${pawn.hp}/${pawn.maxHp}, energy ${pawn.energy}/${pawn.maxEnergy}`
}

// The whole position as text: round, both armies, terrain and hellfire. Providers wrap it
// with their own instructions and the legal action list.
export function positionText(state: GameState): string {
  const pawn = activePawn(state)
  const army = (side: 'player' | 'enemy') =>
    state.pawns
      .filter((unit) => unit.side === side)
      .map((unit) => `- ${describeUnit(unit)} — ${PAWN_CLASSES[unit.kind].aiInstructions}`)
      .join('\n')
  const terrain = [...state.tiles.values()]
    .filter((tile) => tile.terrain !== 'plain' || tile.feature)
    .map(
      (tile) =>
        `- (${tile.q},${tile.r}): ${tile.terrain}${tile.feature ? `, ${tile.feature}` : ''}`,
    )
    .join('\n')
  return [
    `Round ${state.round}. You play the ENEMY side. Only the active unit can act.`,
    '',
    `Active unit: ${pawn ? describeUnit(pawn) : 'none'}.`,
    '',
    'Your ENEMY army:',
    army('enemy') || '- none',
    '',
    'The PLAYER army you must destroy:',
    army('player') || '- none',
    '',
    'Terrain (every tile not listed is an open plain):',
    terrain || '- none',
    ...(state.hellfire.length
      ? [
          '',
          `Hellfire will strike these tiles soon: ${state.hellfire.map(({ q, r }) => `(${q},${r})`).join(', ')}`,
        ]
      : []),
  ].join('\n')
}

// A short human wording of one action, for option lists a decision model can read.
export function describeAction(action: Action): string {
  if (action.type === 'move') return `move to (${action.q},${action.r})`
  if (action.type === 'special')
    return `ability${action.target ? ` on (${action.target.q},${action.target.r})` : ''}${
      action.destination ? `, landing on (${action.destination.q},${action.destination.r})` : ''
    }`
  return 'end the turn'
}

// The engine is the sole judge: an action counts only if the reducer accepts it.
export function acceptedAction(action: Action, state: GameState): Action | null {
  if (action.type === 'restart') return null
  return reducer(state, action) !== state ? action : null
}
