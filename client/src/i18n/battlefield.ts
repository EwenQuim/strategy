import { t } from './locale'

export const moveTo = t({
  en: 'Move to',
  fr: 'Déplacer vers',
  de: 'Bewege zu',
  es: 'Mover a',
  it: 'Muovi verso',
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
    `Feu de l'enfer ${center ? "centre d'impact" : 'zone de souffle'}, 1 dégât inévitable à la fin de la manche`,
  de: (center: boolean) =>
    `Höllenfeuer ${center ? 'Einschlagzentrum' : 'Einwirkbereich'}, 1 unvermeidbarer Schaden am Rundenende`,
  es: (center: boolean) =>
    `Fuego infernal ${center ? 'centro de impacto' : 'zona de ráfaga'}, 1 de daño inevitable al final de la ronda`,
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
