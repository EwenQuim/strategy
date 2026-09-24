import assert from 'node:assert/strict'
import { test } from 'node:test'
import { battleMessage } from '../src/lib/game-mode.ts'
import type { OnlineAction, StoredGame } from '../src/lib/online.ts'
import { initialPlayback, playbackReducer, replay } from '../src/lib/playback.ts'
import { readStoredGames, saveStoredGame } from '../src/onlineSession.ts'
import { activePawn } from '../src/lib/engine/index.ts'

test('Online mode applies actions like local mode, without a bot', () => {
  const seed = 'online-seed-1'
  let playback = initialPlayback(seed, 'online')
  const actions: OnlineAction[] = []
  for (let turn = 0; turn < 8; turn++) {
    const pawn = activePawn(playback.state)
    if (!pawn) throw new Error('no active pawn')
    actions.push({ side: pawn.side, action: { type: 'endTurn' } })
    playback = playbackReducer(playback, { type: 'endTurn' }, 'online')
  }
  assert.deepEqual(replay(seed, actions), playback.state)
  const resynced = playbackReducer(
    initialPlayback(seed, 'online'),
    { type: 'resync', actions },
    'online',
  )
  assert.deepEqual(resynced.state, playback.state)
  assert.equal(resynced.frames.length, 0)
})

test('Resync replaces a stale local move with the server action log', () => {
  const seed = 'online-seed-2'
  const serverActions: OnlineAction[] = [{ side: 'player', action: { type: 'endTurn' } }]
  let local = initialPlayback(seed, 'online')
  local = playbackReducer(local, { type: 'endTurn' }, 'online')
  const moved = playbackReducer(local, { type: 'move', q: 0, r: 0 }, 'online')
  const resynced = playbackReducer(moved, { type: 'resync', actions: serverActions }, 'online')
  assert.deepEqual(resynced.state, replay(seed, serverActions))
})

test('Online battle messages use the two player names', () => {
  const names = { player: 'Ewen', enemy: 'Bob' }
  assert.equal(
    battleMessage('The battle begins. Protect your crown.', 'online', names),
    'The battle begins. Ewen is green; Bob is red.',
  )
  assert.equal(
    battleMessage('The enemy crown has fallen. Victory!', 'online', names),
    "Bob's king has fallen. Ewen wins!",
  )
  assert.equal(
    battleMessage('Your crown has fallen.', 'online', names),
    "Ewen's king has fallen. Bob wins!",
  )
  assert.equal(
    battleMessage('Your swordsman ends turn: +2% escape.', 'online', names),
    "Ewen's swordsman ends turn: +2% escape.",
  )
})

const storage = new Map<string, string>()
const localStorageStub = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => void storage.set(key, value),
  removeItem: (key: string) => void storage.delete(key),
}
Object.assign(globalThis, { localStorage: localStorageStub })

test('Stored online games round-trip and ignore corrupted entries', () => {
  assert.deepEqual(readStoredGames(), [])
  const game: StoredGame = { code: 'AB3F9K', token: 'secret', side: 'player' }
  saveStoredGame(game)
  assert.deepEqual(readStoredGames(), [game])
  saveStoredGame({ ...game, side: 'enemy' })
  assert.equal(readStoredGames().length, 1)

  storage.set('hexmate.online.games', JSON.stringify([game, { code: 'NOPE12' }, 'junk', null]))
  assert.deepEqual(readStoredGames(), [game])
  storage.set('hexmate.online.games', 'not json')
  assert.deepEqual(readStoredGames(), [])
})
