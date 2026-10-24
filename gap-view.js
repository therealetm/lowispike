/* LOWiSPIKE Gap view (Oct 21, 2026)
   Why: E-man on Scan / Fuel / Gap: "Scan is simply for scanning a product... Fuel is where you actually log a meal... gap is just
   like water and move or sleep... let's not have it formatted like a fasting app." Then: "when I click on Gap, it shows me just like
   a fasting app shows you what's happening inside of your body, like an estimate... use our world." Visuals: "That's on you."
   So Gap is passive. Nothing here starts or stops anything. It reads the time since your last logged meal (LowiFastStop.startOf:
   the eating time Fuel saved, backdated meals included) and draws it in the app's own world: the six markers as six planets on a
   hexagon, a light trail along it for the hours gone by, and the liquid in the glass rising with them. The markers and their notes
   are the soft-ms texts the fasting sheet already uses (LowiFast.stagesFull), framed as typical, never as a reading.
   The only actions: fix the last meal time (LowiFastEdit, the time was wrong) and "Log a meal in Fuel" (Fuel restarts the gap).
   Oct 24 2026: an "After your meal" strip leads the card (see MC below), and its walk lever may open Move.
   API window.LowiGapView {open(), close(), isOpen(), model(now)}; model is pure enough for node tests. EN / DE / ES. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiGapView = api;
})(typeof window !== 'undefined' ? window : globalThis, function (W) {
    'use strict';
    const D = W.document;
    const STR = {
        en: { title: 'Meal gap', since: 'since your last meal', none: 'No meal logged yet', noneSub: 'Log your next meal in Fuel. The gap counts from the time you ate.', close: 'Close',
            last: 'Last meal', fix: 'Fix time', now: 'Now', next: 'Next: {n} in about {d}', past: 'Past the last marker. Listen to your body.', markers: 'Typical markers',
            pts: 'So far +{x} XP. You get them when your next meal is logged in Fuel.', recent: 'Recent gaps', log: 'Log a meal in Fuel',
            hedge: 'A general guide from typical patterns, not a measurement. Every body runs its own clock. On diabetes medication? Ask your doctor before long gaps.',
            hexL: 'Six markers on a hexagon; the lit trail shows the time since your last meal', today: 'Today', yday: 'Yesterday',
            mcH: 'After your meal', mcTyp: 'Typical, not measured', mcLever: 'Lower the spike', mcMove: 'Open Move', mcRow: 'After-meal phases', mcPrev: 'Previous phase', mcNext: 'Next phase', mcSay: 'Read this phase aloud', mcStop: 'Stop reading', mcRate: 'Voice speed {r}',
            mcCare: 'On insulin or diabetes medication? Talk to your care team before changing meals or exercise: these tips can lower your blood sugar.' },
        de: { title: 'Essenspause', since: 'seit deiner letzten Mahlzeit', none: 'Noch keine Mahlzeit eingetragen', noneSub: 'Trag deine nächste Mahlzeit in Fuel ein. Die Pause zählt ab dem Essen.', close: 'Schließen',
            last: 'Letzte Mahlzeit', fix: 'Zeit ändern', now: 'Jetzt', next: 'Als Nächstes: {n} in etwa {d}', past: 'Über die letzte Marke hinaus. Hör auf deinen Körper.', markers: 'Typische Marken',
            pts: 'Bisher +{x} XP. Du bekommst sie, wenn du deine nächste Mahlzeit in Fuel einträgst.', recent: 'Letzte Pausen', log: 'Mahlzeit in Fuel eintragen',
            hedge: 'Eine grobe Orientierung aus typischen Verläufen, keine Messung. Jeder Körper hat seine eigene Uhr. Nimmst du Diabetes-Medikamente? Frag vor langen Pausen deine Ärztin oder deinen Arzt.',
            hexL: 'Sechs Marken auf einem Sechseck; die leuchtende Spur zeigt die Zeit seit deiner letzten Mahlzeit', today: 'Heute', yday: 'Gestern',
            mcH: 'Nach dem Essen', mcTyp: 'Typisch, nicht gemessen', mcLever: 'Spike senken', mcMove: 'Zu Bewegung', mcRow: 'Phasen nach dem Essen', mcPrev: 'Vorherige Phase', mcNext: 'Nächste Phase', mcSay: 'Diese Phase vorlesen', mcStop: 'Vorlesen stoppen', mcRate: 'Sprechtempo {r}',
            mcCare: 'Nimmst du Insulin oder Diabetes-Medikamente? Sprich mit deinem Behandlungsteam, bevor du Essen oder Bewegung umstellst: Diese Tipps können deinen Blutzucker senken.' },
        es: { title: 'Pausa entre comidas', since: 'desde tu última comida', none: 'Aún no hay comidas', noneSub: 'Registra tu próxima comida en Fuel. La pausa cuenta desde la hora en que comiste.', close: 'Cerrar',
            last: 'Última comida', fix: 'Cambiar hora', now: 'Ahora', next: 'Después: {n} en unas {d}', past: 'Más allá del último marcador. Escucha a tu cuerpo.', markers: 'Marcadores típicos',
            pts: 'Por ahora +{x} XP. Los recibes al registrar tu próxima comida en Fuel.', recent: 'Pausas recientes', log: 'Registrar comida en Fuel',
            hedge: 'Una guía general según patrones típicos, no una medición. Cada cuerpo tiene su propio reloj. ¿Tomas medicación para la diabetes? Consulta a tu médico antes de pausas largas.',
            hexL: 'Seis marcadores en un hexágono; el rastro iluminado muestra el tiempo desde tu última comida', today: 'Hoy', yday: 'Ayer',
            mcH: 'Después de comer', mcTyp: 'Típico, no medido', mcLever: 'Baja el pico', mcMove: 'Ir a Movimiento', mcRow: 'Fases después de comer', mcPrev: 'Fase anterior', mcNext: 'Fase siguiente', mcSay: 'Leer esta fase en voz alta', mcStop: 'Dejar de leer', mcRate: 'Velocidad de voz {r}',
            mcCare: '¿Usas insulina o medicación para la diabetes? Habla con tu equipo médico antes de cambiar comidas o ejercicio: estos consejos pueden bajar tu azúcar.' }
    };
    /* the soft-ms markers (index.html STAGES), used only when LowiFast is not there (node tests) */
    const FALLBACK = [{ h: 0, n: 'Blood sugar rises', t: 'Right after your last meal', x: '' }, { h: 3, n: 'Blood sugar often settles', t: 'For most people, around 3 h in', x: '' },
        { h: 8, n: 'Liver often takes over', t: 'For many people, around 8 h in', x: '' }, { h: 12, n: 'Fat burning often picks up', t: 'For many people, around 12 h in', x: '' },
        { h: 14, n: 'Ketones may start rising', t: 'For some people, around 14 h in', x: '' }, { h: 16, n: 'Cell cleanup, maybe', t: 'Maybe from about 16 h, nobody knows exactly', x: '' }];
    const COL = ['#8fe7ff', '#a8ffd8', '#9fd8ff', '#d6c8ff', '#c4b5ff', '#f0d7ff'];

    /* ---------- After your meal (Oct 24 2026) ----------
       Emmanuel, with six screenshots of Fastic's Body status: "similar to Fastic, but everything bezüglich lowering insulin spike
       after a meal" and "their picture is a lil animation". So the first hours of the Gap get their own strip: five round phases
       on a timeline from the logged last meal (the same start the hexagon uses), the current one glows, tap or swipe shows a small
       animated card, a "typical time" pill, two short sentences and one lever that lowers the spike. Text stays general and hedged
       ("for many people", "about"); no insulin dosing, no promises, nothing like Fastic's brain-cell or exact-16-h autophagy claims.
       Sources behind every statement and time:
       [F] Freckmann G et al. Continuous glucose profiles in healthy subjects under everyday life conditions and after different
           meals. J Diabetes Sci Technol 2007;1(5):695-703. Mean time to the after-meal peak 46-50 min; fast carbs peaked higher,
           meals with more fiber, protein and fat rose less and slower. -> rise, peak (30-60 min), "fast carbs peak higher".
       [S] Shukla AP et al. Food order has a significant impact on postprandial glucose and insulin levels. Diabetes Care
           2015;38(7):e98-e99. Vegetables and protein before carbs: glucose about 29/37/17 % lower at 30/60/120 min. -> rise lever.
       [B] Buffey AJ et al. The acute effects of interrupting prolonged sitting time in adults with standing and light-intensity
           walking on biomarkers of cardiometabolic health. Sports Med 2022;52:1765-1787. Light walking after eating lowered
           glucose and insulin vs sitting. Reynolds AN et al. Diabetologia 2016;59:2572-2578 (a 10-min walk after meals). -> peak lever.
       [R] Richter EA, Hargreaves M. Exercise, GLUT4, and skeletal muscle glucose uptake. Physiol Rev 2013;93:993-1017. Working
           muscles take up glucose. -> peak and insulin levers.
       [O] OpenStax Anatomy and Physiology 2e, 24.3 Metabolic States of the Body: insulin moves glucose into muscle, liver and fat
           cells in the absorptive state (about 4 h); afterwards insulin falls and the body draws on stored glycogen and fat.
           -> insulin, insulin low (from about 4 h).
       Levers Emmanuel approved (his list, Oct 24 2026: "Yeah, I like it. We can do that. Go ahead."), each with its source:
       veggies and protein first, carbs last [S]; never carbs alone, add protein, fat or fiber, and sweets right after a meal rather
       than alone [S][F]; whole over processed and fiber: Reynolds A et al. Carbohydrate quality and human health. Lancet
       2019;393:434-445; smaller carb portions [F]; cooked and cooled starch: Sonia S et al. Effect of cooling of cooked white rice on
       resistant starch content and glycemic response. Asia Pac J Clin Nutr 2015;24(4):620-625 (cooled 24 h at 4 C and reheated:
       lower glycemic response); vinegar: Shishehbor F et al. Vinegar consumption can attenuate postprandial glucose and insulin
       responses. Diabetes Res Clin Pract 2017;127:1-9; savory breakfast: Chang CR et al. Restricting carbohydrates at breakfast is
       sufficient to reduce 24-hour exposure to postprandial hyperglycemia. Am J Clin Nutr 2019;109:1302-1309 (type 2 diabetes);
       bigger meals earlier: Jakubowicz D et al. High-energy breakfast with low-energy dinner decreases overall daily hyperglycaemia.
       Diabetologia 2015;58:912-919 (type 2 diabetes); water over sugary drinks [F]; a 10-15 min walk after eating, and even 2-5 min
       of light walking [B]; regular strength training: Colberg SR et al. Physical activity/exercise and diabetes, ADA position
       statement. Diabetes Care 2016;39:2065-2079, and [R]; sleep: Spiegel K et al. Impact of sleep debt on metabolic and endocrine
       function. Lancet 1999;354:1435-1439; stress: stress hormones (cortisol, adrenaline) raise blood glucose, OpenStax Anatomy and
       Physiology 2e, 17.6 The Adrenal Glands. Caution line (mcCare) for people on insulin or diabetes medication: activity and
       eating changes can lower their glucose, so they talk to their care team first. Never dosing advice.
       Back near the start after 2-3 h in people without diabetes: same statement as body-trips.js, consistent with [F].
       Times are where a phase typically begins (minutes after the meal); the strip never claims to know the user's own curve. */
    const MC = [
        { id: 'rise', m: 0, c: '#8fe7ff', mv: false,
            n: ['Sugar rises', 'Zucker steigt', 'Sube el azúcar'], p: ['From the first bites', 'Ab den ersten Bissen', 'Desde los primeros bocados'],
            t: ['Soon after you start eating, sugar from the meal reaches your blood. <b>Fiber, protein and fat</b> slow it down.',
                'Kurz nach dem ersten Bissen kommt Zucker aus dem Essen ins Blut. <b>Ballaststoffe, Eiweiß und Fett</b> bremsen ihn.',
                'Poco después de empezar a comer, el azúcar de la comida llega a la sangre. <b>La fibra, la proteína y la grasa</b> lo frenan.'],
            l: [['Veggies and protein first, carbs last.', 'Never carbs alone: add protein, fat or fiber.', 'Whole over processed, smaller carb portions. Cooked and cooled rice or potatoes often rise less.', 'Vinegar in a dressing, before or with the meal, may help.'],
                ['Erst Gemüse und Eiweiß, Kohlenhydrate zuletzt.', 'Nie Kohlenhydrate allein: dazu Eiweiß, Fett oder Ballaststoffe.', 'Vollwertig statt verarbeitet, kleinere Kohlenhydrat-Portionen. Gekochter und abgekühlter Reis oder Kartoffeln steigen oft weniger.', 'Essig im Dressing, vor oder zum Essen, kann helfen.'],
                ['Primero verduras y proteína, los carbohidratos al final.', 'Nunca carbohidratos solos: añade proteína, grasa o fibra.', 'Integral mejor que procesado, y raciones de carbohidratos más pequeñas. El arroz o la patata cocidos y enfriados suelen subir menos.', 'Vinagre en el aliño, antes o con la comida, puede ayudar.']] },
        { id: 'peak', m: 30, c: '#ffe08a', mv: true,
            n: ['Peak', 'Höhepunkt', 'Pico'], p: ['About 30–60 min after eating', 'Etwa 30–60 Min. nach dem Essen', 'Unos 30–60 min después de comer'],
            t: ['For many people, blood sugar peaks <b>around 30 to 60 minutes</b> after eating. Fast carbs peak higher.',
                'Bei vielen ist der Blutzucker <b>etwa 30 bis 60 Minuten</b> nach dem Essen am höchsten. Schnelle Kohlenhydrate steigen höher.',
                'En muchas personas, el azúcar llega a su pico <b>unos 30 a 60 minutos</b> después de comer. Los carbohidratos rápidos suben más.'],
            l: [['Walk 10–15 minutes after eating. It helps most.', 'No time? Even 2–5 minutes of moving helps.'],
                ['Geh 10–15 Minuten nach dem Essen. Das hilft am meisten.', 'Keine Zeit? Schon 2–5 Minuten Bewegung helfen.'],
                ['Camina 10–15 minutos después de comer. Es lo que más ayuda.', '¿Sin tiempo? Incluso 2–5 minutos de movimiento ayudan.']] },
        { id: 'insulin', m: 60, c: '#a8ffd8', mv: true,
            n: ['Insulin brings it down', 'Insulin senkt ihn', 'La insulina lo baja'], p: ['About 1–2 h after eating', 'Etwa 1–2 Std. nach dem Essen', 'Unas 1–2 h después de comer'],
            t: ['<b>Insulin</b> helps your muscles, liver and fat cells take up the sugar, so the level falls again.',
                '<b>Insulin</b> hilft Muskeln, Leber und Fettzellen, den Zucker aufzunehmen. So sinkt der Wert wieder.',
                '<b>La insulina</b> ayuda a los músculos, el hígado y las células de grasa a tomar el azúcar, y el nivel baja.'],
            l: [['Stay a little active: stairs, tidying up, a few squats.', 'Regular strength training helps your muscles take up sugar.'],
                ['Bleib etwas aktiv: Treppe, Aufräumen, ein paar Kniebeugen.', 'Regelmäßiges Krafttraining hilft deinen Muskeln, Zucker aufzunehmen.'],
                ['Sigue algo activo: escaleras, ordenar, unas sentadillas.', 'El entrenamiento de fuerza regular ayuda a tus músculos a tomar azúcar.']] },
        { id: 'base', m: 120, c: '#9fd8ff', mv: false,
            n: ['Back to baseline', 'Zurück am Ausgangswert', 'De vuelta al inicio'], p: ['About 2–3 h after eating', 'Etwa 2–3 Std. nach dem Essen', 'Unas 2–3 h después de comer'],
            t: ['In people without diabetes, blood sugar is usually <b>close to where it started</b> about 2 to 3 hours after eating.',
                'Bei Menschen ohne Diabetes ist der Blutzucker etwa 2 bis 3 Stunden nach dem Essen meist <b>wieder nahe am Ausgangswert</b>.',
                'En personas sin diabetes, el azúcar suele estar <b>cerca del punto de partida</b> unas 2 o 3 horas después de comer.'],
            l: [['Thirsty? Water over sugary drinks.', 'Craving sweets? Have them right after a meal, not on their own.', 'A snack starts a new rise.'],
                ['Durst? Lieber Wasser als süße Getränke.', 'Lust auf Süßes? Lieber direkt nach dem Essen als allein.', 'Ein Snack startet einen neuen Anstieg.'],
                ['¿Sed? Mejor agua que bebidas azucaradas.', '¿Antojo de dulce? Mejor justo después de comer que solo.', 'Un snack empieza otra subida.']] },
        { id: 'low', m: 240, c: '#c4b5ff', mv: false,
            n: ['Insulin low', 'Insulin niedrig', 'Insulina baja'], p: ['From about 4 h after eating', 'Ab etwa 4 Std. nach dem Essen', 'Desde unas 4 h después de comer'],
            t: ['A few hours after eating, <b>insulin is low</b> again and your body draws more on stored energy.',
                'Einige Stunden nach dem Essen ist <b>Insulin wieder niedrig</b> und dein Körper nutzt mehr gespeicherte Energie.',
                'Unas horas después de comer, <b>la insulina vuelve a estar baja</b> y tu cuerpo usa más energía guardada.'],
            l: [['Bigger meals earlier in the day, a lighter dinner.', 'A savory breakfast with protein rather than a sweet one.', 'Good sleep and less stress help: short sleep and stress can raise blood sugar.'],
                ['Größere Mahlzeiten früher am Tag, abends leichter.', 'Ein herzhaftes Frühstück mit Eiweiß statt einem süßen.', 'Guter Schlaf und weniger Stress helfen: Schlafmangel und Stress können den Blutzucker erhöhen.'],
                ['Comidas más grandes antes en el día, una cena más ligera.', 'Un desayuno salado con proteína mejor que uno dulce.', 'Dormir bien y menos estrés ayudan: dormir poco y el estrés pueden subir el azúcar.']] }
    ];
    const MC_TICK = ['0', '30 min', '1 h', '2 h', '4 h'];
    const MC_WIN = 4; /* hours: inside this window the strip leads and the hexagon's own Now card steps back (same story twice) */
    /* which phase the clock is in: -1 with no meal, else the last phase whose start has passed */
    function curvePhase(min) {
        if (typeof min !== 'number' || !(min >= 0)) return -1;
        let k = 0; MC.forEach((p, i) => { if (min >= p.m) k = i; });
        return k;
    }
    const FULL_H = 16; /* the liquid is full at the last marker, the same 16 h the gap points stop at */
    const lang = () => { try { return (W.LowiLang.get() || 'en').slice(0, 2); } catch (e) { return ((D && D.documentElement.lang) || 'en').slice(0, 2); } };
    const s = k => (STR[lang()] || STR.en)[k] || STR.en[k];
    const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    /* marker notes are our own constants with <b> only; anything else is escaped */
    const rich = v => esc(v).replace(/&lt;(\/?)b&gt;/g, '<$1b>');
    const dur = ms => { const m = Math.max(0, Math.floor(ms / 60000)), h = Math.floor(m / 60); return h ? h + ' h ' + String(m % 60).padStart(2, '0') + ' min' : (m % 60) + ' min'; };
    const clock = t => new Date(t).toLocaleTimeString(lang(), { hour: '2-digit', minute: '2-digit' });

    function stages() {
        try { if (W.LowiFast && W.LowiFast.stagesFull) { const L = W.LowiFast.stagesFull(); if (L && L.length === 6) return L; } } catch (e) {}
        return FALLBACK;
    }
    function fastState() { try { return W.LowiFastStop && W.LowiFastStop._st ? W.LowiFastStop._st() : JSON.parse(W.localStorage.getItem('lowi_fast_v1')) || {}; } catch (e) { return {}; } }
    function startOf(f) {
        try { if (W.LowiFastStop && W.LowiFastStop.startOf) return +W.LowiFastStop.startOf(f) || 0; } catch (e) {}
        const h = Array.isArray(f.hist) ? f.hist : [], pe = h.length ? +h[h.length - 1].e || 0 : 0;
        return Math.max(+f.last || 0, pe);
    }
    function mealAt(start) {
        if (!start) return null;
        try {
            const logs = (W.LowiVitalsBridge && W.LowiVitalsBridge.state().logs) || [];
            let best = null;
            for (const l of logs) { const t = +l.ts || 0; if (t && Math.abs(t - start) < 30 * 60000 && (!best || t > +best.ts)) best = l; }
            return best ? String(best.t || best.n || '').trim().slice(0, 60) : null;
        } catch (e) { return null; }
    }
    /* position along the hexagon: vertex i = marker i; the closing edge runs from the last marker (16 h) to a full day */
    function trail(h, L) {
        const H = L.map(x => +x.h).concat(24);
        if (!(h > 0)) return 0;
        for (let i = 0; i < 6; i++) if (h < H[i + 1]) return (i + (h - H[i]) / (H[i + 1] - H[i])) / 6;
        return 1;
    }
    function model(now) {
        now = +now || Date.now();
        const f = fastState(), start = startOf(f), L = stages();
        const el = start && start <= now ? now - start : 0, h = el / 36e5;
        let cur = -1; L.forEach((m, i) => { if (start && h >= m.h) cur = i; });
        const nx = start ? L.find(m => m.h > h) : null;
        let x = 0; try { if (start && W.LowiFastStop && W.LowiFastStop.points) x = +W.LowiFastStop.points(h, 0).x || 0; } catch (e) {}
        const hist = (Array.isArray(f.hist) ? f.hist : []).filter(r => r && +r.s && +r.e > +r.s).slice(-3).reverse().map(r => ({ s: +r.s, e: +r.e, ms: +r.e - +r.s }));
        const mcCur = start ? curvePhase(el / 60000) : -1;
        return { mcCur, start, elapsed: el, hours: h, fill: start ? Math.min(1, h / FULL_H) : 0, trail: start ? trail(h, L) : 0, cur, next: nx || null, nextIn: nx ? nx.h * 36e5 - el : 0,
            stages: L, xp: x, meal: mealAt(start), hist };
    }

    /* ---------- drawing ---------- */
    const R = 104, CX = 130, CY = 130;
    const vtx = i => { const a = (-90 + 60 * i) * Math.PI / 180; return [CX + R * Math.cos(a), CY + R * Math.sin(a)]; };
    function hero(m) {
        const pts = [0, 1, 2, 3, 4, 5].map(vtx), hex = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
        const path = 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + ' Z';
        const lvl = (CY + 62 - m.fill * 124).toFixed(1);
        const planets = pts.map((p, i) => {
            const lit = i <= m.cur, here = i === m.cur;
            return '<g class="gv-pl' + (lit ? ' lit' : '') + (here ? ' here' : '') + '" style="--c:' + COL[i] + '"><circle class="gv-halo" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="17"/>' +
                '<circle class="gv-dot" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (here ? 11 : 8.5) + '"/>' +
                '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 3.6).toFixed(1) + '">' + esc(m.stages[i].h) + '<tspan class="gv-u">h</tspan></text></g>'; /* Oct 21 grandma test: a bare 16 on a planet is not obviously hours */
        }).join('');
        return '<svg class="gv-svg" viewBox="0 0 260 260" role="img" aria-label="' + esc(s('hexL')) + '"><defs>' +
            '<radialGradient id="gvGlass" cx="40%" cy="32%" r="75%"><stop offset="0" stop-color="#ffffff" stop-opacity=".22"/><stop offset=".55" stop-color="#8fd8ff" stop-opacity=".08"/><stop offset="1" stop-color="#0a1f4a" stop-opacity=".5"/></radialGradient>' +
            '<linearGradient id="gvLiq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8ffd8"/><stop offset=".5" stop-color="#8fe7ff"/><stop offset="1" stop-color="#7a8cff"/></linearGradient>' +
            '<clipPath id="gvClip"><circle cx="' + CX + '" cy="' + CY + '" r="62"/></clipPath></defs>' +
            '<polygon class="gv-hex" points="' + hex + '"/>' +
            '<path class="gv-trail" d="' + path + '" pathLength="1" style="stroke-dasharray:' + m.trail.toFixed(4) + ' 1"/>' +
            '<circle cx="' + CX + '" cy="' + CY + '" r="62" fill="url(#gvGlass)"/>' +
            '<g clip-path="url(#gvClip)"><g class="gv-liq" style="transform:translateY(' + lvl + 'px)"><path class="gv-wave" d="M-130 0 Q-97 -9 -65 0 T0 0 T65 0 T130 0 T195 0 T260 0 T325 0 T390 0 V200 H-130 Z" fill="url(#gvLiq)"/></g></g>' +
            '<circle class="gv-rim" cx="' + CX + '" cy="' + CY + '" r="62"/>' + planets + '</svg>';
    }
    function body(m) {
        const L = m.stages;
        if (!m.start) {
            return '<div class="gv-hero">' + hero(m) + '<div class="gv-mid"><b class="gv-none">' + esc(s('none')) + '</b></div></div>' +
                '<p class="gv-sub">' + esc(s('noneSub')) + '</p>' + curve(m) + markers(m) + '<p class="gv-hedge">' + esc(s('hedge')) + '</p>';
        }
        const curM = m.cur >= 0 ? L[m.cur] : null;
        const nextLine = m.next ? s('next').replace('{n}', m.next.n.charAt(0).toLowerCase() + m.next.n.slice(1)).replace('{d}', dur(m.nextIn)) : s('past');
        return '<div class="gv-hero">' + hero(m) + '<div class="gv-mid"><b class="gv-time" data-gv="time">' + esc(dur(m.elapsed)) + '</b><small>' + esc(s('since')) + '</small></div></div>' +
            '<div class="gv-last"><span><small>' + esc(s('last')) + '</small><b>' + (m.meal ? esc(m.meal) + ' · ' : '') + esc(clock(m.start)) + '</b></span>' +
            (W.LowiFastEdit && W.LowiFastEdit.open ? '<button type="button" class="gv-fix" data-gv="fix">' + esc(s('fix')) + '</button>' : '') + '</div>' +
            curve(m) +
            (curM && m.hours >= MC_WIN ? '<section class="gv-now" style="--c:' + COL[m.cur] + '"><small>' + esc(s('now')) + '</small><h3>' + esc(curM.n) + '</h3>' + (curM.x ? '<p>' + rich(curM.x) + '</p>' : '<p>' + esc(curM.t) + '</p>') +
                '<p class="gv-next">' + esc(nextLine) + '</p></section>' : '') +
            (m.xp > 0 ? '<p class="gv-pts">' + esc(s('pts').replace('{x}', m.xp)) + '</p>' : '') +
            markers(m) + recent(m) + '<p class="gv-hedge">' + esc(s('hedge')) + '</p>';
    }
    /* ---------- After your meal: the strip ---------- */
    let mcSel = -1; /* the phase the user picked; -1 follows the clock */
    /* Oct 24 2026 (Emmanuel's screenshot 18:52, last meal 16:11: the 2 h phase glowed, the card under it still showed "Zucker steigt"):
       a pick only held while the sheet stayed open, so a phase tapped earlier stayed open after the clock had moved on (the sheet
       survives the app going to the background). Now the card follows the phase you are in: a pick holds only while the clock is
       still in the phase it was made in, and coming back to the app or saving a new meal time drops it. */
    let mcSelCur = -1; /* the clock's phase when the pick was made */
    const selFor = (pick, pickCur, cur) => (pick >= 0 && pickCur === cur ? pick : Math.max(0, cur));
    const selOf = m => { if (mcSel >= 0 && mcSelCur !== m.mcCur) mcSel = -1; return selFor(mcSel, mcSelCur, m.mcCur); };

    /* ---------- read aloud (Oct 24 2026, Emmanuel: "for the people who don't want to read they can just click on the speaker.
       Same voice as the tutorial girl") ----------
       A round glass speaker on the open card reads it: title, typical time, the two lines and the levers. Tap again to stop; another
       phase, a swipe or closing Gap stops it. The voice is app-voice.js (LowiVoice): the tutorial's own neural voices, recorded clips
       per sentence (tools/app-voice/build.py records mcSpoken() through tools/app-voice/phrases.cjs), never the device voice
       (onlyClips). While it reads, the tutorial's speed pill (1x / 1.5x / 2x) sits next to it and shares its setting. */
    const SAY_TO = { en: ' to ', de: ' bis ', es: ' a ' };
    const SAY_UNIT = { en: [[/\bmin\b/g, 'minutes'], [/(\d) h\b/g, '$1 hours']], de: [[/\bMin\./g, 'Minuten'], [/\bStd\./g, 'Stunden']], es: [[/\bmin\b/g, 'minutos'], [/(\d) h\b/g, '$1 horas']] };
    function sayable(t, l) {
        t = String(t || '').replace(/<\/?b>/g, '').replace(/(\d)\s*[\u2013-]\s*(\d)/g, '$1' + SAY_TO[l] + '$2');
        (SAY_UNIT[l] || []).forEach(r => { t = t.replace(r[0], r[1]); });
        t = t.trim(); return /[.!?:]$/.test(t) ? t : t + '.';
    }
    /* what the speaker says for phase i, one sentence per line (pure: the clip recorder and the tests use it) */
    function mcSpoken(i, l) {
        l = ['en', 'de', 'es'].indexOf(l) >= 0 ? l : 'en'; const k = ['en', 'de', 'es'].indexOf(l), p = MC[i]; if (!p) return '';
        return [p.n[k], p.p[k], p.t[k], (STR[l] || STR.en).mcLever].concat(p.l[k]).map(x => sayable(x, l)).join('\n');
    }
    const RATE_KEY = 'lowi.tutorial.voice.rate.v1', RATES = [1, 1.5, 2]; /* tutorial-voice.js RATE_KEY / RATES: one speed for both */
    const sayRate = () => { try { const v = parseFloat(W.localStorage.getItem(RATE_KEY)); return RATES.indexOf(v) >= 0 ? v : 1; } catch (e) { return 1; } };
    const rateText = r => (lang() === 'en' ? String(r) : String(r).replace('.', ',')) + '\u00d7';
    let say = null; /* {i, h}: the phase being read and its LowiVoice handle */
    const SPK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="mc-sb" d="M4 9.5h3.2L12 5.5v13l-4.8-4H4z"/><path class="mc-w1" d="M15.2 9.2a4 4 0 0 1 0 5.6"/><path class="mc-w2" d="M17.8 6.8a7.4 7.4 0 0 1 0 10.4"/></svg>';
    function sayBtns(i) {
        const on = !!(say && say.i === i), r = sayRate(), rl = s('mcRate').replace('{r}', rateText(r));
        return '<span class="mc-say">' + (on ? '<button type="button" class="mc-rate' + (r !== 1 ? ' fast' : '') + '" data-gv="mcrate" aria-label="' + esc(rl) + '" title="' + esc(rl) + '">' + esc(rateText(r)) + '</button>' : '') +
            '<button type="button" class="mc-spk' + (on ? ' on' : '') + '" data-gv="mcsay" aria-pressed="' + on + '" aria-label="' + esc(s(on ? 'mcStop' : 'mcSay')) + '"><span class="mc-spkc">' + SPK_SVG + '</span></button></span>';
    }
    function paintSay() {
        const c = el && el.querySelector('.mc-card'); if (!c) return;
        const old = c.querySelector('.mc-say'), i = +c.dataset.i, f = D.activeElement && old && old.contains(D.activeElement) ? D.activeElement.dataset.gv : '';
        const t = D.createElement('div'); t.innerHTML = sayBtns(i);
        if (old) old.replaceWith(t.firstChild);
        if (f) { const b = c.querySelector('.mc-say [data-gv="' + f + '"]') || c.querySelector('.mc-spk'); if (b) b.focus({ preventScroll: true }); }
    }
    function sayStop() {
        const x = say; say = null;
        if (x && x.h && !x.h.ended && W.LowiVoice) { try { LowiVoice.cancel(); } catch (e) { } }
        paintSay();
    }
    function sayStart(i) {
        if (!W.LowiVoice || !MC[i]) return;
        const l = lang().slice(0, 2), done = () => { if (say && say.h === h) { say = null; paintSay(); } };
        let h = null;
        h = W.LowiVoice.speak(mcSpoken(i, l), { lang: l, playRate: sayRate(), onlyClips: true, onend: done, onerror: done });
        if (h && !h.ended) say = { i, h }; else say = null;
        paintSay();
    }
    function sayToggle(i) { if (say && say.i === i) sayStop(); else sayStart(i); }
    function sayNextRate() {
        const r = sayRate(), n = RATES[(RATES.indexOf(r) + 1) % RATES.length];
        try { W.localStorage.setItem(RATE_KEY, String(n)); } catch (e) { }
        try { if (W.LowiVoice && LowiVoice.setRate) LowiVoice.setRate(n); } catch (e) { }
        paintSay();
    }
    const li = () => Math.max(0, ['en', 'de', 'es'].indexOf(lang()));
    const MC_ICON = ['M12 18V7M7.5 11.5 12 7l4.5 4.5', 'M4 17c4 0 5-11 8-11s4 11 8 11', 'M12 6v11m-4.5-4.5L12 17l4.5-4.5', 'M4 13c2.7-2.4 5.3-2.4 8 0s5.3 2.4 8 0', 'M15.5 5.2a7 7 0 1 0 3.3 12.3A6 6 0 0 1 15.5 5.2z'];
    const MC_CLIP = [[0, 30], [24, 46], [40, 66], [62, 90], [86, 120]];
    const MC_PATH = 'M6 56C16 56 24 14 34 14S52 50 64 53 78 58 86 57 106 56 114 56';
    /* one small motif per phase, transform and opacity only, and only the open card moves (reduced motion: none) */
    function mcArt(i) {
        const p = MC[i], cl = MC_CLIP[i];
        const motif = [
            '<g class="mc-up"><circle cx="14" cy="60" r="2.4"/><circle cx="20" cy="62" r="2"/><circle cx="26" cy="60" r="1.7"/></g>',
            '<circle class="mc-halo" cx="34" cy="14" r="9"/><circle class="mc-dot" cx="34" cy="14" r="3.6"/><g class="mc-step"><circle cx="18" cy="64" r="1.8"/><circle cx="26" cy="64" r="1.8"/></g>',
            '<circle class="mc-cell" cx="84" cy="26" r="9"/><g class="mc-in"><circle cx="52" cy="34" r="2.2"/><circle cx="56" cy="42" r="1.8"/><circle cx="48" cy="26" r="1.6"/></g>',
            '<circle class="mc-bob" cx="76" cy="56" r="3.4"/>',
            '<circle class="mc-orb" cx="102" cy="34" r="8"/><circle class="mc-dot" cx="102" cy="34" r="3"/>'][i];
        return '<svg class="mc-svg" viewBox="0 0 120 72" aria-hidden="true" focusable="false"><defs><clipPath id="mcClip' + i + '"><rect x="' + cl[0] + '" y="0" width="' + (cl[1] - cl[0]) + '" height="72"/></clipPath></defs>' +
            '<line class="mc-base" x1="4" y1="56" x2="116" y2="56"/><path class="mc-curve" d="' + MC_PATH + '"/>' +
            '<path class="mc-seg" d="' + MC_PATH + '" clip-path="url(#mcClip' + i + ')"/><g class="mc-motif" style="fill:' + p.c + '">' + motif + '</g></svg>';
    }
    function curve(m) {
        const k = li(), cur = m.mcCur, sel = selOf(m), p = MC[sel];
        const row = MC.map((x, i) => (i ? '<i class="mc-link' + (cur >= i ? ' lit' : '') + '" aria-hidden="true"></i>' : '') +
            '<button type="button" class="mc-ph' + (i === sel ? ' sel' : '') + (i === cur ? ' now' : '') + (cur > i ? ' past' : '') + '" data-gv="mc" data-i="' + i + '" style="--c:' + x.c + '"' +
            ' aria-pressed="' + (i === sel) + '" aria-label="' + esc(x.n[k] + ', ' + x.p[k] + (i === cur ? ', ' + s('now') : '')) + '">' +
            '<span class="mc-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + MC_ICON[i] + '"/></svg></span><small>' + esc(MC_TICK[i]) + '</small></button>').join('');
        return '<section class="mc" aria-label="' + esc(s('mcH')) + '"><div class="mc-head"><h4 class="gv-h">' + esc(s('mcH')) + '</h4><small>' + esc(s('mcTyp')) + '</small></div>' +
            '<div class="mc-row" role="group" aria-label="' + esc(s('mcRow')) + '">' + row + '</div>' +
            '<div class="mc-card' + (sel === cur ? ' is-now' : '') + '" style="--c:' + p.c + '" data-mc-card data-i="' + sel + '">' +
            '<div class="mc-art">' + mcArt(sel) + '</div>' +
            '<div class="mc-title"><h3>' + esc(p.n[k]) + '</h3>' + (sel === cur ? '<em>' + esc(s('now')) + '</em>' : '') + sayBtns(sel) + '</div>' +
            '<span class="mc-pill">' + esc(p.p[k]) + '</span><p class="mc-t">' + rich(p.t[k]) + '</p>' +
            '<div class="mc-lever"><small>' + esc(s('mcLever')) + '</small><ul>' + p.l[k].map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
            (p.mv && sel === cur ? '<button type="button" class="mc-move" data-gv="move">' + esc(s('mcMove')) + '</button>' : '') + '</div>' +
            '<div class="mc-nav"><button type="button" class="mc-arrow" data-gv="mcprev" aria-label="' + esc(s('mcPrev')) + '"' + (sel ? '' : ' disabled') + '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6 8.5 12l6 6"/></svg></button>' +
            '<span class="mc-dots" aria-hidden="true">' + MC.map((x, i) => '<i' + (i === sel ? ' class="on"' : '') + '></i>').join('') + '</span>' +
            '<button type="button" class="mc-arrow" data-gv="mcnext" aria-label="' + esc(s('mcNext')) + '"' + (sel < MC.length - 1 ? '' : ' disabled') + '><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg></button></div>' +
            '</div><p class="mc-care">' + esc(s('mcCare')) + '</p></section>';
    }
    function mcPick(i) {
        if (!el) return;
        const m = model();
        mcSel = Math.max(0, Math.min(MC.length - 1, i)); mcSelCur = m.mcCur;
        if (say && say.i !== mcSel) sayStop();
        const sec = el.querySelector('.mc');
        if (!sec) return;
        const focusI = D.activeElement && D.activeElement.closest && D.activeElement.closest('.mc') ? (D.activeElement.dataset.gv || '') + ':' + (D.activeElement.dataset.i || '') : '';
        const t = D.createElement('div'); t.innerHTML = curve(m);
        sec.replaceWith(t.firstChild);
        if (focusI) { const [g, n] = focusI.split(':'); const b = el.querySelector('.mc [data-gv="' + g + '"]' + (n ? '[data-i="' + n + '"]' : '')); if (b && !b.disabled) b.focus({ preventScroll: true }); else { const s2 = el.querySelector('.mc-ph.sel'); if (s2) s2.focus({ preventScroll: true }); } }
    }
    /* swipe the card sideways for the next or previous phase, like Fastic; vertical drags stay the scroll */
    function mcSwipe(ov) {
        if (!W.PointerEvent) return;
        let d = null;
        ov.addEventListener('pointerdown', e => { const c = e.target.closest && e.target.closest('[data-mc-card]'); if (!c || (e.target.closest('button'))) return; d = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
        ov.addEventListener('pointerup', e => {
            if (!d || e.pointerId !== d.id) return;
            const dx = e.clientX - d.x, dy = e.clientY - d.y; d = null;
            if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.5) { const cur = mcSel >= 0 ? mcSel : Math.max(0, model().mcCur); mcPick(cur + (dx < 0 ? 1 : -1)); }
        });
        ov.addEventListener('pointercancel', () => { d = null; });
    }
    function markers(m) {
        return '<h4 class="gv-h">' + esc(s('markers')) + '</h4><ol class="gv-list">' + m.stages.map((x, i) => '<li class="' + (i < m.cur ? 'past' : i === m.cur ? 'cur' : '') + '" style="--c:' + COL[i] + '">' +
            '<details' + (i === m.cur ? ' open' : '') + '><summary><i aria-hidden="true"></i><span><b>' + esc(x.n) + '</b><small>' + esc(x.t) + '</small></span></summary>' + (x.x ? '<p>' + rich(x.x) + '</p>' : '') + '</details></li>').join('') + '</ol>';
    }
    function recent(m) {
        if (!m.hist.length) return '';
        const day = t => { const d = new Date(t), n = new Date(); if (d.toDateString() === n.toDateString()) return s('today'); n.setDate(n.getDate() - 1); if (d.toDateString() === n.toDateString()) return s('yday'); return d.toLocaleDateString(lang(), { weekday: 'short', day: 'numeric', month: 'short' }); };
        return '<h4 class="gv-h">' + esc(s('recent')) + '</h4><ul class="gv-hist">' + m.hist.map(r => '<li><span>' + esc(day(r.e)) + '</span><b>' + esc(dur(r.ms)) + '</b></li>').join('') + '</ul>';
    }

    /* ---------- the sheet ---------- */
    let el = null, tick = 0, back = null, openedAt = 0;
    function paint() {
        if (!el) return;
        const sc = el.querySelector('.gv-scroll'), y = sc ? sc.scrollTop : 0, open = Array.from(el.querySelectorAll('.gv-list details')).map(d => d.open);
        el.querySelector('.gv-body').innerHTML = body(model());
        if (open.length) el.querySelectorAll('.gv-list details').forEach((d, i) => { if (i in open) d.open = open[i]; });
        if (sc) sc.scrollTop = y;
        const c = el.querySelector('.mc-card'); if (say && (!c || +c.dataset.i !== say.i)) sayStop();
    }
    /* a new meal time, or coming back to the app: the card goes back to the phase you are in */
    function onFresh() { if (!el) return; mcSel = -1; paint(); }
    function onVis() { if (D && !D.hidden) onFresh(); }
    function open() {
        if (!D) return false;
        close(true);
        back = D.activeElement;
        mcSel = -1; openedAt = Date.now();
        el = D.createElement('div'); el.className = 'gv-ov'; el.id = 'gvSheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'gvTitle');
        el.setAttribute('data-noi18n', '');
        el.innerHTML = '<div class="gv-card"><div class="gv-top"><button type="button" class="gv-x" data-gv="close" aria-label="' + esc(s('close')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
            '<h2 id="gvTitle">' + esc(s('title')) + '</h2></div><div class="gv-scroll"><div class="gv-body"></div>' +
            '<button type="button" class="gv-log" data-gv="log">' + esc(s('log')) + '</button></div></div>';
        D.body.appendChild(el);
        paint();
        requestAnimationFrame(() => { if (el) el.classList.add('on'); });
        el.addEventListener('click', onClick);
        dragDown(el);
        mcSwipe(el);
        D.addEventListener('keydown', onKey, true);
        W.addEventListener('lowi:fast', paint); W.addEventListener('storage', paint);
        W.addEventListener('lowi:fast-start', onFresh); D.addEventListener('visibilitychange', onVis);
        tick = setInterval(paint, 30000);
        setTimeout(() => { const x = el && el.querySelector('.gv-x'); if (x) x.focus({ preventScroll: true }); }, 60);
        return true;
    }
    function close(quick) {
        clearInterval(tick); tick = 0;
        if (say) sayStop();
        D && D.removeEventListener('keydown', onKey, true);
        W.removeEventListener && W.removeEventListener('lowi:fast-start', onFresh); D && D.removeEventListener('visibilitychange', onVis);
        W.removeEventListener && W.removeEventListener('lowi:fast', paint); W.removeEventListener && W.removeEventListener('storage', paint);
        const e = el; el = null;
        if (!e) return;
        if (quick) { e.remove(); return; }
        e.classList.remove('on'); setTimeout(() => e.remove(), 260);
        try { if (back && back.focus && D.contains(back)) back.focus({ preventScroll: true }); } catch (x) {}
    }
    /* Oct 24 2026 (back and close sweep): on a phone the Gap card is a bottom sheet, but a swipe down did nothing (only back,
       X, Escape and a tap outside closed it), unlike the app's other sheets. A drag down on its header (title row, not the X)
       now follows the finger and closes it past a quarter of the card or on a quick flick; a short drag springs back. No new
       element: the header itself is the handle, as on the other sheets. The X still works the same. */
    function dragDown(ov) {
        const card = ov.querySelector('.gv-card'), top = ov.querySelector('.gv-top');
        if (!card || !top || !W.PointerEvent) return;
        top.style.touchAction = 'none';
        let d = null;
        top.addEventListener('pointerdown', e => {
            if (d || (e.button != null && e.button > 0) || (e.target.closest && e.target.closest('button'))) return;
            d = { id: e.pointerId, y0: e.clientY, y: 0, ly: e.clientY, t: e.timeStamp, v: 0 };
            try { top.setPointerCapture(e.pointerId); } catch (x) { }
        });
        top.addEventListener('pointermove', e => {
            if (!d || e.pointerId !== d.id) return;
            const dt = Math.max(1, e.timeStamp - d.t);
            d.v = .6 * d.v + .4 * ((e.clientY - d.ly) / dt * 1000); d.ly = e.clientY; d.t = e.timeStamp;
            d.y = Math.max(0, e.clientY - d.y0);
            if (d.y > 2) { card.style.transition = 'none'; card.style.transform = 'translateY(' + d.y + 'px)'; }
        });
        const end = (e, cancelled) => {
            if (!d || e.pointerId !== d.id) return;
            const g = d; d = null;
            try { top.releasePointerCapture(e.pointerId); } catch (x) { }
            const h = card.getBoundingClientRect().height || 400;
            const v = e.timeStamp - g.t > 100 ? 0 : g.v;
            card.style.transition = '';
            if (!cancelled && el === ov && (g.y > Math.min(140, h * .25) || (v > 650 && g.y > 18))) {
                card.style.transform = 'translateY(' + Math.round(h + 40) + 'px)';
                close();
            } else card.style.transform = '';
        };
        top.addEventListener('pointerup', e => end(e, false));
        top.addEventListener('pointercancel', e => end(e, true));
    }
    function onKey(e) {
        if (!el) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && D.activeElement && D.activeElement.closest && D.activeElement.closest('.mc-row')) {
            e.preventDefault(); const cur = mcSel >= 0 ? mcSel : Math.max(0, model().mcCur); mcPick(cur + (e.key === 'ArrowRight' ? 1 : -1));
            const b = el && el.querySelector('.mc-ph.sel'); if (b) b.focus({ preventScroll: true }); return;
        }
        if (e.key === 'Tab') {
            const f = Array.from(el.querySelectorAll('button, summary, [href]')).filter(x => x.offsetParent !== null);
            if (!f.length) return;
            const a = f[0], z = f[f.length - 1];
            if (e.shiftKey && D.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && D.activeElement === z) { e.preventDefault(); a.focus(); }
        }
    }
    function onClick(e) {
        if (e.target === el) { close(); return; }
        const b = e.target.closest('[data-gv]'); if (!b) return;
        const k = b.dataset.gv;
        if (k === 'close') close();
        else if (k === 'fix') { try { W.LowiFastEdit.open(); } catch (x) { console.error(x); } }
        else if (k === 'log') { close(); setTimeout(() => { try { W.LowiSpirit.meal(); } catch (x) { console.error(x); } }, 60); }
        else if (k === 'mc') { if (Date.now() - openedAt < 450) return; mcPick(+b.dataset.i || 0); } /* not the tap that opened Gap landing on the row */
        else if (k === 'mcsay') { const c = b.closest('[data-mc-card]'); sayToggle(c ? +c.dataset.i : 0); }
        else if (k === 'mcrate') sayNextRate();
        else if (k === 'mcprev' || k === 'mcnext') { const cur = mcSel >= 0 ? mcSel : Math.max(0, model().mcCur); mcPick(cur + (k === 'mcnext' ? 1 : -1)); }
        else if (k === 'move') { close(); setTimeout(() => { try { if (typeof W.lowiOpen === 'function') W.lowiOpen('move'); else if (typeof W.goTab === 'function') W.goTab('move'); } catch (x) { console.error(x); } }, 60); }
    }
    return { open, close, isOpen: () => !!el, model, strings: STR, _trail: trail, phases: MC, curvePhase, _curve: curve, mcSpoken, selFor, speaking: () => !!say };
});
