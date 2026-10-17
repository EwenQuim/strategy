import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'
import { CAMPAIGNS } from '../src/campaign.ts'
import { campaignBot } from '../src/bots/campaign.ts'
import { activePawn, initialState, reducer, type Action } from '../src/lib/engine/index.ts'
import { getBot } from '../src/bots/catalog.ts'
import { campaignActions } from '../tests/campaign-actions.ts'
import { NapoleonBot, NAPOLEON_LEVELS } from '../src/bots/strategies/napoleon.ts'

// Run locally after authoring encounters; --write updates only solved fixture entries.
// CI replays these solutions without running a potentially lengthy balancing search.
const args = process.argv.slice(2)
const write = args.includes('--write')
const [slug, ...ids] = args.filter((arg) => arg !== '--write')
const entries: Record<string, [string, string]> = {}
const unsolved: string[] = []
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
  if (action.type === 'special' && action.destination)
    return `j,${action.destination.q},${action.destination.r}`
  throw new Error('Cannot record ' + JSON.stringify(action))
}
for (const pack of packs) {
  for (const level of pack.levels.filter(
    (candidate) => !ids.length || ids.includes(String(candidate.id)),
  )) {
    const enemyBot = getBot(campaignBot(pack, level))
    let victory: Action[] | undefined
    for (const caution of [
      0.25,
      0.7,
      1,
      1.5,
      2,
      'napoleon',
      'napoleon-bold',
      'napoleon-careful',
      'napoleon-wide',
    ] as const) {
      let state = initialState(level.seed, level.setup, 'player')
      const actions: Action[] = []
      for (let turn = 0; turn < 600 && !state.winner && state.round < 45; turn++) {
        const next =
          activePawn(state)!.side === 'player'
            ? typeof caution === 'number'
              ? await campaignActions(state, caution)
              : await new NapoleonBot({
                  ...NAPOLEON_LEVELS.brutal,
                  aggression: caution === 'napoleon-bold' ? 2 : 1,
                  caution: caution === 'napoleon-careful' ? 1.5 : 1,
                  candidates: caution === 'napoleon-wide' ? 24 : 12,
                  replies: caution === 'napoleon-wide' ? 4 : 3,
                }).chooseActions(state)
            : await enemyBot.chooseActions(state)
        for (const action of next) {
          const applied = reducer(state, action)
          if (applied === state) throw new Error('Invalid recorded action')
          state = applied
          actions.push(action)
        }
      }
      if (state.winner === 'player') {
        victory = actions
        console.error(
          `Solved ${pack.slug}:${level.id} at caution ${caution}: ${state.pawns.filter((p) => p.side === 'player').length}/${level.setup.player.length} survivors, King ${state.pawns.find((p) => p.side === 'player' && p.kind === 'king')!.hp} HP`,
        )
        break
      }
    }
    if (!victory) {
      unsolved.push(`${pack.slug}:${level.id}`)
      console.error(`No scripted victory for ${pack.slug}:${level.id}`)
      continue
    }
    entries[`${pack.slug}:${level.id}`] = [
      createHash('sha256')
        .update(JSON.stringify([level.seed, level.setup, level.bot]))
        .digest('hex')
        .slice(0, 16),
      deflateSync(victory.map(command).join(';')).toString('base64'),
    ]
  }
}
if (write) {
  const path = new URL('../tests/campaign-victories.json', import.meta.url)
  const existing = JSON.parse(readFileSync(path, 'utf8')) as Record<string, [string, string]>
  writeFileSync(path, JSON.stringify({ ...existing, ...entries }, null, 2) + '\n')
} else console.log(JSON.stringify(entries, null, 2))
if (unsolved.length) throw new Error('No scripted victory for ' + unsolved.join(', '))
