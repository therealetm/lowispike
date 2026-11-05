/* misty-sheet-core.js (Nov 5 2026, Misty sheet plan: "world stats, companion stats and human stats", owner: "very convenient and
   efficient and not overwhelming, really just a nice experience to open and to check your stats").
   Pure numbers for the Today and History tabs of Misty's long-press sheet (misty-hub.js). Reads only what the phone already keeps:
   S.logs (meals, with log.photo thumbnails), the XP ledger, lowi_fast_v1 (water), lowispike.move.v1 (Move), the step range picked on
   the Move bubble (an XP ledger entry, move-estimate-core.js) and S.health.body.weights. Nothing is sent anywhere, nothing is written.
   Honest on purpose: food numbers are estimates, steps are the user's own range, an empty day is "no entries", never 0.
   API: LowiMistySheetCore = { day(o, dayKey), period(o, kind, back), periods, dayKey, shift } ; o = { now, S, fast, move, deps } where deps
   = { recap, nutri, move, weight, levelOf } (the cores; in the browser they come from window). */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api; else root.LowiMistySheetCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const DAY = 864e5;
    const num = v => (Number.isFinite(+v) ? +v : 0);
    const arr = v => (Array.isArray(v) ? v : []);
    const pad = n => String(n).padStart(2, '0');
    function dayKey(t) { const d = new Date(num(t) || Date.now()); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function at(day) { const p = String(day).split('-').map(Number); return new Date(p[0], (p[1] || 1) - 1, p[2] || 1, 12, 0, 0, 0).getTime(); }
    function shift(day, n) { const d = new Date(at(day)); d.setDate(d.getDate() + n); return dayKey(d.getTime()); }
    const STEP_ORDER = ['casual', 'steady', 'epic'];

    function stepRange(o, day) {
        try { const M = o.deps && o.deps.move; const e = M && M.rangeEntry ? M.rangeEntry(arr(o.S && o.S.ledger), day) : null; const id = e && e.lvl; return STEP_ORDER.indexOf(id) >= 0 ? id : null; } catch (e) { return null; }
    }
    function weights(o) {
        try { const Wc = o.deps && o.deps.weight; if (Wc && Wc.entries && o.S && o.S.health) return Wc.entries(o.S, num(o.now) || Date.now()); } catch (e) { }
        const b = o.S && o.S.health && o.S.health.body; return arr(b && b.weights).filter(w => w && num(w.ts) > 0 && num(w.kg) > 0).map(w => ({ ts: +w.ts, day: dayKey(+w.ts), kg: +w.kg }));
    }

    /* one day: what you did, what it gave Misty. Today when day is omitted. */
    /* pre (from period): this day's logs (+ the day before, for the longest gap), its ledger, the XP total at its end, the weigh-ins */
    function day(o, dk, pre) {
        o = o || {};
        const now = num(o.now) || Date.now(), today = dayKey(now); dk = dk || today;
        const S = o.S || {}, R = o.deps && o.deps.recap, N = o.deps && o.deps.nutri;
        const isToday = dk === today, t = isToday ? now : at(dk) + 11.99 * 36e5;   /* a past day is read at 23:59 */
        let sum = null;
        const dayLogs = pre ? pre.logs : S.logs, dayLedger = pre ? pre.ledger : S.ledger;
        let xpAt = num(S.xp);
        if (pre) xpAt = pre.xpAt; else if (!isToday) arr(S.ledger).forEach(e => { const d = e && (e.day || (num(e.ts) ? dayKey(num(e.ts)) : '')); if (d && d > dk) xpAt -= num(e.amt); });
        try { if (R && R.summarize) sum = R.summarize({ now: t, logs: dayLogs, ledger: dayLedger, xp: Math.max(0, xpAt), fast: o.fast, move: o.move, levelOf: o.deps.levelOf }); } catch (e) { sum = null; }
        sum = sum || { meals: [], counts: { low: 0, medium: 0, high: 0, unknown: 0 }, water: 0, moveMin: 0, xp: 0, xpBy: { meal: 0, water: 0, move: 0, gap: 0, other: 0 }, levelFrom: 0, levelTo: 0 };
        /* the meals with their id and thumbnail (summarize keeps name, time and verdict only) */
        /* the thumbnail: from the photo store on this phone (meal-journal.js thumb, phase 4), or an older log's own photo */
        const ok = x => typeof x === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(x) ? x : '';
        const pic = l => { let x = ''; try { const th = o.deps && o.deps.thumb; if (typeof th === 'function') x = ok(th(l)); } catch (e) { x = ''; } return x || ok(l.photo); };
        const onDay = l => (l.day ? l.day === dk : dayKey(num(l.ts)) === dk);
        const raw = arr(dayLogs).filter(l => l && (num(l.ts) > 0 || l.day) && onDay(l)).sort((a, b) => num(a.ts) - num(b.ts));
        const meals = raw.map((l, i) => ({ id: l.id != null ? String(l.id) : '', t: String(l.t || (sum.meals[i] && sum.meals[i].t) || ''), ts: num(l.ts),
            v: (sum.meals[i] && sum.meals[i].v) || 'unknown', photo: pic(l) }));
        let tot = null; try { if (N && N.totals) tot = N.totals(dayLogs, dk); } catch (e) { tot = null; }
        const g = k => Math.round(num(tot && tot.sum && tot.sum[k]));
        const w = (pre ? pre.weights : weights(o)).filter(x => x.day === dk).pop() || null;
        const steps = stepRange(pre ? Object.assign({}, o, { S: { ledger: dayLedger } }) : o, dk);
        const out = {
            day: dk, today: isToday, meals, counts: sum.counts || { low: 0, medium: 0, high: 0, unknown: 0 },
            kcal: g('kcal'), protein: g('protein'), fiber: g('fiber'), sugar: g('sugar'), rated: tot ? Math.max(0, num(tot.meals) - num(tot.unknown)) : 0,
            water: num(sum.water), moveMin: num(sum.moveMin), steps, weight: w ? Math.round(w.kg * 10) / 10 : null,
            xp: Math.max(0, Math.round(num(sum.xp))), xpBy: sum.xpBy || {}, levelFrom: num(sum.levelFrom), levelTo: num(sum.levelTo)
        };
        out.empty = !meals.length && !out.water && !out.moveMin && !steps && out.weight === null && !out.xp;
        return out;
    }

    /* History: Yesterday, Week (7 days), Month (30), Year (365), each ending on the newest day of its window; back = how many
       windows to step back (‹). Averages count only days that have an entry, so a quiet day never pulls them to zero. */
    const periods = { yesterday: 1, week: 7, month: 30, year: 365 };
    function window_(kind, back, now) {
        const n = periods[kind] || 7, today = dayKey(now);
        const end = kind === 'yesterday' ? shift(today, -1 - num(back)) : shift(today, -n * num(back));
        return { n, end, start: shift(end, -(n - 1)) };
    }
    function period(o, kind, back) {
        o = o || {};
        const now = num(o.now) || Date.now(), w = window_(kind, Math.max(0, Math.floor(num(back))), now);
        /* bucket once (a year of meals must open in well under a second): logs and ledger by day, XP total at the end of each day */
        const S = o.S || {}, logsBy = {}, ledBy = {}, after = {};
        const kOf = x => (x && (x.day || (num(x.ts) ? dayKey(num(x.ts)) : ''))) || '';
        arr(S.logs).forEach(l => { const k = kOf(l); if (k) (logsBy[k] = logsBy[k] || []).push(l); });
        arr(S.ledger).forEach(e => { const k = kOf(e); if (k) (ledBy[k] = ledBy[k] || []).push(e); });
        let later = 0; Object.keys(ledBy).filter(k => k > w.end).forEach(k => ledBy[k].forEach(e => { later += num(e.amt); }));
        const wts = weights(o), days = [];
        let xpAt = num(S.xp) - later;
        for (let i = w.n - 1; i >= 0; i--) { const k = shift(w.start, i); after[k] = xpAt; (ledBy[k] || []).forEach(e => { xpAt -= num(e.amt); }); }
        for (let i = 0; i < w.n; i++) {
            const k = shift(w.start, i), prev = shift(k, -1);
            days.push(day(o, k, { logs: (logsBy[prev] || []).concat(logsBy[k] || []), ledger: ledBy[k] || [], xpAt: Math.max(0, after[k]), weights: wts }));
        }
        const logged = days.filter(d => d.meals.length), active = days.filter(d => !d.empty);
        const avg = (list, k) => (list.length ? Math.round(list.reduce((a, d) => a + num(d[k]), 0) / list.length) : 0);
        const counts = { low: 0, medium: 0, high: 0, unknown: 0 }; logged.forEach(d => Object.keys(counts).forEach(k => { counts[k] += num(d.counts[k]); }));
        const waterDays = days.filter(d => d.water > 0), stepsBy = { casual: 0, steady: 0, epic: 0 }; days.forEach(d => { if (d.steps) stepsBy[d.steps]++; });
        const wAll = wts.filter(x => x.day >= w.start && x.day <= w.end);
        const xp = days.reduce((a, d) => a + d.xp, 0);
        let levels = 0;
        days.forEach(d => { if (d.levelTo > d.levelFrom) levels += d.levelTo - d.levelFrom; });
        return {
            kind, start: w.start, end: w.end, n: w.n, days, activeDays: active.length,
            meals: logged.reduce((a, d) => a + d.meals.length, 0), mealDays: logged.length, counts,
            kcal: avg(logged, 'kcal'), protein: avg(logged, 'protein'), fiber: avg(logged, 'fiber'), sugar: avg(logged, 'sugar'),
            water: waterDays.length ? Math.round(waterDays.reduce((a, d) => a + d.water, 0) / waterDays.length * 10) / 10 : 0, waterDays: waterDays.length,
            moveDays: days.filter(d => d.moveMin > 0 || d.steps).length, moveMin: days.reduce((a, d) => a + d.moveMin, 0), stepsBy,
            weights: wAll, weightFrom: wAll.length ? wAll[0].kg : null, weightTo: wAll.length ? wAll[wAll.length - 1].kg : null,
            xp, levels, empty: !active.length && !wAll.length
        };
    }
    return { DAY, periods, dayKey, shift, at, day, period, stepRange, STEP_ORDER };
});
