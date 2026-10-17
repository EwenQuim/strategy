import assert from 'node:assert/strict'
import { test } from 'node:test'
import { initialState, activePawn, reducer } from '../../src/lib/engine/index.ts'
import { PAWN_CLASSES } from '../../src/lib/engine/pawns/index.ts'
import { HannibalBot } from '../../src/bots/strategies/hannibal.ts'

test('Hannibal supports all signature classes on either side without mutating the state', async () => {
  const kinds = Object.keys(PAWN_CLASSES) as (keyof typeof PAWN_CLASSES)[]
  const opening = initialState('learned-all-classes', {
    biome: 'desert',
    player: kinds,
    enemy: kinds,
  })
  const bot = new HannibalBot({ simulations: 32 })
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
