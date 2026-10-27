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
    /* Oct 27 2026 (the TikTok's top complaint, "the same meat every day"): each meat or fish a dinner has, by kind. A week never
       has the same one twice while the pool can avoid it (beef mince Monday, turkey Tuesday is fine; beef twice is not). */
    const MEATS = [['beef', /beef/i], ['turkey', /turkey|pute/i], ['chicken', /chicken|h(ae|\u00e4)hnchen/i], ['pork', /pork|bacon|\bham\b|sausage|chorizo|salami/i],
        ['salmon', /salmon|lachs/i], ['shrimp', /shrimp|prawn|garnele/i], ['tuna', /tuna|thunfisch/i], ['fish', /\bcod\b|white fish|kabeljau/i]];
    function meats(r) {
        const out = [];
        (r && r.ing || []).forEach(x => {
            const n = typeof x === 'string' ? (x.split('|')[1] || '') : Array.isArray(x) ? String(x[1] || '') : String(x && x.n || '');
            let hit = '';
            MEATS.some(([k, rx]) => (rx.test(n) ? (hit = k) : false));
            if (!hit && /\bmince\b|patt(y|ies)/i.test(n)) hit = 'mince';
            if (hit && out.indexOf(hit) < 0) out.push(hit);
        });
        return out;
    }
    /* what keeps a week varied: its main (at most a third of the week) and each meat by kind (once a week) */
    const weekKeys = r => { const m = main(r); return (m ? [m] : []).concat(meats(r).map(k => 'meat:' + k)); };
    const keysOf = (mo, id) => { const v = mo(id); return !v ? [] : Array.isArray(v) ? v : [v]; };
    const limOf = (k, lim) => (k.indexOf('meat:') === 0 ? 1 : lim);
    const roomFor = (keys, cnt, lim) => keys.every(k => (cnt[k] || 0) < limOf(k, lim));
    /* a stable shuffle of the pool for this week and this reshuffle count */
    function order(ids, seed) { return ids.slice().sort((a, b) => (hash(seed + '|' + a) - hash(seed + '|' + b)) || (a < b ? -1 : 1)); }
    function plan(poolIds, nights, seed, keep, mainOf, rankFn) {
        const n = Math.min(clampInt(nights, 1, 7, DEF.nights), poolIds.length), out = [], cnt = {}, mo = mainOf || (() => ''), lim = limitFor(n);
        const put = id => { out.push(id); keysOf(mo, id).forEach(m => { cnt[m] = (cnt[m] || 0) + 1; }); };
        (keep || []).forEach(id => { if (out.length < n && poolIds.indexOf(id) >= 0 && out.indexOf(id) < 0) put(id); });
        const ord = rankFn ? rank(poolIds, seed, rankFn) : order(poolIds, seed);
        ord.forEach(id => { if (out.length < n && out.indexOf(id) < 0 && roomFor(keysOf(mo, id), cnt, lim)) put(id); });
        ord.forEach(id => { if (out.length < n && out.indexOf(id) < 0) put(id); });
        return out;
    }
    /* swap one dinner for the next one in this week's order that is not on the plan yet (and keeps the week varied if it can) */
    function swap(planIds, idx, poolIds, seed, mainOf) {
        const p = planIds.slice(), cur = p[idx]; if (cur == null) return p;
        const mo = mainOf || (() => ''), lim = limitFor(p.length), ord = order(poolIds, seed), start = Math.max(0, ord.indexOf(cur));
        const cnt = {}; p.forEach((id, j) => { if (j !== idx) keysOf(mo, id).forEach(m => { cnt[m] = (cnt[m] || 0) + 1; }); });
        let fallback = null;
        for (let k = 1; k <= ord.length; k++) {
            const id = ord[(start + k) % ord.length]; if (p.indexOf(id) >= 0) continue;
            if (roomFor(keysOf(mo, id), cnt, lim)) { p[idx] = id; return p; }
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

    /* ---- Oct 27 2026, the guided week (Emmanuel sent a viral @herbi.app TikTok: "choose where you shop, your budget, your vibe,
       dietary needs, what's in your kitchen" -> a Monday-to-Friday of dinners + one list, and said "improve our app, so that it
       also has this feature. I still feel like our app is so noisy and so confusing"). These pure helpers read a dinner's
       ingredients and steps so the answers can shape the week: needs and kitchen are hard filters, the vibe only ranks. ---- */
    const VIBES = ['quick', 'protein', 'fake', 'fresh'], DIETS = ['veg', 'nofish', 'nobeef', 'nodairy'], KITS = ['hob', 'oven', 'air', 'micro'];
    const RX = {
        fish: /salmon|shrimp|tuna|fish|prawn|\bcod\b|seafood/i,
        beef: /beef/i,
        meat: /beef|turkey|chicken|mince|patt(y|ies)|bacon|\bham\b|pork|bone broth|chorizo|salami|sausage/i,
        dairy: /yogh?urt|cheese|frischk|mozzarella|parmesan|cheddar|halloumi|feta|ricotta|milk|cream|butter|skyr|quark/i,
        oven: /\b(bake|baked|roast|roasting|oven)\b/i,
        hob: /\b(pan|sear|fry|fried|wok|simmer|boil|brown|saut|skillet|poach|scramble|warm|melt|stir-fry|dry-fry)/i,
        fake: /burger|pizza|nacho|carbonara|sushi|taco|okonomiyaki|fried rice|shell|melt|wrap/i,
        leafy: /lettuce|greens|kale|salad|spinach|avocado/i
    };
    const norm = r => (r && r.ing || []).map(x => typeof x === 'string' ? { g: x.split('|')[0], n: x.split('|')[1] } : x);
    /* what a dinner is: meat / fish / beef / dairy, the kitchen it needs, and which vibes it fits. extra = {min, protein} from the app */
    function profile(r, extra) {
        const ing = norm(r), names = ing.map(i => i.n || '').join(' | '), gs = ing.map(i => i.g), x = extra || {};
        const steps = [].concat(r && r.make || [], r && r.steps || []).join(' ').replace(/pan-roast/ig, 'pan-sear');
        const fish = RX.fish.test(names), meat = gs.indexOf('hack') >= 0 || RX.meat.test(names) || (gs.indexOf('huhn') >= 0 && !fish);
        const oven = RX.oven.test(steps), hob = RX.hob.test(steps);
        const min = Number(x.min || (r && r.min)) || 0;
        const leafy = ing.some(i => i.g === 'salat' && RX.leafy.test(i.n || '')) || /salad|plate|box|bowl/i.test(r && r.n || '');
        return {
            meat, fish, veg: !meat && !fish, beef: RX.beef.test(names), dairy: gs.indexOf('milch') >= 0 || gs.indexOf('kaese') >= 0 || RX.dairy.test(names),
            need: oven ? 'oven' : hob ? 'hob' : 'none', min,
            quick: min > 0 && min <= 15, protein: x.protein != null ? !!x.protein : (meat || fish || gs.indexOf('eier') >= 0),
            fake: RX.fake.test(r && r.n || ''), fresh: leafy,
            /* fresh first: fish and salad leaves go off first, so they come early in the week; eggs, cheese and pantry dinners last */
            perish: fish ? 0 : ing.some(i => RX.leafy.test(i.n || '')) ? 1 : meat ? 2 : 3
        };
    }
    /* hard filters: what you said you don't eat, and the kitchen you have (an air fryer does what the oven does here) */
    function fits(pr, diet, kit) {
        const d = diet || [], k = kit && kit.length ? kit : KITS;
        if (d.indexOf('veg') >= 0 && !pr.veg) return false;
        if (d.indexOf('nofish') >= 0 && pr.fish) return false;
        if (d.indexOf('nobeef') >= 0 && pr.beef) return false;
        if (d.indexOf('nodairy') >= 0 && pr.dairy) return false;
        if (pr.need === 'oven' && k.indexOf('oven') < 0 && k.indexOf('air') < 0) return false;
        if (pr.need === 'hob' && k.indexOf('hob') < 0) return false;
        return true;
    }
    /* soft: how many of your vibes a dinner matches (ranks, never removes) */
    function vibeScore(pr, vibe) { return (vibe || []).reduce((n, v) => n + (pr[v] ? 1 : 0), 0); }
    /* the week's order with the best vibe match first, ties in this week's stable shuffle */
    function rank(ids, seed, scoreFn) {
        const base = order(ids, seed), pos = {}; base.forEach((id, i) => { pos[id] = i; });
        return base.slice().sort((a, b) => (scoreFn(b) - scoreFn(a)) || (pos[a] - pos[b]));
    }
    /* fresh first, keeping the order otherwise */
    function freshFirst(ids, perishOf) {
        const pos = {}; ids.forEach((id, i) => { pos[id] = i; });
        return ids.slice().sort((a, b) => (perishOf(a) - perishOf(b)) || (pos[a] - pos[b]));
    }
    /* the days the dinners fall on, from the day the week was made: [{date: 'YYYY-MM-DD', dow: 0..6}] */
    function days(start, n, today) {
        const t = today ? new Date(today) : new Date(), base = /^\d{4}-\d{2}-\d{2}$/.test(start || '') ? new Date(start + 'T12:00:00') : new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12);
        const out = []; for (let i = 0; i < n; i++) { const d = new Date(base); d.setDate(base.getDate() + i); out.push({ date: ymd(d), dow: d.getDay() }); }
        return out;
    }
    const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const pickList = (v, allowed) => Array.isArray(v) ? v.filter((x, i) => allowed.indexOf(x) >= 0 && v.indexOf(x) === i) : [];

    /* six low-spike vegetarian dinners, so "I don't eat meat" still gets a real week (the Cook recipes are mostly meat or fish).
       Only ingredients the store estimate already prices; registered with the recipe viewer (LowiP2.register) by week-basket.js. */
    const EXTRA = [
        { id: 'wk_feta_shakshuka_pan', c: 'meal', r: 'ja', e: '\ud83c\udf73', min: 20, n: 'Feta Shakshuka Pan', sub: 'Eggs set in a peppery tomato pan',
            ing: [['eier', 'Eggs'], ['gemuese', 'Tomatoes'], ['paprika', 'Bell pepper'], ['gemuese', 'Onion'], ['gemuese', 'Garlic'], ['wuerze', 'No-added-sugar tomato sauce'], ['kaese', 'Feta'], ['wuerze', 'Smoked paprika']],
            prep: ['Slice the onion and the bell pepper.', 'Chop the garlic and the tomatoes.'],
            make: ['Soften the onion, pepper and garlic in a pan with smoked paprika.', 'Add the tomatoes and tomato sauce and simmer for 5 minutes.', 'Make four dips, crack in the eggs, put the lid on until the whites set, then crumble the feta over.'] },
        { id: 'wk_halloumi_veggie_traybake', c: 'meal', r: 'ja', e: '\ud83e\uddc0', min: 30, n: 'Halloumi Veggie Traybake', sub: 'Golden halloumi on roasted peppers and zucchini',
            ing: [['kaese', 'Halloumi'], ['gemuese', 'Zucchini'], ['paprika', 'Bell pepper'], ['gemuese', 'Red onion'], ['gemuese', 'Tomatoes'], ['fett', 'Olive oil'], ['wuerze', 'Oregano'], ['gemuese', 'Lemon']],
            prep: ['Cut the zucchini, pepper and red onion into chunks.', 'Slice the halloumi.'],
            make: ['Toss the veg with olive oil and oregano and roast for 15 minutes in the oven or air fryer.', 'Add the halloumi and tomatoes and roast 10 minutes more until golden.', 'Squeeze lemon over before eating.'] },
        { id: 'wk_mushroom_cauli_mash', c: 'meal', r: 'ja', e: '\ud83c\udf44', min: 25, n: 'Creamy Mushroom Cauliflower Mash', sub: 'Garlic mushrooms on a soft cauliflower mash',
            ing: [['gemuese', 'Cauliflower'], ['gemuese', 'Mushrooms'], ['kaese', 'Frischk\u00e4se'], ['gemuese', 'Garlic'], ['salat', 'Kale'], ['fett', 'Walnuts'], ['fett', 'Olive oil'], ['wuerze', 'Black pepper']],
            prep: ['Break the cauliflower into florets.', 'Slice the mushrooms and the garlic.'],
            make: ['Boil the cauliflower until soft, drain it well and mash it with the Frischk\u00e4se.', 'Fry the mushrooms and garlic in olive oil until golden, then wilt in the kale.', 'Spoon the mushrooms over the mash and finish with walnuts and black pepper.'] },
        { id: 'wk_zucchini_ricotta_bake', c: 'meal', r: 'ja', e: '\ud83c\udf45', min: 30, n: 'Zucchini Ricotta Bake', sub: 'Layers of zucchini, ricotta and tomato',
            ing: [['gemuese', 'Zucchini'], ['milch', 'Ricotta'], ['kaese', 'Mozzarella'], ['wuerze', 'No-added-sugar tomato sauce'], ['eier', 'Eggs'], ['gemuese', 'Garlic'], ['wuerze', 'Oregano']],
            prep: ['Slice the zucchini into thin rounds.', 'Mix the ricotta with one egg, garlic and oregano.'],
            make: ['Layer tomato sauce, zucchini and the ricotta mix in a dish.', 'Top with torn mozzarella.', 'Bake or air-fry for about 20 minutes until bubbling and golden.'] },
        { id: 'wk_greek_egg_feta_plate', c: 'meal', r: 'ja', e: '\ud83e\udd57', min: 15, n: 'Greek Egg & Feta Plate', sub: 'Crunchy salad with jammy eggs and feta',
            ing: [['eier', 'Eggs'], ['gemuese', 'Cucumber'], ['gemuese', 'Tomatoes'], ['kaese', 'Feta'], ['gemuese', 'Red onion'], ['salat', 'Lettuce'], ['fett', 'Olive oil'], ['wuerze', 'Oregano']],
            prep: ['Boil the eggs for 8 minutes, then cool them in cold water.', 'Chop the cucumber, tomatoes and red onion.'],
            make: ['Lay the lettuce on a plate and pile the veg on top.', 'Add the halved eggs and crumbled feta.', 'Finish with olive oil and oregano.'] },
        { id: 'wk_cabbage_egg_fried_rice', c: 'meal', r: 'ja', e: '\ud83e\udd6c', min: 15, n: 'Cabbage Egg Fried Rice', sub: 'Fried-rice taste with cabbage instead of rice',
            ing: [['gemuese', 'Cabbage'], ['eier', 'Eggs'], ['gemuese', 'Mushrooms'], ['gemuese', 'Scallions'], ['gemuese', 'Ginger'], ['gemuese', 'Garlic'], ['wuerze', 'Tamari'], ['fett', 'Sesame seeds']],
            prep: ['Shred the cabbage very fine.', 'Slice the mushrooms and scallions, grate the ginger and garlic.'],
            make: ['Stir-fry the cabbage and mushrooms hot and fast until the edges brown.', 'Push it to one side and scramble the eggs.', 'Toss everything with tamari, ginger, garlic, scallions and sesame.'] }
    ].map(r => Object.assign({}, r, { ing: r.ing.map(([g, n]) => ({ g, n })), steps: r.make.slice() }));
    /* Fit my budget: swap the dinner that costs most for the cheapest one not on the plan, while that brings the week down,
       until it fits. build(planIds) -> {items, cost(id)} lets the caller price it with the real store estimate. */
    function fitBudget(planIds, poolIds, budget, build, maxSteps, keyOf) {
        let p = planIds.slice(), steps = 0, b = build(p);
        const lim = maxSteps || 12;
        /* fitting the budget never brings back the same meat twice (keyOf = weekKeys) */
        const meatRepeat = trial => { if (!keyOf) return false; const seen = {}; return trial.some(id => keysOf(keyOf, id).some(k => k.indexOf('meat:') === 0 && (seen[k] = (seen[k] || 0) + 1) > 1)); };
        while (b.sum > budget && steps < lim) {
            const byCost = p.map(id => [id, b.cost(id)]).sort((x, y) => y[1] - x[1]);
            let best = null;
            poolIds.forEach(c => {
                if (p.indexOf(c) >= 0) return;
                const trial = p.slice(); trial[p.indexOf(byCost[0][0])] = c; const tb = build(trial);
                if (meatRepeat(trial) && !meatRepeat(p)) return; if (tb.sum < b.sum - 0.005 && (!best || tb.sum < best[1].sum)) best = [trial, tb];
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
            have: o.have && typeof o.have === 'object' ? o.have : {}, sent: typeof o.sent === 'string' ? o.sent : '',
            /* the guided week: answered once (setup), then the week opens straight away; change any answer later */
            setup: o.setup === true, vibe: pickList(o.vibe, VIBES), diet: pickList(o.diet, DIETS),
            kit: Array.isArray(o.kit) ? pickList(o.kit, KITS) : ['hob', 'oven'], start: typeof o.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.start) ? o.start : ''
        };
        if (wk && s.wk !== wk) { s.wk = wk; s.shuffle = 0; s.plan = []; s.sent = ''; s.start = ''; }   /* a new week starts fresh; people, budget and store stay */
        return s;
    }
    function seedOf(s) { return s.wk + '#' + s.shuffle; }
    /* plain text list for copy / share: one line per item, packs, the estimate */
    function text(items, have, priceFn, sid, storeName, eur, title) {
        const need = (items || []).filter(i => !(have || {})[i.k]);
        return (title || 'LOWiSPIKE') + ' \u00b7 ' + storeName + '\n' + need.map(i => '- ' + (i.packs > 1 ? i.packs + ' \u00d7 ' : '') + i.n + '  ' + eur((Number(priceFn(i, sid)) || 0) * i.packs)).join('\n') +
            '\n\n\u2248 ' + eur(total(items, priceFn, sid, have));
    }
    return { KEY, PEOPLE, NIGHTS, DEF, BUDGET_MIN, BUDGET_MAX, FEAT_DINNERS, VIBES, DIETS, KITS, EXTRA, weekKey, pool, main, meats, weekKeys, order, rank, plan, swap, profile, fits, vibeScore, freshFirst, days, ymd, once, packsFor, basket, total, storeTotals, dinnerCost, budgetState, fitBudget, load, seedOf, text, hash };
});
