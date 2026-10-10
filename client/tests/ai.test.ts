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
  Bomber,
  hexDist,
  type GameState,
  type Pawn,
} from '../src/lib/engine/index.ts'
import { chooseBotActions } from '../src/lib/engine/bot.ts'
import { createBotGame } from './bot-game.ts'
import { BOT_LEVELS, type BotDifficulty } from '../src/lib/engine/ai.ts'

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

async function playTurn(state: GameState, level: BotDifficulty = 'normal'): Promise<GameState> {
  const id = activePawn(state)!.id
  const round = state.round
  for (
    let step = 0;
    step < 4 && !state.winner && state.round === round && activePawn(state)?.id === id;
    step++
  ) {
    for (const action of await chooseBotActions(state, {
      name: 'depthsearch',
      difficulty: level,
    })) {
      const next = reducer(state, action)
      assert.notEqual(next, state)
      state = next
    }
  }
  assert.ok(state.winner || state.round !== round || activePawn(state)?.id !== id)
  return state
}

test('Equally valued attacks keep candidate order at every difficulty', async () => {
  for (const reversed of [false, true]) {
    const targets = [new Archer(4, 1, 0, 'player', 1, 0), new Archer(5, 0, 1, 'player', 1, 0)]
    if (reversed) targets.reverse()
    const state = battle([
      new Swordsman(1, 0, 0, 'enemy', 5, 1),
      new King(2, -3, -3, 'enemy'),
      new King(3, 3, 3, 'player'),
      ...targets,
    ])
    for (const level of Object.keys(BOT_LEVELS) as BotDifficulty[]) {
      assert.deepEqual(
        await chooseBotActions(state, { name: 'depthsearch', difficulty: level }),
        [{ type: 'attack', q: targets[0].q, r: targets[0].r }],
      )
    }
  }
})

