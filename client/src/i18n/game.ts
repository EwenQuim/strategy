import { plural, t } from './locale'

export const battlefield = t({
  en: 'The battlefield',
  fr: 'Le champ de bataille',
  de: 'Das Schlachtfeld',
  es: 'El campo de batalla',
  it: 'Il campo di battaglia',
})
export const battlefieldHint = t({
  en: 'Battlefield. Select a highlighted tile to move or an enemy to attack.',
  fr: 'Champ de bataille. Choisissez une case en surbrillance pour vous déplacer ou un ennemi à attaquer.',
  de: 'Schlachtfeld. Wähle ein markiertes Feld zum Ziehen oder einen Gegner zum Angreifen.',
  es: 'Campo de batalla. Elige una casilla resaltada para moverte o un enemigo para atacar.',
  it: 'Campo di battaglia. Scegli una casella evidenziata per muoverti o un nemico da attaccare.',
})
export const draw = t({
  en: 'Draw',
  fr: 'Match nul',
  de: 'Unentschieden',
  es: 'Empate',
  it: 'Pareggio',
})
export const wins = t({
  en: (name: string) => `${name} wins!`,
  fr: (name: string) => `${name} gagne !`,
  de: (name: string) => `${name} gewinnt!`,
  es: (name: string) => `¡${name} gana!`,
  it: (name: string) => `${name} vince!`,
})
export const attack = t({
  en: 'Attack',
  fr: 'Attaque',
  de: 'Angriff',
  es: 'Ataque',
  it: 'Attacco',
})
export const special = t({
  en: 'Special',
  fr: 'Spécial',
  de: 'Spezial',
  es: 'Especial',
  it: 'Speciale',
})

export const onlineLobby = t({
  en: 'Online lobby',
  fr: 'Salon en ligne',
  de: 'Online-Lobby',
  es: 'Sala en línea',
  it: 'Lobby online',
})
export const home = t({
  en: 'Hexmate home',
  fr: 'Accueil Hexmate',
  de: 'Hexmate-Startseite',
  es: 'Inicio de Hexmate',
  it: 'Home di Hexmate',
})
export const levelProgress = t({
  en: (level: number, total: number) => `Level ${level} / ${total}`,
  fr: (level: number, total: number) => `Niveau ${level} / ${total}`,
  de: (level: number, total: number) => `Level ${level} / ${total}`,
  es: (level: number, total: number) => `Nivel ${level} / ${total}`,
  it: (level: number, total: number) => `Livello ${level} / ${total}`,
})
export const yourTurn = t({
  en: 'Your turn',
  fr: 'À vous',
  de: 'Dein Zug',
  es: 'Tu turno',
  it: 'Tocca a te',
})
export const playerTurn = t({
  en: (name: string) => `${name} turn`,
  fr: (name: string) => `Tour de ${name}`,
  de: (name: string) => `${name} ist am Zug`,
  es: (name: string) => `Turno de ${name}`,
  it: (name: string) => `Turno di ${name}`,
})
export const enemyTurn = t({
  en: 'Enemy turn',
  fr: 'Tour ennemi',
  de: 'Gegner am Zug',
  es: 'Turno enemigo',
  it: 'Turno nemico',
})
export const howToPlay = t({
  en: 'How to play',
  fr: 'Comment jouer',
  de: 'Spielanleitung',
  es: 'Cómo jugar',
  it: 'Come si gioca',
})
export const turnOrder = t({
  en: 'Round turn order',
  fr: 'Ordre des tours',
  de: 'Zugreihenfolge',
  es: 'Orden de turnos',
  it: 'Ordine dei turni',
})

