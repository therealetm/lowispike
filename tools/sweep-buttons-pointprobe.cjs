/* Probe: what covers a control? node tools/sweep-buttons-pointprobe.cjs WxH lang tab "selector" "text" */
'use strict';
const H = require('./sim/harness.cjs');
const [vp = '320x568', lang = 'es', tab = 'shelf', sel = 'button.ck-b', txt = 'Sweet'] = process.argv.slice(2);
(async () => {
    const [w, h] = vp.split('x').map(Number);
    const R = await H.open({ engine: 'chromium', viewport: { width: w, height: h }, dpr: 2, lang, url: 'https://therealetm.github.io/lowispike/index.html' }); const P = R.page; let out;
    try {
        await R.goto(); await H.sleep(5000); await P.evaluate(t => window.goTab(t), tab); await H.sleep(4500);
        out = await P.evaluate(([s, t]) => { const b = [...document.querySelectorAll(s)].find(x => (x.getAttribute('aria-label') || x.textContent).includes(t)); if (!b) return { found: false, all: [...document.querySelectorAll(s)].map(x => x.textContent.trim()).slice(0, 12) }; const r = b.getBoundingClientRect(); const pts = [[.5, .5], [.15, .5], [.85, .5]].map(([fx, fy]) => { const x = r.left + r.width * fx, y = r.top + r.height * fy; const e = document.elementFromPoint(x, y); const ch = []; for (let p = e; p && ch.length < 6; p = p.parentElement) ch.push((p.id ? '#' + p.id : '') + p.tagName.toLowerCase() + '.' + String(p.className).split(' ').slice(0, 2).join('.') + (p.textContent ? '[' + p.textContent.trim().slice(0, 20) + ']' : '')); return { x: Math.round(x), y: Math.round(y), mine: e === b || b.contains(e), chain: ch }; }); const cs = getComputedStyle(b); return { found: true, text: b.textContent.trim(), rect: [r.left, r.top, r.width, r.height].map(Math.round), ws: cs.whiteSpace, ov: cs.overflow, pts, parentRect: (() => { const q = b.parentElement.getBoundingClientRect(); return [q.left, q.top, q.width, q.height].map(Math.round); })(), parentCls: b.parentElement.className, sw: b.parentElement.scrollWidth }; }, [sel, txt]);
        await R.shot('/home/sprite/bs-point.png');
    } catch (e) { out = { broken: e.message }; }
    console.log(JSON.stringify(out, null, 1)); await R.close(); process.exit(0);
})();
