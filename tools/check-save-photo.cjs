#!/usr/bin/env node
/* Save photo on the meal photo screen, end to end in a simulated iPhone 13 (390x844) Home Screen app (navigator.standalone).
   node tools/check-save-photo.cjs [--engine chromium|webkit] [--lang en|de|es] [--url https://therealetm.github.io/lowispike/index.html]
   Emmanuel, Oct 25 evening: Fuel > Log meal > Snack > photo > choose a photo, then "Save photo" restarted the app.
   1. Snack > photo > choose photo (a real meal photo from tools/regress/fixtures): the photo screen shows with Save photo.
   2. iOS rejects a share (the share sheet is already opening): two quick taps on Save photo. The page must not navigate or
      reload; the photo opens inside the app (press and hold to save); closing it leaves the photo screen as it was.
   3. A share that works: two quick taps open ONE share sheet; no navigation.
   4. Log as meal, tapped twice: one meal, logged once, its XP once. No page errors.
   Nothing leaves this machine (fake Supabase); this is a simulation, not a physical iPhone. */
const H = require('./sim/harness.cjs');
const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const engine = arg('engine', 'chromium'), lang = arg('lang', 'en'), url = arg('url', ''), out = arg('out', '/tmp/save-photo-check');
require('fs').mkdirSync(out, { recursive: true });
const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); };

