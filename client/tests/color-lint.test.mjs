import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  collectFindings,
  compareFindings,
  countFindings,
  updateBaseline,
} from '../scripts/lint-colors.mjs'

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
  assert.deepEqual(updateBaseline([existing], baseline), countFindings([existing]))
  assert.throws(() => updateBaseline([existing, existing, existing], baseline), /cannot add/)
  assert.throws(() => updateBaseline([{ ...existing, color: '#abc' }], baseline), /cannot add/)
  assert.throws(
    () => updateBaseline([{ ...existing, file: 'src/new.tsx' }], baseline),
    /cannot add/,
  )
})

test('artwork can move without baseline entries while UI literals remain guarded', () => {
  const directory = mkdtempSync(join(tmpdir(), 'hexmate-color-lint-'))
  try {
    const features = join(directory, 'components', 'features')
    mkdirSync(features, { recursive: true })
    const illustration = join(features, 'Rune.tsx')
    const original = join(directory, 'palette.ts')
    const moved = join(directory, 'moved.ts')
    const chrome = join(directory, 'button.tsx')
    writeFileSync(illustration, 'export const rune = <path fill="#123456" />')
    const palette = 'export const runePalette = { glow: "#abcdef" }'
    writeFileSync(original, palette)
    writeFileSync(moved, palette)
    writeFileSync(chrome, 'export const button = <button className="bg-[#987654]" />')
    assert.deepEqual(collectFindings([illustration, original], []), [])
    assert.deepEqual(collectFindings([illustration, moved], []), [])
    assert.deepEqual(
      collectFindings([chrome], []).map(({ color }) => color),
      ['#987654'],
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
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
      const artPalette = { highlight: '#112233' }
      const channels = 'rgb(var(--channels))'
      const nested = 'rgb(calc(100 + 20) 0 0)'
      const link = 'https://example.com/#abcdef'
      const sprite = 'url(#fedcba)'
      class Pawn { static accent = '#445566' }
      const view = <div className={buttonClassName + ' shadow-[0_2px_#abcdef]'}>
        <svg fill="#fedcba" style={{ color: 'oklch(70% 0.2 30)' }} />
        <span className={\`bg-[#987654] text-ink\`} />
        <a href="#aabbcc" id="abc123">link</a>
      </div>
      void theme; void view; void artPalette; void channels; void nested; void link; void sprite; void Pawn
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
      .tokens { color: rgb(var(--channels)); fill: url(#abcdef); }
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
      'rgb(calc(100 + 20) 0 0)',
    ])
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
