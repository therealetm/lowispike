/* bot-recipe-core.js — pure logic for the Community recipe card buttons (MAYA-HANDOFF 0.18, Emmanuel Oct 26 2026):
   "let's have the button be in a way where people understand that they can click on it to save, or to cook, or to open,
   or to add into their kitchen. When I add to kitchen, the products are then added to the kitchen wardrobe."
   - rowHTML: the labelled buttons under a Nibblo recipe card (Open recipe / Cook it / Save / Add to kitchen) and under a
     person's meal with foods (Add to kitchen only). EN / DE / ES.
   - foods / foodsOfDetail: the products of a recipe (Recipe Book ingredients) or of a posted meal, once each, no tap water or ice.
   - addAll / undo / status / inKitchen: the products go into the Kitchen "At home" list (lowispike.kitchen.v1, LowiKitchenCore),
     in the phone's language, never twice; Undo takes out only what that tap put in.
   No DOM here: bot-recipe.js draws and wires it. */
(function (root, factory) {
    const api = factory(root);
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root) root.LowiBotRecipeCore = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function (root) {
    'use strict';
    const KC = () => (root && root.LowiKitchenCore) || (typeof require === 'function' ? require('./kitchen-core.js') : null);
    const STR = {
        open: ['Open recipe', 'Rezept öffnen', 'Abrir receta'],
        cook: ['Cook it', 'Kochen', 'Cocinar'],
        save: ['Save', 'Merken', 'Guardar'],
        saved: ['Saved', 'Gemerkt', 'Guardada'],
        kitchen: ['Add to kitchen', 'In die Küche', 'A mi cocina'],
        inKitchen: ['{n} in your kitchen', '{n} in deiner Küche', '{n} en tu cocina'],
        allHave: ['All in your kitchen', 'Alles in deiner Küche', 'Todo en tu cocina'],
        undo: ['Undo', 'Rückgängig', 'Deshacer'],
        openA: ['Open the recipe: where to buy, prices, ingredients', 'Rezept öffnen: wo kaufen, Preise, Zutaten', 'Abrir la receta: dónde comprar, precios, ingredientes'],
        cookA: ['Cook it step by step', 'Schritt für Schritt kochen', 'Cocinar paso a paso'],
        saveA: ['Save to your recipes', 'In deinen Rezepten merken', 'Guardar en tus recetas'],
        kitchenA: ['Put the {n} products into your Kitchen (At home)', 'Die {n} Produkte in deine Küche legen (Zuhause)', 'Poner los {n} productos en tu cocina (En casa)'],
        kitchenA1: ['Put the foods into your Kitchen (At home)', 'Die Lebensmittel in deine Küche legen (Zuhause)', 'Poner los alimentos en tu cocina (En casa)'],
        added: ['Added to your Kitchen: {list}', 'In deiner Küche: {list}', 'En tu cocina: {list}'],
        hadAll: ['Already in your Kitchen', 'Schon in deiner Küche', 'Ya está en tu cocina'],
        undone: ['Taken out of your Kitchen again', 'Wieder aus der Küche genommen', 'Quitado de tu cocina'],
        savedT: ['Saved to your recipes', 'In deinen Rezepten gemerkt', 'Guardada en tus recetas'],
        unsavedT: ['Removed from your recipes', 'Aus deinen Rezepten entfernt', 'Quitada de tus recetas']
    };
    const LI = { en: 0, de: 1, es: 2 };
    const L = l => (LI[String(l || 'en').slice(0, 2)] != null ? LI[String(l || 'en').slice(0, 2)] : 0);
    const t = (k, l, n) => String((STR[k] || [k])[L(l)] || (STR[k] || [k])[0]).replace('{n}', n == null ? '' : n);
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const norm = s => (KC() ? KC().norm(s) : String(s || '').toLowerCase().trim());
    /* free from the tap, never a product you buy or keep */
    const FREE = /^(?:cold |hot |warm |sparkling |tap )?water$|^ice(?: cubes?)?$|^wasser$|^eis(?:würfel)?$|^agua$|^hielo$/i;
    /* "🥑 Avocado", "Salmon · 150 g", "Rice (1 cup)" -> the product name */
    const bare = s => String(s == null ? '' : s).split(' · ')[0].replace(/\([^)]*\)/g, ' ')
        .replace(/^[^\p{L}\p{N}]+/u, '').replace(/\s+/g, ' ').trim();

    /* Recipe Book ingredients [{k,n,...}] -> [{n}] once each, no water/ice */
    function foods(ing) {
        const seen = {}, out = [];
        (Array.isArray(ing) ? ing : []).forEach(i => {
            const n = bare(i && (i.n || i.name || i.k));
            const k = norm(n);
            if (!k || FREE.test(n) || seen[k]) return;
            seen[k] = 1; out.push({ n });
        });
        return out;
    }
    /* a posted meal's detail ({items:[{name}]} or ["name"]) -> [{n}] */
    function foodsOfDetail(md) {
        const items = md && (Array.isArray(md) ? md : (md.items || md.foods || md.f)) || [];
        return foods(items.map(i => (typeof i === 'string' ? { n: i } : { n: i && (i.name || i.n) })));
    }
    const tr0 = s => s;
    /* is this product in the Kitchen, under its own name or its translation? */
    function inKitchen(st, food, tr) {
        const K = KC(); if (!K || !food) return false;
        st = K.parse(st); tr = tr || tr0;
        return K.has(st, food.n) || K.has(st, tr(food.n));
    }
    /* 'have' when every product is already at home, else 'add' */
    function status(st, list, tr) {
        list = Array.isArray(list) ? list : [];
        return list.length && list.every(f => inKitchen(st, f, tr)) ? 'have' : 'add';
    }
    /* put every product into the Kitchen -> {state, added:[{id,n}], had:[name]} */
    function addAll(st, list, now, tr) {
        const K = KC(); tr = tr || tr0;
        st = K.parse(st);
        const added = [], had = [];
        (Array.isArray(list) ? list : []).forEach(f => {
            if (inKitchen(st, f, tr)) {
                const k1 = norm(f.n), k2 = norm(tr(f.n));
                const hit = st.items.find(i => norm(i.n) === k1 || norm(i.n) === k2);
                had.push(hit ? hit.n : f.n); return;
            }
            const name = String(tr(f.n) || f.n);
            const before = st.items.length;
            st = K.add(st, name, now, 'me');
            if (st.items.length > before) { const it = st.items[st.items.length - 1]; added.push({ id: it.id, n: it.n }); }
        });
        return { state: st, added, had };
    }
    /* Undo: only the entries that one tap added */
    function undo(st, ids) {
        const K = KC(); st = K.parse(st);
        (Array.isArray(ids) ? ids : []).forEach(id => { st = K.drop(st, id).state; });
        return st;
    }
    /* the buttons. o: {key, id?, name?, foods?, saved?, kitchen:'add'|'have'|'done', added?, undo?, count?}
       id = Recipe Book id (bot recipe): all four. No id but foods (a person's meal): Add to kitchen only. */
    function rowHTML(o, l) {
        o = o || {};
        const id = o.id ? String(o.id) : '';
        const hasFoods = id || (Array.isArray(o.foods) && o.foods.length);
        if (!o.key || !hasFoods) return '';
        const k = ' data-key="' + esc(o.key) + '"' + (id ? ' data-id="' + esc(id) + '"' : '');
        const sig = ' data-crb-s="' + esc([o.kitchen || 'add', o.saved ? 1 : 0, o.added || 0, o.undo ? 1 : 0].join('.')) + '"';
        const btn = (a, ic, label, aria, extra) => '<button type="button" class="crb-b crb-' + a + '" data-crb="' + a + '"' + k + (extra || '') +
            ' aria-label="' + esc(aria || label) + '"><span class="crb-i" aria-hidden="true">' + ic + '</span><span class="crb-l">' + esc(label) + '</span></button>';
        let kit;
        if (o.kitchen === 'done') {
            kit = '<span class="crb-b crb-kitchen crb-on" role="status"' + k + '><span class="crb-i" aria-hidden="true">✓</span><span class="crb-l">' +
                esc(o.added ? t('inKitchen', l, o.added) : t('allHave', l)) + '</span></span>' +
                (o.undo ? '<button type="button" class="crb-undo" data-spend data-crb="undo"' + k + '>' + esc(t('undo', l)) + '</button>' : '');
        } else if (o.kitchen === 'have') {
            kit = '<span class="crb-b crb-kitchen crb-on" role="status"' + k + '><span class="crb-i" aria-hidden="true">✓</span><span class="crb-l">' + esc(t('allHave', l)) + '</span></span>';
        } else {
            /* BH-041: Add to kitchen turns into the status + Undo in place; data-spend keeps a double tap from undoing it at once */
            kit = btn('kitchen', '🧺', t('kitchen', l), o.count ? t('kitchenA', l, o.count) : t('kitchenA1', l), ' data-spend');
        }
        if (!id) return '<div class="crb-row crb-one" data-crb-row' + k + sig + '>' + kit + '</div>';
        return '<div class="crb-row" data-crb-row' + k + sig + '>' +
            btn('open', '📖', t('open', l), t('openA', l)) +
            btn('cook', '🍳', t('cook', l), t('cookA', l)) +
            btn('save', o.saved ? '★' : '☆', o.saved ? t('saved', l) : t('save', l), t('saveA', l), ' aria-pressed="' + (o.saved ? 'true' : 'false') + '"') +
            '<span class="crb-kwrap">' + kit + '</span></div>';
    }
    return Object.freeze({ STR, t, foods, foodsOfDetail, inKitchen, status, addAll, undo, rowHTML, bare });
});
