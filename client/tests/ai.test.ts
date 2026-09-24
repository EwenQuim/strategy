import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  activePawn,
  initialState,
  reducer,
  King,
  Swordsman,
  Ninja,
  Archer,
  Bulwark,
  hexDist,
  type GameState,
  type Pawn,
} from '../src/lib/engine/index.ts'
import {
  BOT_LEVELS,
  chooseBotActions,
  createBotGame,
  type BotDifficulty,
} from '../src/lib/bot.ts'

function battle(pawns: Pawn[], order = pawns.map((p) => p.id)): GameState {
  const tiles: GameState['tiles'] = new Map()
  for (let q = -6; q <= 6; q++)
    for (let r = -6; r <= 6; r++) tiles.set(q + ',' + r, { q, r, terrain: 'plain' })
  return {
    ...initialState('ai-test'),
    biome: 'verdant',
    hellfire: [],
    pawns,
    tiles,
    order,
    active: 0,
  }
}

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

test('Equally valued attacks keep candidate order at every difficulty', () => {
  for (const reversed of [false, true]) {
    const targets = [new Archer(4, 1, 0, 'player', 1, 0), new Archer(5, 0, 1, 'player', 1, 0)]
    if (reversed) targets.reverse()
    const state = battle([
      new Swordsman(1, 0, 0, 'enemy', 5, 1),
      new King(2, -6, 0, 'enemy'),
      new King(3, 6, 0, 'player'),
      ...targets,
    ])
    for (const level of Object.keys(BOT_LEVELS) as BotDifficulty[]) {
      assert.deepEqual(chooseBotActions(state, level), [
        { type: 'act', action: 'attack' },
        { type: 'attackAt', q: targets[0].q, r: targets[0].r },
      ])
    }
  }
})

test('AI battles start with an untouched human turn and restart with the same order', () => {
  for (let seed = 0; seed < 30; seed++) {
    const game = createBotGame()
    const opening = game.initialTransition('initiative-' + seed)
    assert.equal(activePawn(opening.state)?.side, 'player')
    assert.equal(opening.state.active, 0)
    assert.equal(opening.state.round, 1)
    assert.equal(opening.state.logCount, 1)
    assert.deepEqual(opening.frames, [])
    assert.ok(opening.state.pawns.every((p) => p.energy === p.maxEnergy && p.hp === p.maxHp))
    assert.deepEqual(
      game.transition(game.reducer(opening.state, { type: 'endTurn' }), { type: 'restart' }),
      opening,
    )
  }
})

test('Round order is fixed, skips deaths before and after the active unit, and uses no randomness', () => {
  let state = battle(
    [
      new Swordsman(1, 0, 0, 'enemy'),
      new King(2, -5, 0, 'enemy'),
      new King(3, 5, 0, 'player'),
      new Archer(4, 4, 0, 'player'),
    ],
    [4, 2, 1, 3],
  )
  const original = [...state.order]
  const random = state.randomState
  for (let round = 1; round <= 3; round++) {
    assert.equal(state.round, round)
    for (const id of original) {
      assert.equal(activePawn(state)?.id, id)
      state = reducer(state, { type: 'endTurn' })
      assert.equal(state.randomState, random)
    }
    assert.deepEqual(state.order, original)
  }
  state = reducer(state, { type: 'endTurn' })
  state.pawns = state.pawns.filter((p) => p.id !== 1 && p.id !== 4)
  state = reducer(state, { type: 'endTurn' })
  assert.equal(activePawn(state)?.id, 3)
  state = reducer(state, { type: 'endTurn' })
  assert.deepEqual(state.order, [2, 3])
  assert.equal(activePawn(state)?.id, 2)
})

