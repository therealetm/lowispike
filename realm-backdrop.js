/* LOWiSPIKE · the Metabolic Spirit World behind Cook, Move and Scan (Oct 16, 2026; rules in realm-backdrop-core.js).
   E-man: Cook, Move and the visible Scan background match the expanded Community world, so outside Today the app is one place:
   the gathering of metabolic spirits, world-bubbles linked by threads of light. Today/Home is not touched.
   - one fixed wallpaper (#rwBack) in #app, just above the live 3D world (#bw3Back) and under every page, so Cook, Move and Scan
     share it without a reload or a jump between them, and it fills an iPad edge to edge beyond the 680px column;
   - the same picture, crop and veil as Community (community-spirit.js), so going Community <-> Cook is the same picture;
   - it lives: a very slow drift of the picture, soft breathing light and a few motes rising; all of it is transform/opacity
     only, paused whenever the layer is hidden, and still with prefers-reduced-motion;
   - from Today it comes in from a little further away (as on the warp to Community); back to Today it fades so Misty's world
     shows through; during the Home <-> Community warp it stays out of the way;
   - Scan: the camera layer opens on the same living world; after about a second the glass card asks for the camera (or the
     camera starts at once when it is already allowed), and the feed fades in over the world when its first frame plays.
     The barcode reading, lookup and food logging are not touched (index.html only asks LowiRealmBack.gate when to start).
   It never takes a tap: every layer is pointer-events: none. */
