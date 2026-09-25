import { plural, t } from './locale'

export const campaignIntro = t({
  en: 'Fixed armies and terrain. Defeat the enemy king to unlock the next level.',
  fr: 'Armées et terrain fixes. Battez le roi ennemi pour débloquer le niveau suivant.',
})
export const customIntro = t({
  en: 'This custom battle uses your armies and biome. Defeat the enemy king to win.',
  fr: 'Cette bataille utilise vos armées et votre biome. Battez le roi ennemi pour gagner.',
})
export const randomIntro = t({
  en: 'Both sides get the same random lineup: a king, a swordsman and three recruits. Defeat the enemy king to win.',
  fr: 'Les deux camps ont la même composition aléatoire : un roi, un épéiste et trois recrues. Battez le roi ennemi pour gagner.',
})
export const aiDifficulty = t({
  en: (difficulty: string) => `AI difficulty: ${difficulty}.`,
  fr: (difficulty: string) => `Difficulté de l'IA : ${difficulty}.`,
})

export const energyTitle = t({ en: 'Energy', fr: 'Énergie' })
export const energyPoints = t({
  en: [
    '3 energy per unit, every round',
    'Moving costs 1 per tile; a Bulwark pays 2 for its first',
    'Mountains and lakes block walking and Charge',
  ],
  fr: [
    '3 énergies par unité, à chaque manche',
    'Se déplacer coûte 1 par case ; un Rempart paie 2 pour la première',
    'Montagnes et lacs bloquent la marche et la Charge',
  ],
})

export const combatTitle = t({ en: 'Combat', fr: 'Combat' })
export const combatPoints = t({
  en: [
    'Attack costs 1 energy',
    'Pick an action, then a highlighted target; cancelling is free',
    'Arrows and magic fly over terrain',
  ],
  fr: [
    'Attaquer coûte 1 énergie',
    'Choisissez une action, puis une cible en surbrillance ; annuler est gratuit',
    'Flèches et magie passent au-dessus du terrain',
  ],
})

export const terrainTitle = t({ en: 'Terrain', fr: 'Terrain' })
export const terrainPoints = t({
  en: [
    'Special tiles only appear in the two middle rows',
    'Lava deals 1 unavoidable damage per tile entered',
  ],
  fr: [
    "Les cases spéciales n'apparaissent que sur les deux rangées du milieu",
    'La lave inflige 1 dégât inévitable par case traversée',
  ],
})
export const hellfirePoints = t({
  en: ['Hatched tiles take 1 damage at round end', 'If both kings fall, it is a draw'],
  fr: [
    'Les cases hachurées subissent 1 dégât en fin de manche',
    "Si les deux rois tombent, c'est un match nul",
  ],
})

export const unitTitle = t({
  en: (kind: string, health: number) => `${kind}: ${health} health`,
  fr: (kind: string, health: number) =>
    `${kind} : ${health} ${plural(health, { one: 'point de vie', other: 'points de vie' })}`,
})
export const unitAttack = t({
  en: (damage: number, range: string) => `${damage} damage, range ${range}`,
  fr: (damage: number, range: string) =>
    `${damage} ${plural(damage, { one: 'dégât', other: 'dégâts' })}, portée ${range}`,
})
export const unitSpecial = t({
  en: (special: string, cost: number, description: string) =>
    `${special} (${cost} energy): ${description}`,
  fr: (special: string, cost: number, description: string) =>
    `${special} (${cost} ${plural(cost, { one: 'énergie', other: 'énergies' })}) : ${description}`,
})

export const turnTitle = t({ en: 'Turns', fr: 'Tours' })
export const escapePoint = t({
  en: (bonus: number, max: number) =>
    `End turn turns leftover energy into Escape: +${bonus}% each, up to ${max}%, until the round ends`,
  fr: (bonus: number, max: number) =>
    `Finir le tour convertit l'énergie restante en Esquive : +${bonus} % chacune, jusqu'à ${max} %, jusqu'à la fin de la manche`,
})
export const localPlayers = t({
  en: 'Player 1 commands green units, Player 2 red units',
  fr: 'Le joueur 1 commande les unités vertes, le joueur 2 les rouges',
})
export const onlinePlayers = t({
  en: 'Only your units answer to you; moves sync every few seconds',
  fr: 'Seules vos unités vous obéissent ; les coups se synchronisent toutes les quelques secondes',
})
export const aiPlayers = t({
  en: 'You move first; enemy units act automatically',
  fr: 'Vous jouez en premier ; les unités ennemies agissent seules',
})
export const turnOrder = t({
  en: 'Turn order is decided once and never changes',
  fr: "L'ordre des tours est fixé une fois pour toutes",
})