test('AI battles start with an untouched human turn and restart with the same order', async () => {
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
      await game.transition(await game.reducer(opening.state, { type: 'endTurn' }), {
        type: 'restart',
      }),
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
    async () => {
      const state = battle([
        new King(1, 0, 0, 'enemy', 4),
        new Swordsman(2, 0, -1, 'enemy', 3),
        new Swordsman(3, 1, 0, 'player', 5),
        new Ninja(4, 2, 0, 'player'),
        new King(5, 6, 0, 'player'),
      ])
      const next = await playTurn(state, level)
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

  test(level + ': a defender removes the threat to its king within its turn', async () => {
    const state = battle([
      new Swordsman(1, 0, 0, 'enemy'),
      new King(2, 0, 1, 'enemy', 4),
      new Bulwark(3, -1, 0, 'player', 1),
      new Ninja(4, 1, 0, 'player'),
      new King(5, 6, 0, 'player'),
    ])
    const next = await playTurn(state, level)
    assert.ok(!next.pawns.some((p) => p.id === 4))
    assert.equal(next.pawns.find((p) => p.id === 2)?.hp, 4)
  })

  test(level + ': a reckless unit still never walks into lava to die', async () => {
    const state = battle([
      new Swordsman(1, 0, 0, 'enemy', 1),
      new King(2, -6, 0, 'enemy'),
      new Archer(3, 3, 0, 'player'),
      new King(4, 6, 0, 'player'),
    ])
    state.tiles.set('1,0', { q: 1, r: 0, terrain: 'lava' })
    state.tiles.set('1,-1', { q: 1, r: -1, terrain: 'lava' })
    assert.ok((await playTurn(state, level)).pawns.some((p) => p.id === 1))
  })

  test(level + ': stalemate aggression never rewards a pointless Hellfire death', async () => {
    const state = battle(
      [
        new Ninja(1, 0, 0, 'enemy'),
        new King(2, -3, 0, 'enemy'),
        new Archer(3, 6, 0, 'player', undefined, 0),
        new King(4, 8, 0, 'player'),
      ],
      [3, 1, 2, 4],
    )
    state.tiles.clear()
    for (let q = -3; q <= 8; q++) state.tiles.set(q + ',0', { q, r: 0, terrain: 'plain' })
    state.biome = 'hell'
    state.hellfire = [
      { q: 3, r: 0 },
      { q: -3, r: 0 },
    ]
    state.active = 1
    state.round = 10
    state.lastClashRound = 0
    let next = await playTurn(state, level)
    while (!next.winner && next.round === state.round) next = reducer(next, { type: 'endTurn' })
    assert.ok(next.pawns.some((pawn) => pawn.id === 1))
    assert.ok(
      next.pawns
        .filter((pawn) => pawn.side === 'player')
        .every((pawn) => pawn.hp === pawn.maxHp),
    )
  })

  test(level + ': never bombs its own units when no enemy is caught', async () => {
    const state = battle([
      new Bomber(1, 0, 0, 'enemy'),
      new Swordsman(2, 2, 0, 'enemy', 1),
      new King(3, -6, 0, 'enemy'),
      new King(4, 6, 0, 'player'),
    ])
    assert.ok((await playTurn(state, level)).pawns.some((p) => p.id === 2))
  })

  test(level + ': takes a free kill instead of ending its turn', async () => {
    const state = battle([
      new Swordsman(1, 0, 0, 'enemy'),
      new King(2, -6, 0, 'enemy'),
      new Archer(3, 1, 0, 'player', 1),
      new King(4, 6, 0, 'player'),
    ])
    assert.ok(!(await playTurn(state, level)).pawns.some((p) => p.id === 3))
  })

  test(
    level + ': take a winning attack instead of healing or attacking a soldier',
    async () => {
      const state = battle([
        new King(1, 0, 0, 'enemy'),
        new Swordsman(2, 0, -1, 'enemy', 3),
        new Swordsman(3, 1, 0, 'player', 1),
        new King(4, 0, 1, 'player', 2),
      ])
      assert.equal((await playTurn(state, level)).winner, 'enemy')
    },
  )
}

test('An archer steps out of melee contact before shooting', async () => {
  for (const level of Object.keys(BOT_LEVELS) as BotDifficulty[]) {
    const state = battle([
      new Archer(1, 0, 0, 'enemy'),
      new King(2, -6, 0, 'enemy'),
      new Swordsman(3, 1, 0, 'player', 5, 0),
      new King(4, 6, 0, 'player'),
    ])
    const next = await playTurn(state, level)
    const archer = next.pawns.find((p) => p.id === 1)!
    assert.ok(
      hexDist(
        archer,
        next.pawns.find((p) => p.id === 3)!,
      ) >= 2,
      level,
    )
  }
})

test('A safe commander king walks to a wounded ally and rallies', async () => {
  for (const level of Object.keys(BOT_LEVELS) as BotDifficulty[]) {
    const state = battle([
      new King(1, 0, 0, 'enemy'),
      new Swordsman(2, 2, 0, 'enemy', 2),
      new Swordsman(3, 3, 1, 'enemy'),
      new Archer(4, 4, 1, 'enemy'),
      new King(5, -6, 6, 'player'),
      new Swordsman(6, -6, 5, 'player'),
      new Swordsman(7, -5, 5, 'player'),
      new Swordsman(8, -4, 5, 'player'),
    ])
    const next = await playTurn(state, level)
    assert.ok(next.pawns.find((p) => p.id === 1)!.specialUsed, level)
    assert.equal(next.pawns.find((p) => p.id === 2)!.hp, 3, level)
  }
})

test('A safe commander heals the last missing health point instead of waiting', async () => {
  for (const level of Object.keys(BOT_LEVELS) as BotDifficulty[]) {
    const state = battle([
      new King(1, 0, 0, 'enemy'),
      new Swordsman(2, 1, 0, 'enemy', 4),
      new Swordsman(3, 3, 1, 'enemy'),
      new Archer(4, 4, 1, 'enemy'),
      new King(5, -6, 6, 'player'),
      new Swordsman(6, -6, 5, 'player'),
      new Swordsman(7, -5, 5, 'player'),
      new Swordsman(8, -4, 5, 'player'),
    ])
    const ally = (await playTurn(state, level)).pawns.find((p) => p.id === 2)!
    assert.equal(ally.hp, ally.maxHp, level)
  }
})

test('King safety includes a move followed by Charge, and refreshed enemy energy', async () => {
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
    const next = await playTurn(state, 'easy')
    assert.ok(hexDist(next.pawns[0], next.pawns[2]) > 4)
  }
})

test('AI uses Aimed shot rather than gambling on an escaping king', async () => {
  const state = battle([
    new Archer(1, 0, 0, 'enemy'),
    new King(2, -6, 0, 'enemy'),
    new King(3, 2, 0, 'player', 2, 3, 60),
  ])
  assert.deepEqual(await chooseBotActions(state), [{ type: 'special', target: { q: 2, r: 0 } }])
})

test('Analysis is deterministic, immutable, configurable and independent of the real Escape stream', async () => {
  const state = battle([
    new Archer(1, 0, 0, 'enemy'),
    new King(2, -6, 0, 'enemy'),
    new King(3, 2, 0, 'player', 4, 3, 60),
  ])
  const original = structuredClone(state)
  const actions = await chooseBotActions(state)
  for (let randomState = 0; randomState < 10; randomState++)
    assert.deepEqual(await chooseBotActions({ ...state, randomState }), actions)
  assert.deepEqual(structuredClone(state), original)
  assert.deepEqual(await chooseBotActions(state, { ...BOT_LEVELS.normal }), actions)
  for (const options of [
    { ...BOT_LEVELS.normal, depth: 0 },
    { ...BOT_LEVELS.normal, beamWidth: 0 },
    { ...BOT_LEVELS.normal, riskAppetite: NaN },
    { ...BOT_LEVELS.normal, latitude: 1000 },
  ])
    await assert.rejects(
      chooseBotActions(state, options as typeof BOT_LEVELS.normal),
      /Invalid bot options/,
    )
})

test('Hard lookahead can move then deliver a winning blow', async () => {
  const state = battle([
    new Archer(1, 0, 0, 'enemy'),
    new King(2, -6, 0, 'enemy'),
    new King(3, 1, 0, 'player', 2),
  ])
  assert.equal((await playTurn(state, 'hard')).winner, 'enemy')
})
