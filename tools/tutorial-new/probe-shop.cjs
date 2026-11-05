/* tools/tutorial-new/probe-shop.cjs: does the tour's supermarket route show the Supermarkt card? (debug, read-only) */
const H = require('../tutorial-short/harness.cjs');
(async () => {
    const srv = await H.serve(); const br = await H.pw.chromium.launch();
    const { ctx, page } = await H.newPage(br, 'iPhone 13', process.argv[2] || 'en');
    await H.boot(page, srv.url);
    const r = await page.evaluate(async () => {
        const w = ms => new Promise(r => setTimeout(r, ms)), P = window.LowiStorePicks, o = {};
        o.api = Object.keys(P || {});
        try { window.LowiHomeBloomsV2.open('fuel'); } catch (e) { o.e1 = String(e); } await w(1200);
        try { window.LowiHomeBloomsV2.close(); } catch (e) { }
        try { if (!P.isOpen()) P.open('tour'); P.setTab('shop'); } catch (e) { o.e2 = String(e); }
        const snap = () => { const c = document.querySelector('.stp-card'); if (!c) return 'no .stp-card'; const r = c.getBoundingClientRect(), cs = getComputedStyle(c); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height), cs.display, cs.visibility, cs.opacity, c.className, (c.innerText || '').replace(/\s+/g, ' ').slice(0, 160)].join(' | '); };
        o.t300 = (await w(300), snap()); o.t1500 = (await w(1200), snap()); o.isOpen = P.isOpen();
        o.ov = [...document.querySelectorAll('[class*="stp"]')].filter(e => e.getBoundingClientRect().height > 40).map(e => e.className).slice(0, 8);
        return o;
    });
    console.log(JSON.stringify(r, null, 1));
    await page.screenshot({ path: '/tmp/tn-shop.png' });
    await ctx.close(); await br.close(); srv.s.close();
})();
