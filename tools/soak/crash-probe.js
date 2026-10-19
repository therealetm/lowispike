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
    /* bytes the GPU holds for buffers, textures and renderbuffers (estimate: what was uploaded and not deleted), and bytes sent per second */
    C.bytes = { buf: 0, tex: 0, rb: 0 }; C.up = 0;
    const sizeOf = new WeakMap(), boundBuf = new Map(), boundTex = new Map();
    let boundRb = null;
    const setSize = (o, kind, n) => { if (!o) return; const old = sizeOf.get(o); if (old) C.bytes[old[0]] -= old[1]; sizeOf.set(o, [kind, n]); C.bytes[kind] += n; };
    [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach(K => {
        const P = K && K.prototype; if (!P) return;
        const w = (n, f) => { const o = P[n]; if (typeof o === 'function') P[n] = function () { try { f.apply(this, arguments); } catch (e) { } return o.apply(this, arguments); }; };
        w('bindBuffer', function (t, b) { boundBuf.set(t, b); });
        w('bufferData', function (t, d) { const n = typeof d === 'number' ? d : (d && d.byteLength) || 0; setSize(boundBuf.get(t), 'buf', n); C.up += n; });
        w('bufferSubData', function (t, o, d) { C.up += (d && d.byteLength) || 0; });
        w('deleteBuffer', function (b) { const old = b && sizeOf.get(b); if (old) { C.bytes.buf -= old[1]; sizeOf.delete(b); } });
        w('activeTexture', function (u) { this.__u = u; });
        w('bindTexture', function (t, x) { boundTex.set((this.__u || 0) + ':' + t, x); });
        const texUp = function (t, level, ifmt, a3, a4, a5) { if (level) return; let wd = 0, ht = 0; if (typeof a3 === 'number' && typeof a4 === 'number') { wd = a3; ht = a4; } else { const src = arguments[5] || a5 || a3; wd = (src && (src.width || src.videoWidth)) || 0; ht = (src && (src.height || src.videoHeight)) || 0; }
            const key = (this.__u || 0) + ':' + (t >= 0x8515 && t <= 0x851A ? 0x8513 : t); const n = wd * ht * 4 * (t >= 0x8515 && t <= 0x851A ? 1 : 1); const tex = boundTex.get(key); if (!tex) return;
            if (t >= 0x8515 && t <= 0x851A) { const old = sizeOf.get(tex); setSize(tex, 'tex', (old && old[0] === 'tex' && old.face !== t ? old[1] : 0) + n); } else setSize(tex, 'tex', n); C.up += n; };
        w('texImage2D', texUp);
        w('texStorage2D', function (t, lv, f, wd, ht) { const tex = boundTex.get((this.__u || 0) + ':' + t); setSize(tex, 'tex', wd * ht * 4 * (lv > 1 ? 1.33 : 1)); });
        w('deleteTexture', function (x) { const old = x && sizeOf.get(x); if (old) { C.bytes.tex -= old[1]; sizeOf.delete(x); } });
        w('bindRenderbuffer', function (t, r) { boundRb = r; });
        w('renderbufferStorage', function (t, f, wd, ht) { setSize(boundRb, 'rb', wd * ht * 4); });
        w('renderbufferStorageMultisample', function (t, smp, f, wd, ht) { setSize(boundRb, 'rb', wd * ht * 4 * Math.max(1, smp)); });
        w('deleteRenderbuffer', function (r) { const old = r && sizeOf.get(r); if (old) { C.bytes.rb -= old[1]; sizeOf.delete(r); } });
    });
    try { new PerformanceObserver(l => l.getEntries().forEach(e => { C.longTasks++; C.longMs += e.duration; })).observe({ type: 'longtask', buffered: true }); } catch (e) { }
    window.addEventListener('error', e => { if (C.errs.length < 50) C.errs.push(String(e.message).slice(0, 200) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
    window.addEventListener('unhandledrejection', e => { if (C.errs.length < 50) C.errs.push('rejection ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 240)); });
    C.rafMark = { t: now(), n: 0, by: {} };
    /* which geometries / textures left the scene without being disposed (three.js keeps their GPU copy until dispose) */
    const seenG = new Map(); let gHooked = false;
    C.geoAudit = function () {
        const a = window.LowiWorld3D, T = a && a.THREE; if (!a || !a.scene || !T) return null;
        if (!gHooked) { gHooked = true; const d = T.BufferGeometry.prototype.dispose; T.BufferGeometry.prototype.dispose = function () { const r = seenG.get(this.uuid); if (r) r.disposed = true; return d.apply(this, arguments); }; }
        const inScene = new Set();
        const path = o => { const n = []; let x = o; for (let i = 0; x && i < 5; i++, x = x.parent) n.push(x.name || x.type); return n.join('<'); };
        a.scene.traverse(o => { const g = o.geometry; if (!g) return; inScene.add(g.uuid); if (!seenG.has(g.uuid)) seenG.set(g.uuid, { path: path(o), type: g.type, v: g.attributes && g.attributes.position ? g.attributes.position.count : 0, disposed: false, t: Math.round(now() / 1000) }); });
        const orphans = {}; let n = 0;
        seenG.forEach((r, id) => { if (inScene.has(id)) return; if (r.disposed) { seenG.delete(id); return; } n++; const k = r.type + ' ' + r.path; orphans[k] = (orphans[k] || 0) + 1; });
        return { tracked: seenG.size, inScene: inScene.size, orphanCount: n, orphans };
    };
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
            canv: document.getElementsByTagName('canvas').length, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, long: C.longTasks, longMs: Math.round(C.longMs), maxGap: Math.round(mx), gaps: C.gaps.slice(-5), glCopies: C.glCopies.splice(0), gpuMB: { buf: +(C.bytes.buf / 1048576).toFixed(1), tex: +(C.bytes.tex / 1048576).toFixed(1), rb: +(C.bytes.rb / 1048576).toFixed(1) }, upMBs: +(C.up / 1048576 / dt).toFixed(2), _up: (C.up = 0), geo: (() => { try { return C.geoAudit(); } catch (e) { return { err: String(e.message) }; } })(), canvMB: +[].reduce.call(document.getElementsByTagName('canvas'), (a, c) => a + c.width * c.height * 4 / 1048576, 0).toFixed(1), three, errs: C.errs.slice(-5) };
    };
})();
