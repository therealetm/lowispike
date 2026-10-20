'use strict';
/* galaxy-audit gesture helpers. Chromium: real touch through CDP (touch + pointer events with pointerType 'touch', multi-touch).
   WebKit: Playwright has no multi-touch, so single-finger gestures use the mouse (pointer events, pointerType 'mouse'). */
const L = require(process.env.GA_LIB || './lib.cjs');
async function cdp(h) { if (h.cdp !== undefined) return h.cdp; h.cdp = null; try { h.cdp = await h.ctx.newCDPSession(h.page); } catch (e) { } return h.cdp; }
async function touch(h, type, pts) {
    const c = await cdp(h);
    if (c) return c.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p.x, y: p.y, id: p.id != null ? p.id : i, radiusX: 8, radiusY: 8, force: 1 })) });
    const m = h.page.mouse;
    if (type === 'touchStart') { await m.move(pts[0].x, pts[0].y); await m.down(); }
    else if (type === 'touchMove') await m.move(pts[0].x, pts[0].y);
    else if (type === 'touchEnd') await m.up();
    else if (type === 'touchCancel') { /* no mouse cancel: synthesize pointercancel on the element under the pointer */
        await h.page.evaluate(() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); }); await m.up(); }
}
async function drag(h, a, b, ms = 600, steps = 12, opt = {}) {
    await touch(h, 'touchStart', [a]);
    for (let i = 1; i <= steps; i++) { const k = i / steps; await touch(h, 'touchMove', [{ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }]); await L.sleep(ms / steps); }
    if (opt.holdEnd) await L.sleep(opt.holdEnd);
    await touch(h, opt.cancel ? 'touchCancel' : 'touchEnd', opt.cancel ? [] : []);
}
async function hold(h, p, ms) { await touch(h, 'touchStart', [p]); await L.sleep(ms); await touch(h, 'touchEnd', []); }
async function taps(h, p, n, gap = 120) { for (let i = 0; i < n; i++) { await touch(h, 'touchStart', [p]); await L.sleep(40); await touch(h, 'touchEnd', []); if (i < n - 1) await L.sleep(gap); } }
async function pinch(h, c, d0, d1, ms = 700, steps = 14) {
    const P = d => [{ x: c.x - d / 2, y: c.y, id: 0 }, { x: c.x + d / 2, y: c.y, id: 1 }];
    await touch(h, 'touchStart', P(d0));
    for (let i = 1; i <= steps; i++) { await touch(h, 'touchMove', P(d0 + (d1 - d0) * i / steps)); await L.sleep(ms / steps); }
    await touch(h, 'touchEnd', []);
}
/* page metrics: DOM size, canvases, overlays, heap (Chromium), errors so far */
async function metrics(h) {
    return h.page.evaluate(() => ({
        nodes: document.getElementsByTagName('*').length, canv: document.querySelectorAll('canvas').length,
        ov: document.querySelectorAll('.r2-ov').length, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null,
        tab: (document.querySelector('.tab.active') || {}).id || '', frames: window.__bh ? window.__bh.frames : 0
    }));
}
async function center(h, sel) { return L.center(h, sel); }
async function topAt(h, x, y) { return h.page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); if (!e) return null; return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : ''); }, [x, y]); }
module.exports = { cdp, touch, drag, hold, taps, pinch, metrics, center, topAt };
