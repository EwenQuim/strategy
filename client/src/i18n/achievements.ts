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
    speedrun: { title: 'Speedrun Any%', description: 'Win within the first 3 rounds.' },
    dogs: {
      title: 'Who Let the Dogs Out',
      description: 'Win with an army of only Wolves and your King.',
    },
    crispy: {
      title: 'Extra Crispy',
      description: 'Win after walking one of your units into lava.',
    },
    smite: {
      title: 'The Gods Missed',
      description: 'Win after Hellfire consumed one of your units.',
    },
    divineAssist: {
      title: 'Divine Assist',
      description: 'Win because Hellfire killed the enemy King.',
    },
    oops: {
      title: 'Oops',
      description: 'Win after killing one of your own units with a Bomb.',
    },
    boomRegicide: {
      title: 'Boom, King',
      description: 'Kill the enemy King with a Bomb or Fireball.',
    },
    daredevil: {
      title: 'Daredevil',
      description: 'Win while your King stands inside a Hellfire blast area.',
    },
    bullRush: {
      title: 'Bull Rush',
      description: "Kill an enemy with a Swordsman's Charge.",
    },
    lavaPush: {
      title: 'Magma Opus',
      description: "Push an enemy into lava with a Hoplite's Thrust.",
    },
    acrossTheMap: {
      title: 'Across the Map',
      description: "Kill an enemy 5 tiles away with a Lancer's Rush.",
    },
    blinkStrike: {
      title: 'Out of Nowhere',
      description: "Kill an enemy 4 tiles away with a Ninja's Ambush.",
    },
    twoBirds: {
      title: 'Two Birds, One Blast',
      description: 'Kill 2 enemies with a single Fireball or Bomb.',
    },
    notToday: {
      title: 'Not Today',
      description: 'Win while your Bulwark is still Protecting an ally.',
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
    speedrun: { title: 'Speedrun Any%', description: 'Gagner dans les 3 premières manches.' },
    dogs: {
      title: 'Qui a lâché les chiens ?',
      description: 'Gagner avec uniquement des loups et votre roi.',
    },
    crispy: {
      title: 'Bien croustillant',
      description: 'Gagner après avoir envoyé une de vos unités dans la lave.',
    },
    smite: {
      title: 'Les dieux ont raté',
      description: "Gagner après que le feu de l'enfer a emporté une de vos unités.",
    },
    divineAssist: {
      title: 'Assistance divine',
      description: "Gagner parce que le feu de l'enfer a tué le roi ennemi.",
    },
    oops: {
      title: 'Oups',
      description: 'Gagner après avoir tué une de vos unités avec une bombe.',
    },
    boomRegicide: {
      title: 'Boum, roi',
      description: 'Tuer le roi ennemi avec une bombe ou une boule de feu.',
    },
    daredevil: {
      title: 'Casse-cou',
      description:
        "Gagner pendant que votre roi est dans une zone de flammes du feu de l'enfer.",
    },
    bullRush: {
      title: 'Charge du taureau',
      description: "Éliminez un ennemi avec la Charge de l'Épéiste.",
    },
    lavaPush: {
      title: 'Magma Opus',
      description: "Poussez un ennemi dans la lave avec l'Estoc de l'Hoplite.",
    },
    acrossTheMap: {
      title: "D'un bout à l'autre",
      description: 'Éliminez un ennemi à 5 tuiles avec la Ruée du Lancier.',
    },
    blinkStrike: {
      title: 'Sorti de nulle part',
      description: "Éliminez un ennemi à 4 tuiles avec l'Embuscade du Ninja.",
    },
    twoBirds: {
      title: "D'une pierre deux coups",
      description: 'Éliminez 2 ennemis avec une seule Boule de feu ou Bombe.',
    },
    notToday: {
      title: "Pas aujourd'hui",
      description: 'Gagnez pendant que votre Rempart Protège encore un allié.',
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
    speedrun: { title: 'Speedrun Any%', description: 'Gewinne innerhalb der ersten 3 Runden.' },
    dogs: {
      title: 'Lasst die Hunde los',
      description: 'Gewinne mit einer Armee nur aus Wölfen und deinem König.',
    },
    crispy: {
      title: 'Extra knusprig',
      description: 'Gewinne, nachdem du eine deiner Einheiten in Lava laufen lassen hast.',
    },
    smite: {
      title: 'Die Götter haben danebengegriffen',
      description: 'Gewinne, nachdem Höllenfeuer eine deiner Einheiten verzehrt hat.',
    },
    divineAssist: {
      title: 'Göttliche Hilfe',
      description: 'Gewinne, weil Höllenfeuer den feindlichen König getötet hat.',
    },
    oops: {
      title: 'Ups',
      description: 'Gewinne, nachdem du eine eigene Einheit mit einer Bombe getötet hast.',
    },
    boomRegicide: {
      title: 'Wumm, König',
      description: 'Töte den feindlichen König mit einer Bombe oder einem Feuerball.',
    },
    daredevil: {
      title: 'Tollkühn',
      description: 'Gewinne, während dein König im Höllenfeuer-Einwirkbereich steht.',
    },
    bullRush: {
      title: 'Ansturm',
      description: 'Töte einen Feind mit dem Sturmangriff des Schwertkämpfers.',
    },
    lavaPush: {
      title: 'Magma Opus',
      description: 'Stoße einen Feind mit dem Stoß des Hopliten in Lava.',
    },
    acrossTheMap: {
      title: 'Über die ganze Karte',
      description: 'Töte einen Feind 5 Felder entfernt mit dem Sprint des Lanzenträgers.',
    },
    blinkStrike: {
      title: 'Aus dem Nichts',
      description: 'Töte einen Feind 4 Felder entfernt mit dem Hinterhalt des Ninjas.',
    },
    twoBirds: {
      title: 'Zwei Fliegen mit einer Klappe',
      description: 'Töte 2 Feinde mit einem einzigen Feuerball oder einer Bombe.',
    },
    notToday: {
      title: 'Heute nicht',
      description: 'Gewinne, während dein Bollwerk noch einen Verbündeten schützt.',
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
    thread: { title: 'Pendiente de un hilo', description: 'Gana con tu rey a 1 de vida.' },
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
    speedrun: { title: 'Speedrun Any%', description: 'Gana en las 3 primeras rondas.' },
    dogs: {
      title: '¿Quién soltó a los perros?',
      description: 'Gana con un ejército de solo lobos y tu rey.',
    },
    crispy: {
      title: 'Extra crujiente',
      description: 'Gana tras mandar una de tus unidades a la lava.',
    },
    smite: {
      title: 'Los dioses fallaron',
      description: 'Gana después de que el fuego infernal consuma a una de tus unidades.',
    },
    divineAssist: {
      title: 'Asistencia divina',
      description: 'Gana porque el fuego infernal mató al rey enemigo.',
    },
    oops: {
      title: 'Ups',
      description: 'Gana tras matar a una de tus unidades con una bomba.',
    },
    boomRegicide: {
      title: 'Boom, rey',
      description: 'Mata al rey enemigo con una bomba o una bola de fuego.',
    },
    daredevil: {
      title: 'Temerario',
      description: 'Gana mientras tu rey está en la zona de llamarada del fuego infernal.',
    },
    bullRush: {
      title: 'Carga de toro',
      description: 'Elimina a un enemigo con la Carga del Espadachín.',
    },
    lavaPush: {
      title: 'Magma Opus',
      description: 'Empuja a un enemigo a la lava con la Estocada del Hoplita.',
    },
    acrossTheMap: {
      title: 'De punta a punta',
      description: 'Elimina a un enemigo a 5 casillas con la Embestida del Lancero.',
    },
    blinkStrike: {
      title: 'De la nada',
      description: 'Elimina a un enemigo a 4 casillas con la Emboscada del Ninja.',
    },
    twoBirds: {
      title: 'Dos pájaros de un tiro',
      description: 'Elimina a 2 enemigos con una sola Bola de fuego o Bomba.',
    },
    notToday: {
      title: 'Hoy no',
      description: 'Gana mientras tu Baluarte sigue Protegiendo a un aliado.',
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
    speedrun: { title: 'Speedrun Any%', description: 'Vinci entro i primi 3 round.' },
    dogs: {
      title: 'Chi ha liberato i cani?',
      description: 'Vinci con un esercito di soli lupi e il tuo re.',
    },
    crispy: {
      title: 'Extra croccante',
      description: 'Vinci dopo aver mandato una delle tue unità nella lava.',
    },
    smite: {
      title: 'Gli dei hanno sbagliato mira',
      description: 'Vinci dopo che il fuoco infernale ha consumato una delle tue unità.',
    },
    divineAssist: {
      title: 'Assistenza divina',
      description: 'Vinci perché il fuoco infernale ha ucciso il re nemico.',
    },
    oops: {
      title: 'Ops',
      description: 'Vinci dopo aver ucciso una delle tue unità con una bomba.',
    },
    boomRegicide: {
      title: 'Boom, re',
      description: 'Uccidi il re nemico con una bomba o una palla di fuoco.',
    },
    daredevil: {
      title: 'Temerario',
      description: 'Vinci mentre il tuo re è nella zona di vampata del fuoco infernale.',
    },
    bullRush: {
      title: 'Carica del toro',
      description: 'Elimina un nemico con la Carica dello Spadaccino.',
    },
    lavaPush: {
      title: 'Magma Opus',
      description: "Spingi un nemico nella lava con l'Affondo dell'Oplita.",
    },
    acrossTheMap: {
      title: "Da un capo all'altro",
      description: 'Elimina un nemico a 5 esagoni con lo Scatto del Lanciere.',
    },
    blinkStrike: {
      title: 'Dal nulla',
      description: "Elimina un nemico a 4 esagoni con l'Imboscata del Ninja.",
    },
    twoBirds: {
      title: 'Due piccioni, una fava',
      description: 'Elimina 2 nemici con una sola Palla di fuoco o Bomba.',
    },
    notToday: {
      title: 'Oggi no',
      description: 'Vinci mentre il tuo Bastione sta ancora Proteggendo un alleato.',
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
