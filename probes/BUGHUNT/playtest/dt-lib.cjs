/* double-tap probe helpers: two real taps with controlled event time stamps (CDP), so a slow test machine cannot stretch the gap */
const L = require('./lib.cjs');
const path = require('path');
async function boot(view, opts) {
    opts = opts || {};
    const ROOT = opts.root || process.env.DTROOT || require('fs').readFileSync(path.join(process.env.HOME, 'BUGHUNT/.wt'), 'utf8').trim();
    const srv = await L.serve(ROOT);
    const url = 'http://127.0.0.1:' + srv.address().port + '/';
    const h = await L.open(Object.assign({ url, view: view || 'chromium390', settle: 6000 }, opts));
    h.srv = srv; h.url = url;
    h.cdp = await h.ctx.newCDPSession(h.page);
    await h.page.evaluate(() => {
        window.__got = [];
        addEventListener('click', e => { if (!e.isTrusted) return; const t = e.target; const b = t.closest && t.closest('button,[role=button],a,input,label') || t;
            let lay = t; while (lay && lay.parentNode && lay.parentNode !== document.body) lay = lay.parentNode;
            window.__got.push({ ts: Math.round(e.timeStamp), lag: Math.round(performance.now() - e.timeStamp), d: e.detail, el: (b.tagName || '').toLowerCase() + (b.id ? '#' + b.id : '') + (typeof b.className === 'string' && b.className ? '.' + b.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' "' + (b.getAttribute && (b.getAttribute('aria-label') || '') || (b.textContent || '').trim()).slice(0, 30) + '"', lay: lay ? (lay.id || lay.className || lay.tagName) : '-' }); }, true);
    });
    return h;
}
/* one real mouse tap at (x, y) whose events carry time stamp `ts` (seconds, monotonic from CDP's point of view) */
async function tapAt(h, x, y, ts) {
    const base = { x, y, button: 'left', clickCount: 1 };
    if (ts != null) base.timestamp = ts;
    await h.cdp.send('Input.dispatchMouseEvent', Object.assign({ type: 'mouseMoved' }, base, { button: 'none', clickCount: 0 }));
    await h.cdp.send('Input.dispatchMouseEvent', Object.assign({ type: 'mousePressed' }, base));
    await h.cdp.send('Input.dispatchMouseEvent', Object.assign({ type: 'mouseReleased' }, base));
}
/* a double tap: 2nd tap `gap` ms after the 1st by the events' own clocks, whatever the machine's real delay */
async function dbl(h, x, y, gap) {
    const t0 = Date.now() / 1000;
    await h.page.evaluate(() => { window.__got = []; });
    await tapAt(h, x, y, t0);
    await tapAt(h, x + 2, y + 1, t0 + (gap == null ? 120 : gap) / 1000);
    await L.sleep(900);
    return h.page.evaluate(() => window.__got.splice(0));
}
async function at(h, sel, text) {
    return h.page.evaluate(([s, tx]) => {
        const all = [...document.querySelectorAll(s)].filter(e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(e); if (cs.visibility === 'hidden') return false;
            if (tx && !((e.getAttribute('aria-label') || '') + ' ' + e.textContent).toLowerCase().includes(tx.toLowerCase())) return false;
            const c = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return c && (c === e || e.contains(c)); });
        const e = all[all.length - 1]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, [sel, text || '']);
}
module.exports = Object.assign({}, L, { boot, tapAt, dbl, at });
