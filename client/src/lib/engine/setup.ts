import { BIOMES, type Biome } from './biomes/index.ts'
import {
  MAP_WIDTH,
  decorateMap,
  hexOf,
  key,
  mapFromRows,
  mirrorAxial,
  passable,
  type Axial,
  type MapSize,
  type Tile,
} from './hex.ts'
import { generateMapShape, rollMapSize } from './shapes.ts'
import { King, PAWN_CLASSES, RECRUIT_CLASSES, type Pawn, type Side } from './pawns/index.ts'
import { SeededRandom, seedState } from './random.ts'

const SYMMETRIC_SEED_PREFIX = 'sym-'

export const symmetricSeed = (seed: string) => SYMMETRIC_SEED_PREFIX + seed
const isSymmetricSeed = (seed: string) => seed.startsWith(SYMMETRIC_SEED_PREFIX)

type PawnPlacement = {
  readonly kind: Pawn['kind']
  readonly col: number
  readonly row: number
  readonly hp?: number
}

export type FixedBattleSetup = {
  readonly biome: Biome
  readonly map: readonly string[]
  readonly hellfireCount?: 1 | 2
  readonly firstEnemyKinds?: readonly Pawn['kind'][]
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

function validateInitiative(setup: BattleSetup): void {
  if (
    setup.map !== undefined &&
    setup.firstEnemyKinds !== undefined &&
    (!Array.isArray(setup.firstEnemyKinds) ||
      setup.firstEnemyKinds.some(
        (kind) =>
          !Object.hasOwn(PAWN_CLASSES, kind) || !setup.enemy.some((p) => p.kind === kind),
      ))
  )
    throw new Error('Early enemy initiative must name a unit in the enemy army')
}

function validateHealth(unit: PawnPlacement, side: Side): void {
  if (
    unit.hp !== undefined &&
    (!Number.isInteger(unit.hp) ||
      unit.hp < 1 ||
      unit.hp > new PAWN_CLASSES[unit.kind](0, 0, 0, side).maxHp)
  )
    throw new Error(side + ' army must specify health within the unit maximum')
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
  validateInitiative(setup)
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
      if (typeof unit === 'object') validateHealth(unit, side)
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

// Mirrored rosters can pair every unit with its counterpart on the other side.
function mirroredRosters(pawns: Pawn[]): boolean {
  const counts = new Map<Pawn['kind'], number>()
  for (const pawn of pawns)
    counts.set(pawn.kind, (counts.get(pawn.kind) ?? 0) + (pawn.side === 'player' ? 1 : -1))
  return [...counts.values()].every((count) => count === 0)
}

// Symmetric battles group matching units into pairs: the kings open, then each pair
// follows in seeded order with a seeded lead, so tempo stays fair between mirrored sides.
function pairedInitiative(pawns: Pawn[], random: SeededRandom, startingSide?: Side): Pawn[] {
  const groups = new Map<Pawn['kind'], { player: Pawn[]; enemy: Pawn[] }>()
  for (const pawn of pawns) {
    const group = groups.get(pawn.kind) ?? { player: [], enemy: [] }
    group[pawn.side].push(pawn)
    groups.set(pawn.kind, group)
  }
  const kings = groups.get('king')
  groups.delete('king')
  const order: Pawn[] = []
  const pair = (player: Pawn, enemy: Pawn, lead?: Side) => {
    const first = lead ?? (random.next() < 0.5 ? 'player' : 'enemy')
    order.push(first === 'player' ? player : enemy, first === 'player' ? enemy : player)
  }
  if (kings) pair(kings.player[0]!, kings.enemy[0]!, startingSide)
  for (const kind of shuffle([...groups.keys()], random)) {
    const group = groups.get(kind)!
    const player = shuffle(group.player, random)
    const enemy = shuffle(group.enemy, random)
    player.forEach((pawn, index) => pair(pawn, enemy[index]!))
  }
  return order
}

function spawnPlacedArmy(army: readonly PawnPlacement[], side: Side, firstId: number): Pawn[] {
  return army.map((unit, index) => {
    const { q, r } = hexOf(unit.col, unit.row)
    const Unit = PAWN_CLASSES[unit.kind]
    return new Unit(firstId + index, q, r, side, unit.hp)
  })
}

// Spawn zones always cover the three rows at the map end and only grow deeper
// when carving or a maximal army needs room.
function spawnZone(
  tiles: Map<string, Tile>,
  size: MapSize,
  side: Side,
  count: number,
): Axial[] {
  const out: Axial[] = []
  for (let row = 0; row < size.height; row++) {
    const r = side === 'player' ? size.height - 1 - row : row
    for (let col = 0; col < size.width; col++) {
      const { q } = hexOf(col, r)
      if (passable(tiles.get(key(q, r)))) out.push({ q, r })
    }
    if (row >= 2 && out.length >= count) break
  }
  return out
}

function spawnRandomArmy(
  army: readonly (typeof PAWN_CLASSES)[Pawn['kind']][],
  side: Side,
  firstId: number,
  random: SeededRandom,
  tiles: Map<string, Tile>,
  size: MapSize,
): Pawn[] {
  const positions = shuffle(spawnZone(tiles, size, side, army.length), random)
  const frontRow = side === 'player' ? size.height - 3 : 0
  const frontPositions = positions
    .filter((tile) => tile.r === frontRow)
    .slice(0, side === 'player' ? army.filter((Unit) => Unit.startsOnFrontRow).length : 0)
  const frontSet = new Set(frontPositions.map((tile) => key(tile.q, tile.r)))
  const otherPositions = positions.filter((tile) => !frontSet.has(key(tile.q, tile.r)))
  return army.map((Unit, index) => {
    const wantsFront = side === 'player' && Unit.startsOnFrontRow
    const pool = wantsFront && frontPositions.length ? frontPositions : otherPositions
    const tile = pool.shift()!
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
      ...(setup.firstEnemyKinds !== undefined
        ? { firstEnemyKinds: [...setup.firstEnemyKinds] }
        : {}),
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
  const symmetric = isSymmetricSeed(seed)
  let biome: Biome
  let pawns: Pawn[]
  let tiles: Map<string, Tile>
  let size: MapSize
  if (setup?.map !== undefined) {
    biome = setup.biome
    size = {
      width: Math.max(...setup.map.map((line) => line.length)),
      height: setup.map.length,
    }
    tiles = authoredTiles!
    pawns = [
      ...spawnPlacedArmy(setup.player, 'player', 1),
      ...spawnPlacedArmy(setup.enemy, 'enemy', setup.player.length + 1),
    ]
  } else {
    // Keep existing seeded and online battles stable; Hell is an explicit setup choice.
    const biomes = (Object.keys(BIOMES) as Biome[]).filter((name) => name !== 'hell')
    biome = setup?.biome ?? biomes[Math.floor(random.next() * biomes.length)]
    size = rollMapSize(random)
    const playerArmy = setup
      ? setup.player.map((kind) => PAWN_CLASSES[kind])
      : [King, ...shuffle([...RECRUIT_CLASSES], random).slice(0, 5)]
    const enemyArmy = setup ? setup.enemy.map((kind) => PAWN_CLASSES[kind]) : playerArmy
    // The shape exists before armies spawn on it, then decoration protects them.
    const shape = generateMapShape(random, size, symmetric)
    const playerPawns = spawnRandomArmy(playerArmy, 'player', 1, random, shape, size)
    const enemyPawns =
      symmetric && enemyArmy.length === playerArmy.length
        ? enemyArmy.map((Unit, index) => {
            const mirror = mirrorAxial(playerPawns[index], size)
            return new Unit(playerArmy.length + 1 + index, mirror.q, mirror.r, 'enemy')
          })
        : spawnRandomArmy(enemyArmy, 'enemy', playerArmy.length + 1, random, shape, size)
    pawns = [...playerPawns, ...enemyPawns]
    tiles = decorateMap(random, biome, shape, pawns, symmetric, size)
  }
  const savedSetup = copySetup(setup)
  const paired = symmetric && setup?.map === undefined && mirroredRosters(pawns)
  const initiative = paired
    ? pairedInitiative(pawns, random, startingSide)
    : shuffle(pawns, random)
  if (!paired && startingSide) {
    const first = initiative.findIndex((pawn) => pawn.side === startingSide)
    initiative.push(...initiative.splice(0, first))
  }
  // Introductions follow a safe opening by the player King, before any other unit acts.
  if (setup?.map !== undefined && setup.firstEnemyKinds?.length) {
    const opening = initiative.find((p) => p.side === 'player' && p.kind === 'king')!
    const first = initiative.filter(
      (p) => p.side === 'enemy' && setup.firstEnemyKinds!.includes(p.kind),
    )
    initiative.splice(
      0,
      initiative.length,
      opening,
      ...first,
      ...initiative.filter((p) => p !== opening && !first.includes(p)),
    )
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
    mapSize: size,
    ...(savedSetup ? { setup: savedSetup } : {}),
    randomState: random.state,
  }
}
