/* meal-kitchen-core.js — "Add to kitchen" on a shared meal (Oct 25 2026, task a33a6ac1).
   Emmanuel: "if someone posted a meal in the community, we need an add to kitchen button; it then adds all the products into
   their kitchen from the picture that they just saw in the community or on the For You page. That's why it's important that
   the products are also, minimalistically, efficiently, included."
   Pure: no DOM, no storage. The foods come only from what the post already carries:
   - a person's meal: the stored detail items (messages.meal / posts meta.detail, meal-detail-core.js clean(): items [{name, portion, v}])
     or the For You meal card items (meta.meal, meal-photo.js: items [{name, portion}])
   - a bot recipe post (Nibblo): that Recipe Book recipe's ingredients ({ing:[{g, n, q}]} or ["g|name"])
   No foods -> no button (nothing is guessed). Writing goes through LowiKitchenCore.add, so the Kitchen's own dedupe holds. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiMealKitchenCore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
    'use strict';
    const MAX = 10, NAME = 60;
    const req = (name, glob) => { try { if (root && root[glob]) return root[glob]; return typeof require === 'function' ? require('./' + name) : null; } catch (e) { return null; } };
    const KC = () => req('kitchen-core.js', 'LowiKitchenCore');
    const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    /* tap water is not something you keep in a kitchen */
    const SKIP = { water: 1, wasser: 1, agua: 1, 'tap water': 1, leitungswasser: 1, 'agua del grifo': 1 };
    /* one food name as the Kitchen keeps it: no " · 200 g", no "(1 cup)", no leading emoji, no control chars */
    function foodName(s) {
        let n = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ');
        n = n.split(' · ')[0].replace(/\s*\([^)]*\)\s*/g, ' ');
        n = n.replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s+/g, ' ').trim();
        return n.slice(0, NAME).trim();
    }
    function uniq(names) {
        const seen = {}, out = [];
        for (const raw of names) {
            const n = foodName(raw), k = norm(n);
            if (!k || SKIP[k] || seen[k]) continue;
            seen[k] = 1; out.push(n);
            if (out.length >= MAX) break;
        }
        return out;
    }
    /* a stored meal detail / meal card -> its food names (empty when it has none) */
    function foodsOfDetail(d) {
        if (!d || typeof d !== 'object' || !Array.isArray(d.items)) return [];
        return uniq(d.items.map(x => (x && typeof x === 'object' ? x.name : typeof x === 'string' ? x : '')));
    }
    /* a Recipe Book recipe -> its ingredient names (index.html shape {n, g, q} or the raw "g|name" strings) */
    function foodsOfRecipe(r) {
        if (!r || typeof r !== 'object' || !Array.isArray(r.ing)) return [];
        return uniq(r.ing.map(x => (x && typeof x === 'object' ? x.n : typeof x === 'string' ? x.split('|').pop() : '')));
    }
    /* add every food once: {state, added:[{id, n}], had:[names]} — had = already in the kitchen, left as it was */
    function addAll(st, names, now, from) {
        const K = KC(); if (!K) return { state: st, added: [], had: [] };
        let s = K.parse(st);
        const added = [], had = [];
        uniq(Array.isArray(names) ? names : []).forEach((n, i) => {
            if (K.has(s, n)) { had.push(n); return; }
            const next = K.add(s, n, (Number(now) || Date.now()) + i, from === 'cart' ? 'cart' : 'me');
            const it = next.items[next.items.length - 1];
            if (next.items.length > s.items.length && it) added.push({ id: it.id, n: it.n });
            s = next;
        });
        return { state: s, added, had };
    }
    /* undo: takes out exactly what that tap put in (things added since, or already there before, stay) */
    function undo(st, ids) {
        const K = KC(); if (!K) return st;
        let s = K.parse(st);
        (Array.isArray(ids) ? ids : []).forEach(id => { s = K.drop(s, id).state; });
        return s;
    }
    /* which of these foods are not at home yet */
    function missing(st, names) { const K = KC(); if (!K) return names.slice(); const s = K.parse(st); return names.filter(n => !K.has(s, n)); }

    const STR = {
        en: { add: 'Add to kitchen', addA: 'Add {n} foods to your kitchen: {list}', addA1: 'Add to your kitchen: {list}', done: '✓ {n} in your kitchen', done1: '✓ In your kitchen', have: '✓ All in your kitchen', had: '{n} already there', undo: 'Undo', undoA: 'Undo: take them out of your kitchen again', undone: 'Taken out again', more: '+{n}' },
        de: { add: 'In die Küche', addA: '{n} Lebensmittel in deine Küche: {list}', addA1: 'In deine Küche: {list}', done: '✓ {n} in deiner Küche', done1: '✓ In deiner Küche', have: '✓ Alles in deiner Küche', had: '{n} schon da', undo: 'Rückgängig', undoA: 'Rückgängig: wieder aus deiner Küche nehmen', undone: 'Wieder rausgenommen', more: '+{n}' },
        es: { add: 'A mi cocina', addA: 'Añadir {n} alimentos a tu cocina: {list}', addA1: 'Añadir a tu cocina: {list}', done: '✓ {n} en tu cocina', done1: '✓ En tu cocina', have: '✓ Todo en tu cocina', had: '{n} ya estaban', undo: 'Deshacer', undoA: 'Deshacer: sacarlos otra vez de tu cocina', undone: 'Sacados otra vez', more: '+{n}' }
    };
    const lang = (l) => { try { l = l || (root && root.LowiLang && root.LowiLang.get && root.LowiLang.get()) || (root && root.localStorage && root.localStorage.getItem('lowispike.lang')) || (root && root.document && root.document.documentElement.lang) || 'en'; } catch (e) { l = 'en'; } l = String(l).slice(0, 2).toLowerCase(); return STR[l] ? l : 'en'; };
    const t = (k, l, v) => { let s = (STR[lang(l)] || STR.en)[k]; if (s == null) s = STR.en[k]; if (v) for (const x in v) s = s.split('{' + x + '}').join(String(v[x])); return s; };
    const BASKET = '<svg class="mk-ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h16l-1.6 8.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8z"/><path d="M9 10l3-6 3 6"/></svg>';
    /* the compact foods line: the first three, then +N (the full list is in the button's label for screen readers) */
    function foodsLine(foods) {
        const shown = foods.slice(0, 3).map(esc).join(' · ');
        return shown + (foods.length > 3 ? ' <span class="mk-more">' + esc(t('more', null, { n: foods.length - 3 })) + '</span>' : '');
    }
    /* o: {key, foods, st:'add'|'done'|'have', added:n, had:n, undo:bool, where:'chat'|'fy'} */
    function rowHTML(o, l) {
        if (!o || !o.key || !Array.isArray(o.foods) || !o.foods.length) return '';
        l = lang(l);
        const k = esc(o.key), cls = 'mk-row mk-' + (o.where === 'fy' ? 'fy' : 'chat');
        if (o.st === 'done' || o.st === 'have') {
            const msg = o.st === 'have' ? t('have', l) : (o.added === 1 && !o.had ? t('done1', l) : t('done', l, { n: o.added }));
            return '<div class="' + cls + ' mk-on" data-mk-key="' + k + '"><span class="mk-ok" role="status">' + esc(msg) +
                (o.st === 'done' && o.had ? ' <span class="mk-had">· ' + esc(t('had', l, { n: o.had })) + '</span>' : '') + '</span>' +
                (o.st === 'done' && o.undo ? '<button type="button" class="mk-undo" data-mk="undo" data-mk-key="' + k + '" aria-label="' + esc(t('undoA', l)) + '">' + esc(t('undo', l)) + '</button>' : '') + '</div>';
        }
        const list = o.foods.join(', ');
        return '<div class="' + cls + '" data-mk-key="' + k + '"><button type="button" class="mk-btn" data-mk="add" data-mk-key="' + k + '" aria-label="' +
            esc(o.foods.length === 1 ? t('addA1', l, { list }) : t('addA', l, { n: o.foods.length, list })) + '">' + BASKET + '<span>' + esc(t('add', l)) + '</span></button>' +
            '<span class="mk-foods" aria-hidden="true">' + foodsLine(o.foods) + '</span>' +
            (o.note ? '<span class="mk-note" role="status">' + esc(o.note) + '</span>' : '') + '</div>';
    }
    return Object.freeze({ MAX, foodName, uniq, foodsOfDetail, foodsOfRecipe, addAll, undo, missing, rowHTML, foodsLine, lang, t, norm, STR });
});
