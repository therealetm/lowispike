#!/usr/bin/env node
/* After an edge swipe back from Community (motion on), what covers the Home button on the next page?
   Usage: node swipe-probe.cjs [URL] [fly|still] */
'use strict';
const H = require('../regress/harness.cjs');
const at = R => R.page.evaluate(() => {
    const x = document.getElementById('secX'), r = x.getBoundingClientRect();
    const d = el => el ? (el.tagName + '#' + el.id + '.' + String(el.className).slice(0, 50)) : null;
    const chain = []; for (let p = document.elementFromPoint(r.x + 20, r.y + 20); p && chain.length < 4; p = p.parentElement) chain.push(d(p));
    const mid = []; for (let p = document.elementFromPoint(195, 420); p && mid.length < 4; p = p.parentElement) mid.push(d(p));
    return { tab: (document.querySelector('#main > .tab.active') || {}).id, at: chain, mid, cls: document.documentElement.className.split(' ').filter(c => /bs|swipe|peek|sec|mf|leave|wh-|lw-/.test(c)).join(' ') };
});
(async () => {
    const R = await H.open({ engine: 'webkit', url: process.argv[2] || '' });
    await R.page.setViewportSize({ width: 390, height: 844 });
    await R.goto(); await H.sleep(3000);
    if (process.argv[3] !== 'still') { await R.page.evaluate(() => window.LowiPad && window.LowiPad.mode('auto')); await H.sleep(5000); }
    await R.page.evaluate(() => goTab('foryou')); await H.sleep(2500);
    await R.page.evaluate(async () => {
        const ev = (t, x) => new PointerEvent(t, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: 420, bubbles: true, cancelable: true });
        const tgt = document.elementFromPoint(6, 420) || document.body;
        tgt.dispatchEvent(ev('pointerdown', 6));
        for (let x = 20; x <= 330; x += 25) { tgt.dispatchEvent(ev('pointermove', x)); await new Promise(r => setTimeout(r, 16)); }
        tgt.dispatchEvent(ev('pointerup', 330));
    });
    for (const ms of [500, 1500, 4000]) { await H.sleep(ms === 500 ? 500 : ms - 500); console.log('after swipe ' + ms, JSON.stringify(await at(R))); }
    await R.page.evaluate(() => goTab('move')); await H.sleep(2000);
    console.log('move', JSON.stringify(await at(R)));
    await R.page.tap('#secX', { timeout: 3000 }).catch(e => console.log('tap failed', String(e).slice(0, 200)));
    await H.sleep(1000); console.log('after tap', JSON.stringify(await at(R)));
    console.log('errs', JSON.stringify(R.errs.slice(0, 3)));
    await R.close();
})();
