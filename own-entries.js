/* own-entries.js (Oct 25 2026). Eman (handoff from the other account): at "I want" (Ich möchte) and "Anything we should look
   out for?" (Worauf sollen wir achten?) people can type their own option and add it with an Add (Hinzufügen / Añadir) button.
   Not the same as the one free-text condition line from Oct 23 (S.health.condNote), which stays as it is.
   - Each own entry becomes a chip with a small x; tapping it removes it. At most 6 per list, 40 characters, no markup.
   - Stored in S.health.own = { goals: [...], conds: [...] }: S.health is PRIVATE_KEYS, so it stays on this phone.
   - Typed words are wrapped in data-noi18n so the app's translator never changes them.
   - Own entries never change tips or scores; they are the person's own words, shown back to them.
   API (window.LowiOwnEntries, also require()-able for tests): clean, list, add, read, write, rowHTML, chipHTML, tx, MAX, LEN */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiOwnEntries = api;
})(typeof window !== 'undefined' ? window : null, function () {
    'use strict';
    const MAX = 6, LEN = 40;
    const TX = {
        en: { add: 'Add', goalsPh: 'Your own, e.g. sleep better', condsPh: 'Your own, e.g. Hashimoto\'s', goalsLb: 'Add your own goal', condsLb: 'Add something of your own to look out for', rm: 'Remove {x}', full: 'That\'s six already. Remove one to add another.' },
        de: { add: 'Hinzufügen', goalsPh: 'Eigenes, z. B. besser schlafen', condsPh: 'Eigenes, z. B. Hashimoto', goalsLb: 'Eigenes Ziel hinzufügen', condsLb: 'Eigenen Punkt hinzufügen, auf den wir achten sollen', rm: '{x} entfernen', full: 'Das sind schon sechs. Entferne einen, um einen neuen hinzuzufügen.' },
        es: { add: 'Añadir', goalsPh: 'Lo tuyo, p. ej., dormir mejor', condsPh: 'Lo tuyo, p. ej., Hashimoto', goalsLb: 'Añadir tu propio objetivo', condsLb: 'Añadir algo tuyo que debamos tener en cuenta', rm: 'Quitar {x}', full: 'Ya hay seis. Quita uno para añadir otro.' }
    };
    const L = l => (TX[l] ? l : 'en');
    const tx = (k, l, v) => String(TX[L(l)][k] || TX.en[k] || k).replace('{x}', v == null ? '' : v);
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    function clean(v) { return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LEN).trim(); }
    function list(a) {
        const out = [], seen = {};
        (Array.isArray(a) ? a : []).forEach(x => { const c = clean(x), k = c.toLowerCase(); if (c && !seen[k] && out.length < MAX) { seen[k] = 1; out.push(c); } });
        return out;
    }
    function add(a, text) {
        const cur = list(a), c = clean(text);
        if (!c) return { list: cur, added: null, why: 'empty' };
        if (cur.some(x => x.toLowerCase() === c.toLowerCase())) return { list: cur, added: null, why: 'dup' };
        if (cur.length >= MAX) return { list: cur, added: null, why: 'full' };
        return { list: cur.concat([c]), added: c, why: '' };
    }
    function read(h) { const o = h && h.own && typeof h.own === 'object' ? h.own : {}; return { goals: list(o.goals), conds: list(o.conds) }; }
    function write(h, own) {
        if (!h || typeof h !== 'object') return;
        const g = list(own && own.goals), c = list(own && own.conds);
        if (g.length || c.length) h.own = { goals: g, conds: c }; else delete h.own;
    }
    /* the chip for one own entry: on, with an x; a tap removes it */
    function chipHTML(kind, text, l) {
        const c = clean(text);
        return '<button type="button" class="r2-chip on r2-ownchip" data-noi18n aria-label="' + esc(tx('rm', l, c)) + '" data-r2own-rm="' + esc(kind) + '" data-own="' + esc(c) + '"><span>' + esc(c) + '</span><i aria-hidden="true">\u00d7</i></button>';
    }
    /* the type-your-own row under a chip list */
    function rowHTML(kind, l, id) {
        const k = kind === 'conds' ? 'conds' : 'goals';
        return '<div class="r2-ownadd" data-noi18n data-kind="' + k + '"><input id="' + esc(id) + '" type="text" maxlength="' + LEN + '" enterkeyhint="done" autocomplete="off" data-r2own-in="' + k + '" aria-label="' + esc(tx(k + 'Lb', l)) + '" placeholder="' + esc(tx(k + 'Ph', l)) + '">' +
            '<button type="button" class="r2-btn r2-ownbtn" data-r2own-add="' + k + '">' + esc(tx('add', l)) + '</button></div>' +
            '<div class="r2-ownmsg" data-noi18n role="status" aria-live="polite"></div>';
    }
    return { MAX, LEN, TX, tx, clean, list, add, read, write, chipHTML, rowHTML };
});
