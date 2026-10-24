/* section-nav.js: Oct 21 (E-man: "if I click on Cook through the main page I need to be able to click on X or back to get to the main
   page again, without the bubbles all of a sudden being closed or it restarting").
   The bottom menu bar is gone; Home's bubbles are the way into every section. This module is the way out:
   - one X in the same spot (top left, mirroring your picture at top right) on every page that is not Home,
   - a swipe from the left edge (iOS style) that pulls the page away and goes back,
   - the browser / system back (each section opened from Home gets one history entry; back closes it).
   Going back never rebuilds Home: index.html's goTab keeps Home's page, open bubbles, orbit and scroll exactly as they were,
   the switch is instant (no slide, no galaxy dive, no re-launch), and nothing reloads. */
(function (W, D) {
    'use strict';
    if (W.LowiSections) return;
    const H = D.documentElement;
    const T = (en, de, es) => { const l = (H.lang || 'en').slice(0, 2); return l === 'de' ? de : l === 'es' ? es : en; };
    const tabOf = () => { const a = D.querySelector('#main > .tab.active') || D.querySelector('.tab.active'); return a && a.id ? a.id.replace(/^tab-/, '') : 'home'; };
    const isSec = s => !!(s && s.lowiSec);
    let instantUntil = 0;
    const api = { closes: 0, opens: 0 };
    /* true for a moment around an X / back close: the slide (liquid-glass), the galaxy dive (galaxy-zoom) and the camera
       (body-world-3d) watch the tab change from observers and frames that run after goTab returns */
    Object.defineProperty(api, 'instant', { get: () => performance.now() < instantUntil, set: v => { instantUntil = v ? performance.now() + 700 : 0; }, enumerable: true });
    let swallow = 0, depth = 0, popping = false, homeScroll = null, xBtn = null, swipe = null, swallowedEvt = null;

    /* ---------- Home's scroll, kept while a section is open ---------- */
    function scrollers() { return [D.getElementById('tab-home'), D.getElementById('main'), D.scrollingElement].filter(Boolean); }
    function saveHome() { homeScroll = scrollers().map(el => [el, el.scrollTop, el.scrollLeft]); }
    function restoreHome() {
        const s = homeScroll; if (!s) return;
        const put = () => s.forEach(([el, t, l]) => { if (el.scrollTop !== t) el.scrollTop = t; if (el.scrollLeft !== l) el.scrollLeft = l; });
        put(); requestAnimationFrame(put);
    }

    /* ---------- the X ---------- */
    function ensureX() {
        if (xBtn && xBtn.isConnected) return xBtn;
        xBtn = D.getElementById('secX');
        if (!xBtn) {
            xBtn = D.createElement('button');
            xBtn.id = 'secX'; xBtn.type = 'button'; xBtn.className = 'sec-x';
            xBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
            xBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); close(); });
            D.body.appendChild(xBtn);
        }
        label();
        return xBtn;
    }
    function label() { if (xBtn) { const s = T('Back to Home', 'Zurück zur Startseite', 'Volver al inicio'); xBtn.setAttribute('aria-label', s); xBtn.title = s; } }

    /* ---------- open / close ---------- */
    function after(from, to) {
        if (to !== 'home') {
            H.classList.add('sec-open'); ensureX();
            if (from === 'home') api.opens++;
            try {
                if (isSec(history.state)) history.replaceState({ lowiSec: to }, '');
                else history.pushState({ lowiSec: to }, '');
            } catch (e) { }
        } else {
            H.classList.remove('sec-open');
            if (from !== 'home') { restoreHome(); api.closes++; }
            /* Home came back some other way (a bubble, the tutorial, a deep link): drop the section's history entry quietly */
            if (!popping && isSec(history.state)) { swallow++; try { history.back(); } catch (e) { swallow--; } }
        }
    }
    function wrap() {
        const g = W.goTab;
        if (typeof g !== 'function' || g.__sec) return;
        const w = function (t) {
            if (depth) return g.apply(this, arguments);   /* an older copy of this wrapper inside a newer one: the outer one reports */
            const from = tabOf();
            if (from === 'home' && t !== 'home') saveHome();
            let r; depth++;
            try { r = g.apply(this, arguments); } finally { depth--; }
            const to = tabOf();
            if (to !== from || (to !== 'home') !== H.classList.contains('sec-open')) after(from, to);
            return r;
        };
        Object.keys(g).forEach(k => { try { w[k] = g[k]; } catch (e) { } });
        w.__sec = 1; w.__orig = g.__orig || g; w.__inner = g;
        W.goTab = w;
    }
    /* close(): the X, the edge swipe and back all land here. Instant, and Home is exactly as it was. */
    function close() {
        if (tabOf() === 'home') { H.classList.remove('sec-open'); return; }
        api.instant = true;
        try { W.goTab('home'); } catch (e) { console.error(e); }
        /* Oct 21: the world comes home in the same moment, not on a later frame. Under load the queued backdrop sync ran after the
           700 ms 'instant' window and dove the camera in from the spirit world for seconds (Home looked zoomed out). */
        homeWorldNow();
    }
    function homeWorldNow() {
        try { const WH = W.LowiWorldHome; if (WH && WH.state && WH.state.pull && WH.settle) WH.settle(); } catch (e) { }
        try { const a = W.LowiWorld3D; if (a && a.inBack && a.inBack() && a.backdrop) a.backdrop(false); } catch (e) { }
    }
    /* Oct 22 (item 33): inside a Community chat room, back (edge swipe, phone back) went to the channel list first.
       Oct 22 (item 36): the channel list is gone; see below. */
    function innerBack() {
        /* Oct 22 2026: a Profile part (Account, Health, ...) goes back to the Profile overview first, like its Back button */
        if (tabOf() === 'profile' && H.classList.contains('g2e-open')) { try { W.LowiG2E.close(); return true; } catch (e) { return false; } }
        /* Oct 23 2026 (bug hunt): the Care board on Move (and For You when it is the full-screen layer, not the window inside Cook)
           goes back to Move / Cook first, like its own "< Move" button. Back went straight to Home and left the board open
           (html.nm-open-lb on Home, and the board still open the next time you opened Move). */
        if (tabOf() === 'move' || tabOf() === 'shelf') {
            const k = tabOf() === 'move' ? 'lb' : 'fy', M = W.LowiNavMoves, L = D.querySelector('#tab-' + tabOf() + ' .nm-layer-' + k);
            if (M && typeof M.isOpen === 'function' && M.isOpen(k) && !(L && L.classList && L.classList.contains('fyw'))) { try { M.show(k, false); return true; } catch (e) { return false; } }
        }
        if (tabOf() !== 'foryou' || !H.classList.contains('rm-room-open')) return false;
        /* item 36: the chat has no channel list behind it any more. Back goes to the Community tab you came from (LowiRoomsUI.back),
           else this returns false and Community closes. */
        const U = W.LowiRoomsUI; if (!U || typeof U.back !== 'function') return false;
        try { return !!U.back(); } catch (e) { return false; }
    }
    function back() { if (innerBack()) return; if (isSec(history.state)) { try { history.back(); return; } catch (e) { } } close(); }

    /* ---------- system / browser back ---------- */
    function onPop(e) {
        if (swallow > 0) { swallow--; swallowedEvt = e; return; }
        if (isSec(e.state)) return;                         /* forward into a section entry: leave it */
        if (tabOf() === 'home') return;
        if (D.querySelector('#mv-player.on')) return;      /* the Move player handles its own back */
        /* Oct 23 (bug hunt): back-swipe.js's popstate runs first and its Escape may already have closed the layer on top
           (Shop it, its in-store list, a sheet over Shop it). That was this back: the section stays. Before, Cook closed for
           Home under the still open Shop it, and the next back left the app. */
        try { const B0 = W.LowiBackSwipe; if (B0 && B0.closed && B0.closed(e)) { history.pushState({ lowiSec: tabOf() }, ''); return; } } catch (x) { }
        /* a sheet open on top of the section closes first, and the section stays */
        const BS = W.LowiBackSwipe, before = BS && BS.sig ? BS.sig() : '';
        if (openSheet()) {
            /* Oct 24 (back and close sweep): through back-swipe.js, so a layer that listens for Escape on itself closes too */
            try { if (BS && typeof BS.escape === 'function') BS.escape(); else { const t = D.activeElement && D.activeElement !== D.body ? D.activeElement : D; t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true, cancelable: true })); } } catch (x) { }
            setTimeout(() => {
                if (BS && BS.sig && BS.sig() !== before && tabOf() !== 'home') { try { history.pushState({ lowiSec: tabOf() }, ''); } catch (x) { } }
                else { popping = true; try { close(); } finally { popping = false; } }
            }, 60);
            return;
        }
        if (innerBack()) { try { history.pushState({ lowiSec: tabOf() }, ''); } catch (x) { } return; }
        popping = true; try { close(); } finally { popping = false; }
    }
    function openSheet() {
        /* Oct 23 (bug hunt): the Shop it screen (#lsCart) and its in-store list (#lcShop) count too. */
        return !!D.querySelector('#sheetwrap.open, #sheetwrap.show, .r2-ov, [aria-modal="true"]:not([hidden]), dialog[open], #lsCart.open, #lcShop.open');
    }

    /* ---------- swipe back from the left edge ---------- */
    const EDGE = 24;
    function page() { return D.getElementById('tab-' + tabOf()); }
    function blocked(t) {
        if (tabOf() === 'home') return true;
        if (H.classList.contains('mf-on') || H.classList.contains('b3-camon') || openSheet()) return true;
        return !!(t && t.closest && t.closest('input, textarea, select, [contenteditable], .no-back-swipe'));
    }
    function onDown(e) {
        if (swipe || e.button > 0 || e.clientX > EDGE || blocked(e.target)) return;
        const pg = page(); if (!pg) return;
        swipe = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, lt: performance.now(), v: 0, on: false, pg, w: W.innerWidth || 390 };
    }
    function onMove(e) {
        const s = swipe; if (!s || e.pointerId !== s.id) return;
        const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
        if (!s.on) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            if (dx <= 0 || Math.abs(dx) <= Math.abs(dy) * 1.2) { swipe = null; return; }
            s.on = true; H.classList.add('sec-swiping');
        }
        e.stopPropagation(); if (e.cancelable) e.preventDefault();
        const now = performance.now(), dt = Math.max(1, now - s.lt); s.v = .7 * ((e.clientX - s.lx) / dt) + .3 * s.v; s.lx = e.clientX; s.lt = now;
        s.pg.style.transition = 'none';
        s.pg.style.transform = 'translate3d(' + Math.max(0, dx) + 'px,0,0)';
    }
    function onUp(e) {
        const s = swipe; if (!s || e.pointerId !== s.id) return;
        swipe = null;
        if (!s.on) return;
        e.stopPropagation();
        const dx = Math.max(0, e.clientX - s.x0), go = e.type !== 'pointercancel' && (dx > s.w * 0.33 || (s.v > 0.45 && dx > 30));
        const pg = s.pg, reduce = W.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
        const done = () => { pg.style.transition = ''; pg.style.transform = ''; H.classList.remove('sec-swiping'); };
        if (!go) {
            if (reduce) { done(); return; }
            pg.style.transition = 'transform .2s cubic-bezier(.22,.8,.28,1)'; pg.style.transform = 'translate3d(0,0,0)';
            setTimeout(done, 220); return;
        }
        if (reduce) { done(); back(); return; }
        pg.style.transition = 'transform .16s cubic-bezier(.22,.8,.28,1)'; pg.style.transform = 'translate3d(' + s.w + 'px,0,0)';
        setTimeout(() => { back(); done(); }, 160);
    }

    function boot() {
        wrap();
        /* other modules wrap goTab while they load; stay the outermost so every way into a section is seen */
        W.addEventListener('load', wrap);
        setTimeout(wrap, 1500);
        if (tabOf() !== 'home' && !D.getElementById('main').classList.contains('hidden')) after('home', tabOf());
        W.addEventListener('popstate', onPop);
        W.addEventListener('pointerdown', onDown, true);
        W.addEventListener('pointermove', onMove, { capture: true, passive: false });
        W.addEventListener('pointerup', onUp, true);
        W.addEventListener('pointercancel', onUp, true);
        try { new MutationObserver(label).observe(H, { attributes: true, attributeFilter: ['lang'] }); } catch (e) { }
    }
    api.close = close; api.back = back; api.tab = tabOf; api.wrap = wrap;
    /* Oct 22 (code error sweep 20:02): our own quiet history.back() (Home came back without the X) is not a user's back.
       back-swipe.js asks before it acts on a pop: it took this pop for a swipe back on Home and went back again, out of
       LOWiSPIKE (Safari then left or reloaded the app). True while the quiet pop is pending, and for the event we swallowed. */
    api.swallowed = e => swallow > 0 || (!!e && e === swallowedEvt);
    W.LowiSections = api;
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})(window, document);
