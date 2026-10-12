import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { inflateSync } from 'node:zlib'
import victories from './campaign-victories.json' with { type: 'json' }
import { CAMPAIGNS, type CampaignLevel } from '../src/lib/campaign.ts'
import { initialState, reducer, type Action } from '../src/lib/engine/index.ts'

// Both armies' commands are recorded. Hashes bind setups and campaign depth overrides.
// Regenerate with make record-campaign ARGS="<pack> [level ...]". Compressed commands:
// e = end turn; m,q,r = move; s,q,r[,destinationQ,destinationR] = ability.
export function victoryActions(level: CampaignLevel): Action[] {
  const pack = CAMPAIGNS.find((pack) => pack.levels.includes(level))!
  const entry = (victories as Record<string, string[]>)[`${pack.slug}:${level.id}`]
  assert.ok(entry, `Missing victory for ${pack.slug}:${level.id}`)
  const [setup, encoded] = entry
  assert.equal(
    createHash('sha256')
      .update(
        JSON.stringify([
          level.seed,
          level.setup,
          ...(pack.depth !== undefined ? [pack.depth] : []),
        ]),
      )
      .digest('hex')
      .slice(0, 16),
    setup,
    'Victory fixture must match authored setup',
  )
  const commands = inflateSync(Buffer.from(encoded, 'base64')).toString().split(';')
  return commands.map((command) => {
    const [kind, ...values] = command.split(',')
    const [q, r, dq, dr] = values.map(Number)
    assert.ok(['e', 'm', 's'].includes(kind), `Unknown command ${command}`)
    assert.ok(values.every((value) => value !== '' && Number.isInteger(Number(value))))
    return kind === 'e'
      ? { type: 'endTurn' }
      : kind === 'm'
        ? { type: 'move', q, r }
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
