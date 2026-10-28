/* tutorial-steps.js: THE one data file of the replayable tutorial (Oct 19 2026, Emmanuel: "There should be a tutorial button
   ... our companion takes you through everything from the beginning, as if you were new ... with every new update, the tutorial
   also needs to be updated"). tutorial.js only plays what is written here; nothing about the tour's content lives anywhere else.

   KEEP IT CURRENT (TUTORIAL.md, AGENTS.md, RELEASE.md):
   - Every release's news.json carries "tutorial": "<step id>" (that step explains it; update its text when the feature changed)
     or "tutorial": {"none": "why no step is needed"}. scripts/bump-build.cjs refuses a release without it.
   - Every Home ring control (home-orbit-v2.js ORDER) and every Settings row (home-settings-sleep-v2.js pageGroups + MORE) is in
     some step's `covers` or in NO_TUTORIAL with a reason. tests/tutorial-steps.test.cjs fails otherwise.
   - When you change a step, bump VERSION.
   - Every gesture the app answers to (tap, hold, drag, pinch, double or triple tap, swipe, push) is in GESTURES below, and every
     GESTURES entry is in some step's `teaches`. tests/tutorial-gestures.test.cjs scans the app's code for gesture handlers and
     fails when a file with one is neither in GESTURES nor in GESTURE_EXEMPT with a reason (Oct 21 2026, Emmanuel: "So many
     gestures are not even explained in the tutorial ... Pinch, click, long click, press, all this stuff, how are people supposed
     to know? Needs to be in the tutorial.").

   Step fields:
     id       unique, lower-case
     area     steps of one area are skipped together by "Skip" (Skip all ends the tour)
     target   CSS selectors tried in order; the first one that is on screen gets the spotlight. No target: a centred card.
     when     optional condition name, evaluated by tutorial.js (claimReady: no own companion AND LowiBirthCompanion.claim exists)
     action   optional: 'claim' opens the claim-your-own-companion step (built by the own-companion task, not here)
     covers   feature ids this step explains (ring controls, Settings rows, other features)
     teaches  GESTURES ids this step teaches
     where    the section the step is shown in: 'home' (default), 'community' or 'scan'. tutorial.js takes the user there.
     rm       optional Community top tab for the step: 'room', 'chat', 'create' or 'aff'
     tryIt    { how, anywhere? }: the user does the gesture instead of only reading about it. how is tap, hold, drag, pinch,
              double, triple or swipe; anywhere: the gesture counts anywhere on screen, not only on the target. Touches go
              through the dimmed screen on these steps. If the gesture opened something, the tour waits and moves on once it
              is closed; otherwise it moves on by itself. Next still skips it.
     practice { how, look }: the gesture can't safely be done on the real control in that moment (it would change data,
              ask for the mic, or the place isn't on screen), so the card gets a practice pad: a small look-alike (look) the
              user does the gesture on (how: tap, hold, touch, double, drag, swipe or pinch). Nothing in the app changes.
              Touches do NOT go through the dimmed screen. Same timing as tryIt in hands-free mode.
     later    'tap' | 'hold' | 'double' | 'drag' | 'swipe' | 'pinch': the card describes something the user does after the
              tour (inside a world, Scan, a chat, when they eat...). Its text must say so in every language (LATER_MARK:
              After the tour / Nach der Tour / Después del recorrido) and the card plays a small animation of that motion.
     info     a reason, for a card whose words mention a gesture but don't ask for one now (tests/tutorial-doable.test.cjs).
              Every card that asks for a gesture is tryIt, practice or later (item 38).
     title / text / cta   { en, de, es }; {name} is the companion's name */
