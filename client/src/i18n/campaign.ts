import { t } from './locale'
import { storyLevelNames } from './story-levels'

export const recruitsUnlocked = t({
  en: 'Recruits unlocked',
  fr: 'Recrues débloquées',
  de: 'Rekruten freigeschaltet',
  es: 'Reclutas desbloqueados',
  it: 'Reclute sbloccate',
})
export const unitUnlocked = t({
  en: (unit: string) => `${unit} unlocked!`,
  fr: (unit: string) => `${unit} débloqué !`,
  de: (unit: string) => `${unit} freigeschaltet!`,
  es: (unit: string) => `¡${unit} desbloqueado!`,
  it: (unit: string) => `${unit} sbloccato!`,
})
export const availableInAllModes = t({
  en: 'Available in all modes.',
  fr: 'Disponible dans tous les modes.',
  de: 'In allen Spielmodi verfügbar.',
  es: 'Disponible en todos los modos.',
  it: 'Disponibile in tutte le modalità.',
})
export const unlockRecruitsHint = t({
  en: 'Win against locked units in campaign to unlock them.',
  fr: 'Battez les unités verrouillées en campagne pour les débloquer.',
  de: 'Besiege gesperrte Einheiten in der Kampagne, um sie freizuschalten.',
  es: 'Vence a las unidades bloqueadas en la campaña para desbloquearlas.',
  it: 'Sconfiggi le unità bloccate nella campagna per sbloccarle.',
})

export const campaignNames: Record<
  | 'tutorial'
  | 'original'
  | 'brutal'
  | 'war-of-the-ring'
  | 'iron-throne'
  | 'hot-gates'
  | 'ragnarok',
  string
> = {
  tutorial: t({
    en: 'Tutorial',
    fr: 'Tutoriel',
    de: 'Tutorial',
    es: 'Tutorial',
    it: 'Tutorial',
  }),
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
  'war-of-the-ring': t({
    en: 'War of the Ring',
    fr: "La Guerre de l'anneau",
    de: 'Ringkrieg',
    es: 'Guerra del Anillo',
    it: "Guerra dell'Anello",
  }),
  'iron-throne': t({
    en: 'Iron Throne',
    fr: "Le Trône d'acier",
    de: 'Eiserner Thron',
    es: 'Trono de hierro',
    it: 'Trono di ferro',
  }),
  'hot-gates': t({
    en: 'Thermopylae',
    fr: 'Les Thermopyles',
    de: 'Die Thermopylen',
    es: 'Las Termópilas',
    it: 'Le Termopili',
  }),
  ragnarok: t({
    en: 'Ragnarok',
    fr: 'Ragnarok',
    de: 'Ragnarök',
    es: 'Ragnarok',
    it: 'Ragnarok',
  }),
}

export const campaignName = (campaign: { slug: string }) =>
  campaignNames[campaign.slug as keyof typeof campaignNames] ?? campaign.slug

export const levelName = (level: { name: string }) => levelNames[level.name] ?? level.name

const levelNames: Record<string, string> = {
  'First Steps': t({
    en: 'First Steps',
    fr: 'Premiers pas',
    de: 'Erste Schritte',
    es: 'Primeros pasos',
    it: 'Primi passi',
  }),
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
  ...storyLevelNames,
}
