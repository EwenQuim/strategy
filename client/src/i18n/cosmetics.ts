import { t } from './locale'

export const pawnSkins = t({
  en: 'Pawn skin',
  fr: 'Apparence des pions',
  de: 'Figuren-Look',
  es: 'Apariencia de las piezas',
  it: 'Aspetto delle pedine',
})

export const pawnSkinsHint = t({
  en: (available: number, total: number) =>
    `${available} / ${total} available, unlock more with achievements`,
  fr: (available: number, total: number) =>
    `${available} / ${total} disponibles, débloquez-en d'autres avec les succès`,
  de: (available: number, total: number) =>
    `${available} / ${total} verfügbar, schalte weitere mit Erfolgen frei`,
  es: (available: number, total: number) =>
    `${available} / ${total} disponibles, desbloquea más con logros`,
  it: (available: number, total: number) =>
    `${available} / ${total} disponibili, sbloccane altri con gli obiettivi`,
})

export const cosmeticNames: Record<string, string> = {
  emerald: t({
    en: 'Emerald',
    fr: 'Émeraude',
    de: 'Smaragd',
    es: 'Esmeralda',
    it: 'Smeraldo',
  }),
  iron: t({
    en: 'Iron',
    fr: 'Fer',
    de: 'Eisen',
    es: 'Hierro',
    it: 'Ferro',
  }),
  royal: t({
    en: 'Royal',
    fr: 'Royal',
    de: 'Königliches Blau',
    es: 'Real',
    it: 'Reale',
  }),
  ember: t({
    en: 'Ember',
    fr: 'Braise',
    de: 'Glut',
    es: 'Brasa',
    it: 'Brace',
  }),
  shadow: t({
    en: 'Shadow',
    fr: 'Ombre',
    de: 'Schatten',
    es: 'Sombra',
    it: 'Ombra',
  }),
  gilded: t({
    en: 'Gilded',
    fr: 'Doré',
    de: 'Vergoldet',
    es: 'Dorado',
    it: 'Dorato',
  }),
}

export const lockedSkin = t({
  en: (name: string, required: number) => `${name}, locked, ${required} achievements`,
  fr: (name: string, required: number) => `${name}, verrouillé, ${required} succès`,
  de: (name: string, required: number) => `${name}, gesperrt, ${required} Erfolge`,
  es: (name: string, required: number) => `${name}, bloqueada, ${required} logros`,
  it: (name: string, required: number) => `${name}, bloccata, ${required} obiettivi`,
})
