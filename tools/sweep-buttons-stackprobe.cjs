/* Probe: after leaving a tab, does the old page stay on screen under the new one (and can it show through)?
   node tools/sweep-buttons-stackprobe.cjs [url|root] WxH from,to[,to2...] */
'use strict';
const H = require('./sim/harness.cjs');
const [where = 'https://therealetm.github.io/lowispike/index.html', vp = '1180x820', seq = 'shelf,profile'] = process.argv.slice(2);
(async () => {
    const [w, h] = vp.split('x').map(Number);
    const o = { engine: 'chromium', viewport: { width: w, height: h }, dpr: 2 }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o); const P = R.page; const out = [];
    const look = () => P.evaluate(() => [...document.querySelectorAll('[id^=tab-]')].map(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); let op = 1; for (let p = e; p && p.nodeType === 1; p = p.parentElement) op *= +getComputedStyle(p).opacity; return { id: e.id, cls: e.className.slice(0, 60), vis: s.visibility, disp: s.display, op: +op.toFixed(2), x: Math.round(r.x), w: Math.round(r.width), bg: s.backgroundColor, bgi: s.backgroundImage.slice(0, 40), z: s.zIndex, tf: s.transform.slice(0, 40), inert: e.inert, ah: e.getAttribute('aria-hidden') }; }).filter(t => t.disp !== 'none' && t.vis !== 'hidden' && t.op > 0.02 && t.x < innerWidth && t.x + t.w > 0));
    try {
        await R.goto(); await H.sleep(5000);
        for (const t of seq.split(',')) { await P.evaluate(x => window.goTab(x), t); await H.sleep(4500); out.push({ after: t, onScreen: await look() }); }
        await R.shot('/home/sprite/bs-stack.png');
    } catch (e) { out.push({ broken: e.message }); }
    console.log(JSON.stringify(out, null, 1)); await R.close(); process.exit(0);
})();
