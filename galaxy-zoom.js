/* LOWiSPIKE · one camera from Home to Community (Oct 16, 2026).
   E-man: "it's not seamless going from home to the community". The old hand-off painted a fake gradient picture of Home inside the
   galaxy card and shrank it, which read as a box flying away. Now the real, live Home (Misty's bloodstream, still rendering) stays on
   screen while the 3D camera backs out of it, and the whole view shrinks into your own body in the galaxy: Misty's cell becomes the
   "You" orb, the galaxy opens up around it. Both layers move with the same easing and the same anchor, so for every frame the point
   that was Misty is exactly the point that becomes You (one continuous pull-out, Stargate style). Going back to Home runs the same
   camera the other way: the galaxy dives into You and Home opens out of it.
   Pure geometry is in plan(); the DOM part only runs in a browser, skips with reduced motion and gives up quietly if anything is missing. */
(function (root) {
    'use strict';
    /* Oct 16, round 2 (E-man's screenshots): the old move shrank Home through a clip circle and blew the galaxy up 4-8x, which on the
       phone showed a dark screen with a stray teal ring, then a giant "You" filling the screen, after a ~1 s wait. Now it is a short
       zoom-and-crossfade with gentle scales: Home falls away into Misty's point while the galaxy settles in from just in front of you,
       both anchored on the same moving point (Misty -> You). No clip, no huge scale, 760 ms.
       And you can get there with your fingers: keep pinching out past Home's widest view and you land in the galaxy; spread two fingers
       on the galaxy and you dive back into Home. */
    const DUR = 760, EASE = 'cubic-bezier(.4,0,.2,1)', GX = 2.4, HS = 0.42;
    /* Geometry: m = Misty's centre + radius on Home, y = your orb's centre + radius in the galaxy (both in viewport px), g = galaxy box. */
    function plan(m, y, g, vw, vh) {
        const dx = (y.x - m.x).toFixed(1), dy = (y.y - m.y).toFixed(1), bx = (m.x - y.x).toFixed(1), by = (m.y - y.y).toFixed(1);
        return {
            s: HS, K: GX,
            home: { origin: m.x.toFixed(1) + 'px ' + m.y.toFixed(1) + 'px', from: 'translate(0px,0px) scale(1)', to: 'translate(' + dx + 'px,' + dy + 'px) scale(' + HS + ')' },
            galaxy: { origin: (y.x - g.left).toFixed(1) + 'px ' + (y.y - g.top).toFixed(1) + 'px', from: 'translate(' + bx + 'px,' + by + 'px) scale(' + GX + ')', to: 'translate(0px,0px) scale(1)' }
        };
    }
    /* Pinch past the edge: how far the fingers kept closing (Home, at its widest) or opening (galaxy) before we cross over. */
    const PINCH_GO = 1.45;
    function overPull(d0, d) { return d0 > 0 && d > 0 ? d0 / d : 1; }
    const api = { plan, DUR, overPull, PINCH_GO };
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const W = window, D = document, H = D.documentElement;
    root.LowiGalaxyZoom = api;
    let busy = null, inCall = false;
    const reduced = () => !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const activeTab = () => { const t = D.querySelector('.tab.active'); return t ? t.id.replace(/^tab-/, '') : ''; };
    const worldHome = () => H.classList.contains('wh-on');
    function mistyBox() {
        const b = D.getElementById('spBubble'), r = b && b.getBoundingClientRect();
        if (r && r.width > 40) return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
        return { x: innerWidth / 2, y: innerHeight * 0.46, r: Math.min(innerWidth, innerHeight) * 0.27 };
    }
    function youBox() {
        const o = D.querySelector('#cgField .cg-body.me .cg-orb') || D.querySelector('#cgField .cg-body.me'), r = o && o.getBoundingClientRect();
        if (r && r.width > 8) return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
        return null;
    }
    function finish() {
        if (!busy) return;
        const b = busy; busy = null; clearTimeout(b.timer);
        (b.anims || []).forEach(a => { try { a.cancel(); } catch (e) {} });
        H.classList.remove('gx-hold', 'gx-out', 'gx-in', 'gx-keep');
        if (b.dir === 'out') { try { if (W.LowiArrival && W.LowiArrival.current && W.LowiArrival.current()) W.LowiArrival.close(); } catch (e) {} }
        try { if (W.LowiWorldHome && W.LowiWorldHome.settle) W.LowiWorldHome.settle(); } catch (e) {}
        try { if (W.LowiCommunity && W.LowiCommunity.refresh) W.LowiCommunity.refresh(); } catch (e) {}
    }
    function run(dir) {
        const home = D.getElementById('tab-home'), gal = D.getElementById('cgGalaxy'), y = youBox();
        if (!home || !gal || !y || !home.animate) { finish(); return; }
        const m = mistyBox(), g = gal.getBoundingClientRect(), p = plan(m, y, g, innerWidth, innerHeight), out = dir === 'out';
        /* Home falls away and fades in the first three quarters; the galaxy comes in from just in front of you and is solid by 70 % */
        const kh = [{ transform: p.home.from, opacity: 1 }, { opacity: 1, offset: 0.18 }, { opacity: 0, offset: 0.78 }, { transform: p.home.to, opacity: 0 }];
        const kg = [{ transform: p.galaxy.from, opacity: 0 }, { opacity: 0.15, offset: 0.12 }, { opacity: 1, offset: 0.7 }, { transform: p.galaxy.to, opacity: 1 }];
        home.style.transformOrigin = p.home.origin; gal.style.transformOrigin = p.galaxy.origin;
        const o = { duration: DUR, easing: EASE, fill: 'both', direction: out ? 'normal' : 'reverse' };
        busy.anims = [home.animate(kh, o), gal.animate(kg, o)];
        busy.anims[0].onfinish = finish;
        /* safety net counted from when the animation really starts (slow first frame), never cutting the move short */
        clearTimeout(busy.timer); busy.timer = setTimeout(finish, DUR + 3000);
        const b = busy; try { b.anims[0].ready.then(() => { if (busy === b) { clearTimeout(b.timer); b.timer = setTimeout(finish, DUR + 500); } }); } catch (e) { }
    }
    function start(dir) {
        if (busy) finish();
        busy = { dir, anims: [], timer: 0 };
        if (dir === 'out') { H.classList.add('gx-hold', 'gx-out'); try { if (W.LowiWorldHome && W.LowiWorldHome.pullOut) W.LowiWorldHome.pullOut(); } catch (e) {} }
        else H.classList.add('gx-in', 'gx-keep');
        busy.timer = setTimeout(finish, DUR + 3000);
    }
    function wrap() {
        const orig = W.goTab;
        if (typeof orig !== 'function' || orig.__gx) return !!(orig && orig.__gx);
        const g = function (t) {
            if (inCall) return orig.apply(this, arguments);
            const from = activeTab();
            let dir = '';
            if (!reduced() && worldHome() && !D.hidden) {
                if (from === 'home' && t === 'foryou') dir = 'out';
                else if (from === 'foryou' && t === 'home' && D.querySelector('#cgField .cg-body.me')) dir = 'in';
            }
            if (dir) start(dir); else if (busy) finish();
            let r; inCall = true;
            try { r = orig.apply(this, arguments); } finally { inCall = false; }
            if (dir) {
                try { if (W.LowiCommunity && W.LowiCommunity.refresh) W.LowiCommunity.refresh(); } catch (e) {}
                /* after the galaxy laid out (one frame), or 70 ms at most when frames are slow */
                const go = () => { if (busy && busy.dir === dir && !busy.ran) { busy.ran = true; run(dir); } };
                requestAnimationFrame(go); setTimeout(go, 70);
            }
            return r;
        };
        g.__gx = 1; g.__orig = orig;
        W.goTab = g;
        try { if (typeof goTab !== 'undefined' && goTab !== g) goTab = g; } catch (e) {}
        return true;
    }
    /* ---------- fingers: pinch out past Home's widest view -> galaxy; spread on the galaxy -> back into Home ---------- */
    const rigNow = () => { try { return W.LowiWorldHome && W.LowiWorldHome.rig ? W.LowiWorldHome.rig() : null; } catch (e) { return null; } };
    const atHub = () => { try { const R = W.LowiWorldRegions, s = R && R.state; return !(s && (s.busy || (s.cur && s.cur !== 'hub'))); } catch (e) { return true; } };
    function homePinchOk(t) {
        const r = rigNow();
        return !!(r && r.mode === 'home' && worldHome() && activeTab() === 'home' && !busy && atHub() && !D.querySelector('.bw3-full') && t && t.closest && t.closest('#tab-home') && !t.closest('button, .wh-sheet, .sheet, input, textarea'));
    }
    const gest = { on: '', d0: 0, ref: 0, el: null };
    const tdist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    function feel(el, k, o) { if (!el) return; el.style.transition = 'none'; el.style.transform = k === 1 ? '' : 'scale(' + k.toFixed(3) + ')'; el.style.opacity = o == null || o === 1 ? '' : String(o.toFixed(3)); }
    function release() {
        const el = gest.el; gest.on = ''; gest.el = null; gest.ref = 0;
        if (el) { el.style.transition = 'transform .25s ease, opacity .25s ease'; el.style.transform = ''; el.style.opacity = ''; setTimeout(() => { if (!gest.el) el.style.transition = ''; }, 300); }
    }
    function cross(to) {
        const el = gest.el; gest.on = ''; gest.el = null; gest.ref = 0;
        if (el) { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; }
        try { (W.goTab || goTab)(to); } catch (e) {}
    }
    D.addEventListener('touchstart', e => {
        if (e.touches.length !== 2) { if (e.touches.length > 2) release(); return; }
        const t = e.target;
        if (homePinchOk(t)) { gest.on = 'home'; gest.el = D.getElementById('tab-home'); gest.d0 = tdist(e); gest.ref = 0; }
        else if (activeTab() === 'foryou' && !busy && t && t.closest && t.closest('#cgGalaxy') && !t.closest('#cmPaneChat .cm-compose, input, textarea')) { gest.on = 'gal'; gest.el = D.getElementById('cgGalaxy'); gest.d0 = tdist(e); e.preventDefault(); }
    }, { capture: true, passive: false });
    D.addEventListener('touchmove', e => {
        if (!gest.on || e.touches.length !== 2) return;
        const d = tdist(e);
        if (gest.on === 'home') {
            const r = rigNow(); if (!r) return release();
            /* only counts once the camera is already at its widest; the fingers' distance there is the reference */
            if (r.dist < r.maxD * 0.995) { gest.ref = 0; return; }
            if (!gest.ref) gest.ref = d;
            const over = overPull(gest.ref, d);
            if (over <= 1) { feel(gest.el, 1, 1); return; }
            const f = Math.min(1, (over - 1) / (PINCH_GO - 1));
            feel(gest.el, 1 - 0.12 * f, 1 - 0.25 * f);
            if (over >= PINCH_GO) cross('foryou');
        } else {
            e.preventDefault();
            const open = d / gest.d0;
            if (open <= 1) { feel(gest.el, 1, 1); return; }
            const f = Math.min(1, (open - 1) / (PINCH_GO - 1));
            feel(gest.el, 1 + 0.25 * f, 1 - 0.2 * f);
            if (open >= PINCH_GO && D.querySelector('#cgField .cg-body.me')) cross('home');
        }
    }, { capture: true, passive: false });
    const tend = e => { if (gest.on && e.touches.length < 2) release(); };
    D.addEventListener('touchend', tend, true); D.addEventListener('touchcancel', tend, true);
    /* iOS Safari's own page zoom would fight the galaxy pinch */
    D.addEventListener('gesturestart', e => { if (gest.on === 'gal') e.preventDefault(); }, { passive: false });
    /* trackpad / mouse wheel: keep scrolling out at Home's widest view (or in on the galaxy) to cross over */
    let wheelOver = 0, wheelT = 0;
    D.addEventListener('wheel', e => {
        if (busy) return;
        const now = Date.now(); if (now - wheelT > 450) wheelOver = 0; wheelT = now;
        if (e.deltaY > 0 && homePinchOk(e.target)) { const r = rigNow(); if (r.dist >= r.maxD * 0.995 && ++wheelOver >= 5) { wheelOver = 0; (W.goTab || goTab)('foryou'); } }
        else if (e.deltaY < 0 && activeTab() === 'foryou' && e.target && e.target.closest && e.target.closest('#cgGalaxy') && D.querySelector('#cgField .cg-body.me')) { e.preventDefault(); if (++wheelOver >= 5) { wheelOver = 0; (W.goTab || goTab)('home'); } }
    }, { capture: true, passive: false });
    let tries = 0;
    (function boot() { if (!wrap() && tries++ < 80) setTimeout(boot, 150); else setInterval(wrap, 2000); })();
})(typeof window !== 'undefined' ? window : globalThis);
