import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/game/')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/game/$seed',
      params: { seed: crypto.randomUUID() },
      search,
      replace: true,
    })
  },
})
