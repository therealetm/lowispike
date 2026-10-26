'use strict';
/* Run 13: what does a double tap on a Log meal slot tile open? node probe-slot-dbl.cjs <view> <url> [gapMs] */
const L = require('./lib.cjs');
const view = process.argv[2] || 'chromium390', url = process.argv[3] || 'https://therealetm.github.io/lowispike/', gap = +(process.argv[4] || 40);
(async () => {
    const h = await L.open({ view, url, settle: 6000 }); const P = h.page;
    const dump = () => P.evaluate(() => { const s = [...document.querySelectorAll('.r2-ov')].filter(e => !e.classList.contains('off')); return s.map(e => ({ cls: e.className.slice(0, 50), txt: (e.querySelector('.r2-shb') || e).innerText.replace(/\s+/g, ' ').slice(0, 260) })).concat([{ cam: !!document.querySelector('#scanner.on, .scan-cam.on, video'), active: (document.activeElement || {}).name || (document.activeElement || {}).tagName, logs: (window.LowiVitalsBridge.state().logs || []).length }]); });
    try {
        for (const slot of ['breakfast', 'lunch', 'dinner', 'snack']) {
            await P.evaluate(() => { window.LowiR2 && LowiR2.closeAll && LowiR2.closeAll(); }); await L.sleep(500);
            await P.evaluate(() => window.LowiSpirit.meal()); await P.waitForSelector('.sp-slots', { timeout: 8000 }); await L.sleep(900);
            const c = await L.center(h, '.sp-slot-' + slot);
            const hit = await P.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e.closest('[data-sp]') || e).getAttribute('data-sp'); }, [c.x, c.y]);
            await L.tap(h, c.x, c.y); await L.sleep(gap);
            const hit2 = await P.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? ((e.closest('[data-sp]') || {}).getAttribute ? e.closest('[data-sp]').getAttribute('data-sp') + ':' + e.closest('[data-sp]').textContent.trim().slice(0, 30) : e.className) : null; }, [c.x, c.y]);
            await L.tap(h, c.x, c.y); await L.sleep(1200);
            console.log(slot, JSON.stringify({ at: [Math.round(c.x), Math.round(c.y)], hit, secondTapHits: hit2, after: await dump() }));
        }
    } catch (e) { console.log('harness', String(e.stack || e).slice(0, 400)); }
    console.log('errors', JSON.stringify(Object.assign(await L.snap(h).catch(() => ({})), { pageerror: h.log.pageerror })));
    await h.browser.close(); process.exit(0);
})();
