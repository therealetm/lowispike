/* Probe: Move duration chip -> what opens, and does it stay over other tabs (mv-done / mv-badge)?
   node tools/sweep-buttons-moveprobe.cjs [url|root] [chipText] */
'use strict';
const H = require('./sim/harness.cjs');
const [where = 'https://therealetm.github.io/lowispike/index.html', chip = '20 min'] = process.argv.slice(2);
(async () => {
    const o = { engine: 'chromium', viewport: { width: 390, height: 844 } }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o); const P = R.page; const out = {};
    const look = () => P.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); let op = 1; for (let p = e; p && p.nodeType === 1; p = p.parentElement) { const t = getComputedStyle(p); op *= +t.opacity; if (t.display === 'none' || t.visibility === 'hidden') return false; } return r.width > 0 && r.height > 0 && op > .05 && r.bottom > 0 && r.top < innerHeight; };
        const mv = [...document.querySelectorAll('#mv-player,.mv-done,.mv-badge')].filter(vis).map(e => { const r = e.getBoundingClientRect(); let p = e, ch = []; while (p && ch.length < 6) { ch.push((p.id ? '#' + p.id : '') + '.' + String(p.className).split(' ').slice(0, 2).join('.')); p = p.parentElement; } return { cls: String(e.className).slice(0, 60), txt: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 80), y: Math.round(r.y), h: Math.round(r.height), w: Math.round(r.width), pos: getComputedStyle(e).position, chain: ch.join(' < ') }; });
        const tab = (document.querySelector('.tab.active') || {}).id; const top = document.elementFromPoint(innerWidth / 2, 120); return { tab, mv, topAt120: top ? (top.id ? '#' + top.id : '') + '.' + String(top.className).split(' ')[0] : null, html: document.documentElement.className.match(/\bmv-[\w-]+|\bmf-[\w-]+|\bwo-[\w-]+/g) };
    });
    try {
        await R.goto(); await H.sleep(5000);
        await P.evaluate(() => window.goTab('move')); await H.sleep(3500); out.move = await look();
        const pt = await P.evaluate(c => { const b = [...document.querySelectorAll('button.chip')].find(x => (x.getAttribute('aria-label') || x.textContent).replace(/\s+/g, ' ').trim() === c); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, chip);
        out.chipFound = !!pt; if (pt) { await H.sleep(500); const p2 = await P.evaluate(c => { const b = [...document.querySelectorAll('button.chip')].find(x => (x.getAttribute('aria-label') || x.textContent).replace(/\s+/g, ' ').trim() === c); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, chip); await P.touchscreen.tap(p2.x, p2.y); await H.sleep(2500); out.afterChip = await look(); }
        out.player = await P.evaluate(() => { const p = document.getElementById('mv-player'); if (!p) return null; const r = p.getBoundingClientRect(), s = getComputedStyle(p); return { cls: p.className, disp: s.display, pos: s.position, z: s.zIndex, y: r.y, h: r.height, txt: p.textContent.trim().replace(/\s+/g, ' ').slice(0, 120) }; });
        out.tabbar = await P.evaluate(() => [...document.querySelectorAll('#tabbar .tb, #tabbar button')].map(b => { const r = b.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { t: (b.dataset.tab || b.className).slice(0, 20), x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), hit: !!t && (t === b || b.contains(t)), top: t ? String(t.className).split(' ')[0] : null }; }));
        const cook = (out.tabbar || []).find(b => /shelf/.test(b.t) && b.hit && b.w > 0);
        if (cook) { await P.touchscreen.tap(cook.x, cook.y); await H.sleep(4000); out.shelfByDock = await look(); }
        else { out.noDockTap = true; }
        await P.evaluate(() => window.goTab('shelf')); await H.sleep(4000); out.shelf = await look();
        await P.evaluate(() => window.goTab('home')); await H.sleep(3000); out.home = await look();
        await P.evaluate(() => window.goTab('move')); await H.sleep(3500); out.moveAgain = await look();
    } catch (e) { out.broken = e.message; }
    out.errs = R.errs.map(e => e.m.slice(0, 150));
    console.log(JSON.stringify(out, null, 1)); await R.close(); process.exit(0);
})();
