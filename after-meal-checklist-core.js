/* After-meal checklist, pure model (Oct 25 2026, Emmanuel: "after they log their meal and also if they just ate it ... one of
   those instant reduction tips checklist which they get extra points for ... Secret achievement.").
   Right after a meal logged as eaten just now, four quick actions that lower the blood-sugar rise after eating. Each tick within
   60 minutes of the meal pays XP once through the app's ledger (award), capped per meal and per day; the first full checklist
   unlocks a hidden achievement. after-meal-checklist.js draws the card. Tested in tests/after-meal-checklist.test.cjs.

   The four actions match the levers the Gap view already cites (gap-view.js "After your meal"):
   - walk:    Reynolds AN et al., Diabetologia 2016: a 10-minute walk after each meal lowered post-meal glucose more than one
              30-minute walk a day. Buffey AJ et al., Sports Med 2022: even 2-5 minutes of light walking after eating lowers it.
   - muscle:  Hamilton MT et al., iScience 2022: the seated calf raise ("soleus push-up") roughly halved the post-meal glucose
              rise. Dempsey PC et al., Diabetes Care 2016: short bouts of simple resistance moves (half squats, calf raises)
              lowered post-meal glucose. Working muscles take up glucose without needing extra insulin.
   - water:   water instead of juice or soda: a sweet drink adds a fast second rise (the water lever in gap-view.js).
   - upright: Buffey AJ et al., Sports Med 2022: standing instead of sitting after meals lowered insulin; lying down right away
              is the opposite of the walk that helps most. Kept hedged: "stay upright", not a medical claim. */
