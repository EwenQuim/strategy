import { t } from './locale'

export const eyebrow = t({ en: "Commander's field notes", fr: 'Carnet du commandant' })
export const title = t({ en: 'The art of the turn.', fr: "L'art du tour." })

export const campaignIntro = t({
  en: 'This campaign battle has fixed armies and terrain. Defeat the enemy king to unlock the next level. Losing or leaving does not erase completed levels.',
  fr: "Cette bataille de campagne a des armées et un terrain fixes. Battez le roi ennemi pour débloquer le niveau suivant. Perdre ou quitter n'efface pas les niveaux terminés.",
})
export const customIntro = t({
  en: 'This custom battle uses your chosen armies and biome. Defeat the opposing king to win; losing yours ends the battle.',
  fr: 'Cette bataille personnalisée utilise les armées et le biome choisis. Battez le roi adverse pour gagner ; perdre le vôtre met fin à la bataille.',
})
export const randomIntro = t({
  en: 'Each army has one king, at least one swordsman, and three random recruits. Repeated classes are possible. Both sides get the same lineup, chosen by the game seed. Defeat the enemy king to win; losing yours ends the battle.',
  fr: 'Chaque armée a un roi, au moins un épéiste et trois recrues aléatoires. Une classe peut apparaître plusieurs fois. Les deux camps ont la même composition, tirée de la graine de la partie. Battez le roi ennemi pour gagner ; perdre le vôtre met fin à la bataille.',
})
export const aiDifficulty = t({
  en: (difficulty: string) => `AI difficulty: ${difficulty}.`,
  fr: (difficulty: string) => `Difficulté de l'IA : ${difficulty}.`,
})
export const designedMap = t({
  en: 'Terrain and starting positions are designed for this level; the biome sets its visual theme.',
  fr: 'Le terrain et les positions de départ sont conçus pour ce niveau ; le biome définit son thème visuel.',
})
export const biomeLine = t({
  en: (name: string, description: string) => `${name} has ${description}.`,
  fr: (name: string, description: string) => `${name} : ${description}.`,
})

export const energyTitle = t({
  en: 'Three energy. Every round.',
  fr: 'Trois énergies. À chaque manche.',
})
export const energyBody = t({
  en: 'Each unit starts with 3 energy. The lit unit is yours to command. Moving costs 1 energy per tile; a Bulwark pays 2 for its first tile and 1 after. Numbers show the full cost. Mountains and lakes block walking and Charge. Arrows and magic pass over them.',
  fr: "Chaque unité commence avec 3 énergies. L'unité éclairée est sous vos ordres. Se déplacer coûte 1 énergie par case ; un Rempart paie 2 pour sa première case puis 1. Les nombres indiquent le coût total. Montagnes et lacs bloquent la marche et la Charge. Flèches et magie passent au-dessus.",
})

export const moveTitle = t({ en: 'Make your move.', fr: 'À vous de jouer.' })
export const moveBody = t({
  en: 'Normal attacks cost 1 energy. Each class has its own damage and range. Choose Attack or a targeted special, then a highlighted target. Jump selects an empty landing tile, not an enemy. Rally heals every adjacent ally immediately. Protect selects an adjacent ally; a shield marks the protected unit. Charge first asks for a destination, then an adjacent enemy. Cancelling either step costs nothing. Ranged attacks can pass over terrain.',
  fr: "Une attaque normale coûte 1 énergie. Chaque classe a ses propres dégâts et sa portée. Choisissez Attaque ou une capacité ciblée, puis une cible en surbrillance. Jump choisit une case d'atterrissage vide, pas un ennemi. Rally soigne immédiatement chaque allié adjacent. Protect choisit un allié adjacent ; un bouclier marque l'unité protégée. Charge demande d'abord une destination, puis un ennemi adjacent. Annuler l'une ou l'autre étape ne coûte rien. Les attaques à distance passent au-dessus du terrain.",
})

