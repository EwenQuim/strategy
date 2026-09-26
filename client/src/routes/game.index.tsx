import { createFileRoute, redirect } from '@tanstack/react-router'
import { symmetricSeed } from '../lib/engine'

export const Route = createFileRoute('/game/')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/game/$seed',
      params: {
        seed: search.symmetric ? symmetricSeed(crypto.randomUUID()) : crypto.randomUUID(),
      },
      search,
      replace: true,
    })
  },
})
