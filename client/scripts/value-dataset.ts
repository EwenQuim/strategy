import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { getBot, type BotConfig } from '../src/bots/catalog.ts'
import { LearnedBot } from '../src/bots/strategies/learned.ts'
import { trainingBattle } from './learned-matches.ts'
import type { PipelineConfig } from './value-config.ts'
import type { Sample } from './value-fit.ts'
import { digest, openRun, readCheckpoint, readJson, writeJson } from './value-artifacts.ts'
import { playValueMatch } from './value-matches.ts'

type GameRecord = {
  game: number
  seed: string
  scenario: number
  players: BotConfig[]
  winner: 'player' | 'enemy' | 'draw' | null
  positions: number[][]
  elapsedMs: number
}

// Split paired scenarios together, independently of the round-robin league and scenario cycle.
export function validationGame(seed: string, every: number): boolean {
  return Number.parseInt(digest(seed).slice(0, 8), 16) % every === 0
}

export async function collectValueGames(
  config: PipelineConfig,
  resume: boolean,
  deadline: number,
  challenger?: string,
) {
  const weights = challenger ? readCheckpoint(challenger) : undefined
  const league = [...config.training.league]
  if (weights) league.push({ name: 'learned', options: config.evaluation.search })
  const settings = { training: config.training, scenarios: config.scenarios, league, weights }
  const directory = openRun(config.output, 'dataset', settings, resume)
  const size = league.length
  let saved = 0
  for (let game = 0; game < config.training.games && Date.now() < deadline; game++) {
    const path = join(directory, `game-${String(game).padStart(6, '0')}.json`)
    if (existsSync(path)) {
      saved++
      continue
    }
    const pair = Math.floor(game / 2)
    const scenario = pair
    // Every directed matchup, including self-play, repeats across fresh scenarios.
    const first = Math.floor(pair / size) % size
    const second = pair % size
    const slots = game % 2 ? [second, first] : [first, second]
    const players = slots.map((slot) => league[slot])
    const bots = slots.map((slot) =>
      weights && slot === size - 1
        ? new LearnedBot(config.evaluation.search, weights)
        : getBot(league[slot]),
    )
    const seed = `${config.training.seedPrefix}-${pair}`
    const match = await playValueMatch(
      trainingBattle(seed, scenario, config.scenarios.rosters, config.scenarios.biomes),
      bots[0],
      bots[1],
      config.training.maxActivations,
      true,
    )
    const record: GameRecord = {
      game,
      seed,
      scenario,
      players,
      winner: match.winner,
      positions: match.positions,
      elapsedMs: match.elapsedMs,
    }
    writeJson(path, record)
    saved++
    console.log(
      `Collected ${saved}/${config.training.games}: ${seed} ${players.map((p) => p.name).join('/')} ${match.winner ?? 'timeout'} ${(match.elapsedMs / 1000).toFixed(1)}s`,
    )
  }
  writeJson(join(directory, 'progress.json'), { saved, requested: config.training.games })
  return directory
}

export function loadValueSamples(
  directories: readonly string[],
  validationEvery: number,
  selection: { excludeRandom?: boolean; lastFraction?: number } = {},
) {
  const fraction = selection.lastFraction ?? 1
  if (!Number.isFinite(fraction) || fraction <= 0 || fraction > 1)
    throw new Error('Invalid lastFraction')
  const samples: Sample[] = []
  let completed = 0,
    timeouts = 0
  const sources = []
  const seen = new Set<string>()
  const splits = new Map<string, number>()
  for (const directory of directories) {
    const manifest = readJson<{
      provenance: { rulesAndBotsSha256: string; features: string[] }
      settings: unknown
    }>(join(directory, 'manifest.json'))
    sources.push({ directory, ...manifest })
    for (const name of readdirSync(directory)
      .filter((file) => /^game-\d+\.json$/.test(file))
      .sort()) {
      const game = readJson<GameRecord>(join(directory, name))
      if (
        !Number.isSafeInteger(game.game) ||
        typeof game.seed !== 'string' ||
        ![null, 'player', 'enemy', 'draw'].includes(game.winner) ||
        !Array.isArray(game.players) ||
        !Array.isArray(game.positions) ||
        game.positions.some(
          (features) =>
            !Array.isArray(features) ||
            features.length !== manifest.provenance.features.length ||
            !features.every(Number.isFinite),
        )
      )
        throw new Error(`Invalid recorded game: ${join(directory, name)}`)
      const identity = digest([manifest.settings, game.game])
      if (seen.has(identity)) continue
      seen.add(identity)
      if (selection.excludeRandom && game.players.some((player) => player.name === 'random'))
        continue
      if (!game.winner) {
        timeouts++
        continue
      }
      completed++
      const heldout = validationGame(game.seed, validationEvery)
      let split = splits.get(game.seed)
      if (split === undefined) {
        const index = splits.size + 1
        split = index * validationEvery + (heldout ? 0 : 1)
        splits.set(game.seed, split)
      }
      const label = game.winner === 'draw' ? 0.5 : game.winner === 'player' ? 1 : 0
      // Fixed-size deterministic sampling caps long games' influence without altering labels.
      const start = Math.floor(game.positions.length * (1 - fraction))
      const length = game.positions.length - start
      const count = Math.min(80, length)
      for (let i = 0; i < count; i++) {
        const features = game.positions[start + Math.floor((i * length) / count)]
        samples.push({ game: split, features, label })
      }
    }
  }
  if (new Set(sources.map((source) => source.provenance.rulesAndBotsSha256)).size !== 1)
    throw new Error('Datasets use different rules or bot implementations')
  return { samples, completed, timeouts, sources }
}
