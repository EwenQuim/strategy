import { t } from './locale'

export const title = t({
  en: 'Privacy policy',
  fr: 'Règles de confidentialité',
  de: 'Datenschutzerklärung',
  es: 'Política de privacidad',
  it: 'Informativa sulla privacy',
})

export const updated = t({
  en: 'Last updated: October 17, 2026',
  fr: 'Dernière mise à jour : 17 octobre 2026',
  de: 'Letzte Aktualisierung: 17. Oktober 2026',
  es: 'Última actualización: 17 de octubre de 2026',
  it: 'Ultimo aggiornamento: 17 ottobre 2026',
})

export type Section = { heading: string; paragraphs: string[] }

export const sections = t<Section[]>({
  en: [
    {
      heading: 'Overview',
      paragraphs: [
        'Hexmate is a turn-based strategy game published by EwenQuim. This policy explains what data the app handles, why, and the choices you have.',
        'The game requires no account, shows no ads and includes no analytics or tracking tools. Nothing collected can identify you personally.',
      ],
    },
    {
      heading: 'Data stored on your device',
      paragraphs: [
        'Your progress (campaign, tutorial, achievements, ongoing battles), your settings (haptics, developer preview, custom setups) and your online player name are saved in the local storage of your browser or device.',
        'This data never leaves your device, except for online play described below. You can delete all of it at any time from Settings.',
      ],
    },
    {
      heading: 'Online play',
      paragraphs: [
        'To play online, the app sends your chosen player name, the game code and your moves to the Hexmate game server. The server keeps the game state, both player names and hashed access tokens, only so you can resume the game.',
        'If you make a game public, the host name and game code appear in the public lobby for one hour. No email address, advertising identifier or other personal data is collected.',
      ],
    },
    {
      heading: 'AI API keys (developer option)',
      paragraphs: [
        'In developer mode you can paste your own Mistral or Jev API key to power AI bots. The key stays in your device local storage and is sent only from your device to the provider involved, never to the Hexmate server.',
      ],
    },
    {
      heading: 'No sharing with third parties',
      paragraphs: [
        'We do not sell, rent or share any data with third parties for advertising or commercial purposes. The game uses no cookies, no trackers and no audience measurement.',
      ],
    },
    {
      heading: 'Children',
      paragraphs: [
        'Hexmate is not directed at children under 13 and does not knowingly collect any personal data from them.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: [
        'You can delete every local save at any time from Settings. For any question or request about online game data, contact us on GitHub: https://github.com/EwenQuim',
      ],
    },
    {
      heading: 'Changes',
      paragraphs: [
        'This policy may change as the game evolves. The date of the latest update is shown at the top of this page.',
      ],
    },
  ],
  fr: [
    {
      heading: 'Aperçu',
      paragraphs: [
        "Hexmate est un jeu de stratégie au tour par tour édité par EwenQuim. Ces règles expliquent quelles données l'application traite, pourquoi, et quels sont vos choix.",
        "Le jeu ne demande aucun compte, n'affiche aucune publicité et n'embarque aucun outil de mesure d'audience ou de pistage : rien de collecté ne permet de vous identifier personnellement.",
      ],
    },
    {
      heading: 'Données stockées sur votre appareil',
      paragraphs: [
        'Vos progrès (campagne, tutoriel, succès, batailles en cours), vos réglages (vibrations, aperçu développeur, configurations personnalisées) et votre pseudonyme en ligne sont enregistrés dans le stockage local de votre navigateur ou appareil.',
        'Ces données ne quittent jamais votre appareil, sauf pour le jeu en ligne décrit ci-dessous. Vous pouvez toutes les supprimer à tout moment dans Réglages.',
      ],
    },
    {
      heading: 'Jeu en ligne',
      paragraphs: [
        "Pour jouer en ligne, l'application envoie au serveur Hexmate votre pseudonyme, le code de la partie et vos coups. Le serveur conserve l'état de la partie, les pseudonymes des deux joueurs et des jetons d'accès hachés, uniquement pour permettre de reprendre la partie.",
        "Si vous rendez une partie publique, le pseudonyme de l'hôte et le code de la partie apparaissent une heure dans le salon public. Aucune adresse e-mail, identifiant publicitaire ou autre donnée personnelle n'est collecté.",
      ],
    },
    {
      heading: "Clés d'API d'IA (option développeur)",
      paragraphs: [
        "En mode développeur, vous pouvez saisir votre propre clé d'API Mistral ou Jev pour les bots IA. Cette clé reste dans le stockage local de votre appareil et n'est envoyée que de votre appareil au fournisseur concerné, jamais au serveur Hexmate.",
      ],
    },
    {
      heading: 'Aucun partage avec des tiers',
      paragraphs: [
        "Nous ne vendons, ne louons et ne partageons aucune donnée avec des tiers à des fins publicitaires ou commerciales. Le jeu n'utilise ni cookies, ni traceurs, ni mesure d'audience.",
      ],
    },
    {
      heading: 'Enfants',
      paragraphs: [
        "Hexmate ne s'adresse pas aux enfants de moins de 13 ans et ne collecte sciemment aucune donnée personnelle les concernant.",
      ],
    },
    {
      heading: 'Vos droits',
      paragraphs: [
        'Vous pouvez supprimer toutes les données locales à tout moment dans Réglages. Pour toute question ou demande concernant vos données de jeu en ligne, contactez-nous sur GitHub : https://github.com/EwenQuim',
      ],
    },
    {
      heading: 'Modifications',
      paragraphs: [
        'Ces règles peuvent évoluer avec le jeu. La date de dernière mise à jour est indiquée en haut de cette page.',
      ],
    },
  ],
  de: [
    {
      heading: 'Übersicht',
      paragraphs: [
        'Hexmate ist ein rundenbasiertes Strategiespiel, herausgegeben von EwenQuim. Diese Erklärung beschreibt, welche Daten die App verarbeitet, warum und welche Möglichkeiten du hast.',
        'Das Spiel erfordert kein Konto, zeigt keine Werbung und enthält keine Analyse- oder Tracking-Tools: Nichts davon kann dich persönlich identifizieren.',
      ],
    },
    {
      heading: 'Auf deinem Gerät gespeicherte Daten',
      paragraphs: [
        'Dein Fortschritt (Kampagne, Tutorial, Erfolge, laufende Schlachten), deine Einstellungen (Vibration, Entwicklervorschau, eigene Aufstellungen) und dein Online-Spielername werden im lokalen Speicher deines Browsers oder Geräts abgelegt.',
        'Diese Daten verlassen dein Gerät nie, außer beim Online-Spiel wie unten beschrieben. Du kannst sie jederzeit in den Einstellungen löschen.',
      ],
    },
    {
      heading: 'Online-Spiel',
      paragraphs: [
        'Für das Online-Spiel sendet die App deinen gewählten Spielernamen, den Spielcode und deine Züge an den Hexmate-Spieleserver. Der Server speichert den Spielstand, beide Spielernamen und gehashte Zugangstoken, nur damit du das Spiel fortsetzen kannst.',
        'Wenn du ein Spiel öffentlich machst, erscheinen der Name des Gastgebers und der Spielcode eine Stunde lang in der öffentlichen Lobby. Es werden keine E-Mail-Adressen, Werbe-IDs oder anderen personenbezogenen Daten erhoben.',
      ],
    },
    {
      heading: 'KI-API-Schlüssel (Entwickleroption)',
      paragraphs: [
        'Im Entwicklermodus kannst du deinen eigenen Mistral- oder Jev-API-Schlüssel für die KI-Bots hinterlegen. Der Schlüssel bleibt im lokalen Speicher deines Geräts und wird nur von deinem Gerät an den jeweiligen Anbieter gesendet, nie an den Hexmate-Server.',
      ],
    },
    {
      heading: 'Keine Weitergabe an Dritte',
      paragraphs: [
        'Wir verkaufen, vermieten oder teilen keine Daten mit Dritten zu Werbe- oder kommerziellen Zwecken. Das Spiel verwendet keine Cookies, Tracker oder Reichweitenmessung.',
      ],
    },
    {
      heading: 'Kinder',
      paragraphs: [
        'Hexmate richtet sich nicht an Kinder unter 13 Jahren und erhebt wissentlich keine personenbezogenen Daten von ihnen.',
      ],
    },
    {
      heading: 'Deine Rechte',
      paragraphs: [
        'Du kannst alle lokal gespeicherten Daten jederzeit in den Einstellungen löschen. Für Fragen oder Anfragen zu deinen Online-Spieldaten kontaktiere uns auf GitHub: https://github.com/EwenQuim',
      ],
    },
    {
      heading: 'Änderungen',
      paragraphs: [
        'Diese Erklärung kann sich mit dem Spiel weiterentwickeln. Das Datum der letzten Aktualisierung steht oben auf dieser Seite.',
      ],
    },
  ],
  es: [
    {
      heading: 'Resumen',
      paragraphs: [
        'Hexmate es un juego de estrategia por turnos publicado por EwenQuim. Esta política explica qué datos trata la aplicación, por qué y qué opciones tienes.',
        'El juego no requiere cuenta, no muestra publicidad y no incluye herramientas de análisis ni rastreo: nada de lo recopilado permite identificarte personalmente.',
      ],
    },
    {
      heading: 'Datos almacenados en tu dispositivo',
      paragraphs: [
        'Tu progreso (campaña, tutorial, logros, batallas en curso), tus ajustes (vibración, vista previa de desarrollador, configuraciones propias) y tu nombre de jugador en línea se guardan en el almacenamiento local de tu navegador o dispositivo.',
        'Estos datos nunca salen de tu dispositivo, salvo en el juego en línea descrito más abajo. Puedes borrarlos en cualquier momento desde Ajustes.',
      ],
    },
    {
      heading: 'Juego en línea',
      paragraphs: [
        'Para jugar en línea, la aplicación envía tu nombre de jugador, el código de la partida y tus jugadas al servidor de Hexmate. El servidor conserva el estado de la partida, los nombres de ambos jugadores y tokens de acceso con hash, únicamente para que puedas retomar la partida.',
        'Si haces pública una partida, el nombre del anfitrión y el código aparecen una hora en el salón público. No se recopila ninguna dirección de correo, identificador publicitario ni otros datos personales.',
      ],
    },
    {
      heading: 'Claves de API de IA (opción de desarrollador)',
      paragraphs: [
        'En el modo desarrollador puedes introducir tu propia clave de API de Mistral o Jev para los bots de IA. La clave permanece en el almacenamiento local de tu dispositivo y solo se envía desde tu dispositivo al proveedor correspondiente, nunca al servidor de Hexmate.',
      ],
    },
    {
      heading: 'Sin compartir con terceros',
      paragraphs: [
        'No vendemos, alquilamos ni compartimos datos con terceros con fines publicitarios o comerciales. El juego no utiliza cookies, rastreadores ni medición de audiencia.',
      ],
    },
    {
      heading: 'Niños',
      paragraphs: [
        'Hexmate no está dirigido a menores de 13 años y no recopila conscientemente datos personales de ellos.',
      ],
    },
    {
      heading: 'Tus derechos',
      paragraphs: [
        'Puedes borrar todos los datos locales en cualquier momento desde Ajustes. Para cualquier pregunta o solicitud sobre tus datos de partidas en línea, contáctanos en GitHub: https://github.com/EwenQuim',
      ],
    },
    {
      heading: 'Cambios',
      paragraphs: [
        'Esta política puede cambiar a medida que evoluciona el juego. La fecha de la última actualización aparece al principio de esta página.',
      ],
    },
  ],
  it: [
    {
      heading: 'Panoramica',
      paragraphs: [
        "Hexmate è un gioco strategico a turni pubblicato da EwenQuim. Questa informativa spiega quali dati tratta l'app, perché e quali scelte hai.",
        'Il gioco non richiede alcun account, non mostra pubblicità e non include strumenti di analisi o tracciamento: nulla di quanto raccolto può identificarti personalmente.',
      ],
    },
    {
      heading: 'Dati salvati sul tuo dispositivo',
      paragraphs: [
        'I tuoi progressi (campagna, tutorial, traguardi, battaglie in corso), le tue impostazioni (vibrazione, anteprima sviluppatore, configurazioni personalizzate) e il tuo nome online vengono salvati nella memoria locale del browser o del dispositivo.',
        'Questi dati non lasciano mai il tuo dispositivo, tranne per il gioco online descritto di seguito. Puoi eliminarli in qualsiasi momento dalle Impostazioni.',
      ],
    },
    {
      heading: 'Gioco online',
      paragraphs: [
        "Per giocare online, l'app invia il tuo nome, il codice della partita e le tue mosse al server di gioco Hexmate. Il server conserva lo stato della partita, i nomi dei due giocatori e token di accesso con hash, solo per permetterti di riprendere la partita.",
        "Se rendi pubblica una partita, il nome dell'host e il codice appaiono per un'ora nella lobby pubblica. Non vengono raccolti indirizzi e-mail, identificatori pubblicitari né altri dati personali.",
      ],
    },
    {
      heading: "Chiavi API per l'IA (opzione sviluppatore)",
      paragraphs: [
        'In modalità sviluppatore puoi inserire la tua chiave API Mistral o Jev per i bot IA. La chiave resta nella memoria locale del tuo dispositivo e viene inviata solo dal tuo dispositivo al fornitore interessato, mai al server Hexmate.',
      ],
    },
    {
      heading: 'Nessuna condivisione con terzi',
      paragraphs: [
        'Non vendiamo, affittiamo né condividiamo dati con terzi a scopi pubblicitari o commerciali. Il gioco non usa cookie, traccianti né misurazioni di pubblico.',
      ],
    },
    {
      heading: 'Bambini',
      paragraphs: [
        'Hexmate non è rivolto a bambini di età inferiore a 13 anni e non raccoglie consapevolmente i loro dati personali.',
      ],
    },
    {
      heading: 'I tuoi diritti',
      paragraphs: [
        'Puoi eliminare tutti i dati locali in qualsiasi momento dalle Impostazioni. Per domande o richieste sui tuoi dati di gioco online, contattaci su GitHub: https://github.com/EwenQuim',
      ],
    },
    {
      heading: 'Modifiche',
      paragraphs: [
        "Questa informativa può evolvere con il gioco. La data dell'ultimo aggiornamento è indicata all'inizio di questa pagina.",
      ],
    },
  ],
})