for (const level of Object.keys(BOT_LEVELS) as BotDifficulty[]) {
  test(
    level + ': the king retreats from a lethal Ninja instead of attacking bait or Rallying',
    () => {
      const state = battle([
        new King(1, 0, 0, 'enemy', 4),
        new Swordsman(2, 0, -1, 'enemy', 3),
        new Swordsman(3, 1, 0, 'player', 5),
        new Ninja(4, 2, 0, 'player'),
        new King(5, 6, 0, 'player'),
      ])
      const next = playTurn(state, level)
      const king = next.pawns.find((p) => p.id === 1)!
      assert.ok(
        hexDist(
          king,
          next.pawns.find((p) => p.id === 4)!,
        ) > 4,
      )
      assert.equal(king.hp, 4)
      assert.ok(!king.specialUsed)
    },
  )

  test(
    level + ': a defender kills a threat to its king instead of taking nearby material',
    () => {
      const state = battle([
        new Swordsman(1, 0, 0, 'enemy'),
        new King(2, 0, 1, 'enemy', 4),
        new Bulwark(3, -1, 0, 'player', 1),
        new Ninja(4, 1, 0, 'player'),
        new King(5, 6, 0, 'player'),
      ])
      const actions = chooseBotActions(state, level)
      const next = actions.reduce(reducer, state)
      assert.ok(!next.pawns.some((p) => p.id === 4))
      assert.ok(next.pawns.some((p) => p.id === 3))
    },
  )

  test(level + ': take a winning attack instead of healing or attacking a soldier', () => {
    const state = battle([
      new King(1, 0, 0, 'enemy'),
      new Swordsman(2, 0, -1, 'enemy', 3),
      new Swordsman(3, 1, 0, 'player', 1),
      new King(4, 0, 1, 'player', 2),
    ])
    assert.equal(playTurn(state, level).winner, 'enemy')
  })
}

test('King safety includes a move followed by Charge, and refreshed enemy energy', () => {
  for (const refreshed of [false, true]) {
    const state = battle(
      [
        new King(1, 0, 0, 'enemy', 2),
        new Archer(2, 0, -1, 'enemy'),
        new Swordsman(3, 4, 0, 'player', 5, refreshed ? 0 : 3),
        new King(4, 6, 0, 'player'),
      ],
      refreshed ? [3, 1, 2, 4] : [1, 3, 2, 4],
    )
    state.active = state.order.indexOf(1)
    const next = playTurn(state, 'easy')
    assert.ok(hexDist(next.pawns[0], next.pawns[2]) > 4)
  }
})

test('AI uses Aimed shot rather than gambling on an escaping king', () => {
  const state = battle([
    new Archer(1, 0, 0, 'enemy'),
    new King(2, -6, 0, 'enemy'),
    new King(3, 2, 0, 'player', 2, 3, 60),
  ])
  assert.deepEqual(chooseBotActions(state), [
    { type: 'act', action: 'special' },
    { type: 'specialAt', q: 2, r: 0 },
  ])
})

test('Analysis is deterministic, immutable, configurable and independent of the real Escape stream', () => {
  const state = battle([
    new Archer(1, 0, 0, 'enemy'),
    new King(2, -6, 0, 'enemy'),
    new King(3, 2, 0, 'player', 4, 3, 60),
  ])
  const original = structuredClone(state)
  const actions = chooseBotActions(state)
  for (let randomState = 0; randomState < 10; randomState++)
    assert.deepEqual(chooseBotActions({ ...state, randomState }), actions)
  assert.deepEqual(structuredClone(state), original)
  assert.deepEqual(chooseBotActions(state, { ...BOT_LEVELS.normal }), actions)
  for (const options of [
    { ...BOT_LEVELS.normal, depth: 0 },
    { ...BOT_LEVELS.normal, beamWidth: 0 },
    { ...BOT_LEVELS.normal, samples: Infinity },
    { ...BOT_LEVELS.normal, caution: NaN },
  ])
    assert.throws(
      () => chooseBotActions(state, options as typeof BOT_LEVELS.normal),
      /Invalid bot options/,
    )
})

test('Hard lookahead can move then deliver a winning blow', () => {
  const state = battle([
    new Archer(1, 0, 0, 'enemy'),
    new King(2, -6, 0, 'enemy'),
    new King(3, 1, 0, 'player', 2),
  ])
  assert.equal(playTurn(state, 'hard').winner, 'enemy')
})