export const victory = t({
  en: 'Victory',
  fr: 'Victoire',
  de: 'Sieg',
  es: 'Victoria',
  it: 'Vittoria',
})
export const defeat = t({
  en: 'Defeat',
  fr: 'Défaite',
  de: 'Niederlage',
  es: 'Derrota',
  it: 'Sconfitta',
})
export const yourGuard = t({
  en: 'Your guard',
  fr: 'Votre garde',
  de: 'Deine Garde',
  es: 'Tu guardia',
  it: 'La tua guardia',
})
export const health = t({ en: 'Health', fr: 'Vie', de: 'Leben', es: 'Vida', it: 'Vita' })
export const energy = t({
  en: 'Energy',
  fr: 'Énergie',
  de: 'Energie',
  es: 'Energía',
  it: 'Energia',
})
export const escape = t({
  en: 'Escape',
  fr: 'Esquive',
  de: 'Ausweichen',
  es: 'Esquiva',
  it: 'Schivata',
})
export const cancel = t({
  en: 'Cancel',
  fr: 'Annuler',
  de: 'Abbrechen',
  es: 'Cancelar',
  it: 'Annulla',
})
export const chooseEnemy = t({
  en: 'Choose enemy',
  fr: 'Choisir un ennemi',
  de: 'Gegner wählen',
  es: 'Elige enemigo',
  it: 'Scegli nemico',
})
export const energyCost = t({
  en: (cost: number) => `${cost} energy`,
  fr: (cost: number) => `${cost} ${plural(cost, { one: 'énergie', other: 'énergies' })}`,
  de: (cost: number) => `${cost} Energie`,
  es: (cost: number) => `${cost} de energía`,
  it: (cost: number) => `${cost} di energia`,
})
export const noTargets = t({
  en: 'No targets',
  fr: 'Aucune cible',
  de: 'Keine Ziele',
  es: 'Sin objetivos',
  it: 'Nessun bersaglio',
})
export const usedThisRound = t({
  en: 'Used this round',
  fr: 'Déjà utilisé',
  de: 'Bereits benutzt',
  es: 'Ya usado',
  it: 'Già usato',
})
export const endTurn = t({
  en: 'End turn',
  fr: 'Finir le tour',
  de: 'Zug beenden',
  es: 'Terminar turno',
  it: 'Fine turno',
})
export const endTurnHint = t({
  en: (escape: number) =>
    `Spend all remaining energy and end this turn. Escape: ${escape}% until the round ends.`,
  fr: (escape: number) =>
    `Dépense toute l'énergie restante et termine ce tour. Esquive : ${escape} % jusqu'à la fin de la manche.`,
  de: (escape: number) =>
    `Verbrauche alle restliche Energie und beende diesen Zug. Ausweichen: ${escape} % bis zum Ende der Runde.`,
  es: (escape: number) =>
    `Gasta toda la energía restante y termina este turno. Esquiva: ${escape} % hasta el final de la ronda.`,
  it: (escape: number) =>
    `Spendi tutta l'energia rimasta e termina questo turno. Schivata: ${escape}% fino alla fine del round.`,
})
export const escapeGain = t({
  en: (gain: number) => `+${gain}% escape`,
  fr: (gain: number) => `+${gain} % esquive`,
  de: (gain: number) => `+${gain} % Ausweichen`,
  es: (gain: number) => `+${gain} % esquiva`,
  it: (gain: number) => `+${gain}% schivata`,
})

