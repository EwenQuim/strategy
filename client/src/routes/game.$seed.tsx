import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { Game } from '../components/Game'
import { parseBotConfig } from '../bots/catalog'
import { parseSideBots } from '../bots/participants'
import { markTutorialSeen, readTutorialSeen } from '../tutorial'

export const Route = createFileRoute('/game/$seed')({
  beforeLoad: ({ params }) => {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(params.seed)) throw redirect({ to: '/' })
  },
  remountDeps: ({ params, search }) => [params.seed, search],
  component: function RandomBattle() {
    const { seed } = Route.useParams()
    const search = Route.useSearch()
    const [tutorialSeen] = useState(readTutorialSeen)
    return (
      <Game
        seed={seed}
        mode={search.mode}
        bot={parseBotConfig(search.bot)}
        sideBots={parseSideBots(search.sideBots)}
        setup={search.setup}
        tour={search.mode === 'ai' && !search.setup && !tutorialSeen}
        onTourDone={markTutorialSeen}
      />
    )
  },
})
