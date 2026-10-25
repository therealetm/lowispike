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
   - stairs:  Takaishi T et al., Appl Physiol Nutr Metab 2012 (PMID 22196221): a short bout (about 6 minutes) of stair
              climbing-descending after a meal sped up the fall of blood glucose in middle-aged men with impaired glucose
              tolerance. (Replaced the glass of water on Oct 25 evening: Emmanuel asked to remove it and put a real spike
              flattener in its place. Water stays on the Home water bubble; it is not a spike lever of its own.)
   - upright: Buffey AJ et al., Sports Med 2022: standing instead of sitting after meals lowered insulin; lying down right away
              is the opposite of the walk that helps most. Kept hedged: "stay upright", not a medical claim.

   25 Oct 2026 evening (Emmanuel): he tapped all four tiles within seconds, got 12 XP, Spike Tamer and a level-up without doing
   anything, and the water tile paid points while the Home cup bubble stayed put. "It must prove the movement, not pay for a tap."
   Now (tests/after-meal-honest.test.cjs):
   - walk, muscle and upright are timed: the first tap only STARTS a timer (10 min / 1 min / 30 min). Nothing is paid or ticked
     before the time has passed; then one more tap confirms it. A web page cannot see a walk, so the card says plainly that this
     is a timer and an honest yes, not tracking. Starting is allowed inside the 60-minute window; a started action may be
     confirmed until GRACE_MS after its timer ends (an upright half hour started at minute 50 still counts).
   - all four are timed movements now (walk 10 min, squats 1 min, stairs 6 min, upright 30 min); the water tile is gone.
   - Spike Tamer therefore needs all four really finished; a tap storm can never unlock it. */
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
    const DUR = { walk: 10 * MIN, muscle: MIN, stairs: 6 * MIN, upright: 30 * MIN };   /* timed actions: the timer must run out before a confirm */
    const GRACE_MS = 30 * MIN;       /* a finished timer may be confirmed this long after it ends */

    const ITEMS = [
        { id: 'walk', l: ['Walk 10 min', '10 Min. gehen', 'Camina 10 min'], s: ['even 2\u20135 min helps', 'schon 2\u20135 Min. helfen', 'hasta 2\u20135 min ayudan'],
            src: 'Reynolds 2016 Diabetologia; Buffey 2022 Sports Med' },
        { id: 'muscle', l: ['Squats or calf raises', 'Kniebeugen, Wadenheben', 'Sentadillas o talones'], s: ['1 min, muscles grab sugar', '1 Min., Muskeln ziehen Zucker', '1 min, el m\u00fasculo usa az\u00facar'],
            src: 'Hamilton 2022 iScience; Dempsey 2016 Diabetes Care' },
        { id: 'stairs', l: ['Stairs up and down', 'Treppe rauf und runter', 'Sube y baja escaleras'], s: ['easy pace, hold the rail', 'locker, am Gel\u00e4nder halten', 'a tu ritmo, con barandilla'],
            src: 'Takaishi 2012 Appl Physiol Nutr Metab' },
        { id: 'upright', l: ['Stay upright', 'Aufrecht bleiben', 'Qu\u00e9date erguido'], s: ['no lying down for 30 min', '30 Min. nicht hinlegen', 'sin tumbarte 30 min'],
            src: 'Buffey 2022 Sports Med (standing breaks)' }
    ];
    const IDS = ITEMS.map(i => i.id);

    const STR = {
        en: { title: 'Flatten the spike', sub: 'Tiny moves now can soften the wave. Start one, finish it, confirm it.', subSpike: 'That one may spike. Let\u2019s soften it together.',
            skip: 'Skip', left: '{m} min left', prog: '{d}/{n} \u00b7 +{x} XP', each: '+{x} XP each', cap: 'Points are maxed for today. The moves still count for you.',
            late: 'Time\u2019s up for points on this meal.', done: 'All four done. Great teamwork!', achHead: 'Secret achievement unlocked', achName: 'Spike Tamer',
            achText: 'Your first full after-meal checklist. +{x} XP', region: 'After-meal checklist', open: 'Show checklist', fold: 'Fold checklist',
            min: '{m} min', start: 'Tap to start \u00b7 {d}', run: '{t} left', confirm: 'Done? Tap to confirm',
            honest: 'Just a timer, nothing is tracked. Confirm only what you really did.' },
        de: { title: 'Spike gl\u00e4tten', sub: 'Kleine Moves jetzt k\u00f6nnen die Welle abfedern. Starten, durchziehen, best\u00e4tigen.', subSpike: 'Das k\u00f6nnte spiken. Lass es uns zusammen abfedern.',
            skip: '\u00dcberspringen', left: 'noch {m} Min.', prog: '{d}/{n} \u00b7 +{x} XP', each: 'je +{x} XP', cap: 'F\u00fcr heute gibt\u2019s keine Punkte mehr. Die Bewegung z\u00e4hlt trotzdem f\u00fcr dich.',
            late: 'Die Zeit f\u00fcr Punkte zu dieser Mahlzeit ist um.', done: 'Alle vier geschafft. Starkes Teamwork!', achHead: 'Geheimer Erfolg freigeschaltet', achName: 'Spike-B\u00e4ndiger',
            achText: 'Deine erste komplette Nach-dem-Essen-Liste. +{x} XP', region: 'Nach-dem-Essen-Liste', open: 'Liste zeigen', fold: 'Liste einklappen',
            min: '{m} Min.', start: 'Tippen zum Starten \u00b7 {d}', run: 'noch {t}', confirm: 'Geschafft? Tippen zum Best\u00e4tigen',
            honest: 'Nur ein Timer, nichts wird gemessen. Best\u00e4tige nur, was du wirklich gemacht hast.' },
        es: { title: 'Aplana el pico', sub: 'Peque\u00f1os gestos ahora pueden suavizar la ola. Empieza, term\u00ednalo, conf\u00edrmalo.', subSpike: 'Esto puede subir. Suavic\u00e9moslo juntos.',
            skip: 'Saltar', left: 'quedan {m} min', prog: '{d}/{n} \u00b7 +{x} XP', each: '+{x} XP cada una', cap: 'Hoy ya no hay m\u00e1s puntos. Moverte sigue contando para ti.',
            late: 'Se acab\u00f3 el tiempo de puntos para esta comida.', done: 'Las cuatro hechas. \u00a1Gran trabajo en equipo!', achHead: 'Logro secreto desbloqueado', achName: 'Domador de picos',
            achText: 'Tu primera lista completa despu\u00e9s de comer. +{x} XP', region: 'Lista despu\u00e9s de comer', open: 'Mostrar lista', fold: 'Plegar lista',
            min: '{m} min', start: 'Toca para empezar \u00b7 {d}', run: 'quedan {t}', confirm: '\u00bfHecho? Toca para confirmar',
            honest: 'Solo un temporizador, no se mide nada. Confirma solo lo que de verdad hiciste.' }
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
        return { id: String(d.id), ts: +d.ts, at: +now || Date.now(), spike: !!d.spike, done: [], run: {}, skip: false, fin: false, fold: false };
    }
    function minsLeft(p, now) {
        if (!p) return 0; const left = (+p.ts + WINDOW_MS) - (+now || Date.now());
        return left <= 0 ? 0 : Math.max(1, Math.ceil(left / MIN));
    }
    const timed = item => Object.prototype.hasOwnProperty.call(DUR, item);
    const startedAt = (p, item) => { const v = p && p.run && +p.run[item]; return Number.isFinite(v) && v > 0 ? v : 0; };
    const isDone = (p, item) => !!(p && Array.isArray(p.done) && p.done.indexOf(item) >= 0);
    /* last moment a started action may still be confirmed */
    const deadline = (p, item) => { const s = startedAt(p, item); return s ? s + DUR[item] + GRACE_MS : 0; };
    function remaining(p, item, now) { const s = startedAt(p, item); if (!s || !timed(item)) return 0; return Math.max(0, s + DUR[item] - (+now || Date.now())); }
    /* a running action whose timer has not run out, or ran out and still waits for its confirm */
    const live = (p, item, now) => timed(item) && !isDone(p, item) && startedAt(p, item) > 0 && (+now || Date.now()) <= deadline(p, item);
    const ready = (p, item, now) => live(p, item, now) && remaining(p, item, now) <= 0;
    const running = (p, now) => IDS.filter(i => live(p, i, now));
    function open(p, now) { return !!(p && !p.skip && !p.fin && (minsLeft(p, now) > 0 || running(p, now).length > 0)); }

    /* first tap on a timed tile: start its timer. Pays nothing and ticks nothing. Returns a new state (the old one is untouched). */
    function start(p, item, now) {
        now = +now || Date.now();
        if (!p || IDS.indexOf(item) < 0) return { ok: false, why: 'unknown', p };
        if (!timed(item)) return { ok: false, why: 'untimed', p };
        if (isDone(p, item)) return { ok: false, why: 'done', p };
        if (live(p, item, now)) return { ok: false, why: 'running', p };   /* a second tap, a reload, a second tab: the timer keeps its start */
        if (minsLeft(p, now) <= 0) return { ok: false, why: 'late', p };
        const run = Object.assign({}, p.run || {}); run[item] = now;
        return { ok: true, why: 'started', p: Object.assign({}, p, { run }) };
    }
    /* confirm tap: may this action count as done, and may it pay? complete = tick it; ok = pay xp (decide's rules).
       start = never started, early = timer still running, expired = timer ended more than GRACE_MS ago (start it again) */
    function claim(ledger, p, item, now) {
        now = +now || Date.now();
        if (!p || IDS.indexOf(item) < 0) return { ok: false, complete: false, xp: 0, why: 'unknown', eventId: p ? eventId(p.id, item) : '' };
        const id = eventId(p.id, item);
        if (timed(item)) {
            const s = startedAt(p, item);
            if (!s) return { ok: false, complete: false, xp: 0, why: 'start', eventId: id };
            if (now < s + DUR[item]) return { ok: false, complete: false, xp: 0, why: 'early', eventId: id };
            if (now > deadline(p, item)) return { ok: false, complete: false, xp: 0, why: 'expired', eventId: id };
            return Object.assign({ complete: true }, decide(ledger, p, item, now, s));
        }
        return Object.assign({ complete: true }, decide(ledger, p, item, now));
    }
    const clock = ms => { const s = Math.max(0, Math.ceil((+ms || 0) / 1000)); return Math.floor(s / 60) + ':' + pad(s % 60); };
    const durText = (item, l) => t(l, 'min', { m: Math.round((DUR[item] || 0) / MIN) });

    /* the meals whose checklist paid today (ledger entries of this day) */
    function paidMeals(ledger, day) {
        const out = [];
        (Array.isArray(ledger) ? ledger : []).forEach(e => { if (!isTick(e)) return; const d = e.day || (+e.ts ? dayKey(+e.ts) : ''); if (d !== day) return; const m = mealOf(e.eventId); if (out.indexOf(m) < 0) out.push(m); });
        return out;
    }
    /* may this tick pay? ok / dup (already paid) / late (past 60 min) / cap (three meals today already) / unknown.
       at = when a timed action was started: the 60-minute window applies to the start (claim passes it) */
    function decide(ledger, p, item, now, at) {
        now = +now || Date.now();
        if (!p || IDS.indexOf(item) < 0) return { ok: false, xp: 0, why: 'unknown', eventId: p ? eventId(p.id, item) : '' };
        const id = eventId(p.id, item), L = Array.isArray(ledger) ? ledger : [];
        if (L.some(e => e && e.eventId === id)) return { ok: false, xp: 0, why: 'dup', eventId: id };
        if (minsLeft(p, +at > 0 ? +at : now) <= 0) return { ok: false, xp: 0, why: 'late', eventId: id };
        const paid = paidMeals(L, dayKey(now));
        if (paid.indexOf(p.id) < 0 && paid.length >= DAY_MEALS) return { ok: false, xp: 0, why: 'cap', eventId: id };
        return { ok: true, xp: XP_EACH, why: 'ok', eventId: id };
    }
    const full = done => IDS.every(i => (done || []).indexOf(i) >= 0);
    const achEarned = ledger => (Array.isArray(ledger) ? ledger : []).some(e => e && e.eventId === ACH.eventId);
    const shouldUnlock = (ledger, done) => full(done) && !achEarned(ledger);

    const api = { ITEMS, IDS, STR, LANGS, WINDOW_MS, JUST_MS, XP_EACH, DAY_MEALS, SRC, LABEL, ACH, DUR, GRACE_MS, t, label, why, li, dayKey, eventId, isTick, mealOf, justAte, pending, minsLeft, open,
        timed, startedAt, isDone, deadline, remaining, live, ready, running, start, claim, clock, durText, paidMeals, decide, full, achEarned, shouldUnlock };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (W) W.LowiAfterMealCore = api;
})(typeof window !== 'undefined' ? window : null);
