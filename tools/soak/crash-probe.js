/* LOWiSPIKE crash-squad probe (injected before any app script by tools/soak/crash-soak.cjs). Light on purpose, so it can run for
   half an hour in a slow emulator: it only counts what makes iOS Safari kill a tab or a game freeze.
   - live GPU objects: WebGL textures, buffers, programs, framebuffers, renderbuffers created minus deleted
   - graphics contexts made and still alive, webglcontextlost / restored events
   - frame loops: requestAnimationFrame callbacks per second and by the script that asked (a stacked loop shows as a rising count)
   - timers: live setInterval ids, pending setTimeout ids
   - event listeners on window, document, visualViewport and media queries (added minus removed, by type)
   - long tasks and the longest gap between two animation frames (a freeze)
   Every wrapper calls straight through; it changes no app behaviour. */
(function () {
    'use strict';
    if (window.__cs) return;
    const now = () => performance.now();
    const C = window.__cs = { live: { tex: 0, buf: 0, prog: 0, fb: 0, rb: 0, sh: 0, va: 0 }, ctx: [], lost: 0, lostOff: 0, restored: 0, raf: 0, rafBy: Object.create(null),
        iv: new Set(), to: new Set(), lis: Object.create(null), longTasks: 0, longMs: 0, maxGap: 0, gapAt: 0, lastF: 0, gaps: [], errs: [] };
    function caller() {
        const st = (new Error().stack || '').split('\n');
        for (let i = 2; i < st.length; i++) { const m = st[i].match(/\/([\w.-]+\.(?:js|html|mjs))(?:\?[^:]*)?:(\d+)/); if (m && m[1] !== 'crash-probe.js') return m[1] + ':' + m[2]; }
        return '?';
    }
    /* frame loops + the freeze clock */
    const rAF = window.requestAnimationFrame.bind(window);
    const byFn = new WeakMap();
    window.requestAnimationFrame = function (cb) {
        let who = cb && byFn.get(cb); if (!who) { who = caller(); if (cb) try { byFn.set(cb, who); } catch (e) { } }
        return rAF(function (t) { C.raf++; C.rafBy[who] = (C.rafBy[who] || 0) + 1; return cb(t); });
    };
    (function beat() { rAF(function () { const t = now(); if (C.lastF && !document.hidden) { const g = t - C.lastF; if (g > C.maxGap) { C.maxGap = g; C.gapAt = t; } if (g > 1500) C.gaps.push([Math.round(t / 1000), Math.round(g)]); } C.lastF = t; beat(); }); })();
    document.addEventListener('visibilitychange', () => { C.lastF = 0; });
    /* timers */
    const sI = window.setInterval, cI = window.clearInterval, sT = window.setTimeout, cT = window.clearTimeout;
    window.setInterval = function () { const id = sI.apply(this, arguments); C.iv.add(id); return id; };
    window.clearInterval = function (id) { C.iv.delete(id); return cI.call(this, id); };
    window.setTimeout = function (fn) { const a = Array.prototype.slice.call(arguments); let id; if (typeof fn === 'function') a[0] = function () { C.to.delete(id); return fn.apply(this, arguments); }; id = sT.apply(this, a); C.to.add(id); return id; };
    window.clearTimeout = function (id) { C.to.delete(id); return cT.call(this, id); };
    /* listeners on the long-lived targets (listeners on page elements die with them) */
    const aE = EventTarget.prototype.addEventListener, rE = EventTarget.prototype.removeEventListener;
    const reg = new WeakMap();
    function kind(t) { if (t === window) return 'win'; if (t === document) return 'doc'; if (window.visualViewport && t === window.visualViewport) return 'vv'; if (typeof MediaQueryList !== 'undefined' && t instanceof MediaQueryList) return 'mq'; if (t === document.documentElement) return 'html'; if (t === document.body) return 'body'; return null; }
    EventTarget.prototype.addEventListener = function (type, fn, o) {
        const k = fn && kind(this);
        if (k) { let m = reg.get(this); if (!m) reg.set(this, m = new Map()); const cap = !!(o === true || (o && o.capture)); const key = type + (cap ? '!' : ''); let s = m.get(key); if (!s) m.set(key, s = new Set());
            if (!s.has(fn)) { s.add(fn); const n = k + ':' + type; C.lis[n] = (C.lis[n] || 0) + 1; if (o && o.once) { const self = this; const w = fn; aE.call(this, type, function () { if (s.delete(w)) C.lis[n]--; }, { once: true, capture: cap }); } } }
        return aE.apply(this, arguments);
    };
    EventTarget.prototype.removeEventListener = function (type, fn, o) {
        const k = fn && kind(this);
        if (k) { const m = reg.get(this); const cap = !!(o === true || (o && o.capture)); const s = m && m.get(type + (cap ? '!' : '')); if (s && s.delete(fn)) C.lis[k + ':' + type]--; }
        return rE.apply(this, arguments);
    };
    /* graphics */
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, o) {
        const had = this.__csCtx; const c = gc.call(this, type, o);
        if (c && !had) { this.__csCtx = type; C.ctx.push({ type: String(type), by: caller(), cv: new WeakRef(this), gl: c }); if (/webgl/.test(type)) { const cv = this; aE.call(this, 'webglcontextlost', () => { if (cv.isConnected) C.lost++; else C.lostOff++; }); aE.call(this, 'webglcontextrestored', () => { C.restored++; }); } }
        return c;
    };
    const LIVE = { createTexture: ['tex', 1], deleteTexture: ['tex', -1], createBuffer: ['buf', 1], deleteBuffer: ['buf', -1], createProgram: ['prog', 1], deleteProgram: ['prog', -1],
        createFramebuffer: ['fb', 1], deleteFramebuffer: ['fb', -1], createRenderbuffer: ['rb', 1], deleteRenderbuffer: ['rb', -1], createShader: ['sh', 1], deleteShader: ['sh', -1], createVertexArray: ['va', 1], deleteVertexArray: ['va', -1] };
    [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach(K => {
        const P = K && K.prototype; if (!P) return;
        Object.keys(LIVE).forEach(n => { const f = P[n]; if (typeof f !== 'function') return; P[n] = function (x) { const neg = LIVE[n][1] < 0; if (!neg || x) C.live[LIVE[n][0]] += LIVE[n][1]; return f.apply(this, arguments); }; });
    });
    /* copies of the 3D canvas into a 2D canvas (a GPU read-back: slow, and each copy is a full-size bitmap) */
    C.glCopies = []; C.bigCanv = 0;
    const dI = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (src) {
        if (src && src.__csCtx && /webgl/.test(src.__csCtx)) { const a = now(); const r = dI.apply(this, arguments); if (C.glCopies.length > 200) C.glCopies.shift(); C.glCopies.push({ ms: Math.round(now() - a), w: this.canvas.width, h: this.canvas.height, by: caller() }); return r; }
        return dI.apply(this, arguments);
    };
    try { new PerformanceObserver(l => l.getEntries().forEach(e => { C.longTasks++; C.longMs += e.duration; })).observe({ type: 'longtask', buffered: true }); } catch (e) { }
    window.addEventListener('error', e => { if (C.errs.length < 50) C.errs.push(String(e.message).slice(0, 200) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
    window.addEventListener('unhandledrejection', e => { if (C.errs.length < 50) C.errs.push('rejection ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 240)); });
    C.rafMark = { t: now(), n: 0, by: {} };
    /* the numbers, once */
    C.snap = function () {
        const t = now(), dt = Math.max(0.001, (t - C.rafMark.t) / 1000), rps = (C.raf - C.rafMark.n) / dt, by = {};
        Object.keys(C.rafBy).forEach(k => { const d = C.rafBy[k] - (C.rafMark.by[k] || 0); if (d > 0) by[k] = +(d / dt).toFixed(1); });
        C.rafMark = { t, n: C.raf, by: Object.assign({}, C.rafBy) };
        const alive = C.ctx.filter(c => { const v = c.cv.deref(); return v && v.isConnected; });
        const lisSum = Object.values(C.lis).reduce((a, b) => a + b, 0);
        let three = null;
        try { const a = window.LowiWorld3D; if (a && a.renderer) { const i = a.renderer.info; let objs = 0; a.scene && a.scene.traverse(() => objs++); three = { geo: i.memory.geometries, tex: i.memory.textures, progs: (i.programs || []).length, objs, calls: i.render.calls, tris: i.render.triangles, w: a.renderer.domElement.width, h: a.renderer.domElement.height, pr: a.renderer.getPixelRatio() }; } } catch (e) { three = { err: String(e.message) }; }
        const mx = C.maxGap; C.maxGap = 0;
        return { t: Math.round(t), raf: +rps.toFixed(1), rafBy: by, live: Object.assign({}, C.live), ctxMade: C.ctx.length, ctxGL: alive.filter(c => /webgl/.test(c.type)).length, ctxAll: alive.length, ctxBy: C.ctx.reduce((m, c) => (m[c.type + ' ' + c.by] = (m[c.type + ' ' + c.by] || 0) + 1, m), {}),
            lost: C.lost, restored: C.restored, iv: C.iv.size, to: C.to.size, lis: lisSum, lisBy: Object.assign({}, C.lis), nodes: document.getElementsByTagName('*').length,
            canv: document.getElementsByTagName('canvas').length, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, long: C.longTasks, longMs: Math.round(C.longMs), maxGap: Math.round(mx), gaps: C.gaps.slice(-5), glCopies: C.glCopies.splice(0), canvMB: +[].reduce.call(document.getElementsByTagName('canvas'), (a, c) => a + c.width * c.height * 4 / 1048576, 0).toFixed(1), three, errs: C.errs.slice(-5) };
    };
})();
