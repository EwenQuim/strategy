import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { collectFindings, compareFindings, countFindings } from '../scripts/lint-colors.mjs'

test('color baseline ignores lines, rejects growth and must shrink', () => {
  const existing = { file: 'src/button.tsx', color: '#fff', line: 1 }
  const baseline = countFindings([existing, existing])
  assert.deepEqual(compareFindings([existing, { ...existing, line: 20 }], baseline), {
    added: [],
    stale: [],
  })
  assert.equal(compareFindings([existing, existing, existing], baseline).added.length, 1)
  assert.equal(compareFindings([{ ...existing, color: '#abc' }], baseline).added.length, 1)
  assert.equal(
    compareFindings([{ ...existing, file: 'src/new.tsx' }], baseline).added.length,
    1,
  )
  assert.deepEqual(compareFindings([existing], baseline).stale, [
    { file: 'src/button.tsx', color: '#fff' },
  ])
})

test('color literals are found in scripts and styles, token definitions are not', () => {
  const directory = mkdtempSync(join(tmpdir(), 'hexmate-color-lint-'))
  const tsx = join(directory, 'fixture.tsx')
  const css = join(directory, 'fixture.css')
  try {
    writeFileSync(
      tsx,
      `
      const buttonClassName = 'bg-[#123456] text-[11px] min-[900px]:p-3'
      const theme = { '--biome-background': '#654321' }
      const view = <div className={buttonClassName + ' shadow-[0_2px_#abcdef]'}>
        <svg fill="#fedcba" style={{ color: 'oklch(70% 0.2 30)' }} />
        <span className={\`bg-[#987654] text-ink\`} />
      </div>
      void theme; void view
    `,
    )
    writeFileSync(
      css,
      `
      @theme { --color-test: oklch(60% 0.1 30); }
      :root { --ink: #654321; }
      /* color: #111111 */
      a:hover { color: var(--ink); width: 11px; }
      .bad { color: #123456; box-shadow: 0 0 2px rgb(0 0 0); }
    `,
    )
    const colors = collectFindings([tsx], [css]).map(({ color }) => color)
    assert.deepEqual(colors.toSorted(), [
      '#123456',
      '#123456',
      '#987654',
      '#abcdef',
      '#fedcba',
      'oklch(70% 0.2 30)',
      'rgb(0 0 0)',
    ])
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
