/* you-stats-core.js: Oct 27, Emmanuel: "I want to be better than the app called Yazio. Yes, we have the stats of our companion.
   But what about highlighting other human stats? There should be an easy place to see it, to view it. Maybe next to the
   companion stats. But also, obviously, as you're tracking your food, to motivate you. And obviously, they're linked together."

   Pure numbers for the "You" side of the stats sheet (you-stats.js draws it). Nothing new is tracked: every number comes from
   what the app already keeps (nutri-stats-core rows for food, day-recap-core summary for meals / water / move, sun-meter's
   energy() for the companion). link() splits the companion's energy into the parts YOUR day fills, with the same weights
   sun-meter uses (food 40 %, water 30 %, move 30 % of everything above her 15 % base), so the sheet can say exactly how much
   each of your numbers gives her. Nothing medical is claimed: food is "likely blood sugar spike" wording only. */
(function (root, factory) {
    const m = factory();
    if (typeof module === 'object' && module.exports) module.exports = m;
    else root.LowiYouStatsCore = m;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const DAY = 864e5;
    const MEAL_GOAL = 3, WATER_GOAL = 6;
    const num = v => (Number.isFinite(+v) ? +v : 0);
    const pad = n => (n < 10 ? '0' : '') + n;
    const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    /* a meal's own day decides (same rule as sun-meter: a meal can be logged for another day) */
    const dayOf = l => (l && l.day ? String(l.day) : (num(l && (l.ts || l.at)) ? dayKey(num(l.ts || l.at)) : ''));
    /* same reading as sun-meter verdict(): 1 calm, 0.55 middle, 0.15 likely spike, 0.6 not known */
    function verdict(l) {
        const r = String(l && l.r != null ? l.r : '').toLowerCase(), v = String(l && l.lvl || '').toLowerCase();
        if (r === 'ja' || v === 'low' || r === 'low' || r === 'yes') return 1;
        if (r === 'nein' || v === 'high' || r === 'high' || r === 'no') return 0.15;
        if (r === 'jein' || v === 'mid' || v === 'medium' || r === 'mid' || r === 'maybe') return 0.55;
        return 0.6;
    }

    /* days in a row with at least one meal logged; today counts once it has a meal, and an empty today doesn't break it yet */
    function streak(logs, now) {
        now = now || Date.now();
        const days = new Set();
        for (const l of logs || []) { const k = dayOf(l); if (k) days.add(k); }
        let n = 0, t = now;
        if (!days.has(dayKey(t))) t -= DAY;
        for (let i = 0; i < 400 && days.has(dayKey(t)); i++) { n++; t -= DAY; }
        return n;
    }

    /* how today's food went for blood sugar: meals with a likely spike vs. calm ones (lvl from the photo / name check) */
    function spikeCounts(logs, now) {
        now = now || Date.now();
        const k = dayKey(now);
        let calm = 0, spiky = 0, meals = 0;
        for (const l of logs || []) {
            if (dayOf(l) !== k) continue;
            meals++;
            const v = verdict(l);
            if (v <= 0.15) spiky++;
            else if (v >= 1) calm++;
        }
        return { meals, calm, spiky };
    }

    /* the companion's energy, split into what your day gives her. en = sun-meter energy() result. */
    function link(en, E) {
        if (!en || !en.parts) return null;
        E = E || { base: 0.15, food: 0.4, water: 0.3, move: 0.3, waterGoal: 4 };
        const spread = 1 - num(E.base), p = en.parts;
        const pct = (k, part) => Math.round(spread * num(E[k]) * Math.max(0, Math.min(1, num(part))) * 100);
        const full = k => Math.round(spread * num(E[k]) * 100);
        return {
            energy: Math.round(num(en.value) * 100),
            base: Math.round(num(E.base) * 100),
            rows: [
                { k: 'food', pct: pct('food', p.food), max: full('food'), meals: num(en.meals), spikes: num(en.spikes), known: num(en.meals) > 0 },
                { k: 'water', pct: pct('water', p.water), max: full('water'), glasses: num(en.water), goal: num(E.waterGoal || 4), known: num(en.water) > 0 },
                { k: 'move', pct: pct('move', p.move), max: full('move'), moves: num(en.moves), known: num(en.moves) > 0 || !!en.rested }
            ]
        };
    }

    /* the "You" numbers. rows = nutri-stats-core rows(), sum = day-recap-core summarize() (either may be missing). */
    function you(o) {
        o = o || {};
        const by = {};
        for (const r of o.rows || []) by[r.k] = r;
        const g = k => (by[k] ? { v: num(by[k].value != null ? by[k].value : by[k].v), goal: num(by[k].target != null ? by[k].target : by[k].goal), state: by[k].state || '' } : null);
        const carbs = g('carbs'), fiber = g('fiber');
        const s = o.sum || {}, sc = spikeCounts(o.logs, o.now);
        return {
            kcal: g('kcal'), protein: g('protein'), carbs, fat: g('fat'), fiber, sugar: g('sugar'),
            net: carbs ? Math.max(0, Math.round(carbs.v - (fiber ? fiber.v : 0))) : null,
            meals: s.meals != null ? num(s.meals) : sc.meals, mealGoal: MEAL_GOAL,
            water: num(s.water), waterGoal: WATER_GOAL,
            moveMin: num(s.moveMin), moves: num(s.moves), steps: num(s.steps),
            calm: sc.calm, spiky: sc.spiky,
            streak: streak(o.logs, o.now)
        };
    }

    /* a moment's numbers, so the screen after saving a meal can show what that meal moved */
    function snap(y, link) {
        return {
            kcal: y && y.kcal ? y.kcal.v : 0, protein: y && y.protein ? y.protein.v : 0, net: y && y.net != null ? y.net : 0,
            energy: link ? link.energy : null
        };
    }
    function moved(before, y, lk) {
        if (!before || !y) return null;
        const a = snap(y, lk);
        const r = k => Math.round(num(a[k]) - num(before[k]));
        return {
            kcal: { from: Math.round(num(before.kcal)), to: Math.round(num(a.kcal)), goal: y.kcal ? Math.round(y.kcal.goal) : 0, d: r('kcal') },
            protein: { from: Math.round(num(before.protein)), to: Math.round(num(a.protein)), goal: y.protein ? Math.round(y.protein.goal) : 0, d: r('protein') },
            net: { from: Math.round(num(before.net)), to: Math.round(num(a.net)), d: r('net') },
            energy: before.energy != null && a.energy != null ? { from: before.energy, to: a.energy, d: a.energy - before.energy } : null
        };
    }

    return { MEAL_GOAL, WATER_GOAL, streak, spikeCounts, link, you, snap, moved, dayKey, verdict };
});
