import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { collectFindings, compareFindings, countFindings } from '../scripts/lint-colors.mjs'

test('color baseline tracks file, rule, value and multiplicity, not line numbers', () => {
  const existing = { file: 'src/button.tsx', rule: 'color', message: '#fff', line: 1 }
  const baseline = countFindings([existing])
  assert.deepEqual(compareFindings([{ ...existing, line: 20 }], baseline), [])
  assert.equal(compareFindings([existing, existing], baseline).length, 1)
  assert.equal(compareFindings([{ ...existing, message: '#abc' }], baseline).length, 1)
  assert.equal(compareFindings([{ ...existing, file: 'src/new.tsx' }], baseline).length, 1)
  assert.equal(compareFindings([{ ...existing, rule: 'other' }], baseline).length, 1)
})

test('Oxlint and Stylelint detect color drift without banning arbitrary layout', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'hexmate-color-lint-'))
  const tsx = join(directory, 'fixture.tsx')
  const css = join(directory, 'fixture.css')
  try {
    writeFileSync(
      tsx,
      `
      const buttonClassName = 'bg-[#123456] hover:text-red-200'
      const cleanClassName = 'text-ink bg-(--biome-panel) text-[11px] min-[900px]:p-3'
      const theme = { '--biome-background': '#654321' }
      const view = <div className={buttonClassName + ' shadow-[0_2px_#abcdef]'}>
        <svg fill="#fedcba" style={{ color: 'oklch(70% 0.2 30)' }} />
        <span className={\`bg-[#987654] \${cleanClassName}\`} />
      </div>
      document.body.className = 'bg-[#aabbcc]'
      void theme; void view
    `,
    )
    writeFileSync(
      css,
      `
      @import 'tailwindcss';
      @theme { --color-test: oklch(70% 0.2 30); }
      :root { --ink: #654321; }
      .clean { color: var(--ink); background: transparent; width: 11px; fill: currentColor; }
      .bad { color: #123456; border: 1px solid red; box-shadow: 0 0 2px rgb(0 0 0); }
    `,
    )
    const findings = await collectFindings([tsx], css)
    const messages = findings.map((finding) => finding.message).join('\n')
    for (const value of [
      '#123456',
      'text-red-200',
      '#abcdef',
      '#fedcba',
      'oklch',
      '#987654',
      '#aabbcc',
      'red',
      'rgb',
    ]) {
      assert.ok(messages.includes(value), `Missing color diagnostic: ${value}`)
    }
    for (const value of ['#654321', '11px', '900px', 'currentColor', 'text-ink']) {
      assert.ok(!messages.includes(value), `Unexpected diagnostic: ${value}`)
    }
    assert.ok(
      !findings.some((finding) => finding.file.endsWith('fixture.css') && finding.line === 5),
    )
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
