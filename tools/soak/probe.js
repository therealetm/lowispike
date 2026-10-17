/* LOWiSPIKE game soak probe (injected before any app script by tools/soak/game-soak.cjs).
   Counts, per second and per scenario, the things that make a phone run hot or Safari kill a tab:
   - frame loops: requestAnimationFrame callbacks, grouped by the script that asked for them
   - DOM churn: MutationObserver records (a node or text rewritten every frame shows up as ~60/s forever)
   - canvases and graphics contexts: every getContext call, 2d and WebGL, and how many are still alive
   - WebGL work: draw calls, program/texture/buffer binds, state toggles, uniform uploads, texture uploads,
     plus objects created vs deleted (textures, buffers, programs, framebuffers) = a leak shows as a rising live count
   - redundant state: a bind/enable/useProgram call that sets the value that is already set
   It reads nothing private and changes no app behaviour; every wrapper calls straight through. */
(function () {
    'use strict';
    if (window.__soak) return;
    const S = window.__soak = {
        raf: 0, rafBy: Object.create(null), mut: 0, mutText: 0, mutAttr: 0, mutChild: 0,
        ctx: [], gl: Object.create(null), glRedundant: 0, live: { tex: 0, buf: 0, prog: 0, fb: 0, rb: 0 },
        longTasks: 0, longMs: 0, hiddenRaf: 0, mutBy: Object.create(null)
    };
    const now = () => performance.now();
    /* first app frame of the current stack; depth > 1 gives a short chain "writer < its caller < ..." */
    function caller(depth) {
        const st = (new Error().stack || '').split('\n'), out = [];
        for (let i = 2; i < st.length && out.length < (depth || 1); i++) {
            const m = st[i].match(/\/([\w.-]+\.(?:js|html|mjs))(?:\?[^:]*)?:(\d+)/);
            if (!m || m[1] === 'probe.js') continue;
            if (m[1] === 'index.html' && (m[2] === '22' || m[2] === '23')) continue; /* the spdGuard classList wrapper: report who called it */
            out.push(m[1] + ':' + m[2]);
        }
        return out.join(' < ') || '?';
    }
    /* frame loops */
    const rAF = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = function (cb) {
        const who = caller();
        return rAF(function (t) {
            S.raf++; S.rafBy[who] = (S.rafBy[who] || 0) + 1;
            if (document.visibilityState === 'hidden' || S.fakeHidden) S.hiddenRaf++;
            return cb(t);
        });
    };
    /* canvases and contexts */
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, o) {
        const had = this.__soakCtx;
        const c = gc.call(this, type, o);
        if (c && !had) { this.__soakCtx = type; S.ctx.push({ type: String(type), by: caller(), canvas: new WeakRef(this), w: this.width, h: this.height, at: Math.round(now()) }); }
        return c;
    };
    /* WebGL call counting + redundant state */
    const COUNT = ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced', 'useProgram', 'bindTexture', 'bindBuffer',
        'bindFramebuffer', 'enable', 'disable', 'blendFunc', 'blendFuncSeparate', 'depthMask', 'colorMask', 'cullFace', 'frontFace', 'viewport',
        'texImage2D', 'texSubImage2D', 'generateMipmap', 'compileShader', 'linkProgram', 'clear', 'readPixels', 'getError', 'bufferData', 'bufferSubData'];
    const LIVE = { createTexture: ['tex', 1], deleteTexture: ['tex', -1], createBuffer: ['buf', 1], deleteBuffer: ['buf', -1], createProgram: ['prog', 1],
        deleteProgram: ['prog', -1], createFramebuffer: ['fb', 1], deleteFramebuffer: ['fb', -1], createRenderbuffer: ['rb', 1], deleteRenderbuffer: ['rb', -1] };
    function wrapGL(P) {
        if (!P) return;
        COUNT.forEach(n => {
            const f = P[n]; if (typeof f !== 'function') return;
            P[n] = function (a, b) {
                S.gl[n] = (S.gl[n] || 0) + 1;
                const st = this.__soakSt || (this.__soakSt = { tex: {}, unit: 0, buf: {}, en: {} });
                if (n === 'useProgram') { if (st.prog === a) S.glRedundant++; st.prog = a; }
                else if (n === 'bindTexture') { const k = st.unit + ':' + a; if (st.tex[k] === b) S.glRedundant++; st.tex[k] = b; }
                else if (n === 'bindBuffer') { if (st.buf[a] === b) S.glRedundant++; st.buf[a] = b; }
                else if (n === 'enable' || n === 'disable') { const v = n === 'enable'; if (st.en[a] === v) S.glRedundant++; st.en[a] = v; }
                if (n === 'texImage2D' && arguments.length >= 6) {
                    const src = arguments[arguments.length - 1];
                    if (src && (src instanceof HTMLCanvasElement || (typeof OffscreenCanvas !== 'undefined' && src instanceof OffscreenCanvas))) S.gl.texUploadCanvas = (S.gl.texUploadCanvas || 0) + 1;
                }
                return f.apply(this, arguments);
            };
        });
        const at = P.activeTexture; if (at) P.activeTexture = function (u) { const st = this.__soakSt || (this.__soakSt = { tex: {}, unit: 0, buf: {}, en: {} }); if (st.unit === u) S.glRedundant++; st.unit = u; S.gl.activeTexture = (S.gl.activeTexture || 0) + 1; return at.call(this, u); };
        Object.keys(LIVE).forEach(n => { const f = P[n]; if (typeof f !== 'function') return; P[n] = function () { S.live[LIVE[n][0]] += LIVE[n][1]; return f.apply(this, arguments); }; });
        Object.getOwnPropertyNames(P).filter(n => /^uniform/.test(n)).forEach(n => { const f = P[n]; if (typeof f !== 'function') return; P[n] = function () { S.gl.uniform = (S.gl.uniform || 0) + 1; return f.apply(this, arguments); }; });
    }
    wrapGL(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
    wrapGL(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
    /* DOM churn: attributed to the nearest element with an id or class */
    function tag(n) {
        let e = n && (n.nodeType === 1 ? n : n.parentElement), hops = 0;
        while (e && hops++ < 6) { if (e.id) return '#' + e.id; if (e.classList && e.classList.length) return '.' + e.classList[0]; e = e.parentElement; }
        return '?';
    }
    function startMO() {
        new MutationObserver(list => {
            for (const r of list) {
                S.mut++;
                if (r.type === 'characterData') S.mutText++; else if (r.type === 'attributes') S.mutAttr++; else S.mutChild++;
                let k = r.type[0] + ' ' + tag(r.target);
                if (r.type === 'attributes') {
                    k += ' @' + r.attributeName;
                    if (r.attributeName === 'class' && r.target.classList) {
                        const was = new Set((r.oldValue || '').split(/\s+/).filter(Boolean)), now = new Set(r.target.classList);
                        const d = [...now].filter(c => !was.has(c)).map(c => '+' + c).concat([...was].filter(c => !now.has(c)).map(c => '-' + c));
                        k += ' ' + (d.join(',') || '(same)');
                    }
                }
                S.mutBy[k] = (S.mutBy[k] || 0) + 1;
            }
        }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeOldValue: true });
    }
    /* DOM writers: which script line writes attributes, classes, text or styles, and how often the write changed nothing */
    S.write = Object.create(null); S.writeSame = 0; S.writes = 0;
    function rec(kind, same) { const k = kind + ' ' + caller(3); S.write[k] = (S.write[k] || 0) + 1; S.writes++; if (same) S.writeSame++; }
    const sa = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (n, v) { rec('attr:' + n, this.getAttribute(n) === String(v)); return sa.call(this, n, v); };
    const tl = DOMTokenList.prototype.toggle;
    DOMTokenList.prototype.toggle = function (c, f) { const had = this.contains(c); const r = tl.apply(this, arguments); rec('class', had === r); return r; };
    ['add', 'remove'].forEach(m => { const f = DOMTokenList.prototype[m]; DOMTokenList.prototype[m] = function () { rec('class.' + m, false); return f.apply(this, arguments); }; });
    function hook(P, prop, kind) {
        const d = Object.getOwnPropertyDescriptor(P, prop); if (!d || !d.set) return;
        Object.defineProperty(P, prop, { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { let same = false; try { same = d.get.call(this) === String(v); } catch (e) { } rec(kind, same); d.set.call(this, v); } });
    }
    hook(Node.prototype, 'textContent', 'text'); hook(Element.prototype, 'innerHTML', 'html'); hook(HTMLElement.prototype, 'innerText', 'text');
    hook(Element.prototype, 'className', 'className');
    const sp = CSSStyleDeclaration.prototype.setProperty;
    CSSStyleDeclaration.prototype.setProperty = function (n, v) { rec('style:' + n, this.getPropertyValue(n) === String(v)); return sp.apply(this, arguments); };
    ['transform', 'opacity', 'cssText', 'left', 'top', 'width', 'height', 'background', 'filter', 'display'].forEach(p => hook(CSSStyleDeclaration.prototype, p, 'style.' + p));
    /* tree writers (nodes added, moved or removed): who rebuilds parts of the page, and how often */
    [[Node.prototype, ['appendChild', 'insertBefore', 'removeChild', 'replaceChild']], [Element.prototype, ['append', 'prepend', 'replaceChildren', 'replaceWith', 'insertAdjacentHTML', 'insertAdjacentElement', 'remove', 'after', 'before']]].forEach(([P, names]) => names.forEach(n => {
        const f = P[n]; if (typeof f !== 'function') return;
        P[n] = function () { if (this.isConnected) rec('tree.' + n, false); return f.apply(this, arguments); };
    }));
    if (document.documentElement) startMO(); else document.addEventListener('readystatechange', startMO, { once: true });
    try { new PerformanceObserver(l => l.getEntries().forEach(e => { S.longTasks++; S.longMs += e.duration; })).observe({ type: 'longtask', buffered: true }); } catch (e) { }
    /* a snapshot the runner diffs between two moments */
    S.snap = function () {
        const alive = S.ctx.filter(c => { const cv = c.canvas.deref(); return cv && cv.isConnected; });
        const glAlive = alive.filter(c => /webgl/.test(c.type));
        const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
        return {
            t: now(), raf: S.raf, rafBy: Object.assign({}, S.rafBy), hiddenRaf: S.hiddenRaf, mut: S.mut, mutText: S.mutText, mutAttr: S.mutAttr, mutChild: S.mutChild,
            mutBy: Object.assign({}, S.mutBy), gl: Object.assign({}, S.gl), glRedundant: S.glRedundant, live: Object.assign({}, S.live),
            ctxMade: S.ctx.length, ctxMadeGL: S.ctx.filter(c => /webgl/.test(c.type)).length, ctxAlive: alive.length, ctxAliveGL: glAlive.length,
            glBy: glAlive.map(c => c.by + ' ' + (c.canvas.deref() || {}).width + 'x' + (c.canvas.deref() || {}).height),
            canvases: document.getElementsByTagName('canvas').length, nodes: document.getElementsByTagName('*').length, heapMB: mem,
            longTasks: S.longTasks, longMs: Math.round(S.longMs), write: Object.assign({}, S.write), writes: S.writes, writeSame: S.writeSame
        };
    };
})();
