import { createFileRoute, redirect } from '@tanstack/react-router'
import { QuickPlayTutorial } from '../components/Briefing'
import { Game } from '../components/Game'
import { botFromSearch } from '../lib/game-mode'

export const Route = createFileRoute('/game/$seed')({
  beforeLoad: ({ params }) => {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(params.seed)) throw redirect({ to: '/' })
  },
  remountDeps: ({ params, search }) => [params.seed, search],
  component: function RandomBattle() {
    const { seed } = Route.useParams()
    const search = Route.useSearch()
    return (
      <>
        <Game seed={seed} mode={search.mode} bot={botFromSearch(search)} setup={search.setup} />
        {search.mode === 'ai' && !search.setup && <QuickPlayTutorial />}
      </>
    )
  },
})