(function (W) {
    'use strict';
    const D = W.document; if (!D || !D.documentElement) return;
    const C = W.LowiRealmCore; if (!C) return;
    const H = D.documentElement;
    const mq = q => { try { return !!(W.matchMedia && W.matchMedia(q).matches); } catch (e) { return false; } };
    const reduced = () => mq('(prefers-reduced-motion: reduce)');

    function layerHTML(n) {
        let m = '';
        C.motes(n, 11).forEach(p => {
            m += '<i style="left:' + p.x + '%;top:' + p.y + '%;--s:' + p.s + 'px;--dx:' + p.dx + 'px;--dy:' + -p.dy + 'px;--d:' + p.dur + 's;--dl:' + p.delay + 's;--h:' + p.hue + ';--a:' + p.a + '"></i>';
        });
        /* no picture (task 1 rework): the live 3D world under this layer is already pulled out into the spirit world
           (body-world-3d.js syncBack), so this layer only adds breathing light, motes and the readability veil */
        return '<div class="rw-breath"><b class="b1"></b><b class="b2"></b><b class="b3"></b></div>' +
            '<div class="rw-motes">' + m + '</div>' +
            '<div class="rw-veil"></div>';
    }
    function make(id, cls) {
        const el = D.createElement('div');
        if (id) el.id = id;
        el.className = 'rw-layer ' + (cls || '');
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = layerHTML(C.moteCount(W.innerWidth || 390, W.innerHeight || 844, reduced()));
        return el;
    }

    /* ---------- the wallpaper behind Cook, Move and Scan ---------- */
    let back = null, shown = false, lastTab = '', tmr = 0;
    function place() {
        const app = D.getElementById('app'), main = D.getElementById('main');
        if (!app || !main || main.parentElement !== app) return null;
        if (!back) back = D.getElementById('rwBack') || make('rwBack', 'rw-back rw-still');
        /* always directly under #main: above the live world (#bw3Back), which may be added later right before #main */
        if (back.parentElement !== app || back.nextElementSibling !== main) app.insertBefore(back, main);
        /* only when missing: re-adding a class still writes the attribute, which would wake the observer on <html> again */
        if (!H.classList.contains('rw-on')) H.classList.add('rw-on');
        return back;
    }
    function activeId() { const t = D.querySelector('#main > .tab.active'); return t ? t.id : ''; }
    function state() {
        const sliding = [];
        D.querySelectorAll('#main > .tab.lg-out, #main > .tab.lg-in, #main > .tab.lg-peek').forEach(t => sliding.push(t.id));
        return { active: activeId(), zoom: H.classList.contains('gx-out') || H.classList.contains('gx-in'), sliding };
    }
    function show(on, how) {
        const L = place(); if (!L) return;
        clearTimeout(tmr);
        L.classList.remove('rw-arrive', 'rw-instant', 'rw-fade');
        const mode = reduced() && how === 'arrive' ? 'fade' : how;
        L.classList.add('rw-' + mode);
        if (on) L.classList.remove('rw-still');
        L.classList.toggle('rw-show', on);
        H.classList.toggle('rw-page', on);
        /* hidden: stop every animation once the fade has finished, so nothing runs behind Today or Community */
        if (!on) tmr = setTimeout(() => { if (!shown) L.classList.add('rw-still'); }, mode === 'instant' ? 0 : C.LEAVE_MS + 60);
        else tmr = setTimeout(() => L.classList.remove('rw-arrive', 'rw-instant', 'rw-fade'), C.ARRIVE_MS + 60);
    }
    function sync() {
        if (!place()) return;
        const s = state(), on = C.want(s);
        if (on !== shown) { show(on, C.change(lastTab, s.active, on)); shown = on; }
        /* the camera layer covers the whole screen: pause the wallpaper under it */
        back.classList.toggle('rw-under', H.classList.contains('b3-camon'));
        if (s.active && !s.sliding.length) lastTab = s.active;
    }

    /* ---------- Scan: the camera layer opens on the living world ---------- */
    function dressCam(el) {
        if (!el || el.__rw) return;
        el.__rw = true;
        if (!el.querySelector(':scope > .rw-cam')) el.insertBefore(make('', 'rw-cam rw-show'), el.firstChild);
        el.classList.add('rw-scan');
        const v = el.querySelector('video');
        if (v) {
            /* the feed fades in over the world when its first frame really plays, and goes back to the world when it stops */
            const on = () => { if (v.videoWidth || v.readyState >= 2) el.classList.add('rw-feed'); };
            v.addEventListener('playing', on); v.addEventListener('loadeddata', on);
            v.addEventListener('emptied', () => el.classList.remove('rw-feed'));
        }
    }
    function permission() {
        try {
            const P = W.navigator && W.navigator.permissions;
            if (!P || !P.query) return Promise.resolve('');
            return Promise.race([
                P.query({ name: 'camera' }).then(r => (r && r.state) || '', () => ''),
                new Promise(r => setTimeout(() => r(''), 600))
            ]);
        } catch (e) { return Promise.resolve(''); }
    }
    /* index.html openScanner(): gate(el, { start, ask, open }) instead of starting the camera at once.
       start = the normal camera start, ask = the existing glass "Allow camera" card, open = is this layer still the open scanner. */
    function gate(el, fns) {
        fns = fns || {};
        const still = () => { try { return !fns.open || fns.open(); } catch (e) { return false; } };
        dressCam(el);
        el.dataset.rw = 'world';
        const t0 = Date.now();
        return permission().then(perm => {
            const g = C.gate(perm), wait = Math.max(0, g.delay - (Date.now() - t0));
            const go = () => {
                if (!still()) return g.act + ':closed';
                el.dataset.rw = g.act;
                if (g.act === 'start') { if (fns.start) fns.start(); }
                else if (fns.ask) { fns.ask(); el.classList.add('rw-asked'); }
                return g.act;
            };
            if (!wait) return go();
            return new Promise(r => setTimeout(() => r(go()), wait));
        });
    }

    function boot() {
        if (!place()) { setTimeout(boot, 400); return; }
        sync();
        if (typeof MutationObserver !== 'undefined') {
            const main = D.getElementById('main');
            if (main) new MutationObserver(sync).observe(main, { attributes: true, attributeFilter: ['class'], subtree: true, childList: false });
            new MutationObserver(sync).observe(H, { attributes: true, attributeFilter: ['class'] });
            const app = D.getElementById('app');
            if (app) new MutationObserver(() => { if (back && back.nextElementSibling !== D.getElementById('main')) place(); }).observe(app, { childList: true });
        }
        D.addEventListener('visibilitychange', sync);
    }

    W.LowiRealmBack = { gate, sync, dressCam, layer: () => back, shown: () => shown, _state: state };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})(window);
