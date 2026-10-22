import { t } from './locale'
import type { TeamColorId } from '../lib/cosmetics.ts'

export const armyColor = t({
  en: 'Army color',
  fr: "Couleur d'armée",
  de: 'Armeefarbe',
  es: 'Color de ejército',
  it: "Colore dell'esercito",
})

export const armyColorHint = t({
  en: 'Your units wear this color in every battle. More colors unlock through achievements.',
  fr: 'Vos unités portent cette couleur dans chaque bataille. D’autres couleurs se débloquent par des succès.',
  de: 'Deine Einheiten tragen diese Farbe in jeder Schlacht. Weitere Farben werden durch Erfolge freigeschaltet.',
  es: 'Tus unidades llevan este color en cada batalla. Más colores se desbloquean con logros.',
  it: 'Le tue unità indossano questo colore in ogni battaglia. Altri colori si sbloccano con gli obiettivi.',
})

export const colorNames = t<Record<TeamColorId, string>>({
  en: {
    default: 'Verdant',
    crimson: 'Crimson',
    azure: 'Azure',
    amber: 'Amber',
    violet: 'Violet',
    rose: 'Rose',
  },
  fr: {
    default: 'Verdure',
    crimson: 'Cramoisi',
    azure: 'Azur',
    amber: 'Ambre',
    violet: 'Violet',
    rose: 'Rose',
  },
  de: {
    default: 'Grün',
    crimson: 'Purpurrot',
    azure: 'Azur',
    amber: 'Bernstein',
    violet: 'Violett',
    rose: 'Rosa',
  },
  es: {
    default: 'Verde',
    crimson: 'Carmesí',
    azure: 'Celeste',
    amber: 'Ámbar',
    violet: 'Violeta',
    rose: 'Rosa',
  },
  it: {
    default: 'Verde',
    crimson: 'Cremisi',
    azure: 'Azzurro',
    amber: 'Ambra',
    violet: 'Viola',
    rose: 'Rosa',
  },
})

export const lockedColor = t({
  en: (achievement: string) => `Locked — unlock the achievement "${achievement}"`,
  fr: (achievement: string) => `Verrouillée — débloquez le succès « ${achievement} »`,
  de: (achievement: string) => `Gesperrt — schalte den Erfolg „${achievement}“ frei`,
  es: (achievement: string) => `Bloqueado — desbloquea el logro «${achievement}»`,
  it: (achievement: string) => `Bloccato — sblocca l'obiettivo «${achievement}»`,
})
