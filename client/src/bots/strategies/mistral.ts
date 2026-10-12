import { legalActions } from '../../lib/engine/ai/options.ts'
import { activePawn, type Action, type GameState } from '../../lib/engine/index.ts'
import type { Bot } from '../bot.ts'
import { readOptions } from '../options.ts'
import { readMistralApiKey } from '../apiKeys.ts'
import { acceptedAction, positionText, RULES_TEXT } from '../remoteText.ts'

type MistralOptions = {
  model: string
  effort: 'low' | 'medium' | 'high'
  maxTokens: number
  temperature: number
}

const DEFAULT_OPTIONS: MistralOptions = {
  // Z.ai GLM 5.3, hosted by Mistral: stronger planning at the cost of slower replies.
  model: 'zai-glm-5-3',
  effort: 'low',
  maxTokens: 16384,
  temperature: 0.4,
}

const SYSTEM_PROMPT = `You are the war master of the ENEMY army in Hexmate, a turn-based hexagonal strategy game on an axial hex grid (q, r; adjacent hexes differ by (1,0), (-1,0), (0,1), (0,-1), (1,-1), (-1,1)).

Goal: kill the PLAYER king while keeping your ENEMY king alive. Be bold and decisive: press the attack, punish exposed units, and never waste the active unit's energy. Defend your king only when it is truly threatened.

${RULES_TEXT}

You always answer with exactly one legal action from the list you are given, as pure JSON, with no other text.`

// Proposes nothing without a key or a usable reply; the catalog falls back to the local search.
export class MistralBot implements Bot<MistralOptions> {
  readonly name = 'mistral'
  readonly options: Readonly<MistralOptions>

  constructor(options: Partial<MistralOptions> = {}) {
    this.options = readOptions(DEFAULT_OPTIONS, options)
    if (
      !this.options.model.trim() ||
      !['low', 'medium', 'high'].includes(this.options.effort) ||
      !Number.isInteger(this.options.maxTokens) ||
      this.options.maxTokens < 1 ||
      !Number.isFinite(this.options.temperature) ||
      this.options.temperature < 0 ||
      this.options.temperature > 2
    )
      throw new RangeError('Invalid Mistral options')
  }

  async chooseActions(state: GameState): Promise<Action[]> {
    const apiKey = readMistralApiKey()
    if (!apiKey || !activePawn(state)) return []
    // Imported lazily so the SDK stays in its own chunk, loaded only for Mistral battles.
    const { MistralCore } = await import('@mistralai/mistralai/core.js')
    const { chatComplete } = await import('@mistralai/mistralai/funcs/chatComplete.js')
    const client = new MistralCore({ apiKey })
    const result = await chatComplete(client, {
      model: this.options.model,
      temperature: this.options.temperature,
      // GLM always reasons, and its thinking shares the completion budget: without a
      // generous budget and a low effort the reply is pure truncated thinking.
      maxTokens: this.options.maxTokens,
      reasoningEffort: this.options.effort,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: battlePrompt(state) },
      ],
    })
    if (!result.ok) return []
    const content = result.value.choices[0]?.message?.content
    const reply =
      typeof content === 'string'
        ? content
        : content?.map((chunk) => (chunk.type === 'text' ? chunk.text : '')).join('')
    const action = reply && actionFromReply(reply, state)
    return action ? [action] : []
  }
}

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
