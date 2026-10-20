import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { getBot, type BotConfig } from '../src/bots/catalog.ts'
import type { Bot } from '../src/bots/bot.ts'
import { BOT_LEVELS } from '../src/lib/engine/ai.ts'
import { HANNIBAL_LEVELS } from '../src/bots/strategies/hannibal.ts'
import {
  activePawn,
  initialState,
  symmetricSeed,
  transition,
  PAWN_CLASSES,
  type GameState,
  type PawnKind,
  type Side,
  type Biome,
  type FixedBattleSetup,
} from '../src/lib/engine/index.ts'
import { hexDist, sameHex } from '../src/lib/engine/hex.ts'
import { VALUE_MODELS } from '../src/bots/valueModel.ts'
import { TurtleBot } from './turtle-bot.ts'
import {
  matchMetrics,
  nearestEnemyDistance,
  roundTelemetry,
  type RoundTelemetry,
} from './gameplay-metrics.ts'

export type ExperimentConfig = {
  seeds: string[]
  biomes: Biome[]
  rosters: { name: string; units: PawnKind[] }[]
  bots: { name: string; config: BotConfig | 'turtle' }[]
  maxRounds: number
  setups?: { name: string; setup: FixedBattleSetup }[]
}

export const DEFAULT_EXPERIMENT: ExperimentConfig = {
  seeds: Array.from({ length: 8 }, (_, i) => `gameplay-${i}`),
  biomes: ['verdant', 'desert', 'mountains', 'volcano', 'hell'],
  rosters: [
    { name: 'mobile', units: ['king', 'swordsman', 'archer', 'ninja', 'lancer'] },
    { name: 'support', units: ['king', 'swordsman', 'bulwark', 'wolf', 'hoplite'] },
    { name: 'area', units: ['king', 'swordsman', 'magician', 'bomber', 'berserker'] },
  ],
  bots: [
    {
      name: 'napoleon',
      config: {
        name: 'napoleon',
        options: { candidates: 3, replies: 1, aggression: 1.2, caution: 0.35 },
      },
    },
    { name: 'depthsearch', config: { name: 'depthsearch', options: BOT_LEVELS.normal } },
    { name: 'hannibal', config: { name: 'hannibal', options: HANNIBAL_LEVELS.easy } },
    { name: 'random', config: { name: 'random', options: {} } },
    { name: 'turtle', config: 'turtle' },
  ],
  maxRounds: 30,
}

export type StartPosition = {
  state: Omit<GameState, 'tiles' | 'pawns'>
  tiles: [string, GameState['tiles'] extends Map<string, infer T> ? T : never][]
  pawns: {
    kind: PawnKind
    id: number
    side: Side
    q: number
    r: number
    hp: number
    energy: number
    bonusEnergy: number
    springSince: number | null
    specialUsed: boolean
    protectingId: number | null
  }[]
}

export type Substitution = { from: PawnKind; to: PawnKind; side: Side }

export function saveStart(state: GameState): StartPosition {
  const { tiles, pawns, ...rest } = state
  return {
    state: rest,
    tiles: [...tiles],
    pawns: pawns.map((p) => ({
      kind: p.kind,
      id: p.id,
      side: p.side,
      q: p.q,
      r: p.r,
      hp: p.hp,
      energy: p.energy,
      bonusEnergy: p.bonusEnergy,
      springSince: p.springSince,
      specialUsed: p.specialUsed,
      protectingId: p.protectingId,
    })),
  }
}

export function restoreStart(start: StartPosition, substitution?: Substitution): GameState {
  const copy = structuredClone(start)
  let replaced = false
  const pawns = copy.pawns.map((p) => {
    const replace =
      substitution && !replaced && p.kind === substitution.from && p.side === substitution.side
    if (replace) replaced = true
    const kind = replace ? substitution.to : p.kind
    const pawn = new PAWN_CLASSES[kind](p.id, p.q, p.r, p.side)
    return Object.assign(pawn, { ...p, kind, hp: replace ? pawn.maxHp : p.hp })
  })
  if (substitution && !replaced) throw new Error('Substitution unit absent from starting army')
  const setup = {
    biome: copy.state.biome,
    player: pawns.filter((p) => p.side === 'player').map((p) => p.kind),
    enemy: pawns.filter((p) => p.side === 'enemy').map((p) => p.kind),
  }
  if (copy.state.setup?.map !== undefined) {
    return {
      ...copy.state,
      setup: {
        ...copy.state.setup,
        player: copy.state.setup.player.map((p, i) => ({
          ...p,
          kind: pawns.filter((pawn) => pawn.side === 'player')[i]!.kind,
        })),
        enemy: copy.state.setup.enemy.map((p, i) => ({
          ...p,
          kind: pawns.filter((pawn) => pawn.side === 'enemy')[i]!.kind,
        })),
      },
      pawns,
      tiles: new Map(copy.tiles),
    }
  }
  return { ...copy.state, setup, pawns, tiles: new Map(copy.tiles) }
}

