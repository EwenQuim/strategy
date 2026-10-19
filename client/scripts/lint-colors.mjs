import { execFileSync } from 'node:child_process'
import { globSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { literalColor } from './color-literals-plugin.mjs'

const client = fileURLToPath(new URL('../', import.meta.url))
const baselinePath = new URL('../color-lint-baseline.json', import.meta.url)

function lintScripts(paths) {
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
  if (diagnostics.some((diagnostic) => diagnostic.code !== 'color-literals(no-literal)')) {
    throw new Error('Unexpected Oxlint diagnostic; do not baseline tooling or syntax errors.')
  }
  return diagnostics.map((diagnostic) => ({
    file: diagnostic.filename,
    line: diagnostic.labels[0]?.span.line ?? 1,
    color: diagnostic.message,
  }))
}

function lintStyles(file) {
  const source = readFileSync(resolve(client, file), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    (comment) => comment.replace(/[^\n]/g, ' '),
  )
  const findings = []
  for (const declaration of source.matchAll(/([\w-]+)\s*:([^;{}]*)/g)) {
    if (declaration[1].startsWith('--')) continue
    const valueOffset = declaration.index + declaration[0].length - declaration[2].length
    for (const match of declaration[2].matchAll(literalColor)) {
      const line = source.slice(0, valueOffset + match.index).split('\n').length
      findings.push({ file, line, color: match[0] })
    }
  }
  return findings
}

export function collectFindings(
  scriptPaths = ['src'],
  styleFiles = globSync('src/**/*.css', { cwd: client }),
) {
  return [...lintScripts(scriptPaths), ...styleFiles.flatMap(lintStyles)].sort(
    (a, b) => a.file.localeCompare(b.file) || a.line - b.line,
  )
}

export function countFindings(findings) {
  const counts = {}
  for (const { file, color } of findings) {
    counts[file] ??= {}
    counts[file][color] = (counts[file][color] ?? 0) + 1
  }
  const sorted = (entries) => Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)))
  return sorted(
    Object.entries(counts).map(([file, colors]) => [file, sorted(Object.entries(colors))]),
  )
}

export function compareFindings(findings, baseline) {
  const counts = countFindings(findings)
  const seen = {}
  const added = findings.filter(({ file, color }) => {
    const key = JSON.stringify([file, color])
    seen[key] = (seen[key] ?? 0) + 1
    return seen[key] > (baseline[file]?.[color] ?? 0)
  })
  const stale = Object.entries(baseline).flatMap(([file, colors]) =>
    Object.entries(colors)
      .filter(([color, count]) => (counts[file]?.[color] ?? 0) < count)
      .map(([color]) => ({ file, color })),
  )
  return { added, stale }
}

function main() {
  const mode = process.argv[2]
  if (mode && !['--report', '--update-baseline'].includes(mode)) {
    throw new Error(`Unknown color lint option: ${mode}`)
  }
  const findings = collectFindings()
  if (mode === '--update-baseline') {
    writeFileSync(baselinePath, JSON.stringify(countFindings(findings), null, 2) + '\n')
    console.log(`Recorded ${findings.length} color literals. Review the baseline diff.`)
    return
  }
  const { added, stale } = compareFindings(
    findings,
    JSON.parse(readFileSync(baselinePath, 'utf8')),
  )
  for (const { file, line, color } of mode === '--report' ? findings : added) {
    console.log(`${file}:${line} color literal ${color}`)
  }
  if (mode === '--report') {
    console.log(`${findings.length} color literals.`)
    return
  }
  for (const { file, color } of stale) {
    console.log(`${file} no longer uses ${color} as often as the baseline allows`)
  }
  if (added.length) {
    console.log(
      `${added.length} new color literals: move them to a theme token in src/index.css.`,
    )
  }
  if (stale.length) {
    console.log('The baseline only shrinks: run `npm run lint:colors -- --update-baseline`.')
  }
  if (added.length || stale.length) process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main()
