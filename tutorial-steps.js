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
    const VERSION = 2;
    const AREAS = ['you', 'home', 'food', 'play', 'together', 'settings', 'end'];
    const STEPS = [
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
                en: 'I live here on Home and I mirror how you take care of yourself. Tap me to play. Hold me to open my card.',
                de: 'Ich wohne hier auf Home und spiegle, wie du auf dich achtest. Tipp mich an zum Spielen. Halt mich gedrückt für meine Karte.',
                es: 'Vivo aquí en Inicio y reflejo cómo te cuidas. Tócame para jugar. Manténme pulsado para abrir mi tarjeta.'
            }
        },
        {
            id: 'energy', area: 'you', target: ['[data-home-misty]', '#spBubble'], covers: ['energy'],
            title: { en: 'My energy', de: 'Meine Energie', es: 'Mi energía' },
            text: {
                en: 'What you track today fills my energy: water, meals, moves and sleep. At 100% I fly faster and my trail turns gold. Below half I’m too tired to get into worlds.',
                de: 'Was du heute einträgst, füllt meine Energie: Wasser, Essen, Bewegung und Schlaf. Bei 100 % fliege ich schneller und meine Spur wird golden. Unter der Hälfte bin ich zu müde für die Welten.',
                es: 'Lo que registras hoy llena mi energía: agua, comidas, movimiento y sueño. Al 100 % vuelo más rápido y mi estela se vuelve dorada. Por debajo de la mitad estoy demasiado cansado para entrar en los mundos.'
            }
        },
        {
            id: 'gap', area: 'home', target: ['#spFast'], covers: ['gap'],
            title: { en: 'Gap', de: 'Gap', es: 'Gap' },
            text: {
                en: 'Gap counts the hours since your last real meal. It shows a dash until your first meal. Tap it, then I just ate or Ate earlier.',
                de: 'Gap zählt die Stunden seit deiner letzten echten Mahlzeit. Bis zur ersten Mahlzeit steht dort ein Strich. Tipp drauf und sag, wann du zuletzt gegessen hast.',
                es: 'Gap cuenta las horas desde tu última comida de verdad. Muestra un guion hasta tu primera comida. Tócalo para decir cuándo comiste por última vez.'
            }
        },
        {
            id: 'fuel', area: 'home', target: ['#whHud .wh-meals'], covers: ['fuel', 'log-meal'],
            title: { en: 'Fuel and Log meal', de: 'Essen und Mahlzeit eintragen', es: 'Comida y registrar comida' },
            text: {
                en: 'Tap Fuel for Log meal, Shop and Cook. In Log meal, type what you ate, like “chicken stew”, or tap a recent meal. I fill in calories, protein, carbs, fat, fiber and sugar.',
                de: 'Tipp auf Essen für Mahlzeit eintragen, Einkaufen und Kochen. Tipp dort ein, was du gegessen hast, etwa „Hühnereintopf“, oder wähl eine letzte Mahlzeit. Die Nährwerte trage ich ein.',
                es: 'Toca Comida para Registrar comida, Comprar y Cocinar. Escribe lo que comiste, como “guiso de pollo”, o toca una comida reciente. Yo relleno calorías, proteína, carbohidratos, grasa, fibra y azúcar.'
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
            id: 'move', area: 'home', target: ['#whHud .wh-move'], covers: ['move', 'workouts'],
            title: { en: 'Move', de: 'Bewegung', es: 'Movimiento' },
            text: {
                en: 'Tap Move after anything active and pick Quick, Medium, Long or Epic. Whole workouts are under Settings, Workouts.',
                de: 'Tipp nach allem Aktiven auf Bewegung und wähl kurz, mittel, lang oder episch. Ganze Trainings findest du unter Einstellungen, Workouts.',
                es: 'Toca Movimiento después de algo activo y elige corto, medio, largo o épico. Los entrenamientos completos están en Ajustes, Entrenos.'
            }
        },
        {
            id: 'sleep', area: 'home', target: ['#whHud .o8-sleep'], covers: ['sleep'],
            title: { en: 'Sleep', de: 'Schlaf', es: 'Sueño' },
            text: {
                en: 'Once a day, tell me how long you slept last night. It stays private on your account.',
                de: 'Einmal am Tag sagst du mir, wie lange du letzte Nacht geschlafen hast. Das bleibt privat in deinem Konto.',
                es: 'Una vez al día, dime cuánto dormiste anoche. Se queda privado en tu cuenta.'
            }
        },
        {
            id: 'scan', area: 'food', target: ['#whHud .o8-scan'], covers: ['scan', 'snap-food', 'barcode', 'photo-checks'],
            title: { en: 'Scan and Snap food', de: 'Scannen und Essen fotografieren', es: 'Escanear y foto de comida' },
            text: {
                en: 'Scan reads a product’s barcode. Snap food looks at a photo of your plate and fills in the name and the numbers for you, three photo checks a day. Meal lets you type it instead, as often as you like.',
                de: 'Scannen liest den Barcode eines Produkts. „Essen fotografieren“ schaut sich ein Foto deines Tellers an und trägt Name und Werte für dich ein, drei Foto-Checks pro Tag. Bei „Mahlzeit“ tippst du es einfach ein, so oft du willst.',
                es: 'Escanear lee el código de barras de un producto. Foto de comida mira una foto de tu plato y rellena el nombre y los números por ti, tres fotos al día. En Comida puedes escribirlo, todas las veces que quieras.'
            }
        },
        {
            id: 'joystick', area: 'play', target: ['#whPad'], covers: ['joy', 'autopilot'],
            title: { en: 'Fly me', de: 'Lass mich fliegen', es: 'Hazme volar' },
            text: {
                en: 'Drag the joystick to fly me. Hold the middle to go forward, tap then hold to go back. Three quick taps turn on autopilot and I go exploring on my own.',
                de: 'Zieh am Joystick, um mich fliegen zu lassen. Halt die Mitte für vorwärts, tipp und halt für zurück. Dreimal schnell tippen schaltet den Autopiloten an, dann erkunde ich allein.',
                es: 'Arrastra el joystick para hacerme volar. Mantén el centro para avanzar, toca y mantén para retroceder. Tres toques rápidos activan el piloto automático y exploro por mi cuenta.'
            }
        },
        {
            id: 'worlds', area: 'play', target: ['#whHud .wh-zoom', '#whPad'], covers: ['worlds', 'map', 'vr', 'worldSound', 'spirit-world'],
            title: { en: 'Worlds', de: 'Welten', es: 'Mundos' },
            text: {
                en: 'Fly me into a glowing bubble to visit a body world: lungs, brain, gut, muscle and more. Out in space I can ride the strings of the spirit world. The World map takes you straight to any world.',
                de: 'Flieg mich in eine leuchtende Blase, um eine Körperwelt zu besuchen: Lunge, Gehirn, Darm, Muskeln und mehr. Draußen im All kann ich auf den Saiten der Geisterwelt reiten. Die Weltkarte bringt dich direkt in jede Welt.',
                es: 'Llévame a una burbuja brillante para visitar un mundo del cuerpo: pulmones, cerebro, intestino, músculo y más. En el espacio puedo montar las cuerdas del mundo espíritu. El mapa del mundo te lleva directo a cualquier mundo.'
            }
        },
        {
            id: 'forms', area: 'play', target: ['[data-home-misty]', '#spBubble'], covers: ['forms', 'evolution'],
            title: { en: 'Forms', de: 'Formen', es: 'Formas' },
            text: {
                en: 'Hold me, then tap Forms to see how I evolve the longer you keep going.',
                de: 'Halt mich gedrückt und tipp auf Formen, dann siehst du, wie ich mich entwickle, je länger du dranbleibst.',
                es: 'Manténme pulsado y toca Formas para ver cómo evoluciono cuanto más sigas.'
            }
        },
        {
            id: 'community', area: 'together', target: ['#whHud .o8-settings'], covers: ['community', 'community-chat'],
            title: { en: 'Community', de: 'Community', es: 'Comunidad' },
            text: {
                en: 'Settings, Community is where you meet everyone else. Share a meal, and tap Chat for the community room.',
                de: 'Unter Einstellungen, Community triffst du alle anderen. Teile eine Mahlzeit und tipp auf Chat für den Community-Raum.',
                es: 'En Ajustes, Comunidad conoces a todos los demás. Comparte una comida y toca Chat para la sala de la comunidad.'
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
            id: 'settings', area: 'settings', target: ['#whHud .o8-settings'], covers: ['settings', 'me', 'look', 'account', 'menubar', 'tutorial', 'care'],
            title: { en: 'Settings', de: 'Einstellungen', es: 'Ajustes' },
            text: {
                en: 'Settings has you, look and sound, your account, the menu bar, the care board and everything else. Tutorial is in here too, so you can replay this tour any time.',
                de: 'In den Einstellungen findest du dich, Aussehen und Ton, dein Konto, die Menüleiste, das Care-Board und alles andere. Auch das Tutorial ist hier, damit du diese Tour jederzeit wiederholen kannst.',
                es: 'En Ajustes están tu perfil, aspecto y sonido, tu cuenta, la barra de menú, el tablero Care y todo lo demás. El tutorial también está aquí, para repetir este recorrido cuando quieras.'
            }
        },
        {
            id: 'done', area: 'end', target: null, covers: [],
            title: { en: 'That’s everything', de: 'Das war alles', es: 'Eso es todo' },
            text: {
                en: 'You’re all set. When something new arrives, I add it to this tour, so it’s always up to date.',
                de: 'Du bist startklar. Wenn etwas Neues kommt, nehme ich es in diese Tour auf, damit sie immer aktuell ist.',
                es: 'Ya está todo listo. Cuando llegue algo nuevo, lo añado a este recorrido, así siempre está al día.'
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
