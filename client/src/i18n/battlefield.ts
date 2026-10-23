import { t } from './locale'

export const moveTo = t({
  en: 'Move to',
  fr: 'Déplacer vers',
  de: 'Bewege zu',
  es: 'Mover a',
  it: 'Muovi verso',
})
export const chooseAgain = t({
  en: 'Choose again',
  fr: 'Choisir à nouveau',
  de: 'Erneut wählen',
  es: 'Elige de nuevo',
  it: 'Scegli di nuovo',
})
export const healthAmount = t({
  en: (hp: number) => `${hp} health`,
  fr: (hp: number) => `${hp} PV`,
  de: (hp: number) => `${hp} Leben`,
  es: (hp: number) => `${hp} de vida`,
  it: (hp: number) => `${hp} di vita`,
})
export const protectedBy = t({
  en: (name: string, id: number) => `protected by ${name} #${id}`,
  fr: (name: string, id: number) => `protégé par ${name} #${id}`,
  de: (name: string, id: number) => `geschützt von ${name} #${id}`,
  es: (name: string, id: number) => `protegido por ${name} #${id}`,
  it: (name: string, id: number) => `protetto da ${name} #${id}`,
})
export const tilePosition = t({
  en: (column: number, row: number) => `column ${column}, row ${row}`,
  fr: (column: number, row: number) => `colonne ${column}, ligne ${row}`,
  de: (column: number, row: number) => `Spalte ${column}, Reihe ${row}`,
  es: (column: number, row: number) => `columna ${column}, fila ${row}`,
  it: (column: number, row: number) => `colonna ${column}, riga ${row}`,
})
export const lavaDamage = t({
  en: (damage: number, lethal: boolean) => `${damage} lava damage${lethal ? ' (lethal)' : ''}`,
  fr: (damage: number, lethal: boolean) =>
    `${damage} dégâts de lave${lethal ? ' (mortel)' : ''}`,
  de: (damage: number, lethal: boolean) => `${damage} Lavaschaden${lethal ? ' (tödlich)' : ''}`,
  es: (damage: number, lethal: boolean) =>
    `${damage} de daño de lava${lethal ? ' (letal)' : ''}`,
  it: (damage: number, lethal: boolean) =>
    `${damage} danno di lava${lethal ? ' (letale)' : ''}`,
})
export const hellfireWarning = t({
  en: (center: boolean) =>
    `Hellfire ${center ? 'impact center' : 'blast area'}, 1 unavoidable damage at round end`,
  fr: (center: boolean) =>
    `Feu de l'enfer ${center ? "centre d'impact" : 'zone de flammes'}, 1 dégât inévitable à la fin de la manche`,
  de: (center: boolean) =>
    `Höllenfeuer ${center ? 'Einschlagzentrum' : 'Einwirkbereich'}, 1 unvermeidbarer Schaden am Rundenende`,
  es: (center: boolean) =>
    `Fuego infernal ${center ? 'centro de impacto' : 'zona de llamarada'}, 1 de daño inevitable al final de la ronda`,
  it: (center: boolean) =>
    `Fuoco infernale ${center ? "centro d'impatto" : 'zona di vampata'}, 1 danno inevitabile a fine round`,
})
export const alreadyActed = t({
  en: 'already acted',
  fr: 'a déjà agi',
  de: 'hat schon gehandelt',
  es: 'ya actuó',
  it: 'ha già agito',
})
export const inRange = t({
  en: 'in range',
  fr: 'à portée',
  de: 'in Reichweite',
  es: 'a su alcance',
  it: 'a portata',
})
export const inspect = t({
  en: (name: string) => `Inspect ${name}`,
  fr: (name: string) => `Inspecter ${name}`,
  de: (name: string) => `${name} ansehen`,
  es: (name: string) => `Inspeccionar ${name}`,
  it: (name: string) => `Ispeziona ${name}`,
})
export const moveMode = t({
  en: 'Move mode',
  fr: 'Mode déplacement',
  de: 'Bewegungsmodus',
  es: 'Modo movimiento',
  it: 'Modalità movimento',
})
export const abilityMode = t({
  en: (name: string) => `${name} mode`,
  fr: (name: string) => `Mode ${name}`,
  de: (name: string) => `${name}-Modus`,
  es: (name: string) => `Modo ${name}`,
  it: (name: string) => `Modalità ${name}`,
})
export const noMode = t({
  en: 'No mode',
  fr: 'Aucun mode',
  de: 'Kein Modus',
  es: 'Sin modo',
  it: 'Nessuna modalità',
})

export const sandstorm = t({
  en: 'Sandstorm: 2 energy max',
  fr: 'Tempête de sable : 2 d’énergie max',
  de: 'Sandsturm: max. 2 Energie',
  es: 'Tormenta de arena: 2 de energía máx.',
  it: 'Tempesta di sabbia: 2 energia max',
})
