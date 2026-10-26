/* LOWiSPIKE "Shop from home" weekly basket: the pure logic (no DOM). Oct 26 2026, Emmanuel: "I'm at home and I want to go
   grocery shopping now ... virtual grocery shop, just like all those apps that are going viral". What makes those apps work
   (choosy, Potto, mise, Herbi, TapCook, Super): pick your supermarket, household size, weekly budget and the nights you cook,
   get a whole week in one tap with a running total, swap what you don't like, keep what you already have off the bill, send
   the list on. This file plans the week from our own low-spike dinners and adds up the basket; week-basket.js draws it.
   Prices are NOT made here: the caller passes the app's existing seven-store estimate (LowiStoreList.price), so the cart, the
   recipe list and this basket always show the same numbers. Pack rule (shown to the person as an estimate): one pack per
   dinner feeds up to two people; spices, sauces, oils and seeds count once for the week. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiWeekBasketCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const KEY = 'lowispike.weekshop.v1';
    const PEOPLE = [1, 2, 3, 4, 5, 6], NIGHTS = [3, 4, 5, 6, 7];
    const DEF = { people: 2, nights: 5, budget: 60 };
    const BUDGET_MIN = 10, BUDGET_MAX = 500;
    /* The m_ rebuilds are left out on purpose: their ingredients are aisle names ("Other veg", "Cheese"), not things you can
       put in a basket. The Cook recipes and the three featured dinners name real ingredients. */
    const FEAT_DINNERS = ['paprikaburger', 'putenpfanne', 'halloumiteller'];

    const clampInt = (v, lo, hi, d) => { const n = Math.round(Number(v)); return isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
    function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    /* ISO week key, e.g. "2026-W44": the plan stays the same all week and a new week starts fresh */
    function weekKey(d) {
        d = d ? new Date(d) : new Date();
        const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), day = t.getUTCDay() || 7;
        t.setUTCDate(t.getUTCDate() + 4 - day);
        const y = t.getUTCFullYear(), wk = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
        return y + '-W' + String(wk).padStart(2, '0');
    }
    /* the dinners a week can be built from: low-spike (r === 'ja') only, never 'selten' or 'nein', and with real ingredients */
    function pool(recipes) {
        const seen = {}, out = [];
        (recipes || []).forEach(r => {
            if (!r || !r.id || seen[r.id] || r.r !== 'ja' || !Array.isArray(r.ing) || r.ing.length < 3) return;
            if (!(r.c === 'meal' || FEAT_DINNERS.indexOf(r.id) >= 0)) return;
            seen[r.id] = 1; out.push(r);
        });
        return out;
    }
    /* the main thing in a dinner (beef or turkey mince, chicken, salmon, shrimp, eggs, cheese) so a week is not five mince nights */
    const MAIN_G = ['hack', 'huhn', 'eier', 'kaese'];
    function main(r) {
        const i = (r && r.ing || []).map(x => typeof x === 'string' ? { g: x.split('|')[0], n: x.split('|')[1] } : x).find(x => MAIN_G.indexOf(x.g) >= 0);
        return !i ? '' : i.g === 'huhn' ? 'huhn:' + String(i.n || '').toLowerCase().split(/[ ,]/)[0] : i.g;
    }
    const limitFor = n => Math.max(2, Math.ceil(n / 3));
    /* a stable shuffle of the pool for this week and this reshuffle count */
    function order(ids, seed) { return ids.slice().sort((a, b) => (hash(seed + '|' + a) - hash(seed + '|' + b)) || (a < b ? -1 : 1)); }
    function plan(poolIds, nights, seed, keep, mainOf) {
        const n = Math.min(clampInt(nights, 1, 7, DEF.nights), poolIds.length), out = [], cnt = {}, mo = mainOf || (() => ''), lim = limitFor(n);
        const put = id => { out.push(id); const m = mo(id); if (m) cnt[m] = (cnt[m] || 0) + 1; };
        (keep || []).forEach(id => { if (out.length < n && poolIds.indexOf(id) >= 0 && out.indexOf(id) < 0) put(id); });
        const ord = order(poolIds, seed);
        ord.forEach(id => { const m = mo(id); if (out.length < n && out.indexOf(id) < 0 && (!m || (cnt[m] || 0) < lim)) put(id); });
        ord.forEach(id => { if (out.length < n && out.indexOf(id) < 0) put(id); });
        return out;
    }
    /* swap one dinner for the next one in this week's order that is not on the plan yet (and keeps the week varied if it can) */
    function swap(planIds, idx, poolIds, seed, mainOf) {
        const p = planIds.slice(), cur = p[idx]; if (cur == null) return p;
        const mo = mainOf || (() => ''), lim = limitFor(p.length), ord = order(poolIds, seed), start = Math.max(0, ord.indexOf(cur));
        const cnt = {}; p.forEach((id, j) => { const m = mo(id); if (m && j !== idx) cnt[m] = (cnt[m] || 0) + 1; });
        let fallback = null;
        for (let k = 1; k <= ord.length; k++) {
            const id = ord[(start + k) % ord.length]; if (p.indexOf(id) >= 0) continue;
            const m = mo(id); if (!m || (cnt[m] || 0) < lim) { p[idx] = id; return p; }
            if (!fallback) fallback = id;
        }
        if (fallback) p[idx] = fallback;
        return p;
    }
    const once = i => i.g === 'wuerze' || (i.g === 'fett' && !/avocado/i.test(i.n || ''));
    const packsFor = (i, uses, people) => once(i) ? 1 : uses * Math.ceil(clampInt(people, 1, 12, 2) / 2);
    /* merge the dinners' shopping items. dinners: [{id, n, items:[{k, n, g, e, p}]}] (items from LowiStoreList.items) */
    function basket(dinners, people) {
        const m = {}, list = [];
        (dinners || []).forEach(d => (d.items || []).forEach(i => {
            const k = String(i.k || i.n || '').toLowerCase(); if (!k) return;
            if (!m[k]) { m[k] = { k, n: i.n, g: i.g, e: i.e, p: i.p, uses: 0, for: [] }; list.push(m[k]); }
            if (m[k].for.indexOf(d.id) < 0) { m[k].for.push(d.id); m[k].uses++; }
        }));
        list.forEach(i => { i.packs = packsFor(i, i.uses, people); });
        return list;
    }
    const r2 = x => Math.round(x * 100) / 100;
    /* total of what still has to be bought (items you have at home are off the bill) */
    function total(items, priceFn, sid, have) {
        have = have || {};
        return r2((items || []).reduce((a, i) => a + (have[i.k] ? 0 : (Number(priceFn(i, sid)) || 0) * i.packs), 0));
    }
    function storeTotals(items, priceFn, storeIds, have) {
        return storeIds.map(s => [s, total(items, priceFn, s, have)]).sort((a, b) => a[1] - b[1]);
    }
    /* what one dinner adds to the bill: its share of each pack it uses */
    function dinnerCost(dinnerId, items, priceFn, sid, have) {
        have = have || {};
        return r2((items || []).reduce((a, i) => i.for.indexOf(dinnerId) < 0 || have[i.k] ? a : a + (Number(priceFn(i, sid)) || 0) * i.packs / i.uses, 0));
    }
    function budgetState(sum, budget) {
        const b = clampInt(budget, BUDGET_MIN, BUDGET_MAX, DEF.budget), left = r2(b - sum);
        return { budget: b, total: r2(sum), left, over: left < 0, pct: Math.max(0, Math.min(1, b ? sum / b : 0)) };
    }
    /* Fit my budget: swap the dinner that costs most for the cheapest one not on the plan, while that brings the week down,
       until it fits. build(planIds) -> {items, cost(id)} lets the caller price it with the real store estimate. */
    function fitBudget(planIds, poolIds, budget, build, maxSteps) {
        let p = planIds.slice(), steps = 0, b = build(p);
        const lim = maxSteps || 12;
        while (b.sum > budget && steps < lim) {
            const byCost = p.map(id => [id, b.cost(id)]).sort((x, y) => y[1] - x[1]);
            let best = null;
            poolIds.forEach(c => {
                if (p.indexOf(c) >= 0) return;
                const trial = p.slice(); trial[p.indexOf(byCost[0][0])] = c; const tb = build(trial);
                if (tb.sum < b.sum - 0.005 && (!best || tb.sum < best[1].sum)) best = [trial, tb];
            });
            if (!best) break;
            p = best[0]; b = best[1]; steps++;
        }
        return { plan: p, sum: b.sum, fits: b.sum <= budget };
    }
    /* saved settings: people, nights, budget, store, the week's plan and its reshuffle count, what you have */
    function load(raw, wk) {
        let o = {}; try { o = raw ? JSON.parse(raw) : {}; } catch (e) { o = {}; }
        if (!o || typeof o !== 'object') o = {};
        const s = {
            people: clampInt(o.people, 1, 6, DEF.people), nights: clampInt(o.nights, 1, 7, DEF.nights),
            budget: clampInt(o.budget, BUDGET_MIN, BUDGET_MAX, DEF.budget), store: typeof o.store === 'string' ? o.store.slice(0, 20) : '',
            wk: typeof o.wk === 'string' ? o.wk : '', shuffle: clampInt(o.shuffle, 0, 9999, 0),
            plan: Array.isArray(o.plan) ? o.plan.filter(x => typeof x === 'string').slice(0, 7) : [],
            have: o.have && typeof o.have === 'object' ? o.have : {}, sent: typeof o.sent === 'string' ? o.sent : ''
        };
        if (wk && s.wk !== wk) { s.wk = wk; s.shuffle = 0; s.plan = []; s.sent = ''; }   /* a new week starts fresh; people, budget and store stay */
        return s;
    }
    function seedOf(s) { return s.wk + '#' + s.shuffle; }
    /* plain text list for copy / share: one line per item, packs, the estimate */
    function text(items, have, priceFn, sid, storeName, eur, title) {
        const need = (items || []).filter(i => !(have || {})[i.k]);
        return (title || 'LOWiSPIKE') + ' \u00b7 ' + storeName + '\n' + need.map(i => '- ' + (i.packs > 1 ? i.packs + ' \u00d7 ' : '') + i.n + '  ' + eur((Number(priceFn(i, sid)) || 0) * i.packs)).join('\n') +
            '\n\n\u2248 ' + eur(total(items, priceFn, sid, have));
    }
    return { KEY, PEOPLE, NIGHTS, DEF, BUDGET_MIN, BUDGET_MAX, FEAT_DINNERS, weekKey, pool, main, order, plan, swap, once, packsFor, basket, total, storeTotals, dinnerCost, budgetState, fitBudget, load, seedOf, text, hash };
});
