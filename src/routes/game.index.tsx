import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/game/')({
  beforeLoad: () => {
    throw redirect({
      to: '/game/$seed',
      params: { seed: crypto.randomUUID() },
      replace: true,
    })
  },
})
