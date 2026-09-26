import { t } from './locale'

export const goal = t({
  en: 'Goal',
  fr: 'Objectif',
  de: 'Ziel',
  es: 'Objetivo',
  it: 'Obiettivo',
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
  en: 'Spend it to move, attack or use a special',
  fr: 'Dépensez-la pour vous déplacer, attaquer ou utiliser un spécial',
  de: 'Gib sie aus für Bewegen, Angreifen oder eine Spezialfähigkeit',
  es: 'Gástala para mover, atacar o usar un especial',
  it: 'Spendila per muoverti, attaccare o usare uno speciale',
})
export const unusedEnergy = t({
  en: (bonus: number, max: number) =>
    `Unused energy at end of turn → +${bonus}% dodge each, max ${max}%`,
  fr: (bonus: number, max: number) =>
    `Énergie non dépensée en fin de tour → +${bonus} % d'esquive par point, max ${max} %`,
  de: (bonus: number, max: number) =>
    `Ungenutzte Energie am Zugende → +${bonus} % Ausweichen je Punkt, max ${max} %`,
  es: (bonus: number, max: number) =>
    `Energía sin usar al final del turno → +${bonus} % de esquiva por cada punto, máx. ${max} %`,
  it: (bonus: number, max: number) =>
    `Energia non spesa a fine turno → +${bonus} % di schivata per punto, max ${max} %`,
})

export const statLine = t({
  en: (hp: number, damage: number, range: string) =>
    `${hp} HP · ${damage} dmg · range ${range}`,
  fr: (hp: number, damage: number, range: string) =>
    `${hp} PV · ${damage} dégâts · portée ${range}`,
  de: (hp: number, damage: number, range: string) =>
    `${hp} LP · ${damage} Schaden · Reichweite ${range}`,
  es: (hp: number, damage: number, range: string) =>
    `${hp} PV · ${damage} de daño · alcance ${range}`,
  it: (hp: number, damage: number, range: string) =>
    `${hp} PV · ${damage} danni · gittata ${range}`,
})
export const specialLine = t({
  en: (name: string, cost: number, point: string) => `${name} (${cost} energy): ${point}`,
  fr: (name: string, cost: number, point: string) => `${name} (${cost} énergie) : ${point}`,
  de: (name: string, cost: number, point: string) => `${name} (${cost} Energie): ${point}`,
  es: (name: string, cost: number, point: string) => `${name} (${cost} de energía): ${point}`,
  it: (name: string, cost: number, point: string) => `${name} (${cost} di energia): ${point}`,
})

