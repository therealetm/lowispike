/* cook-tab-order.js (26 Oct 2026, MAYA-HANDOFF 0.29): Cook's game switch is Kitchen | Shuffle | Swipe by default, Cook opens on
   the FIRST tab of the order, and a hold on a Cook tab lifts it so it can be dragged to a new place. Emmanuel: "move Kitchen to
   where Shuffle is, so that when they open Cook, it's the first thing that opens. And also give them the option to manually
   readjust it, just like they can manually readjust the Community chat."
   The hold-and-drag itself is Community's engine (community-tab-order.js, LowiCommunityTabs.row); this file only holds the
   Cook order, the first-tab rule and the wiring. Order saved per device in lowispike.cook.tabs (like lowispike.community.tabs).
   index.html: ckBarHTML draws the tabs in ckOrder(), fView() falls back to ckFirst(), goTab() calls opening() before Cook
   renders. Anything that opens Cook on a given game (LowiFood.setView: Kitchen links/tour, Help me pick, Swaflo) wins. */
(function (root) {
    'use strict';
    /* Oct 28 2026 (Emmanuel: "schmeiß die Küche raus"): the Kitchen game is gone, Cook is Shuffle | Swipe. A saved order that still
       names 'kitchen' loses it in normalize(), so nobody lands on an empty tab. */
    const IDS = ['shuffle', 'swipe'];
    const KEY = 'lowispike.cook.tabs', VIEW = 'lowi.cook.view';
    const FRESH_MS = 3000;

    function normalize(list) {
        const out = [];
        (Array.isArray(list) ? list : []).forEach(id => { if (IDS.includes(id) && !out.includes(id)) out.push(id); });
        IDS.forEach(id => { if (!out.includes(id)) out.push(id); });
        return out;
    }
    function parse(raw) { try { return normalize(JSON.parse(raw)); } catch (e) { return IDS.slice(); } }
    function moveTo(list, id, to) {
        const l = normalize(list).filter(x => x !== id);
        l.splice(Math.max(0, Math.min(l.length, to)), 0, id);
        return normalize(l);
    }
    /* Kitchen only counts when its game loaded (ckBarHTML draws no Kitchen button without it) */
    function first(order, hasKitchen) { return normalize(order).find(id => id !== 'kitchen' || hasKitchen) || 'shuffle'; }
    function openView(order, hasKitchen, wanted) { return wanted ? null : first(order, hasKitchen); }

    const core = { IDS, KEY, FRESH_MS, normalize, parse, moveTo, first, openView };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!root || !root.document) return;

    const W = root, D = W.document;
    const lang = () => { const l = String((D.documentElement && D.documentElement.lang) || 'en').slice(0, 2); return l === 'de' ? 1 : l === 'es' ? 2 : 0; };
    function order() { try { return parse(W.localStorage.getItem(KEY)); } catch (e) { return IDS.slice(); } }
    function save(list) {
        const v = JSON.stringify(normalize(list));
        try { if (W.localStorage.getItem(KEY) !== v) W.localStorage.setItem(KEY, v); } catch (e) { }
    }
    const hasKitchen = () => !!W.LowiKitchenGame;

    /* a game asked for on purpose (LowiFood.setView from a link, the tour, Help me pick, Swaflo) right around the open wins */
    let wantStamp = 0, rawSet = null;
    function hook() {
        const F = W.LowiFood;
        if (!F || typeof F.setView !== 'function' || F.setView.__ckWant) return;
        rawSet = F.setView;
        const wrapped = function (v) { wantStamp = Date.now(); return rawSet.apply(this, arguments); };
        wrapped.__ckWant = true;
        F.setView = wrapped;
    }
    const wanted = () => !!wantStamp && Date.now() - wantStamp < FRESH_MS;
    function setRaw(v) {
        hook();
        if (rawSet) { try { rawSet.call(W.LowiFood, v); return; } catch (e) { } }
        try { W.localStorage.setItem(VIEW, v); } catch (e) { }
    }
    /* goTab('shelf') calls this before Cook renders, so the first frame is already the first tab */
    function opening() {
        hook();
        const v = openView(order(), hasKitchen(), wanted());
        if (!v) return;
        let cur = null; try { cur = W.localStorage.getItem(VIEW); } catch (e) { }
        if (cur !== v) setRaw(v);
    }

    /* ---- hold-and-drag: Community's engine on Cook's row ---- */
    const HINT = ['Hold a tab to move it', 'Halte einen Tab, um ihn zu verschieben', 'Mantén pulsada una pestaña para moverla'];
    const ROW = {
        tab: '.ck-b[data-ck="view"]',
        id: b => b.dataset.v,
        save: l => save(l),
        move: moveTo,
        apply: t => {
            if (!t || t.classList.contains('rm-arranging')) return;
            order().forEach(id => { const b = t.querySelector('.ck-b[data-ck="view"][data-v="' + id + '"]'); if (b) t.appendChild(b); });
        },
        after: () => { },
        hint: () => HINT[lang()]
    };
    function wireFrom(target) {
        const t = target && target.closest && target.closest('#ckBar .ck-view');
        if (!t || t.dataset.order === '1') return;
        const E = W.LowiCommunityTabs; if (!E || !E.row) return;
        E.row(t, ROW);
    }
    /* ckBar is redrawn often (outerHTML), so the row is wired on the first touch or focus, in capture before its own listeners */
    D.addEventListener('pointerdown', e => wireFrom(e.target), true);
    D.addEventListener('focusin', e => wireFrom(e.target), true);
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', hook); else hook();

    W.LowiCookTabs = Object.assign({ order, save, opening, wanted, first: () => first(order(), hasKitchen()) }, core);
})(typeof window !== 'undefined' ? window : null);
