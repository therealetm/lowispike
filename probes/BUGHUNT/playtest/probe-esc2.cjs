'use strict';
const L = require('./lib.cjs'), path = require('path');
(async () => {
    const srv = await L.serve(path.resolve(process.argv[2]));
    const url = `http://127.0.0.1:${srv.address().port}/index.html`;
    const h = await L.open({ url, view: 'chromium390', settle: 5000 }); const P = h.page;
    for (const k of ['move','water','move','fuel','move']) {
        const c = await L.center(h, `[data-orbit="${k}"]`); await L.tap(h, c.x, c.y); await L.sleep(2500);
        const before = await P.evaluate(() => ({ open: LowiHomeBloomsV2.isOpen(), ae: document.activeElement.className, t: Math.round(performance.now()) }));
        await P.keyboard.press('Escape');
        const after = await P.evaluate(() => ({ open: LowiHomeBloomsV2.isOpen(), ae: document.activeElement.className, t: Math.round(performance.now()) }));
        await L.sleep(600);
        const later = await P.evaluate(() => ({ open: LowiHomeBloomsV2.isOpen(), n: document.querySelectorAll('#hb2Bloom').length }));
        console.log(k, JSON.stringify(before), JSON.stringify(after), JSON.stringify(later));
        if (later.open) { await P.keyboard.press('Escape'); await L.sleep(600); }
    }
    await h.browser.close(); srv.close();
})();
