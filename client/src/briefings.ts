import * as b from './i18n/briefing.ts'
import { specialTexts, unitNames } from './i18n/units.ts'
import { featureTexts } from './i18n/biomes.ts'
import {
  ESCAPE_BONUS,
  MAX_ESCAPE,
  PAWN_CLASSES,
  START_ENERGY,
  type PawnKind,
} from './lib/engine/index.ts'
import type { IntroducedElement } from './lib/campaign.ts'

export interface BriefingElement {
  readonly name: string
  readonly points: readonly string[]
  readonly art?: IntroducedElement
}

function unit(kind: PawnKind, ...specialPoints: string[]): BriefingElement {
  const { maxHp, attack, special } = new PAWN_CLASSES[kind](0, 0, 0, 'player')
  const range =
    attack.minRange === attack.maxRange
      ? String(attack.maxRange)
      : attack.minRange + '-' + attack.maxRange
  return {
    name: unitNames[kind],
    art: kind,
    points: [
      b.statLine(maxHp, attack.damage, range),
      b.specialLine(specialTexts[special.name], special.cost, specialPoints[0]),
      ...specialPoints.slice(1),
    ],
  }
}

export const INTRODUCTIONS: Record<IntroducedElement, readonly BriefingElement[]> = {
  king: [
    { name: b.goal, points: [b.killEnemyKing] },
    {
      name: b.energy,
      points: [
        b.energyPerRound(START_ENERGY),
        b.spendEnergy,
        b.unusedEnergy(ESCAPE_BONUS, MAX_ESCAPE),
      ],
    },
    unit('king', b.rallyBrief, b.loseKing),
  ],
  swordsman: [unit('swordsman', b.chargeBrief)],
  archer: [unit('archer', b.aimedShotBrief, b.archerMinRange)],
  magician: [unit('magician', b.fireballBrief, b.fireballPasses)],
  bulwark: [unit('bulwark', b.protectBrief, b.bulwarkSlow)],
  bomber: [unit('bomber', b.bombBrief, b.bombFriendly)],
  ninja: [unit('ninja', b.jumpBrief, b.jumpNoAttack)],
  lake: [
    {
      name: b.lakes,
      art: 'lake',
      points: [b.blockWalking, b.projectilesPass],
    },
  ],
  mountain: [
    {
      name: b.mountains,
      art: 'mountain',
      points: [b.blockWalking, b.projectilesPass],
    },
  ],
  sand: [
    {
      name: b.desert,
      art: 'sand',
      points: [b.openSand, b.palmsDecorative],
    },
  ],
  lava: [
    {
      name: b.lava,
      art: 'lava',
      points: [b.lavaDamage, b.ignoresEscapeProtect, b.basaltSafe],
    },
  ],
  watchtower: [
    {
      name: featureTexts.watchtower.name,
      art: 'watchtower',
      points: [b.watchtowerRange],
    },
  ],
  spring: [
    {
      name: featureTexts.spring.name,
      art: 'spring',
      points: [b.springStay],
    },
  ],
  rune: [
    {
      name: featureTexts.rune.name,
      art: 'rune',
      points: [b.runeEnergy, b.runeSingleUse],
    },
  ],
  hell: [
    {
      name: b.hellfire,
      art: 'hell',
      points: [b.hellfireDamage, b.ignoresEscapeProtect, b.bothKingsDraw],
    },
  ],
}
