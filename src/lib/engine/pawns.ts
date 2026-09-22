import { hexDist, key } from './hex.ts'
import {
  canAttack,
  chargeDestinations,
  enterTiles,
  jumpDestinations,
  label,
  protectorFor,
  specialTargets,
  strike,
  walkingPaths,
} from './combat.ts'
import type { SeededRandom } from './random.ts'
import type { Action, Axial, BattleEffect, BattleImpact, Tile } from './types.ts'

export type Side = 'player' | 'enemy'

export const START_ENERGY = 3
export const ESCAPE_BONUS = 20
export const MAX_ESCAPE = 60

export interface AttackProfile {
  readonly damage: number
  readonly minRange: number
  readonly maxRange: number
  readonly ignoresEscape?: boolean
}

export interface SpecialAbility {
  readonly name: string
  readonly cost: number
  readonly description: string
}

export interface SpecialContext {
  tiles: Map<string, Tile>
  pawns: Pawn[]
  round: number
  log: string[]
  random: SeededRandom
}

type SpecialResult = Omit<BattleEffect, 'from'>
type SpecialBoard = Pick<SpecialContext, 'tiles' | 'pawns'>

interface AttackPosition {
  target: Pawn
  targets: Pawn[]
  from: Axial
  movementCost: number
}

function targetSpecial({ q, r }: Axial): Action[] {
  return [
    { type: 'act', action: 'special' },
    { type: 'specialAt', q, r },
  ]
}

export abstract class Pawn {
  static readonly startsOnFrontRow: boolean = false
  abstract readonly kind: 'king' | 'swordsman' | 'archer' | 'magician' | 'ninja' | 'bulwark'
  abstract readonly attack: AttackProfile
  abstract readonly special: SpecialAbility
  abstract performSpecial(
    context: SpecialContext,
    position: Axial,
    destination?: Axial,
  ): SpecialResult | null
  bonusEnergy = 0
  springSince: number | null = null

  get maxEnergy(): number {
    return START_ENERGY + this.bonusEnergy
  }
  readonly id: number
  readonly side: Side
  q: number
  r: number
  hp: number
  energy: number
  escapeChance: number
  specialUsed = false
  protectingId: number | null = null

  get moveCost(): number {
    return 1
  }

  moveEnergyCost(steps: number): number {
    return steps === 0 ? 0 : steps + this.moveCost - 1
  }

  get maxHp(): number {
    return 3
  }

  get watchtowerBonus(): number {
    return 0
  }

  get chargeRange(): number {
    return 0
  }

  get jumpRange(): number {
    return 0
  }

  get specialPhase(): 'move' | 'special' | 'charge' {
    return 'special'
  }

  get canUseSpecial(): boolean {
    return this.energy >= this.special.cost
  }

  canTargetSpecial(target: Pawn, from: Axial): boolean {
    return canAttack(this, target, { q: from.q, r: from.r })
  }

  specialTiles({ pawns }: SpecialBoard): Axial[] {
    return specialTargets(pawns, this)
  }

  specialActions(board: SpecialBoard): Action[][] {
    return this.specialTiles(board).map(targetSpecial)
  }

  damageFromPosition({ target, from, movementCost }: AttackPosition): number {
    return canAttack(this, target, from) ? (this.energy - movementCost) * this.attack.damage : 0
  }

  protected adjacentAlly(target: Pawn): boolean {
    return target.side === this.side && target.id !== this.id && hexDist(this, target) === 1
  }

  protected spendSpecial(log: string[]): void {
    this.energy -= this.special.cost
    log.push(label(this) + ' uses ' + this.special.name + '.')
  }

  protected beginTargetedSpecial(
    context: SpecialContext,
    position: Axial,
    from: Axial = this,
  ): Pawn | undefined {
    const target = specialTargets(context.pawns, this, from).find(
      (pawn) => pawn.q === position.q && pawn.r === position.r,
    )
    if (target) this.spendSpecial(context.log)
    return target
  }

  constructor(
    id: number,
    q: number,
    r: number,
    side: Side,
    hp?: number,
    energy = START_ENERGY,
    escapeChance = 0,
  ) {
    this.id = id
    this.q = q
    this.r = r
    this.side = side
    this.hp = hp ?? this.maxHp
    this.energy = energy
    this.escapeChance = escapeChance
  }

  get endTurnEscapeChance(): number {
    return Math.min(MAX_ESCAPE, this.escapeChance + this.energy * ESCAPE_BONUS)
  }

