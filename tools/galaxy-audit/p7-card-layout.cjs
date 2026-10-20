'use strict';
/* galaxy-audit probe 7: what is above Misty's card doors when her card opens? Lists the sheet's blocks top to bottom with heights,
   at 0.6 s / 2 s / 5 s, for iPhone 13 size (chromium390) or WebKit iPhone 13 (webkit13). */
const L = require(process.env.GA_LIB || './lib.cjs'), G = require('./gest.cjs'), fs = require('fs');
(async () => {
    const view = process.argv[2] || 'chromium390'; const target = process.argv[3] || '/home/sprite/wt-galaxy-audit'; let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 9000 }); const p = h.page; const R = { view, url, at: [] };
    const how = process.argv[4] || 'hold';
    if (how === 'hold') { const misty = await G.center(h, '#spBubble'); await G.hold(h, misty, 900); }
    else await p.evaluate(() => LowiMistyHub.open());
    let last = 0;
    for (const t of [600, 2000, 5000]) { await L.sleep(t - last); last = t; R.at.push(await p.evaluate(t => { const sh = [...document.querySelectorAll('.r2-ov .r2-sh')].pop(); if (!sh) return { t, none: true }; const sr = sh.getBoundingClientRect(); const rows = []; const walk = (e, d) => { for (const c of e.children) { const r = c.getBoundingClientRect(); if (r.height < 4) continue; rows.push([d, c.tagName.toLowerCase() + (c.id ? '#' + c.id : '') + (typeof c.className === 'string' && c.className ? '.' + c.className.trim().split(/\s+/).slice(0, 2).join('.') : ''), Math.round(r.top), Math.round(r.height), (c.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 70)]); if (d < 2 && r.height > 120) walk(c, d + 1); } }; walk(sh, 0); return { t, vh: innerHeight, sheet: [Math.round(sr.top), Math.round(sr.height), sh.scrollTop, sh.scrollHeight], rows }; }, t)); }
    console.log(JSON.stringify(R, null, 0));
    await p.screenshot({ path: '/home/sprite/galaxy-audit/out/p7-' + view + '-' + how + '.png' });
    fs.writeFileSync('/home/sprite/galaxy-audit/out/p7-' + view + '-' + how + '.json', JSON.stringify(R, null, 1));
    console.log('ERR', JSON.stringify({ pe: h.log.pageerror, snap: await L.snap(h) }).slice(0, 600));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
