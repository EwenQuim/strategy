import type { BotDifficulty } from '../lib/engine/ai'
import { plural, t } from './locale'

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
export const twoPlayers = t({
  en: '2 players',
  fr: '2 joueurs',
  de: '2 Spieler',
  es: '2 jugadores',
  it: '2 giocatori',
})
export const twoPlayersHint = t({
  en: 'Play together on this device',
  fr: 'Jouer à deux sur cet appareil',
  de: 'Zu zweit auf diesem Gerät spielen',
  es: 'Jugad juntos en este dispositivo',
  it: 'Giocate insieme su questo dispositivo',
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

export const mode = t({ en: 'Mode', fr: 'Mode', de: 'Modus', es: 'Modo', it: 'Modalità' })
export const difficulty = t({
  en: 'Difficulty',
  fr: 'Difficulté',
  de: 'Schwierigkeit',
  es: 'Dificultad',
  it: 'Difficoltà',
})
export const aiOnly = t({
  en: ' (AI only)',
  fr: ' (IA seulement)',
  de: ' (nur KI)',
  es: ' (solo IA)',
  it: ' (solo IA)',
})
export const difficulties = t<Record<BotDifficulty, string>>({
  en: { easy: 'Easy', normal: 'Normal', hard: 'Hard' },
  fr: { easy: 'Facile', normal: 'Normal', hard: 'Difficile' },
  de: { easy: 'Leicht', normal: 'Normal', hard: 'Schwer' },
  es: { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' },
  it: { easy: 'Facile', normal: 'Normale', hard: 'Difficile' },
})
export const biome = t({ en: 'Biome', fr: 'Biome', de: 'Biom', es: 'Bioma', it: 'Bioma' })
export const mirrorRoster = t({
  en: 'Mirror player roster',
  fr: 'Copier la composition du joueur',
  de: 'Aufstellung des Spielers spiegeln',
  es: 'Copiar la alineación del jugador',
  it: 'Copia la formazione del giocatore',
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
export const aiSides = t({
  en: ['Player', 'Enemy'],
  fr: ['Joueur', 'Ennemi'],
  de: ['Spieler', 'Gegner'],
  es: ['Jugador', 'Enemigo'],
  it: ['Giocatore', 'Nemico'],
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
  en: (completed: number, total: number) => `${completed} / ${total} completed`,
  fr: (completed: number, total: number) =>
    `${completed} / ${total} ${plural(completed, { one: 'terminé', other: 'terminés' })}`,
  de: (completed: number, total: number) => `${completed} / ${total} abgeschlossen`,
  es: (completed: number, total: number) =>
    `${completed} / ${total} ${plural(completed, { one: 'completado', other: 'completados' })}`,
  it: (completed: number, total: number) =>
    `${completed} / ${total} ${plural(completed, { one: 'completato', other: 'completati' })}`,
})
export const campaignCard = t({
  en: (name: string, completed: number, total: number) =>
    `${name} campaign, ${completed} / ${total} completed`,
  fr: (name: string, completed: number, total: number) =>
    `Campagne ${name}, ${completed} / ${total} ${plural(completed, { one: 'terminé', other: 'terminés' })}`,
  de: (name: string, completed: number, total: number) =>
    `Kampagne ${name}, ${completed} / ${total} abgeschlossen`,
  es: (name: string, completed: number, total: number) =>
    `Campaña ${name}, ${completed} / ${total} ${plural(completed, { one: 'completado', other: 'completados' })}`,
  it: (name: string, completed: number, total: number) =>
    `Campagna ${name}, ${completed} / ${total} ${plural(completed, { one: 'completato', other: 'completati' })}`,
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
