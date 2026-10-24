/* LOWiSPIKE personal habit nudges, pure rules (Oct 24, 2026). habit-nudges.js draws them, tests/habit-nudges.test.cjs checks them.
   Emmanuel (via the previous Maya): personal nudges come from the person's OWN companion about their OWN habits (water,
   grocery shopping, logging a meal). Warm, playful, team-oriented, never an alarm, never scolding, never nagging. The timing
   fits the habit and the person's day (water around their usual morning / coffee break / with a meal, not a fixed 10 a.m.),
   and most of the time it works quietly: a small cue in the companion's world instead of another message.
   - SEPARATE from the community inspiration bot: nothing here is posted, shared or sent anywhere. Local only.
   - The person's day is read from their own activity: when they open the app, when they log water (recorded from now on),
     when they log meals (the app's own meal log). With too little history we only use event moments (just opened in the
     morning, just logged a meal) and never invent a schedule.
   - Groceries only follow the shopping rhythm the person typed themselves (shop-plan-core.js, "no default and no guess").
   - Spoken lines are rare: at most 2 a day (1 on "Rarely"), at least 3 h apart, one per habit per day, never in quiet hours,
     never when the person turned reminders off. Cues are quiet visuals the person can switch off.
   - The companion speaks in the first person and is never called by a fixed name. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiHabitNudgeCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const KEY = 'lowi.habitnudge.v1';
    const MIN = 6e4, HOUR = 36e5, DAY = 864e5;
    const KEEP_DAYS = 21, KEEP_N = 400, LOOK_DAYS = 14, MIN_DAYS = 3;
    const LINE_GAP = 3 * HOUR, LINES_DAY = 2;
    const LANGS = ['en', 'de', 'es'];
    const lang = l => { l = String(l || 'en').slice(0, 2).toLowerCase(); return LANGS.indexOf(l) >= 0 ? l : 'en'; };
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const startOfDay = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
    const minOfDay = t => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };
    const hourOf = t => new Date(t).getHours();

    function fresh() { return { v: 1, hist: { open: [], water: [] }, cups: { day: '', n: 0 }, said: { day: '', ids: [], last: 0, n: 0 }, rot: {}, cues: true }; }
    function normalize(s) {
        const f = fresh(); s = s && typeof s === 'object' ? s : {};
        const list = a => Array.isArray(a) ? a.map(Number).filter(x => isFinite(x) && x > 0).sort((a, b) => a - b) : [];
        const h = s.hist && typeof s.hist === 'object' ? s.hist : {};
        f.hist = { open: list(h.open), water: list(h.water) };
        if (s.cups && typeof s.cups === 'object') f.cups = { day: String(s.cups.day || ''), n: +s.cups.n || 0 };
        if (s.said && typeof s.said === 'object') f.said = { day: String(s.said.day || ''), ids: Array.isArray(s.said.ids) ? s.said.ids.map(String).slice(0, 10) : [], last: +s.said.last || 0, n: +s.said.n || 0 };
        if (s.rot && typeof s.rot === 'object') Object.keys(s.rot).forEach(k => { const v = +s.rot[k]; if (Number.isInteger(v) && v >= 0) f.rot[k] = v; });
        f.cues = s.cues !== false;
        return f;
    }
    /* keep the last 21 days, at most 400 marks per kind */
    function prune(s, now) {
        const cut = now - KEEP_DAYS * DAY;
        ['open', 'water'].forEach(k => { s.hist[k] = s.hist[k].filter(t => t >= cut && t <= now + MIN).slice(-KEEP_N); });
        return s;
    }
    /* an app open counts once per 20 minutes (coming back from a quick switch is the same moment) */
    function noteOpen(s, now) {
        const a = s.hist.open, last = a.length ? a[a.length - 1] : 0;
        if (!last || now - last >= 20 * MIN) a.push(now);
        return prune(s, now);
    }
    /* water has no timestamps in the app (lowi_fast_v1.water[day] is a cup count), so a rise in today's count is the moment */
    function noteCups(s, cups, now) {
        const d = dayKey(now); cups = +cups || 0;
        if (s.cups.day !== d) s.cups = { day: d, n: 0 };
        const rose = cups > s.cups.n + 1e-9;
        if (rose) s.hist.water.push(now);
        s.cups.n = cups;
        prune(s, now);
        return rose;
    }

    /* ---------- the person's own rhythm ---------- */
    /* hours of the day where something happened on at least MIN_DAYS different days of the last two weeks (today left out) */
    function habitHours(list, now, minDays) {
        minDays = minDays || MIN_DAYS;
        const from = startOfDay(now) - LOOK_DAYS * DAY, to = startOfDay(now), days = {};
        (list || []).forEach(t => { if (t < from || t >= to) return; const h = hourOf(t); (days[h] = days[h] || {})[dayKey(t)] = 1; });
        return Object.keys(days).map(Number).filter(h => Object.keys(days[h]).length >= minDays).sort((a, b) => a - b);
    }
    /* the usual first open of the day, in minutes after midnight (median of the last two weeks), or null below MIN_DAYS days */
    function firstOpen(list, now) {
        const from = startOfDay(now) - LOOK_DAYS * DAY, to = startOfDay(now), first = {};
        (list || []).forEach(t => { if (t < from || t >= to) return; const k = dayKey(t), m = minOfDay(t); if (first[k] == null || m < first[k]) first[k] = m; });
        const v = Object.keys(first).map(k => first[k]).sort((a, b) => a - b);
        if (v.length < MIN_DAYS) return null;
        return v.length % 2 ? v[(v.length - 1) / 2] : Math.round((v[v.length / 2 - 1] + v[v.length / 2]) / 2);
    }
    const todayList = (list, now) => (list || []).filter(t => t >= startOfDay(now) && t <= now);
    function quiet(now, qs, qe) {
        qs = qs == null ? 22 : +qs; qe = qe == null ? 7 : +qe;
        const h = new Date(now).getHours() + new Date(now).getMinutes() / 60, a = qs % 24, b = qe;
        return a === b ? false : a < b ? (h >= a && h < b) : (h >= a || h < b);
    }

    /* ---------- water ----------
       in: {now, cups, goal, waters[], opens[], meals[], event:'open'|'meal'|null, eventAt, qs, qe}
       out: {cue, moment}  moment = 'morning' | 'meal' | 'habit' | 'break' | ''  (a moment is a fitting time for one spoken line) */
    function water(i) {
        const now = +i.now, goal = +i.goal > 0 ? +i.goal : 6, cups = +i.cups || 0, none = { cue: false, moment: '' };
        if (cups >= goal - 1e-9) return none;
        if (quiet(now, i.qs, i.qe)) return none;
        const waters = i.waters || [], lastW = waters.length ? waters[waters.length - 1] : 0;
        const since = lastW ? now - lastW : Infinity;
        if (since < 75 * MIN) return none; /* just drank: leave it */
        const qe = i.qe == null ? 7 : +i.qe, qs = i.qs == null ? 22 : +i.qs, end = qs > qe ? qs : 24;
        const h = new Date(now).getHours() + new Date(now).getMinutes() / 60;
        const pace = Math.max(0, Math.min(1, (h - qe) / Math.max(1, (end - 1) - qe)));
        const behind = cups < goal * pace - 0.75;
        const opensToday = todayList(i.opens, now), ev = i.event, evFresh = ev && i.eventAt && now - i.eventAt < 10 * MIN;
        let moment = '';
        if (evFresh && ev === 'meal') moment = 'meal';
        else if (evFresh && ev === 'open') {
            const fo = firstOpen(i.opens, now), m = minOfDay(now), first = opensToday.length <= 1;
            if (first && (fo != null ? Math.abs(m - fo) <= 75 : (h >= qe && h < 11))) moment = 'morning';
        }
        if (!moment) {
            const hh = new Date(now).getHours();
            if (habitHours(waters, now).indexOf(hh) >= 0 && !(lastW && lastW >= now - (new Date(now).getMinutes()) * MIN)) moment = 'habit';
            else if (behind && since >= 150 * MIN && hh >= 13 && habitHours(i.opens, now).indexOf(hh) >= 0) moment = 'break';
        }
        const cue = !!moment || (behind && since >= 120 * MIN) || (cups === 0 && h >= qe + 2);
        return { cue, moment };
    }

    /* ---------- groceries (only the rhythm the person typed) ----------
       in: {now, plan:{every, days[]}, lastShop, qs, qe}   out: {cue, moment}  moment = 'shop' | '' */
    function shop(i) {
        const none = { cue: false, moment: '' }, p = i.plan || {}, every = Math.round(+p.every || 0);
        if (!(every >= 1 && every <= 60)) return none;
        const now = +i.now, last = +i.lastShop || 0;
        if (last && last >= startOfDay(now)) return none; /* already shopped today */
        const days = Array.isArray(p.days) ? p.days.map(Number) : [];
        let shopDay;
        if (days.length) shopDay = days.indexOf(new Date(now).getDay()) >= 0 && (!last || now - last >= Math.max(1, every - 2) * DAY);
        else shopDay = !last ? false : Math.floor((startOfDay(now) - startOfDay(last)) / DAY) >= every;
        if (!shopDay) return none;
        if (quiet(now, i.qs, i.qe)) return none;
        const h = new Date(now).getHours();
        return { cue: true, moment: h >= 8 && h < 19 ? 'shop' : '' };
    }

    /* ---------- logging a meal (only when the person already has a meal-logging rhythm) ----------
       in: {now, meals[], snapOn, qs, qe}   out: {cue, moment}  moment = 'log' | '' */
    function logMeal(i) {
        const none = { cue: false, moment: '' }, now = +i.now, meals = i.meals || [];
        if (quiet(now, i.qs, i.qe)) return none;
        const hours = habitHours(meals, now);
        if (!hours.length) return none; /* no rhythm yet: we don't invent one */
        const h = new Date(now).getHours(), today = todayList(meals, now).map(hourOf);
        /* a usual meal hour that passed at least 2 h ago with nothing logged within 2 h of it */
        const missed = hours.some(x => x <= h - 2 && !today.some(t => Math.abs(t - x) <= 2));
        if (!missed) return none;
        /* still logging: at least 3 of the last 7 days have a meal (a habit that is alive, not one that was given up) */
        const week = {}; meals.forEach(t => { if (t >= startOfDay(now) - 7 * DAY && t < startOfDay(now)) week[dayKey(t)] = 1; });
        if (Object.keys(week).length < 3) return none;
        return { cue: true, moment: !i.snapOn && h >= 12 && h < 21 ? 'log' : '' };
    }

    /* ---------- may the companion say something now? ---------- */
    function canSay(s, habit, now, o) {
        o = o || {};
        if (!o.remindersOn) return false;
        if (quiet(now, o.qs, o.qe)) return false;
        const d = dayKey(now), said = s.said.day === d ? s.said : { day: d, ids: [], last: s.said.last, n: 0 };
        const cap = o.freq === 'few' ? 1 : LINES_DAY;
        if (said.n >= cap) return false;
        if (said.ids.indexOf(habit) >= 0) return false;
        if (said.last && now - said.last < LINE_GAP) return false;
        return true;
    }
    function markSaid(s, habit, now) {
        const d = dayKey(now);
        if (s.said.day !== d) s.said = { day: d, ids: [], last: s.said.last, n: 0 };
        if (s.said.ids.indexOf(habit) < 0) s.said.ids.push(habit);
        s.said.n++; s.said.last = now;
        return s;
    }

    /* ---------- what the companion says (first person, no fixed name; humour written for each language) ---------- */
    const LINES = {
        en: {
            morning: ['Morning! Coffee is lovely, but I fancy water first. Join me? \u{1F4A7}', 'Before the day runs off with us: a few sips together?', 'Heading out? Let\u2019s sneak in some water before we go.'],
            meal: ['That meal deserves a sidekick. Some water? I\u2019ll clink mine.', 'Food\u2019s in. Water next? Teamwork.'],
            habit: ['Our little water o\u2019clock. Cheers? \u{1F4A7}', 'Quick break? I\u2019m having a few sips. You in?'],
            break: ['I\u2019m a bit crispy around the edges. Share some water with me?', 'Afternoon slump? A few sips and we\u2019re both back in business.'],
            shop: ['Shopping day! Want to go hunting together? I\u2019ll ride in the basket.', 'It\u2019s our shop day. Fresh things in, more sparkle for our world.', 'Grocery mission today? I\u2019ve packed my tiny bag.'],
            log: ['Did we eat something nice? Tell me, I\u2019m curious!', 'I missed our meal update. What did we have?', 'Snack report, captain? A quick one counts too.']
        },
        de: {
            morning: ['Guten Morgen! Kaffee ist toll, aber ich hab zuerst Lust auf Wasser. Machst du mit? \u{1F4A7}', 'Bevor der Tag mit uns davonl\u00e4uft: ein paar Schlucke zusammen?', 'Gleich unterwegs? Lass uns vorher noch schnell was trinken.'],
            meal: ['Zum Essen geh\u00f6rt ein Schluck Wasser. Prost, ich trink mit!', 'Essen ist drin. Wasser hinterher? Teamarbeit.'],
            habit: ['Unsere kleine Wasserpause. Prost! \u{1F4A7}', 'Kurze Pause? Ich g\u00f6nn mir ein paar Schlucke. Du auch?'],
            break: ['Ich bin ein bisschen knusprig an den R\u00e4ndern. Teilen wir uns ein Wasser?', 'Nachmittagstief? Ein paar Schlucke, und wir sind beide wieder fit.'],
            shop: ['Einkaufstag! Gehen wir zusammen auf Jagd? Ich fahr im Korb mit.', 'Heute ist unser Einkaufstag. Frisches rein, mehr Glanz f\u00fcr unsere Welt.', 'Einkaufsmission heute? Meine kleine Tasche ist gepackt.'],
            log: ['Haben wir was Leckeres gegessen? Erz\u00e4hl, ich bin neugierig!', 'Mir fehlt unser Essens-Update. Was gab\u2019s denn?', 'Snack-Bericht, Chef? Ein kurzer z\u00e4hlt auch.']
        },
        es: {
            morning: ['\u00a1Buenos d\u00edas! El caf\u00e9 est\u00e1 genial, pero a m\u00ed me apetece agua primero. \u00bfMe acompa\u00f1as? \u{1F4A7}', 'Antes de que el d\u00eda salga corriendo: \u00bfunos sorbos juntos?', '\u00bfYa te vas? Echemos un traguito de agua antes.'],
            meal: ['Esa comida pide compa\u00f1\u00eda: \u00bfun poco de agua? \u00a1Chinch\u00edn!', 'Comida lista. \u00bfY el agua? Trabajo en equipo.'],
            habit: ['Nuestra horita del agua. \u00a1Salud! \u{1F4A7}', '\u00bfPausita? Yo me tomo unos sorbos. \u00bfTe apuntas?'],
            break: ['Estoy un poco tostadito por los bordes. \u00bfCompartimos un poco de agua?', '\u00bfBaj\u00f3n de la tarde? Unos sorbos y volvemos los dos a la carga.'],
            shop: ['\u00a1D\u00eda de compras! \u00bfVamos de caza juntos? Yo voy en el carrito.', 'Hoy toca compra. Cosas frescas dentro, m\u00e1s brillo para nuestro mundo.', '\u00bfMisi\u00f3n s\u00faper hoy? Ya tengo mi bolsita lista.'],
            log: ['\u00bfHemos comido algo rico? \u00a1Cu\u00e9ntame, que me pica la curiosidad!', 'Oye, me falta nuestro resumen de comida. \u00bfQu\u00e9 hubo?', '\u00bfInforme de picoteo, jefe? Uno rapidito tambi\u00e9n cuenta.']
        }
    };
    /* the next line for a moment, rotating so the same words don't come back twice in a row */
    function line(s, moment, l) {
        const set = (LINES[lang(l)] || LINES.en)[moment]; if (!set || !set.length) return '';
        const k = lang(l) + ':' + moment, i = (s.rot[k] || 0) % set.length;
        s.rot[k] = (i + 1) % set.length;
        return set[i];
    }
    const HABIT = { morning: 'water', meal: 'water', habit: 'water', break: 'water', shop: 'shop', log: 'log' };

    return { KEY, LANGS, LINES, HABIT, fresh, normalize, prune, noteOpen, noteCups, habitHours, firstOpen, quiet, water, shop, logMeal, canSay, markSaid, line, dayKey };
});
