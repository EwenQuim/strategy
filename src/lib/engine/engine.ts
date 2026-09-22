import {
  BIOMES,
  MAP_WIDTH,
  MAP_HEIGHT,
  hexDist,
  hexOf,
  key,
  makeMap,
  mapFromRows,
  passable,
} from './hex.ts'
import {
  King,
  Swordsman,
  Archer,
  Magician,
  Ninja,
  Bulwark,
  RECRUIT_CLASSES,
  type Pawn,
  type Side,
} from './pawns.ts'
import type {
  Action,
  BattleEffect,
  BattleFrame,
  BattleSetup,
  Biome,
  GameState,
  Tile,
  Transition,
} from './types.ts'
import { SeededRandom, seedState } from './random.ts'
import {
  canAttack,
  movementDestinations,
  canUseSpecial,
  chargeDestinations,
  jumpDestinations,
  performJump,
  specialTargets,
  performAttack,
  performRally,
  performSpecial,
} from './combat.ts'

function shuffle<T>(items: T[], random: SeededRandom): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function winnerFrom(pawns: Pawn[]): Side | null {
  if (!pawns.some((p) => p.kind === 'king' && p.side === 'enemy')) return 'player'
  if (!pawns.some((p) => p.kind === 'king' && p.side === 'player')) return 'enemy'
  return null
}

function finishTurn(pawn: Pawn, log: string[]): boolean {
  const previousEscape = pawn.escapeChance
  pawn.endTurn()
  const gained = pawn.escapeChance - previousEscape
  if (gained <= 0) return false
  log.push(
    (pawn.side === 'player' ? 'Your ' : 'Enemy ') +
      pawn.kind +
      ' #' +
      pawn.id +
      ' ends turn: +' +
      gained +
      '% escape (' +
      pawn.escapeChance +
      '% total).',
  )
  return true
}

function advance(state: GameState): GameState {
  const random = new SeededRandom(state.randomState)
  const { pawns } = state
  const log = [...state.log]
  let { order, round, logCount } = state
  let active = state.active + 1
  while (true) {
    if (active >= order.length) {
      round++
      order = shuffle(
        pawns.map((p) => p.id),
        random,
      )
      for (const pawn of pawns) {
        pawn.energy = pawn.maxEnergy
        pawn.escapeChance = 0
        pawn.specialUsed = false
      }
      active = 0
      log.push('Round ' + round + '. Energy restored; escape chances reset.')
      logCount++
    }
    const next = pawns.find((p) => p.id === order[active])
    if (next) {
      next.protectingId = null
      break
    }
    active++
  }
  return {
    ...state,
    order,
    active,
    round,
    randomState: random.state,
    log: log.slice(-40),
    logCount,
  }
}

export function activePawn(state: GameState): Pawn | undefined {
  return state.pawns.find((p) => p.id === state.order[state.active])
}

const pawnClasses = {
  king: King,
  swordsman: Swordsman,
  archer: Archer,
  magician: Magician,
  ninja: Ninja,
  bulwark: Bulwark,
}

function validateSetup(setup: BattleSetup, tiles?: Map<string, Tile>): void {
  if (!setup || !Object.hasOwn(BIOMES, setup.biome))
    throw new Error('Battle setup must specify a valid biome')
  const occupied = new Set<string>()
  for (const side of ['player', 'enemy'] as const) {
    const army = setup[side]
    if (!Array.isArray(army) || army.length < 1 || army.length > MAP_WIDTH * 3)
      throw new RangeError(side + ' army must contain 1 to ' + MAP_WIDTH * 3 + ' units')
    let kings = 0
    for (const unit of army) {
      const kind = typeof unit === 'string' ? unit : unit?.kind
      if (typeof kind !== 'string' || !Object.hasOwn(pawnClasses, kind))
        throw new Error(side + ' army contains an unknown pawn kind')
      if (kind === 'king') kings++
      if (tiles) {
        if (
          typeof unit !== 'object' ||
          !unit ||
          !Number.isInteger(unit.col) ||
          !Number.isInteger(unit.row) ||
          unit.col < 0 ||
          unit.col >= MAP_WIDTH ||
          unit.row < 0 ||
          unit.row >= MAP_HEIGHT
        )
          throw new Error(side + ' army must specify valid col and row positions')
        const { q, r } = hexOf(unit.col, unit.row)
        const position = key(q, r)
        if (!passable(tiles.get(position)))
          throw new Error(side + ' army cannot start on blocked terrain')
        if (occupied.has(position)) throw new Error('Armies cannot share a starting tile')
        occupied.add(position)
      } else if (typeof unit !== 'string') {
        throw new Error('Positioned armies require an explicit map')
      }
    }
    if (kings !== 1) throw new Error(side + ' army must contain exactly one king')
  }
}

