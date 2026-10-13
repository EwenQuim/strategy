import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { relative } from 'node:path'
import stylelint from 'stylelint'

const client = fileURLToPath(new URL('../', import.meta.url))
const baselinePath = new URL('../color-lint-baseline.json', import.meta.url)

export function compareFindings(findings, baseline) {
  const counts = new Map()
  return findings.filter((finding) => {
    const key = JSON.stringify([finding.file, finding.rule, finding.message])
    const count = (counts.get(key) ?? 0) + 1
    counts.set(key, count)
    return count > (baseline[key] ?? 0)
  })
}

export function countFindings(findings) {
  const counts = {}
  for (const finding of findings) {
    const key = JSON.stringify([finding.file, finding.rule, finding.message])
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)))
}

export async function collectFindings(paths = ['src'], cssFiles = 'src/**/*.css') {
  let output
  try {
    output = execFileSync(
      fileURLToPath(new URL('../node_modules/.bin/oxlint', import.meta.url)),
      ['--config', 'color-lint.oxlint.json', '--format', 'json', ...paths],
      { cwd: client, encoding: 'utf8' },
    )
  } catch (error) {
    if (error.status !== 1 || !error.stdout) throw error
    output = error.stdout
  }
  const diagnostics = JSON.parse(output).diagnostics
  const colorRules = new Set([
    'color-literals(no-literal)',
    'better-tailwindcss(no-restricted-classes)',
  ])
  if (diagnostics.some((diagnostic) => !colorRules.has(diagnostic.code))) {
    throw new Error('Unexpected Oxlint diagnostic; do not baseline tooling or syntax errors.')
  }
  const findings = diagnostics.map((diagnostic) => ({
    file: diagnostic.filename,
    line: diagnostic.labels[0]?.span.line ?? 1,
    column: diagnostic.labels[0]?.span.column ?? 1,
    rule: diagnostic.code,
    message: diagnostic.message,
  }))
  const css = await stylelint.lint({ files: cssFiles, cwd: client })
  if (
    css.results.some(
      (result) => result.parseErrors.length || result.invalidOptionWarnings.length,
    )
  ) {
    throw new Error('Stylelint could not parse the source or configuration.')
  }
  for (const result of css.results) {
    for (const warning of result.warnings) {
      findings.push({
        file: relative(client, result.source),
        line: warning.line,
        column: warning.column,
        rule: warning.rule,
        message: warning.text,
      })
    }
  }
  return findings.sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column,
  )
}

async function main() {
  const mode = process.argv[2]
  if (mode && !['--report', '--strict', '--update-baseline'].includes(mode)) {
    throw new Error(`Unknown color lint option: ${mode}`)
  }
  const findings = await collectFindings()
  if (mode === '--update-baseline') {
    writeFileSync(baselinePath, JSON.stringify(countFindings(findings), null, 2) + '\n')
    console.log(
      `Recorded ${findings.length} existing color findings. Review the baseline diff.`,
    )
    return
  }
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
  const newFindings = compareFindings(findings, baseline)
  const visible = mode ? findings : newFindings
  for (const finding of visible) {
    console.log(
      `${finding.file}:${finding.line}:${finding.column} ${finding.rule}: ${finding.message}`,
    )
  }
  console.log(`${findings.length} color findings, ${newFindings.length} outside the baseline.`)
  if (mode !== '--report' && (mode === '--strict' ? findings.length : newFindings.length)) {
    process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
