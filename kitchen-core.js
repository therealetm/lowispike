/* kitchen-core.js — the personal Kitchen (Oct 24 2026, first simple version; handoff HANDOFF-shop-kitchen.md on sz-filters-20261024).
   A "wardrobe" for food: what the person has at home. Private, kept in lowispike.kitchen.v1 (lowispike.* keys travel with the
   account through account-sync-core.js, so it is the same list on every device of that account).
   The shopping cart is NOT here: it is the existing shopping list (LOWI_SHELF / SH.list in index.html), never a second list.
   Bought in the cart -> moves into the Kitchen. Removed from the Kitchen -> the app may offer "Buy again", it never adds by itself.
   Pure: no DOM, no storage. store-picks.js reads and writes the key. */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiKitchenCore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function () {
    'use strict';
    const KEY = 'lowispike.kitchen.v1';
    const MAX = 300, NAME = 60;
    const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
    const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, NAME);
    const fresh = () => ({ v: 1, items: [] });
    let seq = 0;
    const mkId = now => 'k' + Number(now || Date.now()).toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 5);

    /* whatever is stored -> a valid state; bad entries are dropped, never thrown on */
    function parse(raw) {
        let o = null;
        try { o = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { o = null; }
        if (!o || typeof o !== 'object' || !Array.isArray(o.items)) return fresh();
        const seen = {};
        const items = o.items.filter(i => i && typeof i === 'object' && typeof i.id === 'string' && clean(i.n))
            .filter(i => (seen[i.id] ? false : (seen[i.id] = true)))
            .map(item)
            .slice(-MAX);
        return { v: 1, items };
    }
    /* Oct 26 Kitchen game (kitchen-game.js, Cook > Kitchen): an entry may also carry its shelf (c) and the product it came from (p):
       barcode, picture, brand and the scanner's verdict level, copied from the product database or the scanner, never made up.
       Old entries without them stay as they are (the shelf is then worked out from the name). */
    const LEVELS = ['ok', 'better', 'spike', 'unknown'];
    function prod(p) {
        if (!p || typeof p !== 'object') return null;
        const bc = String(p.bc || '').replace(/\D/g, '').slice(0, 14), img = /^https:\/\/[^\s"'<>]+$/.test(String(p.img || '')) ? String(p.img).slice(0, 400) : '';
        const br = clean(p.br).slice(0, 40), v = LEVELS.indexOf(p.v) >= 0 ? p.v : '';
        if (!bc && !img && !br && !v) return null;
        const o = {}; if (bc) o.bc = bc; if (img) o.img = img; if (br) o.br = br; if (v) { o.v = v; if (p.est) o.est = 1; }
        return o;
    }
    function item(i) {
        const o = { id: i.id, n: clean(i.n), at: Number(i.at) || 0, from: i.from === 'cart' ? 'cart' : 'me' };
        const c = String(i.c || '').replace(/[^a-z]/g, '').slice(0, 12); if (c) o.c = c;
        const p = prod(i.p); if (p) o.p = p;
        return o;
    }
    const has = (st, name) => { const k = norm(name); return !!k && st.items.some(i => norm(i.n) === k); };
    /* add one thing you have at home; the same name twice stays one entry (returns the same state) */
    function add(st, name, now, from) {
        st = parse(st);
        const n = clean(name);
        if (!n || has(st, n)) return st;
        const items = st.items.concat([{ id: mkId(now), n, at: Number(now) || Date.now(), from: from === 'cart' ? 'cart' : 'me' }]).slice(-MAX);
        return { v: 1, items };
    }
    /* Oct 26: add with product data (from the product search or a scan). The same name or barcode twice stays one entry; a known
       entry without data gets the data. Returns {state, id, had} */
    function addProduct(st, x, now, from) {
        st = parse(st); x = x || {};
        const n = clean(x.n), p = prod(x), k = norm(n);
        if (!n) return { state: st, id: '', had: false };
        const old = st.items.find(i => norm(i.n) === k || (p && p.bc && i.p && i.p.bc === p.bc));
        if (old) {
            if (!p || old.p) return { state: st, id: old.id, had: true };
            return { state: { v: 1, items: st.items.map(i => (i.id === old.id ? item(Object.assign({}, i, { p, c: i.c || x.c })) : i)) }, id: old.id, had: true };
        }
        const it = item({ id: mkId(now), n, at: Number(now) || Date.now(), from, c: x.c, p });
        return { state: { v: 1, items: st.items.concat([it]).slice(-MAX) }, id: it.id, had: false };
    }
    /* Oct 26: put one entry on another shelf (the person knows better than the word list) */
    function setShelf(st, id, c) {
        st = parse(st);
        return { v: 1, items: st.items.map(i => (i.id === id ? item(Object.assign({}, i, { c })) : i)) };
    }
    /* take one out (eaten, used up, thrown away): {state, gone} — gone is the removed entry, for an optional "Buy again" */
    function drop(st, id) {
        st = parse(st);
        const gone = st.items.find(i => i.id === id) || null;
        if (!gone) return { state: st, gone: null };
        return { state: { v: 1, items: st.items.filter(i => i.id !== id) }, gone };
    }
    /* newest first, for the list */
    function view(st) { return parse(st).items.slice().sort((a, b) => (b.at - a.at) || (a.n < b.n ? -1 : 1)); }
    function count(st) { return parse(st).items.length; }
    /* the cart items (LOWI_SHELF.listOpen(true): {id, n, done, store}) split into still-to-buy and ticked-off-in-the-shop */
    function cartView(list) {
        const l = (Array.isArray(list) ? list : []).filter(i => i && i.id && clean(i.n));
        return { buy: l.filter(i => !i.done), got: l.filter(i => i.done) };
    }
    /* the name a cart item goes into the Kitchen with: no " · 200 g" recipe amounts, no emoji prefix */
    function fromCartName(n) { return clean(String(n || '').split(' · ')[0]); }
    return Object.freeze({ KEY, MAX, LEVELS, parse, add, addProduct, setShelf, prod, drop, view, count, has, cartView, fromCartName, norm });
});
