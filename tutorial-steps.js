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
    const VERSION = 44;  /* 44: Nov 5 2026, every card's words rewritten as whole spoken sentences in EN/DE/ES (owner: the voice read fragments and
       sounded broken, as if words were missing), voice re-recorded; plus the Mirror mode card from the Move lane */
    /* 43: Nov 5 2026, new-people points at Ranking (Members, the round button there, opens People; the Community heading is gone, the round profile button at the end of the tabs opens Settings); 42: Nov 5 2026, new-look-weather in part 'new' (App theme lives inside Look, time of day & weather; Dark for everyone) and the settings card names the look row; 41: Nov 5 2026, new-cart-total in part 'new' (Cart: real quantities and the whole total, I'll buy it / Someone else pays, Give a hand asks for the cart total, never €5; Plan my week says plainly when the budget is too small); 40: Nov 5 2026, new-my-day in part 'new' (My day: a Today card and short lists; a photo with no food offers Retake photo); 39: Nov 5 2026, new-still-galaxy in part 'new' (Settings > Still galaxy); 38: Nov 5 2026, the complete new tutorial (Emmanuel: "a complete new one that is up to date with our version"): Scan with photo, barcode, Log as eaten and Add to cart; Water / Move / Sleep in one card; Shopping with its three doors and Supermarkt with Plan my week; Settings from the Community name (the hold on the bubble does nothing since Oct 29); flying out into the galaxy on the last card. Old step ids water / move / sleep land on day (MOVED). 37: Oct 28 2026, 22:54, Gap blooms Letzte / Erste Mahlzeit (the old Essenspause window is not what a tap opens); 36: Oct 28 2026, new-humans now says the chat is people only too (bot posts live in For You); 35: Oct 27 2026, new-day-recap in part 'new' (Day recap from the companion card and My day: the day read back, care sent, one journal line; shows after the evening catch-up Save); 34: Oct 26 2026, new-evening-catchup in part 'new' (Catch up on today: the evening bubble checklist, first row in Settings); 33: Oct 26 2026, new-quick-tour in part 'new' (the 45-second video tour, Settings row after Tutorial); 32: Oct 26 2026, new-cart-ask in part 'new' (Someone else pays: the whole Cart as a Give a hand basket); 31: Oct 26 2026, new-mic-dictation in part 'new' (a small mic in text fields: speak instead of typing; Home Screen app on iPhone uses the keyboard's mic); 30: Oct 26 2026, new-cook-tabs (Cook opens on Kitchen, the first tab; hold a Cook tab to move it) and new-kitchen no longer says next to Swipe; 29: Oct 26 2026, new-scan-why in part 'new' (the scanner card's curve, How often and Why?); 28: Oct 26 2026, new-kitchen rewritten (Kitchen is a game in Cook next to Shuffle and Swipe) and new-give-hand opens Shop on Seller Zone (Kitchen left Shop); 27: Oct 25 2026, new-give-hand in part 'new' (Give a hand is its own Shop tab next to Kitchen); 26: Oct 25 2026, the short base tour (11 cards, auto demo, What's New never in the base tour); 25: Oct 24 2026, new-meal-curve in part 'new' (Gap: After your meal, five phases and how to lower the spike); 24: Oct 24 2026, Circles removed (new-rooms step gone, cm-name says People; Emmanuel: "nuke Circle ... we just have one chat"); 23: Oct 24 2026, Water card names Size (the bottle size picker), cup is a glass in English; 22: Oct 24 2026, new-kitchen in part 'new' (Shop > Kitchen: at home + shopping cart); 21: Oct 24 2026, new-voice-speed in part 'new' (the 1× / 1.5× / 2× speed pill next to Pause); 20: Oct 24 2026, Hold Scan card (every bubble at once) replaces the Two fingers card, plus new-scan-hold in part 'new'; 19: Oct 23 2026, part 'new' (the newest features, the What's New mini tour plays these); 18: Oct 23 2026, Gap reads h:mm and Log meal is Meal or Snack with a Today list; 17: Oct 23 2026, Water by sips / cup / bottle, hold = take the last one back; 16: Oct 23 2026, the pinch-into-the-galaxy card is gone (no pinch shortcut between Home and Community); 15: Oct 23 2026, Inside Scan says you can type a food name; 14: Oct 22 2026, Mirror mode card right after the basic gestures */
    const AREAS = ['you', 'home', 'food', 'shop', 'play', 'companion', 'together', 'settings', 'extras', 'new', 'end'];
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
            title: { en: 'Make me yours', de: 'Mach mich zu deinem Begleiter', es: 'Hazme tuyo' },
            text: {
                en: 'Tell me your birthday, and I become your very own companion.',
                de: 'Sag mir deinen Geburtstag, dann werde ich dein ganz eigener Begleiter.',
                es: 'Dime tu cumpleaños y me convierto en tu propio compañero.'
            },
            cta: { en: 'Let’s do it', de: 'Los geht’s', es: '¡Vamos!' }
        },
        {
            /* Nov 5 2026 (new tutorial, Emmanuel: "a complete new one that is up to date with our version"): the base tour follows a
               day: who Misty is, scanning food, meal times, the small daily bubbles, shopping, Community, Settings, then flying. */
            id: 'hello', area: 'you', target: ['[data-home-misty]', '#spBubble'], demo: { g: 'hold', open: 'misty-card' },
            covers: ['companion', 'misty', 'companion-card', 'energy', 'mood', 'energy-peak', 'welcome-energy', 'forms', 'evolution', 'care-room', 'cell-room', 'rename', 'aura'],
            teaches: ['misty-hold'],
            title: { en: 'Hi, I’m {name}', de: 'Hi, ich bin {name}', es: 'Hola, soy {name}' },
            text: {
                en: 'I’m your companion. Hold me, and my card opens. It shows my energy, my level and what I still need.',
                de: 'Ich bin dein Begleiter. Halt mich gedrückt, dann öffnet sich meine Karte. Dort siehst du meine Energie, mein Level und was mir noch fehlt.',
                es: 'Soy tu compañero. Mantenme pulsado y se abre mi tarjeta. Ahí ves mi energía, mi nivel y lo que todavía me falta.'
            }
        },
        {
            /* Scan in the tour NEVER calls the camera (no iOS permission prompt): 'scan-demo' is a mocked Scan screen with a sample
               photo; the finger presses its shutter and a verdict marked Demo appears. The camera is asked at the first REAL scan.
               Nov 5 2026: food photo AND packaged product (barcode) in one card, and what comes after the verdict: the verdict card
               has "Log as eaten" and "Add to cart" (shop-scan.js T.ate / T.add). */
            id: 'scan', area: 'food', target: ['#whHud .o8-scan'], demo: { g: 'tap', open: 'scan-demo' }, sayTitle: { es: false },
            covers: ['scan', 'barcode', 'deep-analyze', 'fix-food', 'snap-food', 'photo-checks', 'log-meal'], teaches: ['scan-tap', 'scan-buttons'],
            title: { en: 'Scan', de: 'Scannen', es: 'Escanear' },
            text: {
                en: 'Tap Scan and point the camera at your meal or at a product. I show you how big the spike is. Then you log it as eaten or put it in your cart.',
                de: 'Tipp auf Scannen und richte die Kamera auf dein Essen oder auf ein Produkt. Ich zeige dir, wie groß der Spike ist. Dann trägst du es als gegessen ein oder legst es in den Korb.',
                es: 'Toca Escanear y apunta la cámara a tu comida o a un producto. Te digo cuánto te sube el azúcar. Luego lo anotas como comido o lo pones en el carrito.'
            }
        },
        {
            /* Oct 28 2026, 22:54 (Emmanuel: "They're supposed to be bubbles ... nuke that window"): a tap blooms Letzte / Erste Mahlzeit */
            id: 'gap', area: 'home', target: ['#spFast'], demo: { g: 'tap', open: 'gap-bloom' }, covers: ['home-ring', 'gap', 'fasting'], teaches: ['gap-tap'],
            title: { en: 'Gap', de: 'Gap', es: 'Gap' },
            text: {
                en: 'Tap Gap, and then tap Last meal to start the timer. Tap First meal to stop it.',
                de: 'Tipp auf Gap und dann auf Letzte Mahlzeit, um die Uhr zu starten. Mit Erste Mahlzeit stoppst du sie.',
                es: 'Toca Gap y luego Última comida para poner el reloj en marcha. Con Primera comida lo paras.'
            }
        },
        {
            /* Nov 5 2026 (new tutorial): Water, Move and Sleep are one card. All three are a tap and a pick (home-blooms-v2.js,
               home-settings-sleep-v2.js); the finger shows it on Water. The old ids water / move / sleep land here (MOVED). */
            id: 'day', area: 'home', target: ['#whHud .wh-water'], demo: { g: 'tap', open: 'water-bloom' },
            covers: ['water', 'hydration', 'move', 'move-page', 'workouts-page', 'sleep'], teaches: ['water-tap', 'move-tap', 'sleep-tap'],
            title: { en: 'Water, Move and Sleep', de: 'Wasser, Bewegung und Schlaf', es: 'Agua, Movimiento y Sueño' },
            text: {
                en: 'Tap Water to log 10 sips, a glass or a bottle. Tap Move to pick Casual, Steady or Epic. Tap Sleep to log your night.',
                de: 'Tipp auf Wasser, um 10 Sips, ein Glas oder eine Flasche einzutragen. Tipp auf Bewegung und wähl Locker, Stetig oder Episch. Tipp auf Schlaf, um deine Nacht einzutragen.',
                es: 'Toca Agua para anotar 10 sorbos, un vaso o una botella. Toca Movimiento para elegir Tranquilo, Constante o Épico. Toca Sueño para anotar tu noche.'
            }
        },
        {
            /* Nov 5 2026 (owner: the tour never said that holding Move opens Mirror mode, the camera workout, "the most impressive part").
               The real way in, checked in the code: hold Move on Home (home-blooms-v2.js hold -> LowiMoveBubble.page) = the Move page,
               Mirror mode is its first card (mirror-move.js hero), workouts below it. The finger holds the real Move bubble, then the
               tour opens the real Move page read-only and goes back Home. */
            id: 'mirror', area: 'home', target: ['#whHud .wh-move'], demo: { g: 'hold', open: 'move-page' },
            covers: ['mirror-mode'], teaches: ['move-hold'],
            title: { en: 'Mirror mode', de: 'Spiegel-Modus', es: 'Modo espejo' },
            text: {
                en: 'Hold Move to open your Move page. Mirror mode is the first card there. You move along with the camera, and your workouts are below it.',
                de: 'Halt Bewegung gedrückt, dann öffnet sich deine Bewegungsseite. Ganz oben ist der Spiegel-Modus. Dort bewegst du dich mit der Kamera mit, und darunter findest du deine Workouts.',
                es: 'Mantén pulsado Movimiento y se abre tu página de movimiento. Arriba está el modo espejo, donde te mueves con la cámara. Debajo tienes tus entrenamientos.'
            }
        },
        {
            /* Oct 28 2026 food plan: this bubble is Einkaufen. Nov 5 2026 (Phase B item 3): a tap blooms three doors with their purpose
               lines (store-picks.js doors()): Supermarkt (Einkauf & Wochenplan), Seller Zone (Fertige Snacks), Hilf mit (Mitbezahlen). */
            id: 'fuel', area: 'shop', target: ['#whHud .wh-meals'], demo: { g: 'tap', open: 'fuel-bloom' }, covers: ['fuel', 'shop', 'seller-zone', 'give-hand'], teaches: ['fuel-tap'],
            title: { en: 'Shopping', de: 'Einkaufen', es: 'Compras' },
            text: {
                en: 'Tap Shopping to find three places. In the Supermarket, you shop and plan. Seller Zone has ready snacks. And with Help out, you can pay for someone’s food.',
                de: 'Tipp auf Einkaufen, dort gibt es drei Bereiche. Im Supermarkt kaufst du ein und planst. In der Seller Zone gibt es fertige Snacks. Und bei Hilf mit kannst du jemandem das Essen mitbezahlen.',
                es: 'Toca Compras y verás tres zonas. En Súper compras y planeas. En Seller Zone hay snacks listos. Y en Ayudar puedes pagar la comida de otra persona.'
            }
        },
        {
            /* Nov 5 2026 (new tutorial): inside Supermarkt. + on a product row puts it in the Cart (quick-add-core.js); Meine Woche
               planen (Phase B: the old Zu Hause tab) plans dinners, a budget and a shopping list. Opens Shop read-only on that tab. */
            id: 'shop-week', area: 'shop', target: ['#whHud .wh-meals'], demo: { g: 'tap', open: 'supermarket' }, covers: ['quick-add', 'week-shop', 'cart'], teaches: ['fuel-tap'],
            title: { en: 'Supermarket', de: 'Supermarkt', es: 'Supermercado' },
            text: {
                en: 'In the Supermarket, tap the plus sign to put a product in your cart. Plan my week makes your dinners, a budget and a shopping list.',
                de: 'Im Supermarkt tippst du auf das Plus, dann kommt ein Produkt in den Warenkorb. Meine Woche planen macht dir Abendessen, ein Budget und eine Einkaufsliste.',
                es: 'En el súper, toca el signo más para poner un producto en el carrito. Planear mi semana te prepara cenas, un presupuesto y una lista de la compra.'
            }
        },
        {
            id: 'community', area: 'together', target: ['#whHud .o8-settings'], demo: { g: 'tap', open: 'community-tab' },
            covers: ['community', 'community-tabs', 'person-card', 'community-post', 'community-chat', 'voice-message', 'photo-message', 'community-tab-order', 'community-energy'],
            teaches: ['community-tap', 'cm-tabs'],
            title: { en: 'Community', de: 'Community', es: 'Comunidad' },
            text: {
                en: 'Tap Community to play and chat with everyone else and their companions. You also find For You and the Ranking there.',
                de: 'Tipp auf Community, um mit allen anderen und ihren Begleitern zu spielen und zu chatten. Dort findest du auch Für dich und die Rangliste.',
                es: 'Toca Comunidad para jugar y chatear con todos los demás y sus compañeros. Ahí también están Para ti y el Ranking.'
            }
        },
        {
            /* Nov 5 2026 (new tutorial): the hold on the Community bubble opens the one Settings page again (home-settings-sleep-v2.js
               holdIntent, owner Nov 5: "Add a long-press gesture on the Community section that opens Settings"); the same page also
               opens from the round profile button at the end of Community's tabs (community-rooms-ui.js .rm-pf / .rm-menu-btn). The finger holds the bubble.
               Settings rows (community-me.js): Look, time of day & weather (Day / Dark / Night / Auto inside it since Nov 5 2026; the
               separate App theme row is gone), Still galaxy, language, Body sound (Körperklang), VR, Tutorial. */
            id: 'settings', area: 'settings', target: ['#whHud .o8-settings'], demo: { g: 'hold', open: 'settings-sheet' },
            covers: ['settings', 'cook', 'theme', 'language', 'day-night', 'me', 'look', 'account', 'deleteAccount', 'body', 'weight', 'bmi', 'care', 'workouts', 'foryou', 'hunt', 'tutorial', 'quickTour', 'back-x', 'home-visit', 'day-card', 'whats-new', 'update', 'true-black', 'koerperklang', 'vr'],
            teaches: ['community-hold', 'cm-name'],
            title: { en: 'Settings', de: 'Einstellungen', es: 'Ajustes' },
            text: {
                en: 'Hold Community, or tap its name inside Community. In Settings, you change the look and weather, your aura, the language, Body sound and VR. You can also send feedback there.',
                de: 'Halt Community gedrückt oder tipp drinnen auf ihren Namen. In den Einstellungen änderst du Design und Wetter, Aura, Sprache, Körperklang und VR. Dort kannst du auch Feedback senden.',
                es: 'Mantén pulsada Comunidad o toca su nombre dentro. En Ajustes cambias el aspecto y el tiempo, tu aura, el idioma, Sonido del cuerpo y RV. Ahí también puedes enviar comentarios.'
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
                en: 'There are a few new things. I’ll show you where they are, and you can skip at any time.',
                de: 'In diesem Update gibt es ein paar neue Sachen. Ich zeige dir, wo sie sind, und du kannst jederzeit überspringen.',
                es: 'Hay algunas novedades. Te enseño dónde están, y puedes saltarlo cuando quieras.'
            },
            cta: { en: 'Let’s go', de: 'Los geht’s', es: 'Vamos' }
        },
        /* Nov 5 2026 (owner: "just have the app theme be inside of the time of day and weather ... like Apple would" and "make dark
           mode the universal mode for everyone"): one Settings row 'sky' opens Look / Time of day / World; true black Dark for all. */
        {
            id: 'new-look-weather', area: 'new', target: ['.cme-ov [data-cme="sky"]'], open: 'settings-sheet', covers: ['sky', 'theme', 'true-black'],
            title: { en: 'Look, time of day and weather', de: 'Design, Tageszeit und Wetter', es: 'Aspecto, hora y tiempo' },
            text: {
                en: 'Dark is now the look for everyone. You also find Day, Night and Auto here, together with the time of day and the weather.',
                de: 'Dunkel ist jetzt das Design für alle. Hier findest du auch Tag, Nacht und Auto, zusammen mit der Tageszeit und dem Wetter.',
                es: 'Oscuro es ahora el aspecto para todos. Aquí también tienes Día, Noche y Auto, junto con la hora del día y el tiempo.'
            }
        },
        /* Nov 5 2026: Calm mode (galaxy-still.js, Settings row 'galaxyStill', was Still galaxy) */
        {
            id: 'new-still-galaxy', area: 'new', target: null, open: 'settings-sheet', covers: ['galaxyStill'],
            title: { en: 'Calm mode', de: 'Ruhemodus', es: 'Modo calma' },
            text: {
                en: 'Calm mode is new in Settings, right under the look. Step by step, the world stays put, the background goes still or away, and in the end nothing moves. Your taps always keep working.',
                de: 'Der Ruhemodus ist neu in den Einstellungen, direkt unter dem Design. Stufe für Stufe bleibt die Welt stehen, der Hintergrund ruht oder verschwindet, und am Ende steht alles still. Tippen geht immer.',
                es: 'El Modo calma es nuevo en Ajustes, justo debajo del aspecto. Paso a paso, el mundo se queda fijo, el fondo se calma o desaparece, y al final nada se mueve. Tocar sigue funcionando siempre.'
            }
        },
        {
            /* Nov 5 2026 (Emmanuel: "nuke the bloat" in My day; a toothpaste photo offered Log as meal): misty-hub.js dayHtml, food-photo-ai.js sayNone */
            id: 'new-my-day', area: 'new', target: null, open: 'settings-sheet', covers: ['myday', 'photo-nofood'],
            title: { en: 'A simpler My day', de: 'Mein Tag ist einfacher', es: 'Mi día es más simple' },
            text: {
                en: 'My day is now one calm page. It starts with a Today card, followed by short lists. If a photo isn’t food, you simply get the option to retake it.',
                de: 'Mein Tag ist jetzt eine ruhige Seite. Oben steht eine Heute-Karte, darunter kommen kurze Listen. Ist auf einem Foto kein Essen, machst du einfach ein neues Foto.',
                es: 'Mi día es ahora una página tranquila. Arriba hay una tarjeta Hoy y debajo, listas cortas. Si una foto no es comida, solo te ofrece repetirla.'
            }
        },
        {
            /* Nov 5 2026 (owner walkthrough: the €5 ask, 1 instead of 3 cucumbers, halloumi left out, €83.77 plan on a €40 budget):
               store-picks.js cartHTML, gift-basket.js fromCart, week-basket.js budget fit */
            id: 'new-cart-total', area: 'new', where: 'home', open: 'shop', target: ['.stp-card .stp-cartbtn', '.stp-card'], covers: ['supermarket-cart', 'give-hand', 'week-budget'],
            title: { en: 'The whole cart with the real total', de: 'Der ganze Warenkorb mit der echten Summe', es: 'Todo el carrito con el total real' },
            text: {
                en: 'The Cart now keeps every food with its real amount. When you tap Someone else pays, it asks for the cart’s total, and never for five euros.',
                de: 'Der Warenkorb behält jetzt jedes Essen mit der echten Menge. Wenn du auf Jemand anderes zahlt tippst, geht es um die ganze Summe und nie mehr um fünf Euro.',
                es: 'El carrito ahora guarda cada alimento con su cantidad real. Si tocas Que pague otra persona, pide el total del carrito y nunca cinco euros.'
            }
        },
        {
            id: 'new-meal-curve', area: 'new', where: 'home', target: ['#spFast'], covers: ['gap'],
            info: 'points at the Gap bubble on Home; the After your meal strip is at the top of the Gap card once it is open',
            title: { en: 'After your meal', de: 'Nach dem Essen', es: 'Después de comer' },
            text: {
                en: 'Gap has something new. It shows what your blood sugar typically does after a meal, phase by phase, and easy ways to lower the spike.',
                de: 'In Gap gibt es etwas Neues. Du siehst, was dein Blutzucker nach dem Essen typischerweise macht, Phase für Phase, und einfache Wege, den Spike zu senken.',
                es: 'Hay algo nuevo en Gap. Ves lo que suele hacer tu azúcar después de comer, fase a fase, y formas fáciles de bajar el pico.'
            }
        },
        {
            id: 'new-meal-speaker', area: 'new', where: 'home', target: ['#spFast'], covers: ['gap'],
            info: 'points at the Gap bubble on Home; each After your meal phase card inside Gap has a round speaker next to its title (Oct 24 2026)',
            title: { en: 'Listen instead of reading', de: 'Hören statt lesen', es: 'Escuchar en vez de leer' },
            text: {
                en: 'In Gap, tap the speaker on an After your meal card, and the tutorial voice reads it to you. Tap it again to stop.',
                de: 'Du kannst Karten jetzt hören statt lesen. Tipp in Gap bei einer Nach-dem-Essen-Karte auf den Lautsprecher, dann wird sie vorgelesen. Tipp noch mal, um zu stoppen.',
                es: 'En Gap, toca el altavoz de una tarjeta de Después de comer y la voz del tutorial te la lee. Toca otra vez para parar.'
            }
        },
        {
            id: 'new-cart-swipe', area: 'new', where: 'home', open: 'shop', target: ['.stp-card .stp-cartbtn', '.stp-card'], covers: ['supermarket-cart', 'give-hand-swipe'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.22): the Supermarket tab in Shop has a Cart (Warenkorb / Carrito; cart-core.js, store-picks.js cartHTML) with quantities and an estimate from reported prices; the Seller Zone strip left the Supermarket (Seller Zone keeps its own tab); Give a hand is a swipe deck (gift-basket.js deckHTML): right = pay for these groceries, left = skip.',
            title: { en: 'Your cart', de: 'Dein Warenkorb', es: 'Tu carrito' },
            text: {
                en: 'The Supermarket has a Cart with amounts and a total. In Give a hand, swipe a basket right to open its pay link, or left to skip it.',
                de: 'Im Supermarkt gibt es einen Warenkorb mit Mengen und Summe. Bei Hilf mit wischst du einen Korb nach rechts, um den Zahlungslink zu öffnen, oder nach links, um ihn zu überspringen.',
                es: 'En el súper tienes un carrito con cantidades y total. En Echa una mano, desliza una cesta a la derecha para abrir su enlace de pago, o a la izquierda para saltarla.'
            }
        },
        {
            id: 'new-quick-add', area: 'new', where: 'home', open: 'supermarket', target: ['.stp-card .stp-qa', '.stp-card'], covers: ['quick-add'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.35, quick-add-core.js): a quick + on every Supermarket product row. + puts it in the Cart and turns into - 1 +, the house puts it straight into the Kitchen, nothing opens',
            title: { en: 'Add while you scroll', de: 'Beim Scrollen hinzufügen', es: 'Añade mientras bajas' },
            text: {
                en: 'While you scroll through the Supermarket, tap the plus sign on any product, and it goes into your Cart. If you already have it at home, tap the house.',
                de: 'Beim Scrollen durch den Supermarkt tippst du bei einem Produkt auf das Plus, dann landet es im Warenkorb. Hast du es schon zu Hause, tipp auf das Haus.',
                es: 'Mientras bajas por el súper, toca el signo más en cualquier producto y va a tu carrito. Si ya lo tienes en casa, toca la casita.'
            }
        },
        {
            id: 'new-week-shop', area: 'new', where: 'home', open: 'supermarket', target: ['.stp-card .stp-plan', '.stp-card'], covers: ['week-shop'],
            info: 'Nov 5 2026 (Phase B item 3): the Zu Hause tab is Supermarkt > Plan my week now; the spotlight points at that row. Oct 27 2026: Shop from home is its own Shop tab now (Zu Hause / From home / Desde casa), right next to Supermarket; the spotlight points at that tab (Emmanuel: "Vielleicht möchte Von zu Hause einkaufen seine eigene Sektion haben"). Oct 26 2026: Shop from home at the top of Supermarket (week-basket.js, MAYA-HANDOFF 0.21). Household, budget and dinners in, a week of low-spike dinners and one grocery list out, priced with the existing store estimates; it fills the Cart (0.22).',
            title: { en: 'Plan my week', de: 'Meine Woche planen', es: 'Planear mi semana' },
            text: {
                en: 'In the Supermarket, tap Plan my week. Pick the people, your budget and the dinners. You get a low-spike week with estimated prices, and then you fill your Cart.',
                de: 'Tipp im Supermarkt auf Meine Woche planen. Wähl Personen, Budget und Abendessen. Du bekommst eine Low-Spike-Woche mit geschätzten Preisen und legst alles in den Warenkorb.',
                es: 'En el súper, toca Planear mi semana. Elige personas, presupuesto y cenas. Recibes una semana low-spike con precios estimados y lo pasas todo al carrito.'
            }
        },
        {
            id: 'new-one-scanner', area: 'new', where: 'home', target: ['#whHud .o8-scan'], covers: ['scan'],
            title: { en: 'One scanner everywhere', de: 'Ein Scanner überall', es: 'Un solo escáner en todas partes' },
            text: {
                en: 'Every scan now shows the same short card. It gives you one verdict, a better pick when that helps, and everything else under Details.',
                de: 'Jeder Scan zeigt jetzt dieselbe kurze Karte. Du bekommst ein Urteil, eine bessere Wahl, wenn sie hilft, und alles andere unter Details.',
                es: 'Cada escaneo muestra ahora la misma tarjeta corta. Te da un veredicto, una opción mejor cuando ayuda, y todo lo demás en Detalles.'
            }
        },
        {
            id: 'new-shop-finds', area: 'new', where: 'home', open: 'shop', target: ['.gh-entry', '.stp-card'], covers: ['scan'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.32, grocery-hunt.js): Shop finds made simple. One plain line, Power combos first, Caught today with the scanner card words, the shop picked once (reuses Supermarket), and one short line on the scanner card only when a scan earned something',
            title: { en: 'Simpler shop finds', de: 'Einfachere Ladenfunde', es: 'Hallazgos más simples' },
            text: {
                en: 'Shop finds is simpler now. Scan food while you shop to earn XP for your companion. Power combos are right at the top.',
                de: 'Ladenfunde ist jetzt einfacher. Scanne Essen beim Einkaufen und sammle XP für deinen Begleiter. Die Power-Kombis stehen ganz oben.',
                es: 'Hallazgos es ahora más simple. Escanea comida mientras compras y gana XP para tu compañero. Los combos de poder están arriba del todo.'
            }
        },
        {
            id: 'new-scan-why', area: 'new', where: 'home', target: ['#whHud .o8-scan'], covers: ['scan'],
            info: 'Oct 26 2026 scan-why: the scanner card shows a tiny estimated blood sugar curve, How often in numbers and a Why? button (shop-scan.js verdictHTML)',
            title: { en: 'How often, and why', de: 'Wie oft und warum', es: 'Cada cuánto y por qué' },
            text: {
                en: 'When you scan a food, a small curve shows the estimated rise. How often tells you how often it fits, and the Why button explains it in plain words.',
                de: 'Wenn du ein Essen scannst, zeigt eine kleine Kurve den geschätzten Anstieg. Unter Wie oft siehst du, wie oft es passt, und der Button Warum erklärt es in einfachen Worten.',
                es: 'Cuando escaneas un alimento, una curva pequeña muestra la subida estimada. En Cada cuánto ves cuántas veces encaja, y el botón Por qué te lo explica con palabras sencillas.'
            }
        },
        {
            id: 'new-mic-dictation', area: 'new', where: 'home', target: ['#whHud .o8-scan'], covers: ['mic-dictation'],
            info: 'Oct 26 2026 mic-dictate.js: a small glass mic inside the right edge of free-text fields (food names, searches, Kitchen add, snacks, captions, chat). It uses only the phone\u2019s own free speech recognition; in the Home Screen app on iPhone it opens the keyboard and points at the keyboard\u2019s dictation mic',
            title: { en: 'Speak instead of typing', de: 'Sprechen statt tippen', es: 'Habla en vez de escribir' },
            text: {
                en: 'Do you see the small mic in a text field? Tap it and just say your food, and I write it down. In the Home Screen app, tap the mic on your keyboard instead.',
                de: 'Siehst du das kleine Mikro im Textfeld? Tipp drauf und sag einfach dein Essen, dann schreibe ich es auf. In der App auf dem Home-Bildschirm tippst du stattdessen auf das Mikro der Tastatur.',
                es: '¿Ves el pequeño micro en el campo de texto? Tócalo y di tu comida, y yo la escribo. En la app de la pantalla de inicio, toca mejor el micro del teclado.'
            }
        },
        {
            id: 'new-cart-ask', area: 'new', where: 'home', open: 'shop', target: ['.stp-card .stp-cartbtn', '.stp-card'], covers: ['supermarket-cart'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.34): the Supermarket Cart sheet covers the whole Shop card with a blurred page behind it and compact matching buttons; "Someone else pays" turns the whole cart (items + amounts, low-spike foods only) into a Give a hand basket (gift-basket.js fromCart / cartBasketHTML)',
            title: { en: 'Someone else pays', de: 'Jemand anderes zahlt', es: 'Que pague otra persona' },
            text: {
                en: 'In your Cart, tap Someone else pays, and the whole cart becomes a Give a hand basket. It asks for the cart’s total. Add your pay link and share it.',
                de: 'Tipp im Warenkorb auf Jemand anderes zahlt, dann landet der ganze Warenkorb bei Hilf mit. Er fragt nach der Summe des Warenkorbs. Füg deinen Zahlungslink hinzu und teile ihn.',
                es: 'En tu carrito, toca Que pague otra persona y todo el carrito pasa a ser una cesta de Echa una mano. Pide el total del carrito. Añade tu enlace de pago y compártela.'
            }
        },
        {
            id: 'new-give-hand', area: 'new', where: 'home', open: 'shop', target: ['.stp-card .stp-tab[data-stp-tab="gift"]', '.stp-card'], covers: ['give-a-hand'],
            info: 'Oct 25 2026: the Give a hand tab in Shop (store-picks.js giftDoor); it shows once the server has the basket table, otherwise the card points at Shop. Oct 26: the Kitchen tab left Shop for Cook, so the card opens Shop on Seller Zone and Give a hand sits right beside it',
            title: { en: 'Give a hand', de: 'Hilf mit', es: 'Echa una mano' },
            text: {
                en: 'Give a hand now has its own tab in the shop, right next to Seller Zone. You can pay for someone’s healthy groceries, or share your own basket.',
                de: 'Hilf mit hat jetzt einen eigenen Tab im Shop, direkt neben der Seller Zone. Du kannst jemandem gesunde Lebensmittel bezahlen oder deinen eigenen Korb teilen.',
                es: 'Echa una mano tiene ahora su propia pestaña en la tienda, junto a Seller Zone. Puedes pagar la compra sana de alguien o compartir tu propia cesta.'
            }
        },
        {
            id: 'new-voice-speed', area: 'new', target: null, covers: ['tutorial-voice-speed'],
            info: 'the speed pill is on this very card, right after Pause while the voice is on, so the card itself is where you tap it',
            title: { en: 'Voice speed', de: 'Sprechtempo', es: 'Velocidad de voz' },
            text: {
                en: 'Tap my picture, and I read aloud. Tap the speed next to Pause, and I talk one and a half or two times as fast, like a voice note. I remember your choice.',
                de: 'Tipp auf mein Bild, dann lese ich vor. Tipp auf das Tempo neben Pause, dann spreche ich anderthalbmal oder doppelt so schnell, wie bei einer Sprachnachricht. Ich merke mir deine Wahl.',
                es: 'Toca mi imagen y leo en voz alta. Toca la velocidad junto a Pausa y hablo una vez y media o el doble de rápido, como una nota de voz. Recuerdo tu elección.'
            }
        },
        {
            id: 'new-move-finish', area: 'new', where: 'move', open: 'move', target: ['.mm-hero', '.mm-hero-dl'], covers: ['move-finish'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.37, move-finish-core.js / move-finish.js): every finished Move session, Mirror mode and Kreuzheben included, is saved to This week and History, pays the biggest reward in the app (150 + 5 per minute, up to 60 min, 3 a day) and ends with a grand finish.',
            title: { en: 'Finish strong', de: 'Stark ins Ziel', es: 'Termina a lo grande' },
            text: {
                en: 'When you finish any Move session, including Mirror mode and Deadlift, you get the biggest reward in the app and a big celebration.',
                de: 'Wenn du eine Bewegungs-Einheit beendest, auch im Spiegel-Modus oder beim Kreuzheben, bekommst du die größte Belohnung der App und ein großes Fest.',
                es: 'Cuando terminas cualquier sesión de Movimiento, también en modo espejo o con peso muerto, recibes la mayor recompensa de la app y una gran celebración.'
            }
        },
        {
            id: 'new-day-recap', area: 'new', where: 'home', open: 'misty-card', target: ['[data-mh="t-recap"]'], scroll: true, covers: ['day-recap', 'dayRecap'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.40, day-recap.js): Day recap, your companion\'s read-only look back at today (meals with their likely blood sugar spike verdicts, longest gap, Move, water, XP, level up), one takeaway and one nudge for tomorrow, care sent today, an optional journal line (type or speak, saved on the phone); shows once after the evening catch-up Save. On the companion card (Your day bubble, glows from 6 PM) and in My day. Otherwise never opens by itself, no notification.',
            title: { en: 'Looking back on your day', de: 'Dein Tag im Rückblick', es: 'Tu día en resumen' },
            text: {
                en: 'Open My day in Settings and tap Day recap. You see your meals, your longest gap, Move and care, one tip for tomorrow and a line for your journal.',
                de: 'Öffne in den Einstellungen Mein Tag und tipp auf Tagesrückblick. Du siehst deine Mahlzeiten, deine längste Pause, Bewegung und Fürsorge, einen Tipp für morgen und eine Zeile fürs Tagebuch.',
                es: 'Abre Mi día en Ajustes y toca Resumen del día. Ves tus comidas, tu pausa más larga, el movimiento y el cuidado, un consejo para mañana y una línea para tu diario.'
            }
        },
        {
            id: 'new-quick-tour', area: 'new', where: 'home', target: ['#whHud .o8-settings'], covers: ['quickTour', 'quick-tour'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.38, quick-tour.js): the promo video (one VIDEO config, easy to swap) as a Quick tour, on the first onboarding screen and as a Settings row right after Tutorial. Muted first, Tap for sound, Skip any time; lazy-loaded, never cached by the service worker.',
            title: { en: 'Quick tour', de: 'Kurze Tour', es: 'Tour rápido' },
            text: {
                en: 'The quick tour shows the whole app in one short video. You find it on the very first screen when you set up the app. It starts muted, so tap it for sound.',
                de: 'Die kurze Tour zeigt die ganze App in einem kurzen Video. Du findest sie auf dem ersten Bildschirm, wenn du die App einrichtest. Sie startet ohne Ton, also tipp drauf, um sie zu hören.',
                es: 'El tour rápido muestra toda la app en un vídeo corto. Lo encuentras en la primera pantalla cuando configuras la app. Empieza sin sonido, así que tócalo para oírlo.'
            }
        },
        {
            id: 'new-evening-catchup', area: 'new', where: 'home', target: ['#whHud .o8-settings'], covers: ['catchUp', 'evening-catchup'],
            info: 'Oct 26 2026 (MAYA-HANDOFF 0.39, evening-catchup.js): for people who can only open the app at night. A gentle evening greeting and the first Settings row open a calm checklist: one big bubble at a time (Breakfast, Lunch, Dinner, Snacks, Water, Movement), big choices, Something else or Skip, points on every pick, one Save at the end.',
            title: { en: 'Catch up on today', de: 'Heute nachtragen', es: 'Completar hoy' },
            text: {
                en: 'Couldn’t log during the day? Open My day in Settings and tap Catch up on today. You get one big bubble at a time, tap what you had, and then tap Save.',
                de: 'Bist du tagsüber nicht zum Eintragen gekommen? Öffne in den Einstellungen Mein Tag und tipp auf Heute nachtragen. Tipp in jeder großen Blase an, was du hattest, und am Ende auf Speichern.',
                es: '¿No pudiste anotar durante el día? Abre Mi día en Ajustes y toca Completar hoy. Verás una burbuja grande cada vez. Toca lo que tomaste y luego Guardar.'
            }
        },
        {
            id: 'new-deadlift', area: 'new', where: 'move', open: 'move', target: ['.mm-hero-dl'], covers: ['deadlift-mirror'],
            title: { en: 'Deadlift in Mirror mode', de: 'Kreuzheben im Spiegel-Modus', es: 'Peso muerto en modo espejo' },
            text: {
                en: 'For a deadlift in Mirror mode, stand sideways to your phone. The glowing outline shows you the move and counts every clean rep.',
                de: 'Für Kreuzheben im Spiegel-Modus stellst du dich seitlich zum Handy. Der leuchtende Umriss macht dir die Bewegung vor und zählt jede saubere Wiederholung.',
                es: 'Para el peso muerto en modo espejo, ponte de lado al móvil. La silueta brillante te enseña el movimiento y cuenta cada repetición limpia.'
            }
        },
        {
            id: 'new-seller', area: 'new', where: 'home', open: 'shop', target: ['.stp-card .stp-tab[data-stp-tab="sz"]', '.stp-card'], covers: ['seller-zone'],
            title: { en: 'Seller Zone', de: 'Seller Zone', es: 'Seller Zone' },
            text: {
                en: 'In Seller Zone, you can order real snacks, like chips, chocolate and gummies. Every snack is strictly checked and has a photo and a price. Shops near you come first.',
                de: 'In der Seller Zone bestellst du echte Snacks, etwa Chips, Schokolade und Gummibärchen. Jeder Snack ist streng geprüft und hat ein Foto und einen Preis. Shops in deiner Nähe kommen zuerst.',
                es: 'En Seller Zone puedes pedir snacks de verdad, como patatas, chocolate y gominolas. Cada uno está revisado a fondo y tiene foto y precio. Primero salen las tiendas cerca de ti.'
            }
        },
        {
            id: 'new-sleep', area: 'new', where: 'home', target: ['#whHud .o8-sleep'], covers: ['sleep-ring'],
            title: { en: 'Sleep in your ring', de: 'Schlaf in deinem Ring', es: 'El sueño en tu anillo' },
            text: {
                en: 'Sleep now lives in the ring with your other bubbles, in the same lively style.',
                de: 'Schlaf wohnt jetzt mit deinen anderen Blasen im Ring, im selben lebendigen Stil.',
                es: 'El sueño ahora vive en el anillo con tus otras burbujas, con el mismo estilo vivo.'
            }
        },
        {
            id: 'new-people', area: 'new', where: 'community', target: ['.rm-tab[data-rm="rank"]', '.rm-tabs'], covers: ['people-directory'], /* 5 Nov 2026: People opens from Ranking's round Members button (ranking.js) */
            title: { en: 'Everyone in LOWiSPIKE', de: 'Alle bei LOWiSPIKE', es: 'Todos en LOWiSPIKE' },
            text: {
                en: 'In the Ranking, there is a new round button called Members. It opens People, with everyone in the app, even when they are offline, and who is online right now.',
                de: 'In der Rangliste gibt es einen neuen runden Knopf namens Mitglieder. Er öffnet Leute, mit allen in der App, auch wenn sie offline sind, und wer gerade online ist.',
                es: 'En el Ranking hay un botón redondo nuevo llamado Miembros. Abre Personas, con todos en la app, también sin conexión, y quién está en línea ahora.'
            }
        },
        {
            id: 'new-humans', area: 'new', where: 'community', target: null, covers: ['humans-only-ranking'],
            title: { en: 'Only real people', de: 'Nur echte Menschen', es: 'Solo personas reales' },
            text: {
                en: 'The Ranking, Add a friend and the chat show only real people. Bot posts, like Nibblo’s meals, are in For You.',
                de: 'Das Ranking, Freund hinzufügen und der Chat zeigen nur echte Menschen. Bot-Posts, wie Nibblos Mahlzeiten, findest du in Für dich.',
                es: 'El Ranking, Añadir un amigo y el chat muestran solo personas reales. Los posts de bots, como las comidas de Nibblo, están en Para ti.'
            }
        },
        {
            id: 'new-sync', area: 'new', where: 'home', target: null, covers: ['account-sync'],
            title: { en: 'iPhone and iPad in sync', de: 'iPhone und iPad synchron', es: 'iPhone y iPad sincronizados' },
            text: {
                en: 'If you are signed in on your iPhone and your iPad, your companion, your level and your logs stay in sync on both.',
                de: 'Bist du auf iPhone und iPad angemeldet, dann bleiben dein Begleiter, dein Level und deine Einträge auf beiden synchron.',
                es: 'Si inicias sesión en tu iPhone y en tu iPad, tu compañero, tu nivel y tus registros se quedan sincronizados en los dos.'
            }
        },
        {
            /* Oct 28 2026 (slim structure, batch 10): the old 'fly' card is merged in here. The ring points at the joystick, no
               finger demo; she does not really fly during the tour (her real first flight comes after Done, tutorial-flight.js) */
            id: 'done', area: 'end', target: ['#whPad'], demo: { g: 'drag', open: null },
            covers: ['joy', 'joy-hold', 'autopilot', 'zoom', 'fly-out', 'worlds', 'half-energy', 'spirit-world', 'worldSound', 'galaxy'], teaches: ['pad-drag', 'pad-triple', 'edge-push'],
            title: { en: 'You’re all set', de: 'Du bist startklar', es: 'Todo listo' },
            text: {
                en: 'Drag the joystick, and I fly. Tap it three times for autopilot, or fly me past the edge into the galaxy.',
                de: 'Zieh am Joystick, dann fliege ich. Tipp dreimal für den Autopiloten, oder flieg mit mir über den Rand in die Galaxie.',
                es: 'Arrastra el joystick y vuelo. Tócalo tres veces para el piloto automático, o llévame más allá del borde, hasta la galaxia.'
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
        support: 'Pay what you want in Settings opens the existing voluntary support view (X-16, Oct 28); nothing to learn',
        feedback: 'Send feedback in Settings (Nov 5 2026, feedback.js) explains itself on its own sheet (voice note first); the tutorial task may turn this into a step',
        feedbackInbox: 'Feedback inbox (Nov 5 2026) is shown only to the app owner; not part of the user tour'
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
        G('move-hold', 'home', 'hold', ['home-blooms-v2.js', 'move-bubble.js'], 'hold Move: the Move page (Mirror mode first, then workouts)'),
        G('gap-tap', 'home', 'tap', ['home-blooms-v2.js', 'fast-bubble.js'], 'tap Gap: the eating hub (gap, last meal, Log meal, Cook, today\'s meals)'),
        G('sleep-tap', 'home', 'tap', ['home-settings-sleep-v2.js'], 'tap Sleep: how long did you sleep'),
        G('scan-tap', 'home', 'tap', ['home-orbit-v2.js'], 'tap Scan: the Scan screen'),
        /* Oct 24 2026: hold Scan opens every bubble at once (replaces the taught two-finger tap on Misty; bloom-ring.js still answers a
           two-finger tap on Misty as a quiet duplicate of this shortcut, untaught on Emmanuel's word: the tour teaches hold Scan) */
        G('community-hold', 'home', 'hold', ['home-settings-sleep-v2.js'], 'hold Community: Settings (back since Nov 5 2026)'),
        G('community-tap', 'home', 'tap', ['home-settings-sleep-v2.js'], 'tap Community: Community'),
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
        G('cm-tabs', 'community', 'tap', ['community-rooms-ui.js'], 'tap Circle, Chat, For You, Ranking'),
        G('cm-tab-order', 'community', 'hold', ['community-tab-order.js'], 'hold a Community tab until it wiggles, slide it: new tab order'),
        G('cm-name', 'community', 'tap', ['community-rooms-ui.js', 'community-me.js'], 'tap the Community name / your picture: rooms, profile, invite'),
        G('cm-pan', 'community', 'drag', ['community-chat.js'], 'drag the galaxy: move around'),
        G('cm-zoom', 'community', 'pinch', ['community-chat.js'], 'pinch or double-tap the galaxy: zoom'),
        G('cm-hold', 'community', 'hold', ['community-chat.js'], 'hold a companion or a name: their person card'),
        G('cm-room', 'community', 'tap', ['community-rooms-ui.js'], 'tap the room chip: rooms'),
        G('cm-mic', 'community', 'hold', ['community-chat.js'], 'hold the mic: record, let go to send, slide left to cancel'),
        G('cm-photo', 'community', 'tap', ['community-chat.js'], 'tap the camera: send a photo'),
        G('cm-energy', 'community', 'drag', ['community-energy.js', 'room-table.js'], 'drag the small joystick and let go: send energy; on the Billardtisch (Oct 28) pull back on the table and let go: energy blast'),
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
    ['mic-dictate', 'give-hand-swipe', 'ck-tab-order', 'misty-tap', 'misty-squish', 'misty-turn', 'ring-still', 'water-hold', 'theme-tap', 'theme-triple', 'world-drag', 'world-pinch', 'pad-hold', 'pad-back', 'energy-shot', 'clean-tap', 'galaxy-bubble', 'place-tap', 'world-inside', 'region-pal', 'arrival-x', 'tilt', 'sound-strings', 'scan-deep', 'fix-field', 'page-swipe', 'back-swipe', 'sheet-drag', 'cm-tab-order', 'cm-pan', 'cm-zoom', 'cm-hold', 'cm-room', 'cm-mic', 'cm-photo', 'cm-energy', 'aff-card', 'cook-swipe', 'foryou-swipe', 'visit-reply'].forEach(id => { SHORT_SKIPS[id] = SHORT_SKIP_WHY; });
    const GESTURE_EXEMPT = {
        'evo-card.js': 'Nov 5 2026 evolution card viewer: swiping between forms is only a shortcut; the arrow buttons on both sides of the card do it with a plain tap, and tapping a form on the Evolution path opens it',
        'bloom-ring.js': 'Oct 28 2026 slim structure (S-02 deleted): the old hold-Scan helpers stay as code only, nothing wires them; a hold on Scan is a plain tap that opens the one scanner',
        'kitchen-game.js': 'Cook > Kitchen: dragging something that ran out onto the bin is only a shortcut; the Ran out: bin it button on the same card does it with a plain tap, and the shelf says so',
        'mirror-move.js': 'camera workout: it tells you each move out loud while you do it',
        'mirror-move-core.js': 'camera workout: it tells you each move out loud while you do it',
        'community-energy-core.js': 'math for the energy joystick taught by cm-energy',
        'room-table-core.js': 'billiard physics for the Billardtisch shot taught by cm-energy (Oct 28)',
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
            areas: { you: 'Me', home: 'Your day', food: 'Scan', shop: 'Shopping', play: 'Flying', companion: 'My card', together: 'Community', settings: 'Settings', extras: 'Good to know', new: 'New', end: 'Done' } },
        de: { next: 'Weiter', back: 'Zurück', skip: 'Überspringen', skipAll: 'Alles überspringen', of: '{i} von {n}', label: 'Tutorial', newsLabel: 'Neu', newsSkip: 'Überspringen', newsDone: 'Alles klar', newsTitle: 'Neu in diesem Update', guide: 'Dein Begleiter', tryIt: 'Probier’s jetzt', nice: 'Super, genau so.', pause: 'Pause', play: 'Abspielen',
            practice: 'Hier üben. In deiner App ändert sich nichts.', laterTag: 'Nach der Tour', how: { tap: 'Tippen', hold: 'Halten', touch: 'Berühren', double: 'Zweimal tippen', drag: 'Ziehen', swipe: 'Wischen', pinch: 'Zwei Finger' }, looks: { ring: 'Blasen', water: 'Wasser · 3', world: 'Welt', fade: 'Knöpfe', companion: 'Begleiter', mic: 'Mikro', joystick: 'Joystick', galaxy: 'Galaxie', sun: 'Tag', sheet: 'Fenster', edge: 'Seite', cards: 'Karten' }, done: { water: 'Wasser · 0', sun: 'Nacht', fade: 'Wieder da', mic: 'Gesendet', sheet: 'Zu', edge: 'Home', ring: 'Steht' },
            peek: { title: 'Barcode scannen', aim: 'Halte den Barcode in den Rahmen', field: 'Barcode-Nummer', barcode: 'Barcode', deep: 'Deep analyze', deepS: 'Öffnet den LOWiSPIKE GPT in ChatGPT', note: 'Ein Blick hinein. Die Kamera bleibt aus.' },
            areas: { you: 'Ich', home: 'Dein Tag', food: 'Scan', shop: 'Einkaufen', play: 'Fliegen', companion: 'Meine Karte', together: 'Community', settings: 'Einstellungen', extras: 'Gut zu wissen', new: 'Neu', end: 'Fertig' } },
        es: { next: 'Siguiente', back: 'Atrás', skip: 'Saltar', skipAll: 'Saltar todo', of: '{i} de {n}', label: 'Tutorial', newsLabel: 'Nuevo', newsSkip: 'Saltar', newsDone: 'Entendido', newsTitle: 'Novedades de esta versión', guide: 'Tu compañero', tryIt: 'Pruébalo ahora', nice: 'Bien, así es.', pause: 'Pausa', play: 'Reproducir',
            practice: 'Practica aquí. En tu app no cambia nada.', laterTag: 'Después del recorrido', how: { tap: 'Toca', hold: 'Mantén', touch: 'Toca', double: 'Toca dos veces', drag: 'Arrastra', swipe: 'Desliza', pinch: 'Pellizca' }, looks: { ring: 'Burbujas', water: 'Agua · 3', world: 'Mundo', fade: 'Botones', companion: 'Compañero', mic: 'Micro', joystick: 'Joystick', galaxy: 'Galaxia', sun: 'Día', sheet: 'Ventana', edge: 'Página', cards: 'Tarjetas' }, done: { water: 'Agua · 0', sun: 'Noche', fade: 'Ya están', mic: 'Enviado', sheet: 'Cerrada', edge: 'Inicio', ring: 'Parado' },
            peek: { title: 'Escanear código', aim: 'Pon el código dentro del marco', field: 'Número del código', barcode: 'Código', deep: 'Deep analyze', deepS: 'Abre el GPT de LOWiSPIKE en ChatGPT', note: 'Un vistazo dentro. La cámara sigue apagada.' },
            areas: { you: 'Yo', home: 'Tu día', food: 'Scan', shop: 'Compras', play: 'Volar', companion: 'Mi tarjeta', together: 'Comunidad', settings: 'Ajustes', extras: 'Bueno saber', new: 'Nuevo', end: 'Listo' } }
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

    /* OFF (Oct 29 2026, Emmanuel on a call: remove the current tutorial for now, no update and no rebuild; he asks for a new one once
       the app is finished): while true, users cannot reach the guided tour anywhere. tutorial.js start() returns false, the
       auto start for new accounts (tutorial-auto.js) and the "Continue tutorial" pill (tutorial-resume.js) are not loaded, the
       Settings > Tutorial row and the Community welcome's Walkthrough card are hidden. What's New (news()) is not the tour and
       stays. The steps below are parked as they are: do not update, extend or replace them until he asks.
       ON again (4 Nov 2026, Emmanuel: "Restore the first-time guided tutorial for newly signed-in users ... Preserve a way to restart
       or continue it"): the auto start for new accounts, the Continue tutorial pill, Settings > Tutorial and the Community
       Walkthrough card are back. Accounts that finished setup before this build are still never forced into it. */
    const OFF = false;
    /* Nov 5 2026 (new tutorial): step ids that were merged or renamed. A tour left halfway on an old card (tutorial-auto.js / the
       Continue tutorial pill keep the step id in the account) continues on the card that took it over, not from the start. */
    const MOVED = { water: 'day', move: 'day', sleep: 'day' };
    function moved(id) { return (id && MOVED[id]) || id || ''; }
    const api = { OFF, VERSION, MOVED, moved, AREAS, STEPS, MAX_BASE, base, SHORT_SKIPS, NO_TUTORIAL, GESTURES, GESTURE_EXEMPT, UI, text, fill, plan, skipIndex, covered, newsOk, tourOf, newsCard, unseenNews, tryMatch, taught, TRY_CUE, tryResume, kind, PRACTICE_HOW, LATER_MARK, INSTRUCTION };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiTutorialSteps = api;
})(typeof window !== 'undefined' ? window : null);
