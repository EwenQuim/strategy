import { legalActions } from '../lib/engine/ai/options.ts'
import {
  activePawn,
  hexDist,
  key,
  type Action,
  type Axial,
  type GameState,
} from '../lib/engine/index.ts'
import {
  acceptedAction,
  describeAction,
  fallbackAction,
  positionText,
  readApiKey,
  RULES_TEXT,
  saveApiKey,
} from './botText.ts'

// The whole Jev bot lives here, outside the pure engine: the API key, the decision request
// and the answer mapping. Jev (TypeSafe AI) is a decision model: it picks one option from a
// fixed list with a calibrated probability instead of writing text, so the legal actions are
// sent as the criteria of a single choice question. The engine stays the sole judge — the
// chosen option is played only if the reducer accepts it — and any failure falls back to the
// strategy's own synchronous local search, so a battle can never stall.

const MODEL = 'jev-latest'
const ENDPOINT = 'https://api.typesafe.ai/v1/systemone'
const API_KEY_STORAGE = 'hexmate.jevApiKey'

export function readJevApiKey(): string | undefined {
  return readApiKey(API_KEY_STORAGE)
}

export function saveJevApiKey(key: string): void {
  saveApiKey(API_KEY_STORAGE, key)
}

// The fixed option list Jev picks from: one criteria entry per legal action, keyed by index.
// A decision model judges only what the criteria say, so every entry carries its tactical
// consequence, not just coordinates.
export function actionCriteria(state: GameState): Record<string, string> {
  const pawn = activePawn(state)
  const foes = state.pawns.filter((unit) => unit.side === 'player')
  const king = foes.find((unit) => unit.kind === 'king')
  const nearestFoe = (from: Axial) =>
    foes.length ? Math.min(...foes.map((unit) => hexDist(from, unit))) : null
  const unitAt = (at: Axial) => state.pawns.find((unit) => unit.q === at.q && unit.r === at.r)
  const annotate = (action: Action): string => {
    if (action.type === 'move') {
      const at = { q: action.q, r: action.r }
      const tile = state.tiles.get(key(at.q, at.r))
      const before = pawn ? nearestFoe(pawn) : null
      const after = nearestFoe(at)
      const notes = [
        king && `${hexDist(at, king)} steps from the PLAYER king`,
        before !== null && after !== null
          ? after < before
            ? 'closes on the PLAYER army'
            : 'backs away from the PLAYER army'
          : null,
        tile?.terrain === 'lava' && 'stands in lava',
        tile?.feature === 'watchtower' && 'gains a watchtower',
        tile?.feature === 'rune' && 'picks up a rune (+2 energy)',
        tile?.feature === 'spring' && 'reaches a spring',
      ].filter(Boolean)
      return `${describeAction(action)} (${notes.join(', ')})`
    }
    if (action.type === 'attack') {
      const target = unitAt({ q: action.q, r: action.r })
      return target
        ? `strike ${target.kind} #${target.id} (hp ${target.hp}/${target.maxHp})`
        : describeAction(action)
    }
    if (action.type === 'special' && action.target) {
      const target = unitAt(action.target)
      return target
        ? `${describeAction(action)}: ${target.kind} #${target.id} (hp ${target.hp}/${target.maxHp})`
        : describeAction(action)
    }
    return 'end the turn, losing the remaining energy'
  }
  return Object.fromEntries(
    legalActions(state).map((action, index) => [String(index), annotate(action)]),
  )
}

// Maps Jev's chosen key back to an action, accepted only if the engine agrees.
export function actionFromChoice(choice: unknown, state: GameState): Action | null {
  if (typeof choice !== 'string') return null
  const action = legalActions(state)[Number(choice)]
  if (!action || String(Number(choice)) !== choice) return null
  return acceptedAction(action, state)
}

export async function jevChooseAction(state: GameState): Promise<Action> {
  const apiKey = readJevApiKey()
  if (!apiKey || !activePawn(state)) return fallbackAction(state, 'jev')
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: MODEL,
        state: `${RULES_TEXT}\n\nGoal: kill the PLAYER king while keeping your ENEMY king alive. Be bold and decisive: press the attack, punish exposed units, and never waste the active unit's energy — remaining energy is lost the moment the turn ends, so ending the turn early is a wasted turn.\n\n${positionText(state)}`,
        questions: {
          move: {
            type: 'choice',
            instructions:
              'Which action should the active ENEMY unit take right now? Rank by: can it attack a PLAYER unit now, does it move the unit closer to the PLAYER king, does it use a special to good effect. End the turn only when every other option is worse than passing.',
            criteria: actionCriteria(state),
          },
        },
      }),
    })
    if (!response.ok) return fallbackAction(state, 'jev')
    const data = (await response.json()) as { answers?: { move?: { choice?: unknown } } }
    return actionFromChoice(data.answers?.move?.choice, state) ?? fallbackAction(state, 'jev')
  } catch {
    // Network, quota or parsing failure: the local AI keeps the battle moving.
    return fallbackAction(state, 'jev')
  }
}
