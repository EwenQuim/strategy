import { t } from './locale'

export const goal = t({
  en: 'Goal',
  fr: 'Objectif',
  de: 'Ziel',
  es: 'Objetivo',
  it: 'Obiettivo',
})
export const turnOrder = t({
  en: 'Turn order',
  fr: 'Ordre des tours',
  de: 'Zugreihenfolge',
  es: 'Orden de turnos',
  it: 'Ordine dei turni',
})
export const unitByUnit = t({
  en: 'Units act one at a time, both armies mixed, not one player after the other',
  fr: "Les unités jouent une par une, armées mêlées, et non un joueur après l'autre",
  de: 'Einheiten ziehen einzeln, beide Armeen gemischt, nicht Spieler nach Spieler',
  es: 'Las unidades actúan de una en una, ambos ejércitos mezclados, no jugador tras jugador',
  it: "Le unità agiscono una alla volta, eserciti mescolati, non un giocatore dopo l'altro",
})
export const fixedOrder = t({
  en: 'The order is set once and repeats every round: the top bar shows who is next',
  fr: "L'ordre est fixé une fois et se répète à chaque manche : la barre du haut montre qui suit",
  de: 'Die Reihenfolge steht einmal fest und wiederholt sich jede Runde: die obere Leiste zeigt, wer folgt',
  es: 'El orden se fija una vez y se repite cada ronda: la barra superior muestra quién sigue',
  it: "L'ordine è fissato una volta e si ripete ogni round: la barra in alto mostra chi segue",
})
export const energy = t({
  en: 'Energy',
  fr: 'Énergie',
  de: 'Energie',
  es: 'Energía',
  it: 'Energia',
})
export const killEnemyKing = t({
  en: 'Kill the enemy king',
  fr: 'Tuez le roi ennemi',
  de: 'Besiege den gegnerischen König',
  es: 'Mata al rey enemigo',
  it: 'Uccidi il re nemico',
})
export const energyPerRound = t({
  en: (count: number) => `${count} per unit each round`,
  fr: (count: number) => `${count} par unité et par manche`,
  de: (count: number) => `${count} pro Einheit pro Runde`,
  es: (count: number) => `${count} por unidad en cada ronda`,
  it: (count: number) => `${count} per unità a ogni round`,
})
export const spendEnergy = t({
  en: 'Move and use your signature ability once per activation, in either order',
  fr: 'Déplacez-vous et utilisez votre capacité une fois par activation, dans l’ordre souhaité',
  de: 'Bewege dich und nutze deine Fähigkeit einmal pro Aktivierung, in beliebiger Reihenfolge',
  es: 'Muévete y usa tu habilidad una vez por activación, en cualquier orden',
  it: 'Muoviti e usa la tua abilità una volta per attivazione, in qualsiasi ordine',
})
export const unusedEnergy = t({
  en: 'Unused energy expires.',
  fr: 'L’énergie inutilisée est perdue.',
  de: 'Ungenutzte Energie verfällt.',
  es: 'La energía sin usar se pierde.',
  it: 'L’energia inutilizzata si perde.',
})

export const loseKing = t({
  en: 'Lose your king, lose the battle',
  fr: 'Perdez votre roi, perdez la bataille',
  de: 'Verlierst du deinen König, verlierst du die Schlacht',
  es: 'Pierde tu rey, pierde la batalla',
  it: 'Perdi il tuo re, perdi la battaglia',
})
export const archerMinRange = t({
  en: 'Cannot shoot adjacent enemies',
  fr: 'Ne peut pas tirer sur les ennemis adjacents',
  de: 'Kann angrenzende Gegner nicht beschießen',
  es: 'No puede disparar a enemigos adyacentes',
  it: 'Non può colpire i nemici adiacenti',
})
export const fireballPasses = t({
  en: 'Passes through everything, allies safe',
  fr: 'Traverse tout, les alliés sont épargnés',
  de: 'Durchdringt alles, Verbündete bleiben unversehrt',
  es: 'Atraviesa todo, los aliados están a salvo',
  it: 'Attraversa tutto, gli alleati sono salvi',
})
export const bulwarkSlow = t({
  en: 'Mobile shield: 1 energy per step, no offensive ability',
  fr: 'Bouclier mobile : 1 énergie par pas, aucune capacité offensive',
  de: 'Mobiler Schild: 1 Energie pro Schritt, keine offensive Fähigkeit',
  es: 'Escudo móvil: 1 energía por paso, sin habilidad ofensiva',
  it: 'Scudo mobile: 1 energia per passo, nessuna abilità offensiva',
})
export const bombFriendly = t({
  en: 'Hits allies and the bomber too',
  fr: 'Touche aussi les alliés et le grenadier',
  de: 'Trifft auch Verbündete und den Grenadier',
  es: 'También afecta a aliados y al granadero',
  it: 'Colpisce anche gli alleati e il granatiere',
})
export const jumpNoAttack = t({
  en: 'Fragile: plan your retreat',
  fr: 'Fragile : préparez votre retraite',
  de: 'Zerbrechlich: plane deinen Rückzug',
  es: 'Frágil: planea tu retirada',
  it: 'Fragile: pianifica la ritirata',
})

