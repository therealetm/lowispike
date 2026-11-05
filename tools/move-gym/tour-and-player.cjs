'use strict';
/* Nov 5 2026: (1) a workout player that uses the world (html.mp-world) wakes the world again on Move; (2) the tour's Mirror card:
   it shows after Water/Move/Sleep, its demo opens the real Move page, and leaving it goes back Home. Chromium, 390x844. */
const { launch, openApp, sleep, existingSeed } = require('../interface-audit/lib.cjs');
(async () => {
    const h = await launch({ engine: 'chromium', seed: existingSeed({ lang: 'en', kv: { 'lowispike.lang': 'en' } }), lang: 'en', viewport: { width: 390, height: 844 } });
    await h.ctx.addInitScript(() => { window.__draws = 0; for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) { if (!C) continue; for (const m of ['drawElements', 'drawArrays']) { const o = C.prototype[m]; C.prototype[m] = function () { window.__draws++; return o.apply(this, arguments); }; } } });
    const P = h.page; await openApp(h, { settle: 6000 });
    const r = {};
    await P.evaluate(() => LowiMoveBubble.page()); await sleep(2500);
    const d0 = await P.evaluate(() => __draws); await sleep(1500); const d1 = await P.evaluate(() => __draws);
    r.moveIdleDraws = d1 - d0;
    await P.evaluate(() => { document.documentElement.classList.add('mp-world'); window.LowiWorld3D && LowiWorld3D.sync && LowiWorld3D.sync(); }); await sleep(300);
    const d2 = await P.evaluate(() => __draws); await sleep(1500); const d3 = await P.evaluate(() => __draws);
    r.playerWorldDraws = d3 - d2; r.playerBg = await P.evaluate(() => getComputedStyle(document.getElementById('tab-move')).backgroundColor);
    await P.evaluate(() => { document.documentElement.classList.remove('mp-world'); goTab('home'); }); await sleep(2000);
    /* the tour */
    await P.evaluate(() => window.LowiTutorial && LowiTutorial.start({ from: 'settings' })); await sleep(1500);
    const ids = [];
    for (let i = 0; i < 8; i++) {
        const s = await P.evaluate(() => { const t = window.LowiTutorial; const id = t && t.step && t.step(); const card = document.querySelector('[data-lt="next"]') && document.querySelector('[data-lt="next"]').closest('div[class*=lt]'); return { id, text: card ? card.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : '', tab: (document.querySelector('#main > .tab.active') || {}).id }; });
        ids.push(s);
        if (s.id === 'mirror') { await sleep(4500); r.mirrorTabDuringDemo = await P.evaluate(() => (document.querySelector('#main > .tab.active') || {}).id); }
        if (s.id === 'fuel') break;
        await P.evaluate(() => { const b = document.querySelector('[data-lt="next"]'); if (b) b.click(); }); await sleep(1800);
    }
    r.tour = ids; r.afterMirrorTab = ids.find(x => x.id === 'fuel') ? ids.find(x => x.id === 'fuel').tab : null;
    await P.evaluate(() => { const t = window.LowiTutorial; t && t.stop && t.stop('skipped'); }); await sleep(800);
    r.end = await P.evaluate(() => (document.querySelector('#main > .tab.active') || {}).id);
    r.errors = h.errors.slice(0, 6);
    console.log(JSON.stringify(r, null, 1));
    await h.browser.close();
})().catch(e => { console.error(e); process.exit(2); });
