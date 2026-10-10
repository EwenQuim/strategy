import { test } from 'node:test'
import { assertBrutalWinnable } from '../campaign-actions.ts'

test('Brutal encounters 11 to 20 stay winnable against the hard AI', async () => {
  await assertBrutalWinnable([11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
})
