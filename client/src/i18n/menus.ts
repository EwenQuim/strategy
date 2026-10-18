import type { BotDifficulty } from '../lib/engine/ai.ts'
import type { BotName } from '../bots/catalog.ts'
import { plural, t } from './locale.ts'

export const chooseMode = t({
  en: 'Choose game mode',
  fr: 'Choisir un mode de jeu',
  de: 'Spielmodus wählen',
  es: 'Elige el modo de juego',
  it: 'Scegli la modalità di gioco',
})
export const campaign = t({
  en: 'Campaign',
  fr: 'Campagne',
  de: 'Kampagne',
  es: 'Campaña',
  it: 'Campagna',
})
export const campaigns = t({
  en: 'Campaigns',
  fr: 'Campagnes',
  de: 'Kampagnen',
  es: 'Campañas',
  it: 'Campagne',
})
export const quickPlayHint = t({
  en: 'Play a new seeded battle against AI',
  fr: "Jouer une nouvelle bataille contre l'IA",
  de: 'Eine neue Schlacht gegen die KI spielen',
  es: 'Juega una nueva batalla contra la IA',
  it: "Gioca una nuova battaglia contro l'IA",
})
export const online = t({
  en: 'Online',
  fr: 'En ligne',
  de: 'Online',
  es: 'En línea',
  it: 'Online',
})
export const onlineHint = t({
  en: 'Play online, turn by turn',
  fr: 'Jouer en ligne, tour par tour',
  de: 'Online spielen, Zug um Zug',
  es: 'Juega en línea, por turnos',
  it: 'Gioca online, a turni',
})
export const serverDown = t({
  en: 'Game server unreachable',
  fr: 'Serveur de jeu injoignable',
  de: 'Spielserver nicht erreichbar',
  es: 'Servidor de juego inaccesible',
  it: 'Server di gioco irraggiungibile',
})
export const buildHint = t({
  en: 'Git commit used for this build',
  fr: 'Commit Git utilisé pour cette version',
  de: 'Git-Commit dieser Version',
  es: 'Commit de Git usado en esta versión',
  it: 'Commit Git usato per questa versione',
})
export const build = t({
  en: (commit: string) => `Build ${commit}`,
  fr: (commit: string) => `Version ${commit}`,
  de: (commit: string) => `Version ${commit}`,
  es: (commit: string) => `Versión ${commit}`,
  it: (commit: string) => `Versione ${commit}`,
})
export const madeBy = t({
  en: 'Made with ❤️ by EwenQuim',
  fr: 'Fait avec ❤️ par EwenQuim',
  de: 'Mit ❤️ gemacht von EwenQuim',
  es: 'Hecho con ❤️ por EwenQuim',
  it: 'Fatto con ❤️ da EwenQuim',
})

