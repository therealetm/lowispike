/* tutorial-steps.js: THE one data file of the replayable tutorial (Oct 19 2026, Emmanuel: "There should be a tutorial button
   ... our companion takes you through everything from the beginning, as if you were new ... with every new update, the tutorial
   also needs to be updated"). tutorial.js only plays what is written here; nothing about the tour's content lives anywhere else.

   KEEP IT CURRENT (TUTORIAL.md, AGENTS.md, RELEASE.md):
   - Every release's news.json carries "tutorial": "<step id>" (that step explains it; update its text when the feature changed)
     or "tutorial": {"none": "why no step is needed"}. scripts/bump-build.cjs refuses a release without it.
   - Every Home ring control (home-orbit-v2.js ORDER) and every Settings row (home-settings-sleep-v2.js pageGroups + MORE) is in
     some step's `covers` or in NO_TUTORIAL with a reason. tests/tutorial-steps.test.cjs fails otherwise.
   - When you change a step, bump VERSION.

   Step fields:
     id       unique, lower-case
     area     steps of one area are skipped together by "Skip" (Skip all ends the tour)
     target   CSS selectors tried in order; the first one that is on screen gets the spotlight. No target: a centred card.
     when     optional condition name, evaluated by tutorial.js (claimReady: no own companion AND LowiBirthCompanion.claim exists)
     action   optional: 'claim' opens the claim-your-own-companion step (built by the own-companion task, not here)
     covers   feature ids this step explains (ring controls, Settings rows, other features)
     title / text / cta   { en, de, es }; {name} is the companion's name */
