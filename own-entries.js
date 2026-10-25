/* own-entries.js (Oct 25 2026). Eman (handoff from the other account): at "I want" (Ich möchte) and "Anything we should look
   out for?" (Worauf sollen wir achten?) people can type their own option and add it with an Add (Hinzufügen / Añadir) button.
   Oct 25, later (Emmanuel's call, made for him): ONE place to type under "watch out for". The Oct 23 free-text line
   (S.health.condNote) is gone from the screen; whatever someone wrote there is folded into own condition chips (fold, split
   at commas, semicolons, slashes (not 50/100), plus signs; long parts wrapped at a word), so nothing anyone wrote is lost. Only what
   does not fit in the six chips stays in condNote (fold().left) and keeps showing in Your details until there is room.
   - Each own entry becomes a chip with a small x; tapping it removes it. At most 6 per list, 40 characters, no markup.
   - Stored in S.health.own = { goals: [...], conds: [...] }: S.health is PRIVATE_KEYS, so it stays on this phone.
   - Typed words are wrapped in data-noi18n so the app's translator never changes them.
   - Own entries never change tips or scores; they are the person's own words, shown back to them.
   API (window.LowiOwnEntries, also require()-able for tests): clean, list, add, read, fold, splitNote, write, rowHTML, chipHTML, tx, MAX, LEN */
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
    /* the old free-text condition line, cut into chip-sized parts: "Hashimoto, Eisenmangel; Asthma" -> 3 parts. A part longer
       than LEN is wrapped at a word (never cut mid-word unless one word is longer than LEN), so every word stays. */
    function splitNote(note) {
        const s = String(note == null ? '' : note).replace(/[\u0000-\u001f\u007f<>]/g, ' '), out = [];
        s.split(/\s*(?:[,;|+\u00b7\u2022]|\/(?!\d)|\s[-\u2013\u2014]\s)\s*/).forEach(part => {
            let p = part.replace(/\s+/g, ' ').trim().replace(/^[-\u2013\u2014.\s]+|[.\s]+$/g, '');
            while (p.length > LEN) {
                let cut = p.lastIndexOf(' ', LEN);
                if (cut < 1) cut = LEN;
                out.push(p.slice(0, cut).trim()); p = p.slice(cut).trim();
            }
            if (p) out.push(p);
        });
        return out;
    }
    /* own entries plus the old note folded in. left = the parts that did not fit in six chips (kept, never dropped) */
    function fold(h) {
        const o = h && h.own && typeof h.own === 'object' ? h.own : {};
        let conds = list(o.conds);
        const left = [];
        splitNote(h && typeof h.condNote === 'string' ? h.condNote : '').forEach(p => {
            const r = add(conds, p);
            if (r.added) conds = r.list; else if (r.why === 'full') left.push(p);
        });
        return { goals: list(o.goals), conds, left: left.join(', ') };
    }
    function read(h) { const f = fold(h); return { goals: f.goals, conds: f.conds }; }
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
    return { MAX, LEN, TX, tx, clean, list, add, read, fold, splitNote, write, chipHTML, rowHTML };
});
