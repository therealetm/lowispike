'use strict';
/* galaxy-audit probe 4: (a) a hit-test grid of Home: where on screen does a pinch reach the world (canvas) and where does it land
   on Misty, a bubble or a control? (b) pinch out with both fingers starting on bubbles: does it zoom, and does any sheet open?
   (c) Misty's card geometry 1, 2, 4 s after it opens: are Rename / Forms / Food journal / Glow on screen? */
const L = require(process.env.GA_LIB || './lib.cjs'), G = require('./gest.cjs'), fs = require('fs');
(async () => {
    const view = process.argv[2] || 'chromium390'; const target = process.argv[3] || '/home/sprite/wt-galaxy-audit'; let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 9000 }); const p = h.page; const R = {};
    R.grid = await p.evaluate(() => { const out = { canvas: 0, total: 0, by: {} }; for (let y = 60; y < innerHeight - 40; y += 20) for (let x = 10; x < innerWidth; x += 20) { const e = document.elementFromPoint(x, y); out.total++; if (!e) continue; if (e.tagName === 'CANVAS') { out.canvas++; continue; } const b = e.closest('button,[role=button],[data-wh],[data-sp],a') || e; const k = b.tagName.toLowerCase() + (b.id ? '#' + b.id : '') + (b.dataset && b.dataset.wh ? '[' + b.dataset.wh + ']' : ''); out.by[k] = (out.by[k] || 0) + 1; } return out; });
    console.log('GRID', JSON.stringify(R.grid));
    const ovs = () => p.evaluate(() => [...document.querySelectorAll('.r2-ov')].map(o => o.className.split(' ').slice(0, 3).join('.')));
    const rig = () => p.evaluate(() => { const r = LowiWorldHome.rig(); return r ? Math.round(r.dist) : null; });
    /* (b) two bubbles as the start points */
    const bub = await p.evaluate(() => [...document.querySelectorAll('#tab-home [data-wh]')].map(b => { const r = b.getBoundingClientRect(); return { k: b.dataset.wh, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width }; }).filter(b => b.w > 20 && b.y > 80 && b.y < innerHeight - 120));
    R.bubbles = bub;
    const pairs = [];
    for (let i = 0; i < bub.length; i++) for (let j = i + 1; j < bub.length; j++) if (Math.abs(bub[i].y - bub[j].y) < 120 && Math.abs(bub[i].x - bub[j].x) > 120) pairs.push([bub[i], bub[j]]);
    R.pinchOnBubbles = [];
    const c = await G.cdp(h);
    for (const [a, b] of pairs.slice(0, 3)) {
        const d0 = await rig(); const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        const pts = k => [{ x: a.x + (cx - a.x) * k * 0.8, y: a.y + (cy - a.y) * k * 0.8, id: 0 }, { x: b.x + (cx - b.x) * k * 0.8, y: b.y + (cy - b.y) * k * 0.8, id: 1 }];
        await G.touch(h, 'touchStart', pts(0)); for (let s = 1; s <= 8; s++) { await G.touch(h, 'touchMove', pts(s / 8)); await L.sleep(50); } await G.touch(h, 'touchEnd', []);
        await L.sleep(2200); const row = { a: a.k, b: b.k, distBefore: d0, distAfter: await rig(), ov: await ovs(), tab: await p.evaluate(() => (document.querySelector('.tab.active') || {}).id) };
        R.pinchOnBubbles.push(row); console.log('PINCH-ON', JSON.stringify(row));
        await p.evaluate(() => { try { LowiWorldHome.closeTop(); LowiWorldHome.closeTop(); } catch (e) { } }); await L.sleep(1500);
    }
    /* (c) card geometry over time */
    const misty = await G.center(h, '#spBubble');
    await G.hold(h, misty, 900);
    R.card = [];
    for (const t of [500, 1000, 2000, 4000]) { await L.sleep(t - (R.card.length ? [500, 1000, 2000, 4000][R.card.length - 1] : 0)); R.card.push(await p.evaluate(t => { const s = document.querySelector('#mistyHub'); const o = s && s.closest('.r2-ov'); const sh = o && (o.querySelector('.r2-sheet,.wh-sheet,.mh-sheet') || s); const sr = sh ? sh.getBoundingClientRect() : null; return { t, vh: innerHeight, sheet: sr ? [Math.round(sr.top), Math.round(sr.height)] : null, tf: sh ? getComputedStyle(sh).transform : null, scroller: (() => { let e = s; while (e && e !== document.body) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight) return [e.className.split(' ')[0], e.scrollTop, e.clientHeight, e.scrollHeight]; e = e.parentElement; } return null; })(), doors: [...document.querySelectorAll('#mistyHub [data-mh=rename],#mistyHub [data-mh=forms],#mistyHub [data-mh=collection],#mistyHub [data-mh=glow]')].map(b => { const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, Math.min(innerHeight - 1, r.top + r.height / 2)); return [b.dataset.mh, Math.round(r.top), Math.round(r.bottom), !!e && (e === b || b.contains(e))]; }) }; }, t)); }
    console.log('CARD', JSON.stringify(R.card));
    await p.screenshot({ path: '/home/sprite/galaxy-audit/out/p4-' + view + '-card.png' });
    R.errs = { pe: h.log.pageerror, snap: await L.snap(h) };
    console.log('ERR', JSON.stringify(R.errs).slice(0, 800));
    fs.writeFileSync('/home/sprite/galaxy-audit/out/p4-' + view + '.json', JSON.stringify(R, null, 1));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
