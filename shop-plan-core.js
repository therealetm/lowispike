/* LOWiSPIKE shopping rhythm, pure rules (Oct 17, 2026).
   E-man: healthy habits start in the grocery shop, and people "should type it in themselves. We can have that in the onboarding
   somewhere." So the shopping rhythm is only ever what the person typed: there is NO default interval and no guess.

   ONE source of truth for the whole app (onboarding, Profile, grocery check-ins, world bonuses). Never build a second one.
   Storage (shop-plan.js writes it): localStorage 'lowispike.shopplan.v1' = {v:2, freq, every, days, was, store, updated, skipped}
     freq    : (Oct 25) '1' | '2' | '3' | 'more' | 'varies' times per week, or null when not set
     every   : days between shops, DERIVED from freq/days for the glow timing (see normalize), or null
     was     : an old typed rhythm of 8..60 days kept under 'varies' (v1 migration), else null
     days    : optional usual weekdays, 0 = Sunday .. 6 = Saturday
     store   : optional shop name the user typed (free text, max 60). No location is stored.
     skipped : the user chose "Later" in onboarding (we never ask again by ourselves)
   dueState() only reads the last check-in time it is given; it does not record check-ins and it is never proof of how
   someone eats. Grace days give real life room (a busy week, a scanner that failed). */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiShopPlanCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const KEY = 'lowispike.shopplan.v1';
    const MIN = 1, MAX = 60;
    const DAY = 864e5;
    const LANGS = ['en', 'de', 'es'];
    const L = l => { l = String(l || 'en').slice(0, 2).toLowerCase(); return LANGS.indexOf(l) >= 0 ? l : 'en'; };

    /* "7", " 3 ", "every 4 days", "alle 5 Tage", "cada 10 días" -> whole number; anything else -> null (never a guess) */
    function parseEvery(text) {
        if (typeof text === 'number') text = String(text);
        const m = String(text == null ? '' : text).match(/\d+(?:[.,]\d+)?/);
        if (!m) return null;
        const n = Math.round(parseFloat(m[0].replace(',', '.')));
        return n >= MIN && n <= MAX ? n : null;
    }
    function cleanStore(s) { return String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60); }
    function cleanDays(d) {
        if (!Array.isArray(d)) return [];
        const out = [];
        d.forEach(x => { const n = +x; if (Number.isInteger(n) && n >= 0 && n <= 6 && out.indexOf(n) < 0) out.push(n); });
        return out.sort((a, b) => a - b);
    }
    /* Oct 25 2026 (Eman): "every x days" + weekdays was confusing. The person now picks a bubble: once / twice / three times /
       more per week, or "it varies". Weekdays stay optional and ARE the frequency when picked (Tue + Sat = twice a week).
       `every` (days) is still filled for the glow timing (grocery-hunt.js, dueState) and is always derived, never typed:
         1 -> 7, 2 -> 4, 3 -> 3, more -> 2 (rounded up, so never stricter), picked days -> the longest gap between them,
         varies -> none, unless an old save had a long typed rhythm (8..60 days), which is kept as `was` so nothing is lost.
       Old saves (v1, a typed number) migrate on read to the nearest bubble that is never stricter than what was typed. */
    const FREQS = ['1', '2', '3', 'more', 'varies'];
    const FREQ_DAYS = { '1': 7, '2': 4, '3': 3, more: 2 };
    function cleanFreq(f) { f = f == null ? '' : String(f).trim().toLowerCase(); return FREQS.indexOf(f) >= 0 ? f : null; }
    function freqFromDays(d) { const n = cleanDays(d).length; return !n ? null : n >= 4 ? 'more' : String(n); }
    function freqFromEvery(e) { e = parseEvery(e); if (!e) return null; return e <= 2 ? 'more' : e <= 4 ? '2' : e <= 7 ? '1' : 'varies'; }
    /* the longest wait between the picked weekdays, going round the week (Tue + Sat -> 4) */
    function gapOf(days) {
        if (!days.length) return null;
        let g = 0;
        days.forEach((d, i) => { const nx = i + 1 < days.length ? days[i + 1] : days[0] + 7; g = Math.max(g, nx - d); });
        return g;
    }
    function normalize(o) {
        o = o && typeof o === 'object' ? o : {};
        const days = cleanDays(o.days);
        let freq = cleanFreq(o.freq), was = parseEvery(o.was);
        if (!freq) {   /* an old save: what they typed decides the bubble */
            const typed = o.every == null || o.every === '' ? null : parseEvery(o.every);
            freq = freqFromEvery(typed);
            if (freq === 'varies') was = typed;
        }
        if (days.length) freq = freqFromDays(days);   /* picked days are the frequency */
        if (freq !== 'varies') was = null;
        const every = days.length ? gapOf(days) : freq === 'varies' ? (was || null) : freq ? FREQ_DAYS[freq] : null;
        return { v: 2, freq, every, days, was, store: cleanStore(o.store), updated: +o.updated || 0, skipped: !!o.skipped && !freq };
    }
    const isSet = p => !!(p && normalize(p).freq);

    /* a little room before support starts fading: about a third of the rhythm, at least 1 day, at most 5 */
    function graceDays(p) { const e = p && normalize(p).every; return e ? Math.max(1, Math.min(5, Math.round(e / 3))) : 0; }

    /* unset: no rhythm typed | fresh: inside the rhythm | due: rhythm reached today | grace: a few kind extra days |
       lapsed: past rhythm + grace (support fades gently; nothing earned is ever taken away) */
    function dueState(p, lastMs, nowMs) {
        const every = p && normalize(p).every;
        if (!every) return { state: 'unset', every: null, daysSince: null, grace: 0 };
        const now = +nowMs || Date.now(), last = +lastMs || 0;
        const grace = graceDays(p);
        if (!last) return { state: 'due', every, daysSince: null, grace };
        const daysSince = Math.max(0, Math.floor((now - last) / DAY));
        const state = daysSince < every ? 'fresh' : daysSince === every ? 'due' : daysSince <= every + grace ? 'grace' : 'lapsed';
        return { state, every, daysSince, grace };
    }

    const DAYN = {
        en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
        es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    };
    const TX = {
        en: { none: 'Not set yet', one: 'Every day', n: 'Every {n} days', on: 'usually {d}', at: 'at {s}', about: 'about {x}',
            f: { '1': 'Once a week', '2': 'Twice a week', '3': 'Three times a week', more: 'More than three times a week', varies: 'It varies' } },
        de: { none: 'Noch nicht eingetragen', one: 'Jeden Tag', n: 'Alle {n} Tage', on: 'meist {d}', at: 'bei {s}', about: 'etwa {x}',
            f: { '1': 'Einmal pro Woche', '2': 'Zweimal pro Woche', '3': 'Dreimal pro Woche', more: '\u00d6fter als dreimal pro Woche', varies: 'Unterschiedlich' } },
        es: { none: 'Aún sin definir', one: 'Cada día', n: 'Cada {n} días', on: 'normalmente {d}', at: 'en {s}', about: 'aproximadamente {x}',
            f: { '1': 'Una vez por semana', '2': 'Dos veces por semana', '3': 'Tres veces por semana', more: 'M\u00e1s de tres veces por semana', varies: 'Var\u00eda' } }
    };
    /* Oct 21 (TikTok advice: "one month" is easier on the mind than "30 days"): the friendly name for a rhythm, or '' */
    const PLAIN = {
        en: { 2: 'Every other day', 7: 'Once a week', 14: 'Every two weeks', 21: 'Every three weeks', 28: 'About once a month', 30: 'Once a month', 31: 'About once a month', 60: 'Every two months' },
        de: { 2: 'Jeden zweiten Tag', 7: 'Einmal pro Woche', 14: 'Alle zwei Wochen', 21: 'Alle drei Wochen', 28: 'Etwa einmal im Monat', 30: 'Einmal im Monat', 31: 'Etwa einmal im Monat', 60: 'Alle zwei Monate' },
        es: { 2: 'Un d\u00eda s\u00ed y otro no', 7: 'Una vez por semana', 14: 'Cada dos semanas', 21: 'Cada tres semanas', 28: 'M\u00e1s o menos una vez al mes', 30: 'Una vez al mes', 31: 'M\u00e1s o menos una vez al mes', 60: 'Cada dos meses' }
    };
    function plainEvery(n, lang) { const e = parseEvery(n); if (!e) return ''; return e === 1 ? TX[L(lang)].one : (PLAIN[L(lang)][e] || ''); }
    const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => (o && o[k] != null ? o[k] : ''));
    function dayNames(lang) { return DAYN[L(lang)].slice(); }
    /* "Twice a week · usually Tue, Sat · at Edeka"; an old long rhythm kept under "It varies" reads "It varies · about every two weeks" */
    function summary(p, lang) {
        const t = TX[L(lang)];
        p = normalize(p);
        if (!p.freq) return t.none;
        const parts = [t.f[p.freq]];
        if (p.freq === 'varies' && p.was) { const w = plainEvery(p.was, lang) || fmt(t.n, { n: p.was }); parts.push(fmt(t.about, { x: w.charAt(0).toLowerCase() + w.slice(1) })); }
        if (p.days.length) parts.push(fmt(t.on, { d: p.days.map(i => DAYN[L(lang)][i]).join(', ') }));
        if (p.store) parts.push(fmt(t.at, { s: p.store }));
        return parts.join(' \u00b7 ');
    }
    function freqLabel(f, lang) { f = cleanFreq(f); return f ? TX[L(lang)].f[f] : ''; }

    return { KEY, MIN, MAX, LANGS, FREQS, FREQ_DAYS, freqFromDays, freqFromEvery, freqLabel, parseEvery, normalize, isSet, graceDays, dueState, summary, plainEvery, dayNames, cleanStore };
});
