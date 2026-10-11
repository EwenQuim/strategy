import { BOT_LEVELS } from '../lib/engine/ai.ts'
import { depthsearch } from '../lib/engine/ai/strategies/depthsearch.ts'
import {
  activePawn,
  PAWN_CLASSES,
  reducer,
  type Action,
  type GameState,
  type PawnKind,
} from '../lib/engine/index.ts'

// Provider-agnostic pieces shared by every remote bot adapter (Mistral, Jev, ...): the
// position as text, BYOK key storage, action descriptions and the engine-as-judge rule.
// Each provider keeps its own file for the key, the prompt shape and the API call.

// The shared rule summary every remote bot needs to judge a position.
export const RULES_TEXT = `Rules: the active unit acts alone with its remaining energy (moving costs 1 per step, attacking 1, specials their listed price; the turn ends when energy runs out). Terrain never blocks ranged attacks. Mountains and lakes cannot be walked through; lava hurts units standing on it and empowers attacks from it; watchtowers extend ranged attacks by 1; springs heal 1 hp per round; runes give +2 energy when picked up. Units may Escape (dodge) a hit; some attacks ignore Escape.`

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
  if (action.type === 'attack') return `attack (${action.q},${action.r})`
  if (action.type === 'special')
    return `special${action.target ? ` on (${action.target.q},${action.target.r})` : ''}${
      action.destination ? `, landing on (${action.destination.q},${action.destination.r})` : ''
    }`
  return 'end the turn'
}

// The engine is the sole judge: an action counts only if the reducer accepts it.
export function acceptedAction(action: Action, state: GameState): Action | null {
  if (action.type === 'restart') return null
  return reducer(state, action) !== state ? action : null
}

// Any failure (no key, network, quota, illegal proposal) degrades to the local search at
// normal difficulty, so a battle can never stall.
export async function fallbackAction(state: GameState): Promise<Action> {
  return (await depthsearch(state, BOT_LEVELS.normal))[0] ?? { type: 'endTurn' }
}

// BYOK key storage: the player pastes a key in Settings and it lives in localStorage.
// It is never read from the environment, so no key can ever be inlined into a build.
export function readApiKey(storageKey: string): string | undefined {
  try {
    return localStorage.getItem(storageKey) ?? undefined
  } catch {
    // localStorage unavailable: no key, and the local fallback AI takes over
  }
  return undefined
}

export function saveApiKey(storageKey: string, key: string): void {
  try {
    if (key) localStorage.setItem(storageKey, key)
    else localStorage.removeItem(storageKey)
  } catch {
    // localStorage unavailable: the key only lasts until the page is left
  }
}
