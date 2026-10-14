/* One herb, one bubble, one XP ledger. Existing scanners, collections and sheets are reused. */
(function() {
    'use strict';
    const D = document,
        K = window.LowiSpiritCore,
        T = window.LowiHerbTamagotchi,
        R = window.LowiR2,
        V = window.LowiVitalsBridge;
    if (!K || !T || !R || !V || window.LowiSpirit) return;
    const esc = R.esc || ((s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } [c])));
    const lang = () => {
        try {
            return (LowiLang.get() || 'en').slice(0, 2);
        } catch (e) {
            return (D.documentElement.lang || 'en').slice(0, 2);
        }
    };
    const copy = {
        world: ['Your herb’s world', 'Die Welt deines Krauts', 'El mundo de tu hierba'],
        scanHead: ['Scan · your herb is watching', 'Scannen · dein Kraut schaut zu', 'Escanear · tu hierba mira'],
        close: ['Close', 'Schließen', 'Cerrar'],
        scan: ['Scan a product', 'Produkt scannen', 'Escanear producto'],
        photo: ['Snap food', 'Essen fotografieren', 'Fotografiar comida'],
        meal: ['Log a meal', 'Mahlzeit eintragen', 'Registrar comida'],
        water: ['Log water', 'Wasser eintragen', 'Registrar agua'],
        wardrobe: ['Wardrobe', 'Kleiderschrank', 'Armario'],
        collection: ['Collection', 'Sammlung', 'Colección'],
        profile: ['Your herb', 'Dein Kraut', 'Tu hierba'],
        evolution: ['Evolution', 'Entwicklung', 'Evolución'],
        healthy: ['Bright and awake', 'Frisch und wach', 'Fresca y despierta'],
        tired: ['Leaves need a drink', 'Die Blätter brauchen Wasser', 'Las hojas necesitan agua'],
        rest: ['Resting for tomorrow', 'Ruht für morgen', 'Descansa para mañana'],
        next: ['Log water or your next meal.', 'Trag Wasser oder dein nächstes Essen ein.', 'Registra agua o tu próxima comida.'],
        nextFresh: ['Capture something for us.', 'Fang etwas für uns ein.', 'Captura algo para nosotros.'],
        xp: ['XP', 'XP', 'XP'],
        yesterday: ['Yesterday-you', 'Gestern-Du', 'Tu yo de ayer'],
        today: ['Today-you', 'Heute-Du', 'Tu yo de hoy'],
        tomorrow: ['Tomorrow-you', 'Morgen-Du', 'Tu yo de mañana'],
        focus: ['One meal, one glass.', 'Ein Essen, ein Glas.', 'Una comida, un vaso.'],
        future: ['Choose tomorrow’s meal.', 'Wähle dein Essen für morgen.', 'Elige la comida de mañana.'],
        start: ['A fresh start', 'Ein neuer Anfang', 'Un nuevo comienzo'],
        meals: ['meals logged', 'Mahlzeiten eingetragen', 'comidas registradas'],
        meal1: ['meal logged', 'Mahlzeit eingetragen', 'comida registrada'],
        drink: ['Glass logged. I drink with you!', 'Glas eingetragen. Ich trinke mit!', 'Vaso registrado. ¡Bebo contigo!'],
        waterSaved: ['Water logged', 'Wasser eingetragen', 'Agua registrada'],
        captured: ['Caught for your herb', 'Für dein Kraut eingefangen', 'Capturado para tu hierba'],
        glow: ['Caught! My leaves are glowing.', 'Eingefangen! Meine Blätter leuchten.', '¡Capturado! Mis hojas brillan.'],
        scanOk: ['Yes, I like this one! Likely only a small spike.', 'Ja, das mag ich! Wahrscheinlich nur ein kleiner Spike.', '¡Sí, me gusta! Probablemente solo un pico pequeño.'],
        scanBetter: ['Hmm, okay now and then. Pair it with protein or fiber.', 'Hmm, ab und zu okay. Am besten mit Eiweiß oder Ballaststoffen.', 'Hmm, de vez en cuando. Mejor con proteína o fibra.'],
        scanSpike: ['Oof, my leaves droop. Likely a big spike, check the swaps.', 'Uff, meine Blätter hängen. Wahrscheinlich ein großer Spike, schau dir die Tauschideen an.', 'Uf, mis hojas caen. Probablemente un pico grande, mira los cambios.'],
        photoTitle: ['Your photo', 'Dein Foto', 'Tu foto'],
        savePhoto: ['Save photo', 'Foto speichern', 'Guardar foto'],
        photoSaved: ['Photo ready', 'Foto bereit', 'Foto lista'],
        photoGptHint: ['Save it, then upload it in the LOWiSPIKE GPT for a deeper analysis or to create content.', 'Speichere es und lade es dann im LOWiSPIKE GPT hoch, für eine tiefere Analyse oder für Inhalte.', 'Guárdala y súbela al GPT de LOWiSPIKE para un análisis más profundo o para crear contenido.'],
        photoLog: ['Log as meal', 'Als Mahlzeit eintragen', 'Registrar comida'],
        photoName: ['What is it?', 'Was ist das?', '¿Qué es?'],
        funny: ['My leaves raised an eyebrow. Fancy a swap?', 'Meine Blätter ziehen eine Augenbraue hoch. Lust auf einen Tausch?', 'Mis hojas alzaron una ceja. ¿Probamos un cambio?'],
        unknown: ['Let’s take a closer look at the label.', 'Schauen wir uns das Etikett genauer an.', 'Veamos la etiqueta de cerca.'],
        gpt: ['Deeper analysis & create content', 'Tiefer analysieren & Inhalte erstellen', 'Analizar más y crear contenido'],
        gptSub: ['Open LOWiSPIKE GPT', 'LOWiSPIKE GPT öffnen', 'Abrir LOWiSPIKE GPT'],
        macro: ['Your meal’s macros', 'Makros deiner Mahlzeit', 'Macros de tu comida'],
        protein: ['Protein', 'Protein', 'Proteína'],
        fiber: ['Fiber', 'Ballaststoffe', 'Fibra'],
        sugar: ['Sugar', 'Zucker', 'Azúcar'],
        carbs: ['Carbs', 'Kohlenhydrate', 'Carbohidratos'],
        fat: ['Fat', 'Fett', 'Grasa'],
        kcal: ['Calories', 'Kalorien', 'Calorías'],
        missing: ['Not provided', 'Nicht angegeben', 'No disponible'],
        portion: ['For the portion you ate', 'Für deine gegessene Portion', 'Para la porción que comiste'],
        title: ['What did you eat?', 'Was hast du gegessen?', '¿Qué comiste?'],
        save: ['Log & feed my herb', 'Eintragen & mein Kraut füttern', 'Registrar y alimentar mi hierba'],
        addMacros: ['Add macros', 'Makros ergänzen', 'Añadir macros'],
        saved: ['Meal logged', 'Mahlzeit eingetragen', 'Comida registrada'],
        camera: ['Take photo', 'Foto aufnehmen', 'Hacer foto'],
        upload: ['Choose a photo', 'Foto auswählen', 'Elegir foto'],
        noCamera: ['Camera unavailable. Choose a photo instead.', 'Kamera nicht verfügbar. Wähle ein Foto.', 'Cámara no disponible. Elige una foto.'],
        cameraDenied: ['Camera access wasn’t allowed. You can choose a photo.', 'Kamerazugriff wurde nicht erlaubt. Du kannst ein Foto auswählen.', 'No se permitió la cámara. Puedes elegir una foto.'],
        name: ['Name', 'Name', 'Nombre'],
        birthday: ['Birthday', 'Geburtsdatum', 'Fecha de nacimiento'],
        personality: ['Personality', 'Persönlichkeit', 'Personalidad'],
        setup: ['Find my personality', 'Meine Persönlichkeit finden', 'Encontrar mi personalidad'],
        rename: ['Save', 'Speichern', 'Guardar'],
        sign: ['Star sign', 'Sternzeichen', 'Signo'],
        yourPick: ['Your pick', 'Dein Treffer', 'Tu elección'],
        ingredients: ['Ingredients', 'Zutaten', 'Ingredientes'],
        why: ['Why this pick', 'Warum dieser Treffer', 'Por qué esta elección'],
        whyText: ['A recipe from your current food picks. Check the ingredients and portion to make it yours.', 'Ein Rezept aus deinen aktuellen Essensideen. Prüfe Zutaten und Portion für dich.', 'Una receta de tus ideas actuales. Revisa los ingredientes y la porción.'],
        cook: ['Cook it', 'Kochen', 'Cocinar'],
        logPick: ['I ate this', 'Hab ich gegessen', 'Lo he comido'],
        herbTip: ['Your herb suggests', 'Dein Kraut schlägt vor', 'Tu hierba sugiere'],
        doneToday: ['Logged today', 'Heute eingetragen', 'Registrado hoy'],
        scanAgain: ['Scanned today already, no new XP', 'Heute schon gescannt, keine neuen XP', 'Ya escaneado hoy, sin XP nuevos'],
        scanCap: ['Scan XP for today is full', 'Scan-XP für heute voll', 'XP de escaneo de hoy completos'],
        why_protein: ['lots of protein for your goal', 'viel Protein für dein Ziel', 'mucha proteína para tu meta'],
        why_lowSugar: ['almost no sugar', 'kaum Zucker', 'casi sin azúcar'],
        why_fiber: ['fibre feeds your gut', 'Ballaststoffe für deinen Darm', 'fibra para tu intestino'],
        why_quick: ['quick to make', 'schnell gemacht', 'rápido de hacer'],
        minutes: ['min', 'Min.', 'min'],
        estimated: ['Estimated per portion from the ingredients.', 'Pro Portion aus den Zutaten geschätzt.', 'Estimado por porción a partir de los ingredientes.'],
        prev: ['Back', 'Zurück', 'Atrás'],
        forward: ['Next', 'Weiter', 'Siguiente'],
        mystery: ['Sealed until you evolve', 'Versiegelt bis zur Entwicklung', 'Sellada hasta la evolución'],
        goals: ['My macro goals', 'Meine Makroziele', 'Mis objetivos de macros'],
        setGoals: ['Save goals', 'Ziele speichern', 'Guardar objetivos'],
        bonus: ['Goal reached. A special glow!', 'Ziel erreicht. Ein besonderes Leuchten!', 'Objetivo alcanzado. ¡Un brillo especial!'],
        completeDay: ['Finish today', 'Heute abschließen', 'Cerrar hoy'],
        sugarNote: ['Sugar is checked when you finish the day, with macros for every meal.', 'Zucker wird beim Tagesabschluss geprüft, mit Makros für jede Mahlzeit.', 'El azúcar se revisa al cerrar el día, con macros de todas las comidas.'],
        premium: ['Premium · coming soon', 'Premium · bald verfügbar', 'Premium · próximamente'],
        equipped: ['Wearing', 'Ausgewählt', 'Puesto'],
        capturing: ['Capturing…', 'Wird eingefangen…', 'Capturando…'],
        cancel: ['Back to my herb', 'Zurück zu meinem Kraut', 'Volver a mi hierba'],
        ends: ['Ends', 'Ende', 'Termina'],
        goal: ['of', 'von', 'de'],
        fast: ['Fasting', 'Fasten', 'Ayuno'],
        noFast: ['Start a fast', 'Fasten starten', 'Empezar ayuno'],
        storage: ['Could not save. Please free some space and try again.', 'Speichern nicht möglich. Schaffe etwas Platz und versuche es erneut.', 'No se pudo guardar. Libera espacio e inténtalo de nuevo.'],
        emptyCollection: ['Capture your first product.', 'Fang dein erstes Produkt ein.', 'Captura tu primer producto.'],
        leafHelp: ['Drag to throw. Hold to squeeze. Use two fingers to stretch.', 'Ziehen zum Werfen. Halten zum Drücken. Mit zwei Fingern dehnen.', 'Arrastra para lanzar. Mantén para apretar. Usa dos dedos para estirar.'],
        todayLog: ['Today', 'Heute', 'Hoy'],
        recent: ['Eaten recently · one tap', 'Zuletzt gegessen · ein Tipp', 'Comido hace poco · un toque'],
        recentEmpty: ['Snap or scan your meal, or type it in below.', 'Fotografiere oder scanne dein Essen, oder trag es unten ein.', 'Fotografía o escanea tu comida, o escríbela abajo.'],
        oneTap: ['Log again', 'Nochmal eintragen', 'Registrar de nuevo'],
        manual: ['Manual', 'Manuell', 'Manual'],
        waterLabel: ['Water', 'Wasser', 'Agua'],
        glasses: ['glasses', 'Gläser', 'vasos'],
        mealLabel: ['Food', 'Essen', 'Comida'],
        mealOne: ['meal', 'Mahlzeit', 'comida'],
        mealMany: ['meals', 'Mahlzeiten', 'comidas'],
        mealNone: ['Nothing yet', 'Noch nichts', 'Nada aún'],
        moveLabel: ['Move', 'Bewegung', 'Movimiento'],
        moveDone: ['Done', 'Erledigt', 'Hecho'],
        moveOpen: ['Still open', 'Noch offen', 'Pendiente'],
        checkLabel: ['Check-in', 'Check-in', 'Check-in'],
        checkOpen: ['How are you?', 'Wie geht’s dir?', '¿Cómo estás?'],
        goalReached: ['Goal reached', 'Ziel erreicht', 'Objetivo logrado'],
        since: ['at', 'um', 'a las'],
        weatherOn: ['Weather', 'Wetter', 'Tiempo'],
        left: ['left', 'übrig', 'restante'],
        macroOptional: ['Optional: use the label or your own portion values. Empty stays unknown.', 'Optional: Werte vom Etikett oder für deine Portion. Leer bleibt unbekannt.', 'Opcional: usa la etiqueta o tus valores de porción. Vacío sigue desconocido.']
    };
    const tr = k => (copy[k] || [k])[{
        de: 1,
        es: 2
    } [lang()] || 0] || (copy[k] || [k])[0];
    const stage = m => m.current.name[{
            de: 1,
            es: 2
        } [lang()] || 0],
        reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    const icon = K.icon,
        get = () => T.current(),
        uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    if (!D.getElementById('wdCss')) {
        const l = D.createElement('link');
        l.id = 'wdCss';
        l.rel = 'stylesheet';
        l.href = 'wardrobe.css?v=' + encodeURIComponent((D.querySelector('meta[name=lowi-build]') || {}).content || '1');
        D.head.append(l);
    }
    let home = null,
        world = null,
        creature = null,
        signature = '',
        opened = false,
        capture = false,
        photoStream = null,
        photoURL = '',
        lastMealId = '',
        homeQueued = false;
    let motion = {
            p: 0,
            v: 0,
            target: 0,
            raf: 0,
            last: 0,
            origin: null
        },
        touch = null,
        feedbackTimer = 0,
        refreshTimer = 0,
        ownedSheet = null;

    function name() {
        const {
            p,
            m
        } = get();
        return T.name(p, m);
    }

    const WATER_GOAL = 8;
    const locale = () => ({
        de: 'de-DE',
        es: 'es-ES'
    } [lang()] || 'en-GB');
    const clock = t => new Intl.DateTimeFormat(locale(), {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).format(new Date(t));

    function today(s, now) {
        s = s || V.state();
        now = now || new Date();
        const key = K.day(now);
        let f = {};
        try {
            f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}');
        } catch (e) {}
        const water = +(f.water && f.water[key]) || 0,
            meals = (s.logs || []).filter(l => (l.day || K.day(l.ts)) === key).length,
            start = new Date(now).setHours(0, 0, 0, 0),
            led = (s.ledger || s.xpLog || []).filter(e => +e.ts >= start),
            moved = led.some(e => /move|walk|workout|steps|dance/i.test((e.src || '') + ' ' + (e.label || ''))),
            scanned = led.some(e => /scan|capture|product/i.test((e.src || '') + ' ' + (e.label || '')));
        const tile = D.querySelector('#g2hTiles [data-g2h-open="morn"] small'),
            checkin = tile ? (tile.textContent || '').trim() : '';
        return {
            key,
            water,
            meals,
            moved,
            scanned,
            checkin
        };
    }

    function statusModel(m, v, day) {
        const n = name(),
            de = lang() === 'de',
            es = lang() === 'es';
        const L = (en, d, e) => de ? d : es ? e : en;
        const pick = (action, ic, button) => ({
            action,
            icon: ic,
            button
        });
        let mood = 'fresh',
            title = L(n + ' is bright and awake', n + ' ist frisch und wach', n + ' está fresca y despierta'),
            sub = '',
            next;
        if (v.dry > .55) {
            mood = 'dry';
            title = L(n + ' is thirsty and tired', n + ' ist durstig und schlapp', n + ' tiene sed y está cansada');
            sub = L('One glass brings the leaves back', 'Ein Glas bringt die Blätter zurück', 'Un vaso le devuelve las hojas');
            next = pick('water', 'water', L('Drink water', 'Wasser trinken', 'Beber agua'));
        } else if (v.dry > .2) {
            mood = 'thirsty';
            title = L(n + ' is getting thirsty', n + ' bekommt Durst', n + ' empieza a tener sed');
            sub = L('Water or food perks it up', 'Wasser oder Essen macht sie munter', 'Agua o comida la animan');
            next = pick('water', 'water', L('Drink water', 'Wasser trinken', 'Beber agua'));
        } else if (m.period === 'night') {
            mood = 'night';
            title = L(n + ' is sleeping', n + ' schläft', n + ' duerme');
            sub = L('Your XP is safe', 'Deine XP sind sicher', 'Tus XP están a salvo');
            next = pick('open', 'moon', L('Say goodnight', 'Gute Nacht sagen', 'Dar las buenas noches'));
        }
        if (!next) {
            if (!day.meals) {
                sub = L('Feeds your herb +15 XP', 'Füttert dein Kraut +15 XP', 'Alimenta tu hierba +15 XP');
                next = pick('meal', 'plate', L('Log meal', 'Essen eintragen', 'Registrar comida'));
            } else if (day.water < WATER_GOAL) {
                sub = L('Keeps the leaves fresh +2 XP', 'Hält die Blätter frisch +2 XP', 'Mantiene las hojas frescas +2 XP');
                next = pick('water', 'water', L('Drink water', 'Wasser trinken', 'Beber agua'));
            } else if (!day.moved) {
                sub = L('A few minutes give energy', 'Ein paar Minuten geben Energie', 'Unos minutos dan energía');
                next = pick('move', 'move', L('Move', 'Bewegen', 'Moverse'));
            } else if (!day.scanned) {
                sub = L('New card for your collection', 'Neue Karte für die Sammlung', 'Nueva carta para tu colección');
                next = pick('scan', 'scan', L('Scan', 'Scannen', 'Escanear'));
            } else {
                mood = 'glow';
                title = L(n + ' is glowing', n + ' leuchtet', n + ' brilla');
                sub = L('All done today', 'Heute alles geschafft', 'Todo hecho hoy');
                next = pick('wardrobe', 'hat', L('Wardrobe', 'Kleiderschrank', 'Armario'));
            }
        }
        return {
            mood,
            title,
            sub,
            ...next
        };
    }

    function button(k, symbol, action, attrs = '') {
        return '<button type="button" data-sp="' + action + '" ' + attrs + '>' + icon(symbol) + '<span>' + esc(tr(k)) + '</span></button>';
    }

    function xpHTML(m) {
        return '<div class="sp-xp"><span>' + esc(stage(m)) + '</span><b>' + Math.floor(m.xp) + ' XP</b><div role="progressbar" aria-label="XP" aria-valuenow="' + Math.round(m.progress * 100) + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + Math.round(m.progress * 100) + '%"></i></div></div>';
    }

    function ensure() {
        if (!home || !home.isConnected) {
            const tab = D.getElementById('tab-home');
            if (!tab) return;
            home = D.createElement('section');
            home.id = 'spHome';
            home.className = 'rs-cols';
            home.setAttribute('data-noi18n', '');
            home.innerHTML = '<header class="sp-top"><div class="sp-greeting"><span></span><small></small></div><button type="button" class="sp-weather" data-sp="weather"></button></header><div class="sp-heroes"><button id="spBubble" class="sp-bubble" data-sp="open" aria-label="' + esc(tr('world')) + '"><span class="sp-bubble-water"></span><span class="sp-home-herb"></span><span class="sp-bubble-name"></span></button><button id="spFast" class="sp-fast" data-sp="fast"><span class="sp-fast-water"></span><span class="sp-fast-copy"></span></button></div><div class="sp-status"><i class="sp-status-dot" aria-hidden="true"></i><div><b></b><span></span></div><button type="button" class="sp-next" data-sp="water"></button></div><section class="sp-log"><header><b></b><div class="sp-habits" aria-label="Habit tracker"></div></header><div class="sp-log-rows"></div></section>';
            tab.prepend(home);
            /* Oct 14: a rebuilt Home (after Community etc.) paints the weather pill from the cached reading right away */
            paintCachedWeather();
        }
        if (!world) {
            world = D.createElement('section');
            world.id = 'spWorld';
            world.hidden = true;
            world.setAttribute('role', 'dialog');
            world.setAttribute('aria-modal', 'true');
            world.setAttribute('aria-label', tr('world'));
            world.setAttribute('data-noi18n', '');
            world.innerHTML = '<header class="sp-world-head"><div><small><span class="sp-head-world">' + esc(tr('world')) + '</span><span class="sp-head-scan">' + esc(tr('scanHead')) + '</span></small><h1></h1></div>' + button('close', 'close', 'close') + '</header><div class="sp-world-xp"></div><div class="sp-stage"><div class="sp-constellation"></div><div class="sp-scanner-host"></div><div class="sp-body" tabindex="0" role="button" aria-label="' + esc(tr('leafHelp')) + '"></div><p class="sp-speech" role="status" aria-live="polite"></p><span class="sp-xp-pop" aria-hidden="true"></span></div><p class="sp-play-hint">' + esc(tr('leafHelp')) + '</p><div class="sp-actions">' + button('scan', 'scan', 'scan') + button('photo', 'camera', 'photo') + button('meal', 'plate', 'meal') + button('water', 'water', 'water') + '</div><a class="sp-gpt" target="_blank" rel="noopener" href="' + esc(V.gpt) + '">' + icon('star') + '<span>' + esc(tr('gpt')) + '<small>' + esc(tr('gptSub')) + '</small></span>' + icon('arrow') + '</a><footer class="sp-world-tools">' + button('wardrobe', 'hat', 'wardrobe') + button('collection', 'book', 'collection') + button('profile', 'leaf', 'profile') + button('evolution', 'mystery', 'path') + '</footer>';
            D.body.append(world);
        }
        if (!creature) {
            creature = D.createElement('div');
            creature.className = 'sp-creature';
            creature.setAttribute('aria-label', tr('profile'));
        }
        const dock = D.getElementById('lhDock'),
            card = D.getElementById('tmgHomeCard'),
            old = D.getElementById('tmgScreen');
        if (dock) dock.remove();
        if (card) card.remove();
        if (old) old.remove();
        if (!creature.isConnected)(opened ? world.querySelector('.sp-body') : home.querySelector('.sp-home-herb')).append(creature);
    }

    function setText(n, v) {
        if (n && n.textContent !== String(v)) n.textContent = v;
    }

    function paint() {
        ensure();
        if (!home) return;
        const {
            m,
            p
        } = get(), s = V.state(), now = new Date(), v = K.vitality(s, p, now.getTime()), sig = [m.index, m.xp, JSON.stringify(p.equipment), m.profile.sign && m.profile.sign.name, m.profile.personality, name(), Math.round(v.dry * 10) / 10, m.period, lang()].join('|');
        if (sig !== signature) {
            signature = sig;
            creature.innerHTML = T.plantHTML({
                ...m,
                dim: v.dry > .25,
                mood: v.dry > .25 ? 'droopy' : m.mood
            }, 'hero', p);
            creature.style.setProperty('--sp-dry', v.dry);
            world.querySelector('.sp-world-xp').innerHTML = xpHTML(m);
            setText(world.querySelector('h1'), name());
            setText(home.querySelector('.sp-bubble-name'), name());
            [home, world].forEach(n => {
                n.style.setProperty('--tmg-a', m.profile.palette.a);
                n.style.setProperty('--tmg-b', m.profile.palette.b);
            });
        }
        const date = new Intl.DateTimeFormat(locale(), {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        }).format(now);
        setText(home.querySelector('.sp-greeting span'), 'Hey ' + (s.user.name || name()));
        setText(home.querySelector('.sp-greeting small'), date);
        const day = today(s, now),
            st = statusModel(m, v, day);
        home.dataset.mood = st.mood;
        setText(home.querySelector('.sp-status b'), st.title);
        setText(home.querySelector('.sp-status span'), st.sub);
        const nb = home.querySelector('.sp-next');
        if (nb.dataset.sp !== st.action) nb.dataset.sp = st.action;
        const nbh = icon(st.icon) + '<span>' + esc(st.button) + '</span>';
        if (nb.innerHTML !== nbh) nb.innerHTML = nbh;
        setText(home.querySelector('.sp-log header b'), tr('todayLog') + ' · ' + new Intl.DateTimeFormat(locale(), {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit'
        }).format(now));
        const row = (key, ic, label, value, done, action) => '<button type="button" class="sp-log-row' + (done ? ' done' : '') + '" data-sp="' + action + '" data-log="' + key + '"><i class="sp-bullet" aria-hidden="true"></i>' + icon(ic) + '<span><b>' + esc(label) + '</b><small>' + esc(value) + '</small></span></button>';
        const rows = row('water', 'water', tr('waterLabel'), day.water + ' / ' + WATER_GOAL + ' ' + tr('glasses'), day.water >= WATER_GOAL, 'water') + row('meal', 'plate', tr('mealLabel'), day.meals ? day.meals + ' ' + tr(day.meals === 1 ? 'mealOne' : 'mealMany') : tr('mealNone'), day.meals > 0, 'meal') + row('move', 'move', tr('moveLabel'), day.moved ? tr('moveDone') : tr('moveOpen'), day.moved, 'move') + row('checkin', 'check', tr('checkLabel'), day.checkin || tr('checkOpen'), /^(\d+)\/(\d+)/.test(day.checkin) && RegExp.$1 === RegExp.$2, 'checkin');
        const lr = home.querySelector('.sp-log-rows');
        if (lr.innerHTML !== rows) lr.innerHTML = rows;
        const days = Array.from({
            length: 7
        }, (_, i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - 6 + i);
            const key = K.day(d),
                done = s.streak && s.streak.days && s.streak.days[key] || (s.logs || []).some(l => (l.day || K.day(l.ts)) === key);
            return '<i class="' + (done ? 'on' : '') + '" title="' + key + '" aria-label="' + key + ' ' + (done ? '✓' : '—') + '"></i>';
        }).join('');
        const dots = home.querySelector('.sp-habits');
        if (dots.innerHTML !== days) dots.innerHTML = days;
        D.documentElement.dataset.spPeriod = m.period;
        paintFast();
        paintTiles();
        identityColors();
    }

    function refresh() {
        if (homeQueued) return;
        homeQueued = true;
        requestAnimationFrame(() => {
            homeQueued = false;
            paint();
        });
    }

    function paintTiles() {
        const s = V.state(),
            today = K.day(),
            tile = D.querySelector('#g2hTiles [data-g2h-open="plan"] small');
        const nMeals = (s.logs || []).filter(l => (l.day || K.day(l.ts)) === today).length;
        setText(tile, nMeals + ' ' + tr(nMeals === 1 ? 'meal1' : 'meals'));
    }

    function fastModel() {
        let f = {};
        try {
            f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}');
        } catch (e) {}
        const start = window.LowiFastStop && LowiFastStop.startOf ? +LowiFastStop.startOf() : +f.last || 0;
        let goal = +f.target || 16;
        try {
            goal = +LowiFE.target() || goal;
        } catch (e) {}
        const elapsed = start ? Math.max(0, Date.now() - start) : 0;
        return {
            start,
            goal,
            elapsed,
            pct: start ? Math.min(1, elapsed / (goal * 36e5)) : 0,
            end: start + goal * 36e5
        };
    }

    function paintFast() {
        const el = D.getElementById('spFast');
        if (!el) return;
        const f = fastModel(),
            hours = Math.floor(f.elapsed / 36e5),
            min = Math.floor(f.elapsed / 6e4) % 60;
        el.style.setProperty('--sp-fill', (f.pct * 100) + '%');
        el.classList.toggle('done', !!f.start && f.elapsed >= f.goal * 36e5);
        const reached = f.start && f.elapsed >= f.goal * 36e5;
        const h = f.start ? '<small>' + esc(tr('fast')) + '</small><b>' + hours + ' h ' + String(min).padStart(2, '0') + ' min</b><span>' + esc(tr('goal')) + ' ' + f.goal + ' h</span><small>' + (reached ? icon('check') + esc(tr('goalReached')) : esc(tr('ends')) + ' ' + clock(f.end)) + '</small>' : '<b>' + esc(tr('noFast')) + '</b>' + icon('clock');
        const t = el.querySelector('.sp-fast-copy');
        if (t.innerHTML !== h) t.innerHTML = h;
    }

    function expansion(target, instant) {
        motion.target = target;
        cancelAnimationFrame(motion.raf);
        clearTimeout(motion.guard);
        motion.last = 0;
        const render = () => {
            const r = motion.origin || {
                    left: 0,
                    top: 0,
                    width: innerWidth,
                    height: innerHeight
                },
                p = motion.p;
            world.style.transform = 'translate3d(' + (r.left * (1 - p)) + 'px,' + (r.top * (1 - p)) + 'px,0) scale(' + (r.width / innerWidth + (1 - r.width / innerWidth) * p) + ',' + (r.height / innerHeight + (1 - r.height / innerHeight) * p) + ')';
            world.style.opacity = String(Math.min(1, .5 + p));
        };
        const finish = () => {
            motion.p = target;
            motion.v = 0;
            render();
            cancelAnimationFrame(motion.raf);
            clearTimeout(motion.guard);
            world.style.transform = '';
            world.style.opacity = '';
            if (!target) {
                world.hidden = true;
                world.classList.remove('sp-capture');
                D.documentElement.classList.remove('herb-room', 'sp-open', 'sp-capturing');
                try {
                    ensure();
                    home.querySelector('.sp-home-herb').append(creature);
                } catch (e) {}
                if (!D.getElementById('tab-home')?.hidden) D.getElementById('spBubble')?.focus({
                    preventScroll: true
                });
            }
        };
        if (instant || reduced() || D.hidden) {
            finish();
            return;
        }
        if (!target && world.animate) {
            // Fast, compositor-only close: show Home underneath right away, then fade + shrink the world
            // uniformly toward the bubble (no per-frame JS, no stretched non-uniform scale, no late pop-in).
            const r = motion.origin || { left: innerWidth * .3, top: innerHeight * .3, width: innerWidth * .4, height: innerHeight * .4 },
                cx = r.left + r.width / 2,
                cy = r.top + r.height / 2,
                sc = Math.max(.12, Math.min(.6, r.width / innerWidth));
            D.documentElement.classList.remove('herb-room', 'sp-open', 'sp-capturing');
            try {
                ensure();
                home.querySelector('.sp-home-herb').append(creature);
            } catch (e) {}
            world.classList.add('sp-closing');
            world.style.transform = '';
            world.style.transformOrigin = cx + 'px ' + cy + 'px';
            world.style.willChange = 'transform, opacity';
            let done = false;
            const end = () => {
                if (done) return;
                done = true;
                clearTimeout(motion.guard);
                if (motion.target !== target) return;
                finish();
                world.classList.remove('sp-closing');
                world.style.transformOrigin = '';
                world.style.willChange = '';
                try { motion.anim && motion.anim.cancel(); } catch (e) {}
                motion.anim = null;
            };
            try { motion.anim && motion.anim.cancel(); } catch (e) {}
            motion.anim = world.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(' + sc + ')', opacity: 0 }], { duration: 230, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
            motion.anim.onfinish = end;
            motion.guard = setTimeout(end, 450);
            return;
        }
        try { motion.anim && motion.anim.cancel(); } catch (e) {}
        motion.anim = null;
        world.classList.remove('sp-closing');
        world.style.transformOrigin = '';
        // Safety net: whatever happens to animation frames, the world never stays half-visible.
        motion.guard = setTimeout(() => {
            if (motion.target === target) finish();
        }, 900);
        const tick = t => {
            const dt = motion.last ? Math.min(.025, (t - motion.last) / 1000) : 1 / 60;
            motion.last = t;
            motion.v += (-360 * (motion.p - motion.target) - 38 * motion.v) * dt;
            motion.p += motion.v * dt;
            render();
            if (Math.abs(motion.p - motion.target) < .001 && Math.abs(motion.v) < .008) finish();
            else motion.raf = requestAnimationFrame(tick);
        };
        motion.raf = requestAnimationFrame(tick);
    }

    function open(opts) {
        opts = opts || {};
        ensure();
        paint();
        if (!opened) {
            opened = true;
            const ob = D.getElementById('spBubble')?.getBoundingClientRect();
            motion.origin = ob && ob.width > 20 ? ob : {
                left: innerWidth * .3,
                top: innerHeight * .3,
                width: innerWidth * .4,
                height: innerHeight * .4
            };
            world.hidden = false;
            world.querySelector('.sp-body').append(creature);
            D.documentElement.classList.add('herb-room', 'sp-open');
            expansion(1);
            physics();
            world.querySelector('[data-sp="close"]').focus({
                preventScroll: true
            });
        }
        if (opts.capture && !opts.embedded) scan();
        return world;
    }

    function stopPhoto() {
        if (photoStream) photoStream.getTracks().forEach(t => t.stop());
        photoStream = null;
    }

    function cancelCapture() {
        stopPhoto();
        if (window.LowiDex && LowiDex.stop) LowiDex.stop();
        capture = false;
        world?.classList.remove('sp-capture');
        const h = world?.querySelector('.sp-scanner-host');
        if (h) h.innerHTML = '';
    }

    function close(instant) {
        if (!opened) {
            if (world && !world.hidden && motion.target === 0) expansion(0, true);
            return;
        }
        if (ownedSheet) {
            R.close(ownedSheet);
            ownedSheet = null;
        }
        cancelCapture();
        touch?.dispose();
        touch = null;
        opened = false;
        expansion(0, instant === true);
    }

    function scannerHost() {
        open({
            embedded: true
        });
        capture = true;
        world.classList.add('sp-capture');
        return world.querySelector('.sp-scanner-host');
    }

    function scan() {
        open({
            embedded: true
        });
        if (ownedSheet) {
            R.close(ownedSheet);
            ownedSheet = null;
        }
        stopPhoto();
        LowiDex.scan('cam');
    }

    function showSheet(html, extra) {
        if (ownedSheet) R.close(ownedSheet);
        ownedSheet = R.sheet(html, {
            cls: 'sp-sheet',
            ...(extra || {}),
            onClose: () => {
                ownedSheet = null;
            }
        });
        if (opened && ownedSheet) world.append(ownedSheet);
        return ownedSheet;
    }

    function feedback(kind, text, xp) {
        const target = opened ? world : home;
        clearTimeout(feedbackTimer);
        target.dataset.reaction = kind;
        setText(world.querySelector('.sp-speech'), text);
        const pop = world.querySelector('.sp-xp-pop');
        setText(pop, xp ? '+' + xp + ' XP' : '');
        if (!opened && home) {
            let hp = home.querySelector('.sp-home-pop');
            if (!hp) {
                hp = D.createElement('span');
                hp.className = 'sp-home-pop';
                hp.setAttribute('aria-hidden', 'true');
                home.querySelector('.sp-bubble')?.append(hp);
            }
            hp.textContent = xp ? '+' + xp + ' XP' : '';
            hp.classList.remove('on');
            void hp.offsetWidth;
            if (xp) hp.classList.add('on');
        }
        if (!opened) R.toast(text + (xp ? ' · +' + xp + ' XP' : ''));
        feedbackTimer = setTimeout(() => {
            delete target.dataset.reaction;
            setText(pop, '');
        }, 2400);
        refresh();
    }

    function macroHTML(m) {
        const values = K.macros(m);
        return '<div class="sp-macro-grid">' + Object.keys(values).map(k => '<div><small>' + esc(tr(k)) + '</small><b>' + esc(values[k] === null ? tr('missing') : Math.round(values[k] * 10) / 10 + (k === 'kcal' ? ' kcal' : ' g')) + '</b></div>').join('') + '</div>';
    }

    function gptHTML() {
        return '<a class="sp-gpt" href="' + esc(V.gpt) + '" target="_blank" rel="noopener">' + icon('star') + '<span>' + esc(tr('gpt')) + '</span>' + icon('arrow') + '</a>';
    }

    function flight(image) {
        const el = D.createElement('div');
        el.className = 'sp-catch-token';
        el.innerHTML = image ? '<img alt="" src="' + esc(image) + '">' : icon('plate');
        world.querySelector('.sp-stage').append(el);
        if (reduced()) {
            el.remove();
            return Promise.resolve();
        }
        const rect = creature.getBoundingClientRect(),
            area = world.querySelector('.sp-stage').getBoundingClientRect(),
            x = rect.left + rect.width / 2 - area.left - area.width / 2,
            y = rect.top + rect.height / 2 - area.top - area.height / 2;
        const a = el.animate([{
            transform: 'translate(0,-30px) scale(1)',
            opacity: 1
        }, {
            transform: 'translate(' + x + 'px,' + y + 'px) scale(.1)',
            opacity: .2
        }], {
            duration: 550,
            easing: 'cubic-bezier(.3,.1,.2,1)',
            fill: 'forwards'
        });
        return a.finished.catch(() => {}).then(() => el.remove());
    }
    async function captureProduct(p) {
        open({
            embedded: true
        });
        cancelCapture();
        const id = 'scan:' + (p.barcode || p.id || p.name);
        await flight(p.img || p.photo);
        const gained = V.complete('vitamin', id, {
            amt: 5,
            perDay: 5,
            label: tr('captured'),
            src: 'scan:product'
        });
        try {
            await LowiDex.collect(p);
        } catch (e) {
            R.toast(tr('storage'));
        }
        // Herb reaction follows the LOWiSPIKE likely-spike estimate (the same verdict the result card shows).
        let verdict = p && p.verdict && p.verdict !== 'unknown' ? p.verdict : 'unknown';
        try { if (verdict === 'unknown' && !p.notFound && LowiDex.rate) verdict = LowiDex.rate(p).verdict || 'unknown'; } catch (e) {}
        let zero = '';
        if (!gained) {
            const today = new Date().toDateString();
            zero = ' ' + tr((V.state().ledger || []).some(e => String(e.eventId || '').endsWith(':' + id) && new Date(+e.ts).toDateString() === today) ? 'scanAgain' : 'scanCap') + '.';
        }
        feedback(verdict === 'spike' ? 'wilt' : verdict === 'better' ? 'curious' : verdict === 'ok' ? 'bloom' : 'curious', tr(verdict === 'spike' ? 'scanSpike' : verdict === 'better' ? 'scanBetter' : verdict === 'ok' ? 'scanOk' : 'unknown') + zero, gained);
        LowiDex.reveal(p);
        const ov = R.top && R.top();
        if (ov) {
            world.append(ov);
            ov.classList.add('sp-sheet');
            const sh = ov.querySelector('.r2-sh');
            if (sh) {
                const link = D.createElement('div');
                link.innerHTML = gptHTML();
                sh.prepend(link);
                paginate(sh);
            }
        }
        return gained;
    }

    // one-tap meal logging: recent meals first, photo/scan next, manual fields tucked behind "Manuell"
    function recentMeals() {
        const seen = new Set(),
            out = [];
        for (const l of (V.state().logs || []).slice().reverse()) {
            const t = String(l.t || l.n || '').trim(),
                k = t.toLowerCase();
            if (!t || seen.has(k)) continue;
            seen.add(k);
            out.push(l);
            if (out.length >= 6) break;
        }
        return out;
    }

    /* a log that earns 0 XP always says why (daily limit); a blocked duplicate never gets here */
    function whyNote(result) {
        if (!result || result.xp || !result.reason) return '';
        const parts = String(result.reason).split(' · ');
        return ' · ' + (parts.length > 1 ? parts.slice(1).join(' · ') : parts[0]);
    }

    function quickMeal(i) {
        const src = recentMeals()[+i];
        if (!src) return;
        const seed = {
            id: uid(),
            t: String(src.t || src.n).trim(),
            macros: K.macros(src),
            photo: '',
            via: 'quick'
        };
        const result = V.logMeal(seed);
        if (!result) {
            R.toast(tr('storage'));
            return;
        }
        if (ownedSheet) {
            R.close(ownedSheet);
            ownedSheet = null;
        }
        if (result.dup) {
            feedback('curious', result.reason, 0);
            return;
        }
        feedback('eat', tr('saved') + ' · ' + seed.t + whyNote(result), result.xp);
        mealNotice(result.log || seed, result.xp);
        checkBonuses(false);
        refresh();
    }

    function mealForm(seed, editing) {
        seed = seed || {};
        lastMealId = editing || uid();
        const values = K.macros(seed);
        const quick = !editing && !(seed.t || seed.n || seed.name);
        if (quick) {
            const recent = recentMeals(),
                kc = l => {
                    const m = K.macros(l);
                    return m.kcal != null ? Math.round(m.kcal) + ' kcal' : m.protein != null ? Math.round(m.protein) + ' g ' + tr('protein') : '';
                };
            const fields = '<label>' + esc(tr('title')) + '<input name="title" required maxlength="100" autocomplete="off"></label><small>' + esc(tr('portion')) + '</small><div class="sp-form-macros">' + Object.keys(values).map(k => '<label>' + esc(tr(k)) + '<input name="' + k + '" inputmode="decimal" type="number" min="0" max="10000" step="0.1" placeholder="—"></label>').join('') + '</div><p class="sp-note">' + esc(tr('macroOptional')) + '</p><button class="r2-btn pri" type="submit">' + esc(tr('save')) + '</button>';
            const pk = herbPick(),
                tip = pk ? '<button type="button" class="sp-herb-tip" data-sp="herbPick">' + (pk.recipe.img ? '<img src="' + esc(pk.recipe.img) + '" alt="">' : icon('plate')) + '<span><small>' + esc(tr('herbTip')) + '</small><b>' + esc(recipeName(pk.recipe)) + '</b><i>' + esc(whyLine(pk.why.slice(0, 2), null) || tr('whyText')) + '</i></span>' + icon('arrow') + '</button>' : '';
            const html = '<h2>' + esc(tr('meal')) + '</h2><div class="sp-quick-log"><div class="sp-quick-cap">' + button('photo', 'camera', 'photo') + button('scan', 'scan', 'scan') + '</div>' + (recent.length ? '<small class="sp-quick-h">' + esc(tr('recent')) + '</small><div class="sp-quick-list">' + recent.map((l, i) => { const done = V.mealDup && V.mealDup({t: l.t || l.n, code: l.code}); return '<button type="button" class="sp-quick-item' + (done ? ' done' : '') + '" data-sp="quickMeal" data-q="' + i + '">' + icon('plate') + '<span><b>' + esc(l.t || l.n) + '</b><small>' + esc(done ? tr('doneToday') : (kc(l) || tr('oneTap'))) + '</small></span><em>' + (done ? '\u2713' : '+') + '</em></button>'; }).join('') + '</div>' : '<p class="sp-note">' + esc(tr('recentEmpty')) + '</p>') + tip + '<details class="sp-manual"><summary>' + esc(tr('manual')) + '</summary><form id="spMeal" data-id="' + esc(lastMealId) + '">' + fields + '</form></details></div>';
            showSheet(html);
            return;
        }
        const html = '<h2>' + esc(tr('meal')) + '</h2><form id="spMeal" data-id="' + esc(lastMealId) + '" ' + (editing ? 'data-edit="1"' : '') + '><label>' + esc(tr('title')) + '<input name="title" required maxlength="100" value="' + esc(seed.t || seed.n || seed.name || '') + '"></label><small>' + esc(tr('portion')) + '</small><div class="sp-form-macros">' + Object.keys(values).map(k => '<label>' + esc(tr(k)) + '<input name="' + k + '" inputmode="decimal" type="number" min="0" max="10000" step="0.1" value="' + (values[k] === null ? '' : values[k]) + '" placeholder="—"></label>').join('') + '</div><p class="sp-note">' + esc(tr('macroOptional')) + '</p><button class="r2-btn pri" type="submit">' + esc(tr(editing ? 'rename' : 'save')) + '</button></form>';
        showSheet(html);
    }
    async function finishMeal(form) {
        const data = new FormData(form),
            values = {};
        for (const k of Object.keys(K.macros({}))) values[k] = data.get(k) == null || data.get(k) === '' ? null : +data.get(k);
        const seed = {
            id: form.dataset.id,
            t: String(data.get('title')).trim(),
            macros: values,
            photo: photoURL,
            via: photoURL ? 'photo' : 'spirit'
        };
        const result = form.dataset.edit ? V.editMeal(seed) : V.logMeal(seed);
        if (!result) {
            R.toast(tr('storage'));
            return;
        }
        if (result.dup) {
            if (ownedSheet) {
                R.close(ownedSheet);
                ownedSheet = null;
            }
            photoURL = '';
            feedback('curious', result.reason, 0);
            return;
        }
        photoURL = '';
        if (ownedSheet) {
            R.close(ownedSheet);
            ownedSheet = null;
        }
        await flight(seed.photo);
        feedback('eat', tr('saved') + whyNote(result), result.xp);
        checkBonuses(false);
        const log = result.log;
        showSheet('<h2>' + esc(tr('saved')) + '</h2><p>' + esc(log.t) + '</p>' + macroHTML(log) + '<p class="sp-earned">' + (result.xp ? '+' + result.xp + ' XP' : esc(result.reason || (form.dataset.edit ? '' : '0 XP'))) + '</p>' + gptHTML());
    }

    function checkBonuses(closed) {
        const s = V.state();
        for (const b of K.bonuses(s, K.day(), closed)) {
            const gained = V.bonus(b.eventId, b.amt, tr(b.kind) + ' · ' + tr('bonus'));
            if (gained) feedback('bloom', tr('bonus'), gained);
        }
    }

    function water() {
        const gained = V.water(uid());
        feedback('water', tr('drink'), gained);
    }
    async function photo() {
        open({
            embedded: true
        });
        cancelCapture();
        const h = scannerHost();
        h.innerHTML = '<div class="sp-food-camera"><video autoplay muted playsinline></video><p role="status"></p><div>' + button('camera', 'camera', 'shutter') + '<label class="sp-action sp-upload-label">' + icon('camera') + '<span>' + esc(tr('upload')) + '</span><input type="file" accept="image/*" class="sp-file-in"></label>' + button('cancel', 'close', 'cancelCapture') + '</div></div>';
        if (!navigator.mediaDevices?.getUserMedia) {
            setText(h.querySelector('p'), tr('noCamera'));
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: {
                        ideal: 'environment'
                    },
                    width: {
                        ideal: 960
                    },
                    height: {
                        ideal: 720
                    }
                }
            });
            if (!opened || !capture || !h.querySelector('video')) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            photoStream = stream;
            h.querySelector('video').srcObject = stream;
            await h.querySelector('video').play();
        } catch (e) {
            setText(h.querySelector('p'), tr(e.name === 'NotAllowedError' ? 'cameraDenied' : 'noCamera'));
        }
    }

    function shutter() {
        const v = world.querySelector('.sp-food-camera video');
        if (!v || !v.videoWidth) return;
        const cv = D.createElement('canvas'),
            scale = Math.min(1, 640 / v.videoWidth);
        cv.width = Math.round(v.videoWidth * scale);
        cv.height = Math.round(v.videoHeight * scale);
        cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
        photoURL = cv.toDataURL('image/jpeg', .65);
        photoFile = null;
        try {
            const big = D.createElement('canvas'), s2 = Math.min(1, 1600 / v.videoWidth);
            big.width = Math.round(v.videoWidth * s2);
            big.height = Math.round(v.videoHeight * s2);
            big.getContext('2d').drawImage(v, 0, 0, big.width, big.height);
            big.toBlob(b => { if (b) photoFile = new File([b], 'lowispike-' + Date.now() + '.jpg', { type: 'image/jpeg' }); }, 'image/jpeg', .9);
        } catch (e) {}
        cancelCapture();
        flight(photoURL).then(() => photoSheet());
    }
    let photoFile = null;
    function photoSheet() {
        if (!photoURL) return mealForm();
        lastMealId = uid();
        showSheet('<h2>' + esc(tr('photoTitle')) + '</h2><img class="sp-photo-prev" alt="" src="' + esc(photoURL) + '"><div class="sp-photo-acts">' + button('savePhoto', 'arrow', 'savePhoto') + gptHTML() + '</div><p class="sp-note small">' + esc(tr('photoGptHint')) + '</p><form id="spMeal" class="sp-photo-form" data-id="' + esc(lastMealId) + '"><label>' + esc(tr('photoName')) + '<input name="title" required maxlength="100" autocomplete="off"></label><button type="submit" class="sp-action sp-primary">' + icon('plate') + '<span>' + esc(tr('photoLog')) + '</span></button></form>');
    }
    function photoAsFile() {
        if (photoFile) return photoFile;
        if (!photoURL) return null;
        const bin = atob(photoURL.split(',')[1] || ''), arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return new File([arr], 'lowispike-' + Date.now() + '.jpg', { type: 'image/jpeg' });
    }
    async function savePhoto() {
        const f = photoAsFile();
        if (!f) return;
        if (navigator.canShare && navigator.share) {
            let ok = false;
            try { ok = navigator.canShare({ files: [f] }); } catch (e) {}
            if (ok) {
                try { await navigator.share({ files: [f] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
            }
        }
        const a = D.createElement('a');
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        D.body.append(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        R.toast(tr('photoSaved'));
    }
    async function onPhotoFile(file) {
        if (!file) return;
        try {
            photoFile = file;
            photoURL = await LowiHost.resizeImage(file, 640, .65);
            cancelCapture();
            await flight(photoURL);
            photoSheet();
        } catch (e) {
            R.toast(tr('noCamera'));
        }
    }
    D.addEventListener('change', e => {
        if (e.target && e.target.classList && e.target.classList.contains('sp-file-in')) {
            const f = e.target.files && e.target.files[0];
            e.target.value = '';
            onPhotoFile(f);
        }
    });
    const photoInput = D.createElement('input');
    photoInput.type = 'file';
    photoInput.accept = 'image/*';
    photoInput.hidden = true;
    D.body.append(photoInput);
    photoInput.addEventListener('change', async () => {
        const file = photoInput.files?.[0];
        photoInput.value = '';
        if (!file) return;
        onPhotoFile(file);
    });

    function physics() {
        touch?.dispose();
        const el = world.querySelector('.sp-body'),
            area = world.querySelector('.sp-stage'),
            controller = new AbortController(),
            options = {
                signal: controller.signal
            },
            points = new Map(),
            timers = new Set(),
            H = window.LowiHerbTouch || null;
        let raf = 0,
            faceTimer = 0,
            pokeTimer = 0,
            pokes = 0,
            last = 0,
            body = {
                x: 0,
                y: 0,
                vx: 0,
                vy: 0
            },
            sx = 1,
            sy = 1,
            vsx = 0,
            vsy = 0,
            tx = 1,
            ty = 1,
            thrown = false,
            gesture = null;
        const bounds = () => ({
            x: Math.max(0, (area.clientWidth - el.clientWidth) / 2 - 8),
            y: Math.max(0, (area.clientHeight - el.clientHeight) / 2 - 5)
        });
        const draw = () => el.style.transform = 'translate(-50%,-50%) translate3d(' + body.x + 'px,' + body.y + 'px,0) scale(' + sx + ',' + sy + ')';

        function tick(time) {
            const dt = last ? Math.min(.025, (time - last) / 1000) : 1 / 60;
            last = time;
            const b = bounds();
            let settled = false;
            if (thrown && !points.size) {
                if (H) {
                    if (reduced()) {
                        body.x = body.y = body.vx = body.vy = 0;
                        settled = true;
                    } else settled = H.spring(body, dt, b.x, b.y, K.bound);
                    if (settled) thrown = false;
                } else if (!reduced()) K.step(body, dt, b.x, b.y);
            }
            vsx += (-420 * (sx - tx) - 28 * vsx) * dt;
            vsy += (-420 * (sy - ty) - 28 * vsy) * dt;
            sx += vsx * dt;
            sy += vsy * dt;
            if (reduced()) {
                sx = tx;
                sy = ty;
                vsx = vsy = 0;
            }
            draw();
            if ((thrown && (H ? !settled : (Math.abs(body.vx) > 2 || Math.abs(body.vy) > 6 || body.y < b.y - 3))) || Math.abs(sx - tx) + Math.abs(sy - ty) > .003 || Math.abs(vsx) + Math.abs(vsy) > .02) raf = requestAnimationFrame(tick);
            else {
                raf = 0;
                last = 0;
            }
        }

        function run() {
            if (!raf) {
                last = 0;
                raf = requestAnimationFrame(tick);
            }
        }

        // Face while held / after a poke (herb-touch.js). Clears itself after ms when given.
        function face(name, ms) {
            if (!H) return;
            clearTimeout(faceTimer);
            H.setFace(el, name);
            if (name && ms) faceTimer = later(() => H.setFace(el, null), ms);
        }

        function heldFace() {
            if (!H || !gesture) return;
            const now = performance.now();
            face(H.heldFace({
                hold: gesture.hold,
                moved: gesture.moved,
                stretch: Math.max(tx, ty),
                speed: gesture.hold ? 0 : H.speedOf(gesture.samples, now),
                shakes: H.shakes(gesture.trail, now)
            }));
        }

        function poke(g) {
            const kind = T.pet();
            if (!H) return;
            if (kind === 'dizzy') {
                face('dizzy', 1600);
                return;
            }
            const p = H.poke(H.zone({
                x: g.startX,
                y: g.startY
            }, H.rectsOf(el)), H.lang(), pokes++);
            clearTimeout(pokeTimer);
            delete el.dataset.poke;
            void el.offsetWidth;
            el.dataset.poke = p.zone;
            pokeTimer = later(() => delete el.dataset.poke, 800);
            face(p.face, 750);
            const speech = world.querySelector('.sp-speech');
            if (speech && p.line) speech.textContent = p.line;
            if (!reduced() && (p.vx || p.vy)) {
                body.vx += p.vx;
                body.vy += p.vy;
                thrown = true;
            }
        }

        function later(fn, ms) {
            const id = setTimeout(() => {
                timers.delete(id);
                fn();
            }, ms);
            timers.add(id);
            return id;
        }

        function leaves() {
            if (gesture?.shed) return;
            if (gesture) gesture.shed = true;
            [...creature.querySelectorAll('.lh-leaf')].slice(0, 3).forEach((leaf, i) => {
                leaf.style.opacity = '0';
                const fall = D.createElement('div');
                fall.className = 'sp-fallen';
                fall.innerHTML = '<svg viewBox="0 0 260 310">' + leaf.outerHTML.replace('opacity: 0;', '') + '</svg>';
                area.append(fall);
                if (!reduced()) fall.animate([{
                    transform: 'translate(0,0) rotate(0)',
                    opacity: 1
                }, {
                    transform: 'translate(' + (i - 1) * 45 + 'px,90px) rotate(' + (i - 1) * 70 + 'deg)',
                    opacity: 0
                }], {
                    duration: 1600 + i * 130,
                    fill: 'forwards'
                });
                later(() => fall.remove(), 2100);
                later(() => {
                    if (leaf.isConnected) {
                        leaf.style.opacity = '1';
                        if (!reduced()) leaf.animate([{
                            opacity: 0,
                            transform: 'scale(.4)'
                        }, {
                            opacity: 1,
                            transform: 'scale(1)'
                        }], {
                            duration: 900
                        });
                    }
                }, 6500 + i * 700);
            });
        }
        el.addEventListener('pointerdown', e => {
            if (e.button !== 0 || capture) return;
            el.setPointerCapture(e.pointerId);
            points.set(e.pointerId, {
                x: e.clientX,
                y: e.clientY
            });
            cancelAnimationFrame(raf);
            raf = 0;
            last = 0;
            thrown = false;
            if (points.size === 1) {
                gesture = {
                    at: performance.now(),
                    startX: e.clientX,
                    startY: e.clientY,
                    baseX: body.x,
                    baseY: body.y,
                    hold: false,
                    moved: false,
                    shed: false,
                    samples: [{
                        x: e.clientX,
                        y: e.clientY,
                        t: performance.now()
                    }],
                    trail: []
                };
                face('surprised');
                tx = 1.1;
                ty = .9;
                later(() => {
                    if (gesture && points.size === 1 && !gesture.moved) {
                        gesture.hold = true;
                        tx = 1.28;
                        ty = .76;
                        heldFace();
                        run();
                    }
                }, 300);
            }
            if (points.size === 2) {
                const ps = [...points.values()];
                gesture.distance = Math.max(20, Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y));
                gesture.moved = true;
            }
            run();
            e.preventDefault();
        }, options);
        el.addEventListener('pointermove', e => {
            if (!points.has(e.pointerId) || !gesture) return;
            points.set(e.pointerId, {
                x: e.clientX,
                y: e.clientY
            });
            const dx = e.clientX - gesture.startX,
                dy = e.clientY - gesture.startY;
            if (points.size > 1) {
                const ps = [...points.values()],
                    ratio = Math.min(2.2, Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) / gesture.distance);
                tx = ratio;
                ty = 1 / Math.sqrt(Math.max(.5, ratio));
                if (ratio > 1.65) leaves();
            } else if (gesture.hold) {
                const stretch = Math.min(2.2, 1 + Math.hypot(dx, dy) / 100);
                tx = Math.abs(dx) > Math.abs(dy) ? stretch : 1 / Math.sqrt(stretch);
                ty = Math.abs(dy) >= Math.abs(dx) ? stretch : 1 / Math.sqrt(stretch);
                if (stretch > 1.65) leaves();
                gesture.moved = Math.hypot(dx, dy) > 8;
            } else {
                if (Math.hypot(dx, dy) > 8) gesture.moved = true;
                if (gesture.moved) {
                    tx = ty = 1;
                    body.x = gesture.baseX + dx;
                    body.y = gesture.baseY + dy;
                    body.vx = body.vy = 0;
                    const b = bounds();
                    K.bound(body, b.x, b.y);
                    draw();
                }
                const now = performance.now();
                gesture.samples.push({
                    x: e.clientX,
                    y: e.clientY,
                    t: now
                });
                gesture.samples = gesture.samples.filter(s => now - s.t < 120);
                gesture.trail.push({
                    x: e.clientX,
                    y: e.clientY,
                    t: now
                });
                gesture.trail = gesture.trail.filter(s => now - s.t < 700);
            }
            heldFace();
            run();
            e.preventDefault();
        }, options);
        const finish = (e, cancelled) => {
            if (!points.has(e.pointerId) || !gesture) return;
            points.delete(e.pointerId);
            if (points.size) return;
            const g = gesture;
            gesture = null;
            tx = ty = 1;
            if (!cancelled && g.moved && !g.hold) {
                const now = performance.now();
                Object.assign(body, K.release(g.samples, now));
                thrown = H ? true : !reduced();
                if (H) {
                    const f = H.releaseFace(el.dataset.touchface === 'dizzy' || H.shakes(g.trail, now) >= 4 ? 9999 : Math.hypot(body.vx, body.vy));
                    face(f.face, f.ms);
                }
            } else if (!cancelled && !g.moved && !g.hold) poke(g);
            else if (H) face(cancelled ? null : 'squint', cancelled ? 0 : 520);
            // Always spring back to the resting spot after letting go.
            if (H && !H.atRest(body)) thrown = true;
            run();
        };
        el.addEventListener('pointerup', e => finish(e, false), options);
        el.addEventListener('pointercancel', e => finish(e, true), options);
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const kind = T.pet();
                face(kind === 'dizzy' ? 'dizzy' : 'squint', kind === 'dizzy' ? 1600 : 600);
            }
        }, options);
        draw();
        touch = {
            dispose() {
                controller.abort();
                cancelAnimationFrame(raf);
                timers.forEach(clearTimeout);
                creature.querySelectorAll('.lh-leaf').forEach(n => n.style.opacity = '');
                el.style.transform = '';
                delete el.dataset.touchface;
                delete el.dataset.poke;
                world.querySelectorAll('.sp-fallen').forEach(n => n.remove());
            }
        };
    }

    function pathHTML() {
        const {
            m
        } = get();
        return '<div class="sp-path">' + LOWI_HERB_CONFIG.stages.map((s, i) => '<div class="' + (i > m.index ? 'sealed' : '') + '">' + (i > m.index ? icon('mystery') : icon('leaf')) + '<b>' + esc(i > m.index ? '?' : s.name[{
            de: 1,
            es: 2
        } [lang()] || 0]) + '</b><small>' + s.xp + ' XP</small></div>').join('') + '</div><p class="sp-note">' + esc(tr('mystery')) + '</p>';
    }
    /* Wardrobe (Oct 14): preview any item on the real herb, equip/take off what XP has unlocked.
       Premium items are preview-only: there is no purchase flow, so nothing is sold or charged here. */
    const WC = window.LowiHerbTamagotchiCore,
        wl = (en, de, es) => ({
            de,
            es
        } [lang()] || en),
        wix = () => ({
            de: 1,
            es: 2
        } [lang()] || 0),
        wname = c => c ? (c.names || [c.name])[wix()] || c.name : '';
    const wd = {
        kind: 'pot',
        sel: ''
    };

    function wdItems() {
        const {
            m,
            p
        } = get();
        return {
            m,
            p,
            eq: WC.cleanEquipment(p.equipment, m.xp),
            items: WC.wardrobeItems(m.xp, p.equipment)
        };
    }

    function wdStatus(c) {
        return c.status === 'equipped' ? wl('Wearing', 'Angezogen', 'Puesto') : c.status === 'ready' ? wl('Ready', 'Bereit', 'Listo') : c.status === 'locked' ? wl(c.left + ' XP to go', 'noch ' + c.left + ' XP', 'faltan ' + c.left + ' XP') : wl('Premium · soon', 'Premium · bald', 'Premium · pronto');
    }

    function wdHTML() {
        const {
            m,
            p,
            eq,
            items
        } = wdItems();
        if (!WC.SLOTS.some(s => s.kind === wd.kind)) wd.kind = 'pot';
        let sel = items.find(c => c.id === wd.sel && c.kind === wd.kind);
        if (!sel) sel = items.find(c => c.kind === wd.kind && c.id === eq[wd.kind]) || items.find(c => c.kind === wd.kind);
        wd.sel = sel ? sel.id : '';
        const trying = sel && sel.status !== 'equipped' && !(sel.kind === 'pot' && sel.id === 'ceramic' && eq.pot === 'ceramic'),
            look = trying ? WC.previewEquip(eq, sel.id, m.xp) : eq,
            model = {
                ...m,
                dim: false,
                mood: 'happy'
            };
        const next = WC.nextUnlock(m.xp),
            lockedSel = sel && sel.status === 'locked',
            pct = lockedSel ? Math.max(4, Math.min(100, Math.round(m.xp / sel.xp * 100))) : 0;
        let action = '',
            note = '';
        if (sel) {
            if (sel.status === 'premium') {
                action = '<button type="button" class="wd-act" disabled>' + esc(wl('Premium · not available yet', 'Premium · noch nicht verfügbar', 'Premium · aún no disponible')) + '</button>';
                note = wl('Preview only. Premium items can’t be bought yet.', 'Nur zur Vorschau. Premium-Teile kann man noch nicht kaufen.', 'Solo vista previa. Los artículos premium aún no se pueden comprar.');
            } else if (sel.status === 'locked') {
                action = '<button type="button" class="wd-act" disabled>' + esc(wl('Unlocks at ' + sel.xp + ' XP', 'Ab ' + sel.xp + ' XP', 'Desde ' + sel.xp + ' XP')) + '</button>';
                note = wl(sel.left + ' XP to go. Log meals, drink water, scan.', 'Noch ' + sel.left + ' XP. Essen eintragen, Wasser, Scannen.', 'Faltan ' + sel.left + ' XP. Registra comidas, agua, escanea.');
            } else if (sel.status === 'equipped') {
                action = sel.id === WC.BASE_EQUIPMENT[sel.kind] ? '<button type="button" class="wd-act" disabled>' + esc(wl('Starter pot · always yours', 'Start-Topf · immer deins', 'Maceta inicial · siempre tuya')) + '</button>' : '<button type="button" class="wd-act wd-off" data-sp="equip" data-item="' + sel.id + '">' + esc(wl('Take off', 'Ablegen', 'Quitárselo')) + '</button>';
            } else action = '<button type="button" class="wd-act wd-on" data-sp="equip" data-item="' + sel.id + '">' + esc(wl('Put on', 'Anziehen', 'Ponérselo')) + '</button>';
        }
        const worn = WC.SLOTS.filter(s => eq[s.kind] && eq[s.kind] !== WC.BASE_EQUIPMENT[s.kind]).length;
        return '<div class="wd" id="spWd"><header class="wd-head"><h2>' + esc(tr('wardrobe')) + '</h2><span class="wd-xp">' + esc(m.xp + ' XP') + '</span></header>' +
            '<div class="wd-stage' + (trying ? ' trying' : '') + '"><span class="wd-tag">' + esc(trying ? wl('Trying on', 'Anprobe', 'Probando') : wl('Your look', 'Dein Look', 'Tu look')) + '</span>' +
            T.plantHTML(model, 'preview', p, {
                preview: look,
                label: name() + ' · ' + (sel ? wname(sel) : '')
            }) +
            '<div class="wd-info" aria-live="polite"><b>' + esc(sel ? wname(sel) : '') + '</b><small>' + esc(sel ? wdStatus(sel) : '') + '</small>' + (lockedSel ? '<i class="wd-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></i>' : '') + action + (note ? '<p class="wd-note">' + esc(note) + '</p>' : '') + '</div></div>' +
            '<div class="wd-tabs" role="tablist" aria-label="' + esc(tr('wardrobe')) + '">' + WC.SLOTS.map(s => {
                const own = items.filter(c => c.kind === s.kind && (c.status === 'ready' || c.status === 'equipped')).length,
                    all = items.filter(c => c.kind === s.kind && !c.premium).length;
                return '<button type="button" role="tab" data-sp="wdTab" data-kind="' + s.kind + '" aria-selected="' + (s.kind === wd.kind) + '"' + (eq[s.kind] && eq[s.kind] !== WC.BASE_EQUIPMENT[s.kind] ? ' data-worn=""' : '') + '>' + esc(s.names[wix()]) + '<small>' + own + '/' + all + '</small></button>';
            }).join('') + '</div>' +
            '<div class="wd-grid" role="tabpanel">' + items.filter(c => c.kind === wd.kind).map(c => '<button type="button" class="wd-item wd-' + c.status + '" data-sp="wdPick" data-item="' + c.id + '" aria-pressed="' + (c.id === wd.sel) + '" aria-label="' + esc(wname(c) + ', ' + wdStatus(c)) + '"><span class="wd-thumb">' + T.plantHTML(model, 'node', p, {
                preview: WC.previewEquip(WC.BASE_EQUIPMENT, c.id, m.xp),
                crop: c.kind,
                hidden: true
            }) + (c.status === 'locked' || c.status === 'premium' ? '<span class="wd-lock" aria-hidden="true">' + (c.status === 'premium' ? '✦' : icon('lock')) + '</span>' : c.status === 'equipped' ? '<span class="wd-check" aria-hidden="true">' + icon('check') + '</span>' : '') + '</span><b>' + esc(wname(c)) + '</b><small>' + esc(wdStatus(c)) + '</small></button>').join('') + '</div>' +
            '<footer class="wd-foot"><span>' + esc(next ? wl('Next: ' + wname(next) + ' in ' + Math.ceil(next.xp - m.xp) + ' XP', 'Als Nächstes: ' + wname(next) + ' in ' + Math.ceil(next.xp - m.xp) + ' XP', 'Siguiente: ' + wname(next) + ' en ' + Math.ceil(next.xp - m.xp) + ' XP') : wl('Everything unlocked', 'Alles freigespielt', 'Todo desbloqueado')) + '</span>' + (worn ? '<button type="button" class="wd-reset" data-sp="wdReset">' + esc(wl('Take all off', 'Alles ablegen', 'Quitar todo')) + '</button>' : '') + '</footer></div>';
    }

    function wdPaint(focus) {
        const cur = D.getElementById('spWd');
        if (!cur || !ownedSheet || !ownedSheet.contains(cur)) return wardrobe();
        const tmp = D.createElement('div');
        tmp.innerHTML = wdHTML();
        cur.replaceWith(tmp.firstChild);
        if (focus) D.querySelector('#spWd ' + focus)?.focus({
            preventScroll: true
        });
    }

    function wardrobe(kind) {
        if (kind) wd.kind = kind;
        wd.sel = '';
        showSheet(wdHTML(), {
            cls: 'sp-sheet wd-sheet'
        });
    }

    function wdEquip(id) {
        const {
            p,
            m
        } = get(), c = WC.cosmetic(id), eq = WC.toggleEquip(p.equipment, id, m.xp);
        if (!eq || !c) return false;
        const on = eq[c.kind] === c.id;
        T.setEquipment(p, eq);
        signature = '';
        refresh();
        R.toast(on ? wl('Wearing ' + wname(c), wname(c) + ' angezogen', 'Lleva ' + wname(c)) : wl(wname(c) + ' taken off', wname(c) + ' abgelegt', wname(c) + ' quitado'));
        return true;
    }

    function collection() {
        const items = Object.values(LowiDex.state().mine || {});
        showSheet('<h2>' + esc(tr('collection')) + '</h2><div class="sp-collection">' + (items.length ? items.map(p => '<button data-sp="product" data-key="' + esc(p.barcode || p.id || p.name) + '">' + (p.img ? '<img alt="" src="' + esc(p.img) + '">' : icon('leaf')) + '<b>' + esc(p.name || p.barcode) + '</b></button>').join('') : '<p>' + esc(tr('emptyCollection')) + '</p>' + button('scan', 'scan', 'scan')) + '</div>');
        paginate(ownedSheet.querySelector('.r2-sh'));
    }

    function profile() {
        const {
            m,
            p
        } = get(), s = V.state(), type = m.profile.personality;
        const H = window.LowiHerbIdentity;
        if (H) {
            const id = H.current();
            showSheet(H.cardHTML() + '<form id="spProfile"><label>' + esc(tr('name')) + '<input name="name" maxlength="24" value="' + esc(id.name) + '"></label><label>' + esc(tr('birthday')) + '<input name="birthday" type="date" value="' + esc(s.user.bday || '') + '"></label><button type="submit" class="r2-btn pri">' + esc(tr('rename')) + '</button></form>' + (id.custom ? '<button class="r2-btn ghost hi-reset" data-sp="resetName"><span>' + esc(H.copy('resetName')) + '</span></button>' : '') + '<button class="r2-btn ghost" data-sp="quiz">' + icon('star') + '<span>' + esc(H.copy(id.type ? 'quizAgain' : 'quiz')) + '</span></button>' + button('goals', 'plate', 'goals') + button('completeDay', 'moon', 'completeDay'));
            return;
        }
        showSheet('<h2>' + esc(name()) + '</h2><p class="sp-profile-sign">' + icon(m.profile.sign?.name || 'star') + esc(tr('sign')) + ': ' + esc(m.profile.sign?.name || tr('missing')) + '</p><form id="spProfile"><label>' + esc(tr('name')) + '<input name="name" maxlength="24" value="' + esc(name()) + '"></label><label>' + esc(tr('birthday')) + '<input name="birthday" type="date" value="' + esc(s.user.bday || '') + '"></label><button type="submit" class="r2-btn pri">' + esc(tr('rename')) + '</button></form><p>' + esc(tr('personality')) + ': ' + esc(type || tr('missing')) + '</p>' + button('setup', 'star', 'quiz') + button('goals', 'plate', 'goals') + button('completeDay', 'moon', 'completeDay'));
    }
    const quizQuestions = [
        [
            ['A free afternoon:', 'Ein freier Nachmittag:', 'Una tarde libre:'],
            [
                ['Quiet time', 'Zeit für mich', 'Tiempo tranquilo'],
                ['See friends', 'Freunde treffen', 'Ver amigos']
            ],
            ['I', 'E']
        ],
        [
            ['Pick a leaf adventure:', 'Dein Blätterabenteuer:', 'Una aventura de hojas:'],
            [
                ['Try something new', 'Etwas Neues probieren', 'Probar algo nuevo'],
                ['A familiar favorite', 'Mein vertrauter Favorit', 'Mi favorito de siempre']
            ],
            ['N', 'S']
        ],
        [
            ['A friend needs you:', 'Ein Freund braucht dich:', 'Un amigo te necesita:'],
            [
                ['Make a plan', 'Einen Plan machen', 'Hacer un plan'],
                ['Listen first', 'Erst mal zuhören', 'Escuchar primero']
            ],
            ['T', 'F']
        ],
        [
            ['Dinner tonight:', 'Heute Abend essen wir:', 'La cena de hoy:'],
            [
                ['Plan it now', 'Jetzt schon planen', 'Planear ahora'],
                ['See what feels right', 'Spontan entscheiden', 'Decidir después']
            ],
            ['J', 'P']
        ]
    ];
    let quizStep = 0,
        quizType = '';

    function quiz(reset) {
        if (reset) {
            quizStep = 0;
            quizType = '';
        }
        const q = quizQuestions[quizStep],
            i = {
                de: 1,
                es: 2
            } [lang()] || 0;
        showSheet('<div class="sp-quiz"><small>' + esc(tr('personality')) + ' · ' + (quizStep + 1) + '/4</small><h2>' + esc(q[0][i]) + '</h2>' + q[1].map((o, n) => '<button class="r2-btn" data-sp="quizAnswer" data-value="' + q[2][n] + '">' + esc(o[i]) + '</button>').join('') + '</div>');
    }

    function answer(value) {
        if (!quizQuestions[quizStep]?.[2].includes(value)) return;
        quizType += value;
        if (++quizStep < 4) return quiz();
        const s = V.state(),
            {
                p
            } = get();
        s.user.mbti = quizType;
        p.personality = quizType;
        T.savePrefs(p);
        if (window.LowiHerbIdentity) LowiHerbIdentity.setType(quizType);
        R.save();
        signature = '';
        refresh();
        profile();
    }

    function goals() {
        const g = V.state().user.macroGoals || {};
        showSheet('<h2>' + esc(tr('goals')) + '</h2><form id="spGoals">' + ['protein', 'fiber', 'sugar'].map(k => '<label>' + esc(tr(k)) + ' (g)<input name="' + k + '" type="number" min="1" max="1000" value="' + esc(g[k] || '') + '" placeholder="—"></label>').join('') + '<p class="sp-note">' + esc(tr('sugarNote')) + '</p><button class="r2-btn pri">' + esc(tr('setGoals')) + '</button></form>');
    }

    const normName = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

    function findRecipe(recipe) {
        const catalog = window.LowiSwafloBridge ? LowiSwafloBridge.catalog() : [];
        if (recipe && typeof recipe === 'object') return recipe;
        if (!recipe) return catalog[0] || null;
        const key = normName(recipe);
        return catalog.find(r => r.id === recipe) || catalog.find(r => [r.n, r.e, r.de, r.name].some(x => x && normName(x) === key)) || catalog.find(r => [r.n, r.e, r.de].some(x => x && key.length > 5 && (normName(x).includes(key) || key.includes(normName(x))))) || null;
    }

    function recipeName(r) {
        const n = r.n || r.name || '';
        try {
            if (window.LowiLang && LowiLang.t) return LowiLang.t(n) || n;
        } catch (e) {}
        return n;
    }

    function pickMacros(r) {
        if (r.macros && Object.values(K.macros(r)).some(v => v !== null)) return K.macros(r);
        return K.estimate(r.ing || r.ingredients || []) || K.macros({});
    }

    function whyLine(reasons, r) {
        const parts = (reasons || []).map(k => tr('why_' + k)).filter(Boolean);
        if (r && r.mins) parts.push(r.mins + ' ' + tr('minutes'));
        return parts.length ? parts.join(' · ') : '';
    }

    /* the herb's own food idea for right now (protein high, sugar low) */
    function herbPick() {
        const catalog = window.LowiSwafloBridge ? LowiSwafloBridge.catalog() : [];
        return K.pickFor(catalog.filter(r => !r.drink && (r.ing || []).length), Date.now());
    }

    function showPick(recipe, why) {
        const r = findRecipe(recipe);
        if (!r) return;
        const image = r.img || r.photo || (window.LowiSpiritHost && LowiSpiritHost.recipeImage && LowiSpiritHost.recipeImage(r.id)) || '';
        const ing = (r.ing || r.ingredients || []).map(i => typeof i === 'string' ? i : [i.q || i.quantity, i.n || i.name].filter(Boolean).join(' '));
        const m = pickMacros(r);
        const reasons = Array.isArray(why) ? why : null;
        const whyText = reasons ? whyLine(reasons, r) : (why || '');
        const name = recipeName(r);
        const mini = ['protein', 'fiber', 'sugar'].map(k => '<span class="sp-pick-m"><b>' + (m[k] === null || m[k] === undefined ? '—' : Math.round(m[k]) + ' g') + '</b><small>' + esc(tr(k)) + '</small></span>').join('');
        const ov = showSheet('<article class="sp-pick"><small>' + esc(tr('yourPick')) + '</small><h2>' + esc(name) + '</h2>' + (image ? '<img class="sp-pick-photo" src="' + esc(image) + '" alt="">' : '') + '<div class="sp-pick-mini">' + mini + '</div><div class="sp-pick-tabs">' + button('why', 'leaf', 'pickPage', 'data-page="overview"') + button('ingredients', 'bag', 'pickPage', 'data-page="ingredients"') + button('macro', 'plate', 'pickPage', 'data-page="macros"') + '</div><section data-pick-page="overview"><p>' + esc(whyText || tr('whyText')) + '</p></section><section data-pick-page="ingredients" hidden><ul>' + ing.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul></section><section data-pick-page="macros" hidden>' + macroHTML({ macros: m }) + (m.estimated ? '<p class="sp-note">' + esc(tr('estimated')) + '</p>' : '') + '</section><div class="sp-pick-actions">' + button('cook', 'leaf', 'cookPick') + button('logPick', 'plate', 'logPick') + '</div></article>');
        ov.__recipe = r;
        ov.__macros = m;
        ov.__name = name;
        return ov;
    }

    function logPick(r, m, name) {
        const seed = {
            id: uid(),
            t: name || recipeName(r),
            macros: Object.fromEntries(Object.keys(K.macros({})).map(k => [k, m && m[k] !== undefined ? m[k] : null])),
            via: 'pick'
        };
        const result = V.logMeal(seed);
        R.close();
        if (!result) {
            R.toast(tr('storage'));
            return;
        }
        if (result.dup) {
            feedback('curious', result.reason, 0);
            return;
        }
        feedback('eat', tr('saved') + ' · ' + seed.t + whyNote(result), result.xp);
        mealNotice(result.log || seed, result.xp);
        checkBonuses(false);
        refresh();
    }

    function paginate(sh) {
        if (!sh || sh.querySelector('.sp-pager')) return;
        const container = sh.querySelector('.sp-outfits,.sp-collection,[data-pick-page="ingredients"] ul');
        if (container && container.children.length > 6) {
            const children = [...container.children],
                pages = [];
            for (let i = 0; i < children.length; i += 6) {
                const page = D.createElement('div');
                page.className = 'sp-page';
                page.hidden = i > 0;
                children.slice(i, i + 6).forEach(n => page.append(n));
                container.append(page);
                pages.push(page);
            }
            const footer = D.createElement('div');
            footer.className = 'sp-pager';
            footer.innerHTML = button('prev', 'arrow', 'pageBack') + '<span>1 / ' + pages.length + '</span>' + button('forward', 'arrow', 'pageNext');
            container.after(footer);
            footer.__pages = pages;
            footer.__index = 0;
        }
    }

    function identityColors() {
        const s = V.state(),
            people = window.LOWI_CLOUD ? LOWI_CLOUD.people() : [],
            core = window.LowiHerbTamagotchiCore;
        const person = n => n === s.user.name ? s.user : people.find(p => p.n === n) || {};
        for (const row of D.querySelectorAll('.cm-msg')) {
            const who = row.dataset.who || row.querySelector('.cm-byn,[data-who]')?.textContent.trim() || '',
                p = row.classList.contains('mine') ? s.user : person(who);
            const look = core.profile({
                bday: p.bday,
                mbti: p.mbti || p.t
            }, {
                starSign: p.s || p.sign
            });
            // the profile bubble color (legacy --chat-color) wins, so chat bubble and profile always match
            const signColor = (row.style.getPropertyValue('--chat-color') || '').trim() || look.palette.a;
            row.style.setProperty('--sp-sign', signColor);
            const bubble = row.querySelector('.cm-bub');
            if (bubble) {
                bubble.style.setProperty('--sp-sign', signColor);
                bubble.classList.add('sp-chat-color');
            }
            const av = row.querySelector('.cm-av,.lb3-ph,.r3m-av');
            if (av) {
                av.style.setProperty('--sp-sign', signColor);
                av.classList.add('sp-avatar-ring');
            }
        }
        const own = core.profile(s.user, {});
        for (const av of D.querySelectorAll('#pfBtn .av,#pfBtn .lb3-ph,#pfOrb,.pf-av')) {
            av.style.setProperty('--sp-sign', own.palette.a);
            av.classList.add('sp-avatar-ring');
        }
        for (const by of D.querySelectorAll('.fy-by[data-who]')) {
            const p = person(by.dataset.who),
                look = core.profile({
                    bday: p.bday
                }, {
                    starSign: p.s || p.sign
                });
            by.style.setProperty('--sp-sign', look.palette.a);
            by.querySelectorAll('.av,.lb3-ph').forEach(av => {
                av.classList.add('sp-avatar-ring');
                av.style.setProperty('--sp-sign', look.palette.a);
            });
        }
    }
    const emoji = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E)?\p{Emoji_Modifier}?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E)?\p{Emoji_Modifier}?)*|[\u2648-\u2653]\uFE0F?|[0-9#*]\uFE0F?\u20E3/gu;
    const symbolKind = s => window.LowiIcons ? LowiIcons.kind(s) : (/[💧🥤🚰]/u.test(s) ? 'water' : /[📷📸🤳]/u.test(s) ? 'camera' : /[🍽🥗🥣🍳🍎🍲🍱]/u.test(s) ? 'plate' : /[👑🎩🎀]/u.test(s) ? 'hat' : /[⭐🌟✨💫]/u.test(s) ? 'star' : /[🌞☀]/u.test(s) ? 'sun' : /[🌙🌚🌜]/u.test(s) ? 'moon' : /[🛒🛍]/u.test(s) ? 'bag' : /[💊]/u.test(s) ? 'medicine' : /[❤️💜💙💕]/u.test(s) ? 'heart' : 'leaf');

    function symbols(node) {
        if (!node || !node.isConnected) return;
        const walker = D.createTreeWalker(node, NodeFilter.SHOW_TEXT),
            nodes = [];
        while (walker.nextNode()) {
            const n = walker.currentNode,
                p = n.parentElement;
            if (!p || p.closest('script,style,svg,input,textarea,option,code,pre,.cm-t,.cm-quote,.fy-cap,.fy-caption,.tr-cap,.sp-profile-sign,[contenteditable]')) continue;
            emoji.lastIndex = 0;
            if ((emoji.lastIndex = 0, emoji.test(n.data)) || (!window.LowiIcons && /\b(Pisces|Fische|Piscis)\b/.test(n.data))) nodes.push(n);
        }
        for (const n of nodes) {
            const fragment = D.createElement('span');
            fragment.className = 'sp-ui-copy';
            if (window.LowiIcons) {
              /* shared custom set (lowi-icons.js): the right icon per emoji, words stay; an emoji that was the slot's only text gets a label */
              let raw = n.data;
              /* translate the whole line first: some translations are keyed with their emoji ("🥩 Mince & patties") */
              try { const k = raw.trim(), tt = window.LowiLang && LowiLang.t(k); if (tt && tt !== k) raw = raw.replace(k, tt); } catch (e) {}
              const alone = !raw.replace(emoji, '').trim(),
                named = alone && n.parentElement && n.parentElement.closest('[aria-label],[title],[aria-hidden="true"]');
              fragment.innerHTML = esc(raw).replace(emoji, s => /^[\u00A9\u00AE\u2122]/.test(s) ? s : LowiIcons.fromEmoji(s, { alone: alone && !named }));
            } else fragment.innerHTML = esc(n.data).replace(emoji, s => icon(symbolKind(s))).replace(/\b(Pisces|Fische|Piscis)\b/g, icon('Pisces'));
            n.replaceWith(fragment);
        }
    }

    function attachPick() {
        const pick = D.getElementById('r5Pick');
        if (!pick || pick.__spPick) return;
        pick.__spPick = true;
        pick.addEventListener('click', e => {
            if (e.target.closest('button,a,input')) return;
            /* Cook's pick card already opens Cook's own full recipe view; never stack a second sheet on it */
            return;
        });
    }

    /* every meal log shows what it was worth: macros + XP, right on Home, while the herb eats */
    function mealNotice(log, xp) {
        if (!log || !home) return;
        const notice = D.getElementById('spMealNotice') || D.createElement('button');
        notice.id = 'spMealNotice';
        notice.type = 'button';
        notice.dataset.sp = 'editMeal';
        notice.dataset.id = log.id || log.eventId || String(log.ts);
        const m = K.macros(log);
        notice.innerHTML = '<b>' + esc(log.t) + (xp ? ' · <em>+' + xp + ' XP</em>' : '') + '</b><span>' + ['protein', 'fiber', 'sugar'].map(k => '<i class="sp-chip sp-chip-' + k + '">' + esc(tr(k)) + ' ' + (m[k] === null ? '—' : Math.round(m[k]) + ' g') + '</i>').join('') + '</span>';
        notice.classList.remove('on');
        home.querySelector('.sp-heroes').append(notice);
        requestAnimationFrame(() => notice.classList.add('on'));
        clearTimeout(mealNotice.t);
        mealNotice.t = setTimeout(() => notice.remove(), 6500);
    }

    function legacyMeal(entry) {
        if (!/meal/.test((entry.src || '') + ' ' + (entry.label || '')) || entry.src === 'meal:spirit') return;
        const s = V.state(),
            log = s.logs[s.logs.length - 1];
        if (!log) return;
        mealNotice(log, entry.amt);
        if (!opened && home) {
            home.dataset.reaction = 'eat';
            setTimeout(() => { if (home.dataset.reaction === 'eat') delete home.dataset.reaction; }, 2400);
        }
        checkBonuses(false);
    }
    const sheetBase = R.sheet;
    R.sheet = function() {
        const ov = sheetBase.apply(this, arguments);
        if (opened && ov) {
            world.append(ov);
            ov.classList.add('sp-sheet');
        }
        requestAnimationFrame(() => {
            const sh = ov?.querySelector('.r2-sh');
            if (!sh) return;
            const text = sh.textContent.trim();
            if (/^(move|bewegen|bewegung|moverse|×|close|schließen)$/i.test(text) && !sh.querySelector('input,textarea,select')) {
                R.close(ov);
                return;
            }
            paginate(sh);
            symbols(sh);
        });
        return ov;
    };
    D.addEventListener('click', e => {
        const b = e.target.closest?.('[data-sp]');
        if (!b) return;
        const a = b.dataset.sp;
        if ((a === 'photo' || a === 'scan') && ownedSheet && ownedSheet.contains(b)) {
            R.close(ownedSheet);
            ownedSheet = null;
        }
        if (a === 'open') open();
        else if (a === 'close') close();
        else if (a === 'scan') scan();
        else if (a === 'photo') photo();
        else if (a === 'meal') mealForm();
        else if (a === 'quickMeal') quickMeal(b.dataset.q);
        else if (a === 'water') water();
        else if (a === 'weather') weather(true);
        else if (a === 'move' || a === 'checkin') {
            if (opened) close(true);
            if (a === 'move') {
                if (typeof goTab === 'function') goTab('move');
            } else {
                const t = D.querySelector('#g2hTiles [data-g2h-open="morn"]');
                if (t) t.click();
            }
        } else if (a === 'cancelCapture') cancelCapture();
        else if (a === 'shutter') shutter();
        else if (a === 'upload') photoInput.click();
        else if (a === 'savePhoto') savePhoto();
        else if (a === 'wardrobe') wardrobe();
        else if (a === 'collection') collection();
        else if (a === 'profile') profile();
        else if (a === 'path') showSheet('<h2>' + esc(tr('evolution')) + '</h2>' + pathHTML());
        else if (a === 'quiz' || a === 'setup') quiz(true);
        else if (a === 'resetName' && window.LowiHerbIdentity) { LowiHerbIdentity.resetName(); profile(); }
        else if (a === 'quizAnswer') answer(b.dataset.value);
        else if (a === 'goals') goals();
        else if (a === 'completeDay') {
            checkBonuses(true);
            if (ownedSheet) R.close(ownedSheet);
        } else if (a === 'pick') showPick();
        else if (a === 'equip') {
            if (wdEquip(b.dataset.item)) {
                wd.sel = b.dataset.item;
                wdPaint('.wd-act');
            }
        } else if (a === 'wdPick') {
            wd.sel = b.dataset.item;
            wdPaint('[data-item="' + b.dataset.item + '"]');
        } else if (a === 'wdTab') {
            wd.kind = b.dataset.kind;
            wd.sel = '';
            wdPaint('[data-kind="' + b.dataset.kind + '"]');
        } else if (a === 'wdReset') {
            const {
                p
            } = get();
            T.setEquipment(p, {
                ...WC.BASE_EQUIPMENT
            });
            signature = '';
            refresh();
            wdPaint('.wd-tabs [aria-selected=true]');
        } else if (a === 'product') {
            const item = Object.values(LowiDex.state().mine || {}).find(p => String(p.barcode || p.id || p.name) === b.dataset.key);
            if (item) LowiDex.reveal(item);
        } else if (a === 'fast') {
            const water = D.querySelector('#spFast .sp-fast-water');
            if (water && !reduced()) water.animate([{
                transform: 'rotate(0)'
            }, {
                transform: 'rotate(12deg)'
            }, {
                transform: 'rotate(-9deg)'
            }, {
                transform: 'rotate(4deg)'
            }, {
                transform: 'rotate(0)'
            }], {
                duration: 850
            });
            if (window.LowiFastStop) LowiFastStop.open();
        } else if (a === 'editMeal') {
            const log = V.state().logs.find(l => String(l.id || l.eventId || l.ts) === b.dataset.id);
            if (log) mealForm(log, log.id || log.eventId || String(log.ts));
        } else if (a === 'pickPage') {
            const article = b.closest('.sp-pick');
            article.querySelectorAll('[data-pick-page]').forEach(n => n.hidden = n.dataset.pickPage !== b.dataset.page);
            paginate(article.closest('.r2-sh'));
        } else if (a === 'cookPick') {
            const r = ownedSheet?.__recipe;
            if (r) {
                R.close(ownedSheet);
                close();
                V.cookRecipe(r.id);
            }
        } else if (a === 'logPick') {
            const r = ownedSheet?.__recipe;
            if (r) logPick(r, ownedSheet.__macros, ownedSheet.__name);
        } else if (a === 'herbPick') {
            const pk = herbPick();
            if (pk) showPick(pk.recipe, pk.why);
        } else if (a === 'pageNext' || a === 'pageBack') {
            const pager = b.closest('.sp-pager'),
                pages = pager.__pages;
            if (!pages) return;
            pager.__index = Math.max(0, Math.min(pages.length - 1, pager.__index + (a === 'pageNext' ? 1 : -1)));
            pages.forEach((p, i) => p.hidden = i !== pager.__index);
            setText(pager.querySelector('span'), (pager.__index + 1) + ' / ' + pages.length);
        }
    });
    D.addEventListener('submit', e => {
        if (e.target.id === 'spMeal') {
            e.preventDefault();
            finishMeal(e.target);
        } else if (e.target.id === 'spProfile') {
            e.preventDefault();
            const data = new FormData(e.target),
                s = V.state(),
                {
                    p
                } = get();
            const entered = String(data.get('name')).trim().slice(0, 24);
            if (window.LowiHerbIdentity) p.name = LowiHerbIdentity.setCustomName(entered);
            else if (p.name || entered !== name()) p.name = entered;
            s.user.bday = String(data.get('birthday'));
            T.savePrefs(p);
            R.save();
            signature = '';
            refresh();
            profile();
        } else if (e.target.id === 'spGoals') {
            e.preventDefault();
            const data = new FormData(e.target),
                s = V.state();
            s.user.macroGoals = {};
            for (const k of ['protein', 'fiber', 'sugar']) {
                const n = +data.get(k);
                if (n > 0) s.user.macroGoals[k] = n;
            }
            R.save();
            checkBonuses(false);
            profile();
        }
    });
    D.addEventListener('keydown', e => {
        if (!opened) return;
        if (e.key === 'Escape') {
            if (R.top?.()) R.close(R.top());
            else close();
            e.preventDefault();
        }
        if (e.key === 'Tab' && !R.top?.()) {
            const nodes = [...world.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(n => n.getClientRects().length),
                first = nodes[0],
                last = nodes[nodes.length - 1];
            if (e.shiftKey && D.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && D.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });
    window.addEventListener('lowi:reward', e => {
        refresh();
        if (e.detail?.entry) setTimeout(() => legacyMeal(e.detail.entry), 0);
    });
    window.addEventListener('lowi:state', refresh);
    window.addEventListener('resize', refresh);
    D.addEventListener('visibilitychange', () => {
        if (D.hidden) stopPhoto();
        else refresh();
    });
    const pendingNodes = new Set();
    let observerQueued = false;
    const observer = new MutationObserver(ms => {
        for (const m of ms)
            for (const n of m.addedNodes)
                if (n.nodeType === 1 && !n.matches('svg,.sp-symbol,.sp-ui-copy')) pendingNodes.add(n);
                else if (n.nodeType === 3 && window.LowiIcons && n.parentElement && !n.parentElement.closest('svg') && (emoji.lastIndex = 0, emoji.test(n.data))) pendingNodes.add(n.parentElement);
        if (observerQueued || !pendingNodes.size) return;
        observerQueued = true;
        requestAnimationFrame(() => {
            observerQueued = false;
            const nodes = [...pendingNodes];
            pendingNodes.clear();
            nodes.forEach(symbols);
            attachPick();
            identityColors();
            if (!D.getElementById('spHome')) refresh();
        });
    });
    const WEATHER_KEY = 'lowi.weather.v1';
    function weatherIcon(code, night) {
        if (code <= 1) return night ? 'moon' : 'sun';
        if (code === 2) return 'cloudsun';
        if (code === 3) return 'cloud';
        if (code === 45 || code === 48) return 'fog';
        if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
        if (code >= 95) return 'storm';
        return 'rain';
    }
    function weatherWord(code) {
        const k = code <= 1 ? 0 : code === 2 ? 1 : code === 3 ? 2 : (code === 45 || code === 48) ? 3 : ((code >= 71 && code <= 77) || code === 85 || code === 86) ? 5 : code >= 95 ? 6 : 4;
        return [
            ['Clear', 'Klar', 'Despejado'],
            ['Some clouds', 'Leicht bew\u00f6lkt', 'Algo nublado'],
            ['Cloudy', 'Bew\u00f6lkt', 'Nublado'],
            ['Fog', 'Nebel', 'Niebla'],
            ['Rain', 'Regen', 'Lluvia'],
            ['Snow', 'Schnee', 'Nieve'],
            ['Thunder', 'Gewitter', 'Tormenta']
        ][k][{
            de: 1,
            es: 2
        } [lang()] || 0];
    }
    function paintWeather(w) {
        const el = home && home.querySelector('.sp-weather');
        if (!el) return;
        if (!w) {
            el.hidden = localStorage.getItem(WEATHER_KEY + '.off') === '1';
            el.classList.add('ask');
            el.innerHTML = icon('cloudsun') + '<span>' + esc(tr('weatherOn')) + '</span>';
            el.setAttribute('aria-label', tr('weatherOn'));
            return;
        }
        let night = (new Date().getHours() >= 20 || new Date().getHours() < 6);
        try {
            if (window.LowiSky) night = !LowiSky.isDay();
        } catch (e) {}
        el.hidden = false;
        el.classList.remove('ask');
        el.dataset.code = w.code;
        el.innerHTML = icon(weatherIcon(w.code, night)) + '<span>' + Math.round(w.temp) + '\u00b0</span>';
        el.setAttribute('aria-label', weatherWord(w.code) + ', ' + Math.round(w.temp) + '\u00b0');
        el.title = weatherWord(w.code);
        try {
            D.dispatchEvent(new CustomEvent('lowi:weather', {
                detail: w
            }));
        } catch (e) {}
    }
    function cachedWeather() {
        try {
            return JSON.parse(localStorage.getItem('lowi.weather.v1') || 'null');
        } catch (e) {
            return null;
        }
    }
    function paintCachedWeather() {
        try {
            const w = cachedWeather();
            paintWeather(w && Number.isFinite(+w.temp) ? w : null);
        } catch (e) {}
    }
    function weather(ask, launch) {
        let cached = null;
        try {
            cached = JSON.parse(localStorage.getItem(WEATHER_KEY) || 'null');
        } catch (e) {}
        if (cached && Date.now() - cached.ts < (launch ? 10 : 30) * 60000 && !ask) return paintWeather(cached);
        paintWeather(cached);
        if (!navigator.geolocation) return;
        const go = () => navigator.geolocation.getCurrentPosition(async pos => {
            /* iOS home-screen apps often report 'prompt' at launch: remember the yes as soon as a position arrives, even if the weather fetch then fails offline */
            try { localStorage.setItem(WEATHER_KEY + '.optin', '1'); } catch (e) {}
            try {
                const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + pos.coords.latitude.toFixed(2) + '&longitude=' + pos.coords.longitude.toFixed(2) + '&current=temperature_2m,weather_code,is_day&daily=sunrise,sunset&forecast_days=1&timezone=auto';
                const response = await fetch(url, {
                    signal: AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined
                });
                if (!response.ok) return;
                const data = await response.json();
                if (!Number.isFinite(data.current?.temperature_2m)) return;
                /* weather-sky-core adds is_day + real sunrise/sunset so the app sky follows outside */
                const w = (window.LowiSkyCore && LowiSkyCore.fromOpenMeteo(data, Date.now())) || {
                    temp: data.current.temperature_2m,
                    code: +data.current.weather_code || 0,
                    ts: Date.now()
                };
                try {
                    localStorage.setItem(WEATHER_KEY, JSON.stringify(w));
                    localStorage.setItem(WEATHER_KEY + '.optin', '1');
                    localStorage.removeItem(WEATHER_KEY + '.off');
                } catch (e) {}
                paintWeather(w);
            } catch (e) {}
        }, err => {
            if (err && err.code === 1 && !ask) {
                try {
                    localStorage.setItem(WEATHER_KEY + '.optin', '0');
                } catch (e) {}
                return;
            }
            if (err && err.code === 1 && ask) {
                try {
                    localStorage.setItem(WEATHER_KEY + '.off', '1');
                    localStorage.removeItem(WEATHER_KEY + '.optin');
                } catch (e) {}
                paintWeather(null);
            }
        }, {
            maximumAge: 1800000,
            timeout: 8000
        });
        if (ask) return go();
        /* iOS home-screen apps often report 'prompt' even after the user allowed location, so the
           user's own opt-in (a reading we fetched before) also counts. 'denied' always wins. */
        let optin = false;
        try {
            const o = localStorage.getItem(WEATHER_KEY + '.optin');
            optin = o === '1' || (o === null && !!cached && localStorage.getItem(WEATHER_KEY + '.off') !== '1');
        } catch (e) {}
        if (!navigator.permissions) {
            if (optin) go();
            return;
        }
        navigator.permissions.query({
            name: 'geolocation'
        }).then(p => {
            if (p.state === 'granted' || (optin && p.state !== 'denied')) go();
        }).catch(() => {
            if (optin) go();
        });
    }
    /* after "Ate it" / "Skip" on a scan: the full-screen herb world closes by itself, a small XP pop instead */
    function afterScan(xp, text, kind) {
        if (opened || (world && !world.hidden)) close();
        if (!text && !xp) return;
        setTimeout(() => feedback(kind || 'eat', text, xp), 80);
    }
    window.LowiSpirit = {
        open,
        close,
        afterScan,
        refresh,
        isOpen: () => opened,
        target: () => opened ? world : home,
        scannerHost,
        captureProduct,
        pathHTML,
        showPick,
        macroHTML,
        hideCreature: hide => {
            if (creature) creature.style.visibility = hide ? 'hidden' : '';
        },
        state: () => ({
            opened,
            capture,
            build: V.build || ''
        })
    };
    if (window.LowiLang && LowiLang.add) LowiLang.add(LOWI_HERB_CONFIG.stages.map(s => s.name));
    D.documentElement.classList.add('spirit-app');
    ensure();
    paint();
    symbols(D.body);
    observer.observe(D.body, {
        childList: true,
        subtree: true
    });
    weather(false, true);
    /* keep the reading current while the app stays open (cached 30 min, never prompts) */
    setInterval(() => {
        if (!D.hidden) weather();
    }, 10 * 60000);
    D.addEventListener('visibilitychange', () => {
        if (!D.hidden) weather();
    });
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        if (!D.hidden) refresh();
    }, 60000);
    T.refresh(true);
})();