import { createFileRoute, redirect } from '@tanstack/react-router'
import { Game } from '../components/Game'

export const Route = createFileRoute('/game/$seed')({
  beforeLoad: ({ params }) => {
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(params.seed)) throw redirect({ to: '/' })
  },
  remountDeps: ({ params, search }) => [params.seed, search],
  component: function RandomBattle() {
    const { seed } = Route.useParams()
    const { mode, difficulty, setup } = Route.useSearch()
    return <Game seed={seed} mode={mode} difficulty={difficulty} setup={setup} />
  },
})
