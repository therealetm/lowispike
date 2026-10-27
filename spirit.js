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
        world: ['Your companion’s world', 'Die Welt deines Begleiters', 'El mundo de tu ser de luz'],
        scanHead: ['Scan · your companion is watching', 'Scannen · dein Begleiter schaut zu', 'Escanear · tu ser de luz mira'],
        close: ['Close', 'Schließen', 'Cerrar'],
        scan: ['Scan a product', 'Produkt scannen', 'Escanear producto'],
        photo: ['Snap food', 'Essen fotografieren', 'Fotografiar comida'],
        meal: ['Log a meal', 'Mahlzeit eintragen', 'Registrar comida'],
        water: ['Log water', 'Wasser eintragen', 'Registrar agua'],
        wardrobe: ['Wardrobe', 'Kleiderschrank', 'Armario'],
        collection: ['Your scans', 'Deine Scans', 'Tus escaneos'],
        yourScans: ['Your scans', 'Deine Scans', 'Tus escaneos'],
        profile: ['Your companion', 'Dein Begleiter', 'Tu ser de luz'],
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
        drinkSips: ['Ten sips, roughly. Every sip fills me up!', 'Zehn Sips, ungefähr. Jeder Sip füllt mich auf!', 'Diez sorbos, más o menos. ¡Cada sorbo me llena!'],
        drinkBottle: ['A whole bottle! I am glowing.', 'Eine ganze Flasche! Ich leuchte.', '¡Una botella entera! Estoy brillando.'],
        waterSaved: ['Water logged', 'Wasser eingetragen', 'Agua registrada'],
        captured: ['Caught for Misty', 'Für Misty eingefangen', 'Capturado para Misty'],
        glow: ['Caught! My leaves are glowing.', 'Eingefangen! Meine Blätter leuchten.', '¡Capturado! Mis hojas brillan.'],
        scanOk: ['Yes, I like this one! Likely only a small spike.', 'Ja, das mag ich! Wahrscheinlich nur ein kleiner Spike.', '¡Sí, me gusta! Probablemente solo un pico pequeño.'],
        scanBetter: ['Hmm, a small portion. Pair it with protein or fiber.', 'Hmm, lieber eine kleine Portion. Am besten mit Eiweiß oder Ballaststoffen.', 'Hmm, mejor una porción pequeña. Con proteína o fibra.'],
        scanSpike: ['Oof, that one makes me wobble. Likely a spike. Catch it so others know too.', 'Uff, da wackle ich. Wahrscheinlich ein Spike. Fang es, damit andere es auch wissen.', 'Uf, eso me hace temblar. Probablemente un pico. Atrápalo para que otros también lo sepan.'],
        photoTitle: ['Your photo', 'Dein Foto', 'Tu foto'],
        savePhoto: ['Save photo', 'Foto speichern', 'Guardar foto'],
        photoSaved: ['Photo ready', 'Foto bereit', 'Foto lista'],
        photoHold: ['Press and hold the photo to save it to your Photos.', 'Halte das Foto gedr\u00fcckt, um es in deinen Fotos zu sichern.', 'Mant\u00e9n pulsada la foto para guardarla en tus Fotos.'],
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
        save: ['Log meal', 'Mahlzeit eintragen', 'Registrar comida'],
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
        herbTip: ['Misty suggests', 'Misty schlägt vor', 'Misty sugiere'],
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
        cancel: ['Close', 'Schließen', 'Cerrar'],
        /* Oct 16 (E-man: Scan's meal, photo and barcode screens in the app's black space + blue glass): the food camera's own words */
        snapTitle: ['Snap your food', 'Fotografiere dein Essen', 'Fotografía tu comida'],
        snapHint: ['Fit your plate in the frame, then tap the big button.', 'Teller in den Rahmen, dann den großen Knopf tippen.', 'Encuadra tu plato y toca el botón grande.'],
        snapStart: ['Starting camera…', 'Kamera startet…', 'Iniciando cámara…'],
        typeIt: ['Type it', 'Eintippen', 'Escribir'],
        barcode: ['Barcode', 'Barcode', 'Código'],
        library: ['Photos', 'Fotos', 'Fotos'],
        retake: ['Retake', 'Neu aufnehmen', 'Repetir'],
        camOff: ['Camera is off for LOWiSPIKE', 'Kamera ist für LOWiSPIKE aus', 'La cámara está desactivada para LOWiSPIKE'],
        camOffS: ['Allow it in Settings › Safari › Camera (or aA › Website Settings), then tap Try again. Or choose a photo.', 'Erlaube sie in Einstellungen › Safari › Kamera (oder aA › Website-Einstellungen) und tippe auf Nochmal. Oder wähle ein Foto.', 'Actívala en Ajustes › Safari › Cámara (o aA › Configuración del sitio web) y toca Reintentar. O elige una foto.'],
        camNone: ['No camera here', 'Keine Kamera verfügbar', 'No hay cámara'],
        camNoneS: ['Choose a photo from your library, or type the meal in.', 'Wähle ein Foto aus deiner Mediathek oder trag das Essen ein.', 'Elige una foto de tu galería o escribe la comida.'],
        camTryAgain: ['Try again', 'Nochmal', 'Reintentar'],
        photoPh: ['e.g. chicken salad', 'z. B. Hähnchensalat', 'p. ej. ensalada de pollo'],
        ends: ['Ends', 'Ende', 'Termina'],
        goal: ['of', 'von', 'de'],
        fast: ['Fasting', 'Fasten', 'Ayuno'],
        noFast: ['—', '—', '—'], /* nofake Oct 19: no meal known yet = no number (was "Start a fast"); fits the 70 px ring bubble, the Gap bloom asks when you ate */
        storage: ['Could not save. Please free some space and try again.', 'Speichern nicht möglich. Schaffe etwas Platz und versuche es erneut.', 'No se pudo guardar. Libera espacio e inténtalo de nuevo.'],
        emptyCollection: ['Scan a product and it shows up here, with its result.', 'Scanne ein Produkt, dann steht es hier mit seinem Ergebnis.', 'Escanea un producto y aparecer\u00e1 aqu\u00ed con su resultado.'],
        leafHelp: ['Drag to throw. Hold to squeeze. Use two fingers to stretch.', 'Ziehen zum Werfen. Halten zum Drücken. Mit zwei Fingern dehnen.', 'Arrastra para lanzar. Mantén para apretar. Usa dos dedos para estirar.'],
        todayLog: ['Today', 'Heute', 'Hoy'],
        recent: ['Eaten recently · one tap', 'Zuletzt gegessen · ein Tipp', 'Comido hace poco · un toque'],
        /* Oct 19 (E-man: "Ich habe Pop-up. Zack, Mahlzeit-Eintrag." Breakfast, lunch, dinner, and snacks, then write, scan or snap) */
        slotQ: ['Meal or snack?', 'Mahlzeit oder Snack?', '¿Comida o snack?'],
        /* Oct 23 (E-man: "I want to see exactly what I logged and what time ... maybe I want to edit it ... But minimalistic.") */
        kMeal: ['Meal', 'Mahlzeit', 'Comida'],
        kSnack: ['Snack', 'Snack', 'Snack'],
        todayH: ['Today', 'Heute', 'Hoy'],
        editH: ['Edit', 'Bearbeiten', 'Editar'],
        editWhat: ['What you ate', 'Was du gegessen hast', 'Lo que comiste'],
        editAdd: ['Add to it', 'Noch dazu', 'Añadir'],
        editAddPh: ['e.g. one more chicken piece', 'z. B. noch ein Stück Hähnchen', 'p. ej. otro trozo de pollo'],
        editTime: ['Time', 'Uhrzeit', 'Hora'],
        editSave: ['Save changes', 'Änderungen speichern', 'Guardar cambios'],
        editDel: ['Remove', 'Entfernen', 'Quitar'],
        editDelSure: ['Tap again to remove', 'Nochmal tippen zum Entfernen', 'Toca otra vez para quitar'],
        editDone: ['Updated', 'Aktualisiert', 'Actualizado'],
        editGone: ['Removed', 'Entfernt', 'Quitado'],
        editFuture: ['That time is still ahead', 'Diese Uhrzeit kommt erst noch', 'Esa hora aún no ha llegado'],
        editPhoto: ['Open photo', 'Foto öffnen', 'Abrir foto'],
        gapQ: ['Fast ended and points saved. Want to add what you ate? A photo or a few words, or skip.', 'Fasten beendet, Punkte gespeichert. Willst du eintragen, was du gegessen hast? Foto oder ein paar Worte, oder überspringen.', 'Ayuno terminado y puntos guardados. ¿Quieres añadir lo que comiste? Una foto o unas palabras, o sáltatelo.'],
        gapSkip: ['Not now', 'Jetzt nicht', 'Ahora no'],
        breakfast: ['Breakfast', 'Frühstück', 'Desayuno'],
        lunch: ['Lunch', 'Mittagessen', 'Almuerzo'],
        dinner: ['Dinner', 'Abendessen', 'Cena'],
        snack: ['Snacks', 'Snacks', 'Snacks'],
        slotNow: ['now', 'jetzt', 'ahora'],
        slotDone: ['logged today', 'heute eingetragen', 'registrado hoy'],
        slotChange: ['Change', 'Ändern', 'Cambiar'],
        slotHow: ['How do you want to add it?', 'Wie willst du es eintragen?', '¿Cómo quieres añadirlo?'],
        slotWrite: ['Write', 'Schreiben', 'Escribir'],
        slotScan: ['Scan', 'Scannen', 'Escanear'],
        slotSnap: ['Snap', 'Foto', 'Foto'],
        whenQ: ['When did you eat?', 'Wann hast du gegessen?', '¿Cuándo comiste?'],
        whenNow: ['Now', 'Jetzt', 'Ahora'],
        whenM: ['{n} min ago', 'vor {n} Min.', 'hace {n} min'],
        whenH: ['{n} h ago', 'vor {n} Std.', 'hace {n} h'],
        sinceMeal: ['Since last meal', 'Seit der letzten Mahlzeit', 'Desde la última comida'],
        noMealYet: ['no meal yet', 'noch kein Essen', 'sin comida aún'],
        gapAria: ['Meal gap: {h} h {m} min since your last meal at {t}. Tap to see more.', 'Essenspause: {h} Std. {m} Min. seit deiner letzten Mahlzeit um {t}. Tippen für mehr.', 'Pausa entre comidas: {h} h {m} min desde tu última comida a las {t}. Toca para ver más.'],
        gapAria0: ['Meal gap: no meal logged yet. Log a meal in Fuel and the time since it shows here.', 'Essenspause: noch keine Mahlzeit eingetragen. Trag eine Mahlzeit bei Essen ein, dann steht hier die Zeit seitdem.', 'Pausa entre comidas: aún no hay comidas. Registra una en Comida y aquí verás el tiempo desde entonces.'],
        lastAt: ['last meal {t}', 'letzte Mahlzeit {t}', 'última comida {t}'],
        slotRecent: ['Your usual · one tap', 'Wie immer · ein Tipp', 'Lo de siempre · un toque'],
        recentEmpty: ['Meals you log show up here for one tap next time.', 'Deine Mahlzeiten erscheinen hier, beim nächsten Mal mit einem Tipp.', 'Tus comidas aparecen aquí para registrarlas con un toque.'],
        mealAsk: ['What did you eat?', 'Was hast du gegessen?', '¿Qué comiste?'],
        mealPh: ['e.g. chicken stew, fish and chips', 'z. B. Hähnchen-Eintopf, Fisch mit Pommes', 'p. ej. guiso de pollo, pescado con papas'],
        ownNumbers: ['Add your own numbers (optional)', 'Eigene Werte eintragen (optional)', 'Añadir tus propios valores (opcional)'],
        /* Oct 27 calm Log meal sheet (one input, quiet time, own values tucked away) */
        lmUsual: ['Your usual', 'Wie immer', 'Lo de siempre'],
        lmIdea: ['Idea from Misty', 'Idee von Misty', 'Idea de Misty'],
        lmOwn: ['Own values', 'Eigene Werte', 'Tus valores'],
        lmPhoto: ['Photo', 'Foto', 'Foto'],
        lmSnapT: ['Take a photo of your food', 'Foto von deinem Essen', 'Haz una foto de tu comida'],
        lmSnapS: ['Misty fills in the rest', 'Misty füllt den Rest aus', 'Misty completa el resto'],
        lmSnapNone: ['No photos left today. Just type it below.', 'Heute keine Fotos mehr. Schreib es einfach unten.', 'Hoy no quedan fotos. Escríbelo abajo.'],
        lmOrType: ['Or type what you ate', 'Oder schreib, was du isst', 'O escribe lo que comes'],
        lmCode: ['Barcode', 'Barcode', 'Código'],
        lmAt: ['at {t}', 'um {t}', 'a las {t}'],
        lmTimeA: ['When did you eat? {t}. Tap to change', 'Wann hast du gegessen? {t}. Tippen zum Ändern', '¿Cuándo comiste? {t}. Toca para cambiar'],
        lmSnackSave: ['Log snack', 'Snack eintragen', 'Registrar tentempié'],
        lmGap: ['Fast ended, your time is saved. Add what you ate, or skip.', 'Fasten beendet, deine Zeit ist gespeichert. Trag ein, was du gegessen hast, oder überspring es.', 'Ayuno terminado, tu hora está guardada. Añade lo que comiste, o sáltalo.'],
        lmToday: ['Today · {n}', 'Heute · {n}', 'Hoy · {n}'],
        lmAgain: ['Log again: {t}', 'Nochmal eintragen: {t}', 'Registrar otra vez: {t}'],
        understood: ['Understood as', 'Erkannt als', 'Entendido como'],
        roughMeal: ['A typical meal (rough estimate)', 'Eine typische Mahlzeit (grobe Schätzung)', 'Una comida típica (estimación aproximada)'],
        ingr: ['Ingredients', 'Zutaten', 'Ingredientes'],
        estSrc: ['Estimated for one serving from USDA food data. Your own numbers always win.', 'Für eine Portion aus USDA-Nährwertdaten geschätzt. Deine eigenen Werte gehen immer vor.', 'Estimado para una porción con datos de USDA. Tus propios valores siempre mandan.'],
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
        macroOptional: ['Optional: use the label or your own portion values. Empty ones are estimated from the meal name.', 'Optional: Werte vom Etikett oder für deine Portion. Leere Felder werden aus dem Namen geschätzt.', 'Opcional: usa la etiqueta o tus valores de porción. Los vacíos se estiman con el nombre de la comida.']
    };
    const wnm = s => { try { const B = (typeof window !== 'undefined' ? window : globalThis).LowiBirthCompanion; return s && B && B.withName ? B.withName(s) : s; } catch (e) { return s; } }; /* BH-045: the user's own companion name, never the default "Misty" */
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
        foodCam = null,
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

    /* BH-006: the companion's name = own companion's name, else a name the user typed, else Misty; never the old herb auto name ("Moss Leaf") */
    function companionName() { const w = typeof window !== 'undefined' ? window : globalThis; const pick = v => { v = v == null ? '' : String(v).trim(); return v ? v.slice(0, 24) : ''; }; let auto = ''; try { auto = pick(w.LowiHerbIdentity && w.LowiHerbIdentity.autoName && w.LowiHerbIdentity.autoName()); } catch (e) { } const typed = v => { v = pick(v); return v && v !== auto ? v : ''; }; let n = ''; try { const B = w.LowiBirthCompanion; if (B && B.has && B.has()) { const c = B.get(); n = pick(c && c.name); } } catch (e) { } if (!n) try { const t = w.LowiHerbTamagotchi, p = t && t.readPrefs && t.readPrefs(); n = typed(p && p.name); } catch (e) { } if (!n) try { const R = w.LowiR2, s = R && R.S && R.S(); n = typed(s && s.herb && s.herb.name); } catch (e) { } return n || 'Misty'; }
    function name() { return companionName(); }

    const waterTxt = n => (K.waterFmt ? K.waterFmt(n) : String(n)); /* wsip: 1½, ¾ */
    const WATER_GOAL = 6; /* Oct 17: 6 cups a day, the same goal as the Home water bubble */
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
            title = L(n + ' is thirsty and tired', n + ' ist durstig und schlapp', n + ' tiene sed y poca energía');
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
            /* Oct 16: once you said goodnight in Misty's card, Today stops asking */
            try { if (window.LowiMistyHub && window.LowiMistyHub.saidGoodnight()) { title = L(n + ' is fast asleep', n + ' schläft tief', n + ' duerme profundamente'); sub = L('Sweet dreams · your XP is safe', 'Süße Träume · deine XP sind sicher', 'Dulces sueños · tus XP están a salvo'); next = pick('open', 'moon', L('Visit ' + n, n + ' besuchen', 'Visitar a ' + n)); } } catch (e) { }
        }
        if (!next) {
            if (!day.meals) {
                sub = L('Feeds your companion +15 XP', 'Füttert deinen Begleiter +15 XP', 'Da energía a tu ser de luz +15 XP');
                next = pick('meal', 'plate', L('Log meal', 'Essen eintragen', 'Registrar comida'));
            } else if (day.water < WATER_GOAL) {
                sub = L('Keeps the leaves fresh +2 XP', 'Hält die Blätter frisch +2 XP', 'Mantiene las hojas frescas +2 XP');
                next = pick('water', 'water', L('Drink water', 'Wasser trinken', 'Beber agua'));
            } else if (!day.moved) {
                sub = L('A few minutes give energy', 'Ein paar Minuten geben Energie', 'Unos minutos dan energía');
                next = pick('move', 'move', L('Move', 'Bewegen', 'Moverse'));
            } else if (!day.scanned) {
                sub = L('Adds it to your scans', 'Kommt zu deinen Scans', 'Se a\u00f1ade a tus escaneos');
                next = pick('scan', 'scan', L('Scan', 'Scannen', 'Escanear'));
            } else {
                mood = 'glow';
                title = L(n + ' is glowing', n + ' leuchtet', n + ' brilla');
                sub = L('All done today', 'Heute alles geschafft', 'Todo hecho hoy');
                next = pick('path', 'mystery', L('Forms', 'Formen', 'Formas'));
            }
        }
        /* Oct 17: the status line never says "bright and awake" (or glowing) while her energy ring / controller say she is
           worn out: it reads the same shared energy (LowiSun.energyNow) as the ring and the zz */
        let en = null;
        try { en = window.LowiSun && window.LowiSun.energyNow ? window.LowiSun.energyNow() : null; } catch (e) { en = null; }
        if (en && (en.tier === 'weak' || en.tier === 'tired') && (mood === 'fresh' || mood === 'glow')) {
            mood = 'tired';
            title = en.tier === 'weak' ? L(n + ' is low on energy', n + ' hat wenig Energie', n + ' tiene poca energía') : L(n + ' is a bit sleepy', n + ' ist etwas müde', n + ' tiene algo de sueño');
        }
        /* Oct 22 (E-man: "100%" and "bright and awake" while her face was flat and the world dull): a sugar rush (cell-world.js) or a
           stormy world wins over the happy lines, and only the real peak (misty-peak.js, every World glow row done) says Supernova */
        let pk = null;
        try { const M = window.LowiMistyPeak; if (M && M.now && M.statusFor) pk = M.statusFor(M.now(), n, lang()); } catch (e) { pk = null; }
        if (pk && pk.mood === 'peak') {
            if (mood === 'fresh' || mood === 'glow') { mood = 'peak'; title = pk.title; sub = pk.sub; }
        } else if (pk && pk.mood === 'spiked' && mood !== 'dry' && mood !== 'night') {
            const thirsty = mood === 'thirsty';
            mood = 'spiked'; title = pk.title; sub = pk.sub;
            if (!thirsty && pk.action) next = pick(pk.action, pk.icon, pk.button);
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

    /* Home's Today pieces: world-home.js moves them into its #whToday sheet, so they can leave the page with that sheet */
    const STATUS_HTML = '<div class="sp-status"><i class="sp-status-dot" aria-hidden="true"></i><div><b></b><span></span></div><button type="button" class="sp-next" data-sp="water"></button></div>',
        LOG_HTML = '<section class="sp-log"><header><b></b><div class="sp-habits" aria-label="Habit tracker"></div></header><div class="sp-log-rows"></div></section>';

    function ensure() {
        if (!home || !home.isConnected) {
            const tab = D.getElementById('tab-home');
            if (!tab) return;
            home = D.createElement('section');
            home.id = 'spHome';
            home.className = 'rs-cols';
            home.setAttribute('data-noi18n', '');
            home.innerHTML = '<header class="sp-top"><div class="sp-greeting"><span></span><small></small></div><button type="button" class="sp-weather" data-sp="weather"></button></header><div class="sp-heroes"><button id="spBubble" class="sp-bubble" data-sp="open" aria-label="' + esc(tr('world')) + '"><span class="sp-bubble-water"></span><span class="sp-home-herb"></span><span class="sp-bubble-name"></span></button><button id="spFast" class="sp-fast" data-sp="fast"><span class="sp-fast-water"></span><span class="sp-fast-copy"></span></button></div>' + STATUS_HTML + LOG_HTML;
            tab.prepend(home);
            /* Oct 14: a rebuilt Home (after Community etc.) paints the weather pill from the cached reading right away */
            paintCachedWeather();
        }
        /* 26 Oct 2026 (nb.dataset): if the Today sheet left the page with .sp-status / .sp-log inside, every paint threw on the
           missing .sp-next and Home stopped updating. Put fresh pieces back; world-home.js wraps them into a new sheet. */
        if (home && !home.querySelector('.sp-status')) home.insertAdjacentHTML('beforeend', STATUS_HTML);
        if (home && !home.querySelector('.sp-log')) home.insertAdjacentHTML('beforeend', LOG_HTML);
        if (!world) {
            world = D.createElement('section');
            world.id = 'spWorld';
            world.hidden = true;
            world.setAttribute('role', 'dialog');
            world.setAttribute('aria-modal', 'true');
            world.setAttribute('aria-label', tr('world'));
            world.setAttribute('data-noi18n', '');
            world.innerHTML = '<header class="sp-world-head"><div><small><span class="sp-head-world">' + esc(tr('world')) + '</span><span class="sp-head-scan">' + esc(tr('scanHead')) + '</span></small><h1></h1></div>' + button('close', 'close', 'close') + '</header><div class="sp-world-xp"></div><div class="sp-stage"><div class="sp-constellation"></div><div class="sp-scanner-host"></div><div class="sp-body" tabindex="0" role="button" aria-label="' + esc(tr('leafHelp')) + '"></div><p class="sp-speech" role="status" aria-live="polite"></p><span class="sp-xp-pop" aria-hidden="true"></span></div><p class="sp-play-hint">' + esc(tr('leafHelp')) + '</p><footer class="sp-world-tools">' + button('collection', 'book', 'collection') + button('profile', 'leaf', 'profile') + button('evolution', 'mystery', 'path') + '</footer>';
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
            const wx = world.querySelector('.sp-world-xp'); if (wx) wx.innerHTML = xpHTML(m);
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
        if (nb) { if (nb.dataset.sp !== st.action) nb.dataset.sp = st.action; }
        const nbh = icon(st.icon) + '<span>' + esc(st.button) + '</span>';
        /* Oct 21 (instant back): compare with what this paint last wrote, never with innerHTML: symbols() swaps emoji for icons, so the
           page never matched and every paint (each resize, e.g. coming back to Home) rewrote the button and the log rows */
        if (nb && (nb.__spH !== nbh || !nb.firstChild)) { nb.innerHTML = nbh; nb.__spH = nbh; }
        setText(home.querySelector('.sp-log header b'), tr('todayLog') + ' · ' + new Intl.DateTimeFormat(locale(), {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit'
        }).format(now));
        const row = (key, ic, label, value, done, action) => '<button type="button" class="sp-log-row' + (done ? ' done' : '') + '" data-sp="' + action + '" data-log="' + key + '"><i class="sp-bullet" aria-hidden="true"></i>' + icon(ic) + '<span><b>' + esc(label) + '</b><small>' + esc(value) + '</small></span></button>';
        const rows = row('water', 'water', tr('waterLabel'), waterTxt(day.water) + ' / ' + WATER_GOAL + ' ' + tr('glasses'), day.water >= WATER_GOAL, 'water') + row('meal', 'plate', tr('mealLabel'), day.meals ? day.meals + ' ' + tr(day.meals === 1 ? 'mealOne' : 'mealMany') : tr('mealNone'), day.meals > 0, 'meal') + row('move', 'move', tr('moveLabel'), day.moved ? tr('moveDone') : tr('moveOpen'), day.moved, 'move') + row('checkin', 'check', tr('checkLabel'), day.checkin || tr('checkOpen'), /^(\d+)\/(\d+)/.test(day.checkin) && RegExp.$1 === RegExp.$2, 'checkin');
        const lr = home.querySelector('.sp-log-rows');
        if (lr && (lr.__spH !== rows || !lr.firstChild)) { lr.innerHTML = rows; lr.__spH = rows; }
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
        if (dots && dots.innerHTML !== days) dots.innerHTML = days;
        D.documentElement.dataset.spPeriod = m.period;
        /* BH-004: Misty's VoiceOver name was written once in the boot language; keep its head in the current one (cell-world.js adds " · <state>") */
        const sb = home.querySelector('#spBubble');
        if (sb) {
            const a = sb.getAttribute('aria-label') || '', i = a.indexOf(' \u00b7 '), cur = i < 0 ? a : a.slice(0, i), head = tr('world');
            if (cur !== head && (copy.world || []).indexOf(cur) >= 0) sb.setAttribute('aria-label', head + (i < 0 ? '' : a.slice(i)));
        }
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
        /* Scan / Fuel / Gap (Oct 21, E-man: "let's not have it formatted like a fasting app"): the Gap bubble only reads the time
           since the last meal. No goal, no end time, no "Fasting" label; the fill still rises with the hours (capped like the points). */
        el.classList.remove('done');
        /* Oct 23 one text rule for every Home bubble (Emmanuel: "Gap has too much text ... we need to find a universe logic"): icon,
           label, one short value. The value is the time since the last meal as h:mm (15:09); no units, no "last meal 10:00" line
           (the Gap page and the screen-reader label still say when). No meal known yet = the label alone, no dash. */
        const h = '<small>' + esc(tr('sinceMeal')) + '</small><b>' + (f.start ? hours + ':' + String(min).padStart(2, '0') : '') + '</b>';
        /* Bug hunt run 30 (BH-030 sibling): after midnight VoiceOver read "since your last meal at 06:57 PM" with no day word.
           Same words as the Gap page's Last meal line (LowiGapView._when): "06:57 PM yesterday", or the date further back. */
        const gapWhen = t => { try { if (window.LowiGapView && window.LowiGapView._when) return window.LowiGapView._when(t, lang()); } catch (e) { } return new Date(t).toLocaleTimeString(lang(), { hour: '2-digit', minute: '2-digit' }); };
        /* Oct 21 grandma test: the Gap bubble says in words what its number is (it had no label for screen readers, and an empty Gap was a bare dash) */
        const al = f.start ? tr('gapAria').replace('{h}', hours).replace('{m}', min).replace('{t}', gapWhen(f.start)) : tr('gapAria0');
        if (el.getAttribute('aria-label') !== al) el.setAttribute('aria-label', al);
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
        /* Oct 16 (E-man: "this weird misty radiant hub ... nuke that"): the plain herb world is replaced by Misty's card
           (misty-hub.js). Scan's capture and result views still use this layer. */
        if (!opts.capture && !opts.embedded && window.LowiMistyHub && window.LowiMistyHub.open) { try { if (window.LowiMistyHub.open()) return; } catch (e) { } }
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
            /* BH-039 (26 Oct 2026): #spWorld is made once and shown again for every camera that opens inside it (Products' empty-state
               Scan, herb care). While it springs open it sits shrunk over the middle of the screen, so the 2nd tap of a double tap on a
               Scan button there pressed the camera: the barcode or name field (keyboard up) or Deep analyze (left the app for ChatGPT).
               Mark it on every show so fresh-scrim's same-spot rule (44 px / 400 ms) swallows that 2nd tap, like #whX and the menu. */
            try { if (window.LowiFreshScrim && window.LowiFreshScrim.mark) window.LowiFreshScrim.mark(world); } catch (e) { }
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
        if (foodCam) {
            foodCam.remove();
            foodCam = null;
        }
        D.documentElement.classList.remove('ss-foodon');
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
        /* Oct 16: the barcode camera is the full-screen glass one (living-home.js), never the old herb-world card */
        if (opened) close(true);
        if (ownedSheet) {
            R.close(ownedSheet);
            ownedSheet = null;
        }
        cancelCapture();
        if (window.LowiLiving && LowiLiving.scan) LowiLiving.scan('cam');
        else LowiDex.scan('cam');
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
        /* every sheet of Scan's flows (meal, photo, logged) in the app's blue glass (scan-screens.css) */
        if (ownedSheet) ownedSheet.classList.add('ss-sheet');
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

    /* Meal names understood (meal-db-core.js + data/meals/fndds.json, USDA FNDDS): a typed name always gets estimated values. */
    const MDB = window.LowiMealDB;
    let mealDbLoad = null;
    function mealDb() {
        if (!MDB) return Promise.resolve(false);
        if (MDB.ready()) return Promise.resolve(true);
        if (!mealDbLoad) {
            const v = (D.querySelector('meta[name="lowi-build"]') || {}).content || '';
            mealDbLoad = fetch('data/meals/fndds.json' + (v ? '?v=' + encodeURIComponent(v) : ''))
                .then(r => r.ok ? r.json() : null).then(j => { if (j) MDB.load(j); return MDB.ready(); })
                .catch(() => { mealDbLoad = null; return false; });
        }
        return mealDbLoad;
    }
    function mealGuess(title) {
        return MDB && String(title || '').trim() ? MDB.parse(title) : null;
    }
    /* fills only the macros the user left blank; the log keeps what was estimated and from what */
    function withEstimate(title, macros) {
        const est = mealGuess(title);
        if (!est) return { macros: macros, est: null };
        const f = MDB.fill(macros, est);
        if (!f.filled.length) return { macros: f.macros, est: null };
        return { macros: f.macros, est: { n: est.name, g: est.grams, how: est.how, ing: est.ingredients, f: f.filled } };
    }
    function macroHTML(m) {
        let values = K.macros(m);
        let filled = (m && m.est && m.est.f) || [];
        if (Object.keys(values).some(k => values[k] === null)) {   // older logs saved blanks: estimate them now, never show "not provided"
            const w = withEstimate(m && (m.t || m.n), values);
            values = K.macros({ macros: w.macros });
            filled = filled.concat((w.est && w.est.f) || []);
        }
        return '<div class="sp-macro-grid">' + Object.keys(values).map(k => {
            const v = values[k] === null ? 0 : Math.round(values[k] * 10) / 10;
            /* Oct 25 2026 bug hunt: German and Spanish write a decimal comma ("9,5 g"), like Today's stats on the same sheet */
            let l = 'en'; try { l = lang(); } catch (e) { }
            const vs = l === 'de' || l === 'es' ? String(v).replace('.', ',') : String(v);
            return '<div' + (filled.indexOf(k) >= 0 ? ' class="est"' : '') + '><small>' + esc(tr(k)) + '</small><b>' + (filled.indexOf(k) >= 0 ? '\u2248 ' : '') + esc(vs + (k === 'kcal' ? ' kcal' : ' g')) + '</b></div>';
        }).join('') + '</div>';
    }
    function estHTML(log) {
        const e = log && log.est;
        if (!e) return '';
        const what = e.how === 'rough' ? tr('roughMeal') : e.n + (e.g ? ' \u00b7 \u2248 ' + e.g + ' g' : '');
        return '<p class="sp-est"><small>' + esc(tr('understood')) + '</small> <b>' + esc(what) + '</b></p>' +
            (e.ing && e.ing.length ? '<p class="sp-est-ing"><small>' + esc(tr('ingr')) + ':</small> ' + esc(e.ing.slice(0, 6).join(', ')) + '</p>' : '') +
            '<p class="sp-note">' + esc(tr('estSrc')) + '</p>';
    }
    function guessLine(title) {
        const e = mealGuess(title);
        if (!e) return '';
        const name = e.how === 'rough' ? tr('roughMeal') : e.name;
        return name + ' \u00b7 \u2248 ' + e.kcal + ' kcal \u00b7 ' + Math.round(e.protein) + ' g ' + tr('protein') + ' \u00b7 ' + Math.round(e.fiber) + ' g ' + tr('fiber') + ' \u00b7 ' + Math.round(e.sugar) + ' g ' + tr('sugar');
    }
    let guessTimer = 0;
    D.addEventListener('input', ev => {
        const t = ev.target;
        if (!t || t.name !== 'title' || !t.closest || !t.closest('#spMeal')) return;
        clearTimeout(guessTimer);
        guessTimer = setTimeout(() => mealDb().then(() => {
            const out = t.closest('#spMeal') && t.closest('#spMeal').querySelector('.sp-meal-guess');
            if (out) out.textContent = String(t.value).trim() ? guessLine(t.value) : '';
        }), 220);
    });

    function gptHTML() {
        return '<a class="sp-gpt" href="' + esc(V.gpt) + '" target="_blank" rel="noopener">' + icon('star') + '<span>' + esc(tr('gpt')) + '</span>' + icon('arrow') + '</a>';
    }

    function flight(image) {
        /* Scan's screens no longer open the herb world: with the world closed there is nothing to fly into */
        if (!opened) return Promise.resolve();
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
    /* Oct 16 (E-man: Scan in black space + blue glass): the result card opens over the Scan screen in the living world,
       not inside the old herb-world card. Oct 16 simple spike card: scanning no longer catches on its own; the user chooses
       Catch it (saved to the spike lists, XP for spiky and non-spiky alike). No GPT card stacked on the result. */
    async function captureProduct(p) {
        /* Oct 23: a product the label can't rate gets the verdict from its name first, so Misty blooms or wilts like any scan */
        try { if (p && window.LowiDex && LowiDex.nameEst) p = LowiDex.nameEst(p) || p; } catch (e) { /* keep p */ }
        if (opened) close(true);
        cancelCapture();
        await flight(p.img || p.photo);
        /* scanfe-h5: Misty reacts with the Food check verdict too (spirit-core scanVerdict), not the blood sugar estimate alone */
        const verdict = K.scanVerdict ? K.scanVerdict(p, LowiDex.rate, window.LowiSpikeCore) : (p && p.verdict) || 'unknown';
        feedback(verdict === 'spike' ? 'wilt' : verdict === 'ok' ? 'bloom' : 'curious', tr(verdict === 'spike' ? 'scanSpike' : verdict === 'ok' ? 'scanOk' : 'unknown'), 0);
        LowiDex.reveal(p);
        const ov = R.top && R.top();
        if (ov) {
            ov.classList.add('sp-sheet', 'ss-sheet');
            /* Oct 16 simple spike card: no 'Deeper analysis & create content' link stacked on the result any more */
        }
        return 0;
    }

    // one-tap meal logging: recent meals first, photo/scan next, manual fields tucked behind "Manuell"
    function recentMeals() {
        if (K.slotRecent) return K.slotRecent(V.state().logs || [], mealSlot, 6);
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
    /* the meal slot picked in Log meal: kept for 10 minutes so Scan and Snap (their own flows) log into it too (index.html logMeal reads window.LowiMealSlot) */
    let mealSlot = '';
    const SLOT_IC = { meal: 'plate', breakfast: 'plate', lunch: 'plate', dinner: 'plate', snack: 'star' };
    /* Meal / Snack (older breakfast / lunch / dinner logs read as Meal) */
    const kindOf = sl => (K.kind ? K.kind(sl) : (sl === 'snack' ? 'snack' : sl ? 'meal' : '')) || 'meal';
    const slotName = sl => tr(kindOf(sl) === 'snack' ? 'kSnack' : 'kMeal');
    function setSlot(s) {
        mealSlot = (K.slotOk && K.slotOk(s)) || '';
        window.LowiMealSlot = mealSlot ? { slot: mealSlot, at: Date.now() } : null;
    }
    function pendingSlot() {
        const p = window.LowiMealSlot;
        return p && Date.now() - p.at < 6e5 && K.slotOk && K.slotOk(p.slot) ? p.slot : '';
    }
    /* one meal path (Oct 21): while a fast runs, Log meal says what saving does to it (ends it, with the points), the same rule
       index.html LowiFastStop.mealLogged applies to every meal log */
    function fastNote(at) {
        let n = '';
        try { n = window.LowiFastStop && LowiFastStop.mealNote ? LowiFastStop.mealNote(at) : ''; } catch (e) {}
        return '<p class="sp-fast-note" data-noi18n' + (n ? '' : ' hidden') + '>' + esc(n) + '</p>';
    }
    /* Scan / Fuel / Gap (Oct 21, E-man: "Fuel is where you actually log a meal", Gap "tracks back to when you actually ate"):
       Log meal asks when you ate. Now is the default; the quiet clock (Oct 27: one native time wheel instead of four chips) backdates
       the meal (index.html logMeal reads window.LowiMealCtx from 'when', same day, once, 15 min), so a meal logged 3 h late starts
       the Gap from 3 h ago, not from Save. pickWhen stays for any [data-sp="when"][data-m] button (older screens, tools). */
    function whenAt() { const c = window.LowiMealCtx; return c && c.from === 'when' && Date.now() - c.at < 15 * 60000 ? +c.ateAt || 0 : 0; }
    function pickWhen(b) {
        const m = +b.dataset.m || 0, sheet = b.closest('.r2-ov') || D;
        window.LowiMealCtx = m ? { from: 'when', ateAt: Date.now() - m * 60000, at: Date.now() } : null;
        sheet.querySelectorAll('[data-sp="when"]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
        lmSetTime(sheet, m ? Date.now() - m * 60000 : 0);
    }
    /* Oct 27, 2026 (Emmanuel, screenshots of the Mahlzeit sheet: "It's very confusing and overwhelming whilst opening. There's just
       too much redundancy there ... Remember our focus is minimalism, efficiency, convenience. And we care about people with mental
       health ... They are seeing this for the first time."): Log meal is ONE calm sheet now, no "Meal or snack?" step first.
       Meal | Snack is a small switch at the top, then one field (type it, or the mic, or Foto / Barcode right under it), the time
       is a quiet "Now" you can tap, own values hide behind one quiet link, then one Save. "Your usual" sits right under Save for one
       tap; the companion's idea, today's entries and today's stats sit lower, apart. slotPicker() stays as the way back to it
       (after editing an entry), with today's list open. */
    let lmToday = false;
    function slotPicker() {
        lmToday = true;
        mealForm(null, null, pendingSlot() || (K.slotFor ? K.slotFor() : 'meal'));
    }
    const lmHm = t => { const d = new Date(+t || Date.now()); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    /* Oct 27 (Emmanuel's screenshot: "Scrambled eggs with minced meat an..." still English in the German sheet): the local food
       words translate most names (K.mealName); a name they can't fully translate is asked once of the food-photo function's
       translate mode (no photo check used), and the answer is kept on the phone in LM_TR so it is never asked again. */
    const LM_TR = 'lowi.mealname.tr.v1';
    const lmTrAll = () => { try { const o = JSON.parse(localStorage.getItem(LM_TR) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
    const lmTrKey = n => String(n || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const lmShow = n => {
        const L = lang();
        let out = n;
        try { out = K.mealName ? K.mealName(n, L) : n; } catch (e) { out = n; }
        if (L !== 'en' && out === n) { const c = lmTrAll()[lmTrKey(n)]; if (c && c[L]) return c[L]; }
        return out;
    };
    /* plain English words a name is likely English by (so German or Spanish names are never sent off to be translated) */
    const LM_EN = /\b(with|and|eggs?|scrambled|minced|meat|beef|chicken|salad|wraps?|nuts?|almonds?|bread|toast|cheese|rice|soup|fried|grilled|roasted|baked|potato(es)?|onions?|beans|yogurt|yoghurt|apple|banana|berries|oats?|porridge|milk|coffee|tea|fish|salmon|tuna|pork|turkey|vegetables?|veggies|sauce|bowl|sandwich|steak|strips?|breakfast|lunch|dinner|snack|spring|sweet|sour|mushrooms?|spinach|avocado|tomato(es)?|pepper(s)?|garlic|ham|bacon|sausages?|pasta|noodles|pancakes?)\b/i;
    function lmTrLater(sh, recent) {
        const L = lang(), FA = window.LowiFoodAI;
        if (L === 'en' || !sh || !FA || !FA.translateNames) return;
        const have = lmTrAll(), names = [];
        for (const r of recent || []) { const n = String(r.t || r.n || ''); if (n && lmShow(n) === n && !have[lmTrKey(n)] && LM_EN.test(n) && names.indexOf(n) < 0) names.push(n); }
        if (!names.length) return;
        FA.translateNames(names).then(items => {
            if (!items || items.length !== names.length) return;
            const all = lmTrAll();
            names.forEach((n, i) => { const it = items[i] || {}; if (it.de || it.es) all[lmTrKey(n)] = { de: it.de || '', es: it.es || '' }; });
            try { localStorage.setItem(LM_TR, JSON.stringify(all)); } catch (e) {}
            if (!sh.isConnected) return;
            sh.querySelectorAll('.lm-u[data-q]').forEach(b => {
                const r = (recent || [])[+b.dataset.q]; if (!r) return;
                const n = String(r.t || r.n || ''), show = lmShow(n), sp = b.querySelector('.lm-u-t');
                if (sp && show !== n) { sp.textContent = show; sp.setAttribute('lang', L); b.setAttribute('aria-label', b.classList.contains('done') ? show + ' \u2713 ' + tr('doneToday') : tr('lmAgain').replace('{t}', show)); }
            });
        }).catch(() => {});
    }
    /* Oct 27 (Emmanuel: "They take a picture of their food. The AI can analyze what they ate ... Make the picture one very clear,
       and very easy to open and to access. Don't make it confusing."): the photo is the first, big way to log; typing is under it.
       Photo checks left only show when 3 or fewer are left (LowiMealSnap.leftSoon); with none left it says so calmly and points
       to typing, which always works. */
    function lmSnapState() { const MS = window.LowiMealSnap, q = MS && MS.left ? MS.left() : null; return { none: !!(q && q.left === 0), soon: q && q.left > 0 && MS.leftSoon ? MS.leftSoon(lang()) : '' }; }
    function lmSnapHTML() {
        const st = lmSnapState();
        return '<button type="button" class="lm-snap' + (st.none ? ' none' : '') + '" data-sp="' + (st.none ? 'snapNone' : 'photo') + '">' +
            '<span class="lm-snap-i" aria-hidden="true">' + icon('camera') + '</span>' +
            '<span class="lm-snap-t"><b>' + esc(tr('lmSnapT')) + '</b><i>' + esc(st.none ? tr('lmSnapNone') : wnm(tr('lmSnapS'))) + '</i>' +
            '<small class="lm-snap-left"' + (st.soon ? '' : ' hidden') + '>' + esc(st.soon) + '</small></span></button>';
    }
    function lmSnapRefresh(sh) {
        const FA = window.LowiFoodAI;
        if (!sh || !FA || !FA.allowance) return;
        FA.allowance().then(() => {
            const b = sh.isConnected && sh.querySelector('.lm-snap');
            if (!b) return;
            const st = lmSnapState(), i = b.querySelector('.lm-snap-t i'), sm = b.querySelector('.lm-snap-left');
            b.classList.toggle('none', st.none); b.dataset.sp = st.none ? 'snapNone' : 'photo';
            if (i) i.textContent = st.none ? tr('lmSnapNone') : wnm(tr('lmSnapS'));
            if (sm) { sm.textContent = st.soon; sm.hidden = !st.soon; }
        }).catch(() => {});
    }
    function lmTimeLabel(at) { return at ? tr('lmAt').replace('{t}', lmHm(at)) : tr('whenNow'); }
    /* the time a meal is logged at: a time picked here (LowiMealCtx 'when'), else the Gap's saved time, else now */
    function lmAt() { const w = whenAt(); if (w) return w; const c = window.LowiMealCtx; return c && c.from === 'gap' && Date.now() - c.at < 20 * 60000 ? +c.ateAt || 0 : 0; }
    function lmSetTime(sheet, at) {
        if (!sheet) return;
        const lab = sheet.querySelector('.lm-time-l'), inp = sheet.querySelector('.lm-time input'), note = sheet.querySelector('.sp-fast-note');
        if (lab) lab.textContent = lmTimeLabel(at);
        if (inp) { inp.value = lmHm(at || Date.now()); inp.setAttribute('aria-label', tr('lmTimeA').replace('{t}', lmTimeLabel(at))); }
        sheet.querySelectorAll('.lm-time').forEach(x => x.classList.toggle('set', !!at));
        let n = '';
        try { n = window.LowiFastStop && LowiFastStop.mealNote ? LowiFastStop.mealNote(at || 0) : ''; } catch (e) {}
        if (note) { note.textContent = n; note.hidden = !n; }
    }
    /* the native time wheel: today only, never in the future; a time within 2 min of now counts as Now */
    function lmTimeChange(inp) {
        const sheet = inp.closest('.r2-ov') || D, m = /^(\d{1,2}):(\d{2})/.exec(String(inp.value || ''));
        if (!m) return;
        const d = new Date(); d.setHours(+m[1], +m[2], 0, 0);
        let at = d.getTime();
        if (at > Date.now() + 60000) { R.toast(tr('editFuture')); at = 0; }
        if (at && Date.now() - at < 2 * 60000) at = 0;
        const c = window.LowiMealCtx, gap = c && c.from === 'gap' && Date.now() - c.at < 20 * 60000;
        if (at) window.LowiMealCtx = { from: 'when', ateAt: at, at: Date.now() };
        else if (gap) window.LowiMealCtx = { from: 'when', ateAt: Date.now(), at: Date.now() }; /* "now" over the Gap's saved time */
        else if (c && c.from === 'when') window.LowiMealCtx = null;
        lmSetTime(sheet, at);
    }
    function lmKind(b) {
        const s = b.dataset.slot, sheet = b.closest('.r2-ov') || D;
        setSlot(s);
        sheet.querySelectorAll('[data-sp="lmKind"]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        const sv = sheet.querySelector('.lm-save'); if (sv) sv.textContent = tr(s === 'snack' ? 'lmSnackSave' : 'save');
        const seg = sheet.querySelector('.lm-kind'); if (seg) seg.dataset.on = s;
    }
    /* Oct 23: today's entries in Log meal, newest first: what it was, the time, the photo if one was taken. Tap = edit. */
    const hm = ts => { const d = new Date(+ts || 0); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    const logId = l => String(l.id || l.eventId || l.ts);
    function thumb(l, big) {
        const ph = /^data:image\//.test(String(l.photo || '')) ? l.photo : '';
        return ph ? '<img class="sp-td-ph' + (big ? ' big' : '') + '" src="' + esc(ph) + '" alt="">' : '<span class="sp-td-ic">' + icon(SLOT_IC[kindOf(l.slot)]) + '</span>';
    }
    function todayList(logs) {
        const L = (logs || []).filter(l => l && (l.t || l.n)).slice().sort((a, b) => (+b.ts || 0) - (+a.ts || 0));
        if (!L.length) return '';
        return '<div class="sp-today"><small class="sp-quick-h">' + esc(tr('todayH')) + '</small><ul class="sp-td-list">' + L.map((l, i) =>
            '<li style="--i:' + i + '"><button type="button" class="sp-td" data-sp="todayEdit" data-id="' + esc(logId(l)) + '" aria-label="' + esc(tr('editH') + ': ' + (l.t || l.n) + ' ' + hm(l.ts)) + '">' + thumb(l) +
            '<span class="sp-td-t"><b>' + esc(l.t || l.n) + '</b><small>' + esc(slotName(l.slot)) + '</small></span><time>' + esc(hm(l.ts)) + '</time></button></li>').join('') + '</ul></div>';
    }
    function findLog(id) { return (V.state().logs || []).find(l => logId(l) === String(id) || l.id === id || l.eventId === id); }
    function editToday(id) {
        const l = findLog(id);
        if (!l) { slotPicker(); return; }
        const k = kindOf(l.slot), ph = /^data:image\//.test(String(l.photo || ''));
        const kinds = ['meal', 'snack'].map(s => '<button type="button" class="sp-when-c" data-sp="editKind" data-kind="' + s + '" aria-pressed="' + (s === k) + '">' + esc(slotName(s)) + '</button>').join('');
        showSheet('<h2>' + esc(tr('editH')) + '</h2><form id="spEdit" class="sp-edit" data-id="' + esc(logId(l)) + '" data-kind="' + k + '">' +
            '<div class="sp-edit-top">' + (ph ? '<button type="button" class="sp-edit-ph" data-mj-open="' + esc(String(l.id)) + '" aria-label="' + esc(tr('editPhoto')) + '">' + thumb(l, true) + '</button>' : thumb(l, true)) +
            '<label class="sp-edit-time">' + esc(tr('editTime')) + '<input name="time" type="time" required value="' + esc(hm(l.ts)) + '"></label></div>' +
            '<label>' + esc(tr('editWhat')) + '<input name="t" required maxlength="100" autocomplete="off" value="' + esc(l.t || l.n || '') + '"></label>' +
            '<label>' + esc(tr('editAdd')) + '<input name="add" maxlength="60" autocomplete="off" placeholder="' + esc(tr('editAddPh')) + '"></label>' +
            '<div class="sp-when-row sp-edit-kind" role="group" aria-label="' + esc(tr('slotQ')) + '">' + kinds + '</div>' +
            '<button class="r2-btn pri" type="submit">' + esc(tr('editSave')) + '</button>' +
            '<button type="button" class="sp-ghost sp-edit-del" data-sp="todayDel">' + esc(tr('editDel')) + '</button></form>');
    }
    function saveToday(form) {
        const l = findLog(form.dataset.id);
        if (!l) { slotPicker(); return; }
        const fd = new FormData(form), add = String(fd.get('add') || '').trim(), t0 = String(fd.get('t') || '').trim() || String(l.t || l.n || '');
        const data = { id: l.id || l.eventId || String(l.ts), t: add ? t0 + ' + ' + add : t0, slot: form.dataset.kind || kindOf(l.slot) };
        if (add) {
            /* one more piece of the same meal: add its estimate to what is there; still the same meal (no new XP, no second gap close) */
            const cur = K.macros(l), more = withEstimate(add, {}).macros || {}, sum = {};
            Object.keys(cur).forEach(k => { const a = cur[k], b = more[k]; sum[k] = a == null && b == null ? null : Math.round(((+a || 0) + (+b || 0)) * 10) / 10; });
            data.macros = sum;
            if (l.est) data.est = l.est;
        } else if (t0 !== String(l.t || l.n || '') && l.est && !l.ai) {
            const w = withEstimate(t0, {}); if (w.macros) { data.macros = w.macros; if (w.est) data.est = w.est; }
        }
        const tm = String(fd.get('time') || '').match(/^(\d{1,2}):(\d{2})$/);
        if (tm) {
            const d = new Date(+l.ts || Date.now()); d.setHours(+tm[1], +tm[2], 0, 0);
            if (d.getTime() > Date.now() + 60000) { R.toast(tr('editFuture')); return; }
            if (Math.abs(d.getTime() - (+l.ts || 0)) >= 60000) data.ts = d.getTime();
        }
        const r = V.editMeal(data);
        if (!r) { R.toast(tr('storage')); return; }
        R.toast(tr('editDone') + ' \u00b7 ' + (r.log.t || '') + ' \u00b7 ' + hm(r.log.ts));
        refresh();
        slotPicker();
    }
    async function delToday(b) {
        const form = b.closest('#spEdit'), l = form && findLog(form.dataset.id);
        if (!l) return;
        if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = tr('editDelSure'); return; }
        let ok = false;
        try { ok = window.LowiMealJournal && LowiMealJournal.remove ? await LowiMealJournal.remove(l.id || l.eventId || String(l.ts)) : !!V.deleteMeal(l.id || l.eventId || String(l.ts)); } catch (e) { console.error(e); }
        R.toast(ok ? tr('editGone') : tr('storage'));
        refresh();
        slotPicker();
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
        const qt = String(src.t || src.n).trim(), qw = withEstimate(qt, K.macros(src));
        const seed = {
            id: uid(),
            t: qt,
            macros: qw.macros,
            photo: '',
            via: 'quick'
        };
        if (mealSlot) seed.slot = mealSlot;
        if (qw.est || src.est) seed.est = qw.est || src.est;
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
        feedback('eat', tr('saved') + ' · ' + seed.t + whyNote(result) + (window.LowiYouStats && window.LowiYouStats.shortLine ? window.LowiYouStats.shortLine() : ''), result.xp);
        mealNotice(result.log || seed, result.xp);
        checkBonuses(false);
        refresh();
    }

    function mealForm(seed, editing, slot) {
        seed = seed || {};
        lastMealId = editing || uid();
        const values = K.macros(seed);
        const quick = !editing && !(seed.t || seed.n || seed.name);
        if (quick) {
            const back = lmToday;
            lmToday = false;
            if (!back && window.LowiMealCtx && window.LowiMealCtx.from === 'when') window.LowiMealCtx = null; /* a fresh Log meal starts at Now */
            /* Oct 19 food paths: opened right after the Gap bubble saved a time -> one calm line, Not now, and that time on the clock */
            let gc = window.LowiMealCtx && window.LowiMealCtx.from === 'gap' && Date.now() - window.LowiMealCtx.at < 20 * 60000 ? window.LowiMealCtx : null;
            if (gc && gc.shown) gc = null; else if (gc) gc.shown = true;
            /* a fresh open starts at Meal (K.slotFor); Snack is one tap */
            setSlot((K.slotOk && K.slotOk(slot) ? slot : '') || (back ? pendingSlot() : '') || (K.slotFor ? K.slotFor(gc ? gc.ateAt : undefined) : 'meal'));
            const recent = recentMeals().slice(0, 4), at = lmAt(), day = K.day(),
                logs = (V.state().logs || []).filter(l => l.day === day && l && (l.t || l.n));
            mealDb();
            const kind = (K.SLOTS || ['meal', 'snack']).map(k => '<button type="button" data-sp="lmKind" data-slot="' + k + '" aria-pressed="' + (k === mealSlot) + '">' + esc(slotName(k)) + '</button>').join('');
            const own = '<div class="lm-own" id="lmOwn" hidden><small>' + esc(tr('portion')) + '</small><div class="sp-form-macros">' + Object.keys(values).map(k => '<label>' + esc(tr(k)) + '<input name="' + k + '" inputmode="decimal" type="number" min="0" max="10000" step="0.1" placeholder="\u2248"></label>').join('') + '</div><p class="sp-note">' + esc(tr('macroOptional')) + '</p></div>';
            const form = '<form id="spMeal" class="lm-form" data-id="' + esc(lastMealId) + '">' +
                '<label class="lm-ask lm-ask-or" for="lmTitle">' + esc(tr('lmOrType')) + '</label>' +
                '<input id="lmTitle" class="lm-in" name="title" required maxlength="100" autocomplete="off" enterkeyhint="done" data-mic="1" placeholder="' + esc(tr('mealPh')) + '">' +
                '<p class="sp-meal-guess" aria-live="polite"></p>' +
                '<div class="lm-row"><label class="lm-time' + (at ? ' set' : '') + '">' + icon('clock') + '<span class="lm-time-l">' + esc(lmTimeLabel(at)) + '</span>' +
                '<input type="time" class="lm-time-in" data-sp-time value="' + lmHm(at || Date.now()) + '" aria-label="' + esc(tr('lmTimeA').replace('{t}', lmTimeLabel(at))) + '"></label>' +
                '<button type="button" class="lm-own-t" data-sp="lmOwn" aria-expanded="false" aria-controls="lmOwn">' + esc(tr('lmOwn')) + '</button></div>' + own +
                '<button class="r2-btn pri lm-save" type="submit">' + esc(tr(mealSlot === 'snack' ? 'lmSnackSave' : 'save')) + '</button>' + (gc ? '' : fastNote(at)) + '</form>'; /* in the Gap chain the fast already ended there */
            const usual = recent.length ? '<section class="lm-usual" aria-label="' + esc(tr('lmUsual')) + '"><h3 class="lm-h">' + esc(tr('lmUsual')) + '</h3><div class="lm-u-list">' + recent.map((l, i) => {
                const n = String(l.t || l.n), show = lmShow(n), done = V.mealDup && V.mealDup({t: n, code: l.code, slot: mealSlot});
                return '<button type="button" class="lm-u' + (done ? ' done' : '') + '" data-sp="quickMeal" data-q="' + i + '" aria-label="' + esc(done ? show + ' \u2713 ' + tr('doneToday') : tr('lmAgain').replace('{t}', show)) + '"><span class="lm-u-t"' + (show !== n ? ' lang="' + lang() + '"' : '') + '>' + esc(show) + '</span><em aria-hidden="true">' + (done ? icon('check') : icon('plus')) + '</em></button>';
            }).join('') + '</div></section>' : '';
            const pk = herbPick(),
                idea = pk ? '<section class="lm-idea"><h3 class="lm-h">' + esc(wnm(tr('lmIdea'))) + '</h3><button type="button" class="sp-herb-tip lm-idea-b" data-sp="herbPick">' + (pk.recipe.img ? '<img src="' + esc(pk.recipe.img) + '" alt="">' : icon('plate')) + '<span><b>' + esc(recipeName(pk.recipe)) + '</b><i>' + esc(whyLine(pk.why.slice(0, 2), null) || tr('whyText')) + '</i></span>' + icon('arrow') + '</button></section>' : '';
            const today = logs.length ? '<details class="lm-today"' + (back ? ' open' : '') + '><summary>' + esc(tr('lmToday').replace('{n}', logs.length)) + '</summary>' + todayList(logs) + '</details>' : '';
            const html = '<div class="lm" data-lm>' + '<h2 class="lm-sr">' + esc(tr('meal')) + '</h2>' +
                '<div class="lm-kind" role="group" aria-label="' + esc(tr('slotQ')) + '" data-on="' + esc(mealSlot) + '">' + kind + '</div>' +
                (gc ? '<p class="lm-gap">' + esc(tr('lmGap')) + ' <button type="button" class="lm-gap-skip" data-sp="gapskip">' + esc(tr('gapSkip')) + '</button></p>' : '') +
                lmSnapHTML() + form + usual + idea + today + '<div class="lm-foot"></div></div>';
            showSheet(html);
            const sh = ownedSheet, ti = sh && sh.querySelector('.lm-time-in');
            lmSnapRefresh(sh);
            lmTrLater(sh, recent);
            if (ti) {
                ti.addEventListener('change', () => lmTimeChange(ti));
                ti.addEventListener('blur', () => lmTimeChange(ti));
                /* a tap anywhere on the quiet clock pill opens the native wheel (iPhone opens it on its own; desktop needs showPicker) */
                ti.addEventListener('click', () => { try { if (ti.showPicker) ti.showPicker(); } catch (e) {} });
            }
            return;
        }
        const html = '<h2>' + esc(tr('meal')) + '</h2><form id="spMeal" data-id="' + esc(lastMealId) + '" ' + (editing ? 'data-edit="1"' : '') + '><label>' + esc(tr('title')) + '<input name="title" required maxlength="100" value="' + esc(seed.t || seed.n || seed.name || '') + '"></label><small>' + esc(tr('portion')) + '</small><div class="sp-form-macros">' + Object.keys(values).map(k => '<label>' + esc(tr(k)) + '<input name="' + k + '" inputmode="decimal" type="number" min="0" max="10000" step="0.1" value="' + (values[k] === null ? '' : values[k]) + '" placeholder="\u2248"></label>').join('') + '</div><p class="sp-meal-guess" aria-live="polite"></p><p class="sp-note">' + esc(tr('macroOptional')) + '</p><button class="r2-btn pri" type="submit">' + esc(tr(editing ? 'rename' : 'save')) + '</button></form>';
        showSheet(html);
        mealDb().then(() => {
            const out = D.querySelector('#spMeal .sp-meal-guess'), t = (seed.t || seed.n || seed.name || '');
            if (out && t) out.textContent = guessLine(t);
        });
    }
    async function finishMeal(form) {
        const data = new FormData(form),
            values = {};
        for (const k of Object.keys(K.macros({}))) values[k] = data.get(k) == null || data.get(k) === '' ? null : +data.get(k);
        const title = String(data.get('title')).trim();
        await Promise.race([mealDb(), new Promise(r => setTimeout(r, 2500))]);
        const w = withEstimate(title, values);
        const seed = {
            id: form.dataset.id,
            t: title,
            macros: w.macros,
            photo: photoURL,
            via: photoURL ? 'photo' : 'spirit'
        };
        /* Oct 21 meal result: the spike verdict the photo screen showed (lvl) is the one the log keeps, so the XP it promised is the XP it gives */
        const lvl = String(data.get('lvl') || '');
        if (/^(low|medium|high)$/.test(lvl)) seed.lvl = lvl;
        const fs = pendingSlot();
        if (fs && !form.dataset.edit) seed.slot = fs;
        if (w.est) seed.est = w.est;
        /* Oct 22 (Seven: "it should save the picture, and also the estimate they received"): a photo meal keeps the full estimate
           (log.ai) and its photo: about 1024 px on this device (meal-journal.js, IndexedDB), a small thumbnail on the log. */
        const J = window.LowiMealJournal, flyURL = photoURL;
        let pic = null;
        if (J && photoURL && !form.dataset.edit) {
            try { const m = typeof form.__lowiMeal === 'function' ? form.__lowiMeal() : null; const ai = m && J.estimate(m, { lvl: seed.lvl, note: m.note, low: m.low }); if (ai) seed.ai = ai; } catch (e) {}
            pic = await Promise.race([J.prepare(photoFile || photoURL), new Promise(r => setTimeout(() => r(null), 4000))]);
            if (pic && pic.thumb) seed.photo = pic.thumb;
        }
        /* Oct 27: today's numbers just before this meal, so the saved screen can show what it moved (you-stats.js) */
        const ysBefore = !form.dataset.edit && window.LowiYouStats ? window.LowiYouStats.snap() : null;
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
        const log = result.log;
        if (pic && log && J) J.keep(log.id, pic);
        await flight(flyURL || seed.photo);
        feedback('eat', tr('saved') + whyNote(result), result.xp);
        checkBonuses(false);
        showSheet('<h2>' + esc(tr('saved')) + '</h2><p>' + (log.slot ? '<span class="sp-slot-tag">' + esc(tr(log.slot)) + '</span> ' : '') + esc(log.t) + '</p>' + estHTML(log) + macroHTML(log) + '<p class="sp-earned">' + (result.xp ? '+' + result.xp + ' XP' : esc(result.reason || (form.dataset.edit ? '' : '0 XP'))) + '</p>' + (ysBefore ? window.LowiYouStats.afterHTML(ysBefore) : '') + savedPhotoHTML(log) + gptHTML());
    }

    /* Oct 22: under a saved photo meal, its thumbnail (opens the photo with its estimate) and a small opt-in "Share to Community" */
    function savedPhotoHTML(log) {
        const J = window.LowiMealJournal;
        if (!J || !log || !log.ai || !/^data:image\//.test(String(log.photo || ''))) return '';
        const L = /^(de|es)$/.test(lang()) ? lang() : 'en';
        return '<div class="mj-saved">' + J.thumbHTML(log, L) + '<span>' + esc(J.t('saved', L)) + '</span></div>' +
            (J.shareOf(log) ? '<button type="button" class="r2-btn mj-share-btn" data-mj-share="' + esc(log.id) + '">' + esc(J.t('share', L)) + '</button>' : '');
    }

    function checkBonuses(closed) {
        const s = V.state();
        for (const b of K.bonuses(s, K.day(), closed)) {
            const gained = V.bonus(b.eventId, b.amt, tr(b.kind) + ' · ' + tr('bonus'));
            if (gained) feedback('bloom', tr('bonus'), gained);
        }
    }

    /* wsip (Oct 23, Eman): kind = 'sips' | 'cup' | 'bottle'; no kind = one cup, as before */
    function water(kind) {
        kind = kind === 'sips' || kind === 'bottle' ? kind : 'cup';
        const gained = V.water(uid(), kind);
        /* Oct 24: the bottle line names the size you picked (Water bloom, Size) */
        const K = window.LowiSpiritCore, lit = kind === 'bottle' && K && typeof K.bottleLitres === 'function' && typeof K.bottleMl === 'function' ? K.bottleLitres(K.bottleMl(), lang()) : '';
        feedback('water', tr(kind === 'sips' ? 'drinkSips' : kind === 'bottle' ? 'drinkBottle' : 'drink') + (lit ? ' (' + lit + ')' : ''), gained);
        return gained;
    }
    /* Oct 16 (E-man: Scan's photo screen like the rest: black space, iOS blue glass, clear flow, camera permission that makes sense):
       the food camera is its own full-screen layer over the living world (no herb-world card, no herb moods), the same look as the
       barcode camera: X top left, a framed view, one big shutter, Choose a photo and Type it beside it. Blocked or missing camera:
       a blue glass card that says how to allow it, Try again, and the photo library as the way round. iOS asks for the camera itself. */
    function foodState(h, s) {
        h.dataset.st = s;
        const card = h.querySelector('.ss-card');
        const pick = '<label class="ss-btn sp-upload-label">' + icon('plus') + '<span>' + esc(tr('upload')) + '</span><input type="file" accept="image/*" class="sp-file-in"></label>';
        if (s === 'starting') card.innerHTML = '<span class="ss-spin" aria-hidden="true"></span><small>' + esc(tr('snapStart')) + '</small>';
        else if (s === 'denied') card.innerHTML = '<span class="ss-card-ic">' + icon('camera') + '</span><b>' + esc(tr('camOff')) + '</b><small>' + esc(tr('camOffS')) + '</small><div class="ss-card-btns"><button type="button" class="ss-btn pri" data-sp="photo">' + esc(tr('camTryAgain')) + '</button>' + pick + '</div>';
        else if (s === 'nocam') card.innerHTML = '<span class="ss-card-ic">' + icon('camera') + '</span><b>' + esc(tr('camNone')) + '</b><small>' + esc(tr('camNoneS')) + '</small><div class="ss-card-btns">' + pick.replace('ss-btn', 'ss-btn pri') + '<button type="button" class="ss-btn" data-sp="meal">' + esc(tr('typeIt')) + '</button></div>';
        else card.innerHTML = '';
        const hint = h.querySelector('.ss-hint');
        if (hint) hint.hidden = s !== 'live';
    }
    async function photo() {
        if (opened) close(true);
        cancelCapture();
        if (ownedSheet) {
            R.close(ownedSheet);
            ownedSheet = null;
        }
        capture = true;
        const h = D.createElement('div');
        h.className = 'ss-food';
        h.id = 'ssFood';
        h.setAttribute('role', 'dialog');
        h.setAttribute('aria-modal', 'true');
        h.setAttribute('aria-label', tr('snapTitle'));
        h.setAttribute('data-noi18n', '');
        h.innerHTML = '<video autoplay muted playsinline webkit-playsinline disablepictureinpicture></video><div class="ss-shade" aria-hidden="true"></div>' +
            '<header class="ss-top"><button type="button" class="ss-x" data-sp="cancelCapture" aria-label="' + esc(tr('close')) + '">' + icon('close') + '</button><span class="ss-title">' + esc(tr('snapTitle')) + '</span>' + '<span class="ss-bc-sp" aria-hidden="true"></span></header>' + /* Oct 27: no Barcode switch here; this camera is for a plate you're about to eat (the store scanner stays on Home and in Shop) */
            '<div class="ss-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="ss-card" role="status" aria-live="polite"></div>' +
            '<div class="ss-bar"><p class="ss-hint" hidden>' + esc(tr('snapHint')) + '</p><div class="ss-row"><label class="ss-side sp-upload-label" aria-label="' + esc(tr('upload')) + '">' + icon('plus') + '<span>' + esc(tr('library')) + '</span><input type="file" accept="image/*" class="sp-file-in"></label>' +
            '<button type="button" class="ss-shutter" data-sp="shutter" aria-label="' + esc(tr('camera')) + '"><i></i></button>' +
            '<button type="button" class="ss-side" data-sp="meal">' + icon('plate') + '<span>' + esc(tr('typeIt')) + '</span></button></div></div>';
        D.body.append(h);
        foodCam = h;
        D.documentElement.classList.add('ss-foodon');
        return startFood(h);
    }

    /* BH-047 (P-SESSION-OUTLIVES-SCREEN): the food camera's stream start, shared by photo() and the return from the background.
       It used to live inside photo() only, so the stream that visibilitychange stopped on hide never came back: the screen kept
       its live look on a dead stream, and the shutter took the last frozen frame (black on iPhone). Same as the barcode camera
       (index.html camResume): stopped on hide, the spinner shows, and it starts again on return. A second start that loses the
       race (photoStream already set) or lands while the page is hidden hands its tracks straight back. */
    async function startFood(h) {
        if (!navigator.mediaDevices?.getUserMedia) {
            foodState(h, 'nocam');
            return;
        }
        foodState(h, 'starting');
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
            if (foodCam !== h || !h.isConnected || D.hidden || photoStream) {
                stream.getTracks().forEach(t => t.stop());
                return;
            }
            photoStream = stream;
            h.querySelector('video').srcObject = stream;
            await h.querySelector('video').play();
            if (foodCam === h) {
                h.classList.add('live');
                foodState(h, 'live');
            }
        } catch (e) {
            if (foodCam !== h) return;
            /* BH-047: play() cut short by going to the background is not a missing camera: start again on return */
            if (D.hidden) {
                foodState(h, 'starting');
                h.dataset.resume = '1';
                return;
            }
            foodState(h, e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : 'nocam');
        }
    }

    function shutter() {
        const v = foodCam && foodCam.querySelector('video');
        /* BH-047: no live stream = no photo (a stopped track keeps videoWidth and its last frame) */
        if (!v || !v.videoWidth || !photoStream || !photoStream.getVideoTracks().some(t => t.readyState === 'live')) return;
        const cv = D.createElement('canvas'),
            scale = Math.min(1, 640 / v.videoWidth);
        cv.width = Math.round(v.videoWidth * scale);
        cv.height = Math.round(v.videoHeight * scale);
        cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
        photoURL = cv.toDataURL('image/jpeg', .65);
        /* BH-014: hand the bitmap back now; iOS frees an unused canvas only when the garbage collector gets to it */
        cv.width = 0; cv.height = 0;
        photoFile = null;
        try {
            const big = D.createElement('canvas'), s2 = Math.min(1, 1600 / v.videoWidth);
            big.width = Math.round(v.videoWidth * s2);
            big.height = Math.round(v.videoHeight * s2);
            big.getContext('2d').drawImage(v, 0, 0, big.width, big.height);
            big.toBlob(b => { big.width = 0; big.height = 0; if (b) photoFile = new File([b], 'lowispike-' + Date.now() + '.jpg', { type: 'image/jpeg' }); }, 'image/jpeg', .9);
        } catch (e) {}
        cancelCapture();
        flight(photoURL).then(() => photoSheet());
    }
    let photoFile = null;
    function photoSheet() {
        if (!photoURL) return mealForm();
        lastMealId = uid();
        /* one clear flow: the photo, what it is, Log as meal; Retake / Save photo / deeper analysis below it */
        showSheet('<h2>' + esc(tr('photoTitle')) + '</h2><img class="sp-photo-prev" alt="" src="' + esc(photoURL) + '"><div class="sp-ai" aria-live="polite"></div><form id="spMeal" class="sp-photo-form" data-id="' + esc(lastMealId) + '"><label>' + esc(tr('photoName')) + '<input name="title" required maxlength="100" autocomplete="off" enterkeyhint="done" placeholder="' + esc(tr('photoPh')) + '"></label><button type="submit" class="sp-action sp-primary">' + icon('plate') + '<span>' + esc(tr('photoLog')) + '</span></button></form><div class="sp-photo-acts">' + button('retake', 'camera', 'photo') + button('savePhoto', 'arrow', 'savePhoto') + '</div>' + gptHTML() + '<p class="sp-note small">' + esc(tr('photoGptHint')) + '</p>', { cls: 'sp-sheet ss-sheet' });
        /* Oct 19 2026 food photo AI: the photo goes to LowiFoodAI (Supabase function food-photo, Gemini). It fills the
           dishes, the name and hidden macro inputs; when it is off or fails, the plain "What is it?" form above still works. */
        const aiForm = document.querySelector('form#spMeal.sp-photo-form[data-id="' + lastMealId + '"]');
        if (aiForm && window.LowiFoodAI && window.LowiFoodAI.mount) window.LowiFoodAI.mount(aiForm.previousElementSibling, aiForm, photoURL, { db: MDB, dbReady: mealDb, file: photoFile });
    }
    function photoAsFile() {
        if (photoFile) return photoFile;
        if (!photoURL) return null;
        const bin = atob(photoURL.split(',')[1] || ''), arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return new File([arr], 'lowispike-' + Date.now() + '.jpg', { type: 'image/jpeg' });
    }
    /* Oct 25 evening (Emmanuel: Fuel > snack > photo, then "Save photo" restarted the app). The old fallback after the share sheet
       was a download link to a blob: URL. In the iPhone Home Screen app a download is a navigation: the image replaces the app,
       and going back loads LOWiSPIKE fresh (photo, AI read and typed name gone). It ran whenever navigator.share threw anything but
       a cancel, e.g. a second tap while the share sheet was still opening (iOS rejects the second share). Now: one share at a time,
       and on iPhone / iPad / any Home Screen app the fallback is an in-app view of the photo (press and hold to save), never a
       download. A plain browser on a computer keeps the download. Tested in tests/save-photo.test.cjs. */
    let photoSaving = false;
    function noDownload() {
        const n = navigator || {}, u = n.userAgent || '';
        try { if (n.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) return true; } catch (e) {}
        return /iPhone|iPad|iPod/.test(u) || (n.platform === 'MacIntel' && n.maxTouchPoints > 1);
    }
    function photoView(f) {
        const old = D.getElementById('spPhotoSave'); if (old) old.remove();
        const url = URL.createObjectURL(f), ov = D.createElement('div');
        ov.id = 'spPhotoSave'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', tr('savePhoto'));
        ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:max(20px,env(safe-area-inset-top)) 16px max(20px,env(safe-area-inset-bottom));box-sizing:border-box';
        ov.innerHTML = '<img alt="" src="' + esc(url) + '" style="max-width:100%;max-height:68vh;border-radius:16px;-webkit-touch-callout:default;-webkit-user-select:auto;user-select:auto">' +
            '<p style="margin:0;max-width:320px;color:#fff;font:600 15px/1.35 -apple-system,system-ui,sans-serif;text-align:center">' + esc(tr('photoHold')) + '</p>' +
            '<button type="button" class="r2-btn pri" style="min-width:140px">' + esc(tr('close')) + '</button>';
        ov.querySelector('button').addEventListener('click', () => { ov.remove(); setTimeout(() => URL.revokeObjectURL(url), 500); });
        D.body.appendChild(ov);
    }
    async function savePhoto() {
        if (photoSaving) return;   /* the share sheet is still opening or open: a second tap does nothing */
        const f = photoAsFile();
        if (!f) return;
        photoSaving = true;
        try {
            if (navigator.canShare && navigator.share) {
                let ok = false;
                try { ok = navigator.canShare({ files: [f] }); } catch (e) {}
                if (ok) {
                    try { await navigator.share({ files: [f] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
                }
            }
            if (noDownload()) { photoView(f); return; }   /* never a download in the Home Screen app: it would leave the app */
            const a = D.createElement('a');
            a.href = URL.createObjectURL(f);
            a.download = f.name;
            D.body.append(a);
            a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
            R.toast(tr('photoSaved'));
        } finally {
            photoSaving = false;
        }
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

        /* Oct 22 2026: the old herb's falling leaves are gone with the flowery design; a hard stretch only marks the gesture */
        function leaves() {
            if (gesture) gesture.shed = true;
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
                el.style.transform = '';
                delete el.dataset.touchface;
                delete el.dataset.poke;
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
        return '<div class="wd" id="spWd"><header class="wd-head"><h2>' + esc(tr('wardrobe')) + '</h2>' + (window.LowiHerbShop ? LowiHerbShop.entryHTML() : '') + '<span class="wd-xp">' + esc(m.xp + ' XP') + '</span></header>' +
            '<div class="wd-stage' + (trying ? ' trying' : '') + '"><span class="wd-tag">' + esc(trying ? wl('Trying on', 'Anprobe', 'Probando') : wl('Your look', 'Dein Look', 'Tu look')) + '</span>' +
            T.plantHTML(model, 'preview', p, {
                preview: look,
                label: name() + ' · ' + (sel ? wname(sel) : '')
            }) +
            '<div class="wd-info" aria-live="polite"><b>' + esc(sel ? wname(sel) : '') + '</b><small>' + esc(sel ? wdStatus(sel) : '') + '</small>' + (lockedSel ? '<i class="wd-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></i>' : '') + action + (note ? '<p class="wd-note' + (sel.status === 'premium' ? ' wd-must' : '') + '">' + esc(note) + '</p>' : '') + '</div></div>' +
            '<div class="wd-tabs" role="tablist" aria-label="' + esc(tr('wardrobe')) + '">' + WC.SLOTS.map(s => {
                const own = items.filter(c => c.kind === s.kind && (c.status === 'ready' || c.status === 'equipped')).length,
                    all = items.filter(c => c.kind === s.kind && !c.premium).length;
                return '<button type="button" role="tab" data-sp="wdTab" data-kind="' + s.kind + '" aria-selected="' + (s.kind === wd.kind) + '"' + (eq[s.kind] && eq[s.kind] !== WC.BASE_EQUIPMENT[s.kind] ? ' data-worn=""' : '') + '>' + esc(s.names[wix()]) + '<small>' + own + '/' + all + '</small></button>';
            }).join('') + '</div>' +
            '<div class="wd-grid" role="tabpanel">' + items.filter(c => c.kind === wd.kind).map(c => '<button type="button" class="wd-item wd-' + c.status + '" data-sp="wdPick" data-item="' + c.id + '" aria-pressed="' + (c.id === wd.sel) + '" aria-label="' + esc(wname(c) + ', ' + wdStatus(c)) + '"><span class="wd-thumb">' + T.plantHTML(model, 'node', p, {
                preview: WC.previewEquip(WC.BASE_EQUIPMENT, c.id, m.xp),
                crop: c.kind,
                hidden: true
            }) + (c.status === 'locked' || c.status === 'premium' ? '<span class="wd-lock" aria-hidden="true">' + (c.status === 'premium' ? (icon('sparkle') || '✦') : icon('lock')) + '</span>' : c.status === 'equipped' ? '<span class="wd-check" aria-hidden="true">' + icon('check') + '</span>' : '') + '</span><b>' + esc(wname(c)) + '</b><small>' + esc(wdStatus(c)) + '</small></button>').join('') + '</div>' +
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
        /* Oct 22: only your scanned products; the Food journal on top was removed (meals live in the Fuel sheet) */
        showSheet('<h2>' + esc(tr('collection')) + (items.length ? ' <span class="num">' + items.length + '</span>' : '') + '</h2>' + '<div class="sp-collection">' + (items.length ? items.map(p => '<button data-sp="product" data-key="' + esc(p.barcode || p.id || p.name) + '">' + (p.img ? '<img alt="" src="' + esc(p.img) + '">' : icon('leaf')) + '<b>' + esc(p.name || p.barcode) + '</b></button>').join('') : '<p>' + esc(tr('emptyCollection')) + '</p>' + button('scan', 'scan', 'scan')) + '</div>');
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
            showSheet(H.cardHTML() + (window.LowiHerbQuests ? LowiHerbQuests.evoHTML(true) : '') + '<form id="spProfile"><label>' + esc(tr('name')) + '<input name="name" maxlength="24" value="' + esc(id.name) + '"></label><label>' + esc(tr('birthday')) + '<input name="birthday" type="date" value="' + esc(s.user.bday || '') + '"></label><button type="submit" class="r2-btn pri">' + esc(tr('rename')) + '</button></form>' + (id.custom ? '<button class="r2-btn ghost hi-reset" data-sp="resetName"><span>' + esc(H.copy('resetName')) + '</span></button>' : '') + '<button class="r2-btn ghost" data-sp="quiz">' + icon('star') + '<span>' + esc(H.copy(id.type ? 'quizAgain' : 'quiz')) + '</span></button>' + button('goals', 'plate', 'goals') + button('completeDay', 'moon', 'completeDay'));
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
        feedback('eat', tr('saved') + ' · ' + seed.t + whyNote(result) + (window.LowiYouStats && window.LowiYouStats.shortLine ? window.LowiYouStats.shortLine() : ''), result.xp);
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
            /* Oct 18 game-perf: this runs on every DOM change, so write the colour only when it differs */
            if (by.style.getPropertyValue('--sp-sign') !== look.palette.a) by.style.setProperty('--sp-sign', look.palette.a);
            by.querySelectorAll('.av,.lb3-ph').forEach(av => {
                av.classList.add('sp-avatar-ring');
                if (av.style.getPropertyValue('--sp-sign') !== look.palette.a) av.style.setProperty('--sp-sign', look.palette.a);
            });
        }
    }
    const emoji = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E)?\p{Emoji_Modifier}?(?:\u200D(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})(?:\uFE0F|\uFE0E)?\p{Emoji_Modifier}?)*|[\u2648-\u2653]\uFE0F?|[0-9#*]\uFE0F?\u20E3/gu;
    const symbolKind = s => window.LowiIcons ? LowiIcons.kind(s) : (/[💧🥤🚰]/u.test(s) ? 'water' : /[📷📸🤳]/u.test(s) ? 'camera' : /[🍽🥗🥣🍳🍎🍲🍱]/u.test(s) ? 'plate' : /[👑🎩🎀]/u.test(s) ? 'hat' : /[⭐🌟✨💫]/u.test(s) ? 'star' : /[🌞☀]/u.test(s) ? 'sun' : /[🌙🌚🌜]/u.test(s) ? 'moon' : /[🛒🛍]/u.test(s) ? 'bag' : /[💊]/u.test(s) ? 'medicine' : /[❤️💜💙💕]/u.test(s) ? 'heart' : 'leaf');

    /* sweep Oct 24 22:02: the companion's own name keeps the emoji the user typed EVERYWHERE it shows (Home bubble, today line,
       journey bar, Ranking, the 'Now called' toast, her world title), not only on Misty's card: 'Lumi ✨' showed as 'Lumi' + an
       outline sparkle there. '' when the name has no emoji, so nothing changes for everyone else. */
    function ownName() {
        try {
            const B = window.LowiBirthCompanion, n = B && typeof B.displayName === 'function' ? String(B.displayName() || '').trim() : '';
            return n && (emoji.lastIndex = 0, emoji.test(n)) ? n : '';
        } catch (e) { return ''; }
    }
    function symbols(node) {
        if (!node || !node.isConnected) return;
        const keep = ownName(), outside = s => keep ? s.split(keep).join(' ') : s;
        const walker = D.createTreeWalker(node, NodeFilter.SHOW_TEXT),
            nodes = [];
        while (walker.nextNode()) {
            const n = walker.currentNode,
                p = n.parentElement;
            /* user-typed text keeps its own emoji: chat, captions and the companion's name on Misty's card (.mh-name, sweep Oct 24 20:02:
               'Lumi ✨' showed as 'Lumi' + an outline sparkle icon) */
            if (!p || p.closest('script,style,svg,input,textarea,option,code,pre,.cm-t,.cm-quote,.fy-cap,.fy-caption,.tr-cap,.sp-profile-sign,.mh-name,.rk-cn,[contenteditable]')) continue;
            emoji.lastIndex = 0;
            if ((emoji.lastIndex = 0, emoji.test(outside(n.data))) || (!window.LowiIcons && /\b(Pisces|Fische|Piscis)\b/.test(n.data))) nodes.push(n);
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
              const swap = t => esc(t).replace(emoji, s => /^[\u00A9\u00AE\u2122]/.test(s) ? s : LowiIcons.fromEmoji(s, { alone: alone && !named }));
              fragment.innerHTML = keep && raw.includes(keep) ? raw.split(keep).map(swap).join(esc(keep)) : swap(raw);
            } else {
              const swap = t => esc(t).replace(emoji, s => icon(symbolKind(s))).replace(/\b(Pisces|Fische|Piscis)\b/g, icon('Pisces'));
              fragment.innerHTML = keep && n.data.includes(keep) ? n.data.split(keep).map(swap).join(esc(keep)) : swap(n.data);
            }
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
        if (a === 'when') { pickWhen(b); return; }
        /* Scan is for products; only the Scan button inside Log meal may log what it reads (index.html eatHTML reads this, once) */
        if (a === 'scan' && ownedSheet && ownedSheet.contains(b)) window.LowiScanIntent = { meal: true, at: Date.now() };
        if ((a === 'photo' || a === 'scan') && ownedSheet && ownedSheet.contains(b)) {
            R.close(ownedSheet);
            ownedSheet = null;
        }
        /* Type it on the food camera: the camera closes, the meal sheet opens over Scan */
        const fromCam = !!(foodCam && foodCam.contains(b));
        if (a === 'meal' && foodCam && foodCam.contains(b)) cancelCapture();
        if (a === 'open') open();
        else if (a === 'close') close();
        else if (a === 'scan') scan();
        else if (a === 'toBarcode') scan(); /* the food camera's Barcode switch (living-home.js takes plain data-sp=scan clicks first) */
        else if (a === 'photo') photo();
        else if (a === 'meal') mealForm(null, null, b.dataset.slot || (fromCam ? pendingSlot() : ''));
        else if (a === 'slot') mealForm(null, null, b.dataset.slot);
        else if (a === 'slotPick') slotPicker();
        else if (a === 'lmKind') lmKind(b);
        else if (a === 'lmOwn') { const sh = b.closest('.r2-ov') || D, box = sh.querySelector('#lmOwn'); if (box) { box.hidden = !box.hidden; b.setAttribute('aria-expanded', String(!box.hidden)); if (!box.hidden) { const f = box.querySelector('input'); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); if (f) f.focus({ preventScroll: true }); } } }
        else if (a === 'todayEdit') editToday(b.dataset.id);
        else if (a === 'todayDel') delToday(b);
        else if (a === 'editKind') { const f = b.closest('#spEdit'); if (f) { f.dataset.kind = b.dataset.kind; f.querySelectorAll('[data-sp="editKind"]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); } }
        else if (a === 'snapNone') { const f = D.getElementById('lmTitle'); if (f) f.focus(); }
        else if (a === 'gapskip') { window.LowiMealCtx = null; if (ownedSheet) R.close(ownedSheet); }
        else if (a === 'slotWrite') { const inp = ownedSheet && ownedSheet.querySelector('#spMeal input[name="title"]'); if (inp) { inp.scrollIntoView({ block: 'center', behavior: 'smooth' }); inp.focus(); } }
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
        else if (a === 'wardrobe') { /* Oct 15: dress-up retired; old wardrobe buttons lead to Misty's forms instead of a dead end */ if (window.LowiCompanion && LowiCompanion.open) LowiCompanion.open(); }
        else if (a === 'collection') collection();
        else if (a === 'profile') profile();
        else if (a === 'path') { if (window.LowiHerbQuests) { LowiHerbQuests.reset(); showSheet(LowiHerbQuests.pathHTML() + '<h3 class="hq-prodh">' + esc(tr('evolution')) + '</h3>' + pathHTML()); } else showSheet('<h2>' + esc(tr('evolution')) + '</h2>' + pathHTML()); }
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
        } else if (e.target.id === 'spEdit') {
            e.preventDefault();
            saveToday(e.target);
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
    /* BH-047: Escape and Safari's swipe back (back-swipe.js sends Escape) never reached the food camera: the keydown below
       returns while the herb world is closed, which it always is under #ssFood. Back went past the camera and left the app (or
       switched the page under it) with the camera still running. The camera sits on top of everything (z 2147483002), so it
       takes Escape first, in the window's capture phase, and nothing under it sees that Escape. */
    window.addEventListener('keydown', e => {
        if (e.key !== 'Escape' || !foodCam || !foodCam.isConnected) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        cancelCapture();
    }, true);
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
    /* every meal log (also plan meals and logs past the daily XP cap, which fire no reward) checks the macro bonus; once per day per goal via the ledger eventId */
    window.addEventListener('lowi:meal-logged', () => setTimeout(() => checkBonuses(false), 0));
    window.addEventListener('lowi:state', refresh);
    window.addEventListener('lowi:lang', refresh); /* BH-004: the fasting bubble and Home lines follow a language switch without a reload */
    window.addEventListener('lowi:goodnight', refresh);
    window.addEventListener('lowi:misty-power', refresh); /* hunt power-ups move her energy: the status line follows */
    window.addEventListener('lowi:peak', refresh); /* Oct 22: a sugar rush starting or fading, or the peak, rewrites the status line */
    window.addEventListener('resize', refresh);
    D.addEventListener('visibilitychange', () => {
        const h = foodCam && foodCam.isConnected ? foodCam : null;
        if (D.hidden) {
            stopPhoto();
            /* BH-047: the camera was live or starting: show the spinner and start it again on return */
            if (h && (h.dataset.st === 'live' || h.dataset.st === 'starting')) {
                h.classList.remove('live');
                foodState(h, 'starting');
                h.dataset.resume = '1';
            }
        } else {
            refresh();
            if (h && h.dataset.resume) {
                delete h.dataset.resume;
                setTimeout(() => {
                    if (foodCam === h && h.isConnected && !photoStream && !D.hidden) startFood(h);
                }, 250);
            }
        }
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
        /* Oct 15: the capture actions live in the Scan bottom bar now; the herb world is only the game */
        scan,
        photo,
        meal: () => mealForm(),
        water,
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