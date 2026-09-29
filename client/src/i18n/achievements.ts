import type { AchievementId } from '../lib/achievements'
import { t } from './locale'

type AchievementText = { title: string; description: string }

export const achievements = t<Record<AchievementId, AchievementText>>({
  en: {
    cleanHands: {
      title: 'Clean Hands, Dead King',
      description: 'Kill the enemy King without killing anyone else.',
    },
    reaper: {
      title: "Reaper's Overtime",
      description: 'Kill 9 or more enemies before their King falls.',
    },
    ninjaRegicide: {
      title: 'Nobody Saw That',
      description: 'Finish the enemy King with a Ninja.',
    },
    nobodyLeftBehind: {
      title: 'Nobody Left Behind',
      description: 'Beat 5+ enemies without losing a single unit.',
    },
    doneRight: {
      title: 'If You Want It Done Right',
      description: 'Your King lands the killing blow on theirs.',
    },
    partyOfOne: { title: 'Party of One', description: 'Win with only your King still alive.' },
    thread: { title: 'Hanging by a Thread', description: 'Win with your King at 1 health.' },
    glassCannon: {
      title: 'Glass Cannon',
      description: 'One Ninja kills three enemies in a single battle.',
    },
    rageQuit: {
      title: 'Rage Quit',
      description: 'A Berserker at 1 health lands a killing blow.',
    },
    chainReaction: {
      title: 'Chain Reaction',
      description: 'Kill three enemies with one Fireball or Bomb.',
    },
    floorIsLava: {
      title: 'Floor Is Lava',
      description: 'Win with your King standing on lava.',
    },
    towerCamper: {
      title: 'Tower Camper',
      description: 'Kill a unit with Eagle eye from a watchtower.',
    },
    untouchable: {
      title: "Can't Touch This",
      description: 'Your King dodges three attacks in one battle.',
    },
    speedrun: { title: 'Speedrun Any%', description: 'Win before round 4 starts.' },
    dogs: {
      title: 'Who Let the Dogs Out',
      description: 'Win with only Wolves beside your King.',
    },
  },
  fr: {
    cleanHands: {
      title: 'Mains propres, roi mort',
      description: 'Tuer le roi ennemi sans tuer personne d’autre.',
    },
    reaper: {
      title: 'Heures sup’ de la Faucheuse',
      description: 'Tuer 9 ennemis ou plus avant la chute du roi.',
    },
    ninjaRegicide: {
      title: 'Pas vu, pas pris',
      description: 'Achever le roi ennemi avec un ninja.',
    },
    nobodyLeftBehind: {
      title: 'Personne ne reste derrière',
      description: 'Battre 5+ ennemis sans perdre une seule unité.',
    },
    doneRight: {
      title: 'On n’est jamais mieux servi…',
      description: 'Votre roi porte le coup fatal au leur.',
    },
    partyOfOne: {
      title: 'Seul contre tous',
      description: 'Gagner avec seulement votre roi en vie.',
    },
    thread: { title: 'Ne tenir qu’à un fil', description: 'Gagner avec votre roi à 1 PV.' },
    glassCannon: {
      title: 'Canon de verre',
      description: 'Un seul ninja tue trois ennemis en une bataille.',
    },
    rageQuit: { title: 'Rage quit', description: 'Un berserker à 1 PV porte un coup fatal.' },
    chainReaction: {
      title: 'Réaction en chaîne',
      description: 'Tuer trois ennemis d’une boule de feu ou bombe.',
    },
    floorIsLava: {
      title: 'Le sol est de la lave',
      description: 'Gagner avec votre roi sur la lave.',
    },
    towerCamper: {
      title: 'Campeur de tour',
      description: 'Tuer une unité avec Œil de lynx depuis une tour.',
    },
    untouchable: {
      title: 'Intouchable',
      description: 'Votre roi esquive trois attaques en une bataille.',
    },
    speedrun: { title: 'Speedrun Any%', description: 'Gagner avant le début du tour 4.' },
    dogs: {
      title: 'Qui a lâché les chiens ?',
      description: 'Gagner avec seulement des loups et votre roi.',
    },
  },
  de: {
    cleanHands: {
      title: 'Saubere Hände, toter König',
      description: 'Töte den feindlichen König, sonst niemanden.',
    },
    reaper: {
      title: 'Überstunden für den Sensenmann',
      description: 'Töte 9 oder mehr Feinde, bevor ihr König fällt.',
    },
    ninjaRegicide: {
      title: 'Keiner hat’s gesehen',
      description: 'Erledige den feindlichen König mit einem Ninja.',
    },
    nobodyLeftBehind: {
      title: 'Keiner bleibt zurück',
      description: 'Besiege 5+ Feinde, ohne eine Einheit zu verlieren.',
    },
    doneRight: {
      title: 'Chefsache',
      description: 'Dein König versetzt ihrem den Todesstoß.',
    },
    partyOfOne: {
      title: 'Einsamer Sieger',
      description: 'Gewinne, wenn nur dein König überlebt.',
    },
    thread: {
      title: 'Am seidenen Faden',
      description: 'Gewinne mit deinem König bei 1 Leben.',
    },
    glassCannon: {
      title: 'Glaskanone',
      description: 'Ein Ninja tötet drei Feinde in einer Schlacht.',
    },
    rageQuit: {
      title: 'Rage Quit',
      description: 'Ein Berserker mit 1 Leben landet einen Todesstoß.',
    },
    chainReaction: {
      title: 'Kettenreaktion',
      description: 'Töte drei Feinde mit einem Feuerball oder einer Bombe.',
    },
    floorIsLava: {
      title: 'Der Boden ist Lava',
      description: 'Gewinne, während dein König auf Lava steht.',
    },
    towerCamper: {
      title: 'Turmcamper',
      description: 'Töte eine Einheit mit Adlerauge von einem Wachturm.',
    },
    untouchable: {
      title: 'Unberührbar',
      description: 'Dein König weicht drei Angriffen in einer Schlacht aus.',
    },
    speedrun: { title: 'Speedrun Any%', description: 'Gewinne vor Beginn der Runde 4.' },
    dogs: {
      title: 'Lasst die Hunde los',
      description: 'Gewinne nur mit Wölfen neben deinem König.',
    },
  },
  es: {
    cleanHands: {
      title: 'Manos limpias, rey muerto',
      description: 'Mata al rey enemigo sin matar a nadie más.',
    },
    reaper: {
      title: 'Horas extra de la Parca',
      description: 'Mata 9 o más enemigos antes de que caiga su rey.',
    },
    ninjaRegicide: {
      title: 'Nadie vio nada',
      description: 'Remata al rey enemigo con un ninja.',
    },
    nobodyLeftBehind: {
      title: 'Nadie se queda atrás',
      description: 'Vence a 5+ enemigos sin perder ninguna unidad.',
    },
    doneRight: {
      title: 'Si quieres algo bien hecho…',
      description: 'Tu rey da el golpe final al suyo.',
    },
    partyOfOne: { title: 'Fiesta de uno', description: 'Gana con solo tu rey con vida.' },
    thread: { title: 'Pendiendo de un hilo', description: 'Gana con tu rey a 1 de vida.' },
    glassCannon: {
      title: 'Cañón de cristal',
      description: 'Un ninja mata a tres enemigos en una batalla.',
    },
    rageQuit: {
      title: 'Rage quit',
      description: 'Un berserker con 1 de vida da un golpe mortal.',
    },
    chainReaction: {
      title: 'Reacción en cadena',
      description: 'Mata a tres enemigos con una bola de fuego o bomba.',
    },
    floorIsLava: { title: 'El suelo es lava', description: 'Gana con tu rey sobre la lava.' },
    towerCamper: {
      title: 'Campero de torre',
      description: 'Mata a una unidad con Ojo de águila desde una torre.',
    },
    untouchable: {
      title: 'Intocable',
      description: 'Tu rey esquiva tres ataques en una batalla.',
    },
    speedrun: { title: 'Speedrun Any%', description: 'Gana antes de que empiece la ronda 4.' },
    dogs: {
      title: '¿Quién soltó a los perros?',
      description: 'Gana solo con lobos junto a tu rey.',
    },
  },
  it: {
    cleanHands: {
      title: 'Mani pulite, re morto',
      description: 'Uccidi il re nemico senza uccidere nessun altro.',
    },
    reaper: {
      title: 'Straordinari per la Morte',
      description: 'Uccidi 9 o più nemici prima che cada il re.',
    },
    ninjaRegicide: {
      title: 'Nessuno ha visto',
      description: 'Finisci il re nemico con un ninja.',
    },
    nobodyLeftBehind: {
      title: 'Nessuno resta indietro',
      description: 'Batti 5+ nemici senza perdere nessuna unità.',
    },
    doneRight: {
      title: 'Chi fa da sé fa per tre',
      description: 'Il tuo re dà il colpo di grazia al loro.',
    },
    partyOfOne: {
      title: 'Festa per uno',
      description: 'Vinci con solo il tuo re ancora vivo.',
    },
    thread: { title: 'Appeso a un filo', description: 'Vinci con il tuo re a 1 di vita.' },
    glassCannon: {
      title: 'Cannone di vetro',
      description: 'Un ninja uccide tre nemici in una battaglia.',
    },
    rageQuit: {
      title: 'Rage quit',
      description: 'Un berserker a 1 di vita dà un colpo mortale.',
    },
    chainReaction: {
      title: 'Reazione a catena',
      description: 'Uccidi tre nemici con una palla di fuoco o bomba.',
    },
    floorIsLava: {
      title: 'Il pavimento è lava',
      description: 'Vinci con il tuo re sulla lava.',
    },
    towerCamper: {
      title: 'Camperone in torre',
      description: 'Uccidi un’unità con Occhio di lince da una torre.',
    },
    untouchable: {
      title: 'Intoccabile',
      description: 'Il tuo re schiva tre attacchi in una battaglia.',
    },
    speedrun: { title: 'Speedrun Any%', description: 'Vinci prima dell’inizio del turno 4.' },
    dogs: {
      title: 'Chi ha liberato i cani?',
      description: 'Vinci solo con lupi accanto al tuo re.',
    },
  },
})

