import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import victories from './campaign-victories.json' with { type: 'json' }
import { CAMPAIGNS, type CampaignLevel } from '../src/campaign.ts'
import { activePawn, initialState, reducer, type Action } from '../src/lib/engine/index.ts'
import { getBot } from '../src/bots/catalog.ts'

// Both armies' commands are recorded. Hashes bind setups and authored bot configurations.
// Regenerate with make record-campaign ARGS="<pack> [level ...]". Compressed commands:
// e = end turn; m,q,r = move; s,q,r[,destinationQ,destinationR] = ability; j,q,r = ability to a
// chosen tile without a target.
export function victoryActions(level: CampaignLevel): Action[] {
  const pack = CAMPAIGNS.find((candidate) => candidate.levels.includes(level))!
  const entry = (victories as Record<string, string[]>)[`${pack.slug}:${level.id}`]
  assert.ok(entry, `Missing victory for ${pack.slug}:${level.id}`)
  const [setup, encoded] = entry
  assert.equal(
    createHash('sha256')
      .update(JSON.stringify([level.seed, level.setup, level.bot]))
      .digest('hex')
      .slice(0, 16),
    setup,
    'Victory fixture must match authored setup',
  )
  const commands = inflateSync(Buffer.from(encoded, 'base64')).toString().split(';')
  return commands.map((command) => {
    const [kind, ...values] = command.split(',')
    const [q, r, dq, dr] = values.map(Number)
    assert.ok(['e', 'm', 's', 'j'].includes(kind), `Unknown command ${command}`)
    assert.ok(values.every((value) => value !== '' && Number.isInteger(Number(value))))
    return kind === 'e'
      ? { type: 'endTurn' }
      : kind === 'm'
        ? { type: 'move', q, r }
        : kind === 'j'
          ? { type: 'special', destination: { q, r } }
          : {
              type: 'special',
              target: { q, r },
              ...(values.length > 2 ? { destination: { q: dq, r: dr } } : {}),
            }
  })
}

export function replayVictory(level: CampaignLevel) {
  let state = initialState(level.seed, level.setup, 'player')
  for (const action of victoryActions(level)) {
    const next = reducer(state, action)
    assert.notEqual(next, state, `Invalid ${JSON.stringify(action)} in ${level.seed}`)
    state = next
  }
  assert.equal(state.winner, 'player', `${level.seed} replay must win`)
  return state
}

// Play the recorded human turns against a fresh bot. Recorded enemy commands only delimit
// the original activations; they cannot turn a weaker historical bot into a passing victory.
export async function replayAgainstBot(level: CampaignLevel) {
  let recorded = initialState(level.seed, level.setup, 'player')
  let live = recorded
  const bot = getBot(level.bot)
  const actions = victoryActions(level)
  for (let index = 0; index < actions.length && !live.winner;) {
    const actor = activePawn(recorded)!
    const round = recorded.round
    const commands: Action[] = []
    do {
      const action = actions[index++]
      commands.push(action)
      recorded = reducer(recorded, action)
    } while (
      index < actions.length &&
      !recorded.winner &&
      recorded.round === round &&
      activePawn(recorded)?.id === actor.id
    )
    assert.equal(activePawn(live)?.id, actor.id, `${level.seed}: live initiative diverged`)
    const chosen = actor.side === 'player' ? commands : await bot.chooseActions(live)
    for (const action of chosen) {
      const next = reducer(live, action)
      assert.notEqual(next, live, `${level.seed}: live victory uses an invalid action`)
      live = next
    }
  }
  assert.equal(
    live.winner,
    'player',
    `${level.seed}: recorded player must beat the actual configured bot`,
  )
  return live
}
