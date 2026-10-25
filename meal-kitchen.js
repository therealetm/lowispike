/* meal-kitchen.js — the DOM side of "Add to kitchen" on a shared meal (Oct 25 2026, task a33a6ac1; pure part meal-kitchen-core.js).
   - Chat / Circles: community-chat.js msgBody() appends LowiMealKitchen.chatHTML(m, ph) right after the meal label.
   - For You / Tribe: index.html appends LowiMealKitchen.fyHTML(p) right after the meal-details chip.
   One tap puts the meal's foods into the viewer's own Kitchen "At home" (lowispike.kitchen.v1, the same key and the same
   LowiKitchenCore.add the Kitchen tab uses, so it travels with the account and never doubles an entry). The row then says how
   many went in, with Undo for a few seconds. Posts that carry no foods get no button. Own click handler (data-mk), capture phase,
   so the chat bubble menu, the photo viewer and For You's tap/like never see the tap. */
(function (root) {
    'use strict';
    const C = root.LowiMealKitchenCore, D = root.document;
    if (!C || !D) return;
    const KC = () => root.LowiKitchenCore || null;
    const UNDO_MS = 15000;
    const ctx = {};   /* key -> {foods, where} from the last render */
    const done = {};  /* key -> {ids, added, had, undo} for this session */
    function kitRaw() { try { return root.localStorage.getItem(KC().KEY); } catch (e) { return null; } }
    function kitSave(st) {
        const K = KC();
        try { root.localStorage.setItem(K.KEY, JSON.stringify(st)); } catch (e) { return false; }
        try { root.dispatchEvent(new CustomEvent('lowi:kitchen', { detail: { count: K.count(st), from: 'meal' } })); } catch (e) {}
        return true;
    }
    /* the viewer's language for recipe ingredient names (the Recipe Book rows are registered in LowiLang) */
    const tr = n => { try { return root.LowiLang && root.LowiLang.t ? root.LowiLang.t(n) : n; } catch (e) { return n; } };
    function book() {
        try { if (typeof RECIPE_BOOK !== 'undefined' && Array.isArray(RECIPE_BOOK)) return RECIPE_BOOK; } catch (e) {} /* eslint-disable-line no-undef */
        try { return root.LowiAllRecipes ? root.LowiAllRecipes() : []; } catch (e) { return []; }
    }
    function recipeFoods(id) {
        if (!id || !/^rb_/.test(String(id))) return [];
        const r = book().find(x => x && x.id === id);
        return r ? C.uniq(C.foodsOfRecipe(r).map(tr)) : [];
    }
    const MD = () => root.LowiMealDetail || null;
    const isBot = x => { try { return !!(MD() && MD().isBot && MD().isBot(x)); } catch (e) { return false; } };
    const clean = d => { try { const M = root.LowiMealDetailCore; return M && M.clean ? M.clean(d) : (d && typeof d === 'object' ? d : null); } catch (e) { return null; } };
    /* Chat / Circles: m the message, ph community-chat's photoOf(m) ({src, meal}) */
    function foodsOfMsg(m, ph) {
        if (!m || !m.id || !ph || !ph.meal) return [];
        if (isBot(m)) { let id = ''; try { id = MD().botInfo('chat', m, {}).bookId; } catch (e) { id = ''; } return recipeFoods(id); }
        return C.foodsOfDetail(clean(m.md));
    }
    /* For You / Tribe post: meta.detail (shared from Community), else the meal card items (meta.meal); a bot post: its recipe */
    function foodsOfPost(p) {
        if (!p || !p.id) return [];
        const meta = p.meta && typeof p.meta === 'object' ? p.meta : {};
        if (isBot(p)) { let id = /^rb_/.test(String(p.rec || '')) ? p.rec : ''; if (!id) { try { id = MD().botInfo('foryou', p, {}).bookId; } catch (e) { id = ''; } } return recipeFoods(id); }
        let f = C.foodsOfDetail(clean(meta.detail));
        if (!f.length && meta.meal && typeof meta.meal === 'object') {
            let card = null; try { const S = root.LowiMealSnap; card = S && S.clean ? S.clean(meta.meal) : null; } catch (e) { card = null; }
            f = C.foodsOfDetail(card);
        }
        return f;
    }
    function stateOf(key, foods) {
        const d = done[key];
        if (d) return { st: 'done', added: d.added, had: d.had, undo: d.undo };
        let miss = foods; try { miss = C.missing(kitRaw(), foods); } catch (e) {}
        return { st: miss.length ? 'add' : 'have' };
    }
    function html(key, foods, where, note) {
        if (!foods.length || !KC()) return '';
        ctx[key] = { foods, where };
        return C.rowHTML(Object.assign({ key, foods, where, note: note || '' }, stateOf(key, foods)));
    }
    function chatHTML(m, ph) { try { return html('c:' + m.id, foodsOfMsg(m, ph), 'chat'); } catch (e) { return ''; } }
    function fyHTML(p) { try { return html('f:' + p.id, foodsOfPost(p), 'fy'); } catch (e) { return ''; } }
    const sel = k => '.mk-row[data-mk-key="' + (root.CSS && root.CSS.escape ? root.CSS.escape(k) : String(k).replace(/["\\]/g, '\\$&')) + '"]';
    function repaint(key, note, focus) {
        const c = ctx[key]; if (!c) return;
        D.querySelectorAll(sel(key)).forEach(el => {
            const w = D.createElement('div'); w.innerHTML = html(key, c.foods, c.where, note);
            const nu = w.firstElementChild; if (!nu) return;
            el.replaceWith(nu);
            if (focus) { const f = nu.querySelector(focus) || nu.querySelector('button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }
        });
    }
    function add(key) {
        const c = ctx[key], K = KC(); if (!c || !K || done[key]) return null;
        const r = C.addAll(kitRaw(), c.foods, Date.now(), 'me');
        if (r.added.length && !kitSave(r.state)) return null;
        done[key] = { ids: r.added.map(i => i.id), added: r.added.length, had: r.had.length, undo: r.added.length > 0 };
        if (!r.added.length) delete done[key]; /* everything was already at home: the row just says so */
        repaint(key, '', '.mk-undo');
        if (done[key]) setTimeout(() => { if (done[key] && done[key].undo) { done[key].undo = false; repaint(key); } }, UNDO_MS);
        return r;
    }
    function undo(key) {
        const d = done[key], K = KC(); if (!d || !K || !d.undo) return false;
        kitSave(C.undo(kitRaw(), d.ids));
        delete done[key];
        repaint(key, C.t('undone'), '.mk-btn');
        return true;
    }
    D.addEventListener('click', (e) => {
        const b = e.target && e.target.closest ? e.target.closest('[data-mk]') : null; if (!b) return;
        e.preventDefault(); e.stopPropagation();
        const key = b.getAttribute('data-mk-key') || '';
        if (b.getAttribute('data-mk') === 'add') add(key); else if (b.getAttribute('data-mk') === 'undo') undo(key);
    }, true);
    /* the Kitchen changed somewhere else (Kitchen tab, Bought, another post): rows that are not mid-Undo show the new truth */
    let pend = 0;
    root.addEventListener('lowi:kitchen', () => {
        if (pend) return;
        pend = setTimeout(() => { pend = 0; try { D.querySelectorAll('.mk-row[data-mk-key]').forEach(el => { const k = el.getAttribute('data-mk-key'); if (ctx[k] && !done[k]) repaint(k); }); } catch (e) {} }, 0);
    });
    root.LowiMealKitchen = { chatHTML, fyHTML, foodsOfMsg, foodsOfPost, add, undo, addNames: (names, from) => { const K = KC(); if (!K) return null; const r = C.addAll(kitRaw(), names, Date.now(), from); if (r.added.length) kitSave(r.state); return { added: r.added.map(i => i.n), had: r.had, undo: () => kitSave(C.undo(kitRaw(), r.added.map(i => i.id))) }; } };
})(typeof window !== 'undefined' ? window : this);
