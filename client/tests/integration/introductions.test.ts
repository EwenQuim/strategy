import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CAMPAIGNS } from '../../src/lib/campaign.ts'
import { BOT_LEVELS } from '../../src/lib/engine/ai.ts'
import { DepthsearchBot } from '../../src/bots/strategies/depthsearch.ts'
import { turnPlans } from '../../src/lib/engine/ai/turns.ts'
import {
  activePawn,
  hexDist,
  initialState,
  transition,
  type BattleEffect,
} from '../../src/lib/engine/index.ts'

test('New enemies showcase their signatures after every legal player opening', async () => {
  for (const pack of CAMPAIGNS) {
    for (const level of pack.levels.filter((level) => level.unlocks.length)) {
      const opening = initialState(level.seed, level.setup, 'player')
      for (const plan of turnPlans(opening)) {
        let state = plan.state
        const before = state
        const pawn = activePawn(state)!
        const encounter = `${pack.slug}:${level.id} after ${JSON.stringify(plan.actions)}`
        const actions = await new DepthsearchBot(BOT_LEVELS[level.difficulty]).chooseActions(state)
        assert.equal(actions.filter((action) => action.type === 'special').length, 1, encounter)
        const effects: BattleEffect[] = []
        for (const action of actions) {
          const next = transition(state, action)
          assert.notEqual(next.state, state, encounter)
          effects.push(...next.frames.flatMap((frame) => (frame.effect ? [frame.effect] : [])))
          state = next.state
        }
        const hits = effects
          .flatMap((effect) => effect.impacts ?? [])
          .filter((hit) => hit.damage > 0)
        if (pawn.kind === 'bulwark') {
          assert.ok(
            effects.some((effect) => effect.kind === 'protect'),
            encounter,
          )
          assert.ok(state.pawns.find((p) => p.id === pawn.id)?.protectingId, encounter)
        } else {
          assert.ok(hits.length > 0, encounter)
          assert.ok(
            hits.some((hit) =>
              before.pawns.some((p) => p.side === 'player' && p.q === hit.q && p.r === hit.r),
            ),
            encounter,
          )
        }
        if (pawn.kind === 'magician') {
          assert.ok(
            effects.some((effect) => effect.kind === 'fireball' && effect.impacts!.length >= 3),
            encounter,
          )
        }
        if (pawn.kind === 'bomber') {
          assert.ok(
            effects.some((effect) => effect.kind === 'bomb' && effect.impacts!.length >= 2),
            encounter,
          )
        }
        if (pawn.kind === 'wolf') {
          assert.ok(
            state.pawns.some((p) => p.side === 'enemy' && p.bonusEnergy === 1),
            encounter,
          )
        }
        if (pawn.kind === 'hoplite') {
          assert.ok(
            before.pawns.some(
              (p) =>
                p.side === 'player' &&
                state.pawns.some((after) => after.id === p.id && hexDist(p, after) === 1),
            ),
            encounter,
          )
        }
        if (pawn.kind === 'ninja' || pawn.kind === 'lancer') {
          assert.ok(
            effects.some((effect) => hexDist(effect.from, effect.to) > 1),
            encounter,
          )
        }
        if (pawn.kind === 'berserker')
          assert.ok(
            hits.some((hit) => hit.damage > 2),
            encounter,
          )
        assert.equal(state.winner, null, encounter)
      }
    }
  }
})
