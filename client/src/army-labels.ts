import { t } from './i18n/locale.ts'
import type { GameMode, PlayerNames } from './lib/game-mode.ts'

export const playerNames: PlayerNames = t({
  en: { player: 'Player 1', enemy: 'Player 2' },
  fr: { player: 'Joueur 1', enemy: 'Joueur 2' },
  de: { player: 'Spieler 1', enemy: 'Spieler 2' },
  es: { player: 'Jugador 1', enemy: 'Jugador 2' },
  it: { player: 'Giocatore 1', enemy: 'Giocatore 2' },
})

const possessive = t({
  en: (name: string) => name + "'s",
  fr: (name: string) => name,
  de: (name: string) => name + 's',
  es: (name: string) => name,
  it: (name: string) => name,
})

export function possessiveArmyLabels(mode: GameMode, names: PlayerNames = playerNames) {
  if (mode === 'ai')
    return t({
      en: { player: 'Your', enemy: 'Enemy' },
      fr: { player: 'Votre', enemy: 'Ennemi' },
      de: { player: 'Dein', enemy: 'Gegnerischer' },
      es: { player: 'Tu', enemy: 'Enemigo' },
      it: { player: 'Tuo', enemy: 'Nemico' },
    })
  return { player: possessive(names.player), enemy: possessive(names.enemy) }
}
