/* bloom-ring.js - Oct 23, 2026: one round, symmetrical layout for every secondary bubble on Home, the zoom-out that makes room for
   them, and the two-finger tap on Misty that opens all of them at once.

   Emmanuel (voice, Oct 23): "two fingers on the bubble makes all the secondary bubbles open"; "the Rundung symmetry. Right now it
   looks very just scattered. It doesn't look symmetrical with the bubbles. The secondary bubbles, they all don't even look aligned.
   They all have different styles. It's just a mess." Then: "Add a zoom out effect when the secondary bubbles open, so the view
   expands rather than cramping the elements on the screen."

   The rule (the same for one bubble's bloom and for all of them):
     - every secondary bubble sits on ONE outer circle around Misty, just outside the ring of Home bubbles;
     - one fixed angle between neighbours, everywhere, so the spacing is the same in every group;
     - each group is centred on its own bubble's direction (mirror-symmetric about the line Misty -> bubble); when two groups would
       touch, both slide apart along the circle just enough (the bigger group moves less), so they keep their shape and spacing;
     - the orbs keep one readable size; to make room, the ring and Misty pull back towards Misty's centre (the camera backs off),
       never the orbs shrinking, never anything leaving the screen.
   Kept as they were (Emmanuel likes them): a hold on Misty opens her stats, a double tap makes her talk and gives a heart. A
   two-finger tap is its own gesture: both fingers on Misty, still, short. A pinch (fingers moving) is never a two-finger tap.

   solve() is pure (tests/bloom-ring.test.cjs). The DOM half reads the ring from home-orbit-v2.js and scales #whHud and Misty's layer
   with the CSS scale property (no flat page is scaled: both layers are transparent and hold only round bubbles). */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    if (root && root.document) { root.LowiBloomRing = root.LowiBloomRing || api; if (api.mount) api.mount(root); }
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    const TAU = Math.PI * 2;
    const norm = a => ((a % TAU) + TAU) % TAU;
    const stepFor = (rho, chord) => 2 * Math.asin(Math.min(1, chord / (2 * Math.max(1, rho))));

    /* groups [{key, a, n}] -> the same groups with a centre c (radians) so that no two groups overlap on the circle: neighbouring
       groups need (half widths + one step) between their centres. Pushes are shared, the bigger group moves less. */
    function pack(groups, step) {
        const g = groups.map(x => ({ key: x.key, a: x.a, c: x.a, n: Math.max(1, x.n | 0), h: (Math.max(1, x.n | 0) - 1) / 2 * step }));
        if (g.length < 2) return g;
        for (let it = 0; it < 600; it++) {
            g.sort((p, q) => norm(p.c) - norm(q.c));
            let moved = false;
            for (let i = 0; i < g.length; i++) {
                const A = g[i], B = g[(i + 1) % g.length];
                const d = norm(B.c - A.c), need = A.h + B.h + step;
                if (d < need - 1e-7) {
                    const push = need - d + 1e-6, wa = B.n / (A.n + B.n), wb = A.n / (A.n + B.n);
                    A.c -= push * wa; B.c += push * wb; moved = true;
                }
            }
            if (!moved) break;
        }
        g.forEach(x => { x.c = norm(x.c + Math.PI) - Math.PI; });
        return g;
    }

    /* one try at zoom s: the ring and Misty shrink to s around c, the orbs keep size d */
    function layoutAt(o, s) {
        const c = o.c, d = o.d, gap = o.gap == null ? 10 : o.gap, between = o.between == null ? 8 : o.between;
        const outer = o.ring.reduce((m, b) => Math.max(m, Math.hypot(b.x - c.x, b.y - c.y) + b.r), o.mistyR || 0);
        let rho = outer * s + gap + d / 2;
        let step = stepFor(rho, d + between);
        const total = o.groups.reduce((t, g) => t + Math.max(1, g.n | 0), 0);
        let guard = 0;
        while (total * step > TAU * 0.995 && guard++ < 60) { rho *= 1.04; step = stepFor(rho, d + between); }
        const ringBy = {}; o.ring.forEach(b => { ringBy[b.key] = b; });
        const groups = pack(o.groups.filter(g => ringBy[g.key]).map(g => ({ key: g.key, n: g.n, a: Math.atan2(ringBy[g.key].y - c.y, ringBy[g.key].x - c.x) })), step);
        const orbs = [];
        groups.forEach(g => {
            const b = ringBy[g.key], from = { x: c.x + (b.x - c.x) * s, y: c.y + (b.y - c.y) * s };
            for (let i = 0; i < g.n; i++) {
                const a = g.c + (i - (g.n - 1) / 2) * step;
                orbs.push({ key: g.key, i, a, x: c.x + Math.cos(a) * rho, y: c.y + Math.sin(a) * rho, from });
            }
        });
        return { s, rho, step, groups, orbs, d };
    }
    function fits(L, v, m) {
        const r = L.d / 2;
        return L.orbs.every(p => p.x - r >= v.l + m - 0.5 && p.x + r <= v.w - v.r - m + 0.5 && p.y - r >= v.t + m - 0.5 && p.y + r <= v.h - v.b - m + 0.5);
    }
    /* o: { c:{x,y}, mistyR, ring:[{key,x,y,r}], groups:[{key,n}], d, gap, between, view:{w,h,t,r,b,l}, margin, maxS, minS, minD }
       -> { s, rho, step, groups, orbs:[{key,i,a,x,y,from}], d, fit }  (largest s <= maxS that fits; if none, smaller orbs, then minS) */
    function solve(o) {
        const v = Object.assign({ w: 390, h: 844, t: 0, r: 0, b: 0, l: 0 }, o.view || {}), m = o.margin == null ? 8 : o.margin;
        const maxS = o.maxS == null ? 1 : o.maxS, minS = o.minS == null ? 0.5 : o.minS;
        let d = o.d;
        const minD = o.minD == null ? Math.min(d, 56) : o.minD;
        for (let tries = 0; tries < 8; tries++) {
            const oo = Object.assign({}, o, { d });
            if (fits(layoutAt(oo, maxS), v, m)) return Object.assign(layoutAt(oo, maxS), { fit: true });
            if (fits(layoutAt(oo, minS), v, m)) {
                let lo = minS, hi = maxS;
                for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2; if (fits(layoutAt(oo, mid), v, m)) lo = mid; else hi = mid; }
                return Object.assign(layoutAt(oo, lo), { fit: true });
            }
            if (d <= minD) break;
            d = Math.max(minD, d - 4);
        }
        return Object.assign(layoutAt(Object.assign({}, o, { d }), minS), { fit: false });
    }

    /* two-finger tap: pure decision from the touch story (tests use it too) */
    const TAP = { maxGapMs: 300, maxMs: 520, maxMove: 16, maxSpread: 26 };
    function isTwoFingerTap(t) {
        /* t: { downs:[{x,y,t}x2], ups at ms, moved px (max finger travel), spreadChange px, onTarget:[bool,bool], extra:bool } */
        if (!t || t.extra || !t.downs || t.downs.length !== 2) return false;
        if (!t.onTarget || !t.onTarget[0] || !t.onTarget[1]) return false;
        if (Math.abs(t.downs[1].t - t.downs[0].t) > TAP.maxGapMs) return false;
        if ((t.upAt - t.downs[0].t) > TAP.maxMs) return false;
        if ((t.moved || 0) > TAP.maxMove || Math.abs(t.spreadChange || 0) > TAP.maxSpread) return false;
        return true;
    }

    /* ---------------- DOM ---------------- */
    let W = null, D = null, H = null;
    const z = { on: false, s: 1, saved: null, t: 0, owner: null, gest: null, swallowUntil: 0 };
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    const layers = () => [D.getElementById('whHud'), D.querySelector('#spHome .sp-heroes')].filter(Boolean);
    function safe() {
        const cs = getComputedStyle(H), px = k => parseFloat(cs.getPropertyValue(k)) || 0;
        return { t: px('--sat'), r: px('--sar'), b: px('--sab'), l: px('--sal') };
    }
    /* the ring as it stands without any zoom: home-orbit-v2's own numbers (its layout never reads the zoomed screen) */
    function ring() {
        const O = W.LowiHomeOrbitV2, L = O && typeof O.current === 'function' ? O.current() : null;
        if (!L || !L.ok || !L.spots) return null;
        const r = L.d / 2, list = [];
        Object.keys(L.spots).forEach(k => { const p = L.spots[k]; if (p && isFinite(p.x) && isFinite(p.y)) list.push({ key: k, x: p.x, y: p.y, r }); });
        if (!list.length) return null;
        return { c: { x: L.cx, y: L.cy }, mistyR: L.mistyR || 0, ring: list, R: L.R, d: L.d };
    }
    /* where one or more groups go: { s, d, orbs:[{key,i,x,y,from}] } in screen pixels, or null when the ring is not there */
    function place(groups, opts) {
        opts = opts || {};
        const g = ring(); if (!g) return null;
        const vw = W.innerWidth || 390, vh = W.innerHeight || 844, sf = safe();
        const d = opts.d || Math.round(Math.max(60, Math.min(78, Math.min(vw, vh) * 0.17)));
        const out = solve({ c: g.c, mistyR: g.mistyR, ring: g.ring, groups, d, gap: opts.gap == null ? 10 : opts.gap, between: 8,
            view: { w: vw, h: vh, t: sf.t + 6, r: sf.r, b: sf.b, l: sf.l }, margin: 8,
            /* a little pull-back always (it reads as the view opening up), more only when the orbs need the room */
            maxS: opts.maxS || (groups.length > 1 ? 0.9 : 0.96), minS: 0.5, minD: 54 });
        out.c = g.c;
        return out;
    }
    function zoom(s, c, owner) {
        if (!H || !c) return;
        const els = layers();
        if (!z.on) {
            /* the transform origin is Misty's centre in each layer's own box, measured once while nothing is scaled */
            z.saved = els.map(el => { const r = el.getBoundingClientRect(); return { el, o: (c.x - r.left) + 'px ' + (c.y - r.top) + 'px', tr: el.style.transition }; });
        }
        z.on = true; z.s = s; z.owner = owner || null; z.t++;
        const ease = reduced() ? 'none' : 'scale .5s cubic-bezier(.22,.9,.28,1.06)';
        H.classList.add('br-zoom');
        (z.saved || []).forEach(x => { x.el.style.transformOrigin = x.o; x.el.style.transition = ease; x.el.style.scale = String(Math.round(s * 1000) / 1000); });
        try { W.dispatchEvent(new CustomEvent('lowi:bloom-zoom', { detail: { s, on: true } })); } catch (e) { }
    }
    function unzoom(owner) {
        if (!z.on || (owner && z.owner && owner !== z.owner)) return;
        const tick = ++z.t, saved = z.saved || [];
        z.on = false; z.s = 1; z.owner = null;
        saved.forEach(x => { x.el.style.scale = '1'; });
        const done = () => {
            if (tick !== z.t) return;
            saved.forEach(x => { x.el.style.removeProperty('scale'); x.el.style.removeProperty('transform-origin'); x.el.style.transition = x.tr || ''; });
            z.saved = null; H.classList.remove('br-zoom');
            try { W.dispatchEvent(new CustomEvent('lowi:bloom-zoom', { detail: { s: 1, on: false } })); } catch (e) { }
        };
        if (reduced()) done(); else W.setTimeout(done, 520);
    }

    /* the two-finger tap on Misty */
    function mistyEl() { return D.getElementById('spBubble'); }
    function onMisty(x, y) {
        const el = mistyEl(); if (!el) return false;
        const r = el.getBoundingClientRect(); if (!r.width) return false;
        /* two fingertips side by side are wider than they look: the hit circle is Misty's own plus a fingertip */
        return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) <= Math.max(r.width, r.height) / 2 + 22;
    }
    const homeUp = () => H.classList.contains('o8') && H.classList.contains('wh-home') && !H.classList.contains('wh-away') && !D.querySelector('.ss-sheet.on, .hl-sheet.on');
    function onStart(e) {
        const ts = e.touches;
        if (!ts) return;
        if (ts.length === 1) {
            const t = ts[0];
            z.gest = homeUp() && onMisty(t.clientX, t.clientY) ? { downs: [{ x: t.clientX, y: t.clientY, t: performance.now(), id: t.identifier }], onTarget: [true], moved: 0, extra: false } : null;
            return;
        }
        const g = z.gest; if (!g) return;
        if (ts.length === 2 && g.downs.length === 1) {
            const t = [...ts].find(x => x.identifier !== g.downs[0].id) || ts[1];
            g.downs.push({ x: t.clientX, y: t.clientY, t: performance.now(), id: t.identifier });
            g.onTarget.push(onMisty(t.clientX, t.clientY));
            g.spread0 = Math.hypot(g.downs[1].x - g.downs[0].x, g.downs[1].y - g.downs[0].y);
        } else g.extra = true;
    }
    function onMove(e) {
        const g = z.gest; if (!g || !e.touches) return;
        const pos = {};
        [...e.touches].forEach(t => { pos[t.identifier] = t; });
        g.downs.forEach(d => { const t = pos[d.id]; if (t) g.moved = Math.max(g.moved, Math.hypot(t.clientX - d.x, t.clientY - d.y)); });
        if (g.downs.length === 2) { const a = pos[g.downs[0].id], b = pos[g.downs[1].id]; if (a && b) g.spreadChange = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) - g.spread0; }
    }
    function onEnd(e) {
        const g = z.gest; if (!g) return;
        if (e.touches && e.touches.length) return;
        z.gest = null;
        g.upAt = performance.now();
        if (e.type === 'touchcancel' || !isTwoFingerTap(g)) return;
        z.swallowUntil = Date.now() + 600;
        try { if (e.cancelable) e.preventDefault(); } catch (x) { }
        toggleAll();
    }
    /* a two-finger tap must never also count as a tap or a double tap on Misty */
    function onClick(e) {
        if (Date.now() > z.swallowUntil) return;
        const t = e.target; if (!t || !t.closest || !t.closest('#spBubble, #spHome .sp-heroes')) return;
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    function toggleAll() {
        const B = W.LowiHomeBloomsV2;
        if (!B || typeof B.openAll !== 'function') return false;
        if (B.isAll && B.isAll()) { B.close(); return true; }
        try { if (navigator.vibrate) navigator.vibrate([8, 30, 8]); } catch (e) { }
        return B.openAll();
    }
    function mount(win) {
        if (W) return;
        W = win; D = W.document; H = D.documentElement;
        if (!D.getElementById('brCss')) {
            const me = D.currentScript, q = me && me.src && me.src.indexOf('?') > 0 ? me.src.slice(me.src.indexOf('?')) : '';
            const l = D.createElement('link'); l.id = 'brCss'; l.rel = 'stylesheet'; l.href = 'bloom-ring.css' + q; (D.head || H).appendChild(l);
        }
        W.addEventListener('touchstart', onStart, { capture: true, passive: true });
        W.addEventListener('touchmove', onMove, { capture: true, passive: true });
        W.addEventListener('touchend', onEnd, { capture: true, passive: false });
        W.addEventListener('touchcancel', onEnd, { capture: true, passive: true });
        W.addEventListener('click', onClick, true);
        W.addEventListener('dblclick', onClick, true);
        W.addEventListener('resize', () => { if (z.on) { const B = W.LowiHomeBloomsV2; try { if (B && B.close) B.close(); } catch (e) { } try { const S = W.LowiHomeSettingsSleepV2; if (S && S.close) S.close(); } catch (e) { } unzoom(); } });
    }
    const state = () => ({ on: z.on, s: z.s, owner: z.owner });
    return { solve, pack, layoutAt, isTwoFingerTap, TAP, stepFor, place, zoom, unzoom, state, toggleAll, mount: typeof window !== 'undefined' ? mount : null, _ring: ring };
});