  endTurn(): void {
    this.escapeChance = this.endTurnEscapeChance
    this.energy = 0
  }

  clone(): this {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this)
  }
}

export class Swordsman extends Pawn {
  readonly kind = 'swordsman' as const
  get maxHp(): number {
    return 5
  }
  override get chargeRange(): number {
    return 2
  }
  override get specialPhase(): 'charge' {
    return 'charge'
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  readonly special: SpecialAbility = {
    name: 'Charge',
    cost: 2,
    description:
      'Choose a tile up to 2 steps away, then an adjacent enemy. Move and strike for 2 damage. Mountains, lakes, and occupied tiles block the path.',
  }

  override specialTiles({ tiles, pawns }: SpecialBoard): Axial[] {
    return [...chargeDestinations(tiles, pawns, this).keys()].map((k) => tiles.get(k)!)
  }

  override specialActions(board: SpecialBoard): Action[][] {
    return this.specialTiles(board).flatMap((tile) =>
      board.pawns
        .filter((target) => canAttack(this, target, tile))
        .map((target): Action[] => [
          ...targetSpecial(tile),
          { type: 'specialAt', q: target.q, r: target.r },
        ]),
    )
  }

  override damageFromPosition({ target, from, movementCost }: AttackPosition): number {
    if (!canAttack(this, target, from)) return 0
    const damage = (this.energy - movementCost) * this.attack.damage
    const chargeCost = Math.max(0, movementCost - this.chargeRange) + this.special.cost
    return this.energy >= chargeCost
      ? Math.max(damage, (1 + this.energy - chargeCost) * this.attack.damage)
      : damage
  }

  performSpecial(
    context: SpecialContext,
    position: Axial,
    destination?: Axial,
  ): SpecialResult | null {
    const { tiles, pawns, round, log, random } = context
    if (
      !destination ||
      !chargeDestinations(tiles, pawns, this).has(key(destination.q, destination.r))
    )
      return null
    const target = this.beginTargetedSpecial(context, position, destination)
    if (!target) return null
    const route = walkingPaths(tiles, pawns, this, this.chargeRange).get(
      key(destination.q, destination.r),
    )!
    const impacts = enterTiles(tiles, pawns, this, route.path, round, log)
    if (this.hp > 0) impacts.push(strike(pawns, this, target, this.attack, log, random))
    return { kind: 'attack', to: { q: target.q, r: target.r }, impacts }
  }
}

export class King extends Pawn {
  readonly kind = 'king' as const
  get maxHp(): number {
    return 7
  }
  override get specialPhase(): 'move' {
    return 'move'
  }
  override get canUseSpecial(): boolean {
    return super.canUseSpecial && !this.specialUsed
  }
  readonly attack: AttackProfile = { damage: 2, minRange: 1, maxRange: 1 }
  readonly special: SpecialAbility = {
    name: 'Rally',
    cost: 1,
    description:
      'Restore 1 health to every adjacent ally, once per round. Activates immediately. Cannot heal yourself or exceed maximum health.',
  }

  override canTargetSpecial(target: Pawn): boolean {
    return this.adjacentAlly(target) && target.hp < target.maxHp
  }

  override specialActions({ pawns }: SpecialBoard): Action[][] {
    return specialTargets(pawns, this).length ? [[{ type: 'act', action: 'special' }]] : []
  }

  performSpecial({ pawns, log }: SpecialContext): SpecialResult | null {
    const allies = specialTargets(pawns, this)
    if (!allies.length) return null
    this.spendSpecial(log)
    this.specialUsed = true
    for (const ally of allies) {
      ally.hp = Math.min(ally.maxHp, ally.hp + 1)
      log.push(label(ally) + ' recovers 1 health.')
    }
    return { kind: 'rally', to: { q: this.q, r: this.r } }
  }
}

export class Archer extends Pawn {
  readonly kind = 'archer' as const
  override get watchtowerBonus(): number {
    return 1
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 2, maxRange: 3 }
  readonly special: SpecialAbility = {
    name: 'Aimed shot',
    cost: 2,
    description:
      'Deal 2 damage to an enemy 2 to 3 tiles away, ignoring Escape. Cannot shoot adjacent enemies.',
  }

