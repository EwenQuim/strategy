import { plural, t } from './locale'

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

export const energyTitle = t({
  en: 'Energy',
  fr: 'Énergie',
  de: 'Energie',
  es: 'Energía',
  it: 'Energia',
})
export const energyPoints = t({
  en: [
    '3 energy per unit, every round',
    'Moving costs 1 per tile; a Bulwark pays 2 for its first',
    'Mountains and lakes block walking and Charge',
  ],
  fr: [
    '3 énergies par unité, à chaque manche',
    'Se déplacer coûte 1 par case ; un Bulwark paie 2 pour la première',
    'Montagnes et lacs bloquent la marche et la Charge',
  ],
  de: [
    '3 Energie pro Einheit, jede Runde',
    'Bewegen kostet 1 pro Feld; ein Bulwark zahlt 2 für das erste',
    'Berge und Seen blockieren Laufen und Charge',
  ],
  es: [
    '3 de energía por unidad, cada ronda',
    'Moverse cuesta 1 por casilla; un Bulwark paga 2 por la primera',
    'Montañas y lagos bloquean el movimiento a pie y la Charge',
  ],
  it: [
    '3 di energia per unità, ogni round',
    'Muoversi costa 1 per casella; un Bulwark paga 2 per la prima',
    'Montagne e laghi bloccano il movimento a piedi e la Charge',
  ],
})

export const combatTitle = t({
  en: 'Combat',
  fr: 'Combat',
  de: 'Kampf',
  es: 'Combate',
  it: 'Combattimento',
})
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
  de: [
    'Angreifen kostet 1 Energie',
    'Wähle eine Aktion, dann ein hervorgehobenes Ziel; Abbrechen ist kostenlos',
    'Pfeile und Magie fliegen über das Gelände',
  ],
  es: [
    'Atacar cuesta 1 de energía',
    'Elige una acción y luego un objetivo resaltado; cancelar es gratis',
    'Las flechas y la magia vuelan sobre el terreno',
  ],
  it: [
    'Attaccare costa 1 di energia',
    "Scegli un'azione, poi un bersaglio evidenziato; annullare è gratis",
    'Frecce e magia volano sopra il terreno',
  ],
})

export const terrainTitle = t({
  en: 'Terrain',
  fr: 'Terrain',
  de: 'Gelände',
  es: 'Terreno',
  it: 'Terreno',
})
export const terrainPoints = t({
  en: [
    'Special tiles only appear in the two middle rows',
    'Lava deals 1 unavoidable damage per tile entered',
  ],
  fr: [
    "Les cases spéciales n'apparaissent que sur les deux rangées du milieu",
    'La lave inflige 1 dégât inévitable par case traversée',
  ],
  de: [
    'Spezialfelder gibt es nur in den beiden mittleren Reihen',
    'Lava verursacht 1 unvermeidbaren Schaden pro betretenem Feld',
  ],
  es: [
    'Las casillas especiales solo aparecen en las dos filas centrales',
    'La lava inflige 1 daño inevitable por casilla pisada',
  ],
  it: [
    'Le caselle speciali compaiono solo nelle due file centrali',
    'La lava infligge 1 danno inevitabile per casella attraversata',
  ],
})
export const hellfirePoints = t({
  en: ['Hatched tiles take 1 damage at round end', 'If both kings fall, it is a draw'],
  fr: [
    'Les cases hachurées subissent 1 dégât en fin de manche',
    "Si les deux rois tombent, c'est un match nul",
  ],
  de: [
    'Schraffierte Felder erleiden am Rundenende 1 Schaden',
    'Fallen beide Könige, ist es ein Unentschieden',
  ],
  es: [
    'Las casillas rayadas reciben 1 daño al final de la ronda',
    'Si caen ambos reyes, es un empate',
  ],
  it: [
    'Le caselle tratteggiate subiscono 1 danno a fine round',
    'Se cadono entrambi i re, è un pareggio',
  ],
})

export const unitTitle = t({
  en: (kind: string, health: number) => `${kind}: ${health} health`,
  fr: (kind: string, health: number) =>
    `${kind} : ${health} ${plural(health, { one: 'point de vie', other: 'points de vie' })}`,
  de: (kind: string, health: number) =>
    `${kind}: ${health} ${plural(health, { one: 'Lebenspunkt', other: 'Lebenspunkte' })}`,
  es: (kind: string, health: number) =>
    `${kind}: ${health} ${plural(health, { one: 'punto de vida', other: 'puntos de vida' })}`,
  it: (kind: string, health: number) =>
    `${kind}: ${health} ${plural(health, { one: 'punto vita', other: 'punti vita' })}`,
})
export const unitAttack = t({
  en: (damage: number, range: string) => `${damage} damage, range ${range}`,
  fr: (damage: number, range: string) =>
    `${damage} ${plural(damage, { one: 'dégât', other: 'dégâts' })}, portée ${range}`,
  de: (damage: number, range: string) => `${damage} Schaden, Reichweite ${range}`,
  es: (damage: number, range: string) =>
    `${damage} ${plural(damage, { one: 'daño', other: 'daños' })}, alcance ${range}`,
  it: (damage: number, range: string) =>
    `${damage} ${plural(damage, { one: 'danno', other: 'danni' })}, gittata ${range}`,
})
export const unitSpecial = t({
  en: (special: string, cost: number, description: string) =>
    `${special} (${cost} energy): ${description}`,
  fr: (special: string, cost: number, description: string) =>
    `${special} (${cost} ${plural(cost, { one: 'énergie', other: 'énergies' })}) : ${description}`,
  de: (special: string, cost: number, description: string) =>
    `${special} (${cost} Energie): ${description}`,
  es: (special: string, cost: number, description: string) =>
    `${special} (${cost} de energía): ${description}`,
  it: (special: string, cost: number, description: string) =>
    `${special} (${cost} di energia): ${description}`,
})

export const turnTitle = t({ en: 'Turns', fr: 'Tours', de: 'Züge', es: 'Turnos', it: 'Turni' })
export const escapePoint = t({
  en: (bonus: number, max: number) =>
    `End turn turns leftover energy into Escape: +${bonus}% each, up to ${max}%, until the round ends`,
  fr: (bonus: number, max: number) =>
    `Finir le tour convertit l'énergie restante en Esquive : +${bonus} % chacune, jusqu'à ${max} %, jusqu'à la fin de la manche`,
  de: (bonus: number, max: number) =>
    `„Zug beenden“ wandelt übrige Energie in Ausweichen um: je +${bonus} %, bis zu ${max} %, bis zum Rundenende`,
  es: (bonus: number, max: number) =>
    `«Terminar turno» convierte la energía sobrante en Esquiva: +${bonus} % cada una, hasta ${max} %, hasta el final de la ronda`,
  it: (bonus: number, max: number) =>
    `«Fine turno» converte l'energia rimasta in Schivata: +${bonus}% ciascuna, fino al ${max}%, fino alla fine del round`,
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