(function (root) {
    'use strict';
    const VERSION = 35;  /* 35: Oct 27 2026, new-day-recap in part 'new' (Day recap from the companion card and My day: the day read back, care sent, one journal line; shows after the evening catch-up Save); 34: Oct 26 2026, new-evening-catchup in part 'new' (Catch up on today: the evening bubble checklist, first row in Settings); 33: Oct 26 2026, new-quick-tour in part 'new' (the 45-second video tour, Settings row after Tutorial); 32: Oct 26 2026, new-cart-ask in part 'new' (Someone else pays: the whole Cart as a Give a hand basket); 31: Oct 26 2026, new-mic-dictation in part 'new' (a small mic in text fields: speak instead of typing; Home Screen app on iPhone uses the keyboard's mic); 30: Oct 26 2026, new-cook-tabs (Cook opens on Kitchen, the first tab; hold a Cook tab to move it) and new-kitchen no longer says next to Swipe; 29: Oct 26 2026, new-scan-why in part 'new' (the scanner card's curve, How often and Why?); 28: Oct 26 2026, new-kitchen rewritten (Kitchen is a game in Cook next to Shuffle and Swipe) and new-give-hand opens Shop on Seller Zone (Kitchen left Shop); 27: Oct 25 2026, new-give-hand in part 'new' (Give a hand is its own Shop tab next to Kitchen); 26: Oct 25 2026, the short base tour (11 cards, auto demo, What's New never in the base tour); 25: Oct 24 2026, new-meal-curve in part 'new' (Gap: After your meal, five phases and how to lower the spike); 24: Oct 24 2026, Circles removed (new-rooms step gone, cm-name says People; Emmanuel: "nuke Circle ... we just have one chat"); 23: Oct 24 2026, Water card names Size (the bottle size picker), cup is a glass in English; 22: Oct 24 2026, new-kitchen in part 'new' (Shop > Kitchen: at home + shopping cart); 21: Oct 24 2026, new-voice-speed in part 'new' (the 1× / 1.5× / 2× speed pill next to Pause); 20: Oct 24 2026, Hold Scan card (every bubble at once) replaces the Two fingers card, plus new-scan-hold in part 'new'; 19: Oct 23 2026, part 'new' (the newest features, the What's New mini tour plays these); 18: Oct 23 2026, Gap reads h:mm and Log meal is Meal or Snack with a Today list; 17: Oct 23 2026, Water by sips / cup / bottle, hold = take the last one back; 16: Oct 23 2026, the pinch-into-the-galaxy card is gone (no pinch shortcut between Home and Community); 15: Oct 23 2026, Inside Scan says you can type a food name; 14: Oct 22 2026, Mirror mode card right after the basic gestures */
    const AREAS = ['you', 'home', 'food', 'play', 'companion', 'together', 'settings', 'extras', 'new', 'end'];
    const STEPS = [
        /* ---------- the base tour (Oct 25 2026, Emmanuel: "far too long ... only the essentials, at most 12 steps"). One card per
           place, one short sentence each. demo: the brown finger (tutorial-demo.js) taps or holds the REAL bubble (g), then the tour
           opens the real place read-only (open: a route in tutorial.js OPEN, or 'scan-demo' = the mocked Scan screen, never the
           camera) and moves on by itself when the voice and the demo are done. No Try it now, no practice, no "After the tour".
           New features never go here: they go into part 'new' (What's New), which the base tour does NOT play.
           tests/tutorial-short.test.cjs fails when the base tour grows past MAX_BASE. ---------- */
        {
            /* HOOK (claim-your-own-companion): OFF until the own-companion task ships LowiBirthCompanion.claim(opts).
               tutorial.js only plans this step when that function exists (ctx.claimReady), so the tour never depends on it. */
            id: 'claim', area: 'you', when: 'claimReady', hook: 'own-companion-claim', action: 'claim', target: null, covers: ['companion-claim'], info: 'the claim form opens right on this card; ‘type’ is the personality type',
            title: { en: 'Make me yours', de: 'Mach mich zu deinem', es: 'Hazme tuyo' },
            text: {
                en: 'Tell me your birthday and I become your very own companion.',
                de: 'Sag mir deinen Geburtstag, dann werde ich dein ganz eigener Begleiter.',
                es: 'Dime tu cumpleaños y me convierto en tu propio compañero.'
            },
            cta: { en: 'Let’s do it', de: 'Los geht’s', es: '¡Vamos!' }
        },
        {
            id: 'hello', area: 'you', target: ['[data-home-misty]', '#spBubble'], demo: { g: 'hold', open: 'misty-card' },
            covers: ['companion', 'misty', 'companion-card', 'energy', 'mood', 'energy-peak', 'welcome-energy', 'forms', 'evolution', 'care-room', 'cell-room', 'rename', 'aura', 'mirror-mode'],
            teaches: ['misty-hold'],
            title: { en: 'Hi, I’m {name}', de: 'Hi, ich bin {name}', es: 'Hola, soy {name}' },
            text: {
                en: 'Hold me and my card opens: my energy, my level and what I still need.',
                de: 'Halt mich gedrückt, dann geht meine Karte auf: Energie, Level und was mir noch fehlt.',
                es: 'Mantenme pulsado y se abre mi tarjeta: mi energía, mi nivel y lo que aún me falta.'
            }
        },
        {
            id: 'gap', area: 'home', target: ['#spFast'], demo: { g: 'tap', open: 'gap-view' }, covers: ['home-ring', 'gap', 'fasting', 'cook', 'log-meal'], teaches: ['gap-tap'],
            title: { en: 'Gap', de: 'Gap', es: 'Gap' },
            text: {
                en: 'Tap Gap: how long since your last meal, log a meal, Cook and today\'s meals.',
                de: 'Tipp auf Gap: wie lange dein letztes Essen her ist, Mahlzeit eintragen, Kochen und heutige Mahlzeiten.',
                es: 'Toca Gap: cuánto desde tu última comida, registrar comida, Cocinar y las comidas de hoy.'
            }
        },
        {
            /* Oct 28 2026 food plan: this bubble is Einkaufen (cart + open count of the shopping list); meals are logged in the Gap hub */
            id: 'fuel', area: 'home', target: ['#whHud .wh-meals'], demo: { g: 'tap', open: 'home-shop' }, covers: ['fuel', 'shop'], teaches: ['fuel-tap'],
            title: { en: 'Shopping', de: 'Einkaufen', es: 'Compras' },
            text: {
                en: 'Tap Shopping for the supermarket, your kitchen, the Seller Zone and Help out.',
                de: 'Tipp auf Einkaufen für Supermarkt, Zu Hause, Seller Zone und Hilf mit.',
                es: 'Toca Compras para el súper, tu cocina, la Seller Zone y Ayuda.'
            }
        },
        {
            id: 'water', area: 'home', target: ['#whHud .wh-water'], demo: { g: 'tap', open: 'water-bloom' }, covers: ['water', 'hydration'], teaches: ['water-tap'],
            title: { en: 'Water', de: 'Wasser', es: 'Agua' },
            text: {
                en: 'Tap Water and pick what you drank: 10 sips, a glass or a bottle.',
                de: 'Tipp auf Wasser und wähl, was du getrunken hast: 10 Sips, ein Glas oder eine Flasche.',
                es: 'Toca Agua y elige lo que bebiste: 10 sorbos, un vaso o una botella.'
            }
        },
        {
            id: 'move', area: 'home', target: ['#whHud .wh-move'], demo: { g: 'tap', open: 'move-bloom' }, covers: ['move', 'move-page', 'workouts-page'], teaches: ['move-tap'],
            title: { en: 'Move', de: 'Bewegung', es: 'Movimiento' },
            text: {
                en: 'Tap Move in the evening and pick Casual, Steady or Epic for your steps.',
                de: 'Tipp abends auf Bewegung und wähl Locker, Stetig oder Episch für deine Schritte.',
                es: 'Toca Movimiento por la noche y elige Tranquilo, Constante o Épico según tus pasos.'
            }
        },
        {
            id: 'sleep', area: 'home', target: ['#whHud .o8-sleep'], demo: { g: 'tap', open: 'sleep-bloom' }, covers: ['sleep'], teaches: ['sleep-tap'],
            title: { en: 'Sleep', de: 'Schlaf', es: 'Sueño' },
            text: {
                en: 'Tap Sleep once a day and tell me how long you slept.',
                de: 'Tipp einmal am Tag auf Schlaf und sag mir, wie lange du geschlafen hast.',
                es: 'Toca Sueño una vez al día y dime cuánto dormiste.'
            }
        },
        {
            /* Scan in the tour NEVER calls the camera (no iOS permission prompt): 'scan-demo' is a mocked Scan screen with a sample
               photo; the finger presses its shutter and a verdict marked Demo appears. The camera is asked at the first REAL scan. */
            id: 'scan', area: 'food', target: ['#whHud .o8-scan'], demo: { g: 'tap', open: 'scan-demo' }, sayTitle: { es: false },
            covers: ['scan', 'barcode', 'deep-analyze', 'fix-food', 'snap-food', 'photo-checks'], teaches: ['scan-tap'],
            title: { en: 'Scan', de: 'Scannen', es: 'Escanear' },
            text: {
                en: 'Tap Scan and point the camera at your food: I tell you how much it spikes.',
                de: 'Tipp auf Scannen und halt die Kamera auf dein Essen: Ich sag dir, wie stark es spiked.',
                es: 'Toca Escanear y apunta la cámara a tu comida: te digo cuánto te sube el azúcar.'
            }
        },
        {
            id: 'community', area: 'together', target: ['#whHud .o8-settings'], demo: { g: 'tap', open: 'community-tab' },
            covers: ['community', 'community-tabs', 'person-card', 'community-post', 'community-chat', 'voice-message', 'photo-message', 'community-tab-order', 'community-energy', 'creation', 'affiliates'],
            teaches: ['community-tap'],
            title: { en: 'Community', de: 'Community', es: 'Comunidad' },
            text: {
                en: 'Tap Community to meet everyone else and their companions.',
                de: 'Tipp auf Community und triff alle anderen und ihre Begleiter.',
                es: 'Toca Comunidad para conocer a los demás y a sus compañeros.'
            }
        },
        {
            id: 'settings', area: 'settings', target: ['#whHud .o8-settings'], demo: { g: 'hold', open: 'settings-sheet' },
            covers: ['settings', 'theme', 'language', 'day-night', 'me', 'look', 'account', 'deleteAccount', 'body', 'weight', 'bmi', 'care', 'workouts', 'foryou', 'hunt', 'tutorial', 'quickTour', 'back-x', 'home-visit', 'day-card', 'whats-new', 'update'],
            teaches: ['community-hold'],
            title: { en: 'Settings', de: 'Einstellungen', es: 'Ajustes' },
            text: {
                en: 'Hold Community for your profile, day or night, language and your account.',
                de: 'Halt Community gedrückt für dein Profil, Tag oder Nacht, Sprache und dein Konto.',
                es: 'Mantén pulsada Comunidad para tu perfil, día o noche, idioma y tu cuenta.'
            }
        },
        /* ---------- part: new (Oct 23 2026, Emmanuel: "every time I do an update it's not in the tutorial style ... take them to the
           place where you updated it and show them around"). The newest features, last in the tour. A release's What's New plays
           only its own steps from here (news.json "tour"), as a mini tour in this same card style: it opens the place (open),
           points at the new thing, and goes back home at the end. open: a route in tutorial.js OPEN (move, shop, kitchen, rooms). New
           features add a step here; when this part grows past ~8 steps, move the oldest into their own area. ---------- */
        {
            id: 'new-intro', area: 'new', target: null, covers: ['whats-new-tour'],
            title: { en: 'New in this update', de: 'Neu in diesem Update', es: 'Novedades de esta versión' },
            text: {
                en: 'A few new things. I’ll show you where they are. You can skip anytime.',
                de: 'Ein paar neue Sachen. Ich zeig dir, wo sie sind. Überspringen geht jederzeit.',
                es: 'Hay algunas novedades. Te enseño dónde están. Puedes saltarlo cuando quieras.'
            },
            cta: { en: 'Let’s go', de: 'Los geht’s', es: 'Vamos' }
        },
        {
            id: 'new-meal-curve', area: 'new', where: 'home', target: ['#spFast'], covers: ['gap'],
            info: 'points at the Gap bubble on Home; the After your meal strip is at the top of the Gap card once it is open',
            title: { en: 'After your meal', de: 'Nach dem Essen', es: 'Después de comer' },
            text: {
                en: 'New in Gap: what your blood sugar typically does after a meal, phase by phase, and easy ways to lower the spike.',
                de: 'Neu in Gap: was dein Blutzucker nach dem Essen typischerweise macht, Phase für Phase, und einfache Wege, den Spike zu senken.',
                es: 'Nuevo en Gap: lo que suele hacer tu azúcar después de comer, fase a fase, y formas fáciles de bajar el pico.'
            }
        },
        {
            id: 'new-meal-speaker', area: 'new', where: 'home', target: ['#spFast'], covers: ['gap'],
            info: 'points at the Gap bubble on Home; each After your meal phase card inside Gap has a round speaker next to its title (Oct 24 2026)',
            title: { en: 'Listen instead of reading', de: 'Hören statt lesen', es: 'Escuchar en vez de leer' },
            text: {
                en: 'New in Gap: tap the speaker on an After your meal card and the tutorial voice reads it to you. Tap again to stop.',
                de: 'Neu in Gap: Tippe bei Nach dem Essen auf den Lautsprecher, dann liest dir die Tutorial-Stimme die Karte vor. Nochmal tippen stoppt.',
                es: 'Nuevo en Gap: toca el altavoz en una tarjeta de Después de comer y la voz del tutorial te la lee. Toca otra vez para parar.'
            }
        },
        {
            id: 'new-cart-swipe', area: 'new', where: 'home', open: 'shop', target: ['.stp-card .stp-cartbtn', '.stp-card'], covers: ['supermarket-cart', 'give-hand-swipe'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.22): the Supermarket tab in Shop has a Cart (Warenkorb / Carrito; cart-core.js, store-picks.js cartHTML) with quantities and an estimate from reported prices; the Seller Zone strip left the Supermarket (Seller Zone keeps its own tab); Give a hand is a swipe deck (gift-basket.js deckHTML): right = pay for these groceries, left = skip.',
            title: { en: 'Your cart', de: 'Dein Warenkorb', es: 'Tu carrito' },
            text: {
                en: 'New in Supermarket: a Cart with amounts and an estimated total. In Give a hand, swipe a basket right to pay for it, left to skip.',
                de: 'Neu im Supermarkt: ein Warenkorb mit Mengen und Schätzsumme. In Hilf mit wischst du Körbe: rechts bezahlen, links überspringen.',
                es: 'Nuevo en el súper: carrito con cantidades y total estimado. En Echa una mano, desliza cestas: derecha para pagar, izquierda para saltar.'
            }
        },
        {
            id: 'new-quick-add', area: 'new', where: 'home', open: 'supermarket', target: ['.stp-card .stp-qa', '.stp-card'], covers: ['quick-add'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.35, quick-add-core.js): a quick + on every Supermarket product row. + puts it in the Cart and turns into - 1 +, the house puts it straight into the Kitchen, nothing opens',
            title: { en: 'Add while you scroll', de: 'Beim Scrollen hinzufügen', es: 'Añade mientras bajas' },
            text: {
                en: 'In Supermarket, tap + on any product to put it in your Cart without opening it. Tap the house if you already have it at home.',
                de: 'Tippe im Supermarkt bei jedem Produkt auf +, und es landet im Warenkorb, ohne es zu öffnen. Hast du es schon, tippe aufs Haus.',
                es: 'En Supermercado, toca + en cualquier producto y va a tu carrito sin abrirlo. Si ya lo tienes en casa, toca la casita.'
            }
        },
        {
            id: 'new-week-shop', area: 'new', where: 'home', open: 'supermarket', target: ['.stp-card [data-stp-tab="home"]', '.stp-card'], covers: ['week-shop'],
            info: 'Oct 27 2026: Shop from home is its own Shop tab now (Zu Hause / From home / Desde casa), right next to Supermarket; the spotlight points at that tab (Emmanuel: "Vielleicht möchte Von zu Hause einkaufen seine eigene Sektion haben"). Oct 26 2026: Shop from home at the top of Supermarket (week-basket.js, MAYA-HANDOFF 0.21). Household, budget and dinners in, a week of low-spike dinners and one grocery list out, priced with the existing store estimates; it fills the Cart (0.22).',
            title: { en: 'Shop from home', de: 'Von zu Hause einkaufen', es: 'Compra desde casa' },
            text: {
                en: 'New: From home, right next to Supermarket. Pick people, budget and dinners for a low-spike week with store estimates, then fill your Cart.',
                de: 'Neu: Zu Hause, gleich neben Supermarkt. Personen, Budget, Abendessen wählen: eine Low-Spike-Woche mit Schätzpreis, ab in den Warenkorb.',
                es: 'Nuevo: Desde casa, junto a Súper. Elige personas, presupuesto y cenas: una semana low-spike con precio estimado, al carrito.'
            }
        },
        {
            id: 'new-one-scanner', area: 'new', where: 'home', target: ['#whHud .o8-scan'], covers: ['scan'],
            title: { en: 'One scanner everywhere', de: 'Ein Scanner überall', es: 'Un solo escáner en todas partes' },
            text: {
                en: 'Every scan now shows the same short card: one verdict, a better pick when it helps, and the rest under Details.',
                de: 'Jeder Scan zeigt jetzt dieselbe kurze Karte: ein Urteil, eine bessere Wahl, wenn sie hilft, und der Rest unter Details.',
                es: 'Cada escaneo muestra ahora la misma tarjeta corta: un veredicto, una opción mejor cuando ayuda, y el resto en Detalles.'
            }
        },
        {
            id: 'new-shop-finds', area: 'new', where: 'home', open: 'shop', target: ['.gh-entry', '.stp-card'], covers: ['scan'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.32, grocery-hunt.js): Shop finds made simple. One plain line, Power combos first, Caught today with the scanner card words, the shop picked once (reuses Supermarket), and one short line on the scanner card only when a scan earned something',
            title: { en: 'Shop finds, simpler', de: 'Ladenfunde, einfacher', es: 'Hallazgos, más simple' },
            text: {
                en: 'Shop finds is simpler: scan food while you shop to earn XP for your companion, with Power combos right at the top.',
                de: 'Ladenfunde ist einfacher: Scanne Essen beim Einkaufen, sammle XP für deinen Begleiter, Power-Kombis ganz oben.',
                es: 'Hallazgos es más simple: escanea comida al comprar, gana XP para tu compañero, con los combos de poder arriba.'
            }
        },
        {
            id: 'new-scan-why', area: 'new', where: 'home', target: ['#whHud .o8-scan'], covers: ['scan'],
            info: 'Oct 26 2026 scan-why: the scanner card shows a tiny estimated blood sugar curve, How often in numbers and a Why? button (shop-scan.js verdictHTML)',
            title: { en: 'How often, and why', de: 'Wie oft und warum', es: 'Cada cuánto y por qué' },
            text: {
                en: 'Scan a food: a small curve shows the estimated rise, How often says how often it fits, and Why? explains it in plain words.',
                de: 'Scanne ein Essen: Eine kleine Kurve zeigt den geschätzten Anstieg, Wie oft sagt, wie oft es passt, Warum? erklärt es einfach.',
                es: 'Escanea un alimento: una curva muestra la subida estimada, Cada cuánto dice cuántas veces encaja y ¿Por qué? lo explica fácil.'
            }
        },
        {
            id: 'new-mic-dictation', area: 'new', where: 'home', target: ['#whHud .o8-scan'], covers: ['mic-dictation'],
            info: 'Oct 26 2026 mic-dictate.js: a small glass mic inside the right edge of free-text fields (food names, searches, Kitchen add, snacks, captions, chat). It uses only the phone\u2019s own free speech recognition; in the Home Screen app on iPhone it opens the keyboard and points at the keyboard\u2019s dictation mic',
            title: { en: 'Speak instead of typing', de: 'Sprechen statt tippen', es: 'Habla en vez de escribir' },
            text: {
                en: 'See the small mic in a text field? Tap it and just say your food, I write it down. In the Home Screen app, tap the mic on your keyboard.',
                de: 'Siehst du das Mikro im Textfeld? Tipp drauf und sag dein Essen, ich schreibe mit. In der Home-Bildschirm-App: Mikro der Tastatur.',
                es: '¿Ves el micro en el campo de texto? Tócalo y di tu comida, yo la escribo. En la app de inicio, toca el micro del teclado.'
            }
        },
        {
            id: 'new-cart-ask', area: 'new', where: 'home', open: 'shop', target: ['.stp-card .stp-cartbtn', '.stp-card'], covers: ['supermarket-cart'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.34): the Supermarket Cart sheet covers the whole Shop card with a blurred page behind it and compact matching buttons; "Someone else pays" turns the whole cart (items + amounts, low-spike foods only) into a Give a hand basket (gift-basket.js fromCart / cartBasketHTML)',
            title: { en: 'Someone else pays', de: 'Jemand anderes zahlt', es: 'Que pague otra persona' },
            text: {
                en: 'In your Cart, tap Someone else pays: the whole cart becomes a Give a hand basket. Add a rough total and your pay link, then share.',
                de: 'Im Warenkorb auf Jemand anderes zahlt tippen: Der ganze Korb landet bei Hilf mit. Ungefähre Summe und Zahlungslink rein, teilen.',
                es: 'En tu carrito, toca Que pague otra persona: todo pasa a ser una cesta de Echa una mano. Pon total y enlace de pago, y comparte.'
            }
        },
        {
            id: 'new-give-hand', area: 'new', where: 'home', open: 'shop', target: ['.stp-card .stp-tab[data-stp-tab="gift"]', '.stp-card'], covers: ['give-a-hand'],
            info: 'Oct 25 2026: the Give a hand tab in Shop (store-picks.js giftDoor); it shows once the server has the basket table, otherwise the card points at Shop. Oct 26: the Kitchen tab left Shop for Cook, so the card opens Shop on Seller Zone and Give a hand sits right beside it',
            title: { en: 'Give a hand', de: 'Hilf mit', es: 'Echa una mano' },
            text: {
                en: 'New in Shop: Give a hand has its own tab, right next to Seller Zone. Pay for someone’s healthy groceries, or share your own basket.',
                de: 'Neu im Shop: Hilf mit hat jetzt einen eigenen Tab, neben Seller Zone. Bezahl jemandem gesunde Lebensmittel oder teile deinen eigenen Korb.',
                es: 'Nuevo en Shop: Echa una mano tiene su propia pestaña, junto a Seller Zone. Paga la compra sana de alguien o comparte tu propia cesta.'
            }
        },
        {
            id: 'new-voice-speed', area: 'new', target: null, covers: ['tutorial-voice-speed'],
            info: 'the speed pill is on this very card, right after Pause while the voice is on, so the card itself is where you tap it',
            title: { en: 'Voice speed', de: 'Sprechtempo', es: 'Velocidad de voz' },
            text: {
                en: 'Tap my picture and I read aloud. Tap the speed next to Pause for 1.5 or 2 times as fast, like a voice note. I remember it.',
                de: 'Tipp auf mein Bild, dann lese ich vor. Tipp aufs Tempo neben Pause für 1,5- oder 2-mal so schnell. Ich merke es mir.',
                es: 'Toca mi imagen y leo en voz alta. Toca la velocidad junto a Pausa para 1,5 o 2 veces más rápido. Lo recuerdo.'
            }
        },
        {
            id: 'new-move-finish', area: 'new', where: 'move', open: 'move', target: ['.mm-hero', '.mm-hero-dl'], covers: ['move-finish'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.37, move-finish-core.js / move-finish.js): every finished Move session, Mirror mode and Kreuzheben included, is saved to This week and History, pays the biggest reward in the app (150 + 5 per minute, up to 60 min, 3 a day) and ends with a grand finish.',
            title: { en: 'Finish strong', de: 'Stark ins Ziel', es: 'Termina a lo grande' },
            text: {
                en: 'Finish any Move session, Mirror mode and Deadlift too, and you get the biggest reward in the app, plus a big celebration.',
                de: 'Beende eine Bewegen-Einheit, auch Spiegel-Modus und Kreuzheben: Du bekommst die größte Belohnung der App und ein großes Fest.',
                es: 'Termina cualquier sesión de Moverse, también modo espejo y peso muerto: la mayor recompensa de la app y una gran celebración.'
            }
        },
        {
            id: 'new-day-recap', area: 'new', where: 'home', open: 'misty-card', target: ['[data-mh="t-recap"]'], scroll: true, covers: ['day-recap', 'dayRecap'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.40, day-recap.js): Day recap, your companion\'s read-only look back at today (meals with their likely blood sugar spike verdicts, longest gap, Move, water, XP, level up), one takeaway and one nudge for tomorrow, care sent today, an optional journal line (type or speak, saved on the phone); shows once after the evening catch-up Save. On the companion card (Your day bubble, glows from 6 PM) and in My day. Otherwise never opens by itself, no notification.',
            title: { en: 'Your day, looked back', de: 'Dein Tag im R\u00fcckblick', es: 'Tu d\u00eda, en resumen' },
            text: {
                en: 'Hold your companion and tap Your day: meals, longest gap, Move and care, one tip for tomorrow, and a line for your journal.',
                de: 'Begleiter gedr\u00fcckt halten, dann Dein Tag: Mahlzeiten, l\u00e4ngste Pause, Move und F\u00fcrsorge, ein Tipp f\u00fcr morgen und eine Zeile f\u00fcrs Tagebuch.',
                es: 'Mant\u00e9n pulsado a tu compa\u00f1ero y toca Tu d\u00eda: comidas, pausa m\u00e1s larga, Move y cuidado, un consejo para ma\u00f1ana y una l\u00ednea para tu diario.'
            }
        },
        {
            id: 'new-quick-tour', area: 'new', where: 'home', target: ['#whHud .o8-settings'], covers: ['quickTour', 'quick-tour'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.38, quick-tour.js): the promo video (one VIDEO config, easy to swap) as a Quick tour, on the first onboarding screen and as a Settings row right after Tutorial. Muted first, Tap for sound, Skip any time; lazy-loaded, never cached by the service worker.',
            title: { en: 'Quick tour', de: 'Kurze Tour', es: 'Tour r\u00e1pido' },
            text: {
                en: 'The whole app in one short video: Settings has a Quick tour right after Tutorial. It starts muted, tap for sound.',
                de: 'Die ganze App in einem kurzen Video: In den Einstellungen gibt es gleich nach Tutorial die kurze Tour. Tipp f\u00fcr Ton.',
                es: 'Toda la app en un v\u00eddeo corto: en Ajustes, justo despu\u00e9s de Tutorial, est\u00e1 el tour r\u00e1pido. Toca para o\u00edr el sonido.'
            }
        },
        {
            id: 'new-evening-catchup', area: 'new', where: 'home', target: ['#whHud .o8-settings'], covers: ['catchUp', 'evening-catchup'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.39, evening-catchup.js): for people who can only open the app at night. A gentle evening greeting and the first Settings row open a calm checklist: one big bubble at a time (Breakfast, Lunch, Dinner, Snacks, Water, Movement), big choices, Something else or Skip, points on every pick, one Save at the end.',
            title: { en: 'Catch up on today', de: 'Heute nachtragen', es: 'Ponerme al d\u00eda' },
            text: {
                en: 'Couldn\u2019t log during the day? Settings has Catch up on today: one big bubble at a time, tap what you had, then Save.',
                de: 'Tags\u00fcber nicht zum Eintragen gekommen? In den Einstellungen: Heute nachtragen. Eine gro\u00dfe Blase nach der anderen, dann Speichern.',
                es: '\u00bfNo pudiste anotar durante el d\u00eda? En Ajustes est\u00e1 Ponerme al d\u00eda: una burbuja grande cada vez, toca lo que tomaste y luego Guardar.'
            }
        },
        {
            id: 'new-deadlift', area: 'new', where: 'move', open: 'move', target: ['.mm-hero-dl'], covers: ['deadlift-mirror'],
            title: { en: 'Deadlift in Mirror mode', de: 'Kreuzheben im Spiegel-Modus', es: 'Peso muerto en modo espejo' },
            text: {
                en: 'Stand sideways to your phone. The glowing outline shows the move and counts every clean rep.',
                de: 'Stell dich seitlich zum Handy. Der leuchtende Umriss macht es vor und zählt jede saubere Wiederholung.',
                es: 'Ponte de lado al móvil. La silueta brillante te enseña el movimiento y cuenta cada repetición limpia.'
            }
        },
        {
            id: 'new-seller', area: 'new', where: 'home', open: 'shop', target: ['.stp-card .stp-tab[data-stp-tab="sz"]', '.stp-card'], covers: ['seller-zone'],
            title: { en: 'Seller Zone', de: 'Seller Zone', es: 'Seller Zone' },
            text: {
                en: 'Real snacks you can order: chips, chocolate, gummies. Strictly checked, with photo and price. Shops near you first.',
                de: 'Echte Snacks zum Bestellen: Chips, Schoko, Gummis. Streng geprüft, mit Foto und Preis. Shops in deiner Nähe zuerst.',
                es: 'Snacks de verdad para pedir: patatas, chocolate, gominolas. Revisados a fondo, con foto y precio. Primero las tiendas cerca de ti.'
            }
        },
        {
            id: 'new-sleep', area: 'new', where: 'home', target: ['#whHud .o8-sleep'], covers: ['sleep-ring'],
            title: { en: 'Sleep in your ring', de: 'Sleep im Bubble-Ring', es: 'El sueño en tu anillo' },
            text: {
                en: 'Sleep now lives in the ring with your other bubbles, in the same living style.',
                de: 'Sleep wohnt jetzt mit deinen anderen Bubbles im Ring, im selben lebendigen Stil.',
                es: 'El sueño ahora vive en el anillo con tus otras burbujas, con el mismo estilo vivo.'
            }
        },
        {
            id: 'new-people', area: 'new', where: 'community', target: ['.rm-menu-btn', '.rm-name'], covers: ['people-directory'],
            title: { en: 'Everyone in LOWiSPIKE', de: 'Alle bei LOWiSPIKE', es: 'Todos en LOWiSPIKE' },
            text: {
                en: 'New: People in the Community menu lists everyone in the app, offline too, with name and photo. Pick one for their profile.',
                de: 'Neu: Leute im Community-Menü zeigt alle in der App, auch offline, mit Name und Foto. Wähle jemanden für das Profil.',
                es: 'Nuevo: Personas, en el menú de Comunidad, muestra a todos en la app, también sin conexión, con nombre y foto. Elige a alguien.'
            }
        },
        {
            id: 'new-humans', area: 'new', where: 'community', target: null, covers: ['humans-only-ranking'],
            title: { en: 'Only real people', de: 'Nur echte Menschen', es: 'Solo personas reales' },
            text: {
                en: 'The Ranking and Add a friend now show only real people. The bots stay in the chat with their daily photos.',
                de: 'Ranking und Freund hinzufügen zeigen jetzt nur echte Menschen. Die Bots bleiben mit ihren täglichen Fotos im Chat.',
                es: 'El Ranking y Añadir un amigo muestran ahora solo personas reales. Los bots siguen en el chat con sus fotos diarias.'
            }
        },
        {
            id: 'new-sync', area: 'new', where: 'home', target: null, covers: ['account-sync'],
            title: { en: 'iPhone and iPad in sync', de: 'iPhone und iPad synchron', es: 'iPhone y iPad sincronizados' },
            text: {
                en: 'Signed in on both? Your companion, level and logs are the same on every device.',
                de: 'Auf beiden angemeldet? Dein Begleiter, Level und Einträge sind auf jedem Gerät gleich.',
                es: '¿Has iniciado sesión en los dos? Tu compañero, nivel y registros son iguales en cada dispositivo.'
            }
        },
        {
            /* Oct 28 2026 (slim structure, batch 10): the old 'fly' card is merged in here. The ring points at the joystick, no
               finger demo; she does not really fly during the tour (her real first flight comes after Done, tutorial-flight.js) */
            id: 'done', area: 'end', target: ['#whPad'], demo: { g: 'drag', open: null },
            covers: ['joy', 'joy-hold', 'autopilot', 'zoom', 'fly-out', 'worlds', 'half-energy', 'spirit-world', 'worldSound'], teaches: ['pad-drag', 'pad-triple'],
            title: { en: 'You’re set', de: 'Startklar', es: 'Todo listo' },
            text: {
                en: 'Drag the joystick and I fly, or tap it three times for autopilot.',
                de: 'Zieh am Joystick und ich fliege, oder tipp dreimal drauf für den Autopilot.',
                es: 'Arrastra el joystick y vuelo, o tócalo tres veces para el piloto automático.'
            },
            cta: { en: 'Done', de: 'Fertig', es: 'Listo' }
        }
    ];
    /* features that exist but need no step of their own (say why) */
    const NO_TUTORIAL = {
        gift: 'Gift of the day announces itself on Home when there is one; nothing to learn',
        weather: 'Weather is a read-only extra in Settings; self-explanatory',
        notifications: 'Mitteilungen in Settings opens the notification sheet with its own labels (slim batch 9); nothing to learn',
        about: 'About & info in Settings is a read-only info sheet (slim batch 9); nothing to learn',
        support: 'Pay what you want in Settings opens the existing voluntary support view (X-16, Oct 28); nothing to learn'
    };

    /* Every gesture the app answers to (Oct 21 2026 audit). src: the files whose handlers do it; the test checks they exist and
       that every gesture handler the code scan finds sits in one of these files or in GESTURE_EXEMPT. how: tap, hold, drag,
       pinch, double, triple, swipe, push or tilt. Each id must be in some step's teaches. */
    const G = (id, where, how, src, what) => ({ id, where, how, src, what });
    const GESTURES = [
        G('give-hand-swipe', 'home', 'swipe', ['gift-basket.js'], 'Give a hand: swipe a grocery basket right to pay for it, left to skip (Oct 26; shown by What\u2019s New new-cart-swipe)'),
        G('misty-tap', 'home', 'tap', ['body-world-3d.js'], 'tap Misty: she plays'),
        G('misty-hold', 'home', 'hold', ['body-world-3d.js', 'world-home.js'], 'hold Misty: her card (energy, forms, Evolution path, home)'),
        G('misty-squish', 'home', 'hold', ['herb-touch.js', 'spirit.js', 'living-bubbles.js'], 'press Misty: her bubble squishes under your finger'),
        G('misty-turn', 'home', 'drag', ['misty-turn.js'], 'drag starting on Misty: she turns'),
        G('ring-still', 'home', 'hold', ['sym-home.js', 'home-orbit-v2.js'], 'touch an orbiting bubble: the ring stops'),
        G('water-tap', 'home', 'tap', ['home-blooms-v2.js'], 'tap Water: 10 sips, a glass or a bottle (hold Bottle to change its size)'),
        G('water-hold', 'home', 'hold', ['world-home.js'], 'hold Water: the last entry comes off'),
        G('fuel-tap', 'home', 'tap', ['home-blooms-v2.js', 'sym-home.js'], 'tap Einkaufen (the old Fuel bubble): Shop opens (Oct 28 food plan; a hold only squishes)'),
        G('move-tap', 'home', 'tap', ['home-blooms-v2.js', 'move-bubble.js'], 'tap Move: Casual, Steady, Epic'),
        G('move-hold', 'home', 'hold', ['home-blooms-v2.js', 'move-bubble.js'], 'hold Move: the Move page (workouts, edit today\'s moves)'),
        G('gap-tap', 'home', 'tap', ['home-blooms-v2.js', 'fast-bubble.js'], 'tap Gap: the eating hub (gap, last meal, Log meal, Cook, today\'s meals)'),
        G('sleep-tap', 'home', 'tap', ['home-settings-sleep-v2.js'], 'tap Sleep: how long did you sleep'),
        G('scan-tap', 'home', 'tap', ['home-orbit-v2.js'], 'tap Scan: the Scan screen'),
        /* Oct 24 2026: hold Scan opens every bubble at once (replaces the taught two-finger tap on Misty; bloom-ring.js still answers a
           two-finger tap on Misty as a quiet duplicate of this shortcut, untaught on Emmanuel's word: the tour teaches hold Scan) */
        G('community-tap', 'home', 'tap', ['home-settings-sleep-v2.js'], 'tap Community: Community'),
        G('community-hold', 'home', 'hold', ['home-settings-sleep-v2.js'], 'hold Community: slim Settings'),
        G('theme-tap', 'home', 'tap', ['top-bar.js'], 'tap the moon/sun: day or night'),
        G('theme-triple', 'home', 'triple', ['top-bar.js', 'atmosphere.js'], 'tap the moon/sun three times: Day & night adjuster'),
        G('world-drag', 'home', 'drag', ['body-world-3d.js', 'world-home.js', 'body-world-3d-scene.js'], 'drag the world: look around'),
        G('world-pinch', 'home', 'pinch', ['body-world-3d.js'], 'pinch: zoom in and out'),
        G('pad-drag', 'home', 'drag', ['misty-pad.js'], 'drag the joystick: steer'),
        G('pad-hold', 'home', 'hold', ['misty-pad.js', 'misty-turn.js'], 'hold the joystick middle: forward'),
        G('pad-back', 'home', 'hold', ['misty-pad.js'], 'tap, then hold the joystick: backwards'),
        G('pad-triple', 'home', 'triple', ['misty-pad.js', 'misty-flight.js'], 'tap the joystick three times: autopilot'),
        G('energy-shot', 'home', 'double', ['body-world-3d.js', 'misty-pad.js'], 'hold the joystick and double-tap the world: shoot energy'),
        G('clean-tap', 'home', 'tap', ['clean-view.js'], 'tap the screen while flying: the buttons come back'),
        G('edge-push', 'home', 'push', ['misty-galaxy.js', 'misty-flight.js'], 'push Misty into the edge of her world: out into the galaxy'),
        G('galaxy-bubble', 'home', 'push', ['galaxy-bubbles.js'], 'fly into a glowing bubble: visit that world'),
        G('place-tap', 'world', 'tap', ['body-world-3d.js', 'body-world-regions.js'], 'tap a glowing place: fly there'),
        G('world-inside', 'world', 'double', ['body-world-3d.js', 'body-world-regions.js'], 'inside a world: pinch or double-tap to zoom into a spot'),
        G('region-pal', 'world', 'tap', ['region-pals.js'], 'tap the little creature: next fact'),
        G('arrival-x', 'world', 'tap', ['arrival-cards.js'], 'tap X: close the gold card'),
        G('tilt', 'world', 'tilt', ['body-world-3d.js'], 'tilt button on: move the phone to look around'),
        G('sound-strings', 'world', 'swipe', ['sound-strings.js', 'world-audio.js', 'calm-sound-core.js'], 'Sound panel: touch a string, swipe across to strum, slide to bend'),
        G('scan-buttons', 'scan', 'tap', ['shop-scan.js', 'scan-glass.js'], 'Scan: barcode, type, photo'),
        G('scan-deep', 'scan', 'tap', ['shop-scan.js'], 'Deep analyze: one tap opens the LOWiSPIKE GPT in ChatGPT'),
        G('fix-field', 'scan', 'tap', ['meal-result.js'], 'What is it really?: tap a suggestion, set pieces'),
        G('page-swipe', 'home', 'swipe', ['liquid-glass.js', 'community-spirit.js'], 'swipe sideways: between Home and Community'),
        G('back-swipe', 'any', 'swipe', ['back-swipe.js', 'section-nav.js', 'companion.js'], 'swipe in from the left edge: back'),
        G('sheet-drag', 'any', 'drag', ['apple-ui.js', 'gap-view.js', 'people-directory.js', 'store-picks.js', 'companion.js'], 'drag a sheet\'s top bar down: close it'),
        G('cm-tabs', 'community', 'tap', ['community-rooms-ui.js'], 'tap Room, Chat, For You, Studio, Ranking'),
        G('cm-tab-order', 'community', 'hold', ['community-tab-order.js'], 'hold a Community tab until it wiggles, slide it: new tab order'),
        G('cm-name', 'community', 'tap', ['community-rooms-ui.js', 'community-me.js'], 'tap the Community name / your picture: rooms, profile, invite'),
        G('cm-pan', 'community', 'drag', ['community-chat.js'], 'drag the galaxy: move around'),
        G('cm-zoom', 'community', 'pinch', ['community-chat.js'], 'pinch or double-tap the galaxy: zoom'),
        G('cm-hold', 'community', 'hold', ['community-chat.js'], 'hold a companion or a name: their person card'),
        G('cm-room', 'community', 'tap', ['community-rooms-ui.js'], 'tap the room chip: rooms'),
        G('cm-mic', 'community', 'hold', ['community-chat.js'], 'hold the mic: record, let go to send, slide left to cancel'),
        G('cm-photo', 'community', 'tap', ['community-chat.js'], 'tap the camera: send a photo'),
        G('cm-energy', 'community', 'drag', ['community-energy.js'], 'drag the small joystick and let go: send energy'),
        G('aff-card', 'community', 'tap', ['community-rooms-ui.js'], 'Affiliates: tap a card for its script, copy it'),
        G('cook-swipe', 'home', 'swipe', ['nav-moves.js', 'swaflo.js'], 'Cook Swipe: swipe the cards'),
        G('ck-tab-order', 'home', 'hold', ['cook-tab-order.js', 'community-tab-order.js'], 'hold a Cook tab until it wiggles, slide it: new order, Cook opens on the first'),
        G('foryou-swipe', 'community', 'swipe', ['community-rooms-ui.js', 'fy-embed.js'], 'For You (Community tab): swipe up and down'),
        G('visit-reply', 'home', 'tap', ['home-visit.js'], 'a visiting companion: tap Reply'),
        G('mic-dictate', 'any', 'tap', ['mic-dictate.js'], 'tap the small mic in a text field and speak; tap again to stop (Oct 26; shown by What\u2019s New new-mic-dictation)')
    ];
    /* files the gesture scan matches that teach nothing new, with the reason */
    /* Oct 25 2026 (Emmanuel: "only the essentials, at most 12 steps"): gestures the short base tour deliberately does NOT teach.
       They are discovered in place (hints, chips, the companion card) or shown by a release's What's New. A NEW gesture must be
       either taught by a base card or listed here, so nothing is forgotten silently (tests/tutorial-gestures.test.cjs). */
    const SHORT_SKIP_WHY = 'not in the short base tour (Oct 25 2026, max 12 cards): found in place or shown by What\u2019s New';
    const SHORT_SKIPS = {};
    ['mic-dictate', 'give-hand-swipe', 'ck-tab-order', 'misty-tap', 'misty-squish', 'misty-turn', 'ring-still', 'water-hold', 'move-hold', 'theme-tap', 'theme-triple', 'world-drag', 'world-pinch', 'pad-hold', 'pad-back', 'energy-shot', 'clean-tap', 'edge-push', 'galaxy-bubble', 'place-tap', 'world-inside', 'region-pal', 'arrival-x', 'tilt', 'sound-strings', 'scan-buttons', 'scan-deep', 'fix-field', 'page-swipe', 'back-swipe', 'sheet-drag', 'cm-tabs', 'cm-tab-order', 'cm-name', 'cm-pan', 'cm-zoom', 'cm-hold', 'cm-room', 'cm-mic', 'cm-photo', 'cm-energy', 'aff-card', 'cook-swipe', 'foryou-swipe', 'visit-reply'].forEach(id => { SHORT_SKIPS[id] = SHORT_SKIP_WHY; });
    const GESTURE_EXEMPT = {
        'bloom-ring.js': 'Oct 28 2026 slim structure (S-02 deleted): the old hold-Scan helpers stay as code only, nothing wires them; a hold on Scan is a plain tap that opens the one scanner',
        'kitchen-game.js': 'Cook > Kitchen: dragging something that ran out onto the bin is only a shortcut; the Ran out: bin it button on the same card does it with a plain tap, and the shelf says so',
        'mirror-move.js': 'camera workout: it tells you each move out loud while you do it',
        'mirror-move-core.js': 'camera workout: it tells you each move out loud while you do it',
        'community-energy-core.js': 'math for the energy joystick taught by cm-energy',
        'ate-this.js': 'only pauses the I just ate this bar from hiding while a finger rests on it; its buttons are plain taps',
        'finch-extras.js': 'only watches touches to retire a first-use hint; it adds no gesture of its own',
        'misty-bloom.js': 'only remembers where a finger touched so a panel can grow out of that spot; no gesture of its own',
        'tutorial.js': 'the tour itself: it watches try-it gestures passively and never adds one'
    };
    /* which detected gesture satisfies a tryIt.how (a swipe is also a drag) */
    function tryMatch(how, kind) { return how === kind || how === 'touch' || (how === 'drag' && kind === 'swipe'); }
    /* "Try it now" button (Oct 22 2026, Emmanuel: "There is a try it now button that does nothing. Wiggle when try it now is said so
       they click on it which closes the tutorial for them to try it."). TRY_CUE: the words in a card's voice-over that make the button
       wiggle (longest first). tryResume: where the tour picks up after Try it now, in the shape tutorial-resume.js stores in
       lowi.tutorial.v1 .resume (fin: true = the card was done, so the next card). */
    const TRY_CUE = { en: ['try it now', 'try it'], de: ['probier’s jetzt', 'probiers jetzt', 'probier es jetzt', 'probier’s'], es: ['pruébalo ahora', 'pruébalo'] };
    function tryResume(ids, i, now) {
        const list = Array.isArray(ids) ? ids : [];
        return { at: list[i] || '', i, n: list.length, next: list[i + 1] || '', fin: true, t: now || Date.now(), via: 'tryit' };
    }

    const UI = {
        en: { next: 'Next', back: 'Back', skip: 'Skip', skipAll: 'Skip all', of: '{i} of {n}', label: 'Tutorial', newsLabel: 'New', newsSkip: 'Skip', newsDone: 'Got it', newsTitle: 'New in this update', guide: 'Your companion', tryIt: 'Try it now', nice: 'Nice, that’s it.', pause: 'Pause', play: 'Play',
            practice: 'Practise here. Nothing in your app changes.', laterTag: 'After the tour', how: { tap: 'Tap', hold: 'Hold', touch: 'Touch', double: 'Tap twice', drag: 'Drag', swipe: 'Swipe', pinch: 'Pinch' }, looks: { ring: 'Bubbles', water: 'Water · 3', world: 'World', fade: 'Buttons', companion: 'Companion', mic: 'Mic', joystick: 'Joystick', galaxy: 'Galaxy', sun: 'Day', sheet: 'Window', edge: 'Page', cards: 'Cards' }, done: { water: 'Water · 0', sun: 'Night', fade: 'Back again', mic: 'Sent', sheet: 'Closed', edge: 'Home', ring: 'Stopped' },
            peek: { title: 'Scan a barcode', aim: 'Hold the barcode inside the frame', field: 'Barcode number', barcode: 'Barcode', deep: 'Deep analyze', deepS: 'Opens the LOWiSPIKE GPT in ChatGPT', note: 'A look inside. The camera stays off.' },
            areas: { you: 'Me', home: 'Your day', food: 'Scan', play: 'Flying', companion: 'My card', together: 'Community', settings: 'Settings', extras: 'Good to know', new: 'New', end: 'Done' } },
        de: { next: 'Weiter', back: 'Zurück', skip: 'Überspringen', skipAll: 'Alles überspringen', of: '{i} von {n}', label: 'Tutorial', newsLabel: 'Neu', newsSkip: 'Überspringen', newsDone: 'Alles klar', newsTitle: 'Neu in diesem Update', guide: 'Dein Begleiter', tryIt: 'Probier’s jetzt', nice: 'Super, genau so.', pause: 'Pause', play: 'Abspielen',
            practice: 'Hier üben. In deiner App ändert sich nichts.', laterTag: 'Nach der Tour', how: { tap: 'Tippen', hold: 'Halten', touch: 'Berühren', double: 'Zweimal tippen', drag: 'Ziehen', swipe: 'Wischen', pinch: 'Zwei Finger' }, looks: { ring: 'Blasen', water: 'Wasser · 3', world: 'Welt', fade: 'Knöpfe', companion: 'Begleiter', mic: 'Mikro', joystick: 'Joystick', galaxy: 'Galaxie', sun: 'Tag', sheet: 'Fenster', edge: 'Seite', cards: 'Karten' }, done: { water: 'Wasser · 0', sun: 'Nacht', fade: 'Wieder da', mic: 'Gesendet', sheet: 'Zu', edge: 'Home', ring: 'Steht' },
            peek: { title: 'Barcode scannen', aim: 'Halte den Barcode in den Rahmen', field: 'Barcode-Nummer', barcode: 'Barcode', deep: 'Deep analyze', deepS: 'Öffnet den LOWiSPIKE GPT in ChatGPT', note: 'Ein Blick hinein. Die Kamera bleibt aus.' },
            areas: { you: 'Ich', home: 'Dein Tag', food: 'Scan', play: 'Fliegen', companion: 'Meine Karte', together: 'Community', settings: 'Einstellungen', extras: 'Gut zu wissen', new: 'Neu', end: 'Fertig' } },
        es: { next: 'Siguiente', back: 'Atrás', skip: 'Saltar', skipAll: 'Saltar todo', of: '{i} de {n}', label: 'Tutorial', newsLabel: 'Nuevo', newsSkip: 'Saltar', newsDone: 'Entendido', newsTitle: 'Novedades de esta versión', guide: 'Tu compañero', tryIt: 'Pruébalo ahora', nice: 'Bien, así es.', pause: 'Pausa', play: 'Reproducir',
            practice: 'Practica aquí. En tu app no cambia nada.', laterTag: 'Después del recorrido', how: { tap: 'Toca', hold: 'Mantén', touch: 'Toca', double: 'Toca dos veces', drag: 'Arrastra', swipe: 'Desliza', pinch: 'Pellizca' }, looks: { ring: 'Burbujas', water: 'Agua · 3', world: 'Mundo', fade: 'Botones', companion: 'Compañero', mic: 'Micro', joystick: 'Joystick', galaxy: 'Galaxia', sun: 'Día', sheet: 'Ventana', edge: 'Página', cards: 'Tarjetas' }, done: { water: 'Agua · 0', sun: 'Noche', fade: 'Ya están', mic: 'Enviado', sheet: 'Cerrada', edge: 'Inicio', ring: 'Parado' },
            peek: { title: 'Escanear código', aim: 'Pon el código dentro del marco', field: 'Número del código', barcode: 'Código', deep: 'Deep analyze', deepS: 'Abre el GPT de LOWiSPIKE en ChatGPT', note: 'Un vistazo dentro. La cámara sigue apagada.' },
            areas: { you: 'Yo', home: 'Tu día', food: 'Scan', play: 'Volar', companion: 'Mi tarjeta', together: 'Comunidad', settings: 'Ajustes', extras: 'Bueno saber', new: 'Nuevo', end: 'Listo' } }
    };

    /* pure helpers (tests + tutorial.js) */
    const L = l => (l === 'de' || l === 'es') ? l : 'en';
    const fill = (s, v) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? String(v[k]) : m));
    function text(step, field, lang, vars) { const o = step && step[field]; if (!o) return ''; return fill(o[L(lang)] || o.en, vars); }
    /* the steps this person gets: condition names are resolved by ctx (e.g. { claimReady: true }) */
    /* the base tour: never the What's New part (Oct 25 2026: new features go into What's New, never into the base tour) and never
       more than MAX_BASE cards (tests/tutorial-short.test.cjs) */
    const MAX_BASE = 12;
    function base() { return STEPS.filter(s => s.area !== 'new'); }
    function plan(ctx) { const c = ctx || {}; return base().filter(s => !s.when || !!c[s.when]); }
    /* Skip: jump past the rest of this step's area */
    function skipIndex(list, i) { const a = list[i] && list[i].area; let j = i + 1; while (j < list.length && list[j].area === a) j++; return j; }
    function covered() { const m = {}; STEPS.forEach(s => (s.covers || []).forEach(f => { m[f] = s.id; })); Object.keys(NO_TUTORIAL).forEach(f => { if (!m[f]) m[f] = 'none'; }); return m; }
    /* a news.json / version.json news entry's tutorial field: a step id that exists, or {none: 'reason'} */
    function newsOk(tut) {
        if (typeof tut === 'string') return STEPS.some(s => s.id === tut);
        return !!(tut && typeof tut === 'object' && typeof tut.none === 'string' && tut.none.trim().length >= 8);
    }


    /* What's New as a mini tour (Oct 23 2026). news.json / version.json news "tour": [step ids] (falls back to [tutorial] when that
       is a step id). Returns the existing ids, in order, without repeats; the player puts new-intro first. */
    function tourOf(news) {
        const n = news || {}, raw = Array.isArray(n.tour) ? n.tour : (typeof n.tutorial === 'string' ? [n.tutorial] : []);
        const out = []; raw.forEach(id => { if (typeof id === 'string' && id !== 'new-intro' && STEPS.some(s => s.id === id && !s.when) && out.indexOf(id) < 0) out.push(id); });
        return out;
    }
    /* ONE What's New per launch (Oct 23 2026, Emmanuel: "keeps reappearing in a loop"): the news entry plus its history (bump-build
       keeps the last releases' {id, tour}), minus the ids this phone has seen, folded into one entry: every unseen id (all of them get
       marked seen together) and the union of their tours, newest release first. seen(id) -> true when already seen. null = nothing new. */
    function unseenNews(news, seen) {
        const n = news || {}, is = typeof seen === 'function' ? seen : () => false;
        if (!n.id) return null;
        const hist = (Array.isArray(n.history) ? n.history : []).filter(h => h && h.id);
        const all = [{ id: n.id, tour: tourOf(n) }].concat(hist.filter(h => h.id !== n.id).map(h => ({ id: h.id, tour: tourOf({ tour: h.tour }) })));
        const open = all.filter(h => !is(h.id));
        if (!open.length) return null;
        const tour = []; open.forEach(h => h.tour.forEach(id => { if (tour.indexOf(id) < 0) tour.push(id); }));
        return Object.assign({}, n, { ids: open.map(h => h.id), tour, history: undefined });
    }
    /* a release with no step of its own (a fix): one card in the same style with the start of its own news text */
    function newsCard(news) {
        const n = news || {}, t = {}, title = {}, cta = {};
        ['en', 'de', 'es'].forEach(l => {
            let s = String(((n.text || {})[l] || (n.text || {}).en || '')).split(/\n\s*\n/)[0].trim();
            /* sentences end at . ! ? followed by a space (Oct 24 2026: "How are you today?, plus ..." used to lose its first sentence,
               so the card started with ", plus") */
            const parts = s.replace(/([.!?\u2026])\s+/g, '$1\n').split('\n').filter(Boolean); let o = '';
            for (const p of parts) { if ((o + ' ' + p).trim().length > 200 && o) break; o = (o ? o + ' ' : '') + p; }
            o = o.trim(); if (o.length > 220) o = o.slice(0, 217).replace(/\s+\S*$/, '') + '…';
            t[l] = o; title[l] = UI[l].newsTitle; cta[l] = UI[l].newsDone;
        });
        return { id: 'news-card', area: 'new', target: null, covers: [], title, text: t, cta };
    }

    /* item 38: what a card asks of the user. try = the real control (tryIt), practice = a practice pad on the card,
       later = done after the tour (worded so), info = no gesture asked for now */
    const PRACTICE_HOW = ['tap', 'hold', 'touch', 'double', 'drag', 'swipe', 'pinch'];
    const LATER_MARK = { en: /\bafter the tour\b/i, de: /\bnach der Tour\b/i, es: /después del recorrido/i };
    /* words that ask for a gesture (EN text); a card matching this must be try, practice or later, or carry an info reason */
    const INSTRUCTION = /\b(tap|taps|hold|swipe|drag|pinch|slide|press|push|pushing|pull|steer|spread|touch|scan|snap|post|fly me|type|decorate)\b/i;
    function kind(s) { return s.tryIt ? 'try' : s.practice ? 'practice' : s.later ? 'later' : 'info'; }

    /* GESTURES id -> the step id that teaches it */
    function taught() { const m = {}; STEPS.forEach(s => (s.teaches || []).forEach(g => { if (!m[g]) m[g] = s.id; })); return m; }

    const api = { VERSION, AREAS, STEPS, MAX_BASE, base, SHORT_SKIPS, NO_TUTORIAL, GESTURES, GESTURE_EXEMPT, UI, text, fill, plan, skipIndex, covered, newsOk, tourOf, newsCard, unseenNews, tryMatch, taught, TRY_CUE, tryResume, kind, PRACTICE_HOW, LATER_MARK, INSTRUCTION };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiTutorialSteps = api;
})(typeof window !== 'undefined' ? window : null);
