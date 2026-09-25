import { BIOMES, type Biome } from './biomes/index.ts'
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  hexOf,
  key,
  makeMap,
  mapFromRows,
  passable,
  type Tile,
} from './hex.ts'
import {
  King,
  PAWN_CLASSES,
  RECRUIT_CLASSES,
  Swordsman,
  type Pawn,
  type Side,
} from './pawns/index.ts'
import { SeededRandom, seedState } from './random.ts'

type PawnPlacement = {
  readonly kind: Pawn['kind']
  readonly col: number
  readonly row: number
}

export type FixedBattleSetup = {
  readonly biome: Biome
  readonly map: readonly string[]
  readonly hellfireCount?: 1 | 2
  readonly player: readonly PawnPlacement[]
  readonly enemy: readonly PawnPlacement[]
}

export type BattleSetup =
  | FixedBattleSetup
  | {
      readonly biome: Biome
      readonly map?: undefined
      readonly player: readonly Pawn['kind'][]
      readonly enemy: readonly Pawn['kind'][]
    }

export function validateSetup(setup: BattleSetup, tiles?: Map<string, Tile>): void {
  if (!setup || !Object.hasOwn(BIOMES, setup.biome))
    throw new Error('Battle setup must specify a valid biome')
  if (
    setup.map !== undefined &&
    setup.hellfireCount !== undefined &&
    (setup.biome !== 'hell' || ![1, 2].includes(setup.hellfireCount))
  )
    throw new Error('Hellfire count must be 1 or 2 in a Hell battle')
  const maxUnits = tiles ? [...tiles.values()].filter(passable).length : MAP_WIDTH * 3
  const occupied = new Set<string>()
  for (const side of ['player', 'enemy'] as const) {
    const army = setup[side]
    if (!Array.isArray(army) || army.length < 1 || army.length > maxUnits)
      throw new RangeError(side + ' army must contain 1 to ' + maxUnits + ' units')
    let kings = 0
    for (const unit of army) {
      const kind = typeof unit === 'string' ? unit : unit?.kind
      if (typeof kind !== 'string' || !Object.hasOwn(PAWN_CLASSES, kind))
        throw new Error(side + ' army contains an unknown pawn kind')
      if (kind === 'king') kings++
      if (tiles) {
        if (
          typeof unit !== 'object' ||
          !unit ||
          !Number.isInteger(unit.col) ||
          !Number.isInteger(unit.row) ||
          unit.col < 0 ||
          unit.row < 0
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
    if (
      !tiles &&
      side === 'player' &&
      army.filter((unit) => PAWN_CLASSES[unit as Pawn['kind']].startsOnFrontRow).length >
        MAP_WIDTH
    )
      throw new RangeError('Player Bulwarks must fit on one starting row')
  }
}

function shuffle<T>(items: T[], random: SeededRandom): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random.next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function spawnPlacedArmy(army: readonly PawnPlacement[], side: Side, firstId: number): Pawn[] {
  return army.map((unit, index) => {
    const { q, r } = hexOf(unit.col, unit.row)
    const Unit = PAWN_CLASSES[unit.kind]
    return new Unit(firstId + index, q, r, side)
  })
}

function spawnRandomArmy(
  army: readonly (typeof PAWN_CLASSES)[Pawn['kind']][],
  side: Side,
  firstId: number,
  random: SeededRandom,
): Pawn[] {
  const firstRow = side === 'player' ? MAP_HEIGHT - 3 : 0
  const positions = shuffle(
    Array.from({ length: MAP_WIDTH * 3 }, (_, index) =>
      hexOf(index % MAP_WIDTH, firstRow + Math.floor(index / MAP_WIDTH)),
    ),
    random,
  )
  const frontPositions =
    side === 'player'
      ? positions
          .filter((tile) => tile.r === firstRow)
          .slice(0, army.filter((Unit) => Unit.startsOnFrontRow).length)
      : []
  const otherPositions = positions.filter((tile) => !frontPositions.includes(tile))
  return army.map((Unit, index) => {
    const available =
      side === 'player' && Unit.startsOnFrontRow ? frontPositions : otherPositions
    const tile = available.shift()!
    return new Unit(firstId + index, tile.q, tile.r, side)
  })
}

function copySetup(setup: BattleSetup | undefined): BattleSetup | undefined {
  if (!setup) return undefined
  if (setup.map !== undefined) {
    return {
      biome: setup.biome,
      map: [...setup.map],
      ...(setup.hellfireCount !== undefined ? { hellfireCount: setup.hellfireCount } : {}),
      player: setup.player.map((unit) => ({ ...unit })),
      enemy: setup.enemy.map((unit) => ({ ...unit })),
    }
  }
  return { biome: setup.biome, player: [...setup.player], enemy: [...setup.enemy] }
}

export function prepareBattle(seed: string, setup?: BattleSetup, startingSide?: Side) {
  const authoredTiles = setup?.map === undefined ? undefined : mapFromRows(setup.map)
  if (setup !== undefined) validateSetup(setup, authoredTiles)
  const random = new SeededRandom(seedState(seed))
  let biome: Biome
  let pawns: Pawn[]
  let tiles: Map<string, Tile>
  if (setup?.map !== undefined) {
    biome = setup.biome
    tiles = authoredTiles!
    pawns = [
      ...spawnPlacedArmy(setup.player, 'player', 1),
      ...spawnPlacedArmy(setup.enemy, 'enemy', setup.player.length + 1),
    ]
  } else {
    // Keep existing seeded and online battles stable; Hell is an explicit setup choice.
    const biomes = (Object.keys(BIOMES) as Biome[]).filter((biome) => biome !== 'hell')
    biome = setup?.biome ?? biomes[Math.floor(random.next() * biomes.length)]
    const playerArmy = setup
      ? setup.player.map((kind) => PAWN_CLASSES[kind])
      : [
          Swordsman,
          King,
          ...Array.from(
            { length: 3 },
            () => RECRUIT_CLASSES[Math.floor(random.next() * RECRUIT_CLASSES.length)],
          ),
        ]
    const enemyArmy = setup ? setup.enemy.map((kind) => PAWN_CLASSES[kind]) : playerArmy
    pawns = [
      ...spawnRandomArmy(playerArmy, 'player', 1, random),
      ...spawnRandomArmy(enemyArmy, 'enemy', playerArmy.length + 1, random),
    ]
    tiles = makeMap(random, biome, pawns)
  }
  const savedSetup = copySetup(setup)
  const initiative = shuffle(pawns, random)
  if (startingSide) {
    const first = initiative.findIndex((pawn) => pawn.side === startingSide)
    initiative.push(...initiative.splice(0, first))
  }
  // Number the finalized initiative, including any starting-side rotation.
  initiative.forEach((pawn, index) => {
    ;(pawn as { id: number }).id = index + 1
  })
  return {
    tiles,
    biome,
    pawns,
    order: initiative.map((_, index) => index + 1),
    seed,
    ...(savedSetup ? { setup: savedSetup } : {}),
    randomState: random.state,
  }
}
