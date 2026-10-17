import { t } from './locale.ts'
import type { PawnKind } from '../lib/engine/index.ts'

export const unitNames: Record<PawnKind, string> = {
  king: t({
    en: 'King',
    fr: 'Roi',
    de: 'König',
    es: 'Rey',
    it: 'Re',
  }),
  swordsman: t({
    en: 'Swordsman',
    fr: 'Épéiste',
    de: 'Schwertkämpfer',
    es: 'Espadachín',
    it: 'Spadaccino',
  }),
  archer: t({
    en: 'Archer',
    fr: 'Archer',
    de: 'Schütze',
    es: 'Arquero',
    it: 'Archiere',
  }),
  magician: t({
    en: 'Magician',
    fr: 'Magicien',
    de: 'Magier',
    es: 'Mago',
    it: 'Mago',
  }),
  ninja: t({
    en: 'Ninja',
    fr: 'Ninja',
    de: 'Ninja',
    es: 'Ninja',
    it: 'Ninja',
  }),
  bulwark: t({
    en: 'Bulwark',
    fr: 'Rempart',
    de: 'Bollwerk',
    es: 'Baluarte',
    it: 'Bastione',
  }),
  bomber: t({
    en: 'Bomber',
    fr: 'Grenadier',
    de: 'Grenadier',
    es: 'Granadero',
    it: 'Granatiere',
  }),
  hoplite: t({
    en: 'Hoplite',
    fr: 'Hoplite',
    de: 'Hoplit',
    es: 'Hoplita',
    it: 'Oplita',
  }),
  wolf: t({
    en: 'Wolf',
    fr: 'Loup',
    de: 'Wolf',
    es: 'Lobo',
    it: 'Lupo',
  }),
  berserker: t({
    en: 'Berserker',
    fr: 'Berserker',
    de: 'Berserker',
    es: 'Berserker',
    it: 'Berserker',
  }),
  lancer: t({
    en: 'Lancer',
    fr: 'Lancier',
    de: 'Lanzenträger',
    es: 'Lancero',
    it: 'Lanciere',
  }),
}