export const rallyBrief = t({
  en: 'heal adjacent allies +1, once per round',
  fr: 'soigne les alliés adjacents de +1, une fois par manche',
  de: 'heilt angrenzende Verbündete um +1, einmal pro Runde',
  es: 'cura a los aliados adyacentes +1, una vez por ronda',
  it: 'cura gli alleati adiacenti di +1, una volta per round',
})
export const loseKing = t({
  en: 'Lose your king, lose the battle',
  fr: 'Perdez votre roi, perdez la bataille',
  de: 'Verlierst du deinen König, verlierst du die Schlacht',
  es: 'Pierde tu rey, pierde la batalla',
  it: 'Perdi il tuo re, perdi la battaglia',
})
export const chargeBrief = t({
  en: 'move up to 2, then hit adjacent for 2',
  fr: 'déplacez-vous jusqu’à 2 cases, puis frappez un adjacent pour 2',
  de: 'bis zu 2 Felder bewegen, dann einen Angrenzenden für 2 treffen',
  es: 'muévete hasta 2 casillas, luego golpea a un adyacente por 2',
  it: 'muoviti fino a 2 caselle, poi colpisci un adiacente per 2',
})
export const aimedShotBrief = t({
  en: '2 dmg, ignores Escape',
  fr: "2 dégâts, ignore l'Esquive",
  de: '2 Schaden, ignoriert Ausweichen',
  es: '2 de daño, ignora la Esquiva',
  it: '2 danni, ignora la Schivata',
})
export const archerMinRange = t({
  en: 'Cannot shoot adjacent enemies',
  fr: 'Ne peut pas tirer sur les ennemis adjacents',
  de: 'Kann angrenzende Gegner nicht beschießen',
  es: 'No puede disparar a enemigos adyacentes',
  it: 'Non può colpire i nemici adiacenti',
})
export const fireballBrief = t({
  en: '1 dmg to every enemy on a line',
  fr: '1 dégât à chaque ennemi sur une ligne',
  de: '1 Schaden bei jedem Gegner auf einer Linie',
  es: '1 de daño a cada enemigo en línea',
  it: '1 danno a ogni nemico in linea',
})
export const fireballPasses = t({
  en: 'Passes through everything, allies safe',
  fr: 'Traverse tout, les alliés sont épargnés',
  de: 'Durchdringt alles, Verbündete bleiben unversehrt',
  es: 'Atraviesa todo, los aliados están a salvo',
  it: 'Attraversa tutto, gli alleati sono salvi',
})
export const protectBrief = t({
  en: 'takes the next hit for an ally within 2',
  fr: 'encaisse le prochain coup pour un allié à 2 cases ou moins',
  de: 'nimmt den nächsten Treffer für einen Verbündeten innerhalb von 2 Feldern',
  es: 'recibe el próximo golpe por un aliado a 2 casillas o menos',
  it: 'incassa il prossimo colpo per un alleato entro 2 caselle',
})
export const bulwarkSlow = t({
  en: 'Slow: first step costs 2 energy',
  fr: 'Lent : le premier pas coûte 2 énergies',
  de: 'Langsam: der erste Schritt kostet 2 Energie',
  es: 'Lento: el primer paso cuesta 2 de energía',
  it: 'Lento: il primo passo costa 2 energia',
})
export const bombBrief = t({
  en: 'any tile within 2, 1 dmg to it and its 6 neighbors',
  fr: 'n’importe quelle case à 2 ou moins, 1 dégât à elle et ses 6 voisines',
  de: 'ein beliebiges Feld innerhalb von 2, 1 Schaden an ihm und seinen 6 Nachbarn',
  es: 'cualquier casilla a 2 o menos, 1 de daño a ella y sus 6 vecinas',
  it: 'una qualsiasi casella entro 2, 1 danno a essa e alle 6 vicine',
})
export const bombFriendly = t({
  en: 'Hits allies and the bomber too',
  fr: 'Touche aussi les alliés et le grenadier',
  de: 'Trifft auch Verbündete und den Grenadier',
  es: 'También afecta a aliados y al granadero',
  it: 'Colpisce anche gli alleati e il granatiere',
})
export const jumpBrief = t({
  en: 'up to 3 tiles, over anything',
  fr: 'jusqu’à 3 cases, par-dessus tout',
  de: 'bis zu 3 Felder, über alles hinweg',
  es: 'hasta 3 casillas, por encima de todo',
  it: 'fino a 3 caselle, sopra ogni cosa',
})
export const jumpNoAttack = t({
  en: 'Jump does not attack: keep 1 energy to strike',
  fr: 'Le saut n’attaque pas : gardez 1 énergie pour frapper',
  de: 'Der Sprung greift nicht an: 1 Energie zum Zuschlagen aufheben',
  es: 'El salto no ataca: guarda 1 de energía para golpear',
  it: 'Il salto non attacca: tieni 1 energia per colpire',
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
export const ignoresEscapeProtect = t({
  en: 'Ignores Escape and Protect',
  fr: 'Ignore l’Esquive et la Protection',
  de: 'Ignoriert Ausweichen und Schützen',
  es: 'Ignora la Esquiva y la Protección',
  it: 'Ignora Schivata e Protezione',
})
export const basaltSafe = t({
  en: 'Basalt is safe',
  fr: 'Le basalte est sûr',
  de: 'Basalt ist sicher',
  es: 'El basalto es seguro',
  it: 'Il basalto è sicuro',
})
export const watchtowerRange = t({
  en: 'Archer and Magician: +1 max range',
  fr: 'Archer et Magicien : +1 de portée maximale',
  de: 'Schütze und Magier: +1 max. Reichweite',
  es: 'Arquero y Mago: +1 de alcance máximo',
  it: 'Archiere e Mago: +1 di gittata massima',
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
