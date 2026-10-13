import { readdirSync, existsSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { digest, readJson, writeJson } from './value-artifacts.ts'

// Compact, publishable evidence; bulky per-position datasets remain in ignored run directories.
const args = process.argv.slice(2)
const replace = args.includes('--replace')
const options = Object.fromEntries(
  args.filter(arg => arg !== '--replace').map((arg) => {
    const match = /^--(runs|output)=(.+)$/.exec(arg)
    if (!match) throw new Error('Use --runs=<path[,path]> --output=<file>')
    return [match[1], match[2]]
  }),
)
if (!options.runs || !options.output) throw new Error('runs and output are required')
const runs = options.runs.split(',').map((path) => {
  const directory = resolve(path)
  const manifest = readJson<{ kind: string; settings: unknown; provenance: unknown }>(
    join(directory, 'manifest.json'),
  )
  const files = readdirSync(directory)
    .filter((file) => file.endsWith('.json') && file !== 'manifest.json')
    .sort()
  const records = files.map((file) => ({
    file,
    data: readJson<unknown>(join(directory, file)),
  }))
  const matches = records
    .filter((record) => record.file.startsWith('match-'))
    .map((record) => {
      const {
        candidateTimes: _candidateTimes,
        opponentTimes: _opponentTimes,
        ...match
      } = record.data as Record<string, unknown>
      return match
    })
  const games = records
    .filter((record) => record.file.startsWith('game-'))
    .map((record) => {
      const { positions, ...game } = record.data as Record<string, unknown>
      return { ...game, positions: (positions as unknown[]).length }
    })
  return {
    run: basename(directory),
    manifest,
    artifactsSha256: digest(records),
    summaries: records.filter(
      (record) => !record.file.startsWith('game-') && !record.file.startsWith('match-'),
    ),
    ...(matches.length ? { matches } : {}),
    ...(games.length ? { games } : {}),
  }
})
if (existsSync(resolve(options.output)) && !replace)
  throw new Error('Evidence output exists; use a fresh path or --replace')
writeJson(resolve(options.output), { version: 1, runs })
console.log(`Archived ${runs.length} runs to ${options.output}`)
