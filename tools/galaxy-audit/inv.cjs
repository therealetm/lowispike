'use strict';
/* galaxy-audit inventory: boot the app with the fixture and list what is visible on Home (buttons, labels, globals). */
const path = require('path');
const L = require(process.env.GA_LIB || './lib.cjs');
(async () => {
    const view = process.argv[2] || 'chromium390';
    const root = process.argv[3] || '/home/sprite/wt-galaxy-audit';
    const srv = await L.serve(root); const url = 'http://127.0.0.1:' + srv.address().port + '/';
    const h = await L.open({ view, url, settle: 9000 });
    const p = h.page;
    const inv = await p.evaluate(() => {
        const vis = e => { const r = e.getBoundingClientRect(); if (!r.width || !r.height || r.bottom < 0 || r.top > innerHeight) return false; const t = document.elementFromPoint(Math.min(innerWidth-1,Math.max(0,r.left + r.width / 2)), Math.min(innerHeight-1,Math.max(0,r.top + r.height / 2))); return !!t && (t === e || e.contains(t)); };
        const els = [...document.querySelectorAll('button,[role=button],a,[data-wh],[data-mh],input')].filter(vis).map(e => { const r = e.getBoundingClientRect(); return [e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''), (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40), Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
        const g = Object.keys(window).filter(k => /^Lowi/.test(k)).sort();
        return { els, g, canv: document.querySelectorAll('canvas').length, nodes: document.getElementsByTagName('*').length };
    });
    console.log(JSON.stringify(inv, null, 0));
    await p.screenshot({ path: '/home/sprite/galaxy-audit/inv-' + view + '.png' });
    console.log('LOG', JSON.stringify(h.log), JSON.stringify(await L.snap(h)));
    await h.browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
