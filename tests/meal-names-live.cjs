#!/usr/bin/env node
'use strict';
/* Browser proof for tests/meal-names.test.cjs on the LIVE site (Oct 19 2026, Emmanuel: "chicken stew" only understood "chicken",
   typed meals logged "not provided", the Log meal panel repeated Snap food / Scan product / "What can I buy here?").
   Opens the live app as an onboarded ring-Home profile, taps Scan, then Meal (the Log meal panel) and checks:
   - the panel has the meal name field, Eaten recently / Misty suggestions, and no Snap food, Scan product or store-picks button
   - typing "chicken stew" shows "Understood as Chicken stew" before saving
   - saving logs it with every value (kcal, protein, carbs, fat, fiber, sugar), the saved sheet never says "Not provided"
   - the Scanner still offers Scan / Photo / Meal and the Snap food photo AI module is loaded
   Default view: Playwright WebKit iPhone 13 (emulation, not a real iPhone).
   Run: node tests/meal-names-live.cjs [--url https://therealetm.github.io/lowispike/] [--views w13,c390] [--shots DIR] */
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg('url', 'https://therealetm.github.io/lowispike/'), SHOTS = arg('shots', '');
const pw = require(process.env.PLAYWRIGHT_MODULE || '/tmp/pw/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const VIEWS = { w13: ['webkit', 'iPhone 13'], c390: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }] };

(async () => {
    const host = new URL(BASE).host, fails = [];
    const log = (v, ok, what, d) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${v} ${what}${d ? ' ' + JSON.stringify(d) : ''}`); if (!ok) fails.push(v + ' ' + what); };
    for (const v of arg('views', 'w13').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] } : {});
        const dev = typeof dd === 'string' ? Object.assign({}, pw.devices[dd]) : Object.assign({}, dd);
        const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
        /* only the live site itself: no Supabase, no analytics, no AI */
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(BASE + 'index.html?tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('o8') && document.querySelector('[data-orbit="scan"]'), null, { timeout: 90000 });
            const build = await page.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || (window.LowiSpirit && LowiSpirit.state().build) || '');
            log(v, build >= '20261019-151237', 'live build has the meal-names release', { build });
            await sleep(4500);
            const sc = await page.evaluate(() => { const r = document.querySelector('[data-orbit="scan"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
            for (let i = 0; i < 3; i++) { await page.touchscreen.tap(sc[0], sc[1]); if (await page.waitForFunction(() => document.getElementById('b3Cam'), null, { timeout: 8000 }).then(() => true, () => false)) break; }
            await sleep(2000);
            const scan = await page.evaluate(() => { const c = document.getElementById('b3Cam'), vis = e => !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none'; return { scan: vis(c && c.querySelector('[data-act="scan"]')), photo: vis(c && c.querySelector('[data-act="photo"]')), meal: vis(c && c.querySelector('[data-act="meal"]')), photoAI: !!document.querySelector('script[src*="food-photo-ai.js"]') }; });
            if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `meal-${v}-scanner.png`) });
            log(v, scan.scan && scan.photo && scan.meal, 'Scanner shows Scan, Photo and Meal', scan);
            log(v, scan.photoAI, 'Snap food photo AI module still loaded', scan);
            await page.locator('#b3Cam [data-act="meal"]').tap();
            await page.waitForFunction(() => document.querySelector('#spMeal input[name="title"]'), null, { timeout: 10000 });
            await sleep(1200);
            const panel = await page.evaluate(() => { const f = document.getElementById('spMeal'), sheet = f.closest('.sp-sheet, [class*="sheet"], dialog') || f.parentElement.parentElement, txt = sheet.innerText; return { txt: txt.slice(0, 400), snap: /Snap food|Foto|Scan product|Produkt scannen|What can I buy/i.test(txt), picks: !!sheet.querySelector('.sp-quick-cap, [class*="store-pick"], .spk-btn'), recentOrEmpty: !!sheet.querySelector('.sp-quick-list, .sp-note'), ph: f.querySelector('input[name="title"]').placeholder }; });
            if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `meal-${v}-panel.png`) });
            log(v, !panel.snap && !panel.picks, 'Log meal panel: no Snap food, Scan product or "What can I buy here?"', panel);
            log(v, panel.recentOrEmpty && !!panel.ph, 'Log meal panel: meal name field and Eaten recently', { ph: panel.ph });
            await page.locator('#spMeal input[name="title"]').tap();
            await page.locator('#spMeal input[name="title"]').fill('chicken stew');
            await page.locator('#spMeal input[name="title"]').dispatchEvent('input');
            await page.waitForFunction(() => /Chicken stew/i.test((document.querySelector('#spMeal .sp-meal-guess') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
            const guess = await page.evaluate(() => (document.querySelector('#spMeal .sp-meal-guess') || {}).textContent || '');
            if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `meal-${v}-typed.png`) });
            log(v, /Chicken stew/i.test(guess), 'typing "chicken stew" is understood as Chicken stew (not just chicken)', { guess });
            await page.locator('#spMeal button[type="submit"]').first().tap();
            await page.waitForFunction(() => !document.getElementById('spMeal') && document.querySelector('.sp-macro-grid'), null, { timeout: 15000 }).catch(() => {});
            await sleep(800);
            const saved = await page.evaluate(() => { const g = document.querySelector('.sp-macro-grid'), sheet = g && (g.closest('.sp-sheet, [class*="sheet"], dialog') || g.parentElement); let S = {}; try { S = JSON.parse(localStorage.getItem('lowi_v2') || localStorage.getItem('lowi') || '{}'); } catch (e) {} const logs = (S.logs || []).filter(l => /chicken stew/i.test(l.t || '')); const l = logs[logs.length - 1] || null; return { grid: g ? g.innerText.replace(/\s+/g, ' ') : '', sheet: sheet ? sheet.innerText.replace(/\s+/g, ' ').slice(0, 300) : '', notProvided: sheet ? /not provided|nicht angegeben|no disponible/i.test(sheet.innerText) : true, log: l && { t: l.t, macros: l.macros, est: l.est } }; });
            if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `meal-${v}-saved.png`) });
            log(v, !!saved.grid && !saved.notProvided, 'saved sheet shows the values, never "Not provided"', { grid: saved.grid, sheet: saved.sheet });
            const m = saved.log && saved.log.macros;
            log(v, !saved.log || (m && ['kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar'].every(k => typeof m[k] === 'number')), 'the log keeps every value (when the log is readable here)', saved.log);
        } catch (e) { log(v, false, 'run: ' + e.message.split('\n')[0]); }
        log(v, errs.length === 0, 'no page errors', errs);
        await browser.close();
    }
    console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
    process.exit(fails.length ? 1 : 0);
})();
