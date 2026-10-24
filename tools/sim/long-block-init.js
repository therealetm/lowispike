/* Flight crash hunt 18:01: times every requestAnimationFrame / setTimeout callback and the slow WebGL calls, so a probe can ask
   window.__lb.top() which code held the main thread longest. Test-only init script, never shipped. */
(function () {
    const lb = window.__lb = { cb: {}, gl: {}, top: null };
    const note = (tab, key, ms) => { const e = tab[key] || (tab[key] = { n: 0, ms: 0, max: 0 }); e.n++; e.ms += ms; if (ms > e.max) e.max = ms; };
    const name = f => { try { return (f.name || '') + ':' + String(f).replace(/\s+/g, ' ').slice(0, 70); } catch (e) { return '?'; } };
    const wrap = (orig, kind) => function (f, ...rest) {
        if (typeof f !== 'function') return orig.call(this, f, ...rest);
        const k = kind + ' ' + name(f);
        return orig.call(this, function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { const ms = performance.now() - t; if (ms > 50) note(lb.cb, k, ms); } }, ...rest);
    };
    window.requestAnimationFrame = wrap(window.requestAnimationFrame, 'raf');
    window.setTimeout = wrap(window.setTimeout, 'timeout');
    const GLS = ['compileShader', 'linkProgram', 'getProgramParameter', 'getShaderParameter', 'readPixels', 'finish', 'texImage2D', 'texSubImage2D', 'bufferData', 'drawElements', 'drawArrays', 'getError', 'clear', 'generateMipmap'];
    [window.WebGLRenderingContext, window.WebGL2RenderingContext].forEach(C => {
        if (!C) return;
        GLS.forEach(m => { const o = C.prototype[m]; if (!o) return; C.prototype[m] = function (...a) { const t = performance.now(); try { return o.apply(this, a); } finally { const ms = performance.now() - t; if (ms > 20) note(lb.gl, m, ms); } }; });
    });
    lb.top = () => { const s = t => Object.entries(t).sort((a, b) => b[1].max - a[1].max).slice(0, 6).map(([k, v]) => k.slice(0, 110) + ' n' + v.n + ' max' + Math.round(v.max) + ' sum' + Math.round(v.ms)); const r = { cb: s(lb.cb), gl: s(lb.gl) }; lb.cb = {}; lb.gl = {}; return r; };
})();
