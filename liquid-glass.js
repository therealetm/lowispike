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
    /* Oct 16 (E-man: "I want that on every page ... the camera, even ... seamless scroll, just like with Apple"): every tab is a page,
       the camera too, in the tab bar order. Home <-> Community is the warp (galaxy-zoom.js), every other neighbour slides. */
    const PAGES = ['home', 'foryou', 'scan', 'shelf', 'move'];
    const camOpen = () => !!(H.classList.contains('b3-camon') && D.getElementById('b3Cam'));
    /* the camera page: while you slide towards Scan a dark viewfinder page comes in; when it lands the real camera opens on top */
    function camPage() {
        let el = D.getElementById('lgCamPage'); const main = D.getElementById('main');
        if (!el && main) {
            const lab = D.querySelector('#tabbar .tb[data-tab="scan"]'), name = ((lab && (lab.getAttribute('aria-label') || lab.textContent)) || 'Scan').trim();
            el = D.createElement('div'); el.id = 'lgCamPage'; el.className = 'lg-campage'; el.setAttribute('aria-hidden', 'true');
            el.innerHTML = '<div class="lg-camframe"><i></i><i></i><i></i><i></i></div><span class="lg-camname"></span>';
            el.querySelector('.lg-camname').textContent = name; main.appendChild(el);
        }
        return el;
    }
    const pageEl = n => n === 'scan' ? (camOpen() ? D.getElementById('b3Cam') : camPage()) : D.getElementById('tab-' + n);
    /* the page you are on: the camera when it is open (it lies over the tab you came from) */
    const curPage = () => camOpen() ? 'scan' : activeTab();
    const baseGo = () => { const f = window.goTab; return f && f.__orig ? f.__orig : f; };   /* past the warp wrapper: a quiet switch under the camera */
    function quietGo(n) { const f = baseGo(); if (!f) return; quiet = true; try { f(n); } catch (e) { } quiet = false; prevTab = activeTab(); }
    const calm = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const EASE = 'cubic-bezier(.22,.8,.28,1)';
    let prevTab = null, pendingDx = 0, sliding = [], quiet = false;
    function clearSlide() {
        sliding.forEach(a => { try { a.cancel(); } catch (e) {} }); sliding = [];
        D.querySelectorAll('#main > .tab.lg-out, #main > .tab.lg-peek, #main > .tab.lg-in').forEach(el => { el.classList.remove('lg-out', 'lg-peek', 'lg-in'); el.style.transform = ''; });
    }
    function slide(from, to, startDx) {
        const a = pageEl(from), b = pageEl(to), i = PAGES.indexOf(from), j = PAGES.indexOf(to);
        /* Home <-> Community is the galaxy zoom (galaxy-zoom.js), one continuous space: never a sideways slide */
        const zooming = H.classList.contains('gx-out') || H.classList.contains('gx-in');
        if (!a || !b || i < 0 || j < 0 || i === j || calm() || zooming) { clearSlide(); return; }
        clearSlide();
        const main = D.getElementById('main'), W = (main && main.clientWidth) || innerWidth, dir = j > i ? 1 : -1;
        const dx = Math.max(-W, Math.min(W, startDx || 0)), left = Math.abs(dir * W + dx) / W;
        const dur = Math.round(170 + 230 * Math.max(.25, Math.min(1, left)));
        a.classList.add('lg-out'); b.classList.add('lg-in');
        const o = { duration: dur, easing: EASE, fill: 'none' };
        const A = a.animate([{ transform: 'translate3d(' + dx + 'px,0,0)' }, { transform: 'translate3d(' + (-dir * W) + 'px,0,0)' }], o);
        const B = b.animate([{ transform: 'translate3d(' + (dir * W + dx) + 'px,0,0)' }, { transform: 'translate3d(0,0,0)' }], o);
        sliding = [A, B];
        /* Oct 16: the page that slid out hides at once when the slide lands; with the old .22s fade it hung over the new page as a ghost */
        B.onfinish = () => { if (sliding[1] === B) { sliding = []; a.style.transition = 'none'; a.classList.remove('lg-out'); b.classList.remove('lg-in'); void getComputedStyle(a).opacity; requestAnimationFrame(() => { a.style.transition = ''; }); } };
    }
    function syncTab() {
        const t = activeTab();
        if (H.getAttribute('data-lg-tab') !== t) H.setAttribute('data-lg-tab', t);
        if (prevTab && prevTab !== t && !quiet) { const d = pendingDx; pendingDx = 0; slide(prevTab, t, d); }
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
    const GZ = () => window.LowiGalaxyZoom || null;
    function dragTo(dx) {
        const cur = pageEl(g.cur), n = PAGES[g.i + (dx < 0 ? 1 : -1)] || null;
        /* Home <-> Community: no sideways slide, the page pulls back into the warp with the finger */
        const z = n && GZ() && GZ().swipeOk ? GZ().swipeOk(g.cur, n) : '';
        if (g.warp && g.warp !== z) { GZ().swipeEnd(g.warp, 0, false); g.warp = ''; }
        if (z) {
            if (g.peek) { const pe = pageEl(g.peek); if (pe) { pe.classList.remove('lg-peek'); pe.style.transform = ''; } g.peek = null; }
            setX(cur, 0); g.warp = z; g.wn = n; g.dx = dx; GZ().swipe(z, Math.abs(dx) / g.W); return;
        }
        /* from the camera the neighbour is the tab under it: switch that tab quietly first, the camera hides the switch */
        if (g.cur === 'scan' && n && activeTab() !== n) { quietGo(n); }
        if (g.peek && g.peek !== n) { const pe = pageEl(g.peek); if (pe) { pe.classList.remove('lg-peek'); pe.style.transform = ''; } }
        g.peek = n;
        const x = n ? dx : dx / 3;   /* rubber band at the first and the last page */
        g.dx = x; setX(cur, x);
        if (n) { const pe = pageEl(n); if (pe) { pe.classList.add('lg-peek'); setX(pe, (dx < 0 ? g.W : -g.W) + x); } }
    }
    function release(cancelled) {
        const s = g; g = null; if (!s || s.dir !== 'x') return;
        const main = D.getElementById('main'); if (main) main.classList.remove('lg-drag');
        const v = s.v || 0;
        if (s.warp) {
            const go = !cancelled && (Math.abs(s.dx) > s.W * 0.22 || (Math.abs(v) > 0.45 && Math.sign(v) === Math.sign(s.dx)));
            GZ().swipeEnd(s.warp, Math.abs(s.dx) / s.W, go);
            noClick(); return;
        }
        const n = s.peek;
        const go = !cancelled && n && (Math.abs(s.dx) > s.W * 0.25 || (Math.abs(v) > 0.45 && Math.sign(v) === Math.sign(s.dx)));
        const cur = pageEl(s.cur), pe = n ? pageEl(n) : null;
        if (go && (s.cur === 'scan' || n === 'scan')) camSlide(s, n, cur, pe);
        else if (go && typeof window.goTab === 'function') {
            setX(cur, 0); if (pe) { pe.classList.remove('lg-peek'); setX(pe, 0); }
            pendingDx = s.dx; window.goTab(n);
            if (activeTab() === s.cur) pendingDx = 0;   /* goTab refused: nothing moved */
        } else {
            const o = { duration: 260, easing: EASE };
            const back = [cur && cur.animate([{ transform: 'translate3d(' + s.dx + 'px,0,0)' }, { transform: 'translate3d(0,0,0)' }], o)];
            if (pe) back.push(pe.animate([{ transform: pe.style.transform || 'none' }, { transform: 'translate3d(' + (s.dx < 0 ? s.W : -s.W) + 'px,0,0)' }], o));
            setX(cur, 0);
            let fin = false;
            const done = () => { if (fin) return; fin = true; if (pe) { pe.classList.remove('lg-peek'); pe.style.transform = ''; }
                /* back on the camera: the tab under it is the one you came from again */
                if (s.cur === 'scan' && s.under && activeTab() !== s.under) quietGo(s.under); };
            if (back[1]) { back[1].onfinish = done; back[1].oncancel = done; setTimeout(done, 320); } else done();
        }
        noClick();
    }
    /* the finger moved pages: the click that follows is not a tap */
    function noClick() {
        const stop = ev => { ev.stopPropagation(); ev.preventDefault(); };
        D.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => D.removeEventListener('click', stop, { capture: true }), 80);
    }
    /* sliding into or out of the camera: both pages finish the slide together, then the camera opens (in) or closes (out) */
    function camSlide(s, n, cur, pe) {
        const dir = s.dx < 0 ? 1 : -1, W = s.W, left = Math.abs(dir * W + s.dx) / W, dur = Math.round(170 + 230 * Math.max(.25, Math.min(1, left)));
        const o = { duration: dur, easing: EASE, fill: 'forwards' };
        const A = cur && cur.animate ? cur.animate([{ transform: 'translate3d(' + s.dx + 'px,0,0)' }, { transform: 'translate3d(' + (-dir * W) + 'px,0,0)' }], o) : null;
        const B = pe && pe.animate ? pe.animate([{ transform: 'translate3d(' + (dir * W + s.dx) + 'px,0,0)' }, { transform: 'translate3d(0,0,0)' }], o) : null;
        if (s.cur === 'scan') {
            /* out of the camera: it slides away and closes; the page under it (already switched) slides in */
            if (pe) { pe.classList.remove('lg-peek'); pe.classList.add('lg-in'); }
            const end = () => { const x = cur && cur.querySelector && cur.querySelector('[data-b3="camclose"]'); if (cur) { cur.style.transition = 'none'; cur.style.opacity = '0'; } if (x) x.click(); else if (cur) cur.remove();
                if (B) B.cancel(); if (pe) { pe.classList.remove('lg-in'); pe.style.transform = ''; } prevTab = activeTab(); };
            if (B) B.onfinish = end; else end();
        } else {
            /* into the camera: the viewfinder page lands, then the real camera opens over it */
            if (cur) cur.classList.add('lg-out'); if (pe) { pe.classList.remove('lg-peek'); pe.classList.add('lg-in'); }
            const end = () => { try { window.goTab('scan'); } catch (e) { }
                setTimeout(() => { if (A) A.cancel(); if (B) B.cancel(); if (cur) { cur.classList.remove('lg-out'); cur.style.transform = ''; } if (pe) { pe.classList.remove('lg-in'); pe.style.transform = ''; } }, 320); };
            if (B) B.onfinish = end; else end();
        }
        setX(cur, 0); if (pe) setX(pe, 0);
    }
    function onDown(e) {
        if (g) { const s = g; g = null; if (s.dir === 'x') { g = s; release(true); } return; }   /* a second finger: pinch, not paging */
        if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || calm()) return;
        const main = D.getElementById('main'), t = e.target, cam = camOpen() ? D.getElementById('b3Cam') : null;
        if (!main || !t || !t.closest) return;
        if (cam ? !cam.contains(t) : !main.contains(t)) return;
        /* the camera opened from inside a spirit world belongs to that world: no paging there */
        if (cam && cam.closest('#spWorld')) return;
        const cur = curPage(), i = PAGES.indexOf(cur); if (i < 0) return;
        if (t.closest('input, textarea, select, [contenteditable], .hscroll, .toggle, .no-page-swipe, form')) return;
        const onBar = !!t.closest('#tabbar'), W = main.clientWidth || innerWidth;
        /* Home is a 3D world you drag to look around: there the pages move from the screen edges or the tab bar */
        if (cur === 'home' && !onBar && e.clientX > 26 && e.clientX < W - 26) return;
        /* Oct 16: Community is a map you drag around (community-chat.js), so there too the pages move from the edges or the tab bar */
        if (cur === 'foryou' && !onBar && t.closest('#cgGalaxy') && e.clientX > 26 && e.clientX < W - 26) return;
        if (!onBar && hScroller(t, pageEl(cur))) return;
        g = { id: e.pointerId, x0: e.clientX, y0: e.clientY, lx: e.clientX, lt: performance.now(), v: 0, dir: '', dx: 0, cur, i, W, peek: null, warp: '', under: cur === 'scan' ? activeTab() : '' };
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
    window.LowiLiquidGlass = { activeTab, TAB_IDS, PAGES, slide, curPage, gesture: () => g ? (g.dir || 'pending') : '' };
})();
