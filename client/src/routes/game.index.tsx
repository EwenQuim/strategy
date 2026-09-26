import { createFileRoute, redirect } from '@tanstack/react-router'
import { symmetricSeed } from '../lib/engine'
import { usesSymmetricField } from '../lib/game-mode'
import { readSymmetricPreference } from '../customPreferences'

export const Route = createFileRoute('/game/')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/game/$seed',
      params: {
        seed: usesSymmetricField(search, readSymmetricPreference())
          ? symmetricSeed(crypto.randomUUID())
          : crypto.randomUUID(),
      },
      search,
      replace: true,
    })
  },
})