  performSpecial(context: SpecialContext, position: Axial): SpecialResult | null {
    const target = this.beginTargetedSpecial(context, position)
    if (!target) return null
    const profile = { ...this.attack, damage: 2, ignoresEscape: true }
    return {
      kind: 'attack',
      to: { q: target.q, r: target.r },
      impacts: [strike(context.pawns, this, target, profile, context.log, context.random)],
    }
  }
}

export class Magician extends Pawn {
  override damageFromPosition(position: AttackPosition): number {
    const { target, targets, from, movementCost } = position
    const damage = super.damageFromPosition(position)
    const remainingEnergy = this.energy - movementCost
    if (
      remainingEnergy >= this.special.cost &&
      targets.some(
        (neighbor) =>
          hexDist(neighbor, target) <= 1 && canAttack(this, neighbor, { q: from.q, r: from.r }),
      )
    )
      return Math.max(damage, Math.floor(remainingEnergy / this.special.cost))
    return damage
  }

  readonly kind = 'magician' as const
  override get watchtowerBonus(): number {
    return 1
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 2 }
  readonly special: SpecialAbility = {
    name: 'Fireball',
    cost: 2,
    description:
      'Target an enemy within 2 tiles. Deal 1 damage to it and every adjacent enemy. Each may Escape; allies are unharmed.',
  }

  performSpecial(context: SpecialContext, position: Axial): SpecialResult | null {
    const target = this.beginTargetedSpecial(context, position)
    if (!target) return null
    const { pawns, log, random } = context
    const enemies = pawns.filter((p) => p.side !== this.side && hexDist(target, p) <= 1)
    const impacts: BattleImpact[] = []
    for (const enemy of enemies) {
      if (!pawns.includes(enemy)) continue
      const hit = strike(pawns, this, enemy, this.attack, log, random)
      const previous = impacts.find((impact) => impact.q === hit.q && impact.r === hit.r)
      if (previous) previous.damage += hit.damage
      else impacts.push(hit)
    }
    return { kind: 'fireball', to: { q: target.q, r: target.r }, impacts }
  }
}

export class Ninja extends Pawn {
  readonly kind = 'ninja' as const
  get maxHp(): number {
    return 1
  }
  override get jumpRange(): number {
    return 3
  }
  readonly attack: AttackProfile = { damage: 5, minRange: 1, maxRange: 1 }
  readonly special: SpecialAbility = {
    name: 'Jump',
    cost: 2,
    description:
      'Jump up to 3 tiles, passing over terrain and units. Land on empty ground, never a mountain or lake. Jump does not attack.',
  }

  override canTargetSpecial(): boolean {
    return false
  }

  override specialTiles({ tiles, pawns }: SpecialBoard): Axial[] {
    return jumpDestinations(tiles, pawns, this)
  }

  performSpecial(
    { tiles, pawns, round, log }: SpecialContext,
    position: Axial,
  ): SpecialResult | null {
    const tile = jumpDestinations(tiles, pawns, this).find(
      (tile) => tile.q === position.q && tile.r === position.r,
    )
    if (!tile) return null
    this.energy -= this.special.cost
    const impacts = enterTiles(tiles, pawns, this, [tile], round, log)
    return {
      kind: 'move',
      to: { q: this.q, r: this.r },
      ...(impacts.length ? { impacts } : {}),
    }
  }
}

export class Bulwark extends Pawn {
  static override readonly startsOnFrontRow = true
  readonly kind = 'bulwark' as const
  get maxHp(): number {
    return 10
  }
  override get moveCost(): number {
    return 2
  }
  readonly attack: AttackProfile = { damage: 1, minRange: 1, maxRange: 1 }
  readonly special: SpecialAbility = {
    name: 'Protect',
    cost: 2,
    description:
      'Protect an adjacent ally until your next turn. Take its next hit instead, without a second Escape roll. Ends if you separate. Moving costs 2 energy for the first tile, then 1 per extra tile.',
  }

  override canTargetSpecial(target: Pawn): boolean {
    return this.adjacentAlly(target)
  }

  override specialActions({ pawns }: SpecialBoard): Action[][] {
    return specialTargets(pawns, this)
      .filter((target) => !protectorFor(pawns, target))
      .map(targetSpecial)
  }

  performSpecial(context: SpecialContext, position: Axial): SpecialResult | null {
    const target = this.beginTargetedSpecial(context, position)
    if (!target) return null
    this.protectingId = target.id
    context.log.push(label(this) + ' protects ' + target.kind + ' #' + target.id + '.')
    return { kind: 'protect', to: { q: target.q, r: target.r }, impacts: [] }
  }
}

export const RECRUIT_CLASSES = [Swordsman, Archer, Magician, Ninja, Bulwark] as const
