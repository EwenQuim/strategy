import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  activePawn,
  initialState,
  reducer,
  transition,
  King,
  Swordsman,
  Archer,
  Magician,
  Bomber,
  Ninja,
  Bulwark,
  type GameState,
  type Side,
} from '../../src/lib/engine/index.ts'
import { seedState } from '../../src/lib/engine/random.ts'
import { chooseBotActions } from '../../src/lib/engine/bot.ts'
import { BOT_LEVELS, type BotDifficulty } from '../../src/lib/engine/ai.ts'

function playTurn(state: GameState, level: BotDifficulty = 'normal'): GameState {
  const id = activePawn(state)!.id
  const round = state.round
  for (
    let step = 0;
    step < 4 && !state.winner && state.round === round && activePawn(state)?.id === id;
    step++
  ) {
    for (const action of chooseBotActions(state, level)) {
      const next = reducer(state, action)
      assert.notEqual(next, state)
      state = next
    }
  }
  assert.ok(state.winner || state.round !== round || activePawn(state)?.id !== id)
  return state
}

test('Class-specific candidates and threat estimates retain their reference decisions', () => {
  const decisions = []
  for (const Unit of [King, Swordsman, Archer, Magician, Ninja, Bulwark, Bomber]) {
    for (const side of ['player', 'enemy'] as const) {
      for (const energy of [1, 2, 3]) {
        const other = side === 'player' ? 'enemy' : 'player'
        const tiles: GameState['tiles'] = new Map()
        for (let q = -3; q <= 4; q++)
          for (let r = -3; r <= 4; r++)
            tiles.set(q + ',' + r, { q, r, terrain: q === 1 && r === 1 ? 'lava' : 'plain' })
        const state: GameState = {
          ...initialState('ai-reference'),
          tiles,
          pawns: [
            new Unit(1, 0, 0, side, undefined, energy),
            new King(2, -2, 0, side, 4),
            new Swordsman(3, -1, 0, side, 2),
            new King(4, 3, 0, other, 4, 3, 60),
            new Magician(5, 1, 0, other),
            new Bulwark(6, 2, 0, other),
          ],
          order: [1, 2, 3, 4, 5, 6],
          active: 0,
        }
        state.pawns[5].protectingId = 4
        for (const options of Object.values(BOT_LEVELS))
          decisions.push(chooseBotActions(state, options))
      }
    }
  }
  assert.equal(decisions.length, 126)
  assert.equal(seedState(JSON.stringify(decisions)), 412397909)
})

test('All difficulty levels emit legal actions for every class and both sides', () => {
  for (const level of Object.keys(BOT_LEVELS) as BotDifficulty[]) {
    const state = initialState('all-classes', {
      biome: 'desert',
      player: ['king', 'swordsman', 'archer', 'magician', 'ninja', 'bulwark', 'bomber'],
      enemy: ['king', 'swordsman', 'archer', 'magician', 'ninja', 'bulwark', 'bomber'],
    })
    for (const [active] of state.order.entries()) playTurn({ ...state, active }, level)
  }
})

test('The bot proposes ordinary actions for either side without mutating the rules state', () => {
  const sides = new Set<Side>()
  for (const seed of ['alpha', 'bravo', 'charlie']) {
    let state = initialState(seed)
    for (let turn = 0; turn < 200 && !state.winner; turn++) {
      sides.add(activePawn(state)!.side)
      const before = structuredClone(state)
      const actions = chooseBotActions(state)
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
