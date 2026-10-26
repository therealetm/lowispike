/* bot-recipe.js — Community recipe cards that do something (MAYA-HANDOFF 0.18, Emmanuel Oct 26 2026):
   "We should be able to click on it and then it opens... You know how when you go on Shuffle and you pick a food, that page
   that opens? That's what's supposed to happen."
   - registers LowiMealDetail.routeBot: a tap on a Nibblo recipe post's photo, dish name or spike label (Chat and For You) opens
     the SAME recipe page a Shuffle pick opens (LowiP2.open — where to buy, prices, what's at home, ingredients). No second page.
   - LowiBotRecipe.chatRow(m): the labelled buttons under the card: Open recipe / Cook it / Save / Add to kitchen
     (a person's meal with foods: Add to kitchen only). Logic and words in bot-recipe-core.js.
   - Add to kitchen puts the products into Cook > Kitchen (lowispike.kitchen.v1), once each, with Undo, and the recipe
     page then counts them as at home. The recipe page's own "Add to kitchen" button (index.html) uses the same handler. */
(function (root) {
    'use strict';
    const C = root.LowiBotRecipeCore; if (!C || !root.document) return;
    const D = root.document;
    const lang = () => { try { return (root.LowiLang && root.LowiLang.get && root.LowiLang.get()) || localStorage.getItem('lowispike.lang') || 'en'; } catch (e) { return 'en'; } };
    const tr = s => { try { return root.LowiLang && root.LowiLang.t ? root.LowiLang.t(s) || s : s; } catch (e) { return s; } };
    const say = m => { try { if (root.LowiR2 && root.LowiR2.toast) root.LowiR2.toast(m); else if (typeof root.toast === 'function') root.toast(m); } catch (e) {} };
    const KC = () => root.LowiKitchenCore;
    const P2 = () => root.LowiP2;
    const recipe = id => { try { return id && P2() && P2().rec ? P2().rec(id) : null; } catch (e) { return null; } };
    /* the last Add to kitchen per card, for its Undo (this session only) */
    const done = {};

    function kitState() { const K = KC(); try { return K.parse(localStorage.getItem(K.KEY)); } catch (e) { return K.parse(null); } }
    function kitSave(st) {
        const K = KC();
        try { localStorage.setItem(K.KEY, JSON.stringify(st)); } catch (e) { return false; }
        try { root.dispatchEvent(new CustomEvent('lowi:kitchen', { detail: { n: K.count(st) } })); } catch (e) {}
        return true;
    }

    /* the recipe page a Shuffle pick opens */
    function open(id) { if (!P2() || !P2().open || !recipe(id)) return false; root.LowiP2.open(id); return true; }
    function cook(id) { if (!P2() || !P2().open || !recipe(id)) return false; root.LowiP2.open(id, { cook: true }); return true; }

    if (root.LowiMealDetail && root.LowiMealDetail.routeBot) {
        root.LowiMealDetail.routeBot(info => {
            const id = info && info.bookId;
            if (!open(id)) throw new Error('no recipe ' + id); /* openBot -> false: nothing else opens */
        });
    }

    /* the foods a card's Add to kitchen puts away: {key, id?, foods:[{n}]} */
    function cardOf(m) {
        if (!m || !m.id) return null;
        const MD = root.LowiMealDetail;
        if (MD && MD.isBot && MD.isBot(m)) {
            const info = MD.botInfo ? MD.botInfo('chat', m) : null;
            const r = info && recipe(info.bookId);
            return r ? { key: 'c' + m.id, id: r.id, foods: C.foods(r.ing) } : null;
        }
        const f = C.foodsOfDetail(m.md);
        return f.length ? { key: 'c' + m.id, foods: f } : null;
    }
    function rowOf(card) {
        if (!card) return '';
        const d = done[card.key];
        const st = kitState();
        let kitchen = C.status(st, card.foods, tr);
        if (d && d.ids.length && d.ids.every(id => st.items.some(i => i.id === id))) kitchen = 'done';
        let saved = false; try { saved = !!(card.id && root.LowiBook && root.LowiBook.has(card.id)); } catch (e) {}
        return C.rowHTML({ key: card.key, id: card.id, foods: card.foods.map(f => f.n), saved, kitchen, added: kitchen === 'done' ? d.ids.length : 0, undo: kitchen === 'done', count: card.foods.length }, lang());
    }
    const cards = {}; /* key -> card, for the clicks */
    function remember(m) { const c = cardOf(m); if (c) cards[c.key] = c; return c; }
    /* the row under a Chat recipe card (community-chat.js msgBody) */
    function chatRow(m) { try { return rowOf(remember(m)); } catch (e) { return ''; } }
    function cardFor(el) {
        const key = el.getAttribute('data-key') || '', id = el.getAttribute('data-id') || '';
        if (cards[key]) return cards[key];
        const r = recipe(id);
        return r ? (cards[key || ('r' + r.id)] = { key: key || ('r' + r.id), id: r.id, foods: C.foods(r.ing) }) : null;
    }
    /* after a tap: Chat redraws its own copy first (so a later Chat redraw cannot swap the row out from under the next tap),
       then any row Chat did not redraw is swapped here. Focus stays on the matching button. */
    function repaint(key, from) {
        const card = cards[key]; if (!card) return;
        const h = rowOf(card); if (!h) return;
        const tmp = D.createElement('div'); tmp.innerHTML = h;
        const fresh = tmp.firstElementChild; if (!fresh) return;
        const sig = fresh.getAttribute('data-crb-s');
        const want = from === 'kitchen' ? 'undo' : from === 'undo' ? 'kitchen' : from;
        const hadFocus = !!from && !!D.activeElement && !!D.activeElement.closest && !!D.activeElement.closest('[data-crb-row]');
        try { if (key.charAt(0) === 'c' && root.LowiCommunity && root.LowiCommunity.refresh) root.LowiCommunity.refresh(); } catch (e) {}
        D.querySelectorAll('[data-crb-row]').forEach(row => {
            if (row.getAttribute('data-key') !== key) return;
            if (row.getAttribute('data-crb-s') !== sig) { const n = fresh.cloneNode(true); row.replaceWith(n); row = n; }
            if (hadFocus && row.isConnected) { const f = row.querySelector('[data-crb="' + want + '"]') || row.querySelector('button'); try { if (f) f.focus({ preventScroll: true }); } catch (e) {} }
        });
    }
    /* the Kitchen changed (here, on a recipe page or in Cook > Kitchen): every card row says so */
    function refreshAll() {
        try { if (root.LowiCommunity && root.LowiCommunity.refresh) root.LowiCommunity.refresh(); } catch (e) {}
        D.querySelectorAll('[data-crb-row]').forEach(row => {
            const card = cards[row.getAttribute('data-key')]; if (!card) return;
            const h = rowOf(card); if (!h) return;
            const tmp = D.createElement('div'); tmp.innerHTML = h; const n = tmp.firstElementChild;
            if (n && row.getAttribute('data-crb-s') !== n.getAttribute('data-crb-s')) row.replaceWith(n);
        });
    }
    let kq = 0;
    root.addEventListener('lowi:kitchen', () => { if (kq) return; kq = setTimeout(() => { kq = 0; refreshAll(); }, 0); });
    function addKitchen(card) {
        const r = C.addAll(kitState(), card.foods, Date.now(), tr);
        if (r.added.length && !kitSave(r.state)) return;
        done[card.key] = { ids: r.added.map(x => x.id) };
        /* a product you marked "not at home" on this recipe before counts as at home now */
        try { if (card.id && P2() && P2().homeClear) P2().homeClear(card.id); } catch (e) {}
        const l = lang();
        say(r.added.length ? C.t('added', l).replace('{list}', r.added.map(x => x.n).join(', ')) : C.t('hadAll', l));
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) {}
    }
    function undoKitchen(card) {
        const d = done[card.key]; if (!d) return;
        kitSave(C.undo(kitState(), d.ids));
        delete done[card.key];
        try { if (card.id && P2() && P2().repaint) P2().repaint(); } catch (e) {}
        say(C.t('undone', lang()));
    }
    /* capture: the bubble around the row must not open its ··· menu on these taps */
    D.addEventListener('click', e => {
        const b = e.target && e.target.closest ? e.target.closest('[data-crb]') : null;
        if (!b || b.disabled) return;
        e.preventDefault(); e.stopPropagation();
        const card = cardFor(b); if (!card) return;
        cards[card.key] = card;
        const a = b.getAttribute('data-crb');
        if (a === 'open') open(card.id);
        else if (a === 'cook') cook(card.id);
        else if (a === 'save') {
            try { if (root.LowiBook) root.LowiBook.toggle(card.id); } catch (e) {} /* it says Saved / Removed itself */
        } else if (a === 'kitchen') addKitchen(card);
        else if (a === 'undo') undoKitchen(card);
        if (a === 'kitchen' || a === 'undo' || a === 'save') {
            repaint(card.key, a);
            try { if (card.id && P2() && P2().repaint && b.closest('#p2Rec')) P2().repaint(); } catch (e) {}
        }
    }, true);

    root.LowiBotRecipe = { chatRow, rowOf, cardOf, open, cook, remember };
})(typeof window !== 'undefined' ? window : this);