export function initialState(seed: string, setup?: BattleSetup): GameState {
  const authoredTiles = setup?.map === undefined ? undefined : mapFromRows(setup.map)
  if (setup !== undefined) validateSetup(setup, authoredTiles)
  const random = new SeededRandom(seedState(seed))
  let biome: Biome
  let pawns: Pawn[]
  let tiles: Map<string, Tile>
  if (setup?.map !== undefined) {
    biome = setup.biome
    tiles = authoredTiles!
    const spawn = (side: Side, firstId: number) =>
      setup[side].map((unit, index) => {
        const { q, r } = hexOf(unit.col, unit.row)
        const Unit = pawnClasses[unit.kind]
        return new Unit(firstId + index, q, r, side)
      })
    pawns = [...spawn('player', 1), ...spawn('enemy', setup.player.length + 1)]
  } else {
    const biomes = Object.keys(BIOMES) as Biome[]
    biome = setup?.biome ?? biomes[Math.floor(random.next() * biomes.length)]
    const playerArmy = setup
      ? setup.player.map((kind) => pawnClasses[kind])
      : [
          Swordsman,
          King,
          ...Array.from(
            { length: 3 },
            () => RECRUIT_CLASSES[Math.floor(random.next() * RECRUIT_CLASSES.length)],
          ),
        ]
    const enemyArmy = setup ? setup.enemy.map((kind) => pawnClasses[kind]) : playerArmy
    const spawn = (side: Side, firstRow: number, firstId: number) => {
      const positions = shuffle(
        Array.from({ length: MAP_WIDTH * 3 }, (_, index) =>
          hexOf(index % MAP_WIDTH, firstRow + Math.floor(index / MAP_WIDTH)),
        ),
        random,
      )
      return (side === 'player' ? playerArmy : enemyArmy).map((Unit, index) => {
        const tile = positions[index]
        return new Unit(firstId + index, tile.q, tile.r, side)
      })
    }
    pawns = [...spawn('player', MAP_HEIGHT - 3, 1), ...spawn('enemy', 0, playerArmy.length + 1)]
    tiles = makeMap(random, biome, pawns)
  }
  const savedSetup: BattleSetup | undefined =
    setup?.map !== undefined
      ? {
          biome: setup.biome,
          map: [...setup.map],
          player: setup.player.map((unit) => ({ ...unit })),
          enemy: setup.enemy.map((unit) => ({ ...unit })),
        }
      : setup
        ? { biome: setup.biome, player: [...setup.player], enemy: [...setup.enemy] }
        : undefined
  return advance({
    tiles,
    biome,
    pawns,
    order: shuffle(
      pawns.map((p) => p.id),
      random,
    ),
    seed,
    ...(savedSetup ? { setup: savedSetup } : {}),
    randomState: random.state,
    active: -1,
    round: 1,
    phase: 'move',
    chargeDestination: null,
    winner: null,
    log: ['The battle begins. Protect your crown.'],
    logCount: 1,
  })
}

export function transition(state: GameState, action: Action): Transition {
  const frames: BattleFrame[] = []
  return { state: reduce(state, action, (frame) => frames.push(frame)), frames }
}

export function reducer(state: GameState, action: Action): GameState {
  return reduce(state, action)
}

export function targetingTiles(state: GameState): Set<string> {
  const pawn = activePawn(state)
  if (!pawn || state.winner) return new Set()
  if (state.phase === 'special' && pawn.kind === 'ninja') {
    return new Set(
      jumpDestinations(state.tiles, state.pawns, pawn).map((tile) => key(tile.q, tile.r)),
    )
  }
  if (state.phase === 'special' && pawn.kind === 'swordsman') {
    return new Set(chargeDestinations(state.tiles, state.pawns, pawn).keys())
  }
  const targets =
    state.phase === 'attack'
      ? state.pawns.filter((target) => canAttack(pawn, target))
      : state.phase === 'special' || state.phase === 'charge'
        ? specialTargets(state.pawns, pawn, state.chargeDestination ?? pawn)
        : []
  return new Set(targets.map((target) => key(target.q, target.r)))
}

