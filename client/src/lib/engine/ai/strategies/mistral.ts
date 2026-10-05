import { activePawn, reducer, type Action, type GameState } from '../../engine.ts'
import type { PawnKind } from '../../pawns/index.ts'
import { legalActions } from '../options.ts'
import { depthsearch } from './depthsearch.ts'
import type { AiStrategy } from '../decision.ts'

// The Mistral strategy thinks through a large language model: the network call lives in the
// async adapter (src/api/mistralBot.ts), which sends this file's prompt and plays the action the
// model picks. Everything here stays pure: the prompt text, the reply parsing, and a local
// search fallback for synchronous callers (benchmarks, analysis, the in-engine bot).

// One line per pawn class, kept in English on purpose: this is model-facing prompt text, not UI.
const UNIT_GUIDE: Record<PawnKind, string> = {
  king: 'melee, 2 damage. Rally (1): heal 1 hp of every adjacent ally, once per round.',
  swordsman:
    'melee, 2 damage. Charge (2): pick a tile up to 2 steps away, then an adjacent enemy; move there and strike for 2.',
  archer:
    'ranged, 1 damage at distance 2-3, never adjacent. Eagle eye (2): 2 damage at distance 2-3 that cannot be escaped.',
  magician:
    'ranged, 1 damage at distance 1-2. Fireball (2): pick a direction; 1 damage to every enemy along the line to the board edge, through terrain and units.',
  ninja:
    'melee, 5 damage. Jump (2): teleport up to 3 tiles over anything to empty passable ground.',
  bulwark:
    'melee, 1 damage; its own moves cost 2 energy for the first tile. Protect (2): shield an ally within 2 tiles and take its next hit, wherever it goes.',
  bomber:
    'ranged, 1 damage at distance 1-2. Bomb (2): any tile within 2; 1 damage to every unit on it and its six neighbours, allies and self included.',
  hoplite:
    '1 damage at distance 1-2. Phalanx (1): shield an adjacent ally and take its next hit.',
  wolf: 'melee, 2 damage. Cry (2): +1 energy to every ally within 2 tiles, once per round.',
  berserker:
    'melee, 2 damage. Fury (1): spend all remaining energy to strike an adjacent enemy for 2 plus 1 per extra energy, ignoring Escape.',
}

export const SYSTEM_PROMPT = `You are the war master of the ENEMY army in Hexmate, a turn-based hexagonal strategy game on an axial hex grid (q, r; adjacent hexes differ by (1,0), (-1,0), (0,1), (0,-1), (1,-1), (-1,1)).

Goal: kill the PLAYER king while keeping your ENEMY king alive. Be bold and decisive: press the attack, punish exposed units, and never waste the active unit's energy. Defend your king only when it is truly threatened.

Rules: the active unit acts alone with its remaining energy (moving costs 1 per step, attacking 1, specials their listed price; the turn ends when energy runs out). Terrain never blocks ranged attacks. Mountains and lakes cannot be walked through; lava hurts units standing on it and empowers attacks from it; watchtowers extend ranged attacks by 1; springs heal 1 hp per round; runes give +2 energy when picked up. Units may Escape (dodge) a hit; some attacks ignore Escape.

You always answer with exactly one legal action from the list you are given, as pure JSON, with no other text.`

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

// The whole position as text: round, both armies, terrain, hellfire, and every legal action.
export function battlePrompt(state: GameState): string {
  const pawn = activePawn(state)
  const army = (side: 'player' | 'enemy') =>
    state.pawns
      .filter((unit) => unit.side === side)
      .map((unit) => `- ${describeUnit(unit)} — ${UNIT_GUIDE[unit.kind]}`)
      .join('\n')
  const terrain = [...state.tiles.values()]
    .filter((tile) => tile.terrain !== 'plain' || tile.feature)
    .map(
      (tile) =>
        `- (${tile.q},${tile.r}): ${tile.terrain}${tile.feature ? `, ${tile.feature}` : ''}`,
    )
    .join('\n')
  const actions = legalActions(state)
    .map((action) => JSON.stringify(action))
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
    '',
    'Legal actions for the active unit. Reply with exactly one of them, copied verbatim as JSON:',
    actions,
  ].join('\n')
}

// Extracts the first JSON object from a model reply and returns it only if the engine accepts it.
export function actionFromReply(reply: string, state: GameState): Action | null {
  const start = reply.indexOf('{')
  const end = reply.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(reply.slice(start, end + 1))
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const action = parsed as Action
  if (action.type === 'restart') return null
  return reducer(state, action) !== state ? action : null
}

export const mistral: AiStrategy = {
  id: 'mistral',
  // Without the adapter there is no model to ask, so synchronous callers get the local search.
  chooseActions: (state, options) => depthsearch.chooseActions(state, options),
}
