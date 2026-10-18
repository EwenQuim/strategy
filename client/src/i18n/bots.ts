import type { BotName } from '../bots/catalog.ts'
import { t } from './locale.ts'

export const strategyHints = t<Record<BotName, string>>({
  en: {
    random: 'Easiest. Unpredictable moves, little planning. Good for learning.',
    depthsearch: 'A step up. Looks ahead, but offers more openings than Napoleon.',
    napoleon: 'Challenging. Coordinates attacks and anticipates your replies.',
    hannibal:
      'Strong, experimental opponent. Searches with a trained evaluator; higher difficulty can be slow and is not always stronger.',
    caesar:
      'Aggressive and experimental. Searches with a freshly trained evaluator and presses the attack instead of waiting.',
    belisarius:
      'Hybrid and experimental. Proves the near future exactly, samples the deep future, presses the attack, and dials difficulty by how close to its best plan it must play.',
    mistral:
      'Experimental. Uses the Mistral API; strength varies and replies can be slow. Requires a key, otherwise uses Sun Tzu.',
    jev: 'Experimental. Uses the Jev API to choose moves; strength varies. Requires a key, otherwise uses Sun Tzu.',
  },
  fr: {
    random: 'Le plus facile. Des coups imprévisibles, peu de réflexion. Idéal pour apprendre.',
    depthsearch: 'Un cran au-dessus. Anticipe, mais laisse plus d’ouvertures que Napoléon.',
    napoleon: 'Coriace. Coordonne ses attaques et anticipe vos réponses.',
    hannibal:
      'Adversaire fort, expérimental. Utilise une évaluation entraînée ; les difficultés élevées peuvent être lentes et ne sont pas toujours plus fortes.',
    caesar:
      'Agressif et expérimental. Cherche avec une évaluation récemment entraînée et presse l’attaque au lieu d’attendre.',
    belisarius:
      'Hybride et expérimental. Prouve le futur proche exactement, échantillonne le futur lointain, presse l’attaque, et règle la difficulté selon la proximité exigée de son meilleur plan.',
    mistral:
      'Expérimental. Utilise l’API Mistral ; force variable et réponses parfois lentes. Nécessite une clé, sinon utilise Sun Tzu.',
    jev: 'Expérimental. Utilise l’API Jev pour choisir ses coups ; force variable. Nécessite une clé, sinon utilise Sun Tzu.',
  },
  de: {
    random: 'Am leichtesten. Unvorhersehbare Züge, wenig Planung. Gut zum Lernen.',
    depthsearch: 'Eine Stufe höher. Plant voraus, bietet aber mehr Chancen als Napoleon.',
    napoleon: 'Anspruchsvoll. Koordiniert Angriffe und denkt deine Antworten voraus.',
    hannibal:
      'Starker, experimenteller Gegner. Sucht mit einer trainierten Bewertung; höhere Schwierigkeit kann langsam sein und ist nicht immer stärker.',
    caesar:
      'Aggressiv und experimentell. Sucht mit einer frisch trainierten Bewertung und greift an, statt zu warten.',
    belisarius:
      'Hybrid und experimentell. Beweist die nahe Zukunft exakt, tastet die ferne Zukunft ab, greift an und regelt die Schwierigkeit darüber, wie nah am besten Plan gespielt werden muss.',
    mistral:
      'Experimentell. Nutzt die Mistral-API; wechselnde Stärke und teils langsame Antworten. Benötigt einen Schlüssel, sonst spielt Sun Tzu.',
    jev: 'Experimentell. Wählt Züge über die Jev-API; wechselnde Stärke. Benötigt einen Schlüssel, sonst spielt Sun Tzu.',
  },
  es: {
    random: 'El más fácil. Jugadas imprevisibles, poca planificación. Ideal para aprender.',
    depthsearch: 'Un paso más. Anticipa jugadas, pero deja más oportunidades que Napoleón.',
    napoleon: 'Exigente. Coordina ataques y anticipa tus respuestas.',
    hannibal:
      'Rival fuerte y experimental. Busca con una evaluación entrenada; las dificultades altas pueden ser lentas y no siempre son más fuertes.',
    caesar:
      'Agresivo y experimental. Busca con una evaluación recién entrenada y presiona el ataque en vez de esperar.',
    belisarius:
      'Híbrido y experimental. Demuestra el futuro cercano con exactitud, muestrea el futuro lejano, presiona el ataque y gradúa la dificultad según lo cerca que debe jugar de su mejor plan.',
    mistral:
      'Experimental. Usa la API de Mistral; fuerza variable y respuestas a veces lentas. Requiere una clave; sin ella juega Sun Tzu.',
    jev: 'Experimental. Usa la API de Jev para elegir jugadas; fuerza variable. Requiere una clave; sin ella juega Sun Tzu.',
  },
  it: {
    random: 'Il più facile. Mosse imprevedibili, poca pianificazione. Ideale per imparare.',
    depthsearch: 'Un passo avanti. Prevede le mosse, ma offre più occasioni di Napoleone.',
    napoleon: 'Impegnativo. Coordina gli attacchi e anticipa le tue risposte.',
    hannibal:
      'Avversario forte e sperimentale. Cerca con una valutazione addestrata; le difficoltà alte possono essere lente e non sono sempre più forti.',
    caesar:
      'Aggressivo e sperimentale. Cerca con una valutazione appena addestrata e preme l’attacco invece di aspettare.',
    belisarius:
      'Ibrido e sperimentale. Dimostra il futuro prossimo con esattezza, campiona il futuro lontano, preme l’attacco e regola la difficoltà in base a quanto deve avvicinarsi al suo piano migliore.',
    mistral:
      'Sperimentale. Usa l’API Mistral; forza variabile e risposte talvolta lente. Richiede una chiave, altrimenti gioca Sun Tzu.',
    jev: 'Sperimentale. Usa l’API Jev per scegliere le mosse; forza variabile. Richiede una chiave, altrimenti gioca Sun Tzu.',
  },
})
