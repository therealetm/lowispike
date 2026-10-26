'use strict';
/* Run 17: does a closed stacked sheet (Glow over the hub card) ever leave the DOM? polls for 8 s */
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
    let srv = null, url = arg('url', '');
    if (!url) { srv = await L.serve(path.resolve(arg('root', '.'))); url = `http://127.0.0.1:${srv.address().port}/index.html`; }
    const h = await L.open({ url, view: arg('view', 'chromium390'), settle: 6000, reducedMotion: !!arg('rm', '') });
    const P = h.page;
    const how = arg('how', 'esc');
    await P.evaluate(() => LowiMistyHub.open()); await L.sleep(1500);
    await P.evaluate(() => { const b = document.querySelector('#mistyHub [data-mh=glow]'); b && b.focus(); b && b.click(); }); await L.sleep(1500);
    if (how === 'esc') await P.keyboard.press('Escape');
    else if (how === 'x') await P.evaluate(() => { const x = document.querySelector('#whMs').closest('.r2-ov').querySelector('.r2-x'); x.click(); });
    else if (how === 'scrim') await P.evaluate(() => { document.querySelector('#whMs').closest('.r2-ov').querySelector('.r2-scrim').click(); });
    const t0 = Date.now(), rows = [];
    for (let i = 0; i < 16; i++) {
        rows.push(await P.evaluate(() => { const g = document.getElementById('whMs'); const ov = g && g.closest('.r2-ov'); const sh = ov && ov.querySelector('.r2-sh'); return g ? { cls: ov.className.replace('r2-ov ', ''), tf: sh.style.transform, op: getComputedStyle(ov).opacity, pe: getComputedStyle(ov).pointerEvents, vis: getComputedStyle(ov).visibility } : 'gone'; }));
        await L.sleep(500);
    }
    const ae = await P.evaluate(() => { const a = document.activeElement; return (a.id || a.className || a.tagName) + (a.closest && a.closest('.r2-ov') ? ' in ' + a.closest('.r2-ov').className : ''); });
    console.log(JSON.stringify({ how, rows: rows.filter((r, i) => i % 3 === 0 || i === rows.length - 1), ae }, null, 1));
    await h.browser.close(); srv && srv.close();
})().catch(e => { console.error('PROBE FAIL', e); process.exit(1); });
