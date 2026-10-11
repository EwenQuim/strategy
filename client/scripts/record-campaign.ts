import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import { CAMPAIGNS } from '../src/lib/campaign.ts'
import { activePawn, initialState, reducer, type Action } from '../src/lib/engine/index.ts'
import { DepthsearchBot } from '../src/bots/strategies/depthsearch.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { campaignActions } from '../tests/campaign-actions.ts'

// Run locally after authoring encounters; copy the emitted entries into campaign-victories.json.
// CI replays these solutions without running a potentially lengthy balancing search.
const [slug, ...ids] = process.argv.slice(2)
const entries: Record<string, [string, string]> = {}
const packs = CAMPAIGNS.filter((pack) => !slug || pack.slug === slug)
if (!packs.length) throw new Error('Unknown campaign: ' + slug)
const command = (action: Action): string => {
  if (action.type === 'endTurn') return 'e'
  if (action.type === 'move') return `m,${action.q},${action.r}`
  if (action.type === 'special' && action.target)
    return (
      `s,${action.target.q},${action.target.r}` +
      (action.destination ? `,${action.destination.q},${action.destination.r}` : '')
    )
  throw new Error('Cannot record ' + JSON.stringify(action))
}
for (const pack of packs) {
  for (const level of pack.levels.filter(
    (level) => !ids.length || ids.includes(String(level.id)),
  )) {
    let victory: Action[] | undefined
    for (const caution of [0.25, 0.7, 1, 1.5, 2]) {
      let state = initialState(level.seed, level.setup, 'player')
      const actions: Action[] = []
      for (let turn = 0; turn < 600 && !state.winner && state.round < 45; turn++) {
        const next =
          activePawn(state)!.side === 'player'
            ? await campaignActions(state, caution)
            : await new DepthsearchBot(BOT_LEVELS[level.difficulty]).chooseActions(state)
        for (const action of next) {
          const applied = reducer(state, action)
          if (applied === state) throw new Error('Invalid recorded action')
          state = applied
          actions.push(action)
        }
      }
      if (state.winner === 'player') {
        victory = actions
        break
      }
    }
    if (!victory) throw new Error(`No scripted victory for ${pack.slug}:${level.id}`)
    entries[`${pack.slug}:${level.id}`] = [
      createHash('sha256')
        .update(JSON.stringify([level.seed, level.setup]))
        .digest('hex')
        .slice(0, 16),
      deflateSync(victory.map(command).join(';')).toString('base64'),
    ]
    console.error(`Solved ${pack.slug}:${level.id}`)
  }
}
console.log(JSON.stringify(entries, null, 2))
