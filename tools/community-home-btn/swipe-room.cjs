#!/usr/bin/env node
/* Edge swipe on each Community tab with motion on (no flight): does it start (sec-swiping), and where does it land? Also a real
   mouse click on the Home button. Usage: node swipe-room.cjs [URL] */
'use strict';
const H = require('../regress/harness.cjs');
(async () => {
    const R = await H.open({ engine: 'webkit', url: process.argv[2] || '' });
    await R.page.setViewportSize({ width: 390, height: 844 });
    await R.goto(); await H.sleep(3000);
    for (const t of ['room', 'rank', 'chat']) {
        await R.page.evaluate(() => goTab('foryou')); await H.sleep(1500);
        await R.page.evaluate(t => { const b = document.querySelector('.rm-tab[data-rm="' + t + '"]'); if (b) b.click(); }, t); await H.sleep(1200);
        const r = await R.page.evaluate(async () => {
            const ev = (t, x) => new PointerEvent(t, { pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: 420, bubbles: true, cancelable: true });
            const tgt = document.elementFromPoint(6, 420) || document.body;
            const log = { tgt: tgt.tagName + '#' + tgt.id + '.' + String(tgt.className).slice(0, 40) };
            tgt.dispatchEvent(ev('pointerdown', 6));
            for (let x = 20; x <= 330; x += 25) { tgt.dispatchEvent(ev('pointermove', x)); await new Promise(r => setTimeout(r, 16)); }
            log.swiping = document.documentElement.classList.contains('sec-swiping');
            const pg = document.getElementById('tab-foryou'); log.tf = pg.style.transform;
            tgt.dispatchEvent(ev('pointerup', 330));
            await new Promise(r => setTimeout(r, 900));
            log.tab = (document.querySelector('#main > .tab.active') || {}).id;
            return log;
        });
        console.log(t, JSON.stringify(r));
    }
    await R.page.evaluate(() => goTab('foryou')); await H.sleep(1500);
    const box = await R.page.evaluate(() => { const r = document.getElementById('secX').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    await R.page.mouse.click(box.x, box.y); await H.sleep(1000);
    console.log('mouse click ->', await R.page.evaluate(() => (document.querySelector('#main > .tab.active') || {}).id));
    await R.page.evaluate(() => goTab('foryou')); await H.sleep(1500);
    await R.page.touchscreen.tap(box.x, box.y); await H.sleep(1000);
    console.log('touch tap ->', await R.page.evaluate(() => (document.querySelector('#main > .tab.active') || {}).id));
    console.log('errs', JSON.stringify(R.errs.slice(0, 3)));
    await R.close();
})();
