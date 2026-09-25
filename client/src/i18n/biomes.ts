import { t } from './locale.ts'
import type { Biome, Terrain, TileFeature } from '../lib/engine/index.ts'

export const terrainNames: Record<Terrain, string> = {
  plain: t({ en: 'Plain', fr: 'Plaine', de: 'Ebene', es: 'Llanura', it: 'Pianura' }),
  forest: t({ en: 'Forest', fr: 'Forêt', de: 'Wald', es: 'Bosque', it: 'Bosco' }),
  mountain: t({ en: 'Mountain', fr: 'Montagne', de: 'Berg', es: 'Montaña', it: 'Montagna' }),
  lake: t({ en: 'Lake', fr: 'Lac', de: 'See', es: 'Lago', it: 'Lago' }),
  sand: t({ en: 'Sand', fr: 'Sable', de: 'Sand', es: 'Arena', it: 'Sabbia' }),
  palm: t({ en: 'Palm', fr: 'Palmier', de: 'Palme', es: 'Palmera', it: 'Palma' }),
  basalt: t({ en: 'Basalt', fr: 'Basalte', de: 'Basalt', es: 'Basalto', it: 'Basalto' }),
  lava: t({ en: 'Lava', fr: 'Lave', de: 'Lava', es: 'Lava', it: 'Lava' }),
}

export const biomeNames: Record<Biome, string> = {
  verdant: t({
    en: 'Verdant Vale',
    fr: 'Vallée verdoyante',
    de: 'Grünes Tal',
    es: 'Valle frondoso',
    it: 'Valle verdeggiante',
  }),
  mountains: t({
    en: 'Mountain Ranges',
    fr: 'Chaînes de montagnes',
    de: 'Bergketten',
    es: 'Cadenas montañosas',
    it: 'Catene montuose',
  }),
  desert: t({
    en: 'Open Desert',
    fr: 'Désert ouvert',
    de: 'Offene Wüste',
    es: 'Desierto abierto',
    it: 'Deserto aperto',
  }),
  volcano: t({
    en: 'Ember Caldera',
    fr: 'Caldeira de braise',
    de: 'Glutkrater',
    es: 'Caldera de brasas',
    it: 'Caldera di braci',
  }),
  hell: t({ en: 'Hell', fr: 'Enfer', de: 'Hölle', es: 'Infierno', it: 'Inferno' }),
}

export const featureTexts: Record<TileFeature, { name: string; description: string }> = {
  watchtower: {
    name: t({
      en: 'Watchtower',
      fr: 'Tour de guet',
      de: 'Wachturm',
      es: 'Atalaya',
      it: 'Torre di vedetta',
    }),
    description: t({
      en: '+1 basic-attack range for Archers and Magicians. Specials and minimum range are unchanged.',
      fr: "+1 de portée d'attaque de base pour les Archers et les Magiciens. Les attaques spéciales et la portée minimale restent inchangées.",
      de: '+1 Grundangriffsreichweite für Schützen und Magier. Spezialfähigkeiten und Mindestreichweite bleiben unverändert.',
      es: '+1 de alcance de ataque básico para Arqueros y Magos. Los especiales y el alcance mínimo no cambian.',
      it: '+1 di gittata di attacco base per Archieri e Maghi. Gli speciali e la gittata minima restano invariati.',
    }),
  },
  spring: {
    name: t({
      en: 'Healing spring',
      fr: 'Source de soin',
      de: 'Heilquelle',
      es: 'Manantial curativo',
      it: 'Sorgente curativa',
    }),
    description: t({
      en: 'Heal 1 health at your next activation after staying here, up to maximum health.',
      fr: 'Récupérez 1 point de vie à votre prochaine activation après être resté ici, dans la limite de la vie maximale.',
      de: 'Heile 1 Leben bei deiner nächsten Aktivierung, nachdem du hier geblieben bist, bis zum Lebensmaximum.',
      es: 'Recupera 1 de vida en tu próxima activación tras quedarte aquí, hasta la vida máxima.',
      it: 'Recupera 1 vita alla tua prossima attivazione dopo essere rimasto qui, fino alla vita massima.',
    }),
  },
  rune: {
    name: t({
      en: 'Power rune',
      fr: 'Rune de puissance',
      de: 'Kraftrune',
      es: 'Runa de poder',
      it: 'Runa del potere',
    }),
    description: t({
      en: 'Collect once for +2 energy this round. Disappears on entry; no permanent bonus.',
      fr: 'Récupérez-la une fois pour +2 énergies cette manche. Elle disparaît à l’entrée ; aucun bonus permanent.',
      de: 'Einmal einsammeln für +2 Energie in dieser Runde. Verschwindet beim Betreten; kein dauerhafter Bonus.',
      es: 'Recógela una vez para +2 de energía esta ronda. Desaparece al pisarla; sin bonus permanente.',
      it: 'Raccoglila una volta per +2 energia in questo round. Sparisce al passaggio; nessun bonus permanente.',
    }),
  },
}