type UnitTelemetry = {
  id: number
  kind: PawnKind
  side: Side
  activations: number
  attacks: number
  damage: number
  damageTaken: number
  kills: number
  moves: number
  retreats: number
  healing: number
  energyGranted: number
  protections: number
  interceptedDamage: number
  displacements: number
  followUpDamage: number
  focusFireDamage: number
  survived: boolean
  attackOpportunities: number
  declinedAttacks: number
  nearbyEnemyRetreats: number
}

export type ExperimentMatch = {
  id: string
  seed: string
  biome: Biome
  roster: string
  playerBot: string
  enemyBot: string
  probe: boolean
  start: StartPosition
  telemetry: RoundTelemetry[]
  units: UnitTelemetry[]
  metrics: ReturnType<typeof matchMetrics>
  stalledRounds: number
  combatRounds: number
  hostileDamage: number
  idleActivations: number
  activations: number
}

export function makeBot(entry: ExperimentConfig['bots'][number]): Bot {
  return entry.config === 'turtle' ? new TurtleBot() : getBot(entry.config)
}

export async function playExperiment(
  metadata: Omit<
    ExperimentMatch,
    | 'start'
    | 'telemetry'
    | 'units'
    | 'metrics'
    | 'stalledRounds'
    | 'combatRounds'
    | 'hostileDamage'
    | 'idleActivations'
    | 'activations'
  >,
  start: StartPosition,
  player: Bot,
  enemy: Bot,
  maxRounds: number,
  substitution?: Substitution,
): Promise<ExperimentMatch> {
  let state = restoreStart(start, substitution)
  const units: UnitTelemetry[] = state.pawns.map((p) => ({
    id: p.id,
    kind: p.kind,
    side: p.side,
    activations: 0,
    attacks: 0,
    damage: 0,
    damageTaken: 0,
    kills: 0,
    moves: 0,
    retreats: 0,
    healing: 0,
    energyGranted: 0,
    protections: 0,
    interceptedDamage: 0,
    displacements: 0,
    followUpDamage: 0,
    focusFireDamage: 0,
    survived: true,
    attackOpportunities: 0,
    declinedAttacks: 0,
    nearbyEnemyRetreats: 0,
  }))
  const byId = new Map(units.map((u) => [u.id, u]))
  const lastHit = new Map<number, { actor: number; round: number }>()
  const pulled = new Map<number, { actor: number; round: number }>()
  const telemetry: RoundTelemetry[] = []
  let round = state.round,
    moves = 0,
    retreats = 0,
    blowsFrom = 0,
    clash = false
  let idleActivations = 0,
    activations = 0,
    hostileDamage = 0
  const flush = () => {
    telemetry.push({ ...roundTelemetry(state, round, blowsFrom, moves, retreats), clash })
    blowsFrom = state.blows.length
    moves = 0
    retreats = 0
    clash = false
  }
  while (!state.winner && state.round <= maxRounds) {
    const actor = activePawn(state)!
    const unit = byId.get(actor.id)!
    unit.activations++
    activations++
    const opportunity =
      actor.special.damage !== 0 &&
      actor.special.candidates(actor, state).some((action) => {
        const step = transition(state, action)
        return step.frames.some(
          (frame) =>
            frame.effect?.kind !== 'hellfire' &&
            frame.effect?.impacts?.some(
              (hit) =>
                hit.damage > 0 &&
                frame.state.pawns.some((p) => p.side !== actor.side && sameHex(p, hit)),
            ),
        )
      })
    if (opportunity) unit.attackOpportunities++
    const attacksBefore = unit.attacks
    const actions = await (actor.side === 'player' ? player : enemy).chooseActions(state)
    if (!actions.length) throw new Error('Bot returned no actions')
    let meaningful = false
    for (const action of actions) {
      const before = state
      const step = transition(state, action)
      if (step.state === state)
        throw new Error(`Illegal action in ${metadata.id}: ${JSON.stringify(action)}`)
      state = step.state
      for (const frame of step.frames) {
        const effect = frame.effect
        if (!effect) continue
        if (
          effect.kind !== 'hellfire' &&
          effect.impacts?.some((hit) => {
            const target =
              frame.state.pawns.find((p) => sameHex(p, hit)) ??
              frame.state.pawns.find(
                (p) => p.id === before.pawns.find((old) => sameHex(old, hit))?.id,
              )
            return hit.damage > 0 && !!target && target.side !== actor.side
          })
        )
          unit.attacks++
        for (const hit of effect.impacts ?? []) {
          if (hit.damage <= 0) continue
          const atImpact = before.pawns.find((p) => sameHex(p, hit))
          const target =
            frame.state.pawns.find((p) => sameHex(p, hit)) ??
            frame.state.pawns.find((p) => p.id === atImpact?.id)
          if (!target) continue
          const actual = Math.max(0, Math.min(hit.damage, target.hp + hit.damage))
          byId.get(target.id)!.damageTaken += actual
          if (effect.kind === 'hellfire' || target.side === actor.side) continue
          clash = true
          meaningful = true
          unit.damage += actual
          hostileDamage += actual
          const previous = lastHit.get(target.id)
          if (previous && previous.actor !== actor.id && previous.round === round)
            unit.focusFireDamage += actual
          lastHit.set(target.id, { actor: actor.id, round })
          const pull = pulled.get(target.id)
          if (pull && pull.actor !== actor.id && round <= pull.round + 1)
            byId.get(pull.actor)!.followUpDamage += actual
          const protector = before.pawns.find(
            (p) => p.id === target.id && p.protectingId !== null,
          )
          if (protector && target.protectingId === null)
            byId.get(target.id)!.interceptedDamage += actual
        }
        if (effect.support) {
          for (const at of effect.support.recipients) {
            const recipient = frame.state.pawns.find((p) => sameHex(p, at))
            const old = before.pawns.find((p) => p.id === recipient?.id)
            if (!recipient || !old) continue
            if (effect.support.kind === 'heal')
              unit.healing += Math.max(0, recipient.hp - old.hp)
            else unit.energyGranted += Math.max(0, recipient.bonusEnergy - old.bonusEnergy)
          }
          meaningful = true
        }
        if (effect.kind === 'protect') {
          unit.protections++
          meaningful = true
        }
      }
      for (const pawn of before.pawns) {
        const next = state.pawns.find((p) => p.id === pawn.id)
        if (!next || sameHex(pawn, next)) continue
        if (pawn.id === actor.id) {
          moves++
          unit.moves++
          meaningful = true
          if (nearestEnemyDistance(state, next) > nearestEnemyDistance(before, pawn)) {
            retreats++
            unit.retreats++
          }
          for (const foe of before.pawns.filter((p) => p.side !== actor.side)) {
            if (hexDist(pawn, foe) <= 3 && hexDist(next, foe) > hexDist(pawn, foe))
              byId.get(foe.id)!.nearbyEnemyRetreats++
          }
        } else if (pawn.side !== actor.side) {
          unit.displacements++
          meaningful = true
          pulled.set(pawn.id, { actor: actor.id, round })
        }
      }
      for (const blow of state.blows.slice(before.blows.length))
        if (blow.by?.id === actor.id)
          unit.kills += blow.fallen.filter((p) => p.side !== actor.side).length
      if (state.round !== round || state.winner) {
        flush()
        round = state.round
      }
      if (state.winner) break
    }
    if (!meaningful) idleActivations++
    if (opportunity && unit.attacks === attacksBefore) unit.declinedAttacks++
  }
  if (!state.winner && (moves || retreats || state.blows.length !== blowsFrom || clash)) flush()
  for (const unit of units) unit.survived = state.pawns.some((p) => p.id === unit.id)
  const metrics = {
    ...matchMetrics(metadata.seed, metadata.playerBot, metadata.enemyBot, telemetry, state),
    rounds: Math.min(state.round, maxRounds),
  }
  const stalledRounds = telemetry.filter(
    (t, i) => i > 0 && !t.clash && t.minDistance >= telemetry[i - 1].minDistance,
  ).length
  return {
    ...metadata,
    start,
    telemetry,
    units,
    metrics,
    stalledRounds,
    combatRounds: telemetry.filter((t) => t.clash).length,
    hostileDamage,
    idleActivations,
    activations,
  }
}

