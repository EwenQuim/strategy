import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { VALUE_FEATURES } from '../src/bots/valueFeatures.ts'

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as T
}

export function writeJson(path: string, value: unknown): void {
  const temporary = `${path}.tmp`
  writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n')
  renameSync(temporary, path)
}

export function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export function trainingProvenance() {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim()
  const files = execFileSync('git', ['ls-files', 'client/src/lib/engine', 'client/src/bots'], {
    cwd: root,
    encoding: 'utf8',
  })
    .trim()
    .split('\n')
    .sort()
  const hash = createHash('sha256')
  for (const path of files) hash.update(path).update(readFileSync(join(root, path)))
  const toolingFiles = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', 'client/scripts'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  )
    .trim()
    .split('\n')
    .sort()
  const toolingHash = createHash('sha256')
  for (const path of toolingFiles)
    toolingHash.update(path).update(readFileSync(join(root, path)))
  return {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    rulesAndBotsSha256: hash.digest('hex'),
    toolingSha256: toolingHash.digest('hex'),
    features: [...VALUE_FEATURES],
  }
}

export function openRun(
  output: string,
  kind: string,
  settings: unknown,
  resume: boolean,
): string {
  const directory = resolve(output)
  const manifest = { version: 1, kind, settings, provenance: trainingProvenance() }
  if (existsSync(directory)) {
    if (!resume)
      throw new Error(`Run already exists: ${directory}; use --resume or a fresh path`)
    const existing = readJson<typeof manifest>(join(directory, 'manifest.json'))
    if (
      existing.kind !== kind ||
      existing.version !== manifest.version ||
      digest(existing.settings) !== digest(settings) ||
      existing.provenance.rulesAndBotsSha256 !== manifest.provenance.rulesAndBotsSha256 ||
      (existing.provenance.toolingSha256 !== undefined &&
        existing.provenance.toolingSha256 !== manifest.provenance.toolingSha256)
    )
      throw new Error('Resume rejected: configuration, checkpoint, rules or bots changed')
  } else {
    mkdirSync(directory, { recursive: true })
    writeJson(join(directory, 'manifest.json'), manifest)
  }
  return directory
}

export function readCheckpoint(path: string): readonly number[] {
  const checkpoint = readJson<{ features: string[]; weights: number[] }>(path)
  if (
    digest(checkpoint.features) !== digest(VALUE_FEATURES) ||
    !Array.isArray(checkpoint.weights) ||
    checkpoint.weights.length !== VALUE_FEATURES.length ||
    !checkpoint.weights.every(Number.isFinite)
  )
    throw new Error(`Checkpoint does not match the feature contract: ${path}`)
  return Object.freeze([...checkpoint.weights])
}
