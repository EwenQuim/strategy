import type { BotDifficulty } from '../lib/engine/ai'
import { t } from './locale'

export const chooseMode = t({ en: 'Choose game mode', fr: 'Choisir un mode de jeu' })
export const campaign = t({ en: 'Campaign', fr: 'Campagne' })
export const campaigns = t({ en: 'Campaigns', fr: 'Campagnes' })
export const quickPlayHint = t({
  en: 'Play a new seeded battle against AI',
  fr: "Jouer une nouvelle bataille contre l'IA",
})
export const twoPlayers = t({ en: '2 players', fr: '2 joueurs' })
export const twoPlayersHint = t({
  en: 'Play together on this device',
  fr: 'Jouer à deux sur cet appareil',
})
export const online = t({ en: 'Online', fr: 'En ligne' })
export const onlineHint = t({
  en: 'Play online, turn by turn',
  fr: 'Jouer en ligne, tour par tour',
})
export const serverDown = t({ en: 'Game server unreachable', fr: 'Serveur de jeu injoignable' })
export const buildHint = t({
  en: 'Git commit used for this build',
  fr: 'Commit Git utilisé pour cette version',
})
export const build = t({
  en: (commit: string) => `Build ${commit}`,
  fr: (commit: string) => `Version ${commit}`,
})
export const madeBy = t({ en: 'Made with ❤️ by EwenQuim', fr: 'Fait avec ❤️ par EwenQuim' })

export const mode = t({ en: 'Mode', fr: 'Mode' })
export const difficulty = t({ en: 'Difficulty', fr: 'Difficulté' })
export const aiOnly = t({ en: ' (AI only)', fr: ' (IA seulement)' })
export const difficulties = t<Record<BotDifficulty, string>>({
  en: { easy: 'Easy', normal: 'Normal', hard: 'Hard' },
  fr: { easy: 'Facile', normal: 'Normal', hard: 'Difficile' },
})
export const biome = t({ en: 'Biome', fr: 'Biome' })
export const mirrorRoster = t({
  en: 'Mirror player roster',
  fr: 'Copier la composition du joueur',
})
export const rosters = t({ en: 'Rosters', fr: 'Compositions' })
export const unit = t({ en: 'Unit', fr: 'Unité' })
export const king = t({ en: 'King', fr: 'Roi' })
export const total = t({ en: 'Total', fr: 'Total' })
export const localSides = t({ en: ['Player 1', 'Player 2'], fr: ['Joueur 1', 'Joueur 2'] })
export const aiSides = t({ en: ['Player', 'Enemy'], fr: ['Joueur', 'Ennemi'] })
export const rosterLimits = t({
  en: (maxUnits: number, maxBulwarks: number) =>
    `One king per side. Up to ${maxUnits} units; player Bulwarks are limited to ${maxBulwarks}.`,
  fr: (maxUnits: number, maxBulwarks: number) =>
    `Un roi par camp. Jusqu'à ${maxUnits} unités ; les Remparts du joueur sont limités à ${maxBulwarks}.`,
})
export const startBattle = t({ en: 'Start battle', fr: 'Lancer la bataille' })

export const levelsCompleted = t({
  en: (completed: number, total: number) => `${completed} / ${total} completed`,
  fr: (completed: number, total: number) => `${completed} / ${total} terminés`,
})
export const campaignCard = t({
  en: (name: string, completed: number, total: number) =>
    `${name} campaign, ${completed} / ${total} completed`,
  fr: (name: string, completed: number, total: number) =>
    `Campagne ${name}, ${completed} / ${total} terminés`,
})
export const levelStatus = t({
  en: { completed: 'Completed', ready: 'Ready', locked: 'Locked' },
  fr: { completed: 'Terminé', ready: 'Prêt', locked: 'Verrouillé' },
})
export const levelCard = t({
  en: (id: number, name: string, status: string) => `Level ${id}: ${name}, ${status}`,
  fr: (id: number, name: string, status: string) => `Niveau ${id} : ${name}, ${status}`,
})
