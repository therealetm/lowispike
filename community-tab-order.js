/* community-tab-order.js (21 Oct 2026, Eman: "Make it so that people can long press on the sidebar under Community, so if they
   want Chat to be the first one they move Chat ... they can move Chat, Room, Creation, Affiliate").

   - Hold any Community tab (Room, Chat, Creation, Affiliates) for HOLD_MS: the row starts to wiggle, the tab lifts (haptic tap
     where the phone allows it), follow the finger left/right, let go to drop. A plain tap still just switches tabs.
   - Moving the finger more than SLOP px (or the page scrolling) before the hold ends cancels it: no accidental reorder.
   - The order is saved in localStorage under KEY. Every lowispike.* key is backed up to the user's account (user_state) and
     restored at sign-in, so a signed-in user gets the same order on every device.
   - Every time Community opens, it opens on the FIRST tab of the saved order (unless something opened a chat or a deep link).
   - While Community is open, html gets .cm-open: community-tab-order.css hides Cook and Move from the bottom bar there
     (both live on Home: Fuel's bloom has Cook, and holding Move opens the Move page).
   community-rooms-ui.js builds the tabs in this order (window.LowiCommunityTabs.order()). The pure helpers are exported for
   tests/community-tab-order.test.cjs. */
(function (root) {
    'use strict';
    const IDS = ['room', 'chat', 'create', 'aff'];
    const KEY = 'lowispike.community.tabs';
    const HOLD_MS = 450, SLOP = 10;
    function normalize(list) {
        const out = [];
        (Array.isArray(list) ? list : []).forEach(k => { if (IDS.includes(k) && !out.includes(k)) out.push(k); });
        IDS.forEach(k => { if (!out.includes(k)) out.push(k); });
        return out;
    }
    function parse(raw) { try { return normalize(JSON.parse(raw || 'null')); } catch (e) { return IDS.slice(); } }
    /* move the tab `id` to position `to` (0-based, clamped) */
    function moveTo(list, id, to) {
        const a = normalize(list).filter(k => k !== id);
        if (!IDS.includes(id)) return normalize(list);
        const i = Math.max(0, Math.min(a.length, to | 0));
        a.splice(i, 0, id);
        return a;
    }
    /* slot of a dragged tab: how many of the OTHER tabs' centres lie left of x */
    function slotAt(centers, x) { return centers.filter(c => c < x).length; }
    /* Oct 22 (item 33): what opening Community does, as a pure function so the rule is tested.
       first: the first tab of the order; view: LowiRoomsUI.view() ('' = Room or the chat room, 'chans' = Chat, 'aff', 'create');
       room: the chat room (thread) is open; fresh: something opened that chat room for this very visit (a reply from a Home
       visit, a comment link), not a chat room left open on the last visit; deep: a #community/... link.
       Returns null (leave it) or the call to make: 'room' | 'chat' | a view id. */
    const FRESH_MS = 1500;
    function firstAction(first, view, room, fresh, deep) {
        if (deep) return null;
        if (room && fresh) return null;
        first = IDS.includes(first) ? first : IDS[0];
        if (first === 'room') return room || view !== '' ? 'room' : null;
        if (first === 'chat') return room || view !== 'chans' ? 'chat' : null;
        return room || view !== first ? first : null;
    }
    const core = { IDS, KEY, HOLD_MS, SLOP, FRESH_MS, normalize, parse, moveTo, slotAt, firstAction };
    if (typeof module === 'object' && module.exports) module.exports = core;
    if (!root || !root.document) return;

    const W = root, D = W.document;
    function order() { try { return parse(W.localStorage.getItem(KEY)); } catch (e) { return IDS.slice(); } }
    function save(list) {
        const v = JSON.stringify(normalize(list));
        try { if (W.localStorage.getItem(KEY) !== v) W.localStorage.setItem(KEY, v); } catch (e) { }
    }
    function tabsEl() { return D.querySelector('#cmPaneChat .rm-tabs'); }
    function domOrder(t) { return [...t.querySelectorAll('.rm-tab')].map(b => b.dataset.rm); }
    function apply() {
        const t = tabsEl(); if (!t || t.classList.contains('rm-arranging')) return;
        const want = order();
        if (domOrder(t).join() === want.join()) return;
        want.forEach(id => { const b = t.querySelector('.rm-tab[data-rm="' + id + '"]'); if (b) t.appendChild(b); });
        try { W.LowiRoomsUI && W.LowiRoomsUI.paint && W.LowiRoomsUI.paint(); } catch (e) { }
    }

    /* haptics: Android vibrates; iOS Safari (18+) gives a tap when a switch checkbox toggles, so toggle a hidden one */
    let hapIn = null, hapLb = null;
    function haptic(ms) {
        try { if (W.navigator.vibrate && W.navigator.vibrate(ms)) return; } catch (e) { }
        try {
            if (!hapLb) {
                hapLb = D.createElement('label'); hapLb.setAttribute('aria-hidden', 'true');
                hapLb.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
                hapIn = D.createElement('input'); hapIn.type = 'checkbox'; hapIn.setAttribute('switch', ''); hapIn.tabIndex = -1;
                hapLb.appendChild(hapIn); D.body.appendChild(hapLb);
            }
            hapLb.click();
        } catch (e) { }
    }

    /* ---- the hold-and-drag ---- */
    let g = null, swallowUntil = 0;
    function centersOf(t, except) {
        const left = t.getBoundingClientRect().left;
        return [...t.querySelectorAll('.rm-tab')].filter(b => b !== except).map(b => left + b.offsetLeft + b.offsetWidth / 2);
    }
    function flip(t, fn, except) {
        const others = [...t.querySelectorAll('.rm-tab')].filter(b => b !== except);
        const before = new Map(others.map(b => [b, b.offsetLeft]));
        fn();
        others.forEach(b => {
            const dx = before.get(b) - b.offsetLeft; if (!dx) return;
            b.style.transition = 'none'; b.style.transform = 'translateX(' + dx + 'px)';
            void b.offsetWidth;
            b.style.transition = ''; b.style.transform = '';
        });
    }
    function follow(x) {
        const t = g.t, b = g.b, tr = t.getBoundingClientRect();
        const slot = slotAt(centersOf(t, b), x);
        const now = domOrder(t).indexOf(b.dataset.rm);
        if (slot !== now) {
            flip(t, () => { const ref = t.querySelectorAll('.rm-tab:not(.rm-lifted)')[slot] || null; t.insertBefore(b, ref); }, b);
            g.moved = true; haptic(6);
        }
        let want = x - tr.left - g.grab;
        want = Math.max(-4, Math.min(tr.width - b.offsetWidth + 4, want));
        b.style.transform = 'translateX(' + Math.round(want - b.offsetLeft) + 'px) scale(1.08)';
    }
    function lift() {
        if (!g || g.lifted) return;
        g.lifted = true;
        const t = g.t, b = g.b;
        g.grab = g.x0 - b.getBoundingClientRect().left;
        t.classList.add('rm-arranging'); b.classList.add('rm-lifted');
        try { b.setPointerCapture && b.setPointerCapture(g.id); } catch (e) { }
        haptic(14);
        follow(g.x0);
    }
    function end(commit) {
        if (!g) return;
        const { t, b, lifted } = g;
        clearTimeout(g.timer);
        g = null;
        listen(false);
        if (!lifted) return;
        swallowUntil = Date.now() + 450;
        b.classList.remove('rm-lifted'); b.style.transform = '';
        t.classList.remove('rm-arranging');
        if (commit) { save(domOrder(t)); haptic(8); }
        else apply();
        try { W.LowiRoomsUI && W.LowiRoomsUI.paint && W.LowiRoomsUI.paint(); } catch (e) { }
    }
    /* the move/up listeners sit on window (capture) for the length of one press, so nothing on the page (the galaxy, the
       page slider) sees the drag first; the row itself is .no-page-swipe */
    function onMove(e) {
        if (!g || e.pointerId !== g.id) return;
        if (!g.lifted) { if (Math.hypot(e.clientX - g.x0, e.clientY - g.y0) > SLOP) end(false); return; }
        e.preventDefault();
        e.stopPropagation();
        follow(e.clientX);
    }
    function onUp(e) { if (g && e.pointerId === g.id) { if (g.lifted) e.stopPropagation(); end(true); } }
    function onCancel(e) { if (g && e.pointerId === g.id) end(!!g.lifted); }
    function onTouchMove(e) { if (g && g.lifted && e.cancelable) e.preventDefault(); }
    function listen(on) {
        const f = on ? 'addEventListener' : 'removeEventListener';
        W[f]('pointermove', onMove, true); W[f]('pointerup', onUp, true); W[f]('pointercancel', onCancel, true);
        W[f]('touchmove', onTouchMove, { capture: true, passive: false });
    }
    function wire(t) {
        if (!t || t.dataset.order === '1') return;
        t.dataset.order = '1';
        t.classList.add('no-page-swipe');   /* liquid-glass.js: a drag that starts on the tabs never slides to the next page */
        t.setAttribute('aria-description', 'Hold a tab to move it');
        t.addEventListener('pointerdown', e => {
            const b = e.target.closest && e.target.closest('.rm-tab');
            if (!b || (e.pointerType === 'mouse' && e.button !== 0) || g) return;
            g = { t, b, id: e.pointerId, x0: e.clientX, y0: e.clientY, sy: W.scrollY, lifted: false, moved: false };
            g.timer = setTimeout(lift, HOLD_MS);
            listen(true);
        });
        t.addEventListener('contextmenu', e => { if (g || Date.now() < swallowUntil) e.preventDefault(); });
        /* the click that follows a drop must not also switch tabs */
        t.addEventListener('click', e => {
            if (Date.now() < swallowUntil) { e.preventDefault(); e.stopPropagation(); swallowUntil = 0; }
        }, true);
        /* keyboard: Alt + Left/Right moves the focused tab */
        t.addEventListener('keydown', e => {
            if (!e.altKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
            const b = e.target.closest && e.target.closest('.rm-tab'); if (!b) return;
            e.preventDefault(); e.stopPropagation();
            const list = domOrder(t), i = list.indexOf(b.dataset.rm);
            save(moveTo(list, b.dataset.rm, i + (e.key === 'ArrowLeft' ? -1 : 1)));
            apply(); b.focus();
        }, true);
    }
    W.addEventListener('scroll', () => { if (g && !g.lifted && Math.abs(W.scrollY - g.sy) > 2) end(false); }, { passive: true, capture: true });

    /* ---- opening Community: .cm-open + the first tab of the order ---- */
    /* Oct 22 (item 33, E-man: "it always opens the chat. And then after that it opens what I set my first page to be"). Root causes:
       (1) index.html rebuilt the whole Community page a moment after it opened (fixed there: it is kept now); (2) a chat room left
       open on the last visit counted as "something opened a chat", so the first tab was skipped and the old chat showed; (3) on the
       first visit of a session the tabs were not built yet, so the first tab waited for a 100 ms retry while the default showed.
       Now the first tab is set inside the class change itself (a MutationObserver runs before the browser draws the next frame),
       the tab bar is built on the spot if it is missing, and only a chat room opened for this visit (stamped below) is kept. */
    let wasOpen = false, roomStamp = 0;
    function isOpen() { const p = D.getElementById('tab-foryou'); return !!(p && p.classList.contains('active')); }
    function stampWrap() {
        const C = W.LowiCommunity; if (!C || C.__tabStamp) return;
        const th0 = C.thread, om0 = C.openMessage;
        if (typeof th0 === 'function') C.thread = function (o) { if (o && !isOpen()) roomStamp = Date.now(); return th0.apply(this, arguments); };
        if (typeof om0 === 'function') C.openMessage = function () { roomStamp = Date.now(); return om0.apply(this, arguments); };
        try { Object.defineProperty(C, '__tabStamp', { value: 1 }); } catch (e) { C.__tabStamp = 1; }
    }
    function openFirst(deep) {
        let tries = 0;
        (function tryIt() {
            const R = W.LowiRoomsUI;
            if (!isOpen()) return;
            let t = tabsEl();
            if (R && !t && R.paint) { try { R.paint(); } catch (e) { } t = tabsEl(); }
            if (!R || !t) { if (++tries < 40) setTimeout(tryIt, 100); return; }
            wire(t); apply();
            const th = D.getElementById('cgThread'), room = !!(th && th.hasAttribute('data-open'));
            const act = firstAction(order()[0], R.view ? R.view() : null, room, Date.now() - roomStamp < FRESH_MS, deep);
            try {
                if (act === 'room') R.setTab(false);
                else if (act === 'chat') R.setTab(true);
                else if (act) R.showView(act);
            } catch (e) { console.error(e); }
        })();
    }
    function check() {
        stampWrap();
        const open = isOpen();
        D.documentElement.classList.toggle('cm-open', open);
        if (open && !wasOpen) openFirst(/^#community\//i.test(W.location.hash || ''));
        wasOpen = open;
        const t = tabsEl(); if (t) { wire(t); apply(); }
    }
    function boot() {
        const p = D.getElementById('tab-foryou');
        if (!p) { setTimeout(boot, 300); return; }
        new MutationObserver(check).observe(p, { attributes: true, attributeFilter: ['class'] });
        check();
        setInterval(() => { stampWrap(); const t = tabsEl(); if (t && t.dataset.order !== '1') { wire(t); apply(); } }, 1500);
    }
    W.addEventListener('storage', e => { if (e.key === KEY) apply(); });
    W.LowiCommunityTabs = Object.assign({ order, save, apply, haptic, _drag: () => g && { id: g.id, lifted: g.lifted, rm: g.b.dataset.rm } }, core);
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : null);
