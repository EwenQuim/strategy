import { BOT_LEVELS, type BotOptions } from '../lib/engine/ai.ts'
import { chooseAiActions } from '../lib/engine/ai/decision.ts'
import {
  actionFromReply,
  battlePrompt,
  SYSTEM_PROMPT,
} from '../lib/engine/ai/strategies/mistral.ts'
import { activePawn, type Action, type GameState } from '../lib/engine/index.ts'

// Async driver for the 'mistral' AI strategy: it sends the strategy's battle prompt to the
// Mistral API and plays the action the model picks. The engine stays the sole judge: only
// actions the reducer accepts are played, and any failure falls back to the strategy's own
// synchronous local search so a battle can never stall.

const MODEL = 'mistral-small-latest'
const API_KEY_STORAGE = 'hexmate.mistralApiKey'

export function readMistralApiKey(): string | undefined {
  try {
    const stored = localStorage.getItem(API_KEY_STORAGE)
    if (stored) return stored
  } catch {
    // localStorage unavailable: fall back to the build-time key
  }
  // Cast: the tests type-check this file without vite/client, where import.meta has no env.
  const env = (import.meta as { env?: { VITE_MISTRAL_API_KEY?: string } }).env
  return env?.VITE_MISTRAL_API_KEY ?? undefined
}

export function saveMistralApiKey(key: string): void {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key)
    else localStorage.removeItem(API_KEY_STORAGE)
  } catch {
    // localStorage unavailable: the key only lasts until the page is left
  }
}

function fallbackAction(state: GameState, options: BotOptions): Action {
  return chooseAiActions(state, options, 'mistral')[0] ?? { type: 'endTurn' }
}

export async function mistralChooseAction(
  state: GameState,
  options: BotOptions = BOT_LEVELS.normal,
): Promise<Action> {
  const apiKey = readMistralApiKey()
  if (!apiKey || !activePawn(state)) return fallbackAction(state, options)
  try {
    // Imported lazily so the SDK stays in its own chunk, loaded only for Mistral battles.
    const { MistralCore } = await import('@mistralai/mistralai/core.js')
    const { chatComplete } = await import('@mistralai/mistralai/funcs/chatComplete.js')
    const client = new MistralCore({ apiKey })
    const result = await chatComplete(client, {
      model: MODEL,
      temperature: 0.4,
      maxTokens: 512,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: battlePrompt(state) },
      ],
    })
    if (!result.ok) return fallbackAction(state, options)
    const content = result.value.choices[0]?.message?.content
    const reply =
      typeof content === 'string'
        ? content
        : content?.map((chunk) => (chunk.type === 'text' ? chunk.text : '')).join('')
    if (!reply) return fallbackAction(state, options)
    return actionFromReply(reply, state) ?? fallbackAction(state, options)
  } catch {
    // Network, quota or parsing failure: the local AI keeps the battle moving.
    return fallbackAction(state, options)
  }
}
