import { BOT_LEVELS, type BotOptions } from '../lib/engine/ai.ts'
import { legalActions } from '../lib/engine/ai/options.ts'
import { activePawn, type Action, type GameState } from '../lib/engine/index.ts'
import {
  acceptedAction,
  fallbackAction,
  positionText,
  readApiKey,
  RULES_TEXT,
  saveApiKey,
} from './botText.ts'

// The whole Mistral bot lives here, outside the pure engine: the API key, the battle prompt,
// the SDK call and the reply parsing. The engine stays the sole judge — only actions the
// reducer accepts are played — and any failure falls back to the strategy's own synchronous
// local search, so a battle can never stall.

// Z.ai GLM 5.3, hosted by Mistral: a reasoning model, markedly stronger at
// positional planning than mistral-small at the cost of slower replies.
const MODEL = 'zai-glm-5-3'
const API_KEY_STORAGE = 'hexmate.mistralApiKey'

export function readMistralApiKey(): string | undefined {
  return readApiKey(API_KEY_STORAGE)
}

export function saveMistralApiKey(key: string): void {
  saveApiKey(API_KEY_STORAGE, key)
}

const SYSTEM_PROMPT = `You are the war master of the ENEMY army in Hexmate, a turn-based hexagonal strategy game on an axial hex grid (q, r; adjacent hexes differ by (1,0), (-1,0), (0,1), (0,-1), (1,-1), (-1,1)).

Goal: kill the PLAYER king while keeping your ENEMY king alive. Be bold and decisive: press the attack, punish exposed units, and never waste the active unit's energy. Defend your king only when it is truly threatened.

${RULES_TEXT}

You always answer with exactly one legal action from the list you are given, as pure JSON, with no other text.`

// The whole position plus every legal action, as one chat message.
export function battlePrompt(state: GameState): string {
  const actions = legalActions(state)
    .map((action) => JSON.stringify(action))
    .join('\n')
  return [
    positionText(state),
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
  return acceptedAction(parsed as Action, state)
}

export async function mistralChooseAction(
  state: GameState,
  options: BotOptions = BOT_LEVELS.normal,
): Promise<Action> {
  const apiKey = readMistralApiKey()
  if (!apiKey || !activePawn(state)) return fallbackAction(state, options, 'mistral')
  try {
    // Imported lazily so the SDK stays in its own chunk, loaded only for Mistral battles.
    const { MistralCore } = await import('@mistralai/mistralai/core.js')
    const { chatComplete } = await import('@mistralai/mistralai/funcs/chatComplete.js')
    const client = new MistralCore({ apiKey })
    const result = await chatComplete(client, {
      model: MODEL,
      temperature: 0.4,
      // GLM always reasons, and its thinking shares the completion budget: without a
      // generous budget and a low effort the reply is pure truncated thinking.
      maxTokens: 16384,
      reasoningEffort: 'low',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: battlePrompt(state) },
      ],
    })
    if (!result.ok) return fallbackAction(state, options, 'mistral')
    const content = result.value.choices[0]?.message?.content
    const reply =
      typeof content === 'string'
        ? content
        : content?.map((chunk) => (chunk.type === 'text' ? chunk.text : '')).join('')
    if (!reply) return fallbackAction(state, options, 'mistral')
    return actionFromReply(reply, state) ?? fallbackAction(state, options, 'mistral')
  } catch {
    // Network, quota or parsing failure: the local AI keeps the battle moving.
    return fallbackAction(state, options, 'mistral')
  }
}
