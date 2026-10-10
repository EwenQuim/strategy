import { CAMPAIGNS } from '../src/lib/campaign.ts'
import { createBotGame } from '../tests/bot-game.ts'
import { campaignActions } from '../tests/campaign-actions.ts'

const LEVELS = [
  ['iron-throne', 8],
  ['war-of-the-ring', 6],
  ['iron-throne', 5],
  ['brutal', 19],
  ['brutal', 20],
] as const

for (const [slug, id] of LEVELS) {
  const level = CAMPAIGNS.find((pack) => pack.slug === slug)!.levels[id - 1]
  const bot = createBotGame({ name: 'depthsearch', difficulty: level.difficulty })
  let state = bot.initialState(level.seed, level.setup)
  const replies: number[] = []
  for (let step = 0; step < 300 && !state.winner; step++)
    for (const action of await campaignActions(state, 1)) {
      const started = performance.now()
      state = (await bot.transition(state, action)).state
      replies.push(performance.now() - started)
    }
  const average = replies.reduce((sum, time) => sum + time, 0) / replies.length
  console.log(
    `${level.name.padEnd(26)} worst ${Math.max(...replies).toFixed(0)} ms, average ${average.toFixed(1)} ms`,
  )
}
