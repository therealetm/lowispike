/* cart-core.js — the Supermarket Cart (EN Cart, DE Warenkorb, ES Carrito). Pure logic, no DOM.
   Oct 26, 2026 (Emmanuel, MAYA-HANDOFF 0.22: "What we can add here is Einkaufswagen, basically Warenkorb. The apps that went
   viral already have all of these steps"). The Cart is the SAME list as the shopping list (LOWI_SHELF's SH.list in
   index.html), never a second list: an item still to buy (done:false) is a cart line. Each line has a quantity q (default
   1). The total is an estimate built only from prices people reported on the shelf (item.p, already filtered to fresh
   or checked sightings by index.html); lines without a reported price are counted, never guessed.
   Used by store-picks.js (Supermarket > Cart pane) through LOWI_SHELF.cartLines / setQty, and by tests. */
(function (root) {
    'use strict';
    const MAX_Q = 99;
    const qOf = i => { const q = Math.round(Number(i && i.q)); return q >= 1 ? Math.min(MAX_Q, q) : 1; };
    const priceOf = i => { const p = Number(i && i.p); return i && i.p != null && isFinite(p) && p > 0 ? p : null; };
    /* the cart lines, newest last as on the list; storeName(id) turns a store id into its name ('' for any store) */
    function lines(list, storeName) {
        return (Array.isArray(list) ? list : []).filter(i => i && !i.done && String(i.n || '').trim()).map(i => {
            let store = '';
            if (i.s && i.s !== 'any' && i.s !== 'other' && typeof storeName === 'function') { try { store = String(storeName(i.s) || ''); } catch (e) { store = ''; } }
            const p = priceOf(i), q = qOf(i);
            return { id: String(i.id), n: String(i.n).trim(), e: i.e || '\u{1F6D2}', photo: i.photo || '', store, q, p, line: p == null ? null : Math.round(p * q * 100) / 100 };
        });
    }
    /* how many things are in the cart (quantities count) */
    function count(list) { return lines(list).reduce((a, l) => a + l.q, 0); }
    /* the estimated total: only lines with a reported price; priced/all say how much of the cart it covers */
    function total(list) {
        const ls = lines(list), pr = ls.filter(l => l.p != null);
        const sum = Math.round(pr.reduce((a, l) => a + l.p * l.q, 0) * 100) / 100;
        return { sum, priced: pr.length, all: ls.length, complete: ls.length > 0 && pr.length === ls.length };
    }
    /* change a line's quantity in place; 0 or less takes it out of the cart. Returns 'set' | 'removed' | null (not found) */
    function setQty(list, id, q) {
        if (!Array.isArray(list)) return null;
        const k = list.findIndex(i => i && String(i.id) === String(id) && !i.done);
        if (k < 0) return null;
        q = Math.round(Number(q));
        if (!(q >= 1)) { list.splice(k, 1); return 'removed'; }
        list[k].q = Math.min(MAX_Q, q);
        return 'set';
    }
    /* money in the user's language, euros (the shelf only takes euro prices) */
    function money(v, lang) {
        const loc = lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-IE';
        try { return new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR' }).format(v); } catch (e) { return '€' + Number(v).toFixed(2); }
    }
    const api = { MAX_Q, lines, count, total, setQty, money };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) root.LowiCartCore = api;
})(typeof window !== 'undefined' ? window : null);
