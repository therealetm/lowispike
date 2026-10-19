/* nutri-stats-core.js: nutrition stats (Oct 19 2026, Emmanuel: "zuletzt 200 g, und dann für die 200 g: wie viel Protein,
   Ballaststoffe, Zucker, Kohlenhydrate, Fett, Kalorien. Fertig. Und dann ist man happy." / "Wir brauchen die Stats rein" /
   "Vergiss nicht, es ist ein Game": today's nutrition shown as character stats, like strength in Genshin Impact).
   Pure functions, no DOM. nutri-stats.js draws the portion block and the stats sheet.
   Data:
     meal logs   S.logs[{day, ts, t, macros:{protein, fiber, sugar, carbs, fat, kcal}}] (unknown macro = null / missing)
     targets     S.user.macroGoals {protein, fiber, sugar, carbs, fat, kcal} (unset = DEFAULTS, shown, never saved)
     portions    localStorage 'lowi.portion.v1' {productKey: grams} (the amount you had last time, per product)
     product     facts per 100 g from the label / Open Food Facts: c carbs, s sugar, f fiber, p protein, fat, kcal, q pack size */
(function (root) {
    'use strict';
    const KEYS = ['protein', 'fiber', 'carbs', 'fat', 'sugar', 'kcal'];
    /* sensible adult defaults: protein ~0.8 g/kg for ~75 kg, fiber 30 g (DGE), sugar 50 g max (WHO: under 10% of energy), 2000 kcal reference */
    const DEFAULTS = { protein: 60, fiber: 30, carbs: 260, fat: 70, sugar: 50, kcal: 2000 };
    /* goal = reach it, limit = stay under it (e.g. a sugar limit from your doctor), target = land near it */
    const KIND = { protein: 'goal', fiber: 'goal', carbs: 'target', fat: 'target', sugar: 'limit', kcal: 'target' };
    const UNIT = { protein: 'g', fiber: 'g', carbs: 'g', fat: 'g', sugar: 'g', kcal: 'kcal' };
    const MAX = { protein: 400, fiber: 150, carbs: 800, fat: 300, sugar: 300, kcal: 6000 };
    const FACT = { protein: 'p', fiber: 'f', carbs: 'c', fat: 'fat', sugar: 's', kcal: 'kcal' };
    const ALIAS = { protein: ['protein', 'proteins'], fiber: ['fiber', 'fibre'], carbs: ['carbs', 'carbohydrates'], fat: ['fat'], sugar: ['sugar', 'sugars'], kcal: ['kcal', 'calories'] };
    const num = x => { if (x === '' || x === null || x === undefined) return null; const n = +String(x).trim().replace(',', '.'); return Number.isFinite(n) ? n : null; };
    const r1 = x => Math.round(x * 10) / 10;
    const dayKey = t => { const d = new Date(t == null ? Date.now() : t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

    function targets(user) {
        const g = (user && user.macroGoals) || {}, out = {}, own = {};
        for (const k of KEYS) { const n = num(g[k]); own[k] = n !== null && n > 0 && n <= MAX[k]; out[k] = own[k] ? n : DEFAULTS[k]; }
        return { value: out, own };
    }
    /* the form's numbers -> what goes into S.user.macroGoals. Empty or out of range = back to the default (not saved) */
    function cleanTargets(input) {
        const out = {};
        for (const k of KEYS) { const n = num(input && input[k]); if (n !== null && n > 0 && n <= MAX[k]) out[k] = k === 'kcal' ? Math.round(n) : r1(n); }
        return out;
    }
    function mealMacros(log) {
        const src = (log && (log.macros || log.nutriments)) || {}, out = {};
        for (const k of KEYS) { const a = ALIAS[k].find(x => num(src[x]) !== null && num(src[x]) >= 0); out[k] = a === undefined ? null : num(src[a]); }
        return out;
    }
    function totals(logs, day) {
        const list = (logs || []).filter(l => l && (l.day || dayKey(l.ts)) === day), sum = {}, known = {};
        for (const k of KEYS) { sum[k] = 0; known[k] = 0; }
        let unknown = 0;
        for (const l of list) {
            const m = mealMacros(l); let any = false;
            for (const k of KEYS) if (m[k] !== null) { sum[k] += m[k]; known[k]++; any = true; }
            if (!any) unknown++;
        }
        for (const k of KEYS) sum[k] = k === 'kcal' ? Math.round(sum[k]) : r1(sum[k]);
        return { sum, known, meals: list.length, unknown };
    }
    /* one stat: value against target, how full the bar is, what is left, whether it is hit or over */
    function stat(k, value, target, kind) {
        kind = kind || KIND[k] || 'goal'; value = Math.max(0, +value || 0); target = Math.max(0.1, +target || 0.1);
        const ratio = value / target, left = Math.max(0, target - value), over = Math.max(0, value - target);
        let state;
        if (kind === 'limit') state = value > target ? 'over' : ratio >= 0.85 ? 'near' : 'ok';
        else if (kind === 'target') state = ratio > 1.1 ? 'over' : ratio >= 0.85 ? 'hit' : 'go';
        else state = ratio >= 1 ? 'hit' : 'go';
        const round = v => (k === 'kcal' ? Math.round(v) : r1(v));
        return { k, kind, value: round(value), target: round(target), fill: Math.min(1, ratio), ratio: Math.round(ratio * 100) / 100, left: round(left), over: round(over), state, unit: UNIT[k] || 'g' };
    }
    function rows(state, day) {
        const s = state || {}, t = targets(s.user), tot = totals(s.logs, day || dayKey());
        const list = KEYS.map(k => Object.assign(stat(k, tot.sum[k], t.value[k]), { own: t.own[k] }));
        const good = list.filter(r => r.state === 'hit' || (r.kind === 'limit' && r.state !== 'over')).length;
        const allGood = tot.meals > 0 && list.every(r => r.kind === 'limit' ? r.state !== 'over' : r.state === 'hit');
        return { rows: list, meals: tot.meals, unknown: tot.unknown, good, total: list.length, allGood };
    }

    /* ---------- portion on the product card ---------- */
    function productKey(p) { if (!p) return ''; const code = String(p.barcode || p.code || '').replace(/\D/g, ''); if (code.length >= 6) return 'bc:' + code; const n = String(p.name || '').toLowerCase().replace(/[^a-z0-9\u00e0-\u00ff]+/g, ' ').trim(); return n ? 'n:' + n.slice(0, 60) : ''; }
    /* "500 g", "0,33 l", "4 x 125 g", "250ml" -> grams (ml counted as g) */
    function packGrams(q) {
        const s = String(q || '').toLowerCase().replace(',', '.');
        let m = s.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/);
        const unit = (v, u) => u === 'kg' || u === 'l' ? v * 1000 : u === 'cl' ? v * 10 : v;
        if (m) return Math.round(unit(+m[2], m[3]));
        m = s.match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|cl|l)\b/);
        return m ? Math.round(unit(+m[1], m[2])) : null;
    }
    function defaultPortion(p) {
        const f = (p && p.facts) || {}, pack = packGrams(f.q);
        if (pack && pack >= 10 && pack <= 250) return pack;        /* a bar, a can, a yoghurt cup: the whole pack */
        return f.drink || (p && p.cat === 'drink') ? 250 : 100;
    }
    function clampGrams(g) { const n = num(g); return n === null ? null : Math.max(1, Math.min(2000, Math.round(n))); }
    function portion(p, memory) {
        const key = productKey(p), last = key && memory ? clampGrams(memory[key]) : null;
        return last ? { grams: last, from: 'last', key } : { grams: defaultPortion(p), from: 'default', key };
    }
    /* facts per 100 g -> values for `grams`. kcal missing on the label is estimated from the macros (4/4/9/2), marked est */
    function forGrams(facts, grams) {
        const f = facts || {}, g = Math.max(0, +grams || 0), out = {}, per = {};
        for (const k of KEYS) per[k] = num(f[FACT[k]]);
        let est = false;
        if (per.kcal === null && per.carbs !== null && per.protein !== null && per.fat !== null) { per.kcal = per.carbs * 4 + per.protein * 4 + per.fat * 9 + (per.fiber || 0) * 2; est = true; }
        for (const k of KEYS) out[k] = per[k] === null ? null : (k === 'kcal' ? Math.round(per[k] * g / 100) : r1(per[k] * g / 100));
        out.estKcal = est;
        return out;
    }
    /* what a meal log keeps: only the known values (unknown stays unknown, never 0) */
    function logMacros(facts, grams) {
        const v = forGrams(facts, grams), out = {}; let any = false;
        for (const k of KEYS) if (v[k] !== null) { out[k] = v[k]; any = true; }
        if (any) out.grams = Math.round(+grams || 0);
        return any ? out : null;
    }
    function remember(memory, key, grams) {
        const m = Object.assign({}, memory || {}), g = clampGrams(grams); if (!key || !g) return m;
        delete m[key]; m[key] = g;
        const ks = Object.keys(m); while (ks.length > 300) delete m[ks.shift()];
        return m;
    }

    const api = { KEYS, DEFAULTS, KIND, UNIT, MAX, dayKey, targets, cleanTargets, mealMacros, totals, stat, rows, productKey, packGrams, defaultPortion, clampGrams, portion, forGrams, logMacros, remember };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.LowiNutriStatsCore = api;
})(typeof window !== 'undefined' ? window : this);
