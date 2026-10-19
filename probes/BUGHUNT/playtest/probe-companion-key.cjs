'use strict';
/* BH-007 probe: does the user's own companion (brought to life with a birthday + name) survive a reload?
   companion.js (Community prefs {share,traits,born}) and companion-birth.js ({v,bday,btime,n,name}) shared 'lowispike.companion.v1'.
   usage: node probe-companion-key.cjs <view> <url|dir> */
const L = require('./lib.cjs');
(async () => {
    const view = process.argv[2] || 'chromium390', target = process.argv[3] || 'https://therealetm.github.io/lowispike/';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 6000 });
    const { page } = h, out = {};
    out.s1 = await page.evaluate(() => { const B = window.LowiBirthCompanion, c = B.core.generate({ bday: '1990-01-01', btime: '', n: 0, name: 'Zorbo' }); B.save(c);
        try { window.LowiCompanion.genome(); window.LowiCompanion.look(); } catch (e) { } /* forces companion.js seed() -> savePrefs */
        let share = null; try { share = window.LowiCompanion && window.LowiCompanion.prefs ? window.LowiCompanion.prefs() : null; } catch (e) { }
        return { has: B.has(), name: B.get().name, raw: localStorage.getItem('lowispike.companion.v1'), prefs: localStorage.getItem('lowispike.companionprefs.v1') }; });
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }); await L.sleep(7000);
    out.s2 = await page.evaluate(() => { const B = window.LowiBirthCompanion; return { has: B.has(), name: B.get().name, raw: localStorage.getItem('lowispike.companion.v1'), prefs: localStorage.getItem('lowispike.companion.prefs.v1') }; });
    await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }); await L.sleep(7000);
    out.s3 = await page.evaluate(() => { const B = window.LowiBirthCompanion; return { has: B.has(), name: B.get().name, hub: (() => { try { const d = document.createElement('div'); d.innerHTML = window.LowiMistyHub._html(); return (d.querySelector('.mh-id h2') || {}).textContent; } catch (e) { return 'ERR'; } })() }; });
    const s = await L.snap(h);
    console.log(JSON.stringify({ view, out, err: s.err, rej: s.rej, pageerror: h.log.pageerror }));
    const ok = out.s2.has && out.s2.name === 'Zorbo' && out.s3.has && out.s3.name === 'Zorbo';
    console.log(ok ? 'PASS' : 'FAIL own companion lost after reload');
    await h.browser.close(); if (srv) srv.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