export const resultLevel = t({
  en: (level: number, name: string) => `Level ${level}: ${name}`,
  fr: (level: number, name: string) => `Niveau ${level} : ${name}`,
  de: (level: number, name: string) => `Level ${level}: ${name}`,
  es: (level: number, name: string) => `Nivel ${level}: ${name}`,
  it: (level: number, name: string) => `Livello ${level}: ${name}`,
})
export const battleOver = t({
  en: 'The battle is over',
  fr: 'La bataille est terminée',
  de: 'Die Schlacht ist vorbei',
  es: 'La batalla ha terminado',
  it: 'La battaglia è finita',
})
export const battlefieldYours = t({
  en: 'The battlefield is yours.',
  fr: 'Le champ de bataille est à vous.',
  de: 'Das Schlachtfeld gehört dir.',
  es: 'El campo de batalla es tuyo.',
  it: 'Il campo di battaglia è tuo.',
})
export const crownFallen = t({
  en: 'A crown has fallen.',
  fr: 'Une couronne est tombée.',
  de: 'Eine Krone ist gefallen.',
  es: 'Ha caído una corona.',
  it: 'Una corona è caduta.',
})
export const bothKingsFallen = t({
  en: 'Both kings have fallen. Neither army wins.',
  fr: 'Les deux rois sont tombés. Aucune armée ne gagne.',
  de: 'Beide Könige sind gefallen. Keine Armee gewinnt.',
  es: 'Ambos reyes han caído. Ningún ejército gana.',
  it: 'Entrambi i re sono caduti. Nessun esercito vince.',
})
export const kingFallen = t({
  en: (name: string) => `${name}'s king has fallen.`,
  fr: (name: string) => `Le roi de ${name} est tombé.`,
  de: (name: string) => `Der König von ${name} ist gefallen.`,
  es: (name: string) => `El rey de ${name} ha caído.`,
  it: (name: string) => `Il re di ${name} è caduto.`,
})
export const enemyKingFallen = t({
  en: 'Their king has fallen. Your guard stands victorious.',
  fr: 'Leur roi est tombé. Votre garde triomphe.',
  de: 'Ihr König ist gefallen. Deine Garde triumphiert.',
  es: 'Su rey ha caído. Tu guardia triunfa.',
  it: 'Il loro re è caduto. La tua guardia trionfa.',
})
export const yourKingFallen = t({
  en: 'Your king has fallen. Regroup, rethink, and return.',
  fr: 'Votre roi est tombé. Regroupez-vous, repensez, revenez.',
  de: 'Dein König ist gefallen. Sammle dich, überdenke, kehre zurück.',
  es: 'Tu rey ha caído. Reagrúpate, replantéate y vuelve.',
  it: 'Il tuo re è caduto. Raggruppati, ripensaci e torna.',
})
export const nextLevel = t({
  en: 'Next level',
  fr: 'Niveau suivant',
  de: 'Nächstes Level',
  es: 'Siguiente nivel',
  it: 'Livello successivo',
})
export const backToCampaign = t({
  en: 'Back to campaign',
  fr: 'Retour à la campagne',
  de: 'Zurück zur Kampagne',
  es: 'Volver a la campaña',
  it: 'Torna alla campagna',
})
export const retryLevel = t({
  en: 'Retry level',
  fr: 'Rejouer le niveau',
  de: 'Level wiederholen',
  es: 'Reintentar nivel',
  it: 'Riprova livello',
})
export const levelSelection = t({
  en: 'Level selection',
  fr: 'Choix du niveau',
  de: 'Levelauswahl',
  es: 'Selección de nivel',
  it: 'Scelta del livello',
})
export const progressNotSaved = t({
  en: 'Progress could not be saved. It will last only for this tab.',
  fr: "La progression n'a pas pu être enregistrée. Elle ne durera que dans cet onglet.",
  de: 'Der Fortschritt konnte nicht gespeichert werden. Er bleibt nur in diesem Tab erhalten.',
  es: 'No se pudo guardar el progreso. Solo durará en esta pestaña.',
  it: 'Impossibile salvare i progressi. Resteranno solo in questa scheda.',
})
export const newOnlineGame = t({
  en: 'New online game',
  fr: 'Nouvelle partie en ligne',
  de: 'Neues Online-Spiel',
  es: 'Nueva partida en línea',
  it: 'Nuova partita online',
})
export const newGame = t({
  en: 'New game',
  fr: 'Nouvelle partie',
  de: 'Neues Spiel',
  es: 'Nueva partida',
  it: 'Nuova partita',
})

export const levelNumber = t({
  en: (level: string) => `Level ${level}`,
  fr: (level: string) => `Niveau ${level}`,
  de: (level: string) => `Level ${level}`,
  es: (level: string) => `Nivel ${level}`,
  it: (level: string) => `Livello ${level}`,
})
export const go = t({
  en: 'Go !',
  fr: 'En avant !',
  de: 'Los!',
  es: '¡Adelante!',
  it: 'Avanti!',
})
