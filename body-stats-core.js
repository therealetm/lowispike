/* body-stats-core.js: weight, BMI, body-fat estimate and the weigh-in progression (Oct 19 2026, Emmanuel: "Wenn ich mich da wiege
   ... gibt dir einen BMI und er sagt dir, wie viel Fett du hast ... das ist der wichtigste Faktor" and "you'd really see how fat
   you were and now you're thin: this is the shit what I'm talking about").
   Pure functions, no DOM. body-stats.js draws the sheet.
   Data (health stays on this device and out of cloud backup, see AGENTS.md):
     S.health.weight       kg as before (string or number); a weigh-in keeps it current
     S.health.heightCm     cm, asked once (body-core.js bmi() already reads it)
     S.health.body.weights [{ts, kg, source}] (the existing array; 'weigh-in' from here, 'profile-save' from body-core.trackWeight)
     S.user.bday, S.user.gender ('f' | 'm' | 'n' non-binary | 'x') from setup / Profile; only 'f'/'m' narrow the body fat range
   Medical boundary: BMI category is the WHO adult band, body fat is an ESTIMATE from BMI, age and sex (Deurenberg 1991), shown
   as a rounded range, never a measurement. Under 18 there is no adult category and no estimate. */
(function (root) {
    'use strict';
    const DAY = 864e5;
    const num = x => { if (x === '' || x === null || x === undefined) return null; const n = +String(x).trim().replace(',', '.'); return Number.isFinite(n) ? n : null; };
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const r1 = x => Math.round(x * 10) / 10;
    const LIMITS = { kg: [25, 350], cm: [100, 250] };

    function parseKg(v) { const n = num(v); return n !== null && n >= LIMITS.kg[0] && n <= LIMITS.kg[1] ? r1(n) : null; }
    function parseCm(v) { const n = num(v); return n !== null && n >= LIMITS.cm[0] && n <= LIMITS.cm[1] ? Math.round(n) : null; }

    function age(bday, now) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(bday || '')) return null;
        const [y, m, d] = bday.split('-').map(Number), t = new Date(now || Date.now());
        if (m < 1 || m > 12 || d < 1 || d > 31) return null;
        let a = t.getFullYear() - y; if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--;
        return a >= 0 && a < 130 ? a : null;
    }
    function bmi(kg, cm) { kg = num(kg); cm = num(cm); if (!kg || !cm || kg <= 0 || cm < LIMITS.cm[0] || cm > LIMITS.cm[1]) return null; return r1(kg / Math.pow(cm / 100, 2)); }
    /* WHO adult bands */
    function category(b, a) {
        if (b === null || b === undefined) return null;
        if (a !== null && a !== undefined && a < 18) return 'young';
        return b < 18.5 ? 'under' : b < 25 ? 'healthy' : b < 30 ? 'over' : 'obese';
    }
    /* Deurenberg 1991: BF% = 1.2*BMI + 0.23*age - 10.8*sex - 5.4 (sex 1 = male, 0 = female). Typical error is about +-4 points,
       so it is returned as a range. Unknown sex ('x' or empty): the range spans both. */
    function bodyFat(b, a, gender) {
        if (b === null || b === undefined || a === null || a === undefined || a < 18) return null;
        const f = s => 1.2 * b + 0.23 * a - 10.8 * s - 5.4;
        const clamp = x => Math.max(3, Math.min(60, x));
        let mid, lo, hi;
        if (gender === 'm' || gender === 'f') { mid = f(gender === 'm' ? 1 : 0); lo = mid - 4; hi = mid + 4; }
        else { lo = f(1) - 4; hi = f(0) + 4; mid = (f(0) + f(1)) / 2; }
        return { mid: Math.round(clamp(mid)), lo: Math.round(clamp(lo)), hi: Math.round(clamp(hi)), sexKnown: gender === 'm' || gender === 'f', method: 'deurenberg-1991' };
    }
    /* the healthy-BMI weight span for this height (18.5 to 24.9) */
    function healthyRange(cm) { cm = num(cm); if (!cm) return null; const m2 = Math.pow(cm / 100, 2); return { lo: r1(18.5 * m2), hi: r1(24.9 * m2) }; }

    function ensure(s) {
        if (!s.health || typeof s.health !== 'object') s.health = {};
        if (!s.health.body || typeof s.health.body !== 'object') s.health.body = {};
        if (!Array.isArray(s.health.body.weights)) s.health.body.weights = [];
        return s.health.body;
    }
    /* one point per day (the last one that day wins), oldest first, only sane numbers */
    function history(s, now) {
        now = now || Date.now();
        const b = ensure(s), by = new Map();
        b.weights.filter(w => w && Number.isFinite(+w.ts) && +w.ts > 0 && +w.ts <= now + 6e4 && parseKg(w.kg) !== null)
            .slice().sort((a, c) => a.ts - c.ts).forEach(w => by.set(dayKey(w.ts), { ts: +w.ts, kg: parseKg(w.kg), source: w.source || '' }));
        return [...by.values()];
    }
    /* save a weigh-in: today's earlier weigh-in is replaced; S.health.weight follows; body-core's trackWeight does not double it */
    function weighIn(s, input, now) {
        now = now || Date.now();
        const kg = parseKg(input && input.kg);
        if (kg === null) throw Error('weight');
        let cm = null;
        if (input && input.cm !== undefined && input.cm !== '' && input.cm !== null) { cm = parseCm(input.cm); if (cm === null) throw Error('height'); }
        const b = ensure(s), today = dayKey(now);
        b.weights = b.weights.filter(w => !(w && w.source === 'weigh-in' && dayKey(w.ts) === today));
        b.weights.push({ ts: now, kg, source: 'weigh-in' });
        if (b.weights.length > 1500) b.weights = b.weights.slice(-1500);
        s.health.weight = String(kg);
        b.lastWeight = kg;
        if (cm !== null) s.health.heightCm = cm;
        if (input && (input.gender === 'f' || input.gender === 'm' || input.gender === 'n' || input.gender === 'x')) { if (!s.user || typeof s.user !== 'object') s.user = {}; s.user.gender = input.gender; }
        return { ts: now, kg };
    }
    function remove(s, ts) {
        const b = ensure(s), day = dayKey(ts), before = b.weights.length;
        b.weights = b.weights.filter(w => !(w && dayKey(w.ts) === day));
        const h = history(s);
        const last = h.length ? h[h.length - 1].kg : null;
        s.health.weight = last === null ? '' : String(last);
        b.lastWeight = last;
        return before !== b.weights.length;
    }
    /* the level-up track: which way is progress depends on where you started (toward the healthy band); inside it, holding steady is
       the win. Every full kg toward the band is one level; levels never come from a single day's water swing below 0.5 kg. */
    function progress(s, now) {
        const h = history(s, now), cm = num(s.health && s.health.heightCm);
        if (!h.length) return null;
        const first = h[0], last = h[h.length - 1], delta = r1(last.kg - first.kg), hr = healthyRange(cm);
        let goal = 'steady';
        if (hr && first.kg > hr.hi) goal = 'down'; else if (hr && first.kg < hr.lo) goal = 'up';
        const toward = goal === 'down' ? -delta : goal === 'up' ? delta : 0;
        const level = goal === 'steady' ? 1 + Math.min(9, Math.floor(h.length / 4)) : 1 + Math.max(0, Math.floor(toward + 1e-9));
        const drift = goal === 'steady' && hr ? (last.kg > hr.hi ? 'over' : last.kg < hr.lo ? 'under' : 'in') : null;
        const best = goal === 'down' ? Math.min(...h.map(x => x.kg)) : goal === 'up' ? Math.max(...h.map(x => x.kg)) : null;
        const days = Math.max(0, Math.round((last.ts - first.ts) / DAY));
        const firstBmi = bmi(first.kg, cm), lastBmi = bmi(last.kg, cm);
        const toBand = hr ? (last.kg > hr.hi ? r1(last.kg - hr.hi) : last.kg < hr.lo ? r1(hr.lo - last.kg) : 0) : null;
        const nextLevelKg = goal === 'steady' ? null : r1(Math.max(0, (level) - toward));
        return { first, last, delta, goal, toward: r1(toward), level, drift, best, days, count: h.length, firstBmi, lastBmi, toBand, nextLevelKg, healthy: hr };
    }
    /* everything the sheet needs */
    function summary(s, now) {
        now = now || Date.now();
        const h = s.health || {}, u = s.user || {};
        const kg = parseKg(h.weight), cm = parseCm(h.heightCm), a = age(u.bday, now), b = bmi(kg, cm);
        return { kg, cm, age: a, gender: u.gender || '', bmi: b, category: category(b, a), fat: bodyFat(b, a, u.gender), healthy: healthyRange(cm), history: history(s, now), progress: progress(s, now), needsHeight: cm === null, weighedToday: history(s, now).some(w => dayKey(w.ts) === dayKey(now) && w.source === 'weigh-in') };
    }
    /* torso width for the Then / Now figures: BMI 18 -> 0.72, 25 -> 1, 40 -> 1.55 (a drawing, not a body scan) */
    function figureWidth(b) { if (!b) return 1; return Math.max(0.68, Math.min(1.6, 1 + (b - 25) * (b < 25 ? 0.04 : 0.037))); }

    const api = { parseKg, parseCm, age, bmi, category, bodyFat, healthyRange, history, weighIn, remove, progress, summary, figureWidth, dayKey, LIMITS };
    if (typeof module === 'object' && module.exports) module.exports = api; else root.LowiBodyStatsCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
