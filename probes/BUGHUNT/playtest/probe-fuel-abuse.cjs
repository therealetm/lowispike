'use strict';
/* Run 13: Log meal 4-slot picker abuse + language switch with the sheet open + Weight & BMI sheet spam/Escape.
   node probe-fuel-abuse.cjs <view> <url> */
const L = require('./lib.cjs');
const view = process.argv[2] || 'chromium390', url = process.argv[3] || 'https://therealetm.github.io/lowispike/';
(async () => {
    const h = await L.open({ view, url, settle: 6000 }); const P = h.page; const out = [];
    const note = (k, v) => { out.push(k + ' ' + JSON.stringify(v)); console.log(k, JSON.stringify(v)); };
    const sheets = () => P.evaluate(() => [...document.querySelectorAll('.r2-ov')].filter(e => !e.classList.contains('off') && e.isConnected).map(e => e.className.replace(/\s+/g, '.').slice(0, 60)));
    const tapSel = async s => { const c = await L.center(h, s); if (!c) return false; await L.tap(h, c.x, c.y); return true; };
    try {
        note('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || ''));
        await P.evaluate(() => { window.LowiHomeBloomsV2.mount(document); window.LowiHomeBloomsV2.open('fuel'); });
        await L.sleep(1400);
        note('logTap', await tapSel('#hb2Bloom [data-id="log"]'));
        await P.waitForSelector('.sp-slots', { timeout: 8000 }).catch(() => note('noPicker', 1));
        await L.sleep(800);
        /* 1. double tap a slot tile */
        const c = await L.center(h, '.sp-slot-breakfast');
        if (c) { await L.tap(h, c.x, c.y); await L.sleep(40); await L.tap(h, c.x, c.y); }
        await L.sleep(900);
        note('afterDoubleTap.sheets', await sheets());
        note('afterDoubleTap.head', await P.evaluate(() => [...document.querySelectorAll('.sp-slot-head h2')].map(e => e.textContent)));
        /* 2. change <-> slot 10 times quickly */
        for (let i = 0; i < 10; i++) {
            await tapSel('.sp-slot-change'); await L.sleep(60 + (i % 3) * 80);
            await tapSel(['.sp-slot-breakfast', '.sp-slot-lunch', '.sp-slot-dinner', '.sp-slot-snack'][i % 4]); await L.sleep(60 + (i % 2) * 120);
        }
        await L.sleep(1200);
        note('afterChurn.sheets', await sheets());
        note('afterChurn.heads', await P.evaluate(() => ({ heads: [...document.querySelectorAll('.sp-slot-head h2')].map(e => e.textContent), pickers: document.querySelectorAll('.sp-slots').length, strips: document.querySelectorAll('.ns-strip').length })));
        await P.evaluate(() => { const s = document.querySelector('.sp-slot-dinner'); if (s) s.click(); });
        await L.sleep(800);
        /* 3. language switch with the slot sheet open */
        for (const lang of ['de', 'es', 'en']) {
            await P.evaluate(l => window.LowiLang.set(l), lang); await L.sleep(900);
            note('lang.' + lang, await P.evaluate(() => { const q = s => { const e = document.querySelector(s); return e ? e.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) : null; }; return { head: q('.r2-ov.sp-sheet .sp-slot-head h2'), how: [...document.querySelectorAll('.r2-ov.sp-sheet .sp-how span')].map(e => e.textContent), ask: q('.r2-ov.sp-sheet .sp-manual label'), strip: q('.r2-ov.sp-sheet .ns-sl'), ph: (document.querySelector('.r2-ov.sp-sheet input[name=title]') || {}).placeholder }; }));
        }
        await P.evaluate(l => window.LowiLang.set('de'), 'de'); await L.sleep(500);
        await tapSel('.sp-slot-change'); await L.sleep(900);
        note('picker.de', await P.evaluate(() => [...document.querySelectorAll('.sp-slot b')].map(e => e.textContent)));
        await P.evaluate(l => window.LowiLang.set('es'), 'es'); await L.sleep(900);
        note('picker.es-after-switch', await P.evaluate(() => ({ tiles: [...document.querySelectorAll('.sp-slot b')].map(e => e.textContent), q: (document.querySelector('.sp-slot-q') || {}).textContent })));
        await P.evaluate(l => window.LowiLang.set('en'), 'en'); await L.sleep(500);
        /* 4. Escape closes it */
        await P.keyboard.press('Escape'); await L.sleep(700);
        note('afterEsc.sheets', await sheets());
        await P.evaluate(() => { window.LowiR2 && window.LowiR2.closeAll && window.LowiR2.closeAll(); }); await L.sleep(600);
        /* 5. Weight & BMI spam */
        for (let i = 0; i < 12; i++) { await P.evaluate(i => { const B = window.LowiBodyStats; if (i % 2) B.close(); else B.open(); }, i); await L.sleep(i % 3 ? 30 : 200); }
        await L.sleep(600);
        note('bmiSpam', await P.evaluate(() => ({ n: document.querySelectorAll('#bsOv').length, open: window.LowiBodyStats.isOpen() })));
        await P.evaluate(() => window.LowiBodyStats.open()); await L.sleep(400);
        note('bmiOpen', await P.evaluate(() => ({ n: document.querySelectorAll('#bsOv').length, live: document.querySelectorAll('#bsOv:not(.bs-out)').length })));
        await P.fill('#bsKg', '82').catch(e => note('fillKg', String(e).slice(0, 80)));
        const cm = await P.$('#bsCm'); if (cm) await P.fill('#bsCm', '180');
        await P.evaluate(() => window.LowiLang.set('de')); await L.sleep(600);
        note('bmi.de', await P.evaluate(() => ({ title: (document.querySelector('#bsOv .bs-head h2') || {}).textContent, kg: (document.querySelector('#bsKg') || {}).value, cm: (document.querySelector('#bsCm') || {}).value })));
        await P.evaluate(() => window.LowiLang.set('en')); await L.sleep(400);
        for (let i = 0; i < 5; i++) { await P.evaluate(() => { const f = document.querySelector('#bsOv form'); f && f.requestSubmit(); }); await L.sleep(50); }
        await L.sleep(800);
        note('bmiSubmits', await P.evaluate(() => { const s = window.LowiVitalsBridge && LowiVitalsBridge.state(); const hh = s && s.health; return { weight: hh && hh.weight, hist: hh && (hh.weightLog || hh.weights || hh.bodyLog || null) && JSON.stringify(hh.weightLog || hh.weights || hh.bodyLog).slice(0, 300), keys: hh ? Object.keys(hh) : null, rows: document.querySelectorAll('#bsOv [data-bs-rm]').length }; }));
        /* open Stats then BMI on top, Escape: only the top one closes */
        await P.evaluate(() => { window.LowiBodyStats.close(); window.LowiNutriStats && LowiNutriStats.open(); }); await L.sleep(900);
        await tapSel('.r2-ov [data-body-open]'); await L.sleep(700);
        note('stack', { sheets: await sheets(), bs: await P.evaluate(() => window.LowiBodyStats.isOpen()) });
        await P.keyboard.press('Escape'); await L.sleep(600);
        note('stack.afterEsc1', { sheets: await sheets(), bs: await P.evaluate(() => window.LowiBodyStats.isOpen()), focus: await P.evaluate(() => (document.activeElement || {}).className || document.activeElement.tagName) });
        await P.keyboard.press('Escape'); await L.sleep(600);
        note('stack.afterEsc2', { sheets: await sheets(), bs: await P.evaluate(() => window.LowiBodyStats.isOpen()) });
    } catch (e) { note('harness', String(e.stack || e).slice(0, 400)); }
    note('errors', Object.assign(await L.snap(h).catch(() => ({})), { pageerror: h.log.pageerror, console: h.log.console.slice(0, 8) }));
    await h.browser.close(); process.exit(0);
})();
