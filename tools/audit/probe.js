/* LOWiSPIKE audit probe (init script). Counts what a long session accumulates: live timers, net event listeners,
   live observers, canvases/contexts, plus every error and unhandled rejection. Read with window.__audit.snap().
   Pure instrumentation: it wraps browser APIs and changes no app behaviour. */
(function () {
    'use strict';
    if (window.__audit) return;
    const A = window.__audit = { errors: [], rejections: [], timers: new Set(), timeoutsMade: 0, intervalsMade: 0, lis: new Map(), lisAdd: 0, lisRem: 0, obs: { MutationObserver: 0, ResizeObserver: 0, IntersectionObserver: 0 }, obsMade: 0, ctxMade: 0, ctxBy: {}, raf: 0, lisBy: new Map() };
    window.addEventListener('error', e => { A.errors.push(String(e.message || e.error || e).slice(0, 200)); }, true);
    window.addEventListener('unhandledrejection', e => { A.rejections.push(String((e.reason && (e.reason.stack || e.reason.message)) || e.reason).slice(0, 240)); });
    const where = () => { const s = (new Error().stack || '').split('\n').slice(3); for (const l of s) { const m = l.match(/([\w.-]+\.(?:js|html))(?:\?[^:]*)?:(\d+)/); if (m && !/probe\.js/.test(m[1])) return m[1] + ':' + m[2]; } return '?'; };
    /* timers: intervals stay counted until cleared */
    const sI = window.setInterval, cI = window.clearInterval;
    window.setInterval = function () { const id = sI.apply(this, arguments); A.timers.add(id); A.intervalsMade++; (A.intBy = A.intBy || {})[id] = where(); return id; };
    window.clearInterval = function (id) { A.timers.delete(id); return cI.apply(this, arguments); };
    const sT = window.setTimeout; window.setTimeout = function () { A.timeoutsMade++; return sT.apply(this, arguments); };
    const rq = window.requestAnimationFrame; window.requestAnimationFrame = function (f) { A.raf++; return rq.call(this, f); };
    /* listeners: net add minus remove, keyed by target kind + type + caller */
    const ET = EventTarget.prototype, add = ET.addEventListener, rem = ET.removeEventListener;
    const kind = t => t === window ? 'window' : t === document ? 'document' : (t && t.nodeType === 1) ? 'element' : (t && t.constructor && t.constructor.name) || 'other';
    const keyOf = (t, type, f, opts) => { const cap = typeof opts === 'boolean' ? opts : !!(opts && opts.capture); return { t, type, f, cap }; };
    const live = new WeakMap(); /* target -> Set of 'type|cap' strings with fn refs */
    ET.addEventListener = function (type, f, opts) {
        if (f && (typeof f === 'function' || typeof f === 'object')) {
            let m = live.get(this); if (!m) { m = new Map(); live.set(this, m); }
            const cap = typeof opts === 'boolean' ? opts : !!(opts && opts.capture), k = type + '|' + cap;
            let s = m.get(k); if (!s) { s = new Set(); m.set(k, s); }
            if (!s.has(f)) { s.add(f); A.lisAdd++; const kk = kind(this); if (kk !== 'element') { const w = kk + ' ' + type + ' ' + where(); A.lisBy.set(w, (A.lisBy.get(w) || 0) + 1); } }
        }
        return add.apply(this, arguments);
    };
    ET.removeEventListener = function (type, f, opts) {
        const m = live.get(this); if (m) { const cap = typeof opts === 'boolean' ? opts : !!(opts && opts.capture), s = m.get(type + '|' + cap); if (s && s.delete(f)) A.lisRem++; }
        return rem.apply(this, arguments);
    };
    /* observers: live = observing and not disconnected */
    ['MutationObserver', 'ResizeObserver', 'IntersectionObserver'].forEach(n => {
        const O = window[n]; if (!O) return;
        const P = O.prototype, ob = P.observe, dc = P.disconnect;
        P.observe = function () { if (!this.__aOn) { this.__aOn = 1; A.obs[n]++; } return ob.apply(this, arguments); };
        P.disconnect = function () { if (this.__aOn) { this.__aOn = 0; A.obs[n]--; } return dc.apply(this, arguments); };
        A.obsMade++;
    });
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t) { const had = this.__aCtx; const c = gc.apply(this, arguments); if (c && !had) { this.__aCtx = 1; A.ctxMade++; const w = String(t) + ' ' + where(); A.ctxBy[w] = (A.ctxBy[w] || 0) + 1; } return c; };
    A.snap = function () {
        const top = {}; [...A.lisBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => top[k] = v);
        const intTop = {}; [...A.timers].forEach(id => { const w = (A.intBy || {})[id] || '?'; intTop[w] = (intTop[w] || 0) + 1; });
        return {
            t: performance.now(), nodes: document.getElementsByTagName('*').length, canvases: document.querySelectorAll('canvas').length,
            imgs: document.images.length, intervalsLive: A.timers.size, intervalsMade: A.intervalsMade, intervalsBy: intTop, timeoutsMade: A.timeoutsMade,
            listenersNet: A.lisAdd - A.lisRem, listenersAdded: A.lisAdd, listenersTop: top, observersLive: Object.assign({}, A.obs),
            ctxMade: A.ctxMade, ctxBy: Object.assign({}, A.ctxBy), raf: A.raf,
            heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
            errors: A.errors.slice(), rejections: A.rejections.slice(),
            styleTags: document.querySelectorAll('style').length, scripts: document.scripts.length
        };
    };
})();