export const human = t({ en: 'Human', fr: 'Humain', de: 'Mensch', es: 'Humano', it: 'Umano' })
export const ai = t({ en: 'AI', fr: 'IA', de: 'KI', es: 'IA', it: 'IA' })
export const controller = t({
  en: 'Controlled by',
  fr: 'Contrôlé par',
  de: 'Gesteuert von',
  es: 'Controlado por',
  it: 'Controllato da',
})
export const gameConfig = t({
  en: 'Game configuration',
  fr: 'Configuration de la partie',
  de: 'Spieleinstellungen',
  es: 'Configuración de la partida',
  it: 'Configurazione della partita',
})
export const aiOptions = t({
  en: 'AI options',
  fr: 'Options IA',
  de: 'KI-Optionen',
  es: 'Opciones de IA',
  it: 'Opzioni IA',
})
export const customOptions = t({
  en: 'Custom',
  fr: 'Personnalisé',
  de: 'Benutzerdefiniert',
  es: 'Personalizado',
  it: 'Personalizzato',
})
export const invalidBotOptions = t({
  en: 'Invalid AI options. Check the values before starting.',
  fr: 'Options IA invalides. Vérifiez les valeurs avant de lancer.',
  de: 'Ungültige KI-Optionen. Werte vor dem Start prüfen.',
  es: 'Opciones de IA inválidas. Revisa los valores antes de empezar.',
  it: 'Opzioni IA non valide. Controlla i valori prima di iniziare.',
})
export const difficulty = t({
  en: 'Difficulty',
  fr: 'Difficulté',
  de: 'Schwierigkeit',
  es: 'Dificultad',
  it: 'Difficoltà',
})
export const difficulties = t<Record<BotDifficulty | 'brutal', string>>({
  en: { easy: 'Easy', normal: 'Normal', hard: 'Hard', brutal: 'Brutal' },
  fr: { easy: 'Facile', normal: 'Normal', hard: 'Difficile', brutal: 'Brutale' },
  de: { easy: 'Leicht', normal: 'Normal', hard: 'Schwer', brutal: 'Brutal' },
  es: { easy: 'Fácil', normal: 'Normal', hard: 'Difícil', brutal: 'Brutal' },
  it: { easy: 'Facile', normal: 'Normale', hard: 'Difficile', brutal: 'Brutale' },
})
export const aiStrategy = t({
  en: 'AI strategy',
  fr: 'Stratégie IA',
  de: 'KI-Strategie',
  es: 'Estrategia IA',
  it: 'Strategia IA',
})
export const aiStrategies = t<Record<BotName, string>>({
  en: {
    napoleon: 'Napoleon',
    hannibal: 'Hannibal',
    caesar: 'Caesar',
    belisarius: 'Belisarius',
    depthsearch: 'Sun Tzu',
    random: 'Pyrrhus',
    mistral: 'Alexander',
    jev: 'Scipio',
  },
  fr: {
    napoleon: 'Napoléon',
    hannibal: 'Hannibal',
    caesar: 'César',
    belisarius: 'Bélisaire',
    depthsearch: 'Sun Tzu',
    random: 'Pyrrhus',
    mistral: 'Alexandre',
    jev: 'Scipion',
  },
  de: {
    napoleon: 'Napoleon',
    hannibal: 'Hannibal',
    caesar: 'Cäsar',
    belisarius: 'Belisar',
    depthsearch: 'Sun Tzu',
    random: 'Pyrrhos',
    mistral: 'Alexander',
    jev: 'Scipio',
  },
  es: {
    napoleon: 'Napoleón',
    hannibal: 'Aníbal',
    caesar: 'César',
    belisarius: 'Belisario',
    depthsearch: 'Sun Tzu',
    random: 'Pirro',
    mistral: 'Alejandro',
    jev: 'Escipión',
  },
  it: {
    napoleon: 'Napoleone',
    hannibal: 'Annibale',
    caesar: 'Cesare',
    belisarius: 'Belisario',
    depthsearch: 'Sun Tzu',
    random: 'Pirro',
    mistral: 'Alessandro',
    jev: 'Scipione',
  },
})
export const biome = t({ en: 'Biome', fr: 'Biome', de: 'Biom', es: 'Bioma', it: 'Bioma' })
export const mirrorRoster = t({
  en: 'Mirror player roster',
  fr: 'Copier la composition du joueur',
  de: 'Aufstellung des Spielers spiegeln',
  es: 'Copiar la alineación del jugador',
  it: 'Copia la formazione del giocatore',
})
export const symmetricMap = t({
  en: 'Mirror the battlefield (central symmetry)',
  fr: 'Symétrie centrale du champ de bataille',
  de: 'Punktsymmetrisches Schlachtfeld',
  es: 'Simetría central del campo de batalla',
  it: 'Simmetria centrale del campo di battaglia',
})
export const rosters = t({
  en: 'Rosters',
  fr: 'Compositions',
  de: 'Aufstellungen',
  es: 'Alineaciones',
  it: 'Formazioni',
})
export const unit = t({ en: 'Unit', fr: 'Unité', de: 'Einheit', es: 'Unidad', it: 'Unità' })
export const king = t({ en: 'King', fr: 'Roi', de: 'König', es: 'Rey', it: 'Re' })
export const total = t({ en: 'Total', fr: 'Total', de: 'Gesamt', es: 'Total', it: 'Totale' })
export const localSides = t({
  en: ['Player 1', 'Player 2'],
  fr: ['Joueur 1', 'Joueur 2'],
  de: ['Spieler 1', 'Spieler 2'],
  es: ['Jugador 1', 'Jugador 2'],
  it: ['Giocatore 1', 'Giocatore 2'],
})
export const rosterLimits = t({
  en: (maxUnits: number) => `One king per side. Up to ${maxUnits} units.`,
  fr: (maxUnits: number) => `Un roi par camp. Jusqu'à ${maxUnits} unités.`,
  de: (maxUnits: number) => `Ein König pro Seite. Bis zu ${maxUnits} Einheiten.`,
  es: (maxUnits: number) => `Un rey por bando. Hasta ${maxUnits} unidades.`,
  it: (maxUnits: number) => `Un re per schieramento. Fino a ${maxUnits} unità.`,
})
export const startBattle = t({
  en: 'Start battle',
  fr: 'Lancer la bataille',
  de: 'Schlacht starten',
  es: 'Empezar batalla',
  it: 'Inizia la battaglia',
})