function reduce(
  state: GameState,
  action: Action,
  record?: (frame: BattleFrame) => void,
): GameState {
  if (action.type === 'restart') return initialState(state.seed, state.setup)
  const pawn = activePawn(state)
  if (!pawn || state.winner) return state
  if (action.type === 'cancelTargeting') {
    return state.phase === 'move' ? state : { ...state, phase: 'move', chargeDestination: null }
  }
  if (action.type === 'act') {
    if (state.phase !== 'move' || pawn.energy <= 0) return state
    if (action.action === 'attack') return { ...state, phase: 'attack' }
    if (action.action === 'special' && pawn.kind !== 'king') {
      return canUseSpecial(pawn) ? { ...state, phase: 'special' } : state
    }
  }

  if (action.type === 'specialAt' && state.phase === 'special' && pawn.kind === 'swordsman') {
    if (!chargeDestinations(state.tiles, state.pawns, pawn).has(key(action.q, action.r)))
      return state
    return { ...state, phase: 'charge', chargeDestination: { q: action.q, r: action.r } }
  }

  const pawns = state.pawns.map((p) => p.clone())
  const me = pawns.find((p) => p.id === pawn.id)!
  const log: string[] = []
  const random = new SeededRandom(state.randomState)
  const from = { q: pawn.q, r: pawn.r }
  let effect: BattleEffect | null = null

  if (action.type === 'act' && action.action === 'special') {
    if (!performRally(pawns, me, log)) return state
    effect = { kind: 'rally', from, to: from }
  } else if (action.type === 'specialAt' && me.kind === 'ninja') {
    if (state.phase !== 'special' || !performJump(state.tiles, pawns, me, action)) return state
    effect = { kind: 'move', from, to: { q: me.q, r: me.r } }
  } else if (action.type === 'attackAt' || action.type === 'specialAt') {
    const expectedPhase =
      action.type === 'attackAt' ? 'attack' : me.kind === 'swordsman' ? 'charge' : 'special'
    if (state.phase !== expectedPhase) return state
    const target = pawns.find((p) => p.q === action.q && p.r === action.r)
    if (!target) return state
    const impacts =
      action.type === 'attackAt'
        ? performAttack(pawns, me, target, log, random)
        : performSpecial(
            state.tiles,
            pawns,
            me,
            target,
            log,
            random,
            state.chargeDestination ?? undefined,
          )
    if (!impacts) return state
    effect = {
      kind:
        action.type === 'specialAt'
          ? me.kind === 'magician'
            ? 'fireball'
            : me.kind === 'bulwark'
              ? 'protect'
              : 'attack'
          : 'attack',
      from,
      to: { q: target.q, r: target.r },
      impacts,
    }
  } else if (action.type === 'move') {
    if (state.phase !== 'move' || me.energy <= 0) return state
    const steps = movementDestinations(state.tiles, pawns, me).get(key(action.q, action.r))
    if (!steps) return state
    me.q = action.q
    me.r = action.r
    me.energy -= steps
    effect = { kind: 'move', from, to: { q: me.q, r: me.r } }
  } else if (action.type !== 'endTurn') return state

  for (const protector of pawns) {
    if (protector.protectingId === null) continue
    const ally = pawns.find((p) => p.id === protector.protectingId)
    if (!ally || hexDist(protector, ally) !== 1) protector.protectingId = null
  }
  const winner = winnerFrom(pawns)
  const turnEnded = !winner && (action.type === 'endTurn' || me.energy === 0)
  if (turnEnded && finishTurn(me, log) && action.type === 'endTurn') {
    effect = { kind: 'escape', from, to: from }
  }
  const next: GameState = {
    ...state,
    pawns,
    randomState: random.state,
    phase: winner ? 'over' : 'move',
    winner,
    chargeDestination: null,
    log: [...state.log, ...log].slice(-40),
    logCount: state.logCount + log.length,
  }
  if (effect) {
    record?.({
      state: {
        ...next,
        pawns: pawns.map((p) => p.clone()),
        order: [...next.order],
        log: [...next.log],
        winner: null,
        phase: 'move',
      },
      effect,
    })
  }
  if (winner) {
    next.log = [
      ...next.log,
      winner === 'player' ? 'The enemy crown has fallen. Victory!' : 'Your crown has fallen.',
    ].slice(-40)
    next.logCount++
  }
  return turnEnded ? advance(next) : next
}
