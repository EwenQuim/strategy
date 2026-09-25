import { plural, t } from './locale'

export const battlefield = t({ en: 'The battlefield', fr: 'Le champ de bataille' })
export const battlefieldHint = t({
  en: 'Battlefield. Select a highlighted tile to move or an enemy to attack.',
  fr: 'Champ de bataille. Choisissez une case en surbrillance pour vous déplacer ou un ennemi à attaquer.',
})
export const draw = t({ en: 'Draw', fr: 'Match nul' })
export const wins = t({
  en: (name: string) => `${name} wins!`,
  fr: (name: string) => `${name} gagne !`,
})
export const attack = t({ en: 'Attack', fr: 'Attaque' })
export const special = t({ en: 'Special', fr: 'Spécial' })

export const onlineLobby = t({ en: 'Online lobby', fr: 'Salon en ligne' })
export const home = t({ en: 'Hexmate home', fr: 'Accueil Hexmate' })
export const levelProgress = t({
  en: (level: number, total: number) => `Level ${level} / ${total}`,
  fr: (level: number, total: number) => `Niveau ${level} / ${total}`,
})
export const yourTurn = t({ en: 'Your turn', fr: 'À vous' })
export const playerTurn = t({
  en: (name: string) => `${name} turn`,
  fr: (name: string) => `Tour de ${name}`,
})
export const enemyTurn = t({ en: 'Enemy turn', fr: 'Tour ennemi' })
export const howToPlay = t({ en: 'How to play', fr: 'Comment jouer' })
export const turnOrder = t({ en: 'Round turn order', fr: 'Ordre des tours' })

export const victory = t({ en: 'Victory', fr: 'Victoire' })
export const defeat = t({ en: 'Defeat', fr: 'Défaite' })
export const yourGuard = t({ en: 'Your guard', fr: 'Votre garde' })
export const health = t({ en: 'Health', fr: 'Vie' })
export const energy = t({ en: 'Energy', fr: 'Énergie' })
export const escape = t({ en: 'Escape', fr: 'Esquive' })
export const cancel = t({ en: 'Cancel', fr: 'Annuler' })
export const chooseEnemy = t({ en: 'Choose enemy', fr: 'Choisir un ennemi' })
export const energyCost = t({
  en: (cost: number) => `${cost} energy`,
  fr: (cost: number) => `${cost} ${plural(cost, { one: 'énergie', other: 'énergies' })}`,
})
export const noTargets = t({ en: 'No targets', fr: 'Aucune cible' })
export const usedThisRound = t({ en: 'Used this round', fr: 'Déjà utilisé' })
export const endTurn = t({ en: 'End turn', fr: 'Finir le tour' })
export const endTurnHint = t({
  en: (escape: number) =>
    `Spend all remaining energy and end this turn. Escape: ${escape}% until the round ends.`,
  fr: (escape: number) =>
    `Dépense toute l'énergie restante et termine ce tour. Esquive : ${escape} % jusqu'à la fin de la manche.`,
})
export const escapeGain = t({
  en: (gain: number) => `+${gain}% escape`,
  fr: (gain: number) => `+${gain} % esquive`,
})

export const resultLevel = t({
  en: (level: number, name: string) => `Level ${level}: ${name}`,
  fr: (level: number, name: string) => `Niveau ${level} : ${name}`,
})
export const battleOver = t({ en: 'The battle is over', fr: 'La bataille est terminée' })
export const battlefieldYours = t({
  en: 'The battlefield is yours.',
  fr: 'Le champ de bataille est à vous.',
})
export const crownFallen = t({ en: 'A crown has fallen.', fr: 'Une couronne est tombée.' })
export const bothKingsFallen = t({
  en: 'Both kings have fallen. Neither army wins.',
  fr: 'Les deux rois sont tombés. Aucune armée ne gagne.',
})
export const kingFallen = t({
  en: (name: string) => `${name}'s king has fallen.`,
  fr: (name: string) => `Le roi de ${name} est tombé.`,
})
export const enemyKingFallen = t({
  en: 'Their king has fallen. Your guard stands victorious.',
  fr: 'Leur roi est tombé. Votre garde triomphe.',
})
export const yourKingFallen = t({
  en: 'Your king has fallen. Regroup, rethink, and return.',
  fr: 'Votre roi est tombé. Regroupez-vous, repensez, revenez.',
})
export const nextLevel = t({ en: 'Next level', fr: 'Niveau suivant' })
export const backToCampaign = t({ en: 'Back to campaign', fr: 'Retour à la campagne' })
export const retryLevel = t({ en: 'Retry level', fr: 'Rejouer le niveau' })
export const levelSelection = t({ en: 'Level selection', fr: 'Choix du niveau' })
export const progressNotSaved = t({
  en: 'Progress could not be saved. It will last only for this tab.',
  fr: "La progression n'a pas pu être enregistrée. Elle ne durera que dans cet onglet.",
})
export const newOnlineGame = t({ en: 'New online game', fr: 'Nouvelle partie en ligne' })
export const newGame = t({ en: 'New game', fr: 'Nouvelle partie' })

export const levelNumber = t({
  en: (level: string) => `Level ${level}`,
  fr: (level: string) => `Niveau ${level}`,
})
export const go = t({ en: 'Go !', fr: 'En avant !' })
