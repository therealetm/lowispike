#!/usr/bin/env node
/* What covers the Home button on Move right after you come from Home with your companion flying (motion on). */
'use strict';
const H = require('../regress/harness.cjs');
(async () => {
    const R = await H.open({ engine: 'webkit', url: process.argv[2] || '' });
    await R.page.setViewportSize({ width: 390, height: 844 });
    await R.goto(); await H.sleep(3000);
    if (process.argv[3] !== 'still') { await R.page.evaluate(() => window.LowiPad && window.LowiPad.mode('auto')); await H.sleep(5000); }
    await R.page.evaluate(() => goTab('move'));
    for (const ms of [300, 1200, 2500, 5000]) {
        await H.sleep(ms === 300 ? 300 : ms - 300);
        console.log(ms, JSON.stringify(await R.page.evaluate(() => {
            const x = document.getElementById('secX'), r = x.getBoundingClientRect();
            const e = document.elementFromPoint(r.x + 20, r.y + 20);
            const d = el => el ? (el.tagName + '#' + el.id + '.' + String(el.className).slice(0, 60)) : null;
            const chain = []; for (let p = e; p && chain.length < 5; p = p.parentElement) chain.push(d(p));
            const cs = e && getComputedStyle(e);
            return { mf: document.documentElement.classList.contains('mf-on'), cls: document.documentElement.className.slice(0, 200), at: chain, z: cs && cs.zIndex, pos: cs && cs.position, xz: getComputedStyle(x).zIndex };
        })));
    }
    await R.close();
})();