(async () => {
    const R = await H.open({ engine, lang, url, probe: false, fresh: false, viewport: { width: 390, height: 844 } });
    const P = R.page;
    /* an iPhone Home Screen app: standalone, an iPhone user agent, and a share sheet we control (sessionStorage __share: reject | ok) */
    await P.addInitScript(() => {
        try { Object.defineProperty(navigator, 'standalone', { configurable: true, get: () => true }); } catch (e) { }
        try { Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' }); } catch (e) { }
        window.__shares = 0; window.__boot = (window.__boot || 0) + 1;
        navigator.canShare = () => true;
        navigator.share = () => { window.__shares++; const m = sessionStorage.getItem('__share') || 'reject';
            if (m === 'ok') return new Promise(r => setTimeout(r, 1500));
            const e = new Error('share in progress'); e.name = 'InvalidStateError'; return Promise.reject(e); };
    });
    let navs = 0; P.on('framenavigated', f => { if (f === P.mainFrame()) navs++; });
    try {
        R.step = 'boot'; await R.goto(); await H.sleep(engine === 'webkit' ? 12000 : 7000);
        const tidy = () => P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); try { if (window.LowiTutorial && LowiTutorial.stop) LowiTutorial.stop(); } catch (e) { } });
        await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(1200);
        await tidy(); await H.sleep(800);
        const build = await P.evaluate(() => { const s = [...document.scripts].map(x => x.src).find(x => /spirit\.js\?v=/.test(x)); return s ? s.split('v=')[1] : 'missing'; });
        console.log('  build', build);
        /* 1 */
        R.step = 'snack photo';
        await P.evaluate(() => LowiSpirit.meal());
        await P.waitForSelector('.r2-ov.on [data-sp="slot"][data-slot="snack"]', { state: 'attached', timeout: 30000 }); await H.sleep(600);
        await P.evaluate(() => document.querySelector('.r2-ov.on [data-sp="slot"][data-slot="snack"]').click());
        await H.sleep(900);
        const fixture = path.join(__dirname, 'regress', 'fixtures', 'photo2.jpg');
        /* the photo button opens the camera screen with its "choose photo" input; choose the photo there */
        /* wait for the button, not a fixed time: with motion on, a busy VM's WebKit takes seconds for the sheet to switch */
        const hasPhotoBtn = !!(await P.waitForSelector('.r2-ov.on [data-sp="photo"], input.sp-file-in', { state: 'attached', timeout: 20000 }).catch(() => null)) && await P.evaluate(() => !!document.querySelector('.r2-ov.on [data-sp="photo"]'));
        if (hasPhotoBtn) { await P.evaluate(() => document.querySelector('.r2-ov.on [data-sp="photo"]').click()); await H.sleep(1500); }
        const input = await P.waitForSelector('input.sp-file-in', { state: 'attached', timeout: 15000 }).catch(() => null);
        ok('snack > photo shows a choose-photo input', !!input, { hasPhotoBtn });
        if (input) await input.setInputFiles(fixture);
        await P.waitForSelector('[data-sp="savePhoto"]', { state: 'attached', timeout: 20000 }).catch(() => { });
        await H.sleep(2500);
        const sheet = () => P.evaluate(() => ({ save: !!document.querySelector('[data-sp="savePhoto"]'), img: !!document.querySelector('.sp-photo-prev img, .sp-photo img, img.sp-photo-img') || [...document.querySelectorAll('.r2-ov.on img')].some(i => /^data:|^blob:/.test(i.src)), title: (document.querySelector('.r2-ov.on input[name="title"]') || {}).value }));
        const s1 = await sheet();
        ok('photo screen with Save photo', s1.save && s1.img, s1);
        await R.shot(out + '/1-photo-' + engine + '-' + lang + '.png');
        await P.evaluate(() => { const f = document.querySelector('.r2-ov.on input[name="title"]'); if (f) { f.value = 'Quark mit Mandeln'; f.dispatchEvent(new Event('input', { bubbles: true })); } });
        /* 2 */
        R.step = 'share rejected';
        const boot0 = await P.evaluate(() => window.__boot), navs0 = navs;
        await P.evaluate(() => sessionStorage.setItem('__share', 'reject'));
        await P.evaluate(() => { const b = document.querySelector('[data-sp="savePhoto"]'); b.click(); b.click(); });
        await H.sleep(1500);
        ok('no navigation, no reload', navs === navs0 && (await P.evaluate(() => window.__boot)) === boot0, { navs: navs - navs0 });
        const view = await P.evaluate(() => { const v = document.getElementById('spPhotoSave'); return v ? { img: !!v.querySelector('img'), text: v.textContent.trim().slice(0, 90) } : null; });
        ok('the photo opens inside the app with a press-and-hold hint', view && view.img && view.text.length > 10, view);
        await R.shot(out + '/2-inapp-' + engine + '-' + lang + '.png');
        if (view) await P.evaluate(() => document.querySelector('#spPhotoSave button').click());
        await H.sleep(700);
        const s2 = await sheet();
        ok('closing it keeps the photo screen, photo and typed name', !(await P.evaluate(() => !!document.getElementById('spPhotoSave'))) && s2.save && s2.img && s2.title === 'Quark mit Mandeln', s2);
        /* 3 */
        R.step = 'share ok';
        await P.evaluate(() => { sessionStorage.setItem('__share', 'ok'); window.__shares = 0; });
        await P.evaluate(() => { const b = document.querySelector('[data-sp="savePhoto"]'); b.click(); setTimeout(() => b.click(), 200); setTimeout(() => b.click(), 600); });
        await H.sleep(2500);
        ok('three quick taps open one share sheet', (await P.evaluate(() => window.__shares)) === 1, await P.evaluate(() => window.__shares));
        ok('still no navigation', navs === navs0, { navs: navs - navs0 });
        /* 4 */
        R.step = 'log once';
        await P.evaluate(() => { window.__meals = []; addEventListener('lowi:meal-logged', e => window.__meals.push(e.detail && e.detail.id)); });
        const before = await P.evaluate(() => (LowiVitalsBridge.state().meals || LowiVitalsBridge.state().logs || []).length);
        await P.evaluate(() => { const f = document.querySelector('.r2-ov.on form') || document.querySelector('[data-sp="savePhoto"]').closest('.r2-ov').querySelector('form'); f.requestSubmit(); try { f.requestSubmit(); } catch (e) { } });
        await H.sleep(3500);
        const ids = await P.evaluate(() => window.__meals), after = await P.evaluate(() => (LowiVitalsBridge.state().meals || LowiVitalsBridge.state().logs || []).length);
        ok('Log as meal tapped twice: one meal logged', ids.length === 1 && after - before <= 1, { events: ids, added: after - before });
        ok('no navigation through the whole flow', navs === navs0, { navs: navs - navs0 });
    } catch (e) { ok('run finished', false, String(e && e.message || e).slice(0, 300)); }
    const errs = R.errs.filter(e => !/supabase|realtime|websocket|fetch|Failed to load|ERR_|net::/i.test(e.m));
    ok('no page errors', errs.length === 0, errs.slice(0, 3));
    await R.close();
    const fail = res.filter(r => !r.pass).length;
    console.log(`${engine} ${lang}: ${res.length - fail}/${res.length} passed`);
    process.exit(fail ? 1 : 0);
})();
