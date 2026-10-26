'use strict';
/* Run 18: Scan tab "Or find a product…" search: double Enter / double tap on the search, and two searches in a row.
   Counts the live (not closing) search sheets. node probe-search-dbl.cjs <view> <url> */
const L = require('./lib.cjs');
const view = process.argv[2] || 'chromium390', target = process.argv[3] || 'https://therealetm.github.io/lowispike/';
(async () => {
    let url = target, srv = null; if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 6000 }); const P = h.page; const res = {};
    const live = () => P.evaluate(() => [...document.querySelectorAll('.r2-ov.b3-search-ov')].filter(e => !e.classList.contains('off')).map(e => (e.querySelector('.h2') || {}).textContent));
    try {
        res.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || '');
        await P.evaluate(() => window.goTab('scan')); await L.sleep(1500);
        res.hasForm = await P.evaluate(() => !!document.getElementById('b3NameF'));
        if (!res.hasForm) { await P.evaluate(() => window.LowiDex && LowiDex.render && LowiDex.render()); await L.sleep(800); res.hasForm2 = await P.evaluate(() => !!document.getElementById('b3NameF')); }
        /* 1. double Enter */
        await P.evaluate(() => { const i = document.getElementById('b3Name'); i.value = 'apfel'; const f = document.getElementById('b3NameF'); f.requestSubmit(); f.requestSubmit(); });
        await L.sleep(1500); res.doubleEnter = await live();
        await P.evaluate(() => window.LowiR2.closeAll()); await L.sleep(900);
        /* 2. two different searches back to back (typo fix) */
        await P.evaluate(() => { const i = document.getElementById('b3Name'), f = document.getElementById('b3NameF'); i.value = 'apfl'; f.requestSubmit(); i.value = 'apfelsaft'; f.requestSubmit(); });
        await L.sleep(1500); res.twoSearches = await live();
        await P.evaluate(() => window.LowiR2.closeAll()); await L.sleep(900);
        /* 3. single search still works */
        await P.evaluate(() => { const i = document.getElementById('b3Name'); i.value = 'banane'; document.getElementById('b3NameF').requestSubmit(); });
        await L.sleep(1500); res.single = await live();
        res.pageerror = h.log.pageerror.slice(0, 5);
        res.pass = res.doubleEnter.length === 1 && res.twoSearches.length === 1 && res.twoSearches[0] === 'apfelsaft' && res.single.length === 1;
    } catch (e) { res.error = String(e).slice(0, 300); }
    console.log(JSON.stringify(res, null, 1));
    await h.browser.close(); if (srv) srv.close();
})();
