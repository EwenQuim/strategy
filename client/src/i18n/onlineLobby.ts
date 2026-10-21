import { t } from './locale'

export const chooseMode = t({
  en: 'How do you want to play?',
  fr: 'Comment voulez-vous jouer ?',
  de: 'Wie möchtest du spielen?',
  es: '¿Cómo quieres jugar?',
  it: 'Come vuoi giocare?',
})
export const quickHint = t({
  en: 'Everything random',
  fr: 'Tout est aléatoire',
  de: 'Alles zufällig',
  es: 'Todo aleatorio',
  it: 'Tutto casuale',
})
export const quickDescription = t({
  en: 'A new army, a new battlefield. No team to prepare: adapt and play.',
  fr: 'Une nouvelle armée, un nouveau terrain. Rien à préparer : adaptez-vous et jouez.',
  de: 'Neue Armee, neues Schlachtfeld. Kein Team vorbereiten: anpassen und losspielen.',
  es: 'Un ejército nuevo, un campo nuevo. Nada que preparar: adáptate y juega.',
  it: 'Un nuovo esercito, un nuovo campo. Niente da preparare: adattati e gioca.',
})
export const myTeam = t({
  en: 'My team',
  fr: 'Mon équipe',
  de: 'Mein Team',
  es: 'Mi equipo',
  it: 'La mia squadra',
})
export const teamHint = t({
  en: 'Choose your units',
  fr: 'Choisissez vos unités',
  de: 'Wähle deine Einheiten',
  es: 'Elige tus unidades',
  it: 'Scegli le tue unità',
})
export const teamRules = t({
  en: 'Choose 5 different units. Your king is included separately, as in quick play.',
  fr: 'Choisissez 5 unités différentes. Votre roi est ajouté, comme en partie rapide.',
  de: 'Wähle 5 verschiedene Einheiten. Dein König kommt wie im Schnellspiel dazu.',
  es: 'Elige 5 unidades distintas. Tu rey se añade como en la partida rápida.',
  it: 'Scegli 5 unità diverse. Il re viene aggiunto, come nella partita rapida.',
})
export const editTeam = t({
  en: 'Edit my team',
  fr: 'Modifier mon équipe',
  de: 'Mein Team bearbeiten',
  es: 'Editar mi equipo',
  it: 'Modifica la mia squadra',
})
export const selectionHint = t({
  en: 'Remove a selected unit to make room for another.',
  fr: 'Retirez une unité sélectionnée pour en choisir une autre.',
  de: 'Entferne eine gewählte Einheit, um eine andere aufzunehmen.',
  es: 'Quita una unidad seleccionada para elegir otra.',
  it: 'Rimuovi una delle unità selezionate per sceglierne un’altra.',
})
export const selectionCount = t({
  en: (count: number) => 'Selected: ' + count + '/5',
  fr: (count: number) => 'Sélection : ' + count + '/5',
  de: (count: number) => 'Ausgewählt: ' + count + '/5',
  es: (count: number) => 'Selección: ' + count + '/5',
  it: (count: number) => 'Selezionate: ' + count + '/5',
})
export const prototype = t({
  en: 'Prototype',
  fr: 'Prototype',
  de: 'Prototyp',
  es: 'Prototipo',
  it: 'Prototipo',
})
export const prototypeHint = t({
  en: 'Team selection is not connected to online matches yet. Try your team against a bot; quick play stays online.',
  fr: 'Le choix d’équipe n’est pas encore connecté aux parties en ligne. Testez votre équipe contre un bot ; la partie rapide reste en ligne.',
  de: 'Die Teamauswahl ist noch nicht mit Online-Spielen verbunden. Teste dein Team gegen einen Bot; das Schnellspiel bleibt online.',
  es: 'La selección de equipo aún no está conectada a las partidas en línea. Pruébala contra un bot; la partida rápida sigue en línea.',
  it: 'La scelta della squadra non è ancora collegata alle partite online. Provala contro un bot; la partita rapida resta online.',
})
export const tryTeam = t({
  en: 'Try against a bot',
  fr: 'Tester contre un bot',
  de: 'Gegen einen Bot testen',
  es: 'Probar contra un bot',
  it: 'Prova contro un bot',
})
export const joinWithCode = t({
  en: 'Have an invite code?',
  fr: 'Vous avez un code d’invitation ?',
  de: 'Hast du einen Einladungscode?',
  es: '¿Tienes un código de invitación?',
  it: 'Hai un codice d’invito?',
})
export const publicHint = t({
  en: 'Visible to everyone in the lobby.',
  fr: 'Visible par tous dans le salon.',
  de: 'Für alle in der Lobby sichtbar.',
  es: 'Visible para todos en la sala.',
  it: 'Visibile a tutti nella sala.',
})
export const privateHint = t({
  en: 'Only players with your code can join.',
  fr: 'Seuls les joueurs avec votre code peuvent rejoindre.',
  de: 'Nur Spieler mit deinem Code können beitreten.',
  es: 'Solo pueden unirse jugadores con tu código.',
  it: 'Possono unirsi solo i giocatori con il tuo codice.',
})
export const storageUnavailable = t({
  en: 'Browser storage is unavailable. Your team will not be kept after you leave.',
  fr: 'Le stockage du navigateur est indisponible. Votre équipe ne sera pas conservée après votre départ.',
  de: 'Der Browserspeicher ist nicht verfügbar. Dein Team wird nach dem Verlassen nicht gespeichert.',
  es: 'El almacenamiento no está disponible. Tu equipo no se guardará al salir.',
  it: 'La memoria del browser non è disponibile. La squadra non verrà conservata dopo l’uscita.',
})
