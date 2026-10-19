import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  activePawn,
  initialState,
  isImpactFrame,
  symmetricSeed,
  transition,
  type BattleFrame,
  type GameState,
  type Side,
} from '../../src/lib/engine/index.ts'
import { BOT_LEVELS } from '../../src/lib/engine/ai.ts'
import { DepthsearchBot } from '../../src/bots/strategies/depthsearch.ts'
import { NapoleonBot, NAPOLEON_LEVELS } from '../../src/bots/strategies/napoleon.ts'
import { HannibalBot } from '../../src/bots/strategies/hannibal.ts'
import type { Bot } from '../../src/bots/bot.ts'
import { TurtleBot } from '../../scripts/turtle-bot.ts'
import {
  matchMetrics,
  nearestEnemyDistance,
  roundTelemetry,
  type MatchMetrics,
  type RoundTelemetry,
} from '../../scripts/gameplay-metrics.ts'

// The gameplay benchmark's numbers are only comparable across rule changes if the telemetry
// stays faithful to the engine. These tests replay real bot matches through transition() and
// cross-check every round against the frames the engine itself recorded.

const SETUP = {
  biome: 'desert',
  player: ['king', 'swordsman', 'archer', 'ninja', 'lancer'],
  enemy: ['king', 'swordsman', 'archer', 'ninja', 'lancer'],
} as const

type Recorded = {
  metrics: MatchMetrics
  telemetry: RoundTelemetry[]
  frames: BattleFrame[][]
  states: GameState[]
}

// The same loop as scripts/bench-gameplay.ts playMatch, but through transition() to keep frames.
async function recordMatch(playerBot: Bot, enemyBot: Bot): Promise<Recorded> {
  let state: GameState = initialState(symmetricSeed('alpha'), SETUP, 'player')
  const telemetry: RoundTelemetry[] = []
  const roundFrames: BattleFrame[][] = []
  const states: GameState[] = []
  let snapshotRound = state.round
  let blowsFrom = 0
  let moves = 0
  let retreats = 0
  let frames: BattleFrame[] = []
  for (let turn = 0; turn < 240 && !state.winner; turn++) {
    const acting: Side = activePawn(state)!.side
    const actions = await (acting === 'player' ? playerBot : enemyBot).chooseActions(state)
    for (const action of actions) {
      const actor = activePawn(state)
      const before = actor ? nearestEnemyDistance(state, actor) : 0
      const step = transition(state, action)
      assert.notEqual(step.state, state, 'Illegal action during telemetry recording')
      if (action.type === 'move' && actor) {
        moves++
        const moved = step.state.pawns.find((pawn) => pawn.id === actor.id)
        if (moved && nearestEnemyDistance(step.state, moved) > before) retreats++
      }
      frames.push(...step.frames)
      state = step.state
    }
    if (state.round !== snapshotRound || state.winner) {
      telemetry.push(
        roundTelemetry(
          state,
          state.round !== snapshotRound ? snapshotRound : state.round,
          blowsFrom,
          moves,
          retreats,
        ),
      )
      roundFrames.push(frames)
      states.push(state)
      blowsFrom = state.blows.length
      snapshotRound = state.round
      moves = 0
      retreats = 0
      frames = []
    }
  }
  return {
    metrics: matchMetrics('alpha', 'player', 'enemy', telemetry, state),
    telemetry,
    frames: roundFrames,
    states,
  }
}

function crossCheck(recorded: Recorded) {
  let alive = 10
  for (let i = 0; i < recorded.telemetry.length; i++) {
    const round = recorded.telemetry[i]
    const damaged = recorded.frames[i].some((frame) =>
      isImpactFrame(frame) ? frame.effect!.impacts!.some((hit) => hit.damage > 0) : false,
    )
    assert.equal(
      round.clash,
      damaged,
      `round ${round.round}: clash flag must match frame damage`,
    )
    const living = recorded.states[i].pawns.filter((pawn) => pawn.hp > 0).length
    assert.equal(
      round.kills,
      alive - living,
      `round ${round.round}: kills must match fallen pawns`,
    )
    alive = living
  }
  const contact = recorded.telemetry.find((round) => round.clash)
  const firstKill = recorded.telemetry.find((round) => round.kills > 0)
  if (contact && firstKill) assert.ok(contact.round <= firstKill.round)
  return recorded
}

test('Telemetry matches the engine frames of an aggressive match, identically across replays', async () => {
  const play = () =>
    recordMatch(new DepthsearchBot(BOT_LEVELS.normal), new NapoleonBot(NAPOLEON_LEVELS.hard))
  const first = crossCheck(await play())
  const second = await play()
  assert.deepEqual(second.metrics, first.metrics)
  assert.deepEqual(second.telemetry, first.telemetry)
  assert.ok(
    first.telemetry.some((round) => round.clash),
    'the aggressive match must make contact',
  )
})

test('Telemetry exposes the hannibal standoff against the turtle probe', async () => {
  const standoff = crossCheck(await recordMatch(new HannibalBot(), new TurtleBot()))
  assert.ok(standoff.metrics.maxStallStreak > 3, 'the standoff must register long stalls')
  assert.ok(
    standoff.telemetry.every((round) => !round.clash),
    'hannibal never attacks the turtle',
  )
})
