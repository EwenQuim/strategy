import { t } from './locale'

export const campaignIntro = t({
  en: 'Fixed armies and terrain. Defeat the enemy king to unlock the next level.',
  fr: 'Armées et terrain fixes. Battez le roi ennemi pour débloquer le niveau suivant.',
  de: 'Feste Armeen und festes Gelände. Besiege den gegnerischen König, um das nächste Level freizuschalten.',
  es: 'Ejércitos y terreno fijos. Derrota al rey enemigo para desbloquear el siguiente nivel.',
  it: 'Eserciti e terreno fissi. Sconfiggi il re nemico per sbloccare il livello successivo.',
})
export const customIntro = t({
  en: 'This custom battle uses your armies and biome. Defeat the enemy king to win.',
  fr: 'Cette bataille utilise vos armées et votre biome. Battez le roi ennemi pour gagner.',
  de: 'Diese Schlacht nutzt deine Armeen und dein Biom. Besiege den gegnerischen König, um zu gewinnen.',
  es: 'Esta batalla usa tus ejércitos y tu bioma. Derrota al rey enemigo para ganar.',
  it: 'Questa battaglia usa i tuoi eserciti e il tuo bioma. Sconfiggi il re nemico per vincere.',
})
export const randomIntro = t({
  en: 'Both sides get the same random lineup: a king, a swordsman and three recruits. Defeat the enemy king to win.',
  fr: 'Les deux camps ont la même composition aléatoire : un roi, un épéiste et trois recrues. Battez le roi ennemi pour gagner.',
  de: 'Beide Seiten erhalten dieselbe zufällige Aufstellung: einen König, einen Schwertkämpfer und drei Rekruten. Besiege den gegnerischen König, um zu gewinnen.',
  es: 'Ambos bandos reciben la misma formación aleatoria: un rey, un espadachín y tres reclutas. Derrota al rey enemigo para ganar.',
  it: 'Entrambe le parti ricevono la stessa formazione casuale: un re, uno spadaccino e tre reclute. Sconfiggi il re nemico per vincere.',
})
export const aiDifficulty = t({
  en: (difficulty: string) => `AI difficulty: ${difficulty}.`,
  fr: (difficulty: string) => `Difficulté de l'IA : ${difficulty}.`,
  de: (difficulty: string) => `KI-Schwierigkeit: ${difficulty}.`,
  es: (difficulty: string) => `Dificultad de la IA: ${difficulty}.`,
  it: (difficulty: string) => `Difficoltà dell'IA: ${difficulty}.`,
})

export const localPlayers = t({
  en: 'Player 1 commands green units, Player 2 red units',
  fr: 'Le joueur 1 commande les unités vertes, le joueur 2 les rouges',
  de: 'Spieler 1 steuert die grünen Einheiten, Spieler 2 die roten',
  es: 'Jugador 1 controla las unidades verdes, Jugador 2 las rojas',
  it: 'Giocatore 1 comanda le unità verdi, Giocatore 2 quelle rosse',
})
export const onlinePlayers = t({
  en: 'Only your units answer to you; moves sync every few seconds',
  fr: 'Seules vos unités vous obéissent ; les coups se synchronisent toutes les quelques secondes',
  de: 'Nur deine Einheiten gehorchen dir; Züge werden alle paar Sekunden synchronisiert',
  es: 'Solo tus unidades te obedecen; los movimientos se sincronizan cada pocos segundos',
  it: 'Solo le tue unità ti obbediscono; le mosse si sincronizzano ogni pochi secondi',
})
export const aiPlayers = t({
  en: 'You move first; enemy units act automatically',
  fr: 'Vous jouez en premier ; les unités ennemies agissent seules',
  de: 'Du ziehst zuerst; gegnerische Einheiten handeln automatisch',
  es: 'Mueves primero; las unidades enemigas actúan solas',
  it: 'Muovi per primo; le unità nemiche agiscono da sole',
})
export const turnOrder = t({
  en: 'Turn order is decided once and never changes',
  fr: "L'ordre des tours est fixé une fois pour toutes",
  de: 'Die Zugreihenfolge wird einmal festgelegt und ändert sich nie',
  es: 'El orden de turnos se decide una vez y nunca cambia',
  it: "L'ordine dei turni viene deciso una volta e non cambia mai",
})