(function (W) {
    'use strict';
    const MIN = 60000;
    const WINDOW_MS = 60 * MIN;      /* ticks count for 60 minutes after the meal */
    const JUST_MS = 5 * MIN;         /* "just ate": the meal time is within 5 minutes of the log (Fuel's "Now", Gap's "I just ate") */
    const XP_EACH = 3;               /* a meal pays 15 XP; its whole checklist at most 12 */
    const DAY_MEALS = 3;             /* checklists that pay per day: more logged meals cannot farm points */
    const SRC = 'after-meal';
    const LABEL = 'After-meal checklist';               /* sun meter: "other" (no walk / water words, no second Move or Water point) */
    const ACH = { id: 'spike-tamer', xp: 20, eventId: 'pmc:ach:spike-tamer', label: 'Secret achievement: Spike Tamer' };
    const LANGS = ['en', 'de', 'es'];

    const ITEMS = [
        { id: 'walk', l: ['Walk 10 min', '10 Min. gehen', 'Camina 10 min'], s: ['even 2\u20135 min helps', 'schon 2\u20135 Min. helfen', 'hasta 2\u20135 min ayudan'],
            src: 'Reynolds 2016 Diabetologia; Buffey 2022 Sports Med' },
        { id: 'muscle', l: ['Squats or calf raises', 'Kniebeugen, Wadenheben', 'Sentadillas o talones'], s: ['1 min, muscles grab sugar', '1 Min., Muskeln ziehen Zucker', '1 min, el m\u00fasculo usa az\u00facar'],
            src: 'Hamilton 2022 iScience; Dempsey 2016 Diabetes Care' },
        { id: 'water', l: ['Glass of water', 'Ein Glas Wasser', 'Un vaso de agua'], s: ['not juice or soda', 'statt Saft oder Limo', 'ni zumo ni refresco'],
            src: 'gap-view.js water lever (no sweet drinks)' },
        { id: 'upright', l: ['Stay upright', 'Aufrecht bleiben', 'Qu\u00e9date erguido'], s: ['no lying down for 30 min', '30 Min. nicht hinlegen', 'sin tumbarte 30 min'],
            src: 'Buffey 2022 Sports Med (standing breaks)' }
    ];
    const IDS = ITEMS.map(i => i.id);

    const STR = {
        en: { title: 'Flatten the spike', sub: 'Tiny moves now, a smaller wave later. Tick what you do.', subSpike: 'That one may spike. Let\u2019s soften it together.',
            skip: 'Skip', left: '{m} min left', prog: '{d}/{n} \u00b7 +{x} XP', each: '+{x} XP each', cap: 'Points are maxed for today. Your blood sugar still says thanks.',
            late: 'Time\u2019s up for points on this meal.', done: 'Wave flattened. Great teamwork!', achHead: 'Secret achievement unlocked', achName: 'Spike Tamer',
            achText: 'Your first full after-meal checklist. +{x} XP', region: 'After-meal checklist', open: 'Show checklist', fold: 'Fold checklist' },
        de: { title: 'Spike gl\u00e4tten', sub: 'Kleine Moves jetzt, kleinere Welle sp\u00e4ter. Hak ab, was du machst.', subSpike: 'Das k\u00f6nnte spiken. Lass es uns zusammen abfedern.',
            skip: '\u00dcberspringen', left: 'noch {m} Min.', prog: '{d}/{n} \u00b7 +{x} XP', each: 'je +{x} XP', cap: 'F\u00fcr heute gibt\u2019s keine Punkte mehr. Dein Blutzucker dankt trotzdem.',
            late: 'Die Zeit f\u00fcr Punkte zu dieser Mahlzeit ist um.', done: 'Welle gegl\u00e4ttet. Starkes Teamwork!', achHead: 'Geheimer Erfolg freigeschaltet', achName: 'Spike-B\u00e4ndiger',
            achText: 'Deine erste komplette Nach-dem-Essen-Liste. +{x} XP', region: 'Nach-dem-Essen-Liste', open: 'Liste zeigen', fold: 'Liste einklappen' },
        es: { title: 'Aplana el pico', sub: 'Peque\u00f1os gestos ahora, una ola menor despu\u00e9s. Marca lo que hagas.', subSpike: 'Esto puede subir. Suavic\u00e9moslo juntos.',
            skip: 'Saltar', left: 'quedan {m} min', prog: '{d}/{n} \u00b7 +{x} XP', each: '+{x} XP cada una', cap: 'Hoy ya no hay m\u00e1s puntos. Tu az\u00facar te lo agradece igual.',
            late: 'Se acab\u00f3 el tiempo de puntos para esta comida.', done: 'Ola aplanada. \u00a1Gran trabajo en equipo!', achHead: 'Logro secreto desbloqueado', achName: 'Domador de picos',
            achText: 'Tu primera lista completa despu\u00e9s de comer. +{x} XP', region: 'Lista despu\u00e9s de comer', open: 'Mostrar lista', fold: 'Plegar lista' }
    };
    const li = l => Math.max(0, LANGS.indexOf(String(l || 'en').slice(0, 2)));
    function t(l, k, v) {
        l = String(l || 'en').slice(0, 2);
        let s = (STR[l] || STR.en)[k]; if (s == null) s = STR.en[k]; s = String(s == null ? '' : s);
        return v ? s.replace(/\{(\w+)\}/g, (m, n) => (v[n] != null ? String(v[n]) : m)) : s;
    }
    const label = (it, l) => it.l[li(l)];
    const why = (it, l) => it.s[li(l)];

    const pad = n => String(n).padStart(2, '0');
    const dayKey = ts => { const d = new Date(+ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const eventId = (mealId, item) => 'pmc:' + mealId + ':' + item;
    const isTick = e => e && typeof e.eventId === 'string' && e.eventId.indexOf('pmc:') === 0 && e.eventId !== ACH.eventId;
    const mealOf = id => { const s = String(id).slice(4), k = s.lastIndexOf(':'); return k > 0 ? s.slice(0, k) : s; };

    /* the logged meal (lowi:meal-logged detail) was eaten just now: a time within 5 minutes of the log, never a plan */
    function justAte(d, now) {
        if (!d || !d.id || d.via === 'plan') return false;
        const ts = +d.ts; if (!Number.isFinite(ts) || ts <= 0) return false;
        return Math.abs((+now || Date.now()) - ts) <= JUST_MS;
    }
    /* the checklist kept for one meal (localStorage): ts = when it was eaten, at = when it was logged */
    function pending(d, now) {
        return { id: String(d.id), ts: +d.ts, at: +now || Date.now(), spike: !!d.spike, done: [], skip: false, fin: false, fold: false };
    }
    function minsLeft(p, now) {
        if (!p) return 0; const left = (+p.ts + WINDOW_MS) - (+now || Date.now());
        return left <= 0 ? 0 : Math.max(1, Math.ceil(left / MIN));
    }
    function open(p, now) { return !!(p && !p.skip && !p.fin && minsLeft(p, now) > 0); }

    /* the meals whose checklist paid today (ledger entries of this day) */
    function paidMeals(ledger, day) {
        const out = [];
        (Array.isArray(ledger) ? ledger : []).forEach(e => { if (!isTick(e)) return; const d = e.day || (+e.ts ? dayKey(+e.ts) : ''); if (d !== day) return; const m = mealOf(e.eventId); if (out.indexOf(m) < 0) out.push(m); });
        return out;
    }
    /* may this tick pay? ok / dup (already paid) / late (past 60 min) / cap (three meals today already) / unknown */
    function decide(ledger, p, item, now) {
        now = +now || Date.now();
        if (!p || IDS.indexOf(item) < 0) return { ok: false, xp: 0, why: 'unknown', eventId: p ? eventId(p.id, item) : '' };
        const id = eventId(p.id, item), L = Array.isArray(ledger) ? ledger : [];
        if (L.some(e => e && e.eventId === id)) return { ok: false, xp: 0, why: 'dup', eventId: id };
        if (minsLeft(p, now) <= 0) return { ok: false, xp: 0, why: 'late', eventId: id };
        const paid = paidMeals(L, dayKey(now));
        if (paid.indexOf(p.id) < 0 && paid.length >= DAY_MEALS) return { ok: false, xp: 0, why: 'cap', eventId: id };
        return { ok: true, xp: XP_EACH, why: 'ok', eventId: id };
    }
    const full = done => IDS.every(i => (done || []).indexOf(i) >= 0);
    const achEarned = ledger => (Array.isArray(ledger) ? ledger : []).some(e => e && e.eventId === ACH.eventId);
    const shouldUnlock = (ledger, done) => full(done) && !achEarned(ledger);

    const api = { ITEMS, IDS, STR, LANGS, WINDOW_MS, JUST_MS, XP_EACH, DAY_MEALS, SRC, LABEL, ACH, t, label, why, li, dayKey, eventId, isTick, mealOf, justAte, pending, minsLeft, open, paidMeals, decide, full, achEarned, shouldUnlock };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (W) W.LowiAfterMealCore = api;
})(typeof window !== 'undefined' ? window : null);
