import {
  BIOMES,
  MAP_WIDTH,
  MAP_HEIGHT,
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
import type { BattleSetup, Biome, PawnPlacement, Tile } from './types.ts'
import { SeededRandom, seedState } from './random.ts'

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
    if (
      !tiles &&
      side === 'player' &&
      army.filter((unit) => unit === 'bulwark').length > MAP_WIDTH
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
    const Unit = pawnClasses[unit.kind]
    return new Unit(firstId + index, q, r, side)
  })
}

function spawnRandomArmy(
  army: readonly (typeof pawnClasses)[Pawn['kind']][],
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
  const bulwarkPositions =
    side === 'player'
      ? positions
          .filter((tile) => tile.r === firstRow)
          .slice(0, army.filter((Unit) => Unit === Bulwark).length)
      : []
  const otherPositions = positions.filter((tile) => !bulwarkPositions.includes(tile))
  return army.map((Unit, index) => {
    const available = side === 'player' && Unit === Bulwark ? bulwarkPositions : otherPositions
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
      player: setup.player.map((unit) => ({ ...unit })),
      enemy: setup.enemy.map((unit) => ({ ...unit })),
    }
  }
  return { biome: setup.biome, player: [...setup.player], enemy: [...setup.enemy] }
}

export function prepareBattle(seed: string, setup?: BattleSetup) {
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
    pawns = [
      ...spawnRandomArmy(playerArmy, 'player', 1, random),
      ...spawnRandomArmy(enemyArmy, 'enemy', playerArmy.length + 1, random),
    ]
    tiles = makeMap(random, biome, pawns)
  }
  const savedSetup = copySetup(setup)
  return {
    tiles,
    biome,
    pawns,
    order: shuffle(
      pawns.map((pawn) => pawn.id),
      random,
    ),
    seed,
    ...(savedSetup ? { setup: savedSetup } : {}),
    randomState: random.state,
  }
}
