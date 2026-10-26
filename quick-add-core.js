/* quick-add-core.js: the quick "+" on every product row of Shop > Supermarket (MAYA-HANDOFF 0.35, Emmanuel 26 Oct 2026:
   "while I scroll down, instead of it saying Top, or next to Top, I can just add, add, add").
   Pure logic, no DOM: which control a row shows (a round "+" and a small "I have it" house, or a "- 1 +" stepper once the
   product is in the Cart), its markup in EN/DE/ES, how a product name matches a Cart line, and the double tap rule.
   Double tap rule (bug hunt P-ROW-SHIFT, rounds 41-43): "+" stays in the same spot when it turns into the stepper, so the 2nd
   tap of a double tap would land on the stepper's "+". A tap within FRESH_MS of the moment the control changed kind is ignored;
   quick taps on the stepper's own "+" and "-" (same kind, only the number changes) all count. */
(function (root) {
    'use strict';
    const FRESH_MS = 450;
    const WORDS = {
        en: { add: 'Add to Cart: {n}', kit: 'I have it, put in my kitchen: {n}', kitOn: 'In your kitchen: {n}',
            less: 'One less: {n}', drop: 'Take out of the Cart: {n}', more: 'One more: {n}', qty: '{q} in the Cart: {n}',
            inCart: 'In your Cart: {n}', inKit: 'In your kitchen: {n}', already: 'Already in your kitchen: {n}',
            outCart: 'Out of the Cart: {n}', undo: 'Undo', back: 'Taken back out of your kitchen: {n}' },
        de: { add: 'In den Warenkorb: {n}', kit: 'Hab ich schon, in meine Küche: {n}', kitOn: 'In deiner Küche: {n}',
            less: 'Eins weniger: {n}', drop: 'Aus dem Warenkorb nehmen: {n}', more: 'Eins mehr: {n}', qty: '{q} im Warenkorb: {n}',
            inCart: 'Im Warenkorb: {n}', inKit: 'In deiner Küche: {n}', already: 'Schon in deiner Küche: {n}',
            outCart: 'Aus dem Warenkorb: {n}', undo: 'Rückgängig', back: 'Wieder aus deiner Küche: {n}' },
        es: { add: 'Al carrito: {n}', kit: 'Ya lo tengo, a mi cocina: {n}', kitOn: 'En tu cocina: {n}',
            less: 'Uno menos: {n}', drop: 'Quitar del carrito: {n}', more: 'Uno más: {n}', qty: '{q} en el carrito: {n}',
            inCart: 'En tu carrito: {n}', inKit: 'En tu cocina: {n}', already: 'Ya está en tu cocina: {n}',
            outCart: 'Fuera del carrito: {n}', undo: 'Deshacer', back: 'Quitado de tu cocina: {n}' }
    };
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lang = l => (WORDS[l] ? l : 'en');
    function word(l, k, n, q) { return WORDS[lang(l)][k].replace('{n}', String(n == null ? '' : n)).replace('{q}', String(q == null ? '' : q)); }
    /* "Bio Leinsamen · 2 EL" and "bio  leinsamen" are the same product; accents and case do not count */
    function norm(s) {
        return String(s == null ? '' : s).split(' · ')[0].normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().replace(/\s+/g, ' ').trim();
    }
    function lineFor(lines, name) {
        const k = norm(name); if (!k) return null;
        return (Array.isArray(lines) ? lines : []).find(l => l && norm(l.n) === k) || null;
    }
    /* what the row shows: kind 'add' (house + "+") or 'step' ("- q +") */
    function state(lines, name, inKitchen) {
        const l = lineFor(lines, name), q = l ? Math.max(1, +l.q || 1) : 0;
        return { q, id: l ? String(l.id) : '', kit: !!inKitchen, kind: q > 0 ? 'step' : 'add' };
    }
    /* a tap that comes less than FRESH_MS after the control changed kind is the 2nd tap of a double tap: ignore it */
    function fresh(changedAt, now) { return changedAt > 0 && now >= changedAt && now - changedAt < FRESH_MS; }
    const HOUSE = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" focusable="false"><path d="M4 11.2 12 4.5l8 6.7V20a1 1 0 0 1-1 1h-4.6v-5.6H9.6V21H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
    /* the inside of the row's quick column (the column itself has a fixed width, so the row never reflows) */
    function html(st, i, name, l) {
        const n = esc(name);
        if (st.kind === 'step') {
            const one = st.q <= 1;
            return '<span class="stp-qa-step" role="group" aria-label="' + esc(word(l, 'qty', name, st.q)) + '">' +
                '<button type="button" class="stp-qa-b stp-qa-less" data-stp-qa="less" data-stp-qa-i="' + i + '"' + (one ? ' data-spend="1"' : '') +
                ' aria-label="' + esc(word(l, one ? 'drop' : 'less', name)) + '">' + (one ? '<span aria-hidden="true">−</span>' : '<span aria-hidden="true">−</span>') + '</button>' +
                '<span class="stp-qa-n" aria-hidden="true">' + st.q + '</span>' +
                '<button type="button" class="stp-qa-b stp-qa-more" data-stp-qa="more" data-stp-qa-i="' + i + '" aria-label="' + esc(word(l, 'more', name)) + '"><span aria-hidden="true">+</span></button>' +
                '</span>';
        }
        return '<button type="button" class="stp-qa-b stp-qa-kit' + (st.kit ? ' on' : '') + '" data-stp-qa="kit" data-stp-qa-i="' + i + '" data-spend="1"' +
            ' aria-pressed="' + (st.kit ? 'true' : 'false') + '" aria-label="' + esc(word(l, st.kit ? 'kitOn' : 'kit', name)) + '">' + HOUSE +
            (st.kit ? '<span class="stp-qa-tick" aria-hidden="true">✓</span>' : '') + '</button>' +
            '<button type="button" class="stp-qa-b stp-qa-add" data-stp-qa="add" data-stp-qa-i="' + i + '" data-spend="1" aria-label="' + esc(word(l, 'add', name)) + '"><span aria-hidden="true">+</span></button>';
    }
    /* a short note (role=status) that never moves a row: "In your Cart: X", with Undo for the kitchen */
    function note(l, what, name) { return word(l, what, name); }
    const api = { FRESH_MS, WORDS, norm, lineFor, state, fresh, html, note, word };
    root.LowiQuickAdd = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
