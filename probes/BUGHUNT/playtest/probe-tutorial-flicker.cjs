'use strict';
/* Tutorial flicker probe (Oct 19 2026): WebKit iPhone 13. Starts Settings > Tutorial's tour, then on each step samples every 100 ms for
   3 s whether the card is visible, and counts hide/show flips. Usage: node probe-tutorial-flicker.cjs [URL|DIR] */
const { serve, sleep, open } = require('./lib.cjs');
const path = require('path');
(async () => {
    let arg = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null, url = arg;
    if (!/^https?:/.test(arg)) { srv = await serve(path.resolve(arg)); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await open({ view: 'iphone13', url, settle: 6000 });
    const out = [];
    const started = await h.page.evaluate(() => window.LowiTutorial && LowiTutorial.start({ from: 'probe' }));
    out.push('started=' + started);
    for (let k = 0; k < 4; k++) {
        const r = await h.page.evaluate(async () => {
            const s = []; const why = new Set();
            for (let t = 0; t < 30; t++) {
                const el = document.getElementById('ltTour'); const v = !!el && getComputedStyle(el).visibility !== 'hidden';
                s.push(v ? 1 : 0); if (el && el.getAttribute('data-held')) why.add(el.getAttribute('data-held'));
                await new Promise(r => setTimeout(r, 100));
            }
            let flips = 0; for (let t = 1; t < s.length; t++) if (s[t] !== s[t - 1]) flips++;
            return { step: LowiTutorial.step(), visible: s.reduce((a, b) => a + b, 0) + '/30', flips, heldBy: [...why] };
        });
        out.push(JSON.stringify(r));
        await h.page.evaluate(() => { const b = document.querySelector('#ltTour [data-lt="next"]'); if (b) b.click(); });
        await sleep(400);
    }
    out.push('errors=' + JSON.stringify(h.log.pageerror.slice(0, 3)));
    console.log(out.join('\n'));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
