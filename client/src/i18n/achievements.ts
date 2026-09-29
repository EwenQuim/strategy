import type { AchievementId } from '../lib/achievements'
import { t } from './locale'

type AchievementText = { title: string; description: string }

export const achievements = t<Record<AchievementId, AchievementText>>({
  en: {
    cleanHands: {
      title: 'Clean Hands, Dead King',
      description: 'Win having killed only the enemy King.',
    },
    reaper: {
      title: "Reaper's Overtime",
      description: 'Kill 9+ enemies, then finish off their King.',
    },
    ninjaRegicide: {
      title: 'Nobody Saw That',
      description: 'Kill the enemy King with a Ninja.',
    },
    nobodyLeftBehind: {
      title: 'Nobody Left Behind',
      description: 'Win against 5+ enemies without losing any unit.',
    },
    doneRight: {
      title: 'If You Want It Done Right',
      description: 'Kill the enemy King with your own King.',
    },
    partyOfOne: {
      title: 'Party of One',
      description: 'Win with your King as your last survivor.',
    },
    thread: {
      title: 'Hanging by a Thread',
      description: 'Win with your King down to 1 health.',
    },
    glassCannon: {
      title: 'Glass Cannon',
      description: 'Kill 3 enemies with the same Ninja, then win.',
    },
    rageQuit: {
      title: 'Rage Quit',
      description: 'Kill an enemy with a Berserker at 1 health.',
    },
    chainReaction: {
      title: 'Chain Reaction',
      description: 'Kill 3 enemies with a single Fireball or Bomb.',
    },
    floorIsLava: {
      title: 'Floor Is Lava',
      description: 'Win while your King stands on lava.',
    },
    towerCamper: {
      title: 'Tower Camper',
      description: 'Kill an enemy with Eagle eye from a watchtower.',
    },
    untouchable: {
      title: "Can't Touch This",
      description: 'Win after your King dodges 3 attacks.',
    },
    speedrun: { title: 'Speedrun Any%', description: 'Win within the first 3 rounds.' },
    dogs: {
      title: 'Who Let the Dogs Out',
      description: 'Win with an army of only Wolves and your King.',
    },
  },
  fr: {
    cleanHands: {
      title: 'Mains propres, roi mort',
      description: 'Gagner en ne tuant que le roi ennemi.',
    },
    reaper: {
      title: 'Heures sup’ de la Faucheuse',
      description: 'Tuer 9 ennemis ou plus, puis achever leur roi.',
    },
    ninjaRegicide: {
      title: 'Pas vu, pas pris',
      description: 'Porter le coup fatal au roi ennemi avec un ninja.',
    },
    nobodyLeftBehind: {
      title: 'Personne ne reste derrière',
      description: 'Gagner contre 5+ ennemis sans perdre aucune unité.',
    },
    doneRight: {
      title: 'On n’est jamais mieux servi…',
      description: 'Tuer le roi ennemi avec votre propre roi.',
    },
    partyOfOne: {
      title: 'Seul contre tous',
      description: 'Gagner avec votre roi comme seul survivant.',
    },
    thread: { title: 'Ne tenir qu’à un fil', description: 'Gagner avec votre roi à 1 PV.' },
    glassCannon: {
      title: 'Canon de verre',
      description: 'Tuer 3 ennemis avec le même ninja, puis gagner.',
    },
    rageQuit: { title: 'Rage quit', description: 'Tuer un ennemi avec un berserker à 1 PV.' },
    chainReaction: {
      title: 'Réaction en chaîne',
      description: 'Tuer 3 ennemis d’une seule boule de feu ou bombe.',
    },
    floorIsLava: {
      title: 'Le sol est de la lave',
      description: 'Gagner pendant que votre roi est sur la lave.',
    },
    towerCamper: {
      title: 'Campeur de tour',
      description: 'Tuer un ennemi avec Œil de lynx depuis une tour.',
    },
    untouchable: {
      title: 'Intouchable',
      description: 'Gagner après que votre roi a esquivé 3 attaques.',
    },
    speedrun: { title: 'Speedrun Any%', description: 'Gagner dans les 3 premières manches.' },
    dogs: {
      title: 'Qui a lâché les chiens ?',
      description: 'Gagner avec uniquement des loups et votre roi.',
    },
  },
  de: {
    cleanHands: {
      title: 'Saubere Hände, toter König',
      description: 'Gewinne und töte dabei nur den feindlichen König.',
    },
    reaper: {
      title: 'Überstunden für den Sensenmann',
      description: 'Töte 9+ Feinde und erledige dann ihren König.',
    },
    ninjaRegicide: {
      title: 'Keiner hat’s gesehen',
      description: 'Versetze dem feindlichen König mit einem Ninja den Todesstoß.',
    },
    nobodyLeftBehind: {
      title: 'Keiner bleibt zurück',
      description: 'Gewinne gegen 5+ Feinde, ohne eine Einheit zu verlieren.',
    },
    doneRight: {
      title: 'Chefsache',
      description: 'Töte den feindlichen König mit deinem eigenen König.',
    },
    partyOfOne: {
      title: 'Einsamer Sieger',
      description: 'Gewinne mit deinem König als letztem Überlebenden.',
    },
    thread: {
      title: 'Am seidenen Faden',
      description: 'Gewinne, während dein König nur 1 Leben hat.',
    },
    glassCannon: {
      title: 'Glaskanone',
      description: 'Töte 3 Feinde mit demselben Ninja und gewinne.',
    },
    rageQuit: {
      title: 'Rage Quit',
      description: 'Töte einen Feind mit einem Berserker bei 1 Leben.',
    },
    chainReaction: {
      title: 'Kettenreaktion',
      description: 'Töte 3 Feinde mit einem Feuerball oder einer Bombe.',
    },
    floorIsLava: {
      title: 'Der Boden ist Lava',
      description: 'Gewinne, während dein König auf Lava steht.',
    },
    towerCamper: {
      title: 'Turmcamper',
      description: 'Töte einen Feind mit Adlerauge von einem Wachturm.',
    },
    untouchable: {
      title: 'Unberührbar',
      description: 'Gewinne, nachdem dein König 3 Angriffen ausgewichen ist.',
    },
    speedrun: { title: 'Speedrun Any%', description: 'Gewinne innerhalb der ersten 3 Runden.' },
    dogs: {
      title: 'Lasst die Hunde los',
      description: 'Gewinne mit einer Armee nur aus Wölfen und deinem König.',
    },
  },
  es: {
    cleanHands: {
      title: 'Manos limpias, rey muerto',
      description: 'Gana matando solo al rey enemigo.',
    },
    reaper: {
      title: 'Horas extra de la Parca',
      description: 'Mata a 9+ enemigos y luego remata a su rey.',
    },
    ninjaRegicide: {
      title: 'Nadie vio nada',
      description: 'Da el golpe final al rey enemigo con un ninja.',
    },
    nobodyLeftBehind: {
      title: 'Nadie se queda atrás',
      description: 'Gana contra 5+ enemigos sin perder ninguna unidad.',
    },
    doneRight: {
      title: 'Si quieres algo bien hecho…',
      description: 'Mata al rey enemigo con tu propio rey.',
    },
    partyOfOne: {
      title: 'Fiesta de uno',
      description: 'Gana con tu rey como único superviviente.',
    },
    thread: { title: 'Pendiendo de un hilo', description: 'Gana con tu rey a 1 de vida.' },
    glassCannon: {
      title: 'Cañón de cristal',
      description: 'Mata a 3 enemigos con el mismo ninja y gana.',
    },
    rageQuit: {
      title: 'Rage quit',
      description: 'Mata a un enemigo con un berserker a 1 de vida.',
    },
    chainReaction: {
      title: 'Reacción en cadena',
      description: 'Mata a 3 enemigos con una sola bola de fuego o bomba.',
    },
    floorIsLava: {
      title: 'El suelo es lava',
      description: 'Gana mientras tu rey está sobre la lava.',
    },
    towerCamper: {
      title: 'Campero de torre',
      description: 'Mata a un enemigo con Ojo de águila desde una torre.',
    },
    untouchable: {
      title: 'Intocable',
      description: 'Gana después de que tu rey esquive 3 ataques.',
    },
    speedrun: { title: 'Speedrun Any%', description: 'Gana en las 3 primeras rondas.' },
    dogs: {
      title: '¿Quién soltó a los perros?',
      description: 'Gana con un ejército de solo lobos y tu rey.',
    },
  },
  it: {
    cleanHands: {
      title: 'Mani pulite, re morto',
      description: 'Vinci uccidendo solo il re nemico.',
    },
    reaper: {
      title: 'Straordinari per la Morte',
      description: 'Uccidi 9+ nemici, poi finisci il loro re.',
    },
    ninjaRegicide: {
      title: 'Nessuno ha visto',
      description: 'Dai il colpo di grazia al re nemico con un ninja.',
    },
    nobodyLeftBehind: {
      title: 'Nessuno resta indietro',
      description: 'Vinci contro 5+ nemici senza perdere nessuna unità.',
    },
    doneRight: {
      title: 'Chi fa da sé fa per tre',
      description: 'Uccidi il re nemico con il tuo stesso re.',
    },
    partyOfOne: {
      title: 'Festa per uno',
      description: 'Vinci con il tuo re come unico superstite.',
    },
    thread: { title: 'Appeso a un filo', description: 'Vinci con il tuo re a 1 di vita.' },
    glassCannon: {
      title: 'Cannone di vetro',
      description: 'Uccidi 3 nemici con lo stesso ninja e vinci.',
    },
    rageQuit: {
      title: 'Rage quit',
      description: 'Uccidi un nemico con un berserker a 1 di vita.',
    },
    chainReaction: {
      title: 'Reazione a catena',
      description: 'Uccidi 3 nemici con una sola palla di fuoco o bomba.',
    },
    floorIsLava: {
      title: 'Il pavimento è lava',
      description: 'Vinci mentre il tuo re è sulla lava.',
    },
    towerCamper: {
      title: 'Camperone in torre',
      description: 'Uccidi un nemico con Occhio di lince da una torre.',
    },
    untouchable: {
      title: 'Intoccabile',
      description: 'Vinci dopo che il tuo re ha schivato 3 attacchi.',
    },
    speedrun: { title: 'Speedrun Any%', description: 'Vinci entro i primi 3 round.' },
    dogs: {
      title: 'Chi ha liberato i cani?',
      description: 'Vinci con un esercito di soli lupi e il tuo re.',
    },
  },
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
