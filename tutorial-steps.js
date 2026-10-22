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
     title / text / cta   { en, de, es }; {name} is the companion's name */
(function (root) {
    'use strict';
    const VERSION = 12;
    const AREAS = ['you', 'home', 'food', 'play', 'companion', 'together', 'settings', 'extras', 'end'];
    const STEPS = [
        /* ---------- part: you (your companion) ---------- */
        {
            /* HOOK (claim-your-own-companion): OFF until the own-companion task ships LowiBirthCompanion.claim(opts).
               tutorial.js only plans this step when that function exists (ctx.claimReady), so the tour never depends on it. */
            id: 'claim', area: 'you', when: 'claimReady', hook: 'own-companion-claim', action: 'claim', target: null, covers: ['companion-claim'],
            title: { en: 'Make me yours', de: 'Mach mich zu deinem', es: 'Hazme tuyo' },
            text: {
                en: 'Right now I’m the standard Misty. Tell me your birthday (your personality type and birth time are optional) and I become your very own companion.',
                de: 'Gerade bin ich noch die Standard-Misty. Sag mir deinen Geburtstag (Persönlichkeitstyp und Geburtszeit sind freiwillig), dann werde ich dein ganz eigener Begleiter.',
                es: 'Ahora mismo soy la Misty de siempre. Dime tu cumpleaños (tu tipo de personalidad y tu hora de nacimiento son opcionales) y me convierto en tu propio compañero.'
            },
            cta: { en: 'Let’s do it', de: 'Los geht’s', es: '¡Vamos!' }
        },
        {
            id: 'hello', area: 'you', target: ['[data-home-misty]', '#spBubble'], covers: ['companion', 'misty'],
            title: { en: 'Hi, I’m {name}', de: 'Hi, ich bin {name}', es: 'Hola, soy {name}' },
            text: {
                en: 'I’m your companion and I live here on Home. Let me show you around, one small thing at a time. Skip jumps past a whole part, Skip all ends the tour.',
                de: 'Ich bin dein Begleiter und wohne hier auf Home. Ich zeig dir alles, Stück für Stück. Überspringen springt über einen ganzen Teil, Alles überspringen beendet die Tour.',
                es: 'Soy tu compañero y vivo aquí en Inicio. Te lo enseño todo, poco a poco. Saltar pasa una parte entera y Saltar todo termina el recorrido.'
            }
        },
        {
            id: 'touch', area: 'you', target: ['[data-home-misty]', '#spBubble'], covers: ['companion-card'], teaches: ['misty-tap'], tryIt: { how: 'tap' },
            title: { en: 'Tap me', de: 'Tipp mich an', es: 'Tócame' },
            text: {
                en: 'Tap me once. That’s how we play.',
                de: 'Tipp mich einmal an. So spielen wir.',
                es: 'Tócame una vez. Así jugamos.'
            }
        },
        {
            id: 'misty-hold', sayTitle: false, area: 'you', target: ['[data-home-misty]', '#spBubble'], covers: ['companion-card'], teaches: ['misty-hold', 'misty-squish'], tryIt: { how: 'hold' },
            title: { en: 'Hold me', de: 'Halt mich gedrückt', es: 'Mantenme pulsado' },
            text: {
                en: 'Now keep your finger on me for a second. My card opens: my energy, my forms and my home. Close it to come back here.',
                de: 'Jetzt lass deinen Finger kurz auf mir. Meine Karte geht auf: Energie, Formen und mein Zuhause. Schließ sie, dann geht’s hier weiter.',
                es: 'Ahora deja el dedo sobre mí un segundo. Se abre mi tarjeta: mi energía, mis formas y mi casa. Ciérrala para volver aquí.'
            }
        },
        {
            id: 'misty-turn', sayTitle: { es: false }, area: 'you', target: ['[data-home-misty]', '#spBubble'], covers: [], teaches: ['misty-turn'], tryIt: { how: 'drag' },
            title: { en: 'Turn me', de: 'Dreh mich', es: 'Gírame' },
            text: {
                en: 'Put your finger on me and slide it sideways. I turn to where you pull.',
                de: 'Leg deinen Finger auf mich und schieb ihn zur Seite. Ich drehe mich dorthin, wohin du ziehst.',
                es: 'Pon el dedo sobre mí y deslízalo hacia un lado. Me giro hacia donde tiras.'
            }
        },
        {
            id: 'energy', area: 'you', target: ['[data-home-misty]', '#spBubble'], covers: ['energy'],
            title: { en: 'My energy', de: 'Meine Energie', es: 'Mi energía' },
            text: {
                en: 'What you track today fills my energy: water, meals, moves and sleep. The more you take care of yourself, the more I have.',
                de: 'Was du heute einträgst, füllt meine Energie: Wasser, Essen, Bewegung und Schlaf. Je besser du auf dich achtest, desto mehr habe ich.',
                es: 'Lo que registras hoy llena mi energía: agua, comidas, movimiento y sueño. Cuanto mejor te cuidas, más energía tengo.'
            }
        },
        {
            id: 'mood', area: 'you', target: ['[data-home-misty]', '#spBubble'], covers: ['mood'],
            title: { en: 'My face', de: 'Mein Gesicht', es: 'Mi cara' },
            text: {
                en: 'My face follows my energy. Full, and I look lively and happy. Low, and I look tired. One look tells you how your day is going.',
                de: 'Mein Gesicht folgt meiner Energie. Voll, und ich sehe munter und froh aus. Niedrig, und ich sehe müde aus. Ein Blick zeigt dir, wie dein Tag läuft.',
                es: 'Mi cara sigue mi energía. Llena, y me ves animado y feliz. Baja, y me ves cansado. Con un vistazo sabes cómo va tu día.'
            }
        },
        {
            id: 'energy-peak', area: 'you', target: ['[data-home-misty]', '#spBubble'], covers: ['energy-peak', 'welcome-energy'],
            title: { en: 'Full power', de: 'Volle Kraft', es: 'A tope' },
            text: {
                en: 'At 100% I fly faster, the world glows brighter and my trail turns gold. New accounts start at 100% for 12 hours, then it fades over the next 12.',
                de: 'Bei 100 % fliege ich schneller, die Welt leuchtet heller und meine Spur wird golden. Neue Konten starten 12 Stunden mit 100 %, dann sinkt es über die nächsten 12.',
                es: 'Al 100 % vuelo más rápido, el mundo brilla más y mi estela se vuelve dorada. Las cuentas nuevas empiezan 12 horas al 100 % y luego baja en las 12 siguientes.'
            }
        },
        /* ---------- part: home (the bubbles) ---------- */
        {
            id: 'bubbles', area: 'home', target: null, covers: ['home-ring'], teaches: [],
            title: { en: 'Your day, in bubbles', de: 'Dein Tag in Blasen', es: 'Tu día en burbujas' },
            text: {
                en: 'The bubbles around me are your day. Each one opens with a single tap. Let’s go through them.',
                de: 'Die Blasen um mich herum sind dein Tag. Jede öffnet sich mit einem Tipp. Gehen wir sie durch.',
                es: 'Las burbujas a mi alrededor son tu día. Cada una se abre con un toque. Vamos a verlas.'
            }
        },
        {
            id: 'gap', area: 'home', target: ['#spFast'], covers: ['gap'],
            title: { en: 'Gap', de: 'Gap', es: 'Gap' },
            text: {
                en: 'Gap counts the hours since your last real meal. Until your first meal it says "no meal yet".',
                de: 'Gap zählt die Stunden seit deiner letzten echten Mahlzeit. Bis zur ersten Mahlzeit steht dort „noch kein Essen“.',
                es: 'Gap cuenta las horas desde tu última comida de verdad. Hasta tu primera comida dice «sin comida aún».'
            }
        },
        {
            id: 'ring-still', area: 'home', target: ['#whHud .wh-water', '#whHud .wh-meals'], covers: [], teaches: ['ring-still'],
            title: { en: 'Stop the ring', de: 'Ring anhalten', es: 'Para el anillo' },
            text: {
                en: 'The bubbles slowly circle me. Touch any bubble and the ring stops, so it’s easy to hit.',
                de: 'Die Blasen kreisen langsam um mich. Berühr eine Blase und der Ring bleibt stehen, dann triffst du sie leicht.',
                es: 'Las burbujas giran despacio a mi alrededor. Toca cualquiera y el anillo se para, así es fácil acertar.'
            }
        },
        {
            id: 'gap-tap', sayTitle: false, area: 'home', target: ['#spFast'], covers: ['fasting'], teaches: ['gap-tap'], tryIt: { how: 'tap' },
            title: { en: 'Inside the Gap', de: 'In der Pause', es: 'Dentro de la pausa' },
            text: {
                en: 'Tap Gap to see the time since your last meal on the six planets, with what typically happens along the way. Fix the time there if it is wrong. Logging a meal in Fuel restarts it, with its points.',
                de: 'Tipp auf Gap und sieh die Zeit seit deiner letzten Mahlzeit auf den sechs Planeten, mit dem, was typischerweise passiert. Ist die Zeit falsch, korrigier sie dort. Eine Mahlzeit in Fuel startet sie neu, mit ihren Punkten.',
                es: 'Toca Gap para ver el tiempo desde tu última comida en los seis planetas, con lo que suele pasar. Si la hora está mal, corrígela ahí. Registrar una comida en Fuel la reinicia, con sus puntos.'
            }
        },
        {
            id: 'fuel', area: 'home', target: ['#whHud .wh-meals'], covers: ['fuel', 'cook', 'shop'], teaches: ['fuel-tap'],
            title: { en: 'Fuel', de: 'Essen', es: 'Comida' },
            text: {
                en: 'Fuel is everything about food. "1/3 meals" means one of today\'s three meals is logged. Log meal is for what you ate, Shop checks products in the shop and keeps your list, Cook has meal ideas.',
                de: 'Essen ist alles rund ums Essen. „1/3 Mahlzeiten“: eine von drei ist drin. Mahlzeit eintragen ist für das, was du gegessen hast, Einkaufen prüft Produkte und führt deine Liste, Kochen hat Ideen.',
                es: 'Comida es todo lo relacionado con comer. «1/3 comidas»: llevas una de tres. Registrar comida es para lo que comiste, Comprar revisa productos en la tienda y guarda tu lista, Cocinar tiene ideas de comidas.'
            }
        },
        {
            id: 'fuel-hold', area: 'home', target: ['#whHud .wh-meals'], covers: [], teaches: ['fuel-hold'], tryIt: { how: 'hold' },
            title: { en: 'Hold Fuel', de: 'Fuel gedrückt halten', es: 'Mantén Fuel' },
            text: {
                en: 'Shortcut: hold Fuel and Log meal opens right away. Try it, then close it to come back here.',
                de: 'Abkürzung: Halt Fuel gedrückt, dann geht Mahlzeit eintragen sofort auf. Probier’s und schließ es wieder.',
                es: 'Atajo: mantén pulsado Fuel y se abre Registrar comida al instante. Pruébalo y ciérralo para volver.'
            }
        },
        {
            id: 'log-meal', area: 'home', target: ['#whHud .wh-meals'], covers: ['log-meal'], teaches: [],
            title: { en: 'Log meal', de: 'Mahlzeit eintragen', es: 'Registrar comida' },
            text: {
                en: 'Eating? Log meal is the one place for it: snap a photo, type what you ate, like “chicken stew”, or tap a recent meal. I fill in the numbers, and saving ends your fast with its points.',
                de: 'Du isst? Mahlzeit eintragen ist der eine Ort dafür: Foto machen, eintippen, etwa „Hühnereintopf“, oder eine letzte Mahlzeit wählen. Die Werte trage ich ein, und Speichern beendet dein Fasten mit seinen Punkten.',
                es: '¿Comiendo? Registrar comida es el único sitio: haz una foto, escribe lo que comiste, como “guiso de pollo”, o toca una comida reciente. Yo relleno los números y al guardar termina tu ayuno con sus puntos.'
            }
        },
        {
            id: 'water', area: 'home', target: ['#whHud .wh-water'], covers: ['water', 'hydration'], teaches: ['water-tap'], tryIt: { how: 'tap' },
            title: { en: 'Water', de: 'Wasser', es: 'Agua' },
            text: {
                en: 'Tap Water, then +1 cup each time you drink. Undo takes one back if you tapped by mistake.',
                de: 'Tipp auf Wasser und dann +1 Becher, wann immer du trinkst. Rückgängig nimmt einen zurück, falls du dich vertippt hast.',
                es: 'Toca Agua y luego +1 vaso cada vez que bebas. Deshacer quita uno si te equivocaste.'
            }
        },
        {
            id: 'water-hold', area: 'home', target: ['#whHud .wh-water'], covers: [], teaches: ['water-hold'],
            title: { en: 'Start water over', de: 'Wasser neu starten', es: 'Empezar el agua de nuevo' },
            text: {
                en: 'Tapped too many cups? Hold Water for a moment and today’s water goes back to 0.',
                de: 'Zu viele Becher getippt? Halt Wasser kurz gedrückt, dann steht das Wasser von heute wieder auf 0.',
                es: '¿Demasiados vasos? Mantén pulsado Agua un momento y el agua de hoy vuelve a 0.'
            }
        },
        {
            id: 'move', area: 'home', target: ['#whHud .wh-move'], covers: ['move'], teaches: ['move-tap'],
            title: { en: 'Move', de: 'Bewegung', es: 'Movimiento' },
            text: {
                en: 'Tap Move after anything active, a walk, stairs, dancing, and pick Quick, Medium, Long or Epic.',
                de: 'Tipp nach allem Aktiven auf Bewegung, ob Spaziergang, Treppen oder Tanzen, und wähl kurz, mittel, lang oder episch.',
                es: 'Toca Movimiento después de algo activo, un paseo, escaleras, bailar, y elige corto, medio, largo o épico.'
            }
        },
        {
            /* Oct 21 (Eman): hold Move = the full Move page (workouts, Care board, today's guesses). Cook and Move left Community's bar. */
            id: 'move-hold', area: 'home', target: ['#whHud .wh-move'], covers: ['move-page', 'workouts-page'], teaches: ['move-hold'], tryIt: { how: 'hold' },
            title: { en: 'Hold Move', de: 'Bewegung halten', es: 'Mantén Movimiento' },
            text: {
                en: 'Hold Move to open the Move page with your workouts and the Care board. Today\'s guesses are at the top, tap Edit to remove one. Try it, then close it.',
                de: 'Halt Bewegung gedrückt für die Bewegungsseite mit Workouts und Care-Board. Oben stehen deine heutigen Schätzungen, Bearbeiten löscht eine. Probier’s und schließ es.',
                es: 'Mantén Movimiento para abrir su página con tus entrenos y el Care board. Arriba están tus estimaciones de hoy, Editar quita una. Pruébalo y ciérralo.'
            }
        },
        {
            id: 'sleep', area: 'home', target: ['#whHud .o8-sleep'], covers: ['sleep'], teaches: ['sleep-tap'],
            title: { en: 'Sleep', de: 'Schlaf', es: 'Sueño' },
            text: {
                en: 'Once a day, tap Sleep and tell me how last night went: slept well, okay or a short night. It stays private on your account.',
                de: 'Einmal am Tag tippst du auf Schlaf und sagst mir, wie die Nacht war: gut, okay oder kurz. Das bleibt privat in deinem Konto.',
                es: 'Una vez al día, toca Sueño y dime qué tal la noche: bien, regular o corta. Se queda privado en tu cuenta.'
            }
        },
        /* ---------- part: food (scan and photos) ---------- */
        {
            /* Oct 22 2026 (Emmanuel: "when it reaches the scanner, Apple shows 'Allow camera', which breaks the whole tutorial ... Or
               maybe we just tell them what's inside the scanner instead of taking them inside the scanner"): the Scan cards never open
               Scan (it opens the camera straight away) and have no try-it here. scan-in and deep show a picture of the inside (peek). */
            id: 'scan', area: 'food', target: ['#whHud .o8-scan'], sayTitle: { es: false }, covers: ['scan', 'barcode'], teaches: ['scan-tap'],
            title: { en: 'Scan', de: 'Scannen', es: 'Escanear' },
            text: {
                en: 'This is Scan, for checking a product, like in the shop. Later, tap it and point your camera at a barcode. For now, I’ll just show you what’s inside.',
                de: 'Das ist Scan, zum Prüfen von Produkten, zum Beispiel im Laden. Später tippst du darauf und hältst die Kamera auf einen Barcode. Jetzt zeig ich dir nur, was drin ist.',
                es: 'Esto es Scan, para revisar un producto, por ejemplo en la tienda. Luego lo tocas y apuntas la cámara a un código de barras. Por ahora solo te enseño lo que hay dentro.'
            }
        },
        {
            id: 'scan-in', area: 'food', target: null, peek: { kind: 'scan', mark: 'frame' }, sayTitle: false, covers: [], teaches: ['scan-buttons'],
            title: { en: 'Inside Scan', de: 'In Scan', es: 'Dentro de Scan' },
            text: {
                en: 'This is what you’ll see inside: hold the barcode in the frame and I read it by myself. Camera won’t focus? Type the number printed under the barcode instead.',
                de: 'Das siehst du drinnen: Halt den Barcode in den Rahmen, ich lese ihn von selbst. Die Kamera stellt nicht scharf? Tipp stattdessen die Nummer unter dem Barcode ein.',
                es: 'Esto es lo que verás dentro: pon el código de barras en el marco y lo leo yo solo. ¿La cámara no enfoca? Escribe el número que hay debajo del código.'
            }
        },
        {
            id: 'deep', area: 'food', target: null, peek: { kind: 'scan', mark: 'deep' }, covers: ['deep-analyze'], teaches: ['scan-deep'],
            title: { en: 'Deep analyze', de: 'Deep analyze', es: 'Deep analyze' },
            text: {
                en: 'Product not found? Tap Deep analyze at the bottom of Scan. It opens the LOWiSPIKE GPT in ChatGPT: send it a photo of the pack and it tells you if it will spike you.',
                de: 'Produkt nicht gefunden? Tipp unten in Scan auf Deep analyze. Das öffnet das LOWiSPIKE-GPT in ChatGPT: Schick ihm ein Foto der Packung und es sagt dir, ob sie dich spiket.',
                es: '¿No aparece el producto? Toca Deep analyze abajo en Scan. Abre el GPT de LOWiSPIKE en ChatGPT: mándale una foto del paquete y te dice si te dispara el azúcar.'
            }
        },
        {
            id: 'fix-food', area: 'food', target: null, covers: ['fix-food'], teaches: ['fix-field'],
            title: { en: 'Fix a food', de: 'Essen korrigieren', es: 'Corregir una comida' },
            text: {
                en: 'Did I guess a food wrong? Tap its card. In “What is it really?” start typing and tap the right product from the list. Then set how many pieces, and the numbers update right away.',
                de: 'Hab ich ein Essen falsch erkannt? Tipp seine Karte an. Bei „Was ist es wirklich?“ fang an zu tippen und wähl das richtige Produkt aus der Liste. Dann stell die Stückzahl ein, die Werte passen sich sofort an.',
                es: '¿Adiviné mal una comida? Toca su tarjeta. En “¿Qué es en realidad?” empieza a escribir y toca el producto correcto de la lista. Luego elige cuántas piezas y los números se actualizan al instante.'
            }
        },
        {
            id: 'snap', area: 'food', target: null, covers: ['snap-food'], teaches: [],
            title: { en: 'Snap food', de: 'Essen fotografieren', es: 'Foto de comida' },
            text: {
                en: 'Snap is inside Log meal, in Fuel: pick the meal, tap Snap. The spike answer comes first, then each food on its own card. Tap one to fix it, then log it.',
                de: 'Foto steckt in Mahlzeit eintragen, unter Essen: Mahlzeit wählen, Foto tippen. Zuerst kommt die Spike-Antwort, dann jedes Essen als Karte. Antippen zum Korrigieren, dann eintragen.',
                es: 'La foto está en Registrar comida, en Comida: elige la comida y toca Foto. Primero va la respuesta del pico, luego cada alimento en su tarjeta. Toca uno para corregirlo y regístrala.'
            }
        },
        {
            id: 'photo-checks', area: 'food', target: null, covers: ['photo-checks'], teaches: [],
            title: { en: '3 photo checks a day', de: '3 Foto-Checks am Tag', es: '3 fotos al día' },
            text: {
                en: 'Everyone gets 3 photo checks a day, and new ones come at midnight. Typing what you ate always works, as often as you like.',
                de: 'Jeder hat 3 Foto-Checks am Tag, neue gibt es um Mitternacht. Eintippen, was du gegessen hast, geht immer, so oft du willst.',
                es: 'Todos tienen 3 fotos al día, y a medianoche llegan nuevas. Escribir lo que comiste siempre funciona, todas las veces que quieras.'
            }
        },
        /* ---------- part: play (flying and worlds) ---------- */
        {
            id: 'look', area: 'play', target: null, covers: [], teaches: ['world-drag'], tryIt: { how: 'drag', anywhere: true },
            title: { en: 'Look around', de: 'Umschauen', es: 'Mira alrededor' },
            text: {
                en: 'Slide one finger over an empty spot of my world. The view turns with your finger.',
                de: 'Schieb einen Finger über eine freie Stelle meiner Welt. Die Ansicht dreht sich mit deinem Finger.',
                es: 'Desliza un dedo por un hueco vacío de mi mundo. La vista gira con tu dedo.'
            }
        },
        {
            id: 'joystick', sayTitle: { es: false }, area: 'play', target: ['#whPad'], covers: ['joy'], teaches: ['pad-drag'], tryIt: { how: 'drag' },
            title: { en: 'Fly me', de: 'Lass mich fliegen', es: 'Hazme volar' },
            text: {
                en: 'This is the joystick. Drag it and I fly where you point.',
                de: 'Das ist der Joystick. Zieh daran und ich fliege dahin, wo du hinzeigst.',
                es: 'Este es el joystick. Arrástralo y vuelo hacia donde apuntes.'
            }
        },
        {
            id: 'joystick-hold', sayTitle: { de: false, es: false }, area: 'play', target: ['#whPad'], covers: ['joy-hold'], teaches: ['pad-hold', 'pad-back'], tryIt: { how: 'hold' },
            title: { en: 'Forward and back', de: 'Vor und zurück', es: 'Adelante y atrás' },
            text: {
                en: 'Hold the middle of the joystick to go forward. Tap, then hold, to go back.',
                de: 'Halt die Mitte des Joysticks für vorwärts. Tipp und halt dann für rückwärts.',
                es: 'Mantén el centro del joystick para avanzar. Toca y luego mantén para retroceder.'
            }
        },
        {
            id: 'energy-shot', area: 'play', target: ['#whPad'], covers: [], teaches: ['energy-shot'],
            title: { en: 'Shoot energy', de: 'Energie schießen', es: 'Dispara energía' },
            text: {
                en: 'Two fingers: keep one on the joystick, and tap the world twice quickly with the other. I shoot energy that heals a world.',
                de: 'Zwei Finger: Einer bleibt auf dem Joystick, mit dem anderen tippst du zweimal schnell auf die Welt. Dann schieße ich Energie, die eine Welt heilt.',
                es: 'Dos dedos: deja uno en el joystick y toca el mundo dos veces rápido con el otro. Disparo energía que cura un mundo.'
            }
        },
        {
            id: 'autopilot', area: 'play', target: ['#whPad'], covers: ['autopilot'], teaches: ['pad-triple'], tryIt: { how: 'triple' },
            title: { en: 'Autopilot', de: 'Autopilot', es: 'Piloto automático' },
            text: {
                en: 'Tap the joystick three times quickly and autopilot turns on. Then I go exploring on my own.',
                de: 'Tipp dreimal schnell auf den Joystick und der Autopilot geht an. Dann erkunde ich alles allein.',
                es: 'Toca el joystick tres veces rápido y se activa el piloto automático. Entonces exploro por mi cuenta.'
            }
        },
        {
            id: 'clean-view', area: 'play', target: null, covers: [], teaches: ['clean-tap'],
            title: { en: 'Buttons gone?', de: 'Knöpfe weg?', es: '¿Se fueron los botones?' },
            text: {
                en: 'While I fly, the buttons fade away so you can watch. Tap the screen once and they come back.',
                de: 'Während ich fliege, blenden die Knöpfe aus, damit du zuschauen kannst. Tipp einmal auf den Bildschirm, dann sind sie wieder da.',
                es: 'Mientras vuelo, los botones desaparecen para que puedas mirar. Toca la pantalla una vez y vuelven.'
            }
        },
        {
            id: 'zoom', area: 'play', target: ['#whHud .wh-zoom', '#whPad'], covers: ['zoom', 'map'], teaches: ['world-pinch', 'map-button'], tryIt: { how: 'pinch', anywhere: true },
            title: { en: 'Zoom and World map', de: 'Zoom und Weltkarte', es: 'Zoom y mapa' },
            text: {
                en: 'Pinch to zoom in and out. The World map shows every world at once and takes you straight to the one you pick.',
                de: 'Zieh mit zwei Fingern, um zu zoomen. Die Weltkarte zeigt alle Welten auf einmal und bringt dich direkt in die, die du wählst.',
                es: 'Pellizca para acercar y alejar. El mapa del mundo muestra todos los mundos a la vez y te lleva directo al que elijas.'
            }
        },
        {
            id: 'fly-out', area: 'play', target: ['[data-home-misty]', '#spBubble'], covers: ['fly-out'], teaches: [],
            title: { en: 'Out of my bubble', de: 'Raus aus meiner Blase', es: 'Fuera de mi burbuja' },
            text: {
                en: 'Fly me out of my bubble and into space. Out there, every glowing bubble is a world you can visit.',
                de: 'Flieg mich aus meiner Blase hinaus ins All. Da draußen ist jede leuchtende Blase eine Welt, die du besuchen kannst.',
                es: 'Sácame de mi burbuja y llévame al espacio. Ahí fuera, cada burbuja brillante es un mundo que puedes visitar.'
            }
        },
        {
            id: 'worlds', area: 'play', target: ['#whHud .wh-zoom', '#whPad'], covers: ['worlds'], teaches: ['galaxy-bubble'],
            title: { en: 'Worlds', de: 'Welten', es: 'Mundos' },
            text: {
                en: 'Fly into a glowing bubble to visit a body world: lungs, brain, gut, muscle and more.',
                de: 'Flieg in eine leuchtende Blase, um eine Körperwelt zu besuchen: Lunge, Gehirn, Darm, Muskeln und mehr.',
                es: 'Vuela dentro de una burbuja brillante para visitar un mundo del cuerpo: pulmones, cerebro, intestino, músculo y más.'
            }
        },
        {
            id: 'in-world', area: 'play', target: null, covers: [], teaches: ['place-tap', 'world-inside'],
            title: { en: 'Inside a world', de: 'In einer Welt', es: 'Dentro de un mundo' },
            text: {
                en: 'Inside a world, tap a glowing place to fly there. Pinch with two fingers, or tap twice quickly, to zoom into a spot.',
                de: 'In einer Welt tippst du auf einen leuchtenden Ort, um hinzufliegen. Zieh zwei Finger auseinander oder tipp zweimal schnell, um näher ranzugehen.',
                es: 'Dentro de un mundo, toca un lugar brillante para volar allí. Pellizca con dos dedos, o toca dos veces rápido, para acercarte a un punto.'
            }
        },
        {
            id: 'world-extras', area: 'play', target: null, covers: [], teaches: ['region-pal', 'arrival-x', 'tilt'],
            title: { en: 'Facts and tilt', de: 'Fakten und Kippen', es: 'Datos e inclinar' },
            text: {
                en: 'Tap the little creature in a world for the next fact, and the X to close a gold card. With the tilt button on, move your phone to look around.',
                de: 'Tipp das kleine Wesen in einer Welt für den nächsten Fakt an und das X, um eine goldene Karte zu schließen. Mit dem Kipp-Knopf an bewegst du dein Handy zum Umschauen.',
                es: 'Toca la criaturita de un mundo para el siguiente dato y la X para cerrar una tarjeta dorada. Con el botón de inclinar activado, mueve el móvil para mirar alrededor.'
            }
        },
        {
            id: 'world-energy', area: 'play', target: ['[data-home-misty]', '#spBubble'], covers: ['half-energy'], teaches: [],
            title: { en: 'Too tired to fly in', de: 'Zu müde für Welten', es: 'Demasiado cansado' },
            text: {
                en: 'Below half energy I’m too tired to get into worlds. A glass of water or a meal gets me going again.',
                de: 'Unter der Hälfte Energie bin ich zu müde für die Welten. Ein Glas Wasser oder eine Mahlzeit bringt mich wieder in Schwung.',
                es: 'Por debajo de la mitad de energía estoy demasiado cansado para entrar en los mundos. Un vaso de agua o una comida me reactivan.'
            }
        },
        {
            id: 'spirit', area: 'play', target: null, covers: ['spirit-world'],
            title: { en: 'The galaxy', de: 'Die Galaxie', es: 'La galaxia' },
            text: {
                en: 'Out in space I can ride the glowing strings of the galaxy. Fly me onto one and enjoy the ride.',
                de: 'Draußen im All kann ich auf den leuchtenden Saiten der Galaxie reiten. Flieg mich auf eine und genieß die Fahrt.',
                es: 'En el espacio puedo montar las cuerdas brillantes de la galaxia. Llévame a una y disfruta el viaje.'
            }
        },
        {
            id: 'world-sound', area: 'play', target: ['#whHud .o8-settings'], covers: ['worldSound'], teaches: ['sound-strings'],
            title: { en: 'World sound', de: 'Weltklang', es: 'Sonido del mundo' },
            text: {
                en: 'In Settings, World sound gives every world its own sound. In its Sound panel, touch a string to play it, swipe across the strings to strum, and slide along one to bend the note.',
                de: 'In den Einstellungen gibt Weltklang jeder Welt ihren eigenen Klang. Im Klang-Fenster berührst du eine Saite, um sie zu spielen, wischst quer darüber, um zu schrammeln, und gleitest an einer entlang, um den Ton zu ziehen.',
                es: 'En Ajustes, Sonido del mundo da a cada mundo su propio sonido. En su panel de sonido, toca una cuerda para tocarla, desliza por encima de las cuerdas para rasguear y desliza a lo largo de una para doblar la nota.'
            }
        },
        {
            id: 'secret', area: 'play', target: null, covers: [], teaches: ['edge-push'],
            title: { en: 'A secret', de: 'Ein Geheimnis', es: 'Un secreto' },
            text: {
                en: 'Steer me into the edge of my world and keep pushing for a few seconds. See what happens.',
                de: 'Steuer mich an den Rand meiner Welt und drück ein paar Sekunden weiter. Schau, was passiert.',
                es: 'Llévame hasta el borde de mi mundo y sigue empujando unos segundos. Mira lo que pasa.'
            }
        },
        /* ---------- part: companion (forms and home) ---------- */
        {
            id: 'forms', area: 'companion', target: ['[data-home-misty]', '#spBubble'], covers: ['forms', 'evolution'],
            title: { en: 'Forms', de: 'Formen', es: 'Formas' },
            text: {
                en: 'Hold me, then tap Forms: the longer you keep going, the more I change, from one glowing cell into something much bigger. Forms you have not reached stay a secret until you get there.',
                de: 'Halt mich gedrückt und tipp auf Formen: Je länger du dranbleibst, desto mehr verwandle ich mich, von einer leuchtenden Zelle zu etwas viel Größerem. Formen, die du noch nicht erreicht hast, bleiben ein Geheimnis, bis du da bist.',
                es: 'Mantenme pulsado y toca Formas: cuanto más constante seas, más me transformo, de una célula luminosa a algo mucho más grande. Las formas que aún no alcanzaste siguen en secreto hasta que llegues.'
            }
        },
        {
            id: 'care-room', area: 'companion', target: ['[data-home-misty]', '#spBubble'], covers: ['care-room', 'cell-room'],
            title: { en: 'My home', de: 'Mein Zuhause', es: 'Mi casa' },
            text: {
                en: 'On my card you’ll also find my home: a little room in your bloodstream. Decorate it however you like.',
                de: 'Auf meiner Karte findest du auch mein Zuhause: ein kleines Zimmer in deinem Blutkreislauf. Richte es ein, wie du magst.',
                es: 'En mi tarjeta también está mi casa: un cuartito en tu sangre. Decóralo como quieras.'
            }
        },
        {
            /* Oct 19 (aura-rename task): a name of your own and a glow colour, both on my card */
            id: 'rename', area: 'companion', target: ['[data-home-misty]', '#spBubble'], covers: ['rename', 'aura'],
            title: { en: 'My name and glow', de: 'Mein Name und Leuchten', es: 'Mi nombre y mi brillo' },
            text: {
                en: 'Want to call me something else? Hold me and tap Rename under my name. In Glow you can also pick the colour of my light.',
                de: 'Willst du mich anders nennen? Halt mich gedrückt und tipp unter meinem Namen auf Umbenennen. Unter Leuchten suchst du auch die Farbe meines Lichts aus.',
                es: '¿Quieres llamarme de otra forma? Mantenme pulsado y toca Cambiar nombre debajo de mi nombre. En Brillo también eliges el color de mi luz.'
            }
        },
        /* ---------- part: together (community) ---------- */
        {
            id: 'community', area: 'together', target: ['#whHud .o8-settings'], covers: ['community'], teaches: ['community-tap'], tryIt: { how: 'tap' },
            title: { en: 'Community', de: 'Community', es: 'Comunidad' },
            text: {
                en: 'Meet everyone else and their companions. Tap the Community bubble at the top now and I take you there.',
                de: 'Hier triffst du alle anderen und ihre Begleiter. Tipp jetzt oben auf die Community-Blase, dann nehme ich dich mit.',
                es: 'Aquí conoces a los demás y a sus compañeros. Toca ahora la burbuja Comunidad, arriba, y te llevo allí.'
            }
        },
        {
            id: 'cm-tabs', area: 'together', where: 'community', rm: 'room', target: ['.rm-tabs', '.rm-tab[data-rm="room"]'], covers: ['community-tabs'], teaches: ['cm-tabs'],
            title: { en: 'Community tabs', de: 'Community-Tabs', es: 'Pestañas de Comunidad' },
            text: {
                en: 'Tap these tabs to switch: Room is the galaxy with everyone’s companions, Chat is the messages, Creation is for making content and Affiliates is for earning with LOWiSPIKE.',
                de: 'Tipp auf diese Tabs zum Wechseln: Raum ist die Galaxie mit allen Begleitern, Chat sind die Nachrichten, Erstellen ist für Content und Affiliates zum Verdienen mit LOWiSPIKE.',
                es: 'Toca estas pestañas para cambiar: Sala es la galaxia con los compañeros de todos, Chat son los mensajes, Crear es para hacer contenido y Afiliados para ganar con LOWiSPIKE.'
            }
        },
        {
            id: 'cm-name', area: 'together', where: 'community', rm: 'room', target: ['.rm-menu-btn', '.rm-name'], covers: [], teaches: ['cm-name'],
            title: { en: 'Rooms and profile', de: 'Räume und Profil', es: 'Salas y perfil' },
            text: {
                en: 'Tap the Community name up here for rooms and invite links. Tap your picture for your profile.',
                de: 'Tipp oben auf den Community-Namen für Räume und Einladungslinks. Tipp auf dein Bild für dein Profil.',
                es: 'Toca arriba el nombre de Comunidad para salas y enlaces de invitación. Toca tu foto para tu perfil.'
            }
        },
        {
            id: 'cm-galaxy', sayTitle: { es: false }, area: 'together', where: 'community', rm: 'room', target: null, covers: [], teaches: ['cm-pan', 'cm-zoom'], tryIt: { how: 'drag', anywhere: true },
            title: { en: 'Move around', de: 'Bewegen', es: 'Muévete' },
            text: {
                en: 'Drag one finger to move around the galaxy. Pinch, or tap twice quickly, to zoom in.',
                de: 'Zieh mit einem Finger, um dich in der Galaxie zu bewegen. Mit zwei Fingern oder zweimal schnell tippen zoomst du rein.',
                es: 'Arrastra un dedo para moverte por la galaxia. Pellizca, o toca dos veces rápido, para acercarte.'
            }
        },
        {
            id: 'cm-people', area: 'together', where: 'community', rm: 'room', target: null, covers: ['person-card'], teaches: ['cm-hold'],
            title: { en: 'Meet someone', de: 'Jemanden kennenlernen', es: 'Conoce a alguien' },
            text: {
                en: 'Hold your finger on someone’s companion, or on their name, to open their card. From there you can say hi.',
                de: 'Halt deinen Finger auf den Begleiter von jemandem oder auf seinen Namen, dann geht seine Karte auf. Von dort kannst du Hallo sagen.',
                es: 'Mantén el dedo sobre el compañero de alguien, o sobre su nombre, para abrir su tarjeta. Desde ahí puedes saludar.'
            }
        },
        {
            id: 'post', area: 'together', where: 'community', rm: 'chat', target: null, covers: ['community-post'], teaches: [],
            title: { en: 'Share a meal', de: 'Mahlzeit teilen', es: 'Comparte una comida' },
            text: {
                en: 'Post a photo of your meal so everyone can see what you’re eating. Photo posts use the same 3 photo checks a day.',
                de: 'Teil ein Foto deiner Mahlzeit, damit alle sehen, was du isst. Foto-Posts nutzen dieselben 3 Foto-Checks am Tag.',
                es: 'Publica una foto de tu comida para que todos vean lo que comes. Las fotos usan las mismas 3 fotos al día.'
            }
        },
        {
            id: 'chat', area: 'together', where: 'community', rm: 'chat', target: ['.rm-crumb', '.rm-tabs'], covers: ['community-chat'], teaches: ['cm-room'],
            title: { en: 'Community chat', de: 'Community-Chat', es: 'Chat de la comunidad' },
            text: {
                en: 'Tap Chat in Community to open your room of up to 30 people. At the top, Room shows the galaxy game and Chat shows the messages; tap the room chip to find someone and join their room.',
                de: 'Tipp in der Community auf Chat, um deinen Raum mit bis zu 30 Personen zu öffnen. Oben zeigt Raum das Galaxie-Spiel und Chat die Nachrichten; tipp auf das Raum-Schild, um jemanden zu finden und seinem Raum beizutreten.',
                es: 'Toca Chat en Comunidad para abrir tu sala de hasta 30 personas. Arriba, Sala muestra el juego de la galaxia y Chat los mensajes; toca la etiqueta de la sala para buscar a alguien y unirte a su sala.'
            }
        },
        {
            id: 'voice', area: 'together', where: 'community', rm: 'chat', target: ['#cmMic', '#cmPhoto'], covers: ['voice-message', 'photo-message'], teaches: ['cm-mic', 'cm-photo'],
            title: { en: 'Talk instead of typing', de: 'Sprechen statt tippen', es: 'Habla en vez de escribir' },
            text: {
                en: 'Hold the mic and talk. Let go to send it, or slide left to cancel. A quick tap keeps it recording until you tap send. The camera sends a photo.',
                de: 'Halt das Mikro gedrückt und sprich. Loslassen schickt es ab, nach links wischen bricht ab. Kurz tippen nimmt weiter auf, bis du auf Senden tippst. Die Kamera schickt ein Foto.',
                es: 'Mantén pulsado el micro y habla. Suelta para enviar o desliza a la izquierda para cancelar. Un toque rápido sigue grabando hasta que toques enviar. La cámara envía una foto.'
            }
        },
        {
            /* Oct 21 (Eman): hold a Community tab and drag it; Community always opens on the first one */
            id: 'community-order', area: 'together', where: 'community', rm: 'room', target: ['.rm-tabs'], covers: ['community-tab-order'], teaches: ['cm-tab-order'], tryIt: { how: 'hold' },
            title: { en: 'Your tab order', de: 'Deine Reihenfolge', es: 'Tu orden' },
            text: {
                en: 'Hold Room, Chat, Creation or Affiliates until the tabs wiggle, then slide it where you want it and let go. Community always opens on your first tab.',
                de: 'Halt Raum, Chat, Erstellen oder Affiliates gedrückt, bis die Tabs wackeln, schieb ihn an seinen Platz und lass los. Die Community öffnet immer mit deinem ersten Tab.',
                es: 'Mantén Sala, Chat, Crear o Afiliados hasta que las pestañas tiemblen, deslízala adonde quieras y suelta. Comunidad siempre abre en tu primera pestaña.'
            }
        },
        {
            id: 'send-energy', area: 'together', where: 'community', rm: 'room', target: ['.ce-joy'], covers: ['community-energy'], teaches: ['cm-energy'],
            title: { en: 'Send energy', de: 'Energie schicken', es: 'Enviar energía' },
            text: {
                en: 'In the Community galaxy, pull the small blue joystick to aim me, then let go. Whoever my energy burst hits gets energy, never damage. They roll like a billiard ball, knock into others and stay where they stop.',
                de: 'Zieh in der Community-Galaxie am kleinen blauen Joystick, um mich zu zielen, und lass los. Wen mein Energiestoß trifft, der bekommt Energie, nie Schaden. Er rollt wie eine Billardkugel, stößt andere an und bleibt da, wo er anhält.',
                es: 'En la galaxia de la Comunidad, tira del pequeño joystick azul para apuntarme y suelta. A quien alcance mi energía recibe energía, nunca daño. Rueda como una bola de billar, choca con otros y se queda donde se detiene.'
            }
        },
        /* ---------- part: settings ---------- */
        {
            id: 'creation', area: 'together', where: 'community', rm: 'create', target: ['.rm-tab[data-rm="create"]', '.rm-tabs'], covers: ['creation'], teaches: [],
            title: { en: 'Creation', de: 'Erstellen', es: 'Crear' },
            text: {
                en: 'Creation is where you make content for your videos. Tap a tool to open it.',
                de: 'Unter Erstellen machst du Content für deine Videos. Tipp ein Werkzeug an, um es zu öffnen.',
                es: 'En Crear haces contenido para tus vídeos. Toca una herramienta para abrirla.'
            }
        },
        {
            id: 'affiliates', area: 'together', where: 'community', rm: 'aff', target: ['.rm-tab[data-rm="aff"]', '.rm-tabs'], covers: ['affiliates'], teaches: ['aff-card'],
            title: { en: 'Affiliates', de: 'Affiliates', es: 'Afiliados' },
            text: {
                en: 'Earn by sharing LOWiSPIKE. Tap a product card to see its video script, then tap the copy button to copy it. Below it you see your level and what you earn.',
                de: 'Verdien Geld, indem du LOWiSPIKE teilst. Tipp eine Produktkarte an, um ihr Video-Skript zu sehen, und tipp auf Kopieren, um es zu kopieren. Darunter siehst du dein Level und was du verdienst.',
                es: 'Gana compartiendo LOWiSPIKE. Toca la tarjeta de un producto para ver su guion de vídeo y luego el botón de copiar para copiarlo. Debajo ves tu nivel y lo que ganas.'
            }
        },
        {
            id: 'swipe-pages', area: 'together', where: 'community', target: null, covers: [], teaches: ['page-swipe'], tryIt: { how: 'swipe', anywhere: true },
            title: { en: 'Swipe back home', de: 'Zurück nach Home wischen', es: 'Desliza a Inicio' },
            text: {
                en: 'Swipe sideways from the edge of the screen to go between Community and Home. Try it now.',
                de: 'Wisch vom Bildschirmrand zur Seite, um zwischen Community und Home zu wechseln. Probier’s jetzt.',
                es: 'Desliza de lado desde el borde de la pantalla para pasar entre Comunidad e Inicio. Pruébalo ahora.'
            }
        },
        {
            id: 'pinch-galaxy', area: 'together', target: null, covers: [], teaches: ['pinch-galaxy'],
            title: { en: 'Pinch into the galaxy', de: 'In die Galaxie zoomen', es: 'Pellizca hacia la galaxia' },
            text: {
                en: 'Another way: on Home, pinch two fingers together past the widest view and you land in the Community galaxy. Spread two fingers there to come back.',
                de: 'Noch ein Weg: Schieb auf Home zwei Finger zusammen, über die weiteste Ansicht hinaus, dann landest du in der Community-Galaxie. Zieh dort zwei Finger auseinander, um zurückzukommen.',
                es: 'Otra forma: en Inicio, junta dos dedos más allá de la vista más amplia y llegas a la galaxia de Comunidad. Separa dos dedos allí para volver.'
            }
        },
        {
            id: 'settings', area: 'settings', target: ['#whHud .o8-settings'], covers: ['settings', 'theme', 'language'], teaches: ['community-hold'], tryIt: { how: 'hold' },
            title: { en: 'Community and Settings', de: 'Community und Einstellungen', es: 'Comunidad y Ajustes' },
            text: {
                en: 'Now hold the Community bubble for a second. Settings opens: day or night, sounds, language and your account. Close it to come back here.',
                de: 'Jetzt halt die Community-Blase kurz gedrückt. Die Einstellungen gehen auf: Tag oder Nacht, Töne, Sprache und dein Konto. Schließ sie, dann geht’s hier weiter.',
                es: 'Ahora mantén pulsada la burbuja Comunidad un segundo. Se abren los Ajustes: día o noche, sonidos, idioma y tu cuenta. Ciérralos para volver aquí.'
            }
        },
        {
            id: 'theme', area: 'settings', target: ['#tbTheme'], covers: ['day-night'], teaches: ['theme-tap', 'theme-triple'],
            title: { en: 'Day or night', de: 'Tag oder Nacht', es: 'Día o noche' },
            text: {
                en: 'Tap the moon or sun at the top to switch between day and night. Tap it three times quickly to fine-tune how bright it is.',
                de: 'Tipp oben auf Mond oder Sonne, um zwischen Tag und Nacht zu wechseln. Tipp dreimal schnell, um die Helligkeit fein einzustellen.',
                es: 'Toca la luna o el sol de arriba para cambiar entre día y noche. Tócalo tres veces rápido para ajustar el brillo.'
            }
        },
        {
            id: 'settings-me', area: 'settings', target: ['#whHud .o8-settings'], covers: ['me', 'look', 'account', 'deleteAccount'],
            title: { en: 'You and your account', de: 'Du und dein Konto', es: 'Tú y tu cuenta' },
            text: {
                en: 'In Community, tap your picture for your profile, Weight & BMI and the extras. Its gear opens Settings too. In Settings, Account signs you in or out, and Delete account removes it for good.',
                de: 'Tipp in der Community auf dein Bild für dein Profil, Gewicht & BMI und die Extras. Das Zahnrad dort öffnet auch die Einstellungen. Dort meldest du dich unter Konto an oder ab, und Konto löschen entfernt es endgültig.',
                es: 'En Comunidad, toca tu foto para tu perfil, Peso e IMC y los extras. Su engranaje también abre los Ajustes. En Ajustes, Cuenta inicia o cierra tu sesión, y Eliminar cuenta la borra para siempre.'
            }
        },
        {
            id: 'body', area: 'settings', target: ['#whHud .o8-settings'], covers: ['body', 'weight', 'bmi'],
            title: { en: 'Weight & BMI', de: 'Gewicht & BMI', es: 'Peso e IMC' },
            text: {
                en: 'In Community, your picture opens Weight & BMI, where you weigh in. You get your BMI, an estimate of your body fat, and a Then and Now picture that levels up as you make progress.',
                de: 'In der Community öffnet dein Bild Gewicht & BMI, dort trägst du dein Gewicht ein. Du bekommst deinen BMI, eine Schätzung deines Körperfetts und ein Damals-und-Jetzt-Bild, das mit deinem Fortschritt im Level steigt.',
                es: 'En Comunidad, tu foto abre Peso e IMC, donde te pesas. Ves tu IMC, una estimación de tu grasa corporal y una imagen de Antes y Ahora que sube de nivel con tu progreso.'
            }
        },
        {
            id: 'settings-more', area: 'settings', target: ['#whHud .o8-settings'], covers: ['care', 'workouts', 'foryou', 'hunt'],
            title: { en: 'Explore', de: 'Entdecken', es: 'Explorar' },
            text: {
                en: 'Under Explore in your Community profile: For You, the Care board, Workouts for whole training sessions, the World map, Gift of the day and the Shopping hunt.',
                de: 'Unter Entdecken in deinem Community-Profil: Für dich, das Care-Board, Workouts für ganze Trainings, die Weltkarte, das Tagesgeschenk und die Einkaufsjagd.',
                es: 'En Explorar, dentro de tu perfil de Comunidad: Para ti, el tablero Care, Entrenos para sesiones completas, el mapa del mundo, el regalo del día y la Caza de compras.'
            }
        },
        {
            id: 'tutorial', area: 'settings', target: ['#whHud .o8-settings'], covers: ['tutorial'],
            title: { en: 'This tour, any time', de: 'Diese Tour, jederzeit', es: 'Este recorrido, cuando quieras' },
            text: {
                en: 'Tutorial is in Settings too: hold Community, then tap Tutorial whenever you want to see this tour again.',
                de: 'Das Tutorial ist auch in den Einstellungen: Halte Community und tipp auf Tutorial, wann immer du diese Tour nochmal sehen willst.',
                es: 'El tutorial también está en Ajustes: mantén Comunidad y toca Tutorial cuando quieras volver a ver este recorrido.'
            }
        },
        /* ---------- part: extras (things that show up on their own) ---------- */
        {
            id: 'sheets', area: 'extras', target: null, covers: [], teaches: ['sheet-drag', 'back-swipe'],
            title: { en: 'Closing things', de: 'Dinge schließen', es: 'Cerrar cosas' },
            text: {
                en: 'To close a window that slid up, drag the little bar at its top down. Or swipe in from the left edge of the screen to go back.',
                de: 'Um ein Fenster zu schließen, das hochgefahren ist, zieh den kleinen Balken oben nach unten. Oder wisch vom linken Bildschirmrand rein, um zurückzugehen.',
                es: 'Para cerrar una ventana que subió, arrastra hacia abajo la barrita de arriba. O desliza desde el borde izquierdo de la pantalla para volver.'
            }
        },
        {
            /* Oct 21: the bottom menu bar is gone; every page has an X at the top left and the left-edge swipe */
            id: 'back-x', area: 'extras', target: null, covers: ['back-x'],
            title: { en: 'Back to Home', de: 'Zurück zu Home', es: 'Volver a Inicio' },
            text: {
                en: 'There is no menu bar. On any page, tap the X at the top left or swipe in from the left edge, and Home comes back right away, exactly as you left it.',
                de: 'Es gibt keine Menüleiste. Tipp auf jeder Seite oben links auf das X oder wisch vom linken Rand rein, und Home ist sofort wieder da, genau so, wie du es verlassen hast.',
                es: 'No hay barra de menú. En cualquier página, toca la X de arriba a la izquierda o desliza desde el borde izquierdo, y vuelves al instante a Inicio, tal como lo dejaste.'
            }
        },
        {
            id: 'cook-swipe', area: 'extras', target: null, covers: [], teaches: ['cook-swipe', 'foryou-swipe'],
            title: { en: 'Meal ideas', de: 'Essensideen', es: 'Ideas de comida' },
            text: {
                en: 'In Fuel, Cook has meal ideas. In Swipe, swipe the cards sideways to go through them. For You is a feed: swipe up and down.',
                de: 'In Fuel hat Kochen Essensideen. Bei Swipe wischst du die Karten zur Seite, um sie durchzugehen. Für dich ist ein Feed: wisch nach oben und unten.',
                es: 'En Fuel, Cocinar tiene ideas de comida. En Swipe, desliza las tarjetas de lado para verlas. Para ti es un feed: desliza arriba y abajo.'
            }
        },
        {
            id: 'visits', area: 'extras', target: null, covers: ['home-visit'], teaches: ['visit-reply'],
            title: { en: 'Visitors', de: 'Besuch', es: 'Visitas' },
            text: {
                en: 'Sometimes a friend’s companion visits your Home with a message. Tap Reply to answer them.',
                de: 'Manchmal besucht dich der Begleiter von jemandem auf Home mit einer Nachricht. Tipp auf Antworten, um zurückzuschreiben.',
                es: 'A veces el compañero de un amigo visita tu Inicio con un mensaje. Toca Responder para contestar.'
            }
        },
        {
            id: 'day-card', area: 'extras', target: null, covers: ['day-card'], teaches: [],
            title: { en: 'The Day card', de: 'Die Tageskarte', es: 'La tarjeta del día' },
            text: {
                en: 'The first time you open me each day, a Day card shows which day you’re on and one goal for today. Tap Let’s go to close it.',
                de: 'Wenn du mich jeden Tag zum ersten Mal öffnest, zeigt eine Tageskarte deinen Tag und ein Ziel für heute. Tipp auf Los geht’s, um sie zu schließen.',
                es: 'La primera vez que me abres cada día, una tarjeta muestra en qué día vas y una meta para hoy. Toca ¡Vamos! para cerrarla.'
            }
        },
        {
            id: 'whats-new', area: 'extras', target: null, covers: ['whats-new', 'update'],
            title: { en: 'What’s new', de: 'Was ist neu', es: 'Novedades' },
            text: {
                en: 'When an update is ready, a banner says New version, tap it to update. After that I tell you once what’s new.',
                de: 'Wenn ein Update bereit ist, erscheint ein Banner „Neue Version“. Tipp drauf zum Aktualisieren. Danach sag ich dir einmal, was neu ist.',
                es: 'Cuando hay una actualización, aparece un aviso de Nueva versión. Tócalo para actualizar. Después te cuento una vez las novedades.'
            }
        },
        {
            id: 'done', area: 'end', target: null, covers: [],
            title: { en: 'That’s everything', de: 'Das war alles', es: 'Eso es todo' },
            text: {
                en: 'You’re all set. Start small: a glass of water, then log your next meal. When something new arrives, I add it to this tour.',
                de: 'Du bist startklar. Fang klein an: ein Glas Wasser, dann deine nächste Mahlzeit eintragen. Wenn etwas Neues kommt, nehme ich es in diese Tour auf.',
                es: 'Ya está todo listo. Empieza poco a poco: un vaso de agua y luego registra tu próxima comida. Cuando llegue algo nuevo, lo añado a este recorrido.'
            },
            cta: { en: 'Done', de: 'Fertig', es: 'Listo' }
        }
    ];
    /* features that exist but need no step of their own (say why) */
    const NO_TUTORIAL = {
        gift: 'Gift of the day announces itself on Home when there is one; nothing to learn',
        weather: 'Weather is a read-only extra in Settings; self-explanatory'
    };

    /* Every gesture the app answers to (Oct 21 2026 audit). src: the files whose handlers do it; the test checks they exist and
       that every gesture handler the code scan finds sits in one of these files or in GESTURE_EXEMPT. how: tap, hold, drag,
       pinch, double, triple, swipe, push or tilt. Each id must be in some step's teaches. */
    const G = (id, where, how, src, what) => ({ id, where, how, src, what });
    const GESTURES = [
        G('misty-tap', 'home', 'tap', ['body-world-3d.js'], 'tap Misty: she plays'),
        G('misty-hold', 'home', 'hold', ['body-world-3d.js', 'world-home.js'], 'hold Misty: her card (energy, forms, Evolution path, home)'),
        G('misty-squish', 'home', 'hold', ['herb-touch.js', 'spirit.js', 'living-bubbles.js'], 'press Misty: her bubble squishes under your finger'),
        G('misty-turn', 'home', 'drag', ['misty-turn.js'], 'drag starting on Misty: she turns'),
        G('ring-still', 'home', 'hold', ['sym-home.js', 'home-orbit-v2.js'], 'touch an orbiting bubble: the ring stops'),
        G('water-tap', 'home', 'tap', ['home-blooms-v2.js'], 'tap Water: +1 cup, Undo'),
        G('water-hold', 'home', 'hold', ['world-home.js'], 'hold Water: today\'s water back to 0'),
        G('fuel-tap', 'home', 'tap', ['home-blooms-v2.js'], 'tap Fuel: Log meal, Cook, Shop'),
        G('fuel-hold', 'home', 'hold', ['home-blooms-v2.js'], 'hold Fuel: Log meal opens'),
        G('move-tap', 'home', 'tap', ['home-blooms-v2.js', 'move-bubble.js'], 'tap Move: Quick, Medium, Long, Epic'),
        G('move-hold', 'home', 'hold', ['home-blooms-v2.js', 'move-bubble.js'], 'hold Move: the Move page (workouts, Care board, edit today\'s moves)'),
        G('gap-tap', 'home', 'tap', ['home-blooms-v2.js', 'fast-bubble.js'], 'tap Gap: the Gap view'),
        G('sleep-tap', 'home', 'tap', ['home-settings-sleep-v2.js'], 'tap Sleep: how long did you sleep'),
        G('scan-tap', 'home', 'tap', ['home-orbit-v2.js'], 'tap Scan: the Scan screen'),
        G('community-tap', 'home', 'tap', ['home-settings-sleep-v2.js'], 'tap Community: Community'),
        G('community-hold', 'home', 'hold', ['home-settings-sleep-v2.js'], 'hold Community: slim Settings'),
        G('theme-tap', 'home', 'tap', ['top-bar.js'], 'tap the moon/sun: day or night'),
        G('theme-triple', 'home', 'triple', ['top-bar.js', 'atmosphere.js'], 'tap the moon/sun three times: Day & night adjuster'),
        G('world-drag', 'home', 'drag', ['body-world-3d.js', 'world-home.js', 'body-world-3d-scene.js'], 'drag the world: look around'),
        G('world-pinch', 'home', 'pinch', ['body-world-3d.js'], 'pinch: zoom in and out'),
        G('map-button', 'home', 'tap', ['world-home.js'], 'tap the zoom button: World map and back'),
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
        G('pinch-galaxy', 'home', 'pinch', ['galaxy-zoom.js'], 'pinch in past the widest view: Community galaxy; spread: back'),
        G('back-swipe', 'any', 'swipe', ['back-swipe.js', 'section-nav.js'], 'swipe in from the left edge: back'),
        G('sheet-drag', 'any', 'drag', ['apple-ui.js'], 'drag a sheet\'s top bar down: close it'),
        G('cm-tabs', 'community', 'tap', ['community-rooms-ui.js'], 'tap Room, Chat, Creation, Affiliates'),
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
        G('foryou-swipe', 'home', 'swipe', ['nav-moves.js', 'fy-embed.js'], 'For You: swipe up and down'),
        G('visit-reply', 'home', 'tap', ['home-visit.js'], 'a visiting companion: tap Reply')
    ];
    /* files the gesture scan matches that teach nothing new, with the reason */
    const GESTURE_EXEMPT = {
        'mirror-move.js': 'camera workout: it tells you each move out loud while you do it',
        'mirror-move-core.js': 'camera workout: it tells you each move out loud while you do it',
        'community-energy-core.js': 'math for the energy joystick taught by cm-energy',
        'finch-extras.js': 'only watches touches to retire a first-use hint; it adds no gesture of its own',
        'misty-bloom.js': 'only remembers where a finger touched so a panel can grow out of that spot; no gesture of its own',
        'tutorial.js': 'the tour itself: it watches try-it gestures passively and never adds one'
    };
    /* which detected gesture satisfies a tryIt.how (a swipe is also a drag) */
    function tryMatch(how, kind) { return how === kind || (how === 'drag' && kind === 'swipe'); }

    const UI = {
        en: { next: 'Next', back: 'Back', skip: 'Skip', skipAll: 'Skip all', of: '{i} of {n}', label: 'Tutorial', guide: 'Your companion', tryIt: 'Try it now', nice: 'Nice, that’s it.', pause: 'Pause', play: 'Play',
            peek: { title: 'Scan a barcode', aim: 'Hold the barcode inside the frame', field: 'Barcode number', barcode: 'Barcode', deep: 'Deep analyze', deepS: 'Opens the LOWiSPIKE GPT in ChatGPT', note: 'A look inside. The camera stays off.' },
            areas: { you: 'Me', home: 'Your day', food: 'Scan', play: 'Flying', companion: 'My card', together: 'Community', settings: 'Settings', extras: 'Good to know', end: 'Done' } },
        de: { next: 'Weiter', back: 'Zurück', skip: 'Überspringen', skipAll: 'Alles überspringen', of: '{i} von {n}', label: 'Tutorial', guide: 'Dein Begleiter', tryIt: 'Probier’s jetzt', nice: 'Super, genau so.', pause: 'Pause', play: 'Abspielen',
            peek: { title: 'Barcode scannen', aim: 'Halte den Barcode in den Rahmen', field: 'Barcode-Nummer', barcode: 'Barcode', deep: 'Deep analyze', deepS: 'Öffnet den LOWiSPIKE GPT in ChatGPT', note: 'Ein Blick hinein. Die Kamera bleibt aus.' },
            areas: { you: 'Ich', home: 'Dein Tag', food: 'Scan', play: 'Fliegen', companion: 'Meine Karte', together: 'Community', settings: 'Einstellungen', extras: 'Gut zu wissen', end: 'Fertig' } },
        es: { next: 'Siguiente', back: 'Atrás', skip: 'Saltar', skipAll: 'Saltar todo', of: '{i} de {n}', label: 'Tutorial', guide: 'Tu compañero', tryIt: 'Pruébalo ahora', nice: 'Bien, así es.', pause: 'Pausa', play: 'Reproducir',
            peek: { title: 'Escanear código', aim: 'Pon el código dentro del marco', field: 'Número del código', barcode: 'Código', deep: 'Deep analyze', deepS: 'Abre el GPT de LOWiSPIKE en ChatGPT', note: 'Un vistazo dentro. La cámara sigue apagada.' },
            areas: { you: 'Yo', home: 'Tu día', food: 'Scan', play: 'Volar', companion: 'Mi tarjeta', together: 'Comunidad', settings: 'Ajustes', extras: 'Bueno saber', end: 'Listo' } }
    };

    /* pure helpers (tests + tutorial.js) */
    const L = l => (l === 'de' || l === 'es') ? l : 'en';
    const fill = (s, v) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null ? String(v[k]) : m));
    function text(step, field, lang, vars) { const o = step && step[field]; if (!o) return ''; return fill(o[L(lang)] || o.en, vars); }
    /* the steps this person gets: condition names are resolved by ctx (e.g. { claimReady: true }) */
    function plan(ctx) { const c = ctx || {}; return STEPS.filter(s => !s.when || !!c[s.when]); }
    /* Skip: jump past the rest of this step's area */
    function skipIndex(list, i) { const a = list[i] && list[i].area; let j = i + 1; while (j < list.length && list[j].area === a) j++; return j; }
    function covered() { const m = {}; STEPS.forEach(s => (s.covers || []).forEach(f => { m[f] = s.id; })); Object.keys(NO_TUTORIAL).forEach(f => { if (!m[f]) m[f] = 'none'; }); return m; }
    /* a news.json / version.json news entry's tutorial field: a step id that exists, or {none: 'reason'} */
    function newsOk(tut) {
        if (typeof tut === 'string') return STEPS.some(s => s.id === tut);
        return !!(tut && typeof tut === 'object' && typeof tut.none === 'string' && tut.none.trim().length >= 8);
    }

    /* GESTURES id -> the step id that teaches it */
    function taught() { const m = {}; STEPS.forEach(s => (s.teaches || []).forEach(g => { if (!m[g]) m[g] = s.id; })); return m; }

    const api = { VERSION, AREAS, STEPS, NO_TUTORIAL, GESTURES, GESTURE_EXEMPT, UI, text, fill, plan, skipIndex, covered, newsOk, tryMatch, taught };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiTutorialSteps = api;
})(typeof window !== 'undefined' ? window : null);
