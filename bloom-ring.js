/* bloom-ring.js - Oct 23, 2026: one round, symmetrical layout for every secondary bubble on Home, the zoom-out that makes room for
   them, and the hold on Scan that opens all of them at once.

   Emmanuel (voice, Oct 23): "the Rundung symmetry. Right now it
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
   Kept as they were (Emmanuel likes them): a hold on Misty opens her stats, a double tap makes her talk and gives a heart.
   Oct 24 2026 (Emmanuel: "very simple: long press on Scan opens all those secondary bubbles"): holding Scan opens them all; the old
   two-finger tap on Misty is removed (not kept as a hidden duplicate). Pinch zoom on the world is world-home.js and is untouched.

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
        const raw = o.groups.filter(g => ringBy[g.key]).map(g => ({ key: g.key, n: g.n, a: Math.atan2(ringBy[g.key].y - c.y, ringBy[g.key].x - c.x) }));
        if (o.even && raw.length > 1) {
            /* Oct 23, 18:03 (Eman, two fingers on Misty: Sleep's options were missing, "da fehlt doch was", the ring was a lopsided arc):
               the all-at-once ring (hold Scan) is ONE full, even circle. Every orb sits exactly 360/n degrees from the next, each group stays together in
               the order of its bubble round Misty, and the whole circle turns so every group sits as close to its own bubble as it can. */
            const n = raw.reduce((t, g) => t + Math.max(1, g.n | 0), 0), est = TAU / n;
            rho = Math.max(rho, (d + between) / (2 * Math.sin(Math.PI / n)));
            const ord = raw.map(g => Object.assign({}, g, { n: Math.max(1, g.n | 0) })).sort((p, q) => norm(p.a) - norm(q.a));
            let u = 0; ord.forEach(g => { g.u = (u + (g.n - 1) / 2) * est; u += g.n; });
            let sx = 0, sy = 0; ord.forEach(g => { sx += g.n * Math.cos(g.a - g.u); sy += g.n * Math.sin(g.a - g.u); });
            const t0 = Math.atan2(sy, sx);
            const eg = ord.map(g => ({ key: g.key, a: g.a, n: g.n, c: norm(t0 + g.u + Math.PI) - Math.PI, h: (g.n - 1) / 2 * est }));
            const eorbs = [];
            eg.forEach(g => {
                const b = ringBy[g.key], from = { x: c.x + (b.x - c.x) * s, y: c.y + (b.y - c.y) * s };
                for (let i = 0; i < g.n; i++) { const a = g.c + (i - (g.n - 1) / 2) * est; eorbs.push({ key: g.key, i, a, x: c.x + Math.cos(a) * rho, y: c.y + Math.sin(a) * rho, from }); }
            });
            return { s, rho, step: est, groups: eg, orbs: eorbs, d, even: true };
        }
        const groups = pack(raw, step);
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

    /* ---------------- DOM ---------------- */
    let W = null, D = null, H = null;
    const z = { on: false, s: 1, saved: null, t: 0, owner: null };
    const reduced = () => { try { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
    /* Oct 23, 14:57 (Eman's iPhone screenshot: a flat dark box in the middle, a pale gradient round it, "everything has disappeared.
       There's nothing in my universe"): #spHome .sp-heroes also holds the 3D stage (#bw3Stage and its canvas), so scaling it shrank the
       whole universe into a hard-edged phone-shaped box, and Home's layout then read the shrunken stage and moved the camera IN.
       Now only the DOM bubbles shrink (the HUD and Misty's own button, never the 3D stage) and the 3D camera itself pulls back by 1/s
       (the 'lowi:bloom-zoom' event, LowiWorld3D.setPull), so the full living world stays edge to edge and simply opens up. */
    const layers = () => {
        const out = [D.getElementById('whHud')], heroes = D.querySelector('#spHome .sp-heroes');
        if (heroes) [...heroes.children].forEach(el => { if (!isWorld(el)) out.push(el); });
        return out.filter(Boolean);
    };
    /* where an element's own layout box starts on screen. The CSS scale property scales round transform-origin in that untransformed box
       (it is applied outside the element's own transform), so the origin must come from it: Misty's button carries
       translate(-50%, -50%) scale(--wh-mz), and an origin read off her transformed rect sent her off the ring's centre while zoomed. */
    function layoutBox(el) {
        const r = el.getBoundingClientRect(); let x = r.left, y = r.top;
        try {
            const cs = getComputedStyle(el), t = cs.transform;
            if (t && t !== 'none') {
                const m = new DOMMatrixReadOnly(t), o = (cs.transformOrigin || '0 0').split(' ').map(parseFloat);
                if (Math.abs(m.b) < 1e-6 && Math.abs(m.c) < 1e-6 && m.a > 0 && m.d > 0) { x = r.left - m.e - (o[0] || 0) * (1 - m.a); y = r.top - m.f - (o[1] || 0) * (1 - m.d); }
            }
        } catch (e) { }
        return { x, y };
    }
    /* the 3D world's own stage (body-world-3d.js puts #bw3Stage and the WebGL canvas first in .sp-heroes). Only that: the Gap bubble
       (#spFast) holds a little canvas of its own and must shrink with the ring. */
    function isWorld(el) {
        if (!el) return false;
        if (el.id === 'bw3Stage' || (el.classList && (el.classList.contains('bw3-stage') || el.classList.contains('bw3-canvas')))) return true;
        const st = D.getElementById('bw3Stage');
        return !!(st && el !== st && el.contains && el.contains(st)) || (el.tagName === 'CANVAS' && !el.closest('#spFast, #spBubble'));
    }
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
        const out = solve({ c: g.c, mistyR: g.mistyR, ring: g.ring, groups, d, gap: opts.gap == null ? 10 : opts.gap, between: 8, even: !!opts.even,
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
            /* measured once while nothing is scaled. A layer with no transform of its own (the HUD) scales round Misty's centre in its own
               box. A layer that has one (Misty's button: translate(-50%, -50%) scale(--wh-mz)) keeps its transform-origin, because moving
               the origin would also move her own transform; the CSS translate property then holds her centre still: (1 - s) * (c - P0),
               P0 being the origin's point on screen. */
            z.saved = els.map(el => {
                let t = 'none', org = [0, 0];
                try { const cs = getComputedStyle(el); t = cs.transform || 'none'; org = (cs.transformOrigin || '0 0').split(' ').map(parseFloat); } catch (e) { }
                if (t === 'none') { const r = el.getBoundingClientRect(); return { el, o: (c.x - r.left) + 'px ' + (c.y - r.top) + 'px', tr: el.style.transition }; }
                const b = layoutBox(el);
                return { el, o: null, p0: { x: b.x + (org[0] || 0), y: b.y + (org[1] || 0) }, tr: el.style.transition };
            });
        }
        z.on = true; z.s = s; z.owner = owner || null; z.t++;
        const curve = '.5s cubic-bezier(.22,.9,.28,1.06)', k = Math.round(s * 1000) / 1000;
        H.classList.add('br-zoom');
        (z.saved || []).forEach(x => {
            if (x.o) { x.el.style.transformOrigin = x.o; x.el.style.transition = reduced() ? 'none' : 'scale ' + curve; }
            else { x.el.style.transition = reduced() ? 'none' : 'scale ' + curve + ', translate ' + curve; x.el.style.setProperty('translate', Math.round((1 - k) * (c.x - x.p0.x) * 10) / 10 + 'px ' + Math.round((1 - k) * (c.y - x.p0.y) * 10) / 10 + 'px', 'important'); } /* important: home-orbit-v2.css pins translate: none !important on the Gap bubble (#spFast) */
            x.el.style.scale = String(k);
        });
        try { W.dispatchEvent(new CustomEvent('lowi:bloom-zoom', { detail: { s, on: true } })); } catch (e) { }
    }
    function unzoom(owner) {
        if (!z.on || (owner && z.owner && owner !== z.owner)) return;
        const tick = ++z.t, saved = z.saved || [];
        z.on = false; z.s = 1; z.owner = null;
        saved.forEach(x => { x.el.style.scale = '1'; if (!x.o) x.el.style.setProperty('translate', '0px 0px', 'important'); });
        /* the camera comes forward again together with the bubbles (not 0.5 s later) */
        try { W.dispatchEvent(new CustomEvent('lowi:bloom-zoom', { detail: { s: 1, on: false, start: true } })); } catch (e) { }
        const done = () => {
            if (tick !== z.t) return;
            saved.forEach(x => { x.el.style.removeProperty('scale'); x.el.style.removeProperty('translate'); x.el.style.removeProperty('transform-origin'); x.el.style.transition = x.tr || ''; });
            z.saved = null; H.classList.remove('br-zoom');
            try { W.dispatchEvent(new CustomEvent('lowi:bloom-zoom', { detail: { s: 1, on: false } })); } catch (e) { }
        };
        if (reduced()) done(); else W.setTimeout(done, 520);
    }

    const homeUp = () => H.classList.contains('o8') && H.classList.contains('wh-home') && !H.classList.contains('wh-away') && !D.querySelector('.ss-sheet.on, .hl-sheet.on');
    /* ---- hold Scan = every bubble at once (Oct 24 2026, Emmanuel: holding the Scan button on Home opens all the bubbles; a normal
       tap on Scan still opens Scan). Same feel as holding Community: SCAN_HOLD_MS still, under SCAN_DRIFT px of drift; touch, pen
       and mouse. A light cue (.br-scan-holding) while the finger is down. Once the hold fired, the click that ends it (and on
       iOS the synthetic click after touchend) is swallowed, so a recognised hold never also opens Scan. ---- */
    const SCAN_HOLD_MS = 480, SCAN_DRIFT = 12;
    /* pure: what a press on Scan was. held = ms the finger stayed down, moved = px it drifted */
    function scanPress(p) {
        const held = +(p && p.held) || 0, moved = +(p && p.moved) || 0;
        if (moved > SCAN_DRIFT) return 'drag';
        return held >= SCAN_HOLD_MS ? 'hold' : 'tap';
    }
    const sh = { t: 0, at: null, el: null, down: 0, fired: false, swallowUntil: 0 };
    /* when the finger moved, by the event's own clock (a busy page runs the handlers late, the timestamps stay true) */
    function stamp(e) { const t = e && +e.timeStamp; return t > 0 ? t : Date.now(); }
    function scanEl(t) { return t && t.closest ? t.closest('#whHud [data-orbit="scan"]') : null; }
    function scanCue(on) { if (sh.el) sh.el.classList.toggle('br-scan-holding', !!on); if (!on) sh.el = null; }
    function scanCancel() { if (sh.t) { W.clearTimeout(sh.t); sh.t = 0; } sh.at = null; scanCue(false); }
    function onScanDown(e) {
        if (!sh.fired) sh.swallowUntil = 0;
        const el = scanEl(e.target);
        if (!el || (e.button && e.button !== 0) || e.isPrimary === false || !homeUp()) return;
        scanCancel(); sh.at = { x: e.clientX, y: e.clientY }; sh.down = stamp(e); sh.el = el; scanCue(true);
        sh.t = W.setTimeout(scanFire, SCAN_HOLD_MS);
    }
    function scanFire() {
        if (sh.t) { W.clearTimeout(sh.t); sh.t = 0; }
        sh.at = null; scanCue(false);
        if (!homeUp()) return;
        sh.fired = true; sh.swallowUntil = Date.now() + 60000;
        toggleAll();
    }
    function onScanMove(e) { if (sh.at && scanPress({ held: 0, moved: Math.hypot(e.clientX - sh.at.x, e.clientY - sh.at.y) }) === 'drag') scanCancel(); }
    /* the finger lifted after a hold that fired: the click it makes comes right after; swallow only that one */
    function onScanLift(e) {
        /* the page was too busy for the timer, but the finger really stayed down long enough: still a hold, never Scan */
        if (!sh.fired && sh.t && sh.at && e && e.type === 'pointerup' &&
            scanPress({ held: stamp(e) - sh.down, moved: Math.hypot(e.clientX - sh.at.x, e.clientY - sh.at.y) }) === 'hold') scanFire();
        if (sh.fired) { sh.fired = false; sh.swallowUntil = Date.now() + 450; }
        scanCancel();
    }
    function onScanClick(e) {
        if (!sh.fired && !(sh.swallowUntil && Date.now() < sh.swallowUntil)) return;
        sh.fired = false; sh.swallowUntil = 0;
        e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    }
    function onScanTouchEnd(e) { if (sh.fired || (sh.swallowUntil && Date.now() < sh.swallowUntil)) { try { if (e.cancelable) e.preventDefault(); } catch (x) { } } }
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
        /* hold Scan: before every other click handler (the window sees a click first) */
        D.addEventListener('pointerdown', onScanDown, true);
        D.addEventListener('pointermove', onScanMove, true);
        D.addEventListener('scroll', scanCancel, true);
        ['pointerup', 'pointercancel'].forEach(n => D.addEventListener(n, onScanLift, true));
        W.addEventListener('click', onScanClick, true);
        D.addEventListener('touchend', onScanTouchEnd, { capture: true, passive: false });
        D.addEventListener('contextmenu', e => { if (scanEl(e.target)) e.preventDefault(); }, true);
        W.addEventListener('resize', () => { if (z.on) { const B = W.LowiHomeBloomsV2; try { if (B && B.close) B.close(); } catch (e) { } try { const S = W.LowiHomeSettingsSleepV2; if (S && S.close) S.close(); } catch (e) { } unzoom(); } });
    }
    const state = () => ({ on: z.on, s: z.s, owner: z.owner });
    return { solve, pack, layoutAt, scanPress, SCAN_HOLD_MS, SCAN_DRIFT, stepFor, place, zoom, unzoom, state, toggleAll, mount: typeof window !== 'undefined' ? mount : null, _ring: ring, _layers: typeof window !== 'undefined' ? layers : null, _layoutBox: typeof window !== 'undefined' ? layoutBox : null };
});
