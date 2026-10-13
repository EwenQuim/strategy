import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  activePawn,
  initialState,
  reducer,
  transition,
  type GameState,
  type Side,
} from '../../src/lib/engine/index.ts'

import { BOT_LEVELS, type BotDifficulty } from '../../src/lib/engine/ai.ts'
import { DepthsearchBot } from '../../src/bots/strategies/depthsearch.ts'
import { NapoleonBot, NAPOLEON_LEVELS } from '../../src/bots/strategies/napoleon.ts'
import { PAWN_CLASSES } from '../../src/lib/engine/pawns/index.ts'

async function playTurn(state: GameState, level: BotDifficulty = 'normal'): Promise<GameState> {
  const id = activePawn(state)!.id
  const round = state.round
  for (
    let step = 0;
    step < 4 && !state.winner && state.round === round && activePawn(state)?.id === id;
    step++
  ) {
    for (const action of await new DepthsearchBot(BOT_LEVELS[level]).chooseActions(state)) {
      const next = reducer(state, action)
      assert.notEqual(next, state)
      state = next
    }
  }
  assert.ok(state.winner || state.round !== round || activePawn(state)?.id !== id)
  return state
}

test('All difficulty levels emit legal actions for every class and both sides', async () => {
  for (const level of Object.keys(BOT_LEVELS) as BotDifficulty[]) {
    const state = initialState('all-classes', {
      biome: 'desert',
      player: ['king', 'swordsman', 'archer', 'magician', 'ninja', 'bulwark', 'bomber'],
      enemy: ['king', 'swordsman', 'archer', 'magician', 'ninja', 'bulwark', 'bomber'],
    })
    for (const [active] of state.order.entries()) await playTurn({ ...state, active }, level)
  }
})

test('The bot proposes ordinary actions for either side without mutating the rules state', async () => {
  const sides = new Set<Side>()
  for (const seed of ['alpha', 'bravo', 'charlie']) {
    let state = initialState(seed)
    for (let turn = 0; turn < 200 && !state.winner; turn++) {
      sides.add(activePawn(state)!.side)
      const before = structuredClone(state)
      const actions = await new DepthsearchBot(BOT_LEVELS.normal).chooseActions(state)
      assert.ok(actions.length)
      assert.deepEqual(structuredClone(state), before)
      for (const action of actions) {
        const original = structuredClone(state)
        Object.freeze(state)
        Object.freeze(state.pawns)
        Object.freeze(state.order)
        Object.freeze(state.log)
        state.pawns.forEach(Object.freeze)
        for (const tile of state.tiles.values()) Object.freeze(tile)
        const result = transition(state, action)
        assert.notEqual(result.state, state)
        assert.deepEqual(result.state, reducer(state, action))
        assert.deepEqual(result, transition(state, action))
        assert.deepEqual(structuredClone(state), original)
        state = result.state
      }
    }
  }
  assert.deepEqual(sides, new Set(['player', 'enemy']))
})
test('Napoleon plays every signature class on both sides with legal complete activations and immutable input', async () => {
  const kinds = Object.keys(PAWN_CLASSES) as (keyof typeof PAWN_CLASSES)[]
  const opening = initialState('commander-all-classes', {
    biome: 'desert',
    player: kinds,
    enemy: kinds,
  })
  const bot = new NapoleonBot(NAPOLEON_LEVELS.normal)
  for (const [active] of opening.order.entries()) {
    const state = { ...opening, active }
    const before = structuredClone(state)
    const actor = activePawn(state)!
    const actions = await bot.chooseActions(state)
    assert.ok(actions.length)
    let next = state
    for (const action of actions) {
      const applied = reducer(next, action)
      assert.notEqual(applied, next)
      next = applied
    }
    assert.ok(next.winner || activePawn(next)?.id !== actor.id)
    assert.deepEqual(structuredClone(state), before)
  }
})
