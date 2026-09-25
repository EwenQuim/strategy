import { useEffect, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getGame,
  getGetGameQueryKey,
  useCreateGame,
  useGetGame,
  useJoinGame,
} from '../../generated/sdk.gen.ts'
import { watchOnlineGame } from './events.ts'
import type { PublicGame } from '../../generated/sdk.gen.ts'
import type { Side } from '../lib/engine/pawns/pawn.ts'
import type { OnlineAction, OnlineGame, StoredGame } from '../lib/online.ts'

export { ApiError } from './client.ts'
const toOnlineGame = (game: PublicGame): OnlineGame => ({
  code: game.code,
  status: game.status as OnlineGame['status'],
  version: game.version,
  seed: game.seed,
  namePlayer: game.namePlayer,
  nameEnemy: game.nameEnemy,
  winner: (game.winner as Side | null) ?? null,
  actions: (game.actions ?? []) as OnlineAction[],
})

export const onlineGameQueryOptions = (code: string) => ({
  queryKey: ['online-game', code],
  queryFn: async () => fetchOnlineGame(code),
})

export function useOnlineGame(code: string, stream = false) {
  const client = useQueryClient()
  const query = useGetGame(code, {
    query: { staleTime: Infinity, refetchOnReconnect: false },
  })
  const live = stream && !!query.data && query.data.status !== 'finished'

  useEffect(() => {
    if (!live) return
    return watchOnlineGame(code, (data) => {
      client.setQueryData(getGetGameQueryKey(code), JSON.parse(data) as PublicGame)
    })
  }, [client, code, live])

  const data = useMemo(() => (query.data ? toOnlineGame(query.data) : undefined), [query.data])
  return { ...query, data }
}

export async function fetchOnlineGame(code: string): Promise<OnlineGame> {
  return toOnlineGame(await getGame(code))
}

export const useCreateOnlineGame = () => {
  const mutation = useCreateGame()
  return {
    ...mutation,
    mutateAsync: async (name: string): Promise<StoredGame> => {
      const creds = await mutation.mutateAsync({ data: { name } })
      return { code: creds.game.code, token: creds.token, side: 'player' }
    },
  }
}

export const useJoinOnlineGame = () => {
  const mutation = useJoinGame()
  return {
    ...mutation,
    mutateAsync: async (code: string, name: string): Promise<StoredGame> => {
      const creds = await mutation.mutateAsync({ code, data: { name } })
      return { code: creds.game.code, token: creds.token, side: 'enemy' }
    },
  }
}
