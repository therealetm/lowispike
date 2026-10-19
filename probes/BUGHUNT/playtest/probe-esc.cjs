'use strict';
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
    const srv = await L.serve(path.resolve(arg('root', '.')));
    const url = `http://127.0.0.1:${srv.address().port}/index.html`;
    const h = await L.open({ url, view: arg('view', 'chromium390'), settle: 5000 });
    const P = h.page;
    await P.evaluate(() => { window.__k = []; document.addEventListener('keydown', e => window.__k.push('doc:' + e.key + ':' + (e.target.className || e.target.tagName) + ':' + e.defaultPrevented), true); window.__ev = []; document.addEventListener('lowi:bloom-v2', e => window.__ev.push(JSON.stringify(e.detail) + '@' + Math.round(performance.now()))); });
    for (const k of (arg('keys', 'move,water,move,gap,move')).split(',')) {
        const c = await L.center(h, `[data-orbit="${k}"]`);
        await L.tap(h, c.x, c.y); await L.sleep(1200);
        const a = await P.evaluate(() => ({ ae: (document.activeElement.className || document.activeElement.tagName) + '', blooms: document.querySelectorAll('#hb2Bloom').length, mb: !!document.querySelector('.mb-bloom,.mvb-bloom,[class*=move-bloom]'), html: document.documentElement.className }));
        for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await L.sleep(250); }
        await L.sleep(500);
        const b = await P.evaluate(() => ({ blooms: Array.from(document.querySelectorAll('#hb2Bloom')).map(e => e.className), k: window.__k.splice(0), ev: window.__ev.splice(0), html: document.documentElement.className }));
        console.log(k, JSON.stringify(a), '\n   ', JSON.stringify(b));
    }
    await h.browser.close(); srv.close();
})();
