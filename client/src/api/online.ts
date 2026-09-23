import { getGame, useCreateGame, useGetGame, useJoinGame } from '../../generated/sdk.gen.ts'
import type { PublicGame } from '../../generated/sdk.gen.ts'
import type { Side } from '../lib/engine/pawns/pawn.ts'
import type { OnlineAction, OnlineGame, StoredGame } from '../lib/online.ts'

export { ApiError } from './client.ts'
export { useHealth } from '../../generated/sdk.gen.ts'

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

export function useOnlineGame(code: string, options?: Parameters<typeof useGetGame>[1]) {
  const query = useGetGame(code, options)
  return { ...query, data: query.data ? toOnlineGame(query.data as PublicGame) : undefined }
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
