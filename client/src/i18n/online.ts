import { t } from './locale'

export const noGame = t({ en: 'No game with this code.', fr: 'Aucune partie avec ce code.' })
export const gameFull = t({
  en: 'This game already has two players.',
  fr: 'Cette partie a déjà deux joueurs.',
})
export const title = t({ en: 'Online play', fr: 'Jeu en ligne' })
export const yourName = t({ en: 'Your name', fr: 'Votre nom' })
export const createGame = t({ en: 'Create new game', fr: 'Créer une partie' })
export const gameCode = t({ en: 'Game code', fr: 'Code de la partie' })
export const joinGame = t({ en: 'Join game', fr: 'Rejoindre' })
export const resumeGame = t({ en: 'Resume a game', fr: 'Reprendre une partie' })
export const yourGames = t({ en: 'Your games', fr: 'Vos parties' })
export const notFound = t({ en: 'Not found', fr: 'Introuvable' })
export const loading = t({ en: 'Loading...', fr: 'Chargement...' })
export const waitingForOpponent = t({
  en: 'Waiting for opponent',
  fr: "En attente d'un adversaire",
})
export const finished = t({ en: 'Finished', fr: 'Terminée' })
export const versus = t({
  en: (player: string, enemy: string) => `${player} vs ${enemy}`,
  fr: (player: string, enemy: string) => `${player} contre ${enemy}`,
})
export const lobbyNote = t({
  en: 'Online battles are turn by turn, no timer. Moves sync automatically, so you can close the tab and resume later.',
  fr: "Les batailles en ligne se jouent tour par tour, sans chrono. Les coups se synchronisent automatiquement : vous pouvez fermer l'onglet et reprendre plus tard.",
})

export const notAPlayer = t({
  en: 'You are not a player in this game.',
  fr: "Vous n'êtes pas joueur dans cette partie.",
})
export const joinFromLobby = t({
  en: 'Join it from the lobby with the game code, then come back.',
  fr: 'Rejoignez-la depuis le salon avec le code de la partie, puis revenez.',
})
export const gameGone = t({
  en: 'This game does not exist anymore.',
  fr: "Cette partie n'existe plus.",
})
export const onlineGame = t({ en: 'Online game', fr: 'Partie en ligne' })
export const waitingTitle = t({
  en: 'Waiting for an opponent',
  fr: "En attente d'un adversaire",
})
export const shareCode = t({
  en: (player: string, opponent: string | undefined) =>
    `${player}, share this code. The battle starts as soon as ${opponent ?? 'someone'} has joined.`,
  fr: (player: string, opponent: string | undefined) =>
    `${player}, partagez ce code. La bataille commence dès que ${opponent ?? "quelqu'un"} a rejoint.`,
})
export const copyCode = t({ en: 'Copy code', fr: 'Copier le code' })
