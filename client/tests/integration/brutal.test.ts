import { test } from 'node:test'
import { assertBrutalWinnable } from '../campaign-actions.ts'

test('Brutal encounters 1 to 10 stay winnable against the hard AI', async () => {
  await assertBrutalWinnable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
})
