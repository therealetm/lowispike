'use strict';
/* galaxy-audit probe 8: holding Misty opens her card, but after the finger lifts the sheet slides away (p7). Who closes it?
   Logs click/contextmenu/pointer events and wraps LowiR2.close / LowiWorldHome.closeTop with a stack, for holds of 700/1200/2000 ms. */
const L = require(process.env.GA_LIB || './lib.cjs'), G = require('./gest.cjs'), fs = require('fs');
(async () => {
    const view = process.argv[2] || 'chromium390'; const target = process.argv[3] || '/home/sprite/wt-galaxy-audit'; let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 9000 }); const p = h.page; const R = { view, runs: [] };
    await p.evaluate(() => {
        window.__ev = []; const t0 = () => Math.round(performance.now());
        const d = e => { const t = e.target; return (t && t.tagName ? t.tagName.toLowerCase() + (t.id ? '#' + t.id : '') + (typeof t.className === 'string' && t.className ? '.' + t.className.split(' ')[0] : '') : '?'); };
        ['pointerdown', 'pointerup', 'pointercancel', 'click', 'contextmenu', 'touchend'].forEach(n => document.addEventListener(n, e => window.__ev.push([t0(), n, d(e), e.pointerType || ''].join(' ')), true));
        const wrap = (o, k, lbl) => { if (!o || !o[k] || o[k].__w) return; const f = o[k]; o[k] = function () { window.__ev.push(t0() + ' CALL ' + lbl + ' ' + (new Error().stack || '').split('\n').slice(2, 7).map(s => s.trim().replace(/https?:\/\/[^/]+\//, '')).join(' < ')); return f.apply(this, arguments); }; o[k].__w = 1; };
        wrap(window.LowiR2, 'close', 'R2.close'); wrap(window.LowiWorldHome, 'closeTop', 'WH.closeTop'); wrap(window.LowiMistyHub, 'close', 'Hub.close'); wrap(window.LowiMistyHub, 'open', 'Hub.open');
    });
    const misty = await G.center(h, '#spBubble');
    const sheet = () => p.evaluate(() => { const o = [...document.querySelectorAll('.r2-ov')].pop(); const sh = o && o.querySelector('.r2-sh'); return o ? [o.className.replace(/\s+/g, ' '), sh ? Math.round(sh.getBoundingClientRect().top) : null] : null; });
    for (const ms of [700, 1200, 2000]) {
        await G.touch(h, 'touchStart', [misty]); await L.sleep(ms); const during = await sheet(); await G.touch(h, 'touchEnd', []);
        await L.sleep(3500); const after = await sheet(); const ev = await p.evaluate(() => window.__ev.splice(0));
        const row = { ms, during, after, ev }; R.runs.push(row); console.log(JSON.stringify(row).slice(0, 2500));
        await p.evaluate(() => { document.querySelectorAll('.r2-ov').forEach(o => o.remove()); }); await L.sleep(1500); await p.evaluate(() => window.__ev.splice(0));
    }
    console.log('ERR', JSON.stringify({ pe: h.log.pageerror, snap: await L.snap(h) }).slice(0, 600));
    fs.writeFileSync('/home/sprite/galaxy-audit/out/p8-' + view + '.json', JSON.stringify(R, null, 1));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
