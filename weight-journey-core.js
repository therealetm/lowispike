/* weight-journey-core.js: the Weight journey tracker (Oct 22 2026, Emmanuel, with a smart-scale "Metric Detail" screenshot: "We need this
   in our app. They should be able to set starting time and see a graphic."). Pure functions, no DOM; weight-journey.js draws it.
   Data (health stays on this device and out of cloud backup, like body-stats-core.js; nothing is sent anywhere):
     S.health.body.weights  [{ts, kg, source}] the SAME array the Weight & BMI sheet uses; entries from here have source 'journey'
                            and keep kg to 0.01 so a pound value survives the round trip (200.1 lb -> 90.76 kg -> 200.1 lb)
     S.health.body.journey  {start:'YYYY-MM-DD', startKg, goalKg, unit:'kg'|'lb'}  start = day 1 of the journey or challenge
     S.health.weight        follows the newest entry, as body-stats-core.weighIn does
   One entry per calendar day (the last one that day wins), like the Weight & BMI sheet. */
(function (root) {
    'use strict';
    const DAY = 864e5, LB = 0.45359237, KG = [25, 350];
    const num = x => { if (x === '' || x === null || x === undefined) return null; const n = +String(x).trim().replace(',', '.'); return Number.isFinite(n) ? n : null; };
    const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
    const pad = n => String(n).padStart(2, '0');
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    const isDay = k => /^\d{4}-\d{2}-\d{2}$/.test(k || '') && dayKey(dayStart(k)) === k;
    function dayStart(k) { if (typeof k === 'number') { const d = new Date(k); d.setHours(0, 0, 0, 0); return d.getTime(); } const [y, m, d] = String(k).split('-').map(Number); return new Date(y, m - 1, d).getTime(); }
    const unitOk = u => u === 'lb' ? 'lb' : 'kg';
    /* unit conversion: kg is what is stored */
    const toUnit = (kg, unit) => kg === null || kg === undefined ? null : unitOk(unit) === 'lb' ? kg / LB : kg;
    const toKg = (v, unit) => { const n = num(v); if (n === null) return null; const kg = unitOk(unit) === 'lb' ? n * LB : n; return kg >= KG[0] && kg <= KG[1] ? r2(kg) : null; };
    const show = (kg, unit) => kg === null || kg === undefined ? null : r1(toUnit(kg, unit));

    function body(s) {
        if (!s.health || typeof s.health !== 'object') s.health = {};
        if (!s.health.body || typeof s.health.body !== 'object') s.health.body = {};
        if (!Array.isArray(s.health.body.weights)) s.health.body.weights = [];
        return s.health.body;
    }
    function journey(s) {
        const j = (s && s.health && s.health.body && s.health.body.journey) || {};
        return { start: isDay(j.start) ? j.start : null, startKg: num(j.startKg), goalKg: num(j.goalKg), unit: unitOk(j.unit) };
    }
    /* start date, start weight and goal; each one is optional, a value of '' clears it. Values are in `unit`. */
    function setJourney(s, input, now) {
        now = now || Date.now();
        const b = body(s), j = Object.assign({}, b.journey || {}), unit = unitOk(input && input.unit !== undefined ? input.unit : j.unit);
        if (input && 'start' in input) {
            if (input.start === '' || input.start === null) delete j.start;
            else { if (!isDay(input.start)) throw Error('date'); if (dayStart(input.start) > dayStart(now)) throw Error('future'); j.start = input.start; }
        }
        ['startKg', 'goalKg'].forEach(k => {
            const v = input && (k === 'startKg' ? input.startValue : input.goalValue);
            if (v === undefined) return;
            if (v === '' || v === null) { delete j[k]; return; }
            const kg = toKg(v, unit); if (kg === null) throw Error(k === 'startKg' ? 'weight' : 'goal');
            j[k] = kg;
        });
        j.unit = unit;
        b.journey = j;
        return journey(s);
    }
    function setUnit(s, unit) { const b = body(s); b.journey = Object.assign({}, b.journey || {}, { unit: unitOk(unit) }); return b.journey.unit; }

    /* every weigh-in, one per day, oldest first (journey entries keep 0.01 kg, older ones are read as they were saved) */
    function entries(s, now) {
        now = now || Date.now();
        const by = new Map();
        body(s).weights.filter(w => w && Number.isFinite(+w.ts) && +w.ts > 0 && +w.ts <= now + 6e4 && toKg(w.kg, 'kg') !== null)
            .slice().sort((a, c) => a.ts - c.ts).forEach(w => by.set(dayKey(+w.ts), { ts: +w.ts, day: dayKey(+w.ts), kg: toKg(w.kg, 'kg'), source: w.source || '' }));
        return [...by.values()];
    }
    function follow(s, now) {
        const e = entries(s, now), b = body(s), last = e.length ? e[e.length - 1].kg : null;
        s.health.weight = last === null ? '' : String(r1(last));
        b.lastWeight = last === null ? null : r1(last);
    }
    /* add (or replace) the weigh-in of one day; past days are fine (backfill), future days are not. Today keeps the clock time. */
    function add(s, input, now) {
        now = now || Date.now();
        const day = input && input.date ? input.date : dayKey(now);
        if (!isDay(day)) throw Error('date');
        if (dayStart(day) > dayStart(now)) throw Error('future');
        const kg = toKg(input && input.value, input && input.unit);
        if (kg === null) throw Error('weight');
        const b = body(s), ts = day === dayKey(now) ? now : dayStart(day) + 12 * 3600e3;
        b.weights = b.weights.filter(w => !(w && Number.isFinite(+w.ts) && dayKey(+w.ts) === day));
        b.weights.push({ ts, kg, source: 'journey' });
        b.weights.sort((a, c) => (+a.ts || 0) - (+c.ts || 0));
        if (b.weights.length > 1500) b.weights = b.weights.slice(-1500);
        follow(s, now);
        return { ts, day, kg };
    }
    function remove(s, ts, now) {
        const b = body(s), day = dayKey(+ts), before = b.weights.length;
        b.weights = b.weights.filter(w => !(w && Number.isFinite(+w.ts) && dayKey(+w.ts) === day));
        follow(s, now);
        return before !== b.weights.length;
    }
    /* edit = the old day goes, the new day/value comes (moving an entry onto a day that has one replaces that one) */
    function edit(s, ts, input, now) {
        const day = input && input.date ? input.date : dayKey(+ts);
        if (!isDay(day)) throw Error('date');
        if (toKg(input && input.value, input && input.unit) === null) throw Error('weight');
        if (dayStart(day) > dayStart(now || Date.now())) throw Error('future');
        remove(s, ts, now);
        return add(s, Object.assign({}, input, { date: day }), now);
    }

    /* the visible window: W = Mon-Sun week, M = calendar month, 3M = three months ending this one, Y = calendar year,
       all = first to last weigh-in, start = start date to today. offset moves W/M/3M/Y back (-1) or forward (+1). */
    const PERIODS = ['W', 'M', '3M', 'Y', 'all', 'start'];
    function range(period, offset, ctx, now) {
        now = now || Date.now(); offset = Math.min(0, Math.round(offset || 0));
        const t = new Date(now); t.setHours(0, 0, 0, 0);
        const e = (ctx && ctx.entries) || [], j = (ctx && ctx.journey) || {};
        if (period === 'W') { const d = new Date(t); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7 * offset); const end = new Date(d); end.setDate(end.getDate() + 7); return { from: d.getTime(), to: end.getTime() - 1, nav: true }; }
        if (period === 'M' || period === '3M') { const n = period === 'M' ? 1 : 3; const end = new Date(t.getFullYear(), t.getMonth() + 1 + n * offset, 1); const from = new Date(end.getFullYear(), end.getMonth() - n, 1); return { from: from.getTime(), to: end.getTime() - 1, nav: true }; }
        if (period === 'Y') { const y = t.getFullYear() + offset; return { from: new Date(y, 0, 1).getTime(), to: new Date(y + 1, 0, 1).getTime() - 1, nav: true }; }
        if (period === 'start' && j.start) return { from: dayStart(j.start), to: Math.max(t.getTime() + DAY - 1, dayStart(j.start) + DAY - 1), nav: false };
        const from = e.length ? dayStart(e[0].ts) : t.getTime();
        const first = j.start ? Math.min(from, dayStart(j.start)) : from;
        return { from: first, to: Math.max(t.getTime() + DAY - 1, e.length ? e[e.length - 1].ts : 0), nav: false };
    }
    const within = (e, r) => e.filter(x => x.ts >= r.from && x.ts <= r.to);
    /* how much the weight moves per week, from a least-squares line (one quick dip doesn't swing it); null under 2 points or 3 days */
    function weeklyRate(list) {
        if (!list || list.length < 2) return null;
        const t0 = list[0].ts, xs = list.map(x => (x.ts - t0) / (7 * DAY)), ys = list.map(x => x.kg);
        if (xs[xs.length - 1] < 3 / 7) return null;
        const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
        let sxy = 0, sxx = 0; for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); }
        return sxx ? r2(sxy / sxx) : null;
    }
    /* the numbers for the cards, all in kg. start: the start weight, or the first weigh-in on/after the start date, or the first one. */
    function stats(s, opts, now) {
        now = now || Date.now();
        const all = entries(s, now), j = journey(s), period = PERIODS.includes(opts && opts.period) ? opts.period : (j.start ? 'start' : 'M');
        const r = range(period, opts && opts.offset, { entries: all, journey: j }, now), list = within(all, r);
        const latest = all.length ? all[all.length - 1] : null;
        const fromStart = j.start ? all.filter(x => x.ts >= dayStart(j.start)) : all;
        const startKg = j.startKg !== null ? j.startKg : fromStart.length ? fromStart[0].kg : null;
        const startDay = j.start || (all.length ? all[0].day : null);
        const hi = list.length ? list.reduce((a, b) => b.kg > a.kg ? b : a) : null, lo = list.length ? list.reduce((a, b) => b.kg < a.kg ? b : a) : null;
        const wk = weeklyRate(list.length >= 2 ? list : fromStart);
        const trend = wk === null ? null : wk <= -0.1 ? 'down' : wk >= 0.1 ? 'up' : 'steady';
        const sinceStart = latest && startKg !== null ? r2(latest.kg - startKg) : null;
        const toGoal = latest && j.goalKg !== null ? r2(latest.kg - j.goalKg) : null;
        const goalDir = j.goalKg !== null && startKg !== null ? (j.goalKg < startKg ? 'down' : j.goalKg > startKg ? 'up' : 'hold') : null;
        const reached = toGoal !== null && goalDir ? (goalDir === 'down' ? toGoal <= 0 : goalDir === 'up' ? toGoal >= 0 : Math.abs(toGoal) < 0.5) : false;
        const goalPct = toGoal !== null && startKg !== null && j.goalKg !== startKg ? Math.max(0, Math.min(1, (startKg - latest.kg) / (startKg - j.goalKg))) : null;
        const day = j.start ? Math.floor((dayStart(now) - dayStart(j.start)) / DAY) + 1 : null;
        return { period, range: r, list, all, latest, journey: j, startKg, startDay, sinceStart, highest: hi, lowest: lo, weekly: wk, monthly: wk === null ? null : r2(wk * 30.44 / 7), trend, toGoal, goalDir, reached, goalPct, day };
    }

    /* chart geometry: a smooth monotone curve (Fritsch-Carlson, never overshoots a weigh-in) through the points */
    function smoothPath(pts) {
        if (!pts.length) return '';
        if (pts.length === 1) return 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
        const n = pts.length, dx = [], m = [], tg = [];
        for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0] || 1e-6; m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i]; }
        tg[0] = m[0]; tg[n - 1] = m[n - 2];
        for (let i = 1; i < n - 1; i++) tg[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
        for (let i = 0; i < n - 1; i++) { if (m[i] === 0) { tg[i] = tg[i + 1] = 0; continue; } const a = tg[i] / m[i], b = tg[i + 1] / m[i], h = a * a + b * b; if (h > 9) { const k = 3 / Math.sqrt(h); tg[i] = k * a * m[i]; tg[i + 1] = k * b * m[i]; } }
        let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
        for (let i = 0; i < n - 1; i++) { const h = dx[i] / 3; d += ' C' + (pts[i][0] + h).toFixed(1) + ' ' + (pts[i][1] + tg[i] * h).toFixed(1) + ' ' + (pts[i + 1][0] - h).toFixed(1) + ' ' + (pts[i + 1][1] - tg[i + 1] * h).toFixed(1) + ' ' + pts[i + 1][0].toFixed(1) + ' ' + pts[i + 1][1].toFixed(1); }
        return d;
    }
    /* round axis ticks in the display unit: 3-5 lines with a step of 0.5/1/2/5/10/20 */
    function ticks(lo, hi) {
        const span = Math.max(hi - lo, 1), raw = span / 4, steps = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50];
        const step = steps.find(x => x >= raw) || 100, a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, out = [];
        for (let v = a; v <= b + 1e-9; v += step) out.push(r1(v));
        return { lo: a, hi: b, step, list: out };
    }

    const api = { DAY, LB, KG, PERIODS, num, dayKey, dayStart, isDay, toUnit, toKg, show, journey, setJourney, setUnit, entries, add, edit, remove, range, within, weeklyRate, stats, smoothPath, ticks };
    if (typeof module === 'object' && module.exports) module.exports = api; else root.LowiWeightJourneyCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
