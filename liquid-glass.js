/* LOWiSPIKE Liquid Glass glue (see liquid-glass.css). Adds html.lg, mirrors the visible tab into html[data-lg-tab] and keeps
   liquid-glass.css as the very last stylesheet so the shared design wins over every older per-screen style. */
(() => {
    'use strict';
    const D = document, H = D.documentElement;
    H.classList.add('lg');
    const TAB_IDS = ['home', 'foryou', 'scan', 'shelf', 'move', 'profile'];
    function activeTab() {
        const t = D.querySelector('#main > .tab.active');
        return t && t.id ? t.id.replace(/^tab-/, '') : 'home';
    }
    /* ---- iPhone home-screen paging: the tabs sit side by side; tapping a tab slides there, a swipe drags the pages with the finger ---- */
    const PAGES = ['home', 'foryou', 'shelf', 'move'];   /* the tab bar order (Scan is the camera, not a page) */
    const pageEl = n => D.getElementById('tab-' + n);
    const calm = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const EASE = 'cubic-bezier(.22,.8,.28,1)';
    let prevTab = null, pendingDx = 0, sliding = [];
    function clearSlide() {
        sliding.forEach(a => { try { a.cancel(); } catch (e) {} }); sliding = [];
        D.querySelectorAll('#main > .tab.lg-out, #main > .tab.lg-peek, #main > .tab.lg-in').forEach(el => { el.classList.remove('lg-out', 'lg-peek', 'lg-in'); el.style.transform = ''; });
    }
    function slide(from, to, startDx) {
        const a = pageEl(from), b = pageEl(to), i = PAGES.indexOf(from), j = PAGES.indexOf(to);
        if (!a || !b || i < 0 || j < 0 || i === j || calm()) { clearSlide(); return; }
        clearSlide();
        const main = D.getElementById('main'), W = (main && main.clientWidth) || innerWidth, dir = j > i ? 1 : -1;
        const dx = Math.max(-W, Math.min(W, startDx || 0)), left = Math.abs(dir * W + dx) / W;
        const dur = Math.round(170 + 230 * Math.max(.25, Math.min(1, left)));
        a.classList.add('lg-out'); b.classList.add('lg-in');
        const o = { duration: dur, easing: EASE, fill: 'none' };
        const A = a.animate([{ transform: 'translate3d(' + dx + 'px,0,0)' }, { transform: 'translate3d(' + (-dir * W) + 'px,0,0)' }], o);
        const B = b.animate([{ transform: 'translate3d(' + (dir * W + dx) + 'px,0,0)' }, { transform: 'translate3d(0,0,0)' }], o);
        sliding = [A, B];
        B.onfinish = () => { if (sliding[1] === B) { sliding = []; a.classList.remove('lg-out'); b.classList.remove('lg-in'); } };
    }
    function syncTab() {
        const t = activeTab();
        if (H.getAttribute('data-lg-tab') !== t) H.setAttribute('data-lg-tab', t);
        if (prevTab && prevTab !== t) { const d = pendingDx; pendingDx = 0; slide(prevTab, t, d); }
        prevTab = t;
    }
    function hScroller(el, stop) {
        for (let x = el; x && x !== stop && x !== D.body; x = x.parentElement) {
            if (x.scrollWidth > x.clientWidth + 2) { const ox = getComputedStyle(x).overflowX; if (ox === 'auto' || ox === 'scroll') return true; }
        }
        return false;
    }
    let g = null;
    function setX(el, x) { if (el) el.style.transform = x ? 'translate3d(' + x + 'px,0,0)' : ''; }
    function dragTo(dx) {
        const cur = pageEl(g.cur), n = PAGES[g.i + (dx < 0 ? 1 : -1)] || null;
        if (g.peek && g.peek !== n) { const pe = pageEl(g.peek); if (pe) { pe.classList.remove('lg-peek'); pe.style.transform = ''; } }
        g.peek = n;
        const x = n ? dx : dx / 3;   /* rubber band at the first and the last page */
        g.dx = x; setX(cur, x);
        if (n) { const pe = pageEl(n); if (pe) { pe.classList.add('lg-peek'); setX(pe, (dx < 0 ? g.W : -g.W) + x); } }
    }
    function release(cancelled) {
        const s = g; g = null; if (!s || s.dir !== 'x') return;
        const main = D.getElementById('main'); if (main) main.classList.remove('lg-drag');
        const v = s.v || 0, n = s.peek;
        const go = !cancelled && n && (Math.abs(s.dx) > s.W * 0.25 || (Math.abs(v) > 0.45 && Math.sign(v) === Math.sign(s.dx)));
        const cur = pageEl(s.cur), pe = n ? pageEl(n) : null;
        if (go && typeof window.goTab === 'function') {
            setX(cur, 0); if (pe) { pe.classList.remove('lg-peek'); setX(pe, 0); }
            pendingDx = s.dx; window.goTab(n);
            if (activeTab() === s.cur) pendingDx = 0;   /* goTab refused: nothing moved */
        } else {
            const o = { duration: 260, easing: EASE };
            const back = [cur && cur.animate([{ transform: 'translate3d(' + s.dx + 'px,0,0)' }, { transform: 'translate3d(0,0,0)' }], o)];
            if (pe) back.push(pe.animate([{ transform: pe.style.transform || 'none' }, { transform: 'translate3d(' + (s.dx < 0 ? s.W : -s.W) + 'px,0,0)' }], o));
            setX(cur, 0);
            const done = () => { if (pe) { pe.classList.remove('lg-peek'); pe.style.transform = ''; } };
            if (back[1]) back[1].onfinish = done; else done();
        }
        /* the finger moved pages: the click that follows is not a tap */
        const stop = ev => { ev.stopPropagation(); ev.preventDefault(); };
        D.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => D.removeEventListener('click', stop, { capture: true }), 80);
    }
    function onDown(e) {
        if (g) { const s = g; g = null; if (s.dir === 'x') { g = s; release(true); } return; }   /* a second finger: pinch, not paging */
        if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || calm()) return;
        const main = D.getElementById('main'), t = e.target;
        if (!main || !t || !t.closest || !main.contains(t)) return;
        const cur = activeTab(), i = PAGES.indexOf(cur); if (i < 0) return;
        if (t.closest('input, textarea, select, [contenteditable], .hscroll, .toggle, .no-page-swipe')) return;
        const onBar = !!t.closest('#tabbar'), W = main.clientWidth || innerWidth;
        /* Home is a 3D world you drag to look around: there the pages move from the screen edges or the tab bar */
        if (cur === 'home' && !onBar && e.clientX > 26 && e.clientX < W - 26) return;
        if (!onBar && hScroller(t, pageEl(cur))) return;
        g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, lt: performance.now(), v: 0, dir: '', dx: 0, cur, i, W, peek: null };
    }
    function onMove(e) {
        if (!g || e.pointerId !== g.id) return;
        const mx = e.clientX - g.x0, my = e.clientY - g.y0;
        if (!g.dir) {
            if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
            if (Math.abs(mx) <= Math.abs(my) * 1.2) { g = null; return; }
            g.dir = 'x'; clearSlide();
            const main = D.getElementById('main'); if (main) main.classList.add('lg-drag');
        }
        e.stopPropagation(); if (e.cancelable) e.preventDefault();
        const now = performance.now(), dt = Math.max(1, now - g.lt); g.v = .7 * ((e.clientX - g.lx) / dt) + .3 * g.v; g.lx = e.clientX; g.lt = now;
        dragTo(mx);
    }
    function onUp(e) { if (g && e.pointerId === g.id) { if (g.dir === 'x') e.stopPropagation(); release(e.type === 'pointercancel' && Math.abs(g.dx) < 30); } }
    function lastSheet() {
        const l = D.getElementById('lgCss');
        if (l && D.body && D.body.lastElementChild !== l) D.body.appendChild(l);
    }
    function boot() {
        syncTab(); lastSheet();
        const main = D.getElementById('main');
        if (main) new MutationObserver(syncTab).observe(main, { subtree: true, attributes: true, attributeFilter: ['class'] });
        /* moved once (not on every body change: re-inserting a sheet would flash the old design) */
        window.addEventListener('load', lastSheet, { once: true });
        window.addEventListener('pointerdown', onDown, true);
        window.addEventListener('pointermove', onMove, { capture: true, passive: false });
        window.addEventListener('pointerup', onUp, true);
        window.addEventListener('pointercancel', onUp, true);
    }
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
    window.LowiLiquidGlass = { activeTab, TAB_IDS, PAGES, slide };
})();