export const lakes = t({
  en: 'Lakes',
  fr: 'Lacs',
  de: 'Seen',
  es: 'Lagos',
  it: 'Laghi',
})
export const mountains = t({
  en: 'Mountains',
  fr: 'Montagnes',
  de: 'Berge',
  es: 'Montañas',
  it: 'Montagne',
})
export const desert = t({
  en: 'Desert',
  fr: 'Désert',
  de: 'Wüste',
  es: 'Desierto',
  it: 'Deserto',
})
export const lava = t({
  en: 'Lava',
  fr: 'Lave',
  de: 'Lava',
  es: 'Lava',
  it: 'Lava',
})
export const hellfire = t({
  en: 'Hellfire',
  fr: 'Feu de l’enfer',
  de: 'Höllenfeuer',
  es: 'Fuego infernal',
  it: 'Fuoco infernale',
})
export const blockWalking = t({
  en: 'Block walking and Charge',
  fr: 'Bloquent la marche et la Charge',
  de: 'Blockieren Gehen und Sturmangriff',
  es: 'Bloquean el desplazamiento y la Carga',
  it: 'Bloccano il movimento e la Carica',
})
export const projectilesPass = t({
  en: 'Arrows and spells pass',
  fr: 'Les flèches et les sorts passent',
  de: 'Pfeile und Zauber fliegen hindurch',
  es: 'Las flechas y los hechizos pasan',
  it: 'Frecce e incantesimi passano',
})
export const openSand = t({
  en: 'Open sand, no cover',
  fr: 'Sable à ciel ouvert, aucun couvert',
  de: 'Offener Sand, keine Deckung',
  es: 'Arena abierta, sin cobertura',
  it: 'Sabbia aperta, nessun riparo',
})
export const palmsDecorative = t({
  en: 'Palms are decorative',
  fr: 'Les palmiers sont décoratifs',
  de: 'Palmen sind rein dekorativ',
  es: 'Las palmeras son decorativas',
  it: 'Le palme sono decorative',
})
export const lavaDamage = t({
  en: '-1 HP per tile entered, even on Charge',
  fr: '-1 PV par case entrée, même en Charge',
  de: '-1 LP pro betretenem Feld, auch beim Sturmangriff',
  es: '-1 PV por casilla pisada, incluso con Carga',
  it: '-1 PV per casella calpestata, anche in Carica',
})
export const ignoresProtection = t({
  en: 'Ignores protection',
  fr: 'Ignore la protection',
  de: 'Ignoriert Schutz',
  es: 'Ignora la protección',
  it: 'Ignora la protezione',
})
export const basaltSafe = t({
  en: 'Basalt is safe',
  fr: 'Le basalte est sûr',
  de: 'Basalt ist sicher',
  es: 'El basalto es seguro',
  it: 'Il basalto è sicuro',
})
export const watchtowerRange = t({
  en: 'Archer: +1 shot range',
  fr: 'Archer : +1 de portée de tir',
  de: 'Schütze: +1 Schussreichweite',
  es: 'Arquero: +1 alcance de disparo',
  it: 'Arciere: +1 gittata di tiro',
})
export const springStay = t({
  en: 'Stay until next turn: +1 HP',
  fr: 'Restez jusqu’au prochain tour : +1 PV',
  de: 'Bleib bis zum nächsten Zug: +1 LP',
  es: 'Quédate hasta el próximo turno: +1 PV',
  it: 'Resta fino al prossimo turno: +1 PV',
})
export const runeEnergy = t({
  en: 'First unit in: +2 energy this round',
  fr: 'Première unité dessus : +2 énergies cette manche',
  de: 'Erste Einheit darauf: +2 Energie in dieser Runde',
  es: 'Primera unidad encima: +2 de energía esta ronda',
  it: 'Prima unità sopra: +2 energia in questo round',
})
export const runeSingleUse = t({
  en: 'Single use',
  fr: 'Usage unique',
  de: 'Einmalige Nutzung',
  es: 'Un solo uso',
  it: 'Uso singolo',
})
export const hellfireDamage = t({
  en: 'Hatched area: 1 dmg at round end',
  fr: 'Zone hachurée : 1 dégât à la fin de la manche',
  de: 'Schraffierte Fläche: 1 Schaden am Rundenende',
  es: 'Zona rayada: 1 de daño al final de la ronda',
  it: 'Area tratteggiata: 1 danno a fine round',
})
export const bothKingsDraw = t({
  en: 'Both kings down = draw',
  fr: 'Les deux rois tombés = match nul',
  de: 'Beide Könige down = Unentschieden',
  es: 'Ambos reyes caídos = empate',
  it: 'Entrambi i re a terra = pareggio',
})
