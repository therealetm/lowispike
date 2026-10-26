/* LOWiSPIKE evening catch-up (Oct 26 2026, MAYA-HANDOFF 0.39): the pure parts, run in node tests.
   Why: Emmanuel, call 26 Oct ~23:30: "One of my beta users only uses her phone at the end of the day when she's about to go to
   sleep ... we need to make our app so that even those who weren't able to use the app throughout the day can catch up at the
   end of the day." She is pushing 80: very simple. "A checklist game ... points after points after points ... the best bubble
   checklist ever."
   What lives here: the bubbles in order (Breakfast, Lunch, Dinner, Snacks, Water, Movement), which ones today still needs
   (a meal already logged at that time of day, 6 glasses, or a Move range today skip their bubble), the choices for each
   (her usual foods for that time of day first, then simple common ones), the approximate time each entry is saved at
   (morning / noon / afternoon / evening), the points shown while picking (the app's own rules: 15 a meal, 0 for a likely
   spike, a duplicate or past the 8-meal cap; 2 a glass up to 6 glasses; Move 5 / 11 / 16 by step range), the once-a-day
   bonus, the plain-words read-back, when the evening greeting shows, and every line the companion says out loud (SAY, recorded
   by tools/app-voice). The screen is evening-catchup.js. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiEveningCatchupCore = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    const LANGS = ['en', 'de', 'es'];
    const ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'water', 'move'];
    const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
    /* the approximate time each meal is saved at: no exact times asked */
    const TIME = { breakfast: [8, 0], lunch: [12, 30], snack: [15, 30], dinner: [18, 30] };
    const BAND = { breakfast: 'morning', lunch: 'noon', snack: 'afternoon', dinner: 'evening' };
    /* the app's reward table, read from the code that pays: LowiVitalsBridge.logMeal (15, MEAL_CAP 8), water (2 a glass, 6 a day),
       move-estimate-core.js LEVELS (5 / 11 / 16). The bonus is paid once a day when at least two things were saved. */
    const MEAL_XP = 15, MEAL_CAP = 8, WATER_XP = 2, WATER_CAP = 6;
    const BONUS = { xp: 10, min: 2, src: 'catchup', label: 'Day caught up' };
    const GREET = { evening: 19, quiet: 15 };
    const WATER_OPTS = [1, 2, 3, 4];
    const MOVE_OPTS = ['casual', 'steady', 'epic'];
    const STORE = 'lowi.catchup.v1', DRAFT = 'lowi.catchup.draft.v1';

    const TX = {
        en: {
            greet: 'Ready to catch up on your day?', go: 'Catch up on today', later: 'Not now', title: 'Catch up on today',
            close: 'Close', tapBubble: 'Tap the bubble', other: 'Something else', skip: 'Skip', add: 'Add', back: 'Back',
            otherQ: 'What was it?', otherPh: 'Type or tap the mic', review: 'Your day', save: 'Save', saved: 'Day saved!',
            night: 'Good night', done: 'Done', points: '{n} points', plus: '+{n}', added: 'Added', allDone: 'Your day is all caught up.',
            nothing: 'Nothing to save yet.', again: 'Start over', spike: 'likely blood sugar spike', glasses1: '1 glass', glassesN: '{n} glasses', glasses4: '4 or more',
            step: '{i} of {n}', bubbleLabel: '{name}. Tap to choose.', progress: 'Bubble {i} of {n}', usual: 'your usual', settingsRow: 'Catch up on today',
            bonus: 'Whole day caught up', companion: 'Your companion',
            name: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snacks', water: 'Water', move: 'Movement' },
            q: { breakfast: 'What did you have for breakfast?', lunch: 'What did you have for lunch?', dinner: 'What did you have for dinner?', snack: 'Any snacks today?', water: 'How much water today?', move: 'Did you move today?' },
            band: { morning: 'Morning', noon: 'Midday', afternoon: 'Afternoon', evening: 'Evening', water: 'Water', move: 'Movement' },
            move: { casual: 'A little', steady: 'A good walk', epic: 'A lot' },
            moveHint: { casual: 'under 5,000 steps', steady: '5,000 to 10,000 steps', epic: 'over 10,000 steps' }
        },
        de: {
            greet: 'Bereit, deinen Tag nachzutragen?', go: 'Heute nachtragen', later: 'Nicht jetzt', title: 'Heute nachtragen',
            close: 'Schlie\u00dfen', tapBubble: 'Tipp auf die Blase', other: 'Etwas anderes', skip: '\u00dcberspringen', add: 'Hinzuf\u00fcgen', back: 'Zur\u00fcck',
            otherQ: 'Was war es?', otherPh: 'Tippen oder Mikro antippen', review: 'Dein Tag', save: 'Speichern', saved: 'Tag gespeichert!',
            night: 'Gute Nacht', done: 'Fertig', points: '{n} Punkte', plus: '+{n}', added: 'Eingetragen', allDone: 'Dein Tag ist komplett nachgetragen.',
            nothing: 'Noch nichts zu speichern.', again: 'Neu anfangen', spike: 'wahrscheinlich Blutzuckerspitze', glasses1: '1 Glas', glassesN: '{n} Gl\u00e4ser', glasses4: '4 oder mehr',
            step: '{i} von {n}', bubbleLabel: '{name}. Tippen zum Ausw\u00e4hlen.', progress: 'Blase {i} von {n}', usual: 'wie immer', settingsRow: 'Heute nachtragen',
            bonus: 'Ganzer Tag nachgetragen', companion: 'Dein Begleiter',
            name: { breakfast: 'Fr\u00fchst\u00fcck', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snacks', water: 'Wasser', move: 'Bewegung' },
            q: { breakfast: 'Was gab es zum Fr\u00fchst\u00fcck?', lunch: 'Was gab es zu Mittag?', dinner: 'Was gab es zum Abendessen?', snack: 'Heute etwas zwischendurch?', water: 'Wie viel Wasser heute?', move: 'Hast du dich heute bewegt?' },
            band: { morning: 'Morgens', noon: 'Mittags', afternoon: 'Nachmittags', evening: 'Abends', water: 'Wasser', move: 'Bewegung' },
            move: { casual: 'Ein bisschen', steady: 'Ein guter Spaziergang', epic: 'Viel' },
            moveHint: { casual: 'unter 5.000 Schritte', steady: '5.000 bis 10.000 Schritte', epic: '\u00fcber 10.000 Schritte' }
        },
        es: {
            greet: '\u00bfLista para ponerte al d\u00eda?', go: 'Ponerme al d\u00eda', later: 'Ahora no', title: 'Ponerme al d\u00eda',
            close: 'Cerrar', tapBubble: 'Toca la burbuja', other: 'Otra cosa', skip: 'Saltar', add: 'A\u00f1adir', back: 'Atr\u00e1s',
            otherQ: '\u00bfQu\u00e9 fue?', otherPh: 'Escribe o toca el micro', review: 'Tu d\u00eda', save: 'Guardar', saved: '\u00a1D\u00eda guardado!',
            night: 'Buenas noches', done: 'Listo', points: '{n} puntos', plus: '+{n}', added: 'Anotado', allDone: 'Tu d\u00eda ya est\u00e1 al d\u00eda.',
            nothing: 'A\u00fan no hay nada que guardar.', again: 'Empezar de nuevo', spike: 'probable pico de az\u00facar en sangre', glasses1: '1 vaso', glassesN: '{n} vasos', glasses4: '4 o m\u00e1s',
            step: '{i} de {n}', bubbleLabel: '{name}. Toca para elegir.', progress: 'Burbuja {i} de {n}', usual: 'lo de siempre', settingsRow: 'Ponerme al d\u00eda',
            bonus: 'D\u00eda completo anotado', companion: 'Tu compa\u00f1ero',
            name: { breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Picoteo', water: 'Agua', move: 'Movimiento' },
            q: { breakfast: '\u00bfQu\u00e9 desayunaste?', lunch: '\u00bfQu\u00e9 almorzaste?', dinner: '\u00bfQu\u00e9 cenaste?', snack: '\u00bfAlgo para picar hoy?', water: '\u00bfCu\u00e1nta agua hoy?', move: '\u00bfTe moviste hoy?' },
            band: { morning: 'Ma\u00f1ana', noon: 'Mediod\u00eda', afternoon: 'Tarde', evening: 'Noche', water: 'Agua', move: 'Movimiento' },
            move: { casual: 'Un poco', steady: 'Un buen paseo', epic: 'Mucho' },
            moveHint: { casual: 'menos de 5.000 pasos', steady: '5.000 a 10.000 pasos', epic: 'm\u00e1s de 10.000 pasos' }
        }
    };
    /* simple common foods; a is the English name the app's own analyseMeal reads, so the verdict is the same in every language */
    const PRESETS = {
        breakfast: [{ a: 'eggs', en: 'Eggs', de: 'Eier', es: 'Huevos' }, { a: 'greek yogurt with berries', en: 'Yogurt with berries', de: 'Joghurt mit Beeren', es: 'Yogur con frutos rojos' },
            { a: 'cheese', en: 'Cheese', de: 'K\u00e4se', es: 'Queso' }, { a: 'bread with butter', en: 'Bread and butter', de: 'Brot mit Butter', es: 'Pan con mantequilla' }],
        lunch: [{ a: 'vegetable soup', en: 'Soup', de: 'Suppe', es: 'Sopa' }, { a: 'salad', en: 'Salad', de: 'Salat', es: 'Ensalada' },
            { a: 'chicken with vegetables', en: 'Meat and vegetables', de: 'Fleisch mit Gem\u00fcse', es: 'Carne con verduras' }, { a: 'sandwich', en: 'Sandwich', de: 'Belegtes Brot', es: 'Bocadillo' }],
        dinner: [{ a: 'fish with vegetables', en: 'Fish and vegetables', de: 'Fisch mit Gem\u00fcse', es: 'Pescado con verduras' }, { a: 'chicken salad', en: 'Chicken and salad', de: 'H\u00e4hnchen mit Salat', es: 'Pollo con ensalada' },
            { a: 'omelette', en: 'Omelette', de: 'Omelett', es: 'Tortilla' }, { a: 'pasta', en: 'Pasta', de: 'Nudeln', es: 'Pasta' }],
        snack: [{ a: 'apple', en: 'Fruit', de: 'Obst', es: 'Fruta' }, { a: 'nuts', en: 'Nuts', de: 'N\u00fcsse', es: 'Frutos secos' },
            { a: 'cheese', en: 'Cheese', de: 'K\u00e4se', es: 'Queso' }, { a: 'cake', en: 'Something sweet', de: 'Etwas S\u00fc\u00dfes', es: 'Algo dulce' }]
    };
    /* what the companion says out loud (recorded in all three languages by tools/app-voice; never the app's name) */
    const CHEER = {
        en: ['Lovely!', 'Nice one!', 'Got it!', 'Wonderful!', 'Well done!'],
        de: ['Sch\u00f6n!', 'Prima!', 'Hab ich!', 'Wunderbar!', 'Gut gemacht!'],
        es: ['\u00a1Qu\u00e9 bien!', '\u00a1Genial!', '\u00a1Anotado!', '\u00a1Maravilloso!', '\u00a1Muy bien!']
    };
    const LINES = {
        en: { review: 'Here is your day. Tap Save when it looks right.', finish: 'Your day is saved. Sleep well.', finishDay: 'Your day is saved. Well done.' },
        de: { review: 'Das war dein Tag. Tipp auf Speichern, wenn es passt.', finish: 'Dein Tag ist gespeichert. Schlaf gut.', finishDay: 'Dein Tag ist gespeichert. Gut gemacht.' },
        es: { review: 'Este fue tu d\u00eda. Toca Guardar si est\u00e1 bien.', finish: 'Tu d\u00eda est\u00e1 guardado. Que descanses.', finishDay: 'Tu d\u00eda est\u00e1 guardado. Bien hecho.' }
    };
    const SAY = {};
    LANGS.forEach(l => { const t = TX[l]; SAY[l] = [t.greet, t.allDone].concat(ORDER.map(s => t.q[s]), CHEER[l], [LINES[l].review, LINES[l].finish, LINES[l].finishDay]); });

    const L = l => (LANGS.includes(String(l || '').slice(0, 2)) ? String(l).slice(0, 2) : 'en');
    const tx = (l) => TX[L(l)];
    const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : m));
    const pad = n => (n < 10 ? '0' : '') + n;
    const dayKey = d => { d = d instanceof Date ? d : new Date(d == null ? Date.now() : d); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

    /* the time of day a log belongs to: its own slot when it says snack, else its hour */
    function slotOf(log) {
        if (!log) return '';
        if (log.slot === 'snack') return 'snack';
        if (log.slot === 'breakfast' || log.slot === 'lunch' || log.slot === 'dinner') return log.slot;
        const h = new Date(+log.ts || 0).getHours();
        if (h < 11) return 'breakfast';
        if (h < 15) return 'lunch';
        if (h < 17) return 'snack';
        return 'dinner';
    }
    const todays = (logs, day) => (Array.isArray(logs) ? logs : []).filter(l => l && (l.day || dayKey(+l.ts || 0)) === day);
    /* the bubbles today still needs, in order */
    function needed(o) {
        o = o || {}; const day = o.day || dayKey(o.now), got = {};
        todays(o.logs, day).forEach(l => { const s = slotOf(l); if (s) got[s] = 1; });
        return ORDER.filter(s => {
            if (MEALS.includes(s)) return !got[s];
            if (s === 'water') return (+o.water || 0) < WATER_CAP;
            if (s === 'move') return !o.moved;
            return true;
        });
    }
    /* her usual foods for this time of day: the most logged titles of the last 30 days (newest first on a tie), not already today */
    function usual(logs, slot, now, max) {
        now = +now || Date.now(); max = max == null ? 2 : max;
        const since = now - 30 * 864e5, today = dayKey(now), seen = {}, list = [];
        (Array.isArray(logs) ? logs : []).forEach(l => {
            if (!l || !l.t || (+l.ts || 0) < since || slotOf(l) !== slot) return;
            const k = norm(l.t); if (!k || k.length > 60) return;
            const e = seen[k] || (seen[k] = { t: String(l.t).trim(), n: 0, last: 0, lvl: l.lvl || '', r: l.r, today: false });
            e.n++; if ((+l.ts || 0) > e.last) { e.last = +l.ts || 0; e.lvl = l.lvl || e.lvl; e.r = l.r; }
            if ((l.day || dayKey(+l.ts || 0)) === today) e.today = true;
            if (e.n === 1) list.push(e);
        });
        return list.filter(e => !e.today).sort((a, b) => b.n - a.n || b.last - a.last).slice(0, max);
    }
    /* the big choices for one bubble: usual first, then common ones, four at most, no repeats */
    function choices(slot, o) {
        o = o || {}; const l = L(o.lang), t = tx(l);
        if (slot === 'water') return WATER_OPTS.map(n => ({ key: 'w' + n, cups: n, label: n === 1 ? t.glasses1 : n === 4 ? t.glasses4 : fill(t.glassesN, { n }) }));
        if (slot === 'move') return MOVE_OPTS.map(id => ({ key: id, level: id, label: t.move[id], hint: t.moveHint[id] }));
        const out = [], taken = {};
        usual(o.logs, slot, o.now, 2).forEach(u => { taken[norm(u.t)] = 1; out.push({ key: 'u:' + norm(u.t), t: u.t, label: u.t, lvl: u.lvl || '', r: u.r, usual: true }); });
        (PRESETS[slot] || []).forEach(p => { if (out.length >= 4) return; const name = p[l] || p.en; if (taken[norm(name)] || taken[norm(p.en)]) return; taken[norm(name)] = 1; out.push({ key: 'p:' + p.a, t: name, label: name, a: p.a }); });
        return out.slice(0, 4);
    }
    /* the approximate time a meal is saved at: today at its usual hour, never later than a minute ago */
    function atFor(slot, now) {
        now = +now || Date.now(); const hm = TIME[slot]; if (!hm) return now;
        const d = new Date(now); d.setHours(hm[0], hm[1], 0, 0);
        const start = new Date(now); start.setHours(0, 0, 0, 0);
        return Math.max(+start, Math.min(+d, now - 60000));
    }
    /* the stable id each entry is saved under: one per day and bubble, so a second catch-up can never count it twice */
    const entryId = (day, slot) => 'catchup-' + day + '-' + slot;
    /* the points shown while picking, from the app's own rules. ctx: {why(data) -> reason or '' (LowiVitalsBridge.mealWhy),
       mealsToday, water (glasses today), waterHave (glasses already paid today), movePlan(level) -> {xp, back, action}} */
    function preview(picks, ctx) {
        ctx = ctx || {}; let meals = +ctx.mealsToday || 0; const out = {};
        (picks || []).forEach(p => {
            if (!p || p.skip) return;
            if (MEALS.includes(p.slot)) {
                let why = ''; try { why = ctx.why ? ctx.why(p.data || {}) || '' : ''; } catch (e) { why = ''; }
                if (!why && spiky(p.data, ctx.spiky)) why = 'spike';
                if (!why && meals >= MEAL_CAP) why = 'cap';
                out[p.slot] = why ? 0 : MEAL_XP; meals++;
            } else if (p.slot === 'water') {
                const cur = +ctx.water || 0, have = Math.max(0, +ctx.waterHave || 0);
                out.water = Math.max(0, Math.min(WATER_CAP, Math.floor(cur + (+p.cups || 0) + 1e-9)) - have) * WATER_XP;
            } else if (p.slot === 'move') {
                let r = null; try { r = ctx.movePlan ? ctx.movePlan(p.level) : null; } catch (e) { r = null; }
                out.move = r && r.action !== 'same' && r.action !== 'full' && r.action !== 'bad' ? Math.max(0, (+r.xp || 0) - (+r.back || 0)) : 0;
            }
        });
        return out;
    }
    /* a likely spike, by the app's own rule (LowiVitalsBridge.spiky); the fallback copies that rule for node tests */
    function spiky(data, fn) {
        if (!data) return false;
        if (typeof fn === 'function') { try { return !!fn(data); } catch (e) { return false; } }
        const r = String(data.r != null ? data.r : '').toLowerCase(), v = String(data.lvl || '').toLowerCase();
        if (r === 'ja' || v === 'low' || r === 'low' || r === 'yes') return false;
        return r === 'nein' || v === 'high' || r === 'high' || r === 'no';
    }
    const real = picks => (picks || []).filter(p => p && !p.skip);
    const bonusDue = (picks, ledger, day) => real(picks).length >= BONUS.min && !(ledger || []).some(e => e && e.eventId === bonusId(day));
    const bonusId = day => 'catchup:' + day;
    const total = (pv, withBonus) => Object.keys(pv || {}).reduce((a, k) => a + (+pv[k] || 0), 0) + (withBonus ? BONUS.xp : 0);
    /* saving order: by the time of day, so the meal log and the fasting gap read like the real day */
    function plan(picks, now) {
        const rank = { breakfast: 0, lunch: 1, snack: 2, dinner: 3, water: 4, move: 5 };
        return real(picks).slice().sort((a, b) => rank[a.slot] - rank[b.slot]).map(p => Object.assign({}, p, MEALS.includes(p.slot) ? { at: atFor(p.slot, now) } : {}));
    }
    /* the day read back in plain words, one line per thing */
    function summary(picks, lang, isSpiky) {
        const t = tx(lang);
        return plan(picks).map(p => {
            const head = MEALS.includes(p.slot) ? t.band[BAND[p.slot]] : t.band[p.slot];
            let what = p.label || (p.data && p.data.t) || '';
            if (p.slot === 'move') what = t.move[p.level] || what;
            return { slot: p.slot, head, what, spike: MEALS.includes(p.slot) && spiky(p.data, isSpiky), line: head + ': ' + what };
        });
    }
    /* when opening the app greets her: in the evening with at most one meal in, or from mid-afternoon with nothing at all in;
       once a day ("Not now" counts), never on the day she finished a catch-up, never before setup is done */
    function shouldGreet(o) {
        o = o || {}; const now = +o.now || Date.now(), day = dayKey(now), st = o.state || {};
        if (o.onboarded === false) return false;
        if (st.seen === day || st.done === day) return false;
        const h = new Date(now).getHours(), list = todays(o.logs, day), meals = list.length, nothing = !meals && !(+o.activity || 0);
        if (needed({ logs: o.logs, day, water: o.water, moved: o.moved }).length === 0) return false;
        if (h >= GREET.evening && meals < 2) return true;
        if (h >= GREET.quiet && nothing) return true;
        return false;
    }
    /* cheers in a shuffled order without the same one twice in a row */
    function cheer(lang, last, rnd) {
        const pool = CHEER[L(lang)], r = typeof rnd === 'function' ? rnd : Math.random;
        const opts = pool.filter(c => c !== last); return opts[Math.floor(r() * opts.length) % opts.length];
    }
    return { LANGS, ORDER, MEALS, TIME, BAND, MEAL_XP, MEAL_CAP, WATER_XP, WATER_CAP, BONUS, GREET, WATER_OPTS, MOVE_OPTS, STORE, DRAFT, TX, PRESETS, CHEER, LINES, SAY,
        L, tx, fill, dayKey, slotOf, needed, usual, choices, atFor, entryId, preview, bonusDue, bonusId, total, plan, summary, shouldGreet, cheer, real, spiky };
});
