import { t } from './locale'

export const campaignNames: Record<'original' | 'brutal', string> = {
  original: t({
    en: 'Original',
    fr: 'Originale',
    de: 'Original',
    es: 'Original',
    it: 'Originale',
  }),
  brutal: t({
    en: 'Brutal',
    fr: 'Brutale',
    de: 'Brutal',
    es: 'Brutal',
    it: 'Brutale',
  }),
}

export const campaignName = (campaign: { slug: string }) =>
  campaignNames[campaign.slug as keyof typeof campaignNames] ?? campaign.slug

export const levelName = (level: { name: string }) => levelNames[level.name] ?? level.name

const levelNames: Record<string, string> = {
  'First Watch': t({
    en: 'First Watch',
    fr: 'Première garde',
    de: 'Erste Wache',
    es: 'Primera guardia',
    it: 'Prima guardia',
  }),
  Bowmen: t({
    en: 'Bowmen',
    fr: 'Archers',
    de: 'Bogenschützen',
    es: 'Arqueros',
    it: 'Arcieri',
  }),
  'River Guard': t({
    en: 'River Guard',
    fr: 'Garde de la rivière',
    de: 'Flusswache',
    es: 'Guardia del río',
    it: 'Guardia del fiume',
  }),
  'Forest Magic': t({
    en: 'Forest Magic',
    fr: 'Magie de la forêt',
    de: 'Waldmagie',
    es: 'Magia del bosque',
    it: 'Magia del bosco',
  }),
  'Highland Keep': t({
    en: 'Highland Keep',
    fr: 'Forteresse des hauteurs',
    de: 'Hochlandfestung',
    es: 'Fortaleza de las tierras altas',
    it: 'Fortezza degli altipiani',
  }),
  'High Pass': t({
    en: 'High Pass',
    fr: 'Haut col',
    de: 'Hochpass',
    es: 'Alto paso',
    it: 'Alto passo',
  }),
  'Stone Wall': t({
    en: 'Stone Wall',
    fr: 'Muraille rocailleuse',
    de: 'Steinmauer',
    es: 'Muralla de piedra',
    it: 'Muro di pietra',
  }),
  'Powder Lesson': t({
    en: 'Powder Lesson',
    fr: 'Leçon de poudre',
    de: 'Pulverlektion',
    es: 'Lección de pólvora',
    it: 'Lezione di polvere',
  }),
  'Split Battery': t({
    en: 'Split Battery',
    fr: 'Batterie divisée',
    de: 'Geteilte Batterie',
    es: 'Batería dividida',
    it: 'Batteria divisa',
  }),
  'Dune Patrol': t({
    en: 'Dune Patrol',
    fr: 'Patrouille des dunes',
    de: 'Dünenpatrouille',
    es: 'Patrulla de las dunas',
    it: 'Pattuglia delle dune',
  }),
  'Twin Daggers': t({
    en: 'Twin Daggers',
    fr: 'Dagues jumelles',
    de: 'Zwillingsdolche',
    es: 'Dagas gemelas',
    it: 'Pugnali gemelli',
  }),
  'Iron Caravan': t({
    en: 'Iron Caravan',
    fr: 'Caravane de fer',
    de: 'Eisenkarawane',
    es: 'Caravana de hierro',
    it: 'Carovana di ferro',
  }),
  'Ember Crossing': t({
    en: 'Ember Crossing',
    fr: 'Traversée de braise',
    de: 'Glutpassage',
    es: 'Cruce de brasas',
    it: 'Attraversamento di braci',
  }),
  'Ember Spring': t({
    en: 'Ember Spring',
    fr: 'Source de braise',
    de: 'Glutquelle',
    es: 'Manantial de brasas',
    it: 'Sorgente di braci',
  }),
  'Cinder Keep': t({
    en: 'Cinder Keep',
    fr: 'Forteresse de cendres',
    de: 'Aschenfestung',
    es: 'Fortaleza de cenizas',
    it: 'Fortezza di cenere',
  }),
  'Wizard Curtain': t({
    en: 'Wizard Curtain',
    fr: 'Rideau magique',
    de: 'Magierwand',
    es: 'Cortina mágica',
    it: 'Cortina magica',
  }),
  "Hell's Gate": t({
    en: "Hell's Gate",
    fr: "Porte de l'Enfer",
    de: 'Höllentor',
    es: 'Puerta del Infierno',
    it: "Porta dell'Inferno",
  }),
  'Caldera Run': t({
    en: 'Caldera Run',
    fr: 'Course dans la caldeira',
    de: 'Kraterlauf',
    es: 'Carrera en la caldera',
    it: 'Corsa nella caldera',
  }),
  'Royal Guard': t({
    en: 'Royal Guard',
    fr: 'Garde royale',
    de: 'Königsgarde',
    es: 'Guardia real',
    it: 'Guardia reale',
  }),
  'Last Crown': t({
    en: 'Last Crown',
    fr: 'Dernière couronne',
    de: 'Letzte Krone',
    es: 'Última corona',
    it: 'Ultima corona',
  }),
}
