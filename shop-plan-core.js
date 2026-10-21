/* LOWiSPIKE shopping rhythm, pure rules (Oct 17, 2026).
   E-man: healthy habits start in the grocery shop, and people "should type it in themselves. We can have that in the onboarding
   somewhere." So the shopping rhythm is only ever what the person typed: there is NO default interval and no guess.

   ONE source of truth for the whole app (onboarding, Profile, grocery check-ins, world bonuses). Never build a second one.
   Storage (shop-plan.js writes it): localStorage 'lowispike.shopplan.v1' = {v:1, every, days, store, updated, skipped}
     every   : whole days between shops the user typed, 1..60, or null when not set
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
    function normalize(o) {
        o = o && typeof o === 'object' ? o : {};
        const every = o.every == null || o.every === '' ? null : parseEvery(o.every);
        return { v: 1, every, days: cleanDays(o.days), store: cleanStore(o.store), updated: +o.updated || 0, skipped: !!o.skipped && every == null };
    }
    const isSet = p => !!(p && parseEvery(p.every));

    /* a little room before support starts fading: about a third of the rhythm, at least 1 day, at most 5 */
    function graceDays(p) { const e = p && parseEvery(p.every); return e ? Math.max(1, Math.min(5, Math.round(e / 3))) : 0; }

    /* unset: no rhythm typed | fresh: inside the rhythm | due: rhythm reached today | grace: a few kind extra days |
       lapsed: past rhythm + grace (support fades gently; nothing earned is ever taken away) */
    function dueState(p, lastMs, nowMs) {
        const every = p && parseEvery(p.every);
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
        en: { none: 'Not set yet', one: 'Every day', n: 'Every {n} days', on: 'usually {d}', at: 'at {s}' },
        de: { none: 'Noch nicht eingetragen', one: 'Jeden Tag', n: 'Alle {n} Tage', on: 'meist {d}', at: 'bei {s}' },
        es: { none: 'Aún sin definir', one: 'Cada día', n: 'Cada {n} días', on: 'normalmente {d}', at: 'en {s}' }
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
    /* "Once a week · usually Sat · at Edeka" ("Every 10 days" when there's no friendlier name) */
    function summary(p, lang) {
        const t = TX[L(lang)];
        p = normalize(p);
        if (!p.every) return t.none;
        const parts = [plainEvery(p.every, lang) || fmt(t.n, { n: p.every })];
        if (p.days.length) parts.push(fmt(t.on, { d: p.days.map(i => DAYN[L(lang)][i]).join(', ') }));
        if (p.store) parts.push(fmt(t.at, { s: p.store }));
        return parts.join(' \u00b7 ');
    }

    return { KEY, MIN, MAX, LANGS, parseEvery, normalize, isSet, graceDays, dueState, summary, plainEvery, dayNames, cleanStore };
});
