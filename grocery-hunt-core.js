/* LOWiSPIKE · grocery hunt rules (Oct 17, 2026). Pure logic, no DOM: grocery-hunt.js draws it, tests/grocery-hunt.test.cjs checks it.
   E-man: "Your health starts with grocery shopping." "Haven't some people already scanned some products ... just like Pokemon ...
   in this shop there is this." "You have to scan the barcode or take the picture." "Speisequark, Kiwi, Mandelnüsse ... when they
   actually connect these products, they get even more points, like Super Saiyan."
   - Shopping rhythm (optional): how often, which days, which shop.
   - Shopping glow: a shopping check-in (two different products caught on one day, by barcode in the shopping scanner or by a
     product photo) gives the world and the spirit world a renewable extra glow. It holds for the rhythm plus a day, then fades
     slowly to nothing. It is a bonus that runs out, never a penalty: it never goes below the normal look, nothing earned is lost,
     and it says nothing about what anyone eats. A pause (holiday, ill) freezes it; "couldn't scan" holds it 3 more days once a cycle.
   - Hunt: finds are tied to a shop (never a GPS position). A find is a hint at that shop; catching it needs the real product:
     a barcode scan or a product photo. A photo is never identified or rated by the app.
   - Power combos: two to four products caught on one shopping trip (e.g. Speisequark + kiwi + almonds) give a combo bonus.
   - Anti-farming: one catch per hint per 7 days, one bonus per combo per 7 days, the same photo never counts twice, one
     check-in bonus a day, and all hunt XP together is capped per day. Every XP award has a stable event id. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.LowiGroceryCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';
    const DAY = 864e5;
    const KEY = 'lowi.grocery.v1';
    const EVERY_MIN = 2, EVERY_MAX = 21, EVERY_DEF = 7;
    const HOLD_EXTRA = 1;          // days of slack after the rhythm before the glow starts fading
    const SCAN_GRACE = 3;          // "couldn't scan": hold the glow this many more days, once per cycle
    const PAUSE_MAX = 21;          // longest pause in days
    const TRIP_MIN = 2;            // different products on one day for a shopping check-in
    const COOLDOWN = 7;            // days before the same hint or combo pays again
    const XP = { trip: 10, hintBarcode: 12, hintPhoto: 6, ownBarcode: 5, ownPhoto: 3, find: 4, combo: 30 };
    const XP_DAY_CAP = 60;
    const BOOST_MAX = 8;           // world score points at full glow (world-health-core.js)

    /* generic foods, so a combo matches any brand: Speisequark from Lidl and from Edeka are both "quark" */
    const KINDS = [
        ['quark', /quark|topfen|reques[oó]n/, ['Quark', 'Quark', 'Quark']],
        ['skyr', /skyr/, ['Skyr', 'Skyr', 'Skyr']],
        ['yogurt', /joghurt|yogh?urt|yogur/, ['Yogurt', 'Joghurt', 'Yogur']],
        ['cottage', /h[uü]ttenk[aä]se|k[oö]rniger frischk[aä]se|cottage/, ['Cottage cheese', 'Hüttenkäse', 'Queso cottage']],
        ['kiwi', /\bkiwi/, ['Kiwi', 'Kiwi', 'Kiwi']],
        ['almond', /mandel|almond|almendra/, ['Almonds', 'Mandeln', 'Almendras']],
        ['walnut', /walnu|\bnuez|nueces/, ['Walnuts', 'Walnüsse', 'Nueces']],
        ['hazelnut', /haseln|hazelnut|avellana/, ['Hazelnuts', 'Haselnüsse', 'Avellanas']],
        ['berries', /beere|berr(y|ies)|bl[aá]ubeer|frambues|ar[aá]ndano|fresa/, ['Berries', 'Beeren', 'Bayas']],
        ['apple', /\b[aä]pfel|\bapfel|\bapple|manzana/, ['Apple', 'Apfel', 'Manzana']],
        ['egg', /\beier\b|\beggs?\b|huevo/, ['Eggs', 'Eier', 'Huevos']],
        ['avocado', /avocado|aguacate/, ['Avocado', 'Avocado', 'Aguacate']],
        ['salmon', /lachs|salmon|salm[oó]n/, ['Salmon', 'Lachs', 'Salmón']],
        ['tuna', /thunfisch|\btuna|at[uú]n/, ['Tuna', 'Thunfisch', 'Atún']],
        ['chia', /chia/, ['Chia', 'Chia', 'Chía']],
        ['oats', /hafer|\boats?\b|avena/, ['Oats', 'Hafer', 'Avena']],
        ['cucumber', /gurke|cucumber|pepino/, ['Cucumber', 'Gurke', 'Pepino']],
        ['tomato', /tomate|tomato/, ['Tomatoes', 'Tomaten', 'Tomates']],
        ['broccoli', /brokkoli|broccoli|br[oó]coli/, ['Broccoli', 'Brokkoli', 'Brócoli']],
        ['chicken', /h[aä]hnchen|huhn|chicken|pollo/, ['Chicken', 'Hähnchen', 'Pollo']],
        ['cheese', /k[aä]se|cheese|queso/, ['Cheese', 'Käse', 'Queso']],
        ['olive', /olive|aceituna/, ['Olives', 'Oliven', 'Aceitunas']],
        ['seeds', /k[uü]rbiskern|sonnenblumenkern|leinsamen|seeds?\b|semillas/, ['Seeds', 'Kerne', 'Semillas']]
    ];
    const KIND = {}; KINDS.forEach(k => { KIND[k[0]] = k; });
    const fold = s => String(s == null ? '' : s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    function kindOf(name) {
        const raw = String(name == null ? '' : name).toLowerCase(), n = fold(name);
        for (const k of KINDS) if (k[1].test(raw) || k[1].test(n)) return k[0];
        return '';
    }
    function kindLabel(id, li) { const k = KIND[id]; return k ? k[2][li || 0] || k[2][0] : ''; }
    const nameKey = s => fold(s).replace(/[^a-z0-9\u00df]+/g, ' ').trim().slice(0, 60);
    /* one product, one key: the barcode when there is one, else its name */
    function productKey(p) {
        const bc = String(p && (p.bc || p.barcode) || '').replace(/\D/g, '');
        if (bc.length >= 6) return 'bc:' + bc;
        const k = nameKey(p && (p.name || p.label));
        return k ? 'n:' + k : '';
    }

    function dayOf(ts) { const d = new Date(+ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
    function endOfDay(ts) { const d = new Date(+ts); d.setHours(23, 59, 59, 999); return +d; }
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    /* the starter combo is E-man's own example; it is labelled as the app's suggestion, never as another shopper's */
    const STARTER = { id: 'starter-quark-kiwi-almond', by: 'starter', name: ['Quark, kiwi and almonds', 'Quark, Kiwi und Mandeln', 'Quark, kiwi y almendras'],
        items: [{ kind: 'quark' }, { kind: 'kiwi' }, { kind: 'almond' }] };

    function blank() {
        return { v: 1, plan: { every: EVERY_DEF, days: [], store: null, set: 0 }, lastRenew: 0, pausedAt: 0, pausedUntil: 0, graceUntil: 0, graceAt: 0,
            catches: [], finds: {}, hintCaught: {}, combos: [], comboDone: {}, photos: {}, xp: { day: '', n: 0 }, consent: false, seenStarter: true };
    }
    function normalize(s) {
        const b = blank();
        if (!s || typeof s !== 'object') return b;
        const o = Object.assign(b, s);
        o.plan = Object.assign(blank().plan, s.plan || {});
        o.plan.every = clamp(Math.round(+o.plan.every || EVERY_DEF), EVERY_MIN, EVERY_MAX);
        o.plan.days = Array.isArray(o.plan.days) ? [...new Set(o.plan.days.map(Number).filter(d => d >= 0 && d <= 6))].sort() : [];
        if (o.plan.store && (typeof o.plan.store !== 'object' || !o.plan.store.id)) o.plan.store = null;
        ['lastRenew', 'pausedAt', 'pausedUntil', 'graceUntil', 'graceAt'].forEach(k => { o[k] = +o[k] || 0; });
        o.catches = Array.isArray(o.catches) ? o.catches.filter(c => c && c.key && c.ts).slice(-300) : [];
        ['finds', 'hintCaught', 'comboDone', 'photos'].forEach(k => { if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {}; });
        o.combos = Array.isArray(o.combos) ? o.combos.filter(c => c && c.id && Array.isArray(c.items) && c.items.length >= 2).slice(-40) : [];
        if (!o.xp || typeof o.xp !== 'object') o.xp = { day: '', n: 0 };
        o.consent = !!o.consent;
        return o;
    }

    /* ---------- pause (holiday, ill): the glow stands still ---------- */
    function pause(s, now, days) {
        resumeIfDue(s, now);
        days = clamp(Math.round(+days || 7), 1, PAUSE_MAX);
        if (!s.pausedAt) s.pausedAt = now;
        s.pausedUntil = now + days * DAY;
        return s;
    }
    function resume(s, now) {
        if (!s.pausedAt) return s;
        const end = Math.min(now, s.pausedUntil || now), gap = Math.max(0, end - s.pausedAt);
        if (s.lastRenew) s.lastRenew += gap;
        if (s.graceUntil) s.graceUntil += gap;
        s.pausedAt = 0; s.pausedUntil = 0;
        return s;
    }
    function resumeIfDue(s, now) { if (s.pausedAt && s.pausedUntil && now >= s.pausedUntil) resume(s, now); return s; }
    const paused = (s, now) => !!(s.pausedAt && (!s.pausedUntil || now < s.pausedUntil));

    /* ---------- the shopping glow ---------- */
    /* how long a check-in holds: the rhythm plus a day; with shop days set, at least to the end of the next shop day after that */
    function holdUntil(s) {
        if (!s.lastRenew) return 0;
        const every = s.plan.every;
        let h = s.lastRenew + (every + HOLD_EXTRA) * DAY;
        if (s.plan.days.length) {
            const base = s.lastRenew + every * DAY;
            for (let i = 0; i < 7; i++) { const t = base + i * DAY; if (s.plan.days.indexOf(new Date(t).getDay()) >= 0) { h = Math.max(h, endOfDay(t) + HOLD_EXTRA * DAY); break; } }
        }
        return Math.max(h, s.graceUntil || 0);
    }
    /* 0..1: 1 = full glow, falls straight to 0 over one rhythm after the hold, 0 = normal look (never below it) */
    function strength(s, now) {
        if (!s || !s.lastRenew) return 0;
        const t = paused(s, now) ? s.pausedAt : (s.pausedAt && s.pausedUntil ? now - (s.pausedUntil - s.pausedAt) : now);
        const h = holdUntil(s);
        if (t <= h) return 1;
        const fade = s.plan.every * DAY;
        return clamp(1 - (t - h) / fade, 0, 1);
    }
    function status(s, now) {
        const k = strength(s, now), h = holdUntil(s);
        let phase = !s.lastRenew ? 'none' : k >= 1 ? 'full' : k > 0 ? 'fading' : 'faded';
        if (paused(s, now)) phase = 'paused';
        return { phase, strength: k, pct: Math.round(k * 100), holdUntil: h, fadesOutAt: h ? h + s.plan.every * DAY : 0, boost: Math.round(BOOST_MAX * k * 10) / 10,
            graceOk: canGrace(s, now), pausedUntil: s.pausedUntil || 0 };
    }
    /* "I shopped but the scanner would not work": once per cycle, holds the glow 3 more days, no XP, never starts a glow from nothing */
    function canGrace(s, now) { return !!s.lastRenew && !paused(s, now) && !(s.graceAt && s.graceAt > s.lastRenew) && strength(s, now) > 0; }
    function grace(s, now) {
        if (!canGrace(s, now)) return false;
        s.graceUntil = Math.max(holdUntil(s), now) + SCAN_GRACE * DAY; s.graceAt = now;
        return true;
    }

    /* next shop day (for the status line): the first planned weekday on/after the day the glow would start fading */
    function nextShopDay(s, now) {
        if (!s.plan.days.length) return s.lastRenew ? s.lastRenew + s.plan.every * DAY : 0;
        const from = Math.max(now, s.lastRenew ? s.lastRenew + DAY : now);
        for (let i = 0; i < 8; i++) { const t = from + i * DAY; if (s.plan.days.indexOf(new Date(t).getDay()) >= 0) return t; }
        return 0;
    }

    /* ---------- XP: capped per day, every award has an id ---------- */
    function xpLeft(s, now) { const d = dayOf(now); if (s.xp.day !== d) s.xp = { day: d, n: 0 }; return Math.max(0, XP_DAY_CAP - s.xp.n); }
    function takeXp(s, now, want) { const left = xpLeft(s, now), got = Math.max(0, Math.min(left, want | 0)); s.xp.n += got; return got; }

    const storeId = st => st && st.id ? String(st.id) : '';
    function catchesOn(s, day) { return s.catches.filter(c => c.day === day); }

    /* hints for one shop: your own earlier finds there, plus shared finds (when the shared list exists). Never "in stock now". */
    function hints(s, store, shared, now) {
        const id = storeId(store); if (!id) return [];
        const out = {}, mine = s.finds[id] || {};
        Object.keys(mine).forEach(k => { const f = mine[k]; out[k] = { key: k, name: f.name, bc: f.bc || '', kind: f.kind || '', lvl: f.lvl || '', mine: true, lastSeen: f.last, first: f.first, shoppers: 0, via: f.via || 'barcode' }; });
        (shared || []).forEach(r => {
            if (!r || String(r.store_id || r.store) !== id) return;
            const k = r.product_key || productKey({ bc: r.barcode, name: r.name }); if (!k) return;
            const ts = Date.parse(r.found_at || r.created_at) || 0;
            const o = out[k] || (out[k] = { key: k, name: r.name, bc: r.barcode || '', kind: r.kind || kindOf(r.name), lvl: r.verdict || '', mine: false, lastSeen: 0, first: ts, shoppers: 0, via: r.method || 'barcode' });
            if (!r.own) { o.shoppers += 1; o.community = true; }
            o.lastSeen = Math.max(o.lastSeen || 0, ts);
        });
        return Object.values(out).map(h => {
            const at = s.hintCaught[id + '|' + h.key] || 0;
            h.caughtAt = at; h.cooling = at && now - at < COOLDOWN * DAY; h.againAt = at ? at + COOLDOWN * DAY : 0;
            h.daysAgo = h.lastSeen ? Math.max(0, Math.floor((now - h.lastSeen) / DAY)) : null;
            return h;
        }).sort((a, b) => (a.cooling - b.cooling) || ((b.community ? 1 : 0) - (a.community ? 1 : 0)) || (b.lastSeen - a.lastSeen));
    }

    /* a combo item is caught by a product of its kind (any brand), or by the exact product */
    function itemMatches(item, c) {
        if (item.key && c.key === item.key) return true;
        if (item.kind && c.kind === item.kind) return true;
        return false;
    }
    function comboProgress(combo, todays) {
        const used = new Set();
        const items = combo.items.map(it => { const c = todays.find(x => !used.has(x.key) && itemMatches(it, x)); if (c) used.add(c.key); return { item: it, by: c || null }; });
        return { items, done: items.every(i => i.by), have: items.filter(i => i.by).length };
    }
    function allCombos(s, shared) { return [STARTER].concat(s.combos, (shared || []).filter(c => c && Array.isArray(c.items) && c.items.length >= 2)); }

    /* ---------- one catch: a barcode scanned in the shopping scanner, or a product photo ---------- */
    /* p: {name, bc, lvl, via:'barcode'|'photo', photoHash, store:{id,name}}, shared: {finds:[], combos:[]} from the shared list (or empty)
       -> what happened, with the XP awards to make (grocery-hunt.js passes them to the app's one XP ledger) */
    function recordCatch(s, p, now, shared) {
        resumeIfDue(s, now);
        const sf = shared && shared.finds || [], sc = shared && shared.combos || [];
        const via = p.via === 'photo' ? 'photo' : 'barcode';
        const key = productKey(p); if (!key) return { ok: false, why: 'nokey' };
        if (via === 'barcode' && key.indexOf('bc:') !== 0) return { ok: false, why: 'nobarcode' };
        if (via === 'photo') {
            if (!p.photoHash) return { ok: false, why: 'nophoto' };
            if (s.photos[p.photoHash]) return { ok: false, why: 'samephoto' };
        }
        const day = dayOf(now), sid = storeId(p.store), todays = catchesOn(s, day);
        const again = todays.find(c => c.key === key);
        const res = { ok: true, key, via, day, awards: [], again: !!again, renewed: false, newFind: false, hint: null, combos: [] };
        if (via === 'photo') { s.photos[p.photoHash] = now; const ks = Object.keys(s.photos); if (ks.length > 400) ks.sort((a, b) => s.photos[a] - s.photos[b]).slice(0, ks.length - 400).forEach(k => delete s.photos[k]); }
        if (again) return res;   // the same product twice on one day: counted once
        const c = { key, name: String(p.name || '').slice(0, 80), bc: key.indexOf('bc:') === 0 ? key.slice(3) : '', kind: p.kind || kindOf(p.name), lvl: via === 'barcode' ? String(p.lvl || '') : '', via, store: sid, ts: now, day };
        s.catches.push(c); if (s.catches.length > 300) s.catches.splice(0, s.catches.length - 300);
        const give = (amt, label, id, kind) => { const got = takeXp(s, now, amt); if (got > 0) res.awards.push({ amt: got, label, eventId: 'grocery:' + day + ':' + id, kind }); };
        /* the hunt: this product as a hint at this shop */
        if (sid) {
            const hs = hints(s, p.store, sf, now), h = hs.find(x => x.key === key);
            if (h && !h.cooling) {
                s.hintCaught[sid + '|' + key] = now; res.hint = h;
                const amt = h.community ? (via === 'barcode' ? XP.hintBarcode : XP.hintPhoto) : (via === 'barcode' ? XP.ownBarcode : XP.ownPhoto);
                give(amt, 'hint', 'hint:' + sid + ':' + key, h.community ? 'community' : 'own');
            } else if (h && h.cooling) res.hint = h;
            const mine = s.finds[sid] || (s.finds[sid] = {});
            if (!mine[key]) {
                mine[key] = { name: c.name, bc: c.bc, kind: c.kind, lvl: c.lvl, first: now, last: now, n: 1, via };
                if (!h) { res.newFind = true; give(XP.find, 'find', 'find:' + sid + ':' + key, 'find'); s.hintCaught[sid + '|' + key] = now; }
            } else { mine[key].last = now; mine[key].n = (mine[key].n || 0) + 1; if (via === 'barcode' && c.lvl) mine[key].lvl = c.lvl; }
        }
        /* the shopping check-in: two different products today renew the glow, once a day */
        const now2 = catchesOn(s, day);
        if (now2.length >= TRIP_MIN && dayOf(s.lastRenew || 0) !== day) {
            if (paused(s, now)) resume(s, now);
            s.lastRenew = now; s.graceUntil = 0; res.renewed = true;
            give(XP.trip, 'trip', 'trip', 'trip');
        }
        res.tripCount = now2.length; res.tripNeed = Math.max(0, TRIP_MIN - now2.length);
        /* combos completed by this catch */
        allCombos(s, sc).forEach(cb => {
            const pr = comboProgress(cb, now2);
            if (!pr.done || !pr.items.some(i => i.by && i.by.key === key)) return;
            const at = s.comboDone[cb.id] || 0;
            if (at && now - at < COOLDOWN * DAY) { res.combos.push({ combo: cb, paid: false, againAt: at + COOLDOWN * DAY }); return; }
            s.comboDone[cb.id] = now;
            const before = res.awards.length; give(XP.combo, 'combo', 'combo:' + cb.id, 'combo');
            res.combos.push({ combo: cb, paid: res.awards.length > before });
        });
        return res;
    }

    /* a combo of your own from products you caught today: 2-4 different ones; kinds when known, else the exact product */
    function makeCombo(s, keys, name, store, now) {
        const day = dayOf(now), todays = catchesOn(s, day);
        const picked = [...new Set(keys || [])].map(k => todays.find(c => c.key === k)).filter(Boolean);
        if (picked.length < 2 || picked.length > 4) return { ok: false, why: 'count' };
        const items = picked.map(c => c.kind ? { kind: c.kind, label: c.name } : { key: c.key, label: c.name });
        const sig = items.map(i => i.kind || i.key).sort().join('+');
        if (allCombos(s).some(cb => cb.items.map(i => i.kind || i.key).sort().join('+') === sig)) return { ok: false, why: 'exists' };
        const nm = String(name || '').trim().slice(0, 40) || picked.map(c => c.name.split(/\s+/).slice(0, 2).join(' ')).join(' + ');
        const cb = { id: 'c' + now.toString(36) + Math.random().toString(36).slice(2, 5), by: 'you', name: nm, items, store: storeId(store), storeName: store && store.name || '', ts: now, shared: false };
        s.combos.push(cb);
        s.comboDone[cb.id] = now; // you just caught it: it pays when caught again on a later trip
        return { ok: true, combo: cb };
    }

    function setPlan(s, plan) {
        plan = plan || {};
        if (plan.every != null) s.plan.every = clamp(Math.round(+plan.every || EVERY_DEF), EVERY_MIN, EVERY_MAX);
        if (plan.days) s.plan.days = [...new Set(plan.days.map(Number).filter(d => d >= 0 && d <= 6))].sort();
        if (plan.store !== undefined) s.plan.store = plan.store && plan.store.id ? { id: String(plan.store.id), name: String(plan.store.name || '').slice(0, 60), brand: String(plan.store.brand || '').slice(0, 40), chain: String(plan.store.chain || ''), town: String(plan.store.town || '').slice(0, 40) } : null;
        s.plan.set = Date.now();
        return s;
    }

    /* a small, stable hash of a downscaled photo (data URL), so the same picture never counts twice */
    function hashStr(str) { let h1 = 0x811c9dc5, h2 = 0x12345; for (let i = 0; i < str.length; i++) { const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 + c, 2654435761) ^ (h2 >>> 13); } return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36) + str.length.toString(36); }

    /* the row a shared find would be (only with consent): the shop, the product, the estimate, the method and the date. No name, no position. */
    function shareRow(c, store) {
        return { store_id: storeId(store), store_name: String(store && store.name || '').slice(0, 60), product_key: c.key, name: c.name, barcode: c.bc || '', kind: c.kind || '', verdict: c.lvl || '', method: c.via };
    }

    return { KEY, DAY, XP, XP_DAY_CAP, COOLDOWN, TRIP_MIN, SCAN_GRACE, PAUSE_MAX, BOOST_MAX, EVERY_MIN, EVERY_MAX, KINDS, STARTER,
        blank, normalize, kindOf, kindLabel, productKey, nameKey, dayOf, holdUntil, strength, status, canGrace, grace, pause, resume, resumeIfDue, paused,
        nextShopDay, xpLeft, hints, comboProgress, allCombos, recordCatch, makeCombo, setPlan, hashStr, shareRow, catchesOn };
});
