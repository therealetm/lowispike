/* tools/tutorial-new/probe-held.cjs: why does the tour hide right after a card? Starts the tour at a step, moves on, polls data-held. */
const H = require('../tutorial-short/harness.cjs');
const from = process.argv[2] || 'shop-week', lang = process.argv[3] || 'de';
(async () => {
    const srv = await H.serve(); const br = await H.pw.chromium.launch();
    const { ctx, page } = await H.newPage(br, 'iPhone 13', lang);
    await H.boot(page, srv.url);
    await page.evaluate(f => { document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); window.LowiTutorial.start({ from: 'check', at: f }); }, from);
    const log = [];
    for (let k = 0; k < 60; k++) {
        log.push(await page.evaluate(() => { const r = document.getElementById('ltTour'); const T = window.LowiTutorial; return (T.step && T.step() ? T.step().id : '?') + ' held=' + (r && r.getAttribute('data-held') || '') + ' opened=' + (T.opened ? T.opened() : ''); }));
        if (k === 12) await page.evaluate(() => { const b = document.querySelector('#ltTour [data-lt="next"], #ltTour .lt-next'); if (b) b.click(); else window.LowiTutorial.next && window.LowiTutorial.next(); });
        await H.sleep(250);
    }
    const out = []; for (const l of log) if (out[out.length - 1] !== l) out.push(l);
    console.log(out.join('\n'));
    await page.screenshot({ path: '/tmp/tn-held.png' });
    await ctx.close(); await br.close(); srv.s.close();
})();