export const title = t({
  en: 'Achievements',
  fr: 'Succès',
  de: 'Erfolge',
  es: 'Logros',
  it: 'Obiettivi',
})
export const unlockedCount = t({
  en: (unlocked: number, total: number) => `${unlocked} / ${total} unlocked`,
  fr: (unlocked: number, total: number) => `${unlocked} / ${total} débloqués`,
  de: (unlocked: number, total: number) => `${unlocked} / ${total} freigeschaltet`,
  es: (unlocked: number, total: number) => `${unlocked} / ${total} desbloqueados`,
  it: (unlocked: number, total: number) => `${unlocked} / ${total} sbloccati`,
})
export const locked = t({
  en: 'Locked',
  fr: 'Verrouillé',
  de: 'Gesperrt',
  es: 'Bloqueado',
  it: 'Bloccato',
})
export const justUnlocked = t({
  en: 'Achievement unlocked',
  fr: 'Succès débloqué',
  de: 'Erfolg freigeschaltet',
  es: 'Logro desbloqueado',
  it: 'Obiettivo sbloccato',
})
export const countedModes = t({
  en: 'Earned by winning against the AI, in campaigns or online.',
  fr: "Obtenus en gagnant contre l'IA, en campagne ou en ligne.",
  de: 'Durch Siege gegen die KI, in Kampagnen oder online.',
  es: 'Se consiguen ganando contra la IA, en campañas o en línea.',
  it: "Si ottengono vincendo contro l'IA, in campagna o online.",
})