export function experimentStarts(config: ExperimentConfig) {
  const starts: { seed: string; biome: Biome; roster: string; start: StartPosition }[] = []
  for (const seed of config.seeds)
    for (const authored of config.setups ?? []) {
      const state = initialState(`${seed}:${authored.name}`, authored.setup, 'player')
      starts.push({ seed, biome: state.biome, roster: authored.name, start: saveStart(state) })
    }
  for (const [seedIndex, seed] of config.seeds.entries())
    for (const biome of config.biomes)
      for (const roster of config.rosters) {
        const opponent =
          config.rosters[(config.rosters.indexOf(roster) + seedIndex) % config.rosters.length]!
        const state = initialState(
          symmetricSeed(`${seed}:${biome}:${roster.name}`),
          { biome, player: roster.units, enemy: opponent.units },
          'player',
        )
        starts.push({
          seed,
          biome,
          roster: `${roster.name}-vs-${opponent.name}`,
          start: saveStart(state),
        })
      }
  return starts
}

export function provenance() {
  return {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    patch: createHash('sha256')
      .update(execFileSync('git', ['diff', 'HEAD']))
      .digest('hex'),
    botSource: createHash('sha256')
      .update(
        execFileSync('git', ['ls-files', 'src/bots'], { encoding: 'utf8' })
          .trim()
          .split('\n')
          .filter((path) => !path.endsWith('.json') && !path.endsWith('valueFeatures.ts'))
          .map((path) => readFileSync(path, 'utf8'))
          .join('\n'),
      )
      .digest('hex'),
    valueModels: VALUE_MODELS,
  }
}
