import { t } from './locale'

export const noGame = t({
  en: 'No game with this code.',
  fr: 'Aucune partie avec ce code.',
  de: 'Kein Spiel mit diesem Code.',
  es: 'No hay ninguna partida con este código.',
  it: 'Nessuna partita con questo codice.',
})
export const gameFull = t({
  en: 'This game already has two players.',
  fr: 'Cette partie a déjà deux joueurs.',
  de: 'Dieses Spiel hat schon zwei Spieler.',
  es: 'Esta partida ya tiene dos jugadores.',
  it: 'Questa partita ha già due giocatori.',
})
export const title = t({
  en: 'Online play',
  fr: 'Jeu en ligne',
  de: 'Online spielen',
  es: 'Juego en línea',
  it: 'Gioco online',
})
export const yourName = t({
  en: 'Your name',
  fr: 'Votre nom',
  de: 'Dein Name',
  es: 'Tu nombre',
  it: 'Il tuo nome',
})
export const createGame = t({
  en: 'Create new game',
  fr: 'Créer une partie',
  de: 'Neues Spiel erstellen',
  es: 'Crear partida',
  it: 'Crea partita',
})
export const gameCode = t({
  en: 'Game code',
  fr: 'Code de la partie',
  de: 'Spielcode',
  es: 'Código de partida',
  it: 'Codice partita',
})
export const joinGame = t({
  en: 'Join game',
  fr: 'Rejoindre',
  de: 'Beitreten',
  es: 'Unirse',
  it: 'Unisciti',
})
export const resumeGame = t({
  en: 'Resume a game',
  fr: 'Reprendre une partie',
  de: 'Spiel fortsetzen',
  es: 'Reanudar partida',
  it: 'Riprendi partita',
})
export const yourGames = t({
  en: 'Your games',
  fr: 'Vos parties',
  de: 'Deine Spiele',
  es: 'Tus partidas',
  it: 'Le tue partite',
})
export const notFound = t({
  en: 'Not found',
  fr: 'Introuvable',
  de: 'Nicht gefunden',
  es: 'No encontrada',
  it: 'Non trovata',
})
export const loading = t({
  en: 'Loading...',
  fr: 'Chargement...',
  de: 'Wird geladen...',
  es: 'Cargando...',
  it: 'Caricamento...',
})
export const waitingForOpponent = t({
  en: 'Waiting for opponent',
  fr: "En attente d'un adversaire",
  de: 'Warte auf Gegner',
  es: 'Esperando rival',
  it: 'In attesa di un avversario',
})
export const finished = t({
  en: 'Finished',
  fr: 'Terminée',
  de: 'Beendet',
  es: 'Terminada',
  it: 'Terminata',
})
export const versus = t({
  en: (player: string, enemy: string) => `${player} vs ${enemy}`,
  fr: (player: string, enemy: string) => `${player} contre ${enemy}`,
  de: (player: string, enemy: string) => `${player} gegen ${enemy}`,
  es: (player: string, enemy: string) => `${player} contra ${enemy}`,
  it: (player: string, enemy: string) => `${player} contro ${enemy}`,
})
export const lobbyNote = t({
  en: 'Online battles are turn by turn, no timer. Moves sync automatically, so you can close the tab and resume later.',
  fr: "Les batailles en ligne se jouent tour par tour, sans chrono. Les coups se synchronisent automatiquement : vous pouvez fermer l'onglet et reprendre plus tard.",
  de: 'Online-Schlachten laufen Zug um Zug, ohne Zeitlimit. Züge werden automatisch synchronisiert, du kannst den Tab also schließen und später weiterspielen.',
  es: 'Las batallas en línea son por turnos, sin límite de tiempo. Los movimientos se sincronizan solos, así que puedes cerrar la pestaña y seguir más tarde.',
  it: 'Le battaglie online sono a turni, senza timer. Le mosse si sincronizzano da sole, quindi puoi chiudere la scheda e riprendere più tardi.',
})

export const notAPlayer = t({
  en: 'You are not a player in this game.',
  fr: "Vous n'êtes pas joueur dans cette partie.",
  de: 'Du spielst in diesem Spiel nicht mit.',
  es: 'No eres jugador de esta partida.',
  it: 'Non sei un giocatore di questa partita.',
})
export const joinFromLobby = t({
  en: 'Join it from the lobby with the game code, then come back.',
  fr: 'Rejoignez-la depuis le salon avec le code de la partie, puis revenez.',
  de: 'Tritt ihm in der Lobby mit dem Spielcode bei und komm dann zurück.',
  es: 'Únete desde la sala con el código de partida y luego vuelve.',
  it: 'Unisciti dalla lobby con il codice partita, poi torna qui.',
})
export const gameGone = t({
  en: 'This game does not exist anymore.',
  fr: "Cette partie n'existe plus.",
  de: 'Dieses Spiel existiert nicht mehr.',
  es: 'Esta partida ya no existe.',
  it: 'Questa partita non esiste più.',
})
export const onlineGame = t({
  en: 'Online game',
  fr: 'Partie en ligne',
  de: 'Online-Spiel',
  es: 'Partida en línea',
  it: 'Partita online',
})
export const waitingTitle = t({
  en: 'Waiting for an opponent',
  fr: "En attente d'un adversaire",
  de: 'Warte auf einen Gegner',
  es: 'Esperando a un rival',
  it: 'In attesa di un avversario',
})
export const shareCode = t({
  en: (player: string, opponent: string | undefined) =>
    `${player}, share this code. The battle starts as soon as ${opponent ?? 'someone'} has joined.`,
  fr: (player: string, opponent: string | undefined) =>
    `${player}, partagez ce code. La bataille commence dès que ${opponent ?? "quelqu'un"} a rejoint.`,
  de: (player: string, opponent: string | undefined) =>
    `${player}, teile diesen Code. Die Schlacht beginnt, sobald ${opponent ?? 'jemand'} beigetreten ist.`,
  es: (player: string, opponent: string | undefined) =>
    `${player}, comparte este código. La batalla empieza en cuanto ${opponent ?? 'alguien'} se una.`,
  it: (player: string, opponent: string | undefined) =>
    `${player}, condividi questo codice. La battaglia inizia appena ${opponent ?? 'qualcuno'} si unisce.`,
})
export const copyCode = t({
  en: 'Copy code',
  fr: 'Copier le code',
  de: 'Code kopieren',
  es: 'Copiar código',
  it: 'Copia codice',
})