(function (root) {
    'use strict';
    const VERSION = 5;
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
            id: 'touch', area: 'you', target: ['[data-home-misty]', '#spBubble'], covers: ['companion-card'],
            title: { en: 'Tap or hold me', de: 'Tipp oder halt mich', es: 'Tócame o mantenme' },
            text: {
                en: 'Tap me to play. Hold me to open my card: my energy, my forms and my home are all in there.',
                de: 'Tipp mich an zum Spielen. Halt mich gedrückt für meine Karte: Da sind meine Energie, meine Formen und mein Zuhause.',
                es: 'Tócame para jugar. Mantenme pulsado para abrir mi tarjeta: ahí están mi energía, mis formas y mi casa.'
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
            id: 'bubbles', area: 'home', target: null, covers: ['home-ring'],
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
                en: 'Gap counts the hours since your last real meal. It shows a dash until your first meal.',
                de: 'Gap zählt die Stunden seit deiner letzten echten Mahlzeit. Bis zur ersten Mahlzeit steht dort ein Strich.',
                es: 'Gap cuenta las horas desde tu última comida de verdad. Muestra un guion hasta tu primera comida.'
            }
        },
        {
            id: 'gap-tap', area: 'home', target: ['#spFast'], covers: ['fasting'],
            title: { en: 'Starting the clock', de: 'Die Uhr starten', es: 'Poner el reloj' },
            text: {
                en: 'Tap Gap and say when you last ate: I just ate, or Ate earlier. Logging a meal does the same: it starts the clock, or ends a running fast with its points.',
                de: 'Tipp auf Gap und sag, wann du zuletzt gegessen hast: gerade eben oder früher. Eine eingetragene Mahlzeit macht dasselbe: Sie startet die Uhr oder beendet ein laufendes Fasten mit seinen Punkten.',
                es: 'Toca Gap y di cuándo comiste por última vez: ahora mismo o antes. Registrar una comida hace lo mismo: pone el reloj en marcha o termina un ayuno en curso con sus puntos.'
            }
        },
        {
            id: 'fuel', area: 'home', target: ['#whHud .wh-meals'], covers: ['fuel', 'cook', 'shop'],
            title: { en: 'Fuel', de: 'Essen', es: 'Comida' },
            text: {
                en: 'Fuel is everything about food. Log meal is for what you ate, Shop checks products in the shop and keeps your list, Cook has meal ideas.',
                de: 'Essen ist alles rund ums Essen. Mahlzeit eintragen ist für das, was du gegessen hast, Einkaufen prüft Produkte im Laden und führt deine Liste, Kochen hat Ideen fürs Essen.',
                es: 'Comida es todo lo relacionado con comer. Registrar comida es para lo que comiste, Comprar revisa productos en la tienda y guarda tu lista, Cocinar tiene ideas de comidas.'
            }
        },
        {
            id: 'log-meal', area: 'home', target: ['#whHud .wh-meals'], covers: ['log-meal'],
            title: { en: 'Log meal', de: 'Mahlzeit eintragen', es: 'Registrar comida' },
            text: {
                en: 'Eating? Log meal is the one place for it: snap a photo, type what you ate, like “chicken stew”, or tap a recent meal. I fill in the numbers, and saving ends your fast with its points.',
                de: 'Du isst? Mahlzeit eintragen ist der eine Ort dafür: Foto machen, eintippen, etwa „Hühnereintopf“, oder eine letzte Mahlzeit wählen. Die Werte trage ich ein, und Speichern beendet dein Fasten mit seinen Punkten.',
                es: '¿Comiendo? Registrar comida es el único sitio: haz una foto, escribe lo que comiste, como “guiso de pollo”, o toca una comida reciente. Yo relleno los números y al guardar termina tu ayuno con sus puntos.'
            }
        },
        {
            id: 'water', area: 'home', target: ['#whHud .wh-water'], covers: ['water', 'hydration'],
            title: { en: 'Water', de: 'Wasser', es: 'Agua' },
            text: {
                en: 'Tap Water, then +1 cup each time you drink. Undo takes one back if you tapped by mistake.',
                de: 'Tipp auf Wasser und dann +1 Becher, wann immer du trinkst. Rückgängig nimmt einen zurück, falls du dich vertippt hast.',
                es: 'Toca Agua y luego +1 vaso cada vez que bebas. Deshacer quita uno si te equivocaste.'
            }
        },
        {
            id: 'move', area: 'home', target: ['#whHud .wh-move'], covers: ['move'],
            title: { en: 'Move', de: 'Bewegung', es: 'Movimiento' },
            text: {
                en: 'Tap Move after anything active, a walk, stairs, dancing, and pick Quick, Medium, Long or Epic.',
                de: 'Tipp nach allem Aktiven auf Bewegung, ob Spaziergang, Treppen oder Tanzen, und wähl kurz, mittel, lang oder episch.',
                es: 'Toca Movimiento después de algo activo, un paseo, escaleras, bailar, y elige corto, medio, largo o épico.'
            }
        },
        {
            id: 'sleep', area: 'home', target: ['#whHud .o8-sleep'], covers: ['sleep'],
            title: { en: 'Sleep', de: 'Schlaf', es: 'Sueño' },
            text: {
                en: 'Once a day, tap Sleep and tell me how last night went: slept well, okay or a short night. It stays private on your account.',
                de: 'Einmal am Tag tippst du auf Schlaf und sagst mir, wie die Nacht war: gut, okay oder kurz. Das bleibt privat in deinem Konto.',
                es: 'Una vez al día, toca Sueño y dime qué tal la noche: bien, regular o corta. Se queda privado en tu cuenta.'
            }
        },
        /* ---------- part: food (scan and photos) ---------- */
        {
            id: 'scan', area: 'food', target: ['#whHud .o8-scan'], covers: ['scan', 'barcode'],
            title: { en: 'Scan', de: 'Scannen', es: 'Escanear' },
            text: {
                en: 'Tap Scan and point it at a product’s barcode. I read what’s inside and how it fits your day.',
                de: 'Tipp auf Scannen und halt es auf den Barcode eines Produkts. Ich lese, was drin ist und wie es zu deinem Tag passt.',
                es: 'Toca Escanear y apunta al código de barras de un producto. Leo lo que lleva y cómo encaja en tu día.'
            }
        },
        {
            id: 'snap', area: 'food', target: ['#whHud .o8-scan'], covers: ['snap-food'],
            title: { en: 'Snap food', de: 'Essen fotografieren', es: 'Foto de comida' },
            text: {
                en: 'Snap is inside Log meal (in Fuel, and in Scan next to Barcode): pick the meal, tap Snap. The spike answer comes first, then each food on its own card. Tap one to fix it, then log it.',
                de: 'Foto steckt in Mahlzeit eintragen (unter Essen und in Scannen): Mahlzeit wählen, Foto tippen. Zuerst kommt die Spike-Antwort, dann jedes Essen als Karte. Antippen zum Korrigieren, dann eintragen.',
                es: 'La foto está en Registrar comida (en Comida y en Escanear): elige la comida y toca Foto. Primero va la respuesta del pico, luego cada alimento en su tarjeta. Toca uno para corregirlo y regístrala.'
            }
        },
        {
            id: 'photo-checks', area: 'food', target: ['#whHud .o8-scan'], covers: ['photo-checks'],
            title: { en: '3 photo checks a day', de: '3 Foto-Checks am Tag', es: '3 fotos al día' },
            text: {
                en: 'Everyone gets 3 photo checks a day, and new ones come at midnight. Typing what you ate always works, as often as you like.',
                de: 'Jeder hat 3 Foto-Checks am Tag, neue gibt es um Mitternacht. Eintippen, was du gegessen hast, geht immer, so oft du willst.',
                es: 'Todos tienen 3 fotos al día, y a medianoche llegan nuevas. Escribir lo que comiste siempre funciona, todas las veces que quieras.'
            }
        },
        /* ---------- part: play (flying and worlds) ---------- */
        {
            id: 'joystick', area: 'play', target: ['#whPad'], covers: ['joy'],
            title: { en: 'Fly me', de: 'Lass mich fliegen', es: 'Hazme volar' },
            text: {
                en: 'This is the joystick. Drag it and I fly where you point.',
                de: 'Das ist der Joystick. Zieh daran und ich fliege dahin, wo du hinzeigst.',
                es: 'Este es el joystick. Arrástralo y vuelo hacia donde apuntes.'
            }
        },
        {
            id: 'joystick-hold', area: 'play', target: ['#whPad'], covers: ['joy-hold'],
            title: { en: 'Forward and back', de: 'Vor und zurück', es: 'Adelante y atrás' },
            text: {
                en: 'Hold the middle of the joystick to go forward. Tap, then hold, to go back.',
                de: 'Halt die Mitte des Joysticks für vorwärts. Tipp und halt dann für rückwärts.',
                es: 'Mantén el centro del joystick para avanzar. Toca y luego mantén para retroceder.'
            }
        },
        {
            id: 'autopilot', area: 'play', target: ['#whPad'], covers: ['autopilot'],
            title: { en: 'Autopilot', de: 'Autopilot', es: 'Piloto automático' },
            text: {
                en: 'Tap the joystick three times quickly and autopilot turns on. Then I go exploring on my own.',
                de: 'Tipp dreimal schnell auf den Joystick und der Autopilot geht an. Dann erkunde ich alles allein.',
                es: 'Toca el joystick tres veces rápido y se activa el piloto automático. Entonces exploro por mi cuenta.'
            }
        },
        {
            id: 'zoom', area: 'play', target: ['#whHud .wh-zoom', '#whPad'], covers: ['zoom', 'map'],
            title: { en: 'Zoom and World map', de: 'Zoom und Weltkarte', es: 'Zoom y mapa' },
            text: {
                en: 'Pinch to zoom in and out. The World map shows every world at once and takes you straight to the one you pick.',
                de: 'Zieh mit zwei Fingern, um zu zoomen. Die Weltkarte zeigt alle Welten auf einmal und bringt dich direkt in die, die du wählst.',
                es: 'Pellizca para acercar y alejar. El mapa del mundo muestra todos los mundos a la vez y te lleva directo al que elijas.'
            }
        },
        {
            id: 'fly-out', area: 'play', target: ['[data-home-misty]', '#spBubble'], covers: ['fly-out'],
            title: { en: 'Out of my bubble', de: 'Raus aus meiner Blase', es: 'Fuera de mi burbuja' },
            text: {
                en: 'Fly me out of my bubble and into space. Out there, every glowing bubble is a world you can visit.',
                de: 'Flieg mich aus meiner Blase hinaus ins All. Da draußen ist jede leuchtende Blase eine Welt, die du besuchen kannst.',
                es: 'Sácame de mi burbuja y llévame al espacio. Ahí fuera, cada burbuja brillante es un mundo que puedes visitar.'
            }
        },
        {
            id: 'worlds', area: 'play', target: ['#whHud .wh-zoom', '#whPad'], covers: ['worlds'],
            title: { en: 'Worlds', de: 'Welten', es: 'Mundos' },
            text: {
                en: 'Fly into a glowing bubble to visit a body world: lungs, brain, gut, muscle and more.',
                de: 'Flieg in eine leuchtende Blase, um eine Körperwelt zu besuchen: Lunge, Gehirn, Darm, Muskeln und mehr.',
                es: 'Vuela dentro de una burbuja brillante para visitar un mundo del cuerpo: pulmones, cerebro, intestino, músculo y más.'
            }
        },
        {
            id: 'world-energy', area: 'play', target: ['[data-home-misty]', '#spBubble'], covers: ['half-energy'],
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
            id: 'vr-sound', area: 'play', target: ['#whHud .o8-settings'], covers: ['vr', 'worldSound'],
            title: { en: 'VR and world sound', de: 'VR und Weltklang', es: 'RV y sonido' },
            text: {
                en: 'In Settings, VR shows the worlds in a headset, and World sound gives every world its own sound.',
                de: 'In den Einstellungen zeigt VR die Welten in einer Brille, und Weltklang gibt jeder Welt ihren eigenen Klang.',
                es: 'En Ajustes, RV muestra los mundos en unas gafas, y Sonido del mundo da a cada mundo su propio sonido.'
            }
        },
        /* ---------- part: companion (forms and home) ---------- */
        {
            id: 'forms', area: 'companion', target: ['[data-home-misty]', '#spBubble'], covers: ['forms', 'evolution'],
            title: { en: 'Forms', de: 'Formen', es: 'Formas' },
            text: {
                en: 'Hold me, then tap Forms to see how I evolve the longer you keep going.',
                de: 'Halt mich gedrückt und tipp auf Formen, um zu sehen, wie ich mich entwickle, je länger du dranbleibst.',
                es: 'Mantenme pulsado y toca Formas para ver cómo evoluciono cuanto más constante seas.'
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
            id: 'community', area: 'together', target: ['#whHud .o8-settings'], covers: ['community'],
            title: { en: 'Community', de: 'Community', es: 'Comunidad' },
            text: {
                en: 'Community is where you meet everyone else and their companions. It’s in Settings, under Everything else.',
                de: 'In der Community triffst du alle anderen und ihre Begleiter. Du findest sie in den Einstellungen unter Alles andere.',
                es: 'En Comunidad conoces a todos los demás y a sus compañeros. Está en Ajustes, en Todo lo demás.'
            }
        },
        {
            id: 'post', area: 'together', target: ['#whHud .o8-settings'], covers: ['community-post'],
            title: { en: 'Share a meal', de: 'Mahlzeit teilen', es: 'Comparte una comida' },
            text: {
                en: 'Post a photo of your meal so everyone can see what you’re eating. Photo posts use the same 3 photo checks a day.',
                de: 'Teil ein Foto deiner Mahlzeit, damit alle sehen, was du isst. Foto-Posts nutzen dieselben 3 Foto-Checks am Tag.',
                es: 'Publica una foto de tu comida para que todos vean lo que comes. Las fotos usan las mismas 3 fotos al día.'
            }
        },
        {
            id: 'chat', area: 'together', target: ['#whHud .o8-settings'], covers: ['community-chat'],
            title: { en: 'Community chat', de: 'Community-Chat', es: 'Chat de la comunidad' },
            text: {
                en: 'Tap Chat in Community to open your room of up to 30 people. At the top, Room shows the galaxy game and Chat shows the messages; tap the room chip to find someone and join their room.',
                de: 'Tipp in der Community auf Chat, um deinen Raum mit bis zu 30 Personen zu öffnen. Oben zeigt Raum das Galaxie-Spiel und Chat die Nachrichten; tipp auf das Raum-Schild, um jemanden zu finden und seinem Raum beizutreten.',
                es: 'Toca Chat en Comunidad para abrir tu sala de hasta 30 personas. Arriba, Sala muestra el juego de la galaxia y Chat los mensajes; toca la etiqueta de la sala para buscar a alguien y unirte a su sala.'
            }
        },
        {
            id: 'send-energy', area: 'together', target: ['#whHud .o8-settings'], covers: ['community-energy'],
            title: { en: 'Send energy', de: 'Energie schicken', es: 'Enviar energía' },
            text: {
                en: 'In the Community galaxy, pull the small blue joystick to aim me, then let go. Whoever my energy burst hits gets energy, never damage. They roll like a billiard ball, knock into others and stay where they stop.',
                de: 'Zieh in der Community-Galaxie am kleinen blauen Joystick, um mich zu zielen, und lass los. Wen mein Energiestoß trifft, der bekommt Energie, nie Schaden. Er rollt wie eine Billardkugel, stößt andere an und bleibt da, wo er anhält.',
                es: 'En la galaxia de la Comunidad, tira del pequeño joystick azul para apuntarme y suelta. A quien alcance mi energía recibe energía, nunca daño. Rueda como una bola de billar, choca con otros y se queda donde se detiene.'
            }
        },
        /* ---------- part: settings ---------- */
        {
            id: 'settings', area: 'settings', target: ['#whHud .o8-settings'], covers: ['settings'],
            title: { en: 'Settings', de: 'Einstellungen', es: 'Ajustes' },
            text: {
                en: 'Tap Settings for everything that isn’t a bubble. Here’s what’s inside.',
                de: 'Tipp auf Einstellungen für alles, was keine Blase ist. Das hier ist drin.',
                es: 'Toca Ajustes para todo lo que no es una burbuja. Esto es lo que hay dentro.'
            }
        },
        {
            id: 'settings-me', area: 'settings', target: ['#whHud .o8-settings'], covers: ['me', 'look', 'account'],
            title: { en: 'Me, Look & sound, Account', de: 'Ich, Aussehen & Ton, Konto', es: 'Yo, Aspecto y sonido, Cuenta' },
            text: {
                en: 'Me is your profile. Look & sound changes colors, day or night and sound. Account keeps you signed in on any phone.',
                de: 'Ich ist dein Profil. Aussehen & Ton ändert Farben, Tag oder Nacht und Ton. Konto hält dich auf jedem Handy angemeldet.',
                es: 'Yo es tu perfil. Aspecto y sonido cambia colores, día o noche y sonido. Cuenta te mantiene conectado en cualquier móvil.'
            }
        },
        {
            id: 'body', area: 'settings', target: ['#whHud .o8-settings'], covers: ['body', 'weight', 'bmi'],
            title: { en: 'Weight & BMI', de: 'Gewicht & BMI', es: 'Peso e IMC' },
            text: {
                en: 'In Settings, Weight & BMI is where you weigh in. You get your BMI, an estimate of your body fat, and a Then and Now picture that levels up as you make progress.',
                de: 'Unter Einstellungen, Gewicht & BMI trägst du dein Gewicht ein. Du bekommst deinen BMI, eine Schätzung deines Körperfetts und ein Damals-und-Jetzt-Bild, das mit deinem Fortschritt im Level steigt.',
                es: 'En Ajustes, Peso e IMC es donde te pesas. Ves tu IMC, una estimación de tu grasa corporal y una imagen de Antes y Ahora que sube de nivel con tu progreso.'
            }
        },
        {
            id: 'menubar', area: 'settings', target: ['#whHud .o8-settings'], covers: ['menubar'],
            title: { en: 'Menu bar', de: 'Menüleiste', es: 'Barra de menú' },
            text: {
                en: 'Menu bar turns a bar on or off at the bottom of the screen, if you like having every section one tap away.',
                de: 'Menüleiste schaltet eine Leiste unten am Bildschirm an oder aus, falls du jeden Bereich mit einem Tipp erreichen willst.',
                es: 'Barra de menú activa o quita una barra abajo en la pantalla, por si quieres cada sección a un toque.'
            }
        },
        {
            id: 'settings-more', area: 'settings', target: ['#whHud .o8-settings'], covers: ['care', 'workouts'],
            title: { en: 'Everything else', de: 'Alles andere', es: 'Todo lo demás' },
            text: {
                en: 'Everything else holds Community, the Care board, Workouts for whole training sessions, the World map, VR and more.',
                de: 'Unter Alles andere findest du Community, das Care-Board, Workouts für ganze Trainings, die Weltkarte, VR und mehr.',
                es: 'En Todo lo demás están Comunidad, el tablero Care, Entrenos para sesiones completas, el mapa del mundo, RV y más.'
            }
        },
        {
            id: 'tutorial', area: 'settings', target: ['#whHud .o8-settings'], covers: ['tutorial'],
            title: { en: 'This tour, any time', de: 'Diese Tour, jederzeit', es: 'Este recorrido, cuando quieras' },
            text: {
                en: 'Tutorial is in Settings too. Tap it whenever you want to see this tour again.',
                de: 'Das Tutorial ist auch in den Einstellungen. Tipp drauf, wann immer du diese Tour nochmal sehen willst.',
                es: 'El tutorial también está en Ajustes. Tócalo cuando quieras volver a ver este recorrido.'
            }
        },
        /* ---------- part: extras (things that show up on their own) ---------- */
        {
            id: 'day-card', area: 'extras', target: null, covers: ['day-card'],
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
    const UI = {
        en: { next: 'Next', back: 'Back', skip: 'Skip', skipAll: 'Skip all', of: '{i} of {n}', label: 'Tutorial', guide: 'Your companion' },
        de: { next: 'Weiter', back: 'Zurück', skip: 'Überspringen', skipAll: 'Alles überspringen', of: '{i} von {n}', label: 'Tutorial', guide: 'Dein Begleiter' },
        es: { next: 'Siguiente', back: 'Atrás', skip: 'Saltar', skipAll: 'Saltar todo', of: '{i} de {n}', label: 'Tutorial', guide: 'Tu compañero' }
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

    const api = { VERSION, AREAS, STEPS, NO_TUTORIAL, UI, text, fill, plan, skipIndex, covered, newsOk };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiTutorialSteps = api;
})(typeof window !== 'undefined' ? window : null);
