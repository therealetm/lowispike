/* ===== Water bubble fasting timer (Oct 14, 2026) =====
   Turns the Home fasting hero (#spFast, painted by spirit.js paintFast) into a liquid bubble:
   a canvas of real-feeling water at the fill level paintFast already sets (--sp-fill), the next body-stage
   marker (LowiFast.stages) for screen readers, and gentle water movement when you touch it (stage ticks removed Oct 18).
   Read-only on purpose: it never writes lowi_fast_v1 or any health data, never starts/stops a fast and
   never changes the bubble's text. Tap still opens the fasting sheet; a drag only plays with the water.
   Reduced motion: one calm still frame, no loop, no ripples. Re-attaches when Home is rebuilt. */
(function (root) {
    'use strict';

    /* ---------- core: pure helpers (tested in node) ---------- */
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const MIN_LEVEL = 0.06, MAX_LEVEL = 0.95;

    /* the visible water height for a fill share (0..1). A fast that hasn't started still shows a shallow pool. */
    function level(pct, running) {
        const p = Number.isFinite(+pct) ? +pct : 0;
        if (!running) return MIN_LEVEL;
        return clamp(p, MIN_LEVEL, MAX_LEVEL);
    }

    /* "42.5%" -> 0.425 */
    function parseFill(v) {
        const n = parseFloat(String(v == null ? '' : v));
        return Number.isFinite(n) ? clamp(n / 100, 0, 1) : 0;
    }

    /* stage markers that sit inside the glass: 0 < h < goal. y is the share of the height from the bottom. */
    function marks(stages, goal, elapsedH) {
        const g = +goal > 0 ? +goal : 16, el = +elapsedH || 0;
        const list = (Array.isArray(stages) ? stages : []).filter(s => s && +s.h > 0 && +s.h < g)
            .map(s => ({ h: +s.h, n: String(s.n || ''), y: +s.h / g, past: el >= +s.h }))
            .sort((a, b) => a.h - b.h);
        const nx = list.find(m => !m.past);
        list.forEach(m => { m.next = m === nx; });
        return list;
    }

    /* the next stage after the elapsed hours, goal included (for the screen reader line) */
    function nextStage(stages, goal, elapsedH) {
        const g = +goal > 0 ? +goal : 16, el = +elapsedH || 0;
        const all = (Array.isArray(stages) ? stages : []).filter(s => s && +s.h > el && +s.h > 0).sort((a, b) => a.h - b.h);
        if (all.length) return { h: +all[0].h, n: String(all[0].n || '') };
        return el < g ? { h: g, n: '' } : null;
    }

    /* a spring surface: N columns, each pulled back to rest and coupled to its neighbours */
    function surface(n) {
        return { n, h: new Float32Array(n), v: new Float32Array(n), tilt: 0, tv: 0 };
    }
    function step(s, dt) {
        const k = 42, damp = 3.2, spread = 18, n = s.n, h = s.h, v = s.v;
        const t = clamp(dt, 0, 1 / 20);
        for (let i = 0; i < n; i++) v[i] += (-k * h[i] - damp * v[i]) * t;
        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < n; i++) {
                const l = i > 0 ? h[i - 1] : h[i], r = i < n - 1 ? h[i + 1] : h[i];
                v[i] += spread * (l + r - 2 * h[i]) * t;
            }
        }
        for (let i = 0; i < n; i++) h[i] += v[i] * t;
        s.tv += (-30 * s.tilt - 4.2 * s.tv) * t;
        s.tilt = clamp(s.tilt + s.tv * t, -0.4, 0.4);
        return s;
    }
    /* push the water at x (0..1) with a soft fall-off. Positive = down. */
    function poke(s, x, amt) {
        const c = clamp(x, 0, 1) * (s.n - 1), w = Math.max(1.4, s.n / 9);
        for (let i = 0; i < s.n; i++) { const d = (i - c) / w; s.v[i] += amt * Math.exp(-d * d); }
        return s;
    }
    function energy(s) {
        let e = s.tilt * s.tilt + s.tv * s.tv * 0.02;
        for (let i = 0; i < s.n; i++) e += s.h[i] * s.h[i] + s.v[i] * s.v[i] * 0.02;
        return e;
    }
    /* the text inside the bubble keeps its own place: a marker label only shows where it doesn't touch it */
    function overlaps(a, list, pad) {
        const p = pad || 0;
        return (list || []).some(b => a.x < b.x + b.w + p && a.x + a.w > b.x - p && a.y < b.y + b.h + p && a.y + a.h > b.y - p);
    }

    const Core = { level, parseFill, marks, nextStage, surface, step, poke, energy, overlaps, MIN_LEVEL, MAX_LEVEL };
    if (typeof module === 'object' && module.exports) module.exports = Core;
    if (typeof document === 'undefined' || !root) return;
    root.LowiFastBubbleCore = Core;

    /* ---------- the bubble on Home ---------- */
    const D = document;
    const mq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduced = () => !!(mq && mq.matches);
    const COPY = {
        en: { next: (h, n) => 'Next marker ' + h + ' h' + (n ? ': ' + n : ''), goal: h => 'Goal ' + h + ' h', done: 'Goal reached' },
        de: { next: (h, n) => 'Nächste Marke ' + h + ' h' + (n ? ': ' + n : ''), goal: h => 'Ziel ' + h + ' h', done: 'Ziel erreicht' },
        es: { next: (h, n) => 'Siguiente marca ' + h + ' h' + (n ? ': ' + n : ''), goal: h => 'Objetivo ' + h + ' h', done: 'Objetivo alcanzado' }
    };
    const lang = () => { try { const l = root.LowiLang && LowiLang.get ? LowiLang.get() : (D.documentElement.lang || 'en'); const k = String(l).slice(0, 2); return COPY[k] ? k : 'en'; } catch (e) { return 'en'; } };

    /* read the fast exactly like spirit.js fastModel(), never writing anything */
    function model() {
        let f = {};
        try { f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}') || {}; } catch (e) {}
        let start = 0;
        try { start = root.LowiFastStop && LowiFastStop.startOf ? +LowiFastStop.startOf() || 0 : +f.last || 0; } catch (e) { start = +f.last || 0; }
        let goal = +f.target || 16;
        try { goal = +LowiFE.target() || goal; } catch (e) {}
        let stages = [];
        try { stages = root.LowiFast && LowiFast.stages ? LowiFast.stages() : []; } catch (e) {}
        const el = start && start <= Date.now() ? (Date.now() - start) / 36e5 : 0;
        return { start, goal, el, stages };
    }

    let B = null; /* the attached bubble */

    function attach() {
        const el = D.getElementById('spFast');
        if (!el || (B && B.el === el && el.contains(B.cv))) return;
        if (B) detach();
        const cv = D.createElement('canvas');
        cv.className = 'fb-cv';
        cv.setAttribute('aria-hidden', 'true');
        const sr = D.createElement('span');
        sr.className = 'fb-sr';
        el.insertBefore(cv, el.firstChild);
        el.appendChild(sr);
        el.classList.add('fb-on');
        B = { el, cv, sr, ctx: cv.getContext('2d'), s: surface(32), W: 0, H: 0, dpr: 1, lv: -1, target: MIN_LEVEL, done: false, running: false,
            t: 0, last: 0, raf: 0, idle: 0, key: '', sync: 0, drops: [], bub: [], ptr: null, dragged: false, visible: true, io: null, ro: null, lastPoke: 0 };
        if (!B.ctx) { detach(); return; }
        bind(B);
        resize(B);
        readState(B, true);
        kick();
    }

    function detach() {
        if (!B) return;
        cancelAnimationFrame(B.raf);
        clearTimeout(B.idle);
        try { B.io && B.io.disconnect(); } catch (e) {}
        try { B.ro && B.ro.disconnect(); } catch (e) {}
        try { B.cv.remove(); B.sr.remove(); B.el.classList.remove('fb-on', 'fb-touch'); } catch (e) {}
        B = null;
    }

    function resize(b) {
        const r = b.el.getBoundingClientRect();
        const bw = b.el.clientWidth || r.width, bh = b.el.clientHeight || r.height;
        if (!bw || !bh) return;
        const dpr = clamp(root.devicePixelRatio || 1, 1, 3);
        if (Math.abs(bw - b.W) < 0.5 && Math.abs(bh - b.H) < 0.5 && dpr === b.dpr) return;
        b.W = bw; b.H = bh; b.dpr = dpr;
        b.cv.width = Math.round(bw * dpr);
        b.cv.height = Math.round(bh * dpr);
        b.key = '';
        readState(b, true);
        draw(b, 0);
    }

    function readState(b, force) {
        const fill = parseFill(b.el.style.getPropertyValue('--sp-fill'));
        const m = model();
        const running = !!m.start;
        b.running = running;
        b.done = b.el.classList.contains('done');
        b.target = level(fill, running);
        if (b.lv < 0 || reduced()) b.lv = b.target;
        const key = [running ? 1 : 0, m.goal, Math.floor(m.el * 60), Math.round(b.W), lang(), b.done ? 1 : 0, (b.el.querySelector('.sp-fast-copy') || {}).innerHTML || ''].join('|');
        if (!force && key === b.key) return;
        b.key = key;
        paintMarks(b, m);
    }

    /* the next body-stage marker, for screen readers (and the fasting sheet has the full list).
       Oct 18 (E-man, iPad screenshot: "some of the bubbles there are straight lines and the old design is still inside of the new
       design"): the stage ticks and hour labels on the right inner rim are gone. They were short white dashes from the flat design,
       drawn inside the 3D living glass. The fast itself still shows as the water level and the "10h 53min of 16h" text. */
    function paintMarks(b, m) {
        const c = COPY[lang()];
        let sr = '';
        if (m.start) {
            const nx = nextStage(m.stages, m.goal, m.el);
            sr = b.done || !nx ? c.done : nx.n ? c.next(nx.h, nx.n) : c.goal(nx.h);
        }
        sr = sr ? ' · ' + sr : '';
        if (b.sr.textContent !== sr) b.sr.textContent = sr;
    }

    /* ---------- touch: the water follows the finger, a tap still opens the sheet ---------- */
    function bind(b) {
        const el = b.el;
        const local = e => { const r = el.getBoundingClientRect(); return { x: (e.clientX - r.left) / (r.width || 1), y: (e.clientY - r.top) / (r.height || 1) }; };
        el.addEventListener('pointerdown', e => {
            if (!B || B.el !== el) return;
            const p = local(e);
            b.ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: p.x, lx: e.clientX, lt: performance.now() };
            b.dragged = false;
            b.lastPoke = performance.now();
            el.classList.add('fb-touch');
            if (!reduced()) { poke(b.s, p.x, 1.1); splash(b, p.x, 2); kick(); }
        }, { passive: true });
        el.addEventListener('pointermove', e => {
            const pt = b.ptr;
            if (!pt || pt.id !== e.pointerId) return;
            const now = performance.now(), p = local(e), dx = e.clientX - pt.lx, dtm = Math.max(8, now - pt.lt);
            if (Math.hypot(e.clientX - pt.x0, e.clientY - pt.y0) > 10) b.dragged = true;
            if (!reduced()) {
                const vx = dx / dtm;
                b.s.tv += clamp(vx, -3, 3) * 0.35;
                poke(b.s, p.x, clamp(Math.abs(vx), 0, 2) * 0.35);
                kick();
            }
            pt.lx = e.clientX; pt.lt = now; pt.x = p.x;
        }, { passive: true });
        const end = e => {
            const pt = b.ptr;
            if (!pt || (e && pt.id !== e.pointerId)) return;
            b.ptr = null;
            el.classList.remove('fb-touch');
            if (!reduced()) { poke(b.s, pt.x, -0.45); kick(); }
        };
        el.addEventListener('pointerup', end, { passive: true });
        el.addEventListener('pointercancel', e => { end(e); b.dragged = false; }, { passive: true });
        el.addEventListener('pointerleave', end, { passive: true });
        /* a drag across the bubble only plays with the water; it doesn't open the fasting sheet */
        el.addEventListener('click', e => {
            if (b.dragged) { b.dragged = false; e.stopPropagation(); e.preventDefault(); return; }
            if (!reduced() && performance.now() - b.lastPoke > 500) { poke(b.s, 0.5, 1.1); splash(b, 0.5, 3); kick(); }
        }, true);
        if ('IntersectionObserver' in root) {
            b.io = new IntersectionObserver(es => { es.forEach(x => { b.visible = x.isIntersecting; }); if (b.visible) kick(); });
            b.io.observe(el);
        }
        if ('ResizeObserver' in root) {
            b.ro = new ResizeObserver(() => resize(b));
            b.ro.observe(el);
        }
    }

    /* a few droplets hop off the surface and fall back in */
    function splash(b, x, n) {
        if (b.drops.length > 10) return;
        for (let i = 0; i < n; i++) b.drops.push({ x: clamp(x + (Math.random() - 0.5) * 0.12, 0.08, 0.92), y: 0, vx: (Math.random() - 0.5) * 0.25, vy: -(0.32 + Math.random() * 0.22), r: 1 + Math.random() * 1.3 });
    }

    /* ---------- drawing ---------- */
    const PAL = {
        dark: { top: [118, 210, 238], bot: [52, 92, 188], a1: 0.76, a2: 0.92, back: 0.3 },
        light: { top: [150, 222, 245], bot: [92, 146, 222], a1: 0.62, a2: 0.74, back: 0.26 },
        doneDark: { top: [158, 240, 214], bot: [56, 150, 170], a1: 0.8, a2: 0.92, back: 0.34 },
        doneLight: { top: [170, 238, 214], bot: [80, 170, 176], a1: 0.64, a2: 0.78, back: 0.28 }
    };
    const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';

    function surfY(b, i, base, amp, t) {
        const s = b.s, n = s.n, x = i / (n - 1);
        const amb = reduced() ? 0 : amp * (Math.sin(x * 5.2 + t * 1.15) * 0.6 + Math.sin(x * 9.1 - t * 1.7) * 0.4);
        return base + s.h[i] * b.H * 0.2 + amb + s.tilt * (x - 0.5) * b.H * 0.18;
    }

    function draw(b, dt) {
        const ctx = b.ctx, W = b.W, H = b.H, dpr = b.dpr;
        if (!ctx || !W || !H) return;
        const light = D.documentElement.getAttribute('data-theme') === 'light';
        const P = b.done ? (light ? PAL.doneLight : PAL.doneDark) : (light ? PAL.light : PAL.dark);
        const t = b.t;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const base = H * (1 - b.lv), amp = H * 0.016, n = b.s.n, stepX = W / (n - 1);
        const ys = new Array(n);
        for (let i = 0; i < n; i++) ys[i] = surfY(b, i, base, amp, t);
        const path = (off, phase) => {
            ctx.beginPath();
            ctx.moveTo(-2, H + 2);
            for (let i = 0; i < n; i++) {
                const x = i * stepX, back = reduced() ? 0 : Math.sin(i / (n - 1) * 6.3 - t * 0.9 + phase) * amp * 0.8;
                ctx.lineTo(x, ys[i] + off + back);
            }
            ctx.lineTo(W + 2, H + 2);
            ctx.closePath();
        };
        /* back layer: lighter, a touch higher, out of phase = depth */
        path(-H * 0.022, 2.1);
        ctx.fillStyle = rgba(P.top, P.back);
        ctx.fill();
        /* body */
        path(0, 0);
        const g = ctx.createLinearGradient(0, Math.max(0, base - amp * 2), 0, H);
        g.addColorStop(0, rgba(P.top, P.a1));
        g.addColorStop(1, rgba(P.bot, P.a2));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.save();
        path(0, 0);
        ctx.clip();
        /* soft light moving through the water */
        if (!reduced()) {
            for (let k = 0; k < 2; k++) {
                const lx = W * (0.3 + 0.4 * Math.sin(t * 0.21 + k * 2.4)), ly = base + (H - base) * (0.45 + 0.2 * Math.sin(t * 0.17 + k));
                const rg = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.32);
                rg.addColorStop(0, 'rgba(255,255,255,' + (light ? 0.1 : 0.08) + ')');
                rg.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.fillStyle = rg;
                ctx.fillRect(0, 0, W, H);
            }
        }
        /* band of light just under the surface */
        const band = ctx.createLinearGradient(0, base - amp, 0, base + H * 0.09);
        band.addColorStop(0, 'rgba(255,255,255,0.18)');
        band.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = band;
        ctx.fillRect(0, base - amp * 3, W, H * 0.14 + amp * 3);
        /* depth at the bottom of the glass */
        const deep = ctx.createRadialGradient(W / 2, H * 1.08, H * 0.1, W / 2, H * 1.08, H * 0.7);
        deep.addColorStop(0, rgba(P.bot, 0.35));
        deep.addColorStop(1, rgba(P.bot, 0));
        ctx.fillStyle = deep;
        ctx.fillRect(0, 0, W, H);
        /* tiny bubbles rising */
        if (!reduced()) {
            const want = b.done ? 9 : 5;
            if (b.bub.length < want && Math.random() < dt * 1.4) b.bub.push({ x: 0.2 + Math.random() * 0.6, y: 1.02, r: 0.8 + Math.random() * 1.6, sp: 0.05 + Math.random() * 0.06, ph: Math.random() * 6 });
            for (let i = b.bub.length - 1; i >= 0; i--) {
                const q = b.bub[i];
                q.y -= q.sp * dt;
                const px = (q.x + Math.sin(t * 2 + q.ph) * 0.012) * W, py = q.y * H;
                if (py < base + 2) { b.bub.splice(i, 1); continue; }
                ctx.beginPath();
                ctx.arc(px, py, q.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.fill();
                ctx.lineWidth = 0.8;
                ctx.strokeStyle = 'rgba(255,255,255,0.55)';
                ctx.stroke();
            }
        }
        ctx.restore();
        /* the surface: a soft glow along the water's edge */
        ctx.beginPath();
        for (let i = 0; i < n; i++) { const x = i * stepX; if (i) ctx.lineTo(x, ys[i]); else ctx.moveTo(x, ys[i]); }
        /* Oct 18: soft glow only. The hard 1.4px white line was the flat design's meniscus: on calm water it read as a straight
           line across the new glass bubble (E-man's iPad screenshot). The water keeps its colour edge, waves and touch ripples. */
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.stroke();
        /* droplets */
        for (let i = b.drops.length - 1; i >= 0; i--) {
            const d = b.drops[i];
            d.vy += 1.3 * dt; d.y += d.vy * dt; d.x += d.vx * dt * 0.3;
            const px = d.x * W, py = base + d.y * H;
            if (d.y > 0.01 && d.vy > 0) { b.drops.splice(i, 1); poke(b.s, d.x, 0.18); continue; }
            ctx.beginPath();
            ctx.arc(px, py, d.r, 0, Math.PI * 2);
            ctx.fillStyle = rgba(P.top, 0.95);
            ctx.fill();
        }
    }

    /* ---------- the loop: runs only while something moves and the bubble is on screen ---------- */
    function paused(b) {
        if (D.hidden || !b.visible || !b.el.isConnected) return true;
        if (b.el.classList.contains('lb-liq')) return true; /* the living membrane draws this water in 3D (living-bubbles.js): no 2D loop */
        const w = D.getElementById('spWorld');
        return !!(w && !w.hidden);
    }
    function frame(now) {
        const b = B;
        if (!b) return;
        b.raf = 0;
        if (!b.el.isConnected) { detach(); attach(); return; }
        const dt = b.last ? clamp((now - b.last) / 1000, 0, 0.05) : 1 / 60;
        b.last = now;
        if (now - b.sync > 1000) { b.sync = now; readState(b, false); }
        if (reduced()) { b.lv = b.target; draw(b, 0); return; }
        if (paused(b)) { b.last = 0; clearTimeout(b.idle); b.idle = setTimeout(kick, 800); return; }
        b.t += dt;
        b.lv += (b.target - b.lv) * clamp(dt * 2.2, 0, 1);
        step(b.s, dt);
        /* calm water: about 30 frames a second is plenty; touch gets every frame */
        const calm = !b.ptr && !b.drops.length && energy(b.s) < 0.002 && Math.abs(b.target - b.lv) < 0.002;
        b.odd = !b.odd;
        if (!calm || b.odd) draw(b, calm ? dt * 2 : dt);
        b.raf = requestAnimationFrame(frame);
    }
    function kick() {
        if (!B || B.raf) return;
        clearTimeout(B.idle);
        if (reduced()) { readState(B, false); B.lv = B.target; draw(B, 0); return; }
        B.last = 0;
        B.raf = requestAnimationFrame(frame);
    }

    /* Home can be rebuilt at any time (tab switches, language, sign-in): find the bubble again */
    let pending = 0;
    function watch() {
        if (pending) return;
        pending = requestAnimationFrame(() => { pending = 0; const el = D.getElementById('spFast'); if (el && (!B || B.el !== el || !el.contains(B.cv))) attach(); else if (!el && B) detach(); });
    }
    function boot() {
        attach();
        try { new MutationObserver(watch).observe(D.body, { childList: true, subtree: true }); } catch (e) {}
        setInterval(() => { watch(); if (B && reduced()) { readState(B, false); B.lv = B.target; draw(B, 0); } }, 30000);
        D.addEventListener('visibilitychange', () => { if (!D.hidden) { watch(); kick(); } });
        if (mq) { const f = () => { if (!B) return; cancelAnimationFrame(B.raf); B.raf = 0; B.drops = []; B.bub = []; B.s = surface(32); readState(B, true); B.lv = B.target; draw(B, 0); kick(); }; try { mq.addEventListener('change', f); } catch (e) { try { mq.addListener(f); } catch (x) {} } }
    }
    root.LowiFastBubble = {
        attach, state: () => B ? { on: true, level: +B.lv.toFixed(3), target: +B.target.toFixed(3), running: B.running, done: B.done, marks: B.el.querySelectorAll('.fb-tick').length, labels: B.el.querySelectorAll('.fb-lab').length, sr: B.sr.textContent, looping: !!B.raf, energy: +energy(B.s).toFixed(4) } : { on: false },
        poke: (x, a) => { if (B && !reduced()) { poke(B.s, x == null ? 0.5 : x, a == null ? 1 : a); kick(); } }
    };
    if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : null);
