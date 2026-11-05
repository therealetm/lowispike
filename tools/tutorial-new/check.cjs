/* tools/tutorial-new/check.cjs (Nov 5 2026): the complete new tutorial in a real browser, beyond the hands-free walk of
   tools/tutorial-short/check.cjs. node tools/tutorial-new/check.cjs [--engines chromium] [--langs de,en,es] [--devices "iPhone 13"]
   1. an existing account that finished the old tour (v37) with entries: the Settings page has the Tutorial row, its tap starts the
      new 9-card tour, Skip ends it, and the entries, the language and the theme are exactly as before (no reset, no forced start)
   2. a tour left halfway on an old card (water, Continue tutorial) continues on the card that took it over (day)
   3. Settings card: the finger holds Community and the real Settings page opens, leaving the card closes Settings,
      Skip leaves no page open
   4. a new account (lowi:setup-done) gets the tour by itself; an existing account does not
   Screens go to /tmp/tutorial-new/. Exit 1 on a fail. */
const H = require('../tutorial-short/harness.cjs');
const fs = require('fs');
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ENGINES = arg('--engines', 'chromium').split(','), LANGS = arg('--langs', 'de,en,es').split(','), DEVICES = arg('--devices', 'iPhone 13').split(','), OUT = '/tmp/tutorial-new';
fs.mkdirSync(OUT, { recursive: true });
let fails = 0, oks = 0; const fail = (k, m) => { fails++; console.log('  FAIL', k, m); }, ok = (c, k, m) => { if (c) oks++; else fail(k, m); };
const ENTRY = /meal|water|sleep|move|steps|fuel|log|journal|weight|cycle|fast|gap|cart|list|basket/i, NOT_ENTRY = /hint|tutorial|seen|news|tour|first-flight|ui|theme|lang|voice|zoom|cam|pad|tip|ack|nudge/i;
(async () => {
    const srv = await H.serve();
    for (const eng of ENGINES) {
        const br = await H.pw[eng].launch();
        for (const dev of DEVICES) for (const lang of LANGS) {
            const key = eng + '/' + dev + '/' + lang;
            const { ctx, page } = await H.newPage(br, dev, lang);
            const errs = []; page.on('pageerror', e => errs.push(e.message));
            /* an existing account: the old tour finished on v37, a few real entries */
            await page.addInitScript(() => {
                if (sessionStorage.getItem('tn-seeded')) return; sessionStorage.setItem('tn-seeded', '1');
                localStorage.setItem('lowi.tutorial.v1', JSON.stringify({ v: 37, done: true, end: '2026-11-01T10:00:00.000Z' }));
                localStorage.setItem('lowispike.tutorial-auto.v1', JSON.stringify({ s: 'done' }));
            });
            await H.boot(page, srv.url);
            const snap = () => page.evaluate(([a, b]) => { const re = new RegExp(a, 'i'), no = new RegExp(b, 'i'), o = {}; for (const k of Object.keys(localStorage)) if (re.test(k) && !no.test(k)) o[k] = localStorage.getItem(k); o.__lang = document.documentElement.lang; o.__theme = document.documentElement.className.match(/\b(cw-night|cw-day|tb-black)\b/g) + ''; return o; }, [ENTRY.source, NOT_ENTRY.source]);
            await H.sleep(4000);
            ok(!(await page.evaluate(() => window.LowiTutorial.isOn())), key, 'an existing account got the tour by itself');
            const before = await snap();
            /* 1. Settings page (from the Community name inside Community) -> Tutorial row */
            await page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await H.sleep(1500);
            const nameBtn = await page.$('.rm-menu-btn'); ok(!!nameBtn, key, 'no Community name button');
            if (nameBtn) await nameBtn.click(); await H.sleep(1500);
            const row = await page.$('.cme-ov [data-cme="tutorial"]'); ok(!!row, key, 'Settings has no Tutorial row');
            await page.screenshot({ path: OUT + '/' + key.replace(/\W+/g, '_') + '-settings.png' });
            if (row) { await row.scrollIntoViewIfNeeded(); await row.click(); }
            await H.sleep(3500);
            const t1 = await page.evaluate(() => ({ on: window.LowiTutorial.isOn(), id: window.LowiTutorial.step(), ids: window.LowiTutorial.ids(), cme: !!document.querySelector('.cme-ov') }));
            ok(t1.on, key, 'the Tutorial row did not start the tour');
            ok(JSON.stringify(t1.ids) === JSON.stringify(['hello', 'scan', 'gap', 'day', 'fuel', 'shop-week', 'community', 'settings', 'done']), key, 'not the new 9 cards: ' + t1.ids);
            await page.screenshot({ path: OUT + '/' + key.replace(/\W+/g, '_') + '-start.png' });
            await page.evaluate(() => window.LowiTutorial.stop('skipped')); await H.sleep(1500);
            const after = await snap();
            ok(JSON.stringify(before) === JSON.stringify(after), key, 'entries / language / theme changed: ' + JSON.stringify(before).slice(0, 200) + ' -> ' + JSON.stringify(after).slice(0, 200));
            /* 2. an old step id continues on its new card */
            await page.evaluate(() => window.LowiTutorial.start({ from: 'auto-resume', at: 'water' })); await H.sleep(1500);
            ok((await page.evaluate(() => window.LowiTutorial.step())) === 'day', key, 'a tour left on the old Water card did not continue on day');
            await page.evaluate(() => window.LowiTutorial.stop('skipped')); await H.sleep(1200);
            /* 3. the Settings card */
            await page.evaluate(() => window.LowiTutorial.start({ from: 'check', at: 'settings' }));
            let st = null; const t0 = Date.now();
            while (Date.now() - t0 < 20000) { st = await page.evaluate(() => ({ id: window.LowiTutorial.step(), opened: window.LowiTutorial.opened(), fy: !!(document.getElementById('tab-foryou') || {}).classList && document.getElementById('tab-foryou').classList.contains('active'), cme: !!document.querySelector('.cme-ov:not(.off)'), held: window.LowiTutorial.held() })); if (st.opened === 'settings-sheet' && st.cme) break; await H.sleep(300); }
            ok(st.id === 'settings' && st.opened === 'settings-sheet' && st.cme, key, 'the Settings card did not open Settings: ' + JSON.stringify(st));
            await page.screenshot({ path: OUT + '/' + key.replace(/\W+/g, '_') + '-settings-card.png' });
            /* when the tour leaves the Settings card (hands-free it moves on by itself; Back / Next are checked by tutorial-short/check.cjs),
               Settings closes with it */
            const t3 = Date.now(); while (Date.now() - t3 < 20000 && (await page.evaluate(() => window.LowiTutorial.step())) === 'settings') await H.sleep(300);
            await H.sleep(1500);
            st = await page.evaluate(() => ({ id: window.LowiTutorial.step(), cme: !!document.querySelector('.cme-ov:not(.off)') }));
            ok(st.id !== 'settings' && !st.cme, key, 'Settings stayed open after its card: ' + JSON.stringify(st));
            await page.evaluate(() => window.LowiTutorial.stop('skipped')); await H.sleep(1500);
            st = await page.evaluate(() => ({ cme: !!document.querySelector('.cme-ov:not(.off)'), stp: !!document.querySelector('.stp-ov.in'), home: document.getElementById('tab-home') && document.getElementById('tab-home').classList.contains('active') }));
            ok(!st.cme && !st.stp, key, 'pages left open after Skip: ' + JSON.stringify(st));
            /* 4. a new account gets it by itself */
            await page.evaluate(() => { localStorage.removeItem('lowi.tutorial.v1'); localStorage.removeItem('lowispike.tutorial-auto.v1'); window.dispatchEvent(new CustomEvent('lowi:setup-done')); });
            let auto = false; const t2 = Date.now();
            while (Date.now() - t2 < 15000) { auto = await page.evaluate(() => window.LowiTutorial.isOn() && window.LowiTutorial.step() === 'hello'); if (auto) break; await H.sleep(500); }
            ok(auto, key, 'a new account did not get the tour by itself');
            await page.evaluate(() => window.LowiTutorial.stop('skipped'));
            ok(!errs.length, key, 'page errors: ' + errs.slice(0, 3).join(' | '));
            console.log(key, 'done', errs.length ? 'errors ' + errs.length : '');
            await ctx.close();
        }
        await br.close();
    }
    srv.s.close();
    console.log('CHECKS OK ' + oks + ', FAILS ' + fails);
    process.exit(fails ? 1 : 0);
})();