export const levelsCompleted = t({
  en: (completed: number, levelCount: number) => `${completed} / ${levelCount} completed`,
  fr: (completed: number, levelCount: number) =>
    `${completed} / ${levelCount} ${plural(completed, { one: 'terminé', other: 'terminés' })}`,
  de: (completed: number, levelCount: number) => `${completed} / ${levelCount} abgeschlossen`,
  es: (completed: number, levelCount: number) =>
    `${completed} / ${levelCount} ${plural(completed, { one: 'completado', other: 'completados' })}`,
  it: (completed: number, levelCount: number) =>
    `${completed} / ${levelCount} ${plural(completed, { one: 'completato', other: 'completati' })}`,
})
export const campaignCard = t({
  en: (name: string, completed: number, levelCount: number) =>
    `${name} campaign, ${completed} / ${levelCount} completed`,
  fr: (name: string, completed: number, levelCount: number) =>
    `Campagne ${name}, ${completed} / ${levelCount} ${plural(completed, { one: 'terminé', other: 'terminés' })}`,
  de: (name: string, completed: number, levelCount: number) =>
    `Kampagne ${name}, ${completed} / ${levelCount} abgeschlossen`,
  es: (name: string, completed: number, levelCount: number) =>
    `Campaña ${name}, ${completed} / ${levelCount} ${plural(completed, { one: 'completado', other: 'completados' })}`,
  it: (name: string, completed: number, levelCount: number) =>
    `Campagna ${name}, ${completed} / ${levelCount} ${plural(completed, { one: 'completato', other: 'completati' })}`,
})
export const lockedCampaignCard = t({
  en: (name: string, victories: number, required: number) =>
    `${name} campaign, locked, ${victories} / ${required} victories to unlock`,
  fr: (name: string, victories: number, required: number) =>
    `Campagne ${name}, verrouillée, ${victories} / ${required} victoires pour débloquer`,
  de: (name: string, victories: number, required: number) =>
    `Kampagne ${name}, gesperrt, ${victories} / ${required} Siege zum Freischalten`,
  es: (name: string, victories: number, required: number) =>
    `Campaña ${name}, bloqueada, ${victories} / ${required} victorias para desbloquear`,
  it: (name: string, victories: number, required: number) =>
    `Campagna ${name}, bloccata, ${victories} / ${required} vittorie per sbloccare`,
})
export const victoriesToUnlock = t({
  en: (victories: number, required: number) => `${victories} / ${required} victories to unlock`,
  fr: (victories: number, required: number) =>
    `${victories} / ${required} victoires pour débloquer`,
  de: (victories: number, required: number) =>
    `${victories} / ${required} Siege zum Freischalten`,
  es: (victories: number, required: number) =>
    `${victories} / ${required} victorias para desbloquear`,
  it: (victories: number, required: number) =>
    `${victories} / ${required} vittorie per sbloccare`,
})
export const levelStatus = t({
  en: { completed: 'Completed', ready: 'Ready', locked: 'Locked' },
  fr: { completed: 'Terminé', ready: 'Prêt', locked: 'Verrouillé' },
  de: { completed: 'Abgeschlossen', ready: 'Bereit', locked: 'Gesperrt' },
  es: { completed: 'Completado', ready: 'Listo', locked: 'Bloqueado' },
  it: { completed: 'Completato', ready: 'Pronto', locked: 'Bloccato' },
})
export const levelCard = t({
  en: (id: number, name: string, status: string) => `Level ${id}: ${name}, ${status}`,
  fr: (id: number, name: string, status: string) => `Niveau ${id} : ${name}, ${status}`,
  de: (id: number, name: string, status: string) => `Level ${id}: ${name}, ${status}`,
  es: (id: number, name: string, status: string) => `Nivel ${id}: ${name}, ${status}`,
  it: (id: number, name: string, status: string) => `Livello ${id}: ${name}, ${status}`,
})
export const achievements = t({
  en: 'Achievements',
  fr: 'Succès',
  de: 'Erfolge',
  es: 'Logros',
  it: 'Obiettivi',
})
export const achievementsEarnedIn = t({
  en: 'Earned by winning against the AI, in campaigns or online.',
  fr: "Obtenus en gagnant contre l'IA, en campagne ou en ligne.",
  de: 'Durch Siege gegen die KI, in Kampagnen oder online.',
  es: 'Se consiguen ganando contra la IA, en campañas o en línea.',
  it: "Si ottengono vincendo contro l'IA, in campagna o online.",
})
