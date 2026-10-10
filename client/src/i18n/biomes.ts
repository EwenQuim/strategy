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
    fr: 'Mer de sable',
    de: 'Sandmeer',
    es: 'Mar de arena',
    it: 'Mare di sabbia',
  }),
  volcano: t({
    en: 'Ember Caldera',
    fr: 'Cratère de braise',
    de: 'Glutkrater',
    es: 'Cráter de brasas',
    it: 'Cratere di braci',
  }),
  hell: t({ en: 'Hell', fr: 'Enfer', de: 'Hölle', es: 'Infierno', it: 'Inferno' }),
  magic: t({
    en: 'Magic World',
    fr: 'Monde magique',
    de: 'Magische Welt',
    es: 'Mundo mágico',
    it: 'Mondo magico',
  }),
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
      en: '+1 basic-attack range for Archers and Magicians.',
      fr: "+1 de portée d'attaque de base pour les Archers et les Magiciens.",
      de: '+1 Grundangriffsreichweite für Schützen und Magier.',
      es: '+1 de alcance de ataque básico para Arqueros y Magos.',
      it: '+1 di gittata di attacco base per Archieri e Maghi.',
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
      en: 'Heal 1 health at your next activation after staying here.',
      fr: 'Récupérez 1 point de vie à votre prochaine activation après être resté ici.',
      de: 'Heile 1 Leben bei deiner nächsten Aktivierung, nachdem du hier geblieben bist.',
      es: 'Recupera 1 de vida en tu próxima activación tras quedarte aquí.',
      it: 'Recupera 1 vita alla tua prossima attivazione dopo essere rimasto qui.',
    }),
  },
  portal: {
    name: t({
      en: 'Portal',
      fr: 'Portail',
      de: 'Portal',
      es: 'Portal',
      it: 'Portale',
    }),
    description: t({
      en: 'Step in and continue from the twin portal; the crossing counts as one tile.',
      fr: 'Entrez et ressortez par le portail jumeau ; la traversée compte pour une case.',
      de: 'Tritt ein und fahre vom Zwillingsportal fort; der Übergang zählt als ein Feld.',
      es: 'Entra y continúa desde el portal gemelo; el cruce cuenta como una casilla.',
      it: "Entra e prosegui dal portale gemello; l'attraversamento conta come una casella.",
    }),
  },
  den: {
    name: t({
      en: 'Sleeping beast',
      fr: 'Bête endormie',
      de: 'Schlafende Bestie',
      es: 'Bestia dormida',
      it: 'Bestia addormentata',
    }),
    description: t({
      en: 'Blocked ground. The first side to move beside it wakes the beast on their side.',
      fr: "Terrain bloqué. Le premier camp à s'en approcher réveille la bête pour son compte.",
      de: 'Blockiertes Gelände. Wer sich zuerst daneben bewegt, erweckt die Bestie auf seine Seite.',
      es: 'Terreno bloqueado. El primer bando que se mueva a su lado despierta a la bestia para sí.',
      it: 'Terreno bloccato. Il primo schieramento che si muove accanto la sveglia per sé.',
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
      en: 'Collect once for +2 energy this round.',
      fr: 'Récupérez-la une fois pour +2 énergies cette manche.',
      de: 'Einmal einsammeln für +2 Energie in dieser Runde.',
      es: 'Recógela una vez para +2 de energía esta ronda.',
      it: 'Raccoglila una volta per +2 energia in questo round.',
    }),
  },
}
