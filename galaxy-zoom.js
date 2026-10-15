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
    const DUR = 1250, EASE = 'cubic-bezier(.62,0,.32,1)';
    /* Geometry: m = Misty's centre + radius on Home, y = your orb's centre + radius in the galaxy (both in viewport px), g = galaxy box. */
    function plan(m, y, g, vw, vh) {
        const s = Math.max(0.05, Math.min(1, (y.r || 27) / Math.max(1, m.r || 100))), K = 1 / s;
        const full = Math.hypot(Math.max(m.x, vw - m.x), Math.max(m.y, vh - m.y)) + 4;
        return {
            s, K,
            home: { origin: m.x + 'px ' + m.y + 'px', from: 'translate(0px,0px) scale(1)', to: 'translate(' + (y.x - m.x).toFixed(1) + 'px,' + (y.y - m.y).toFixed(1) + 'px) scale(' + s.toFixed(4) + ')',
                clipFrom: 'circle(' + full.toFixed(0) + 'px at ' + m.x.toFixed(1) + 'px ' + m.y.toFixed(1) + 'px)', clipTo: 'circle(' + ((m.r || 100) * 1.04).toFixed(1) + 'px at ' + m.x.toFixed(1) + 'px ' + m.y.toFixed(1) + 'px)' },
            galaxy: { origin: (y.x - g.left).toFixed(1) + 'px ' + (y.y - g.top).toFixed(1) + 'px', from: 'translate(' + (m.x - y.x).toFixed(1) + 'px,' + (m.y - y.y).toFixed(1) + 'px) scale(' + K.toFixed(4) + ')', to: 'translate(0px,0px) scale(1)' }
        };
    }
    const api = { plan, DUR };
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
        try { if (W.LowiWorldHome && W.LowiWorldHome.settle) W.LowiWorldHome.settle(); } catch (e) {}
        try { if (W.LowiCommunity && W.LowiCommunity.refresh) W.LowiCommunity.refresh(); } catch (e) {}
    }
    function run(dir) {
        const home = D.getElementById('tab-home'), gal = D.getElementById('cgGalaxy'), y = youBox();
        if (!home || !gal || !y || !home.animate) { finish(); return; }
        const m = mistyBox(), g = gal.getBoundingClientRect(), p = plan(m, y, g, innerWidth, innerHeight), out = dir === 'out';
        /* transform and clip run over the whole move (in lockstep with the galaxy); only the fade waits for the last 18 % */
        const kh = [{ transform: p.home.from, clipPath: p.home.clipFrom, opacity: 1 }, { opacity: out ? 1 : 0.9, offset: 0.82 }, { transform: p.home.to, clipPath: p.home.clipTo, opacity: 0 }];
        const kg = [{ transform: p.galaxy.from }, { transform: p.galaxy.to }];
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
    let tries = 0;
    (function boot() { if (!wrap() && tries++ < 80) setTimeout(boot, 150); else setInterval(wrap, 2000); })();
})(typeof window !== 'undefined' ? window : globalThis);