export const centerTitle = t({ en: 'Control the center.', fr: 'Contrôlez le centre.' })
export const centerOdds = t({
  en: 'Random maps have zero (50%), one (40%), or two (10%) special tiles, only in the two middle rows.',
  fr: 'Les cartes aléatoires ont zéro (50 %), une (40 %) ou deux (10 %) cases spéciales, uniquement sur les deux rangées du milieu.',
})
export const lavaBody = t({
  en: 'Lava costs 1 health for every tile entered, including during Charge. Damage cannot be escaped or redirected by Protect and can be lethal. Jump crosses lava safely but landing on it deals damage. Forests and palms are decorative.',
  fr: 'La lave coûte 1 point de vie par case traversée, Charge comprise. Ces dégâts ne peuvent être esquivés ni redirigés par Protect et peuvent être mortels. Jump franchit la lave sans risque, mais y atterrir inflige des dégâts. Forêts et palmiers sont décoratifs.',
})
export const hellfireBody = t({
  en: 'Hellfire warnings stay fixed for the full round. At round end, units on hatched tiles take 1 damage, ignoring Escape and Protect. Move clear before the last unit finishes. If both kings fall, the battle is a draw.',
  fr: "Les alertes de feu infernal restent fixes toute la manche. En fin de manche, les unités sur les cases hachurées subissent 1 dégât, sans Esquive ni Protect. Écartez-vous avant que la dernière unité ait fini. Si les deux rois tombent, c'est un match nul.",
})

export const unitTitle = t({
  en: (kind: string, health: number) => `${kind}: ${health} health`,
  fr: (kind: string, health: number) => `${kind} : ${health} points de vie`,
})
export const unitBody = t({
  en: (damage: number, range: string, special: string, cost: number) =>
    `${damage} damage, range ${range}. ${special} costs ${cost} energy.`,
  fr: (damage: number, range: string, special: string, cost: number) =>
    `${damage} dégâts, portée ${range}. ${special} coûte ${cost} énergie.`,
})

export const escapeTitle = t({
  en: 'Live to fight another turn.',
  fr: 'Survivre pour mieux combattre.',
})
export const escapeBody = t({
  en: (bonus: number, max: number) =>
    `End turn converts all remaining energy into Escape: +${bonus} percentage points per energy, up to ${max}% chance to avoid each incoming attack. The bonus lasts until the round ends. It is not a movement action.`,
  fr: (bonus: number, max: number) =>
    `Finir le tour convertit toute l'énergie restante en Esquive : +${bonus} points de pourcentage par énergie, jusqu'à ${max} % de chances d'éviter chaque attaque. Le bonus dure jusqu'à la fin de la manche. Ce n'est pas un déplacement.`,
})

export const roundTitle = t({
  en: 'A fresh round. The same order.',
  fr: 'Nouvelle manche. Même ordre.',
})
export const roundBody = t({
  en: 'End turn spends your remaining energy and passes to the next unit. Running out of energy also ends your turn, with no extra Escape bonus.',
  fr: "Finir le tour dépense votre énergie restante et passe à l'unité suivante. Tomber à court d'énergie termine aussi votre tour, sans bonus d'Esquive.",
})
export const localPlayers = t({
  en: 'Share this device: Player 1 commands green units and Player 2 commands red units. Follow the turn indicator for each unit; the same player may act several times in a row.',
  fr: "Partagez cet appareil : le joueur 1 commande les unités vertes et le joueur 2 les rouges. Suivez l'indicateur de tour de chaque unité ; un même joueur peut agir plusieurs fois de suite.",
})
export const onlinePlayers = t({
  en: 'You play against a real opponent online. Only your own units answer to you; wait while the opponent acts. Moves sync every few seconds.',
  fr: "Vous affrontez un vrai adversaire en ligne. Seules vos unités vous obéissent ; patientez pendant que l'adversaire joue. Les coups se synchronisent toutes les quelques secondes.",
})
export const aiPlayers = t({
  en: 'You move first; enemy units act automatically.',
  fr: 'Vous jouez en premier ; les unités ennemies agissent automatiquement.',
})
export const turnOrder = t({
  en: 'Turn order is decided once at the start and stays the same, skipping fallen units. Each new round restores all energy and resets Escape to 0%.',
  fr: "L'ordre des tours est fixé au début et ne change plus, en sautant les unités tombées. Chaque nouvelle manche restaure toute l'énergie et remet l'Esquive à 0 %.",
})
