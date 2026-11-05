'use strict';
/* frames the 3D world draws per second on Home, idle, at each Calm mode level. node tools/galaxy-still/fps.cjs */
const { launch, openApp, sleep, existingSeed } = require('../interface-audit/lib.cjs');
(async () => {
    const h = await launch({ engine: 'chromium', seed: existingSeed({ lang: 'de' }), lang: 'de', locale: 'de-DE', viewport: { width: 390, height: 844 } });
    const P = h.page;
    await openApp(h, { query: '?dc=' + Date.now() });
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await sleep(200); }
    await P.waitForFunction(() => window.LowiWorld3D && window.LowiWorld3D.state === 'ready', null, { timeout: 90000 }).catch(() => { });
    await sleep(2500);
    for (const L of [0, 1, 2, 3, 4]) {
        await P.evaluate(n => window.LowiGalaxyStill.set(n), L); await sleep(3500);
        const f0 = await P.evaluate(() => window.LowiWorld3D.renderer.info.render.frame); await sleep(3000);
        const f1 = await P.evaluate(() => window.LowiWorld3D.renderer.info.render.frame);
        console.log('L' + L + ' ' + ((f1 - f0) / 3).toFixed(1) + ' frames/s');
    }
    await h.browser.close();
})();
