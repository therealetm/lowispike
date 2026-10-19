'use strict';
/* Run 7 probe: Settings side panel. Does its Close x (or the panel) sit on a row or a Home control, so a tap meant for one hits the other?
   Every row of the panel: centre tap point must hit that row. Every Home control the panel does not cover must stay tappable.
   usage: node probe-settings-x.cjs <view> <url|dir> [lang] */
const L = require('./lib.cjs');
(async () => {
    const view = process.argv[2] || 'iphone13', target = process.argv[3] || 'https://therealetm.github.io/lowispike/', lang = process.argv[4] || 'en';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, lang, settle: 8000 });
    const { page } = h; const bad = [];
    const c = await L.center(h, '[data-orbit="settings"]');
    if (!c) { console.log('FAIL no settings bubble'); process.exit(1); }
    await L.tap(h, c.x, c.y); await L.sleep(2500);
    const r = await page.evaluate(() => {
        const R = e => { const q = e.getBoundingClientRect(); return { l: Math.round(q.left), t: Math.round(q.top), r: Math.round(q.right), b: Math.round(q.bottom) }; };
        const pn = document.querySelector('.ss2-page'); if (!pn) return { none: true, html: document.documentElement.className.slice(0, 200) };
        const x = pn.querySelector('.ss2-page-x'), body = pn.querySelector('.ss2-page-body');
        const rows = [...pn.querySelectorAll('.ss2-page-body .ss2-chip')].map(b => {
            const q = b.getBoundingClientRect(), bq = body.getBoundingClientRect();
            const vis = q.bottom > bq.top + 2 && q.top < bq.bottom - 2; const cx = (q.left + q.right) / 2, cy = (Math.max(q.top, bq.top) + Math.min(q.bottom, bq.bottom)) / 2;
            const hit = vis ? document.elementFromPoint(cx, cy) : null;
            return { id: b.dataset.ss2, rect: R(b), vis, cut: vis && (q.top < bq.top - 1 || q.bottom > bq.bottom + 1), hitOk: !vis || (hit && b.contains(hit)), hit: hit && !b.contains(hit) ? (hit.className && hit.className.baseVal != null ? hit.className.baseVal : hit.className) + '#' + (hit.dataset && (hit.dataset.ss2 || hit.dataset.orbit) || '') : '' };
        });
        const xr = R(x), xhit = document.elementFromPoint((xr.l + xr.r) / 2, (xr.t + xr.b) / 2);
        const ov = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
        const home = [...document.querySelectorAll('[data-orbit], #whPad, #spBubble, .wh-map, [data-wh="map"], #whMapChip, .wh-chip')].filter(e => !pn.contains(e)).map(e => { const q = R(e); return { id: e.dataset.orbit || e.id || e.className.toString().slice(0, 30), rect: q, underX: ov(q, xr), underPanel: ov(q, R(pn)) }; }).filter(o => o.rect.r - o.rect.l > 2);
        return { panel: R(pn), side: pn.dataset.side, fit: pn.dataset.fit, cols: pn.dataset.cols, x: xr, xhitOk: !!(xhit && x.contains(xhit)), xhit: xhit ? String(xhit.className && xhit.className.baseVal != null ? xhit.className.baseVal : xhit.className) : null, body: R(body), scroll: { h: body.scrollHeight, c: body.clientHeight }, rows, home, vw: innerWidth, vh: innerHeight };
    });
    if (r.none) bad.push('settings panel did not open ' + r.html);
    else {
        if (!r.xhitOk) bad.push('x centre hits ' + r.xhit);
        r.rows.filter(o => !o.hitOk).forEach(o => bad.push('row ' + o.id + ' centre hits ' + o.hit));
        if (r.panel.b > r.vh || r.panel.t < 0 || r.panel.l < 0 || r.panel.r > r.vw) bad.push('panel off screen ' + JSON.stringify(r.panel));
        if (r.x.b > r.vh - 2) bad.push('x off screen');
    }
    await page.screenshot({ path: __dirname + '/out/settingsx-' + view + '-' + lang + '.png' });
    // tap the x: panel must close
    if (!r.none) { await L.tap(h, (r.x.l + r.x.r) / 2, (r.x.t + r.x.b) / 2); await L.sleep(1200); const still = await page.evaluate(() => !!document.querySelector('.ss2-page')); if (still) bad.push('x tap did not close'); }
    const s = await L.snap(h);
    if (s.err.length || h.log.pageerror.length) bad.push('errors ' + JSON.stringify(s.err.concat(h.log.pageerror)).slice(0, 300));
    console.log(JSON.stringify({ view, lang, r }, null, 0));
    console.log(bad.length ? 'FAIL ' + bad.join(' ; ') : 'PASS');
    await h.browser.close(); if (srv) srv.close();
    process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
