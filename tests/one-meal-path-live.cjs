#!/usr/bin/env node
'use strict';
/* Browser proof for tests/one-meal-path.test.cjs (Oct 21 2026, Emmanuel: "We have scanner and snap photo. We also have log meal.
   And then we also have the gap with the fasting... Find a strategy."). Opens the real app with a 16 h fast running and, per view:
   - Scan shows two actions, Barcode and Log meal (no separate Snap food), both tappable
   - Log meal from Scan opens the slot picker with the line "Saving this ends your 16 h fast · +N XP"
   - picking a slot shows Write / Scan / Snap with the same line, and typing a meal and saving it ends the fast:
     one fast record, the clock runs from the meal, and the fast reward says the meal ended it, with the points
   - pressing "I just ate" right after changes nothing and says the meal is already logged
   Views: Chromium 375x667 / 390x844 / 820x1180, then Playwright WebKit iPhone SE, iPhone 13 and iPad (gen 7). Emulation, not a real iPhone.
   Run: node tests/one-meal-path-live.cjs [--views c375,c390,cpad,wse,w13,wpad] [--shots DIR] [--root DIR] */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), SHOTS = arg('shots', '');
const pw = require(process.env.PLAYWRIGHT_MODULE || '/tmp/pw/node_modules/playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
/* a 16 h fast running, set once per context (the reload in the run keeps what the app wrote) */
const FAST = `try { if (!sessionStorage.getItem('__omp')) { sessionStorage.setItem('__omp', '1'); localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: Date.now() - 16 * 3600e3, hist: [] })); } } catch (e) {}`;
const VIEWS = {
    c375: ['chromium', { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
    c390: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
    cpad: ['chromium', { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
    wse: ['webkit', 'iPhone SE'], w13: ['webkit', 'iPhone 13'], wpad: ['webkit', 'iPad (gen 7)']
};
const visible = sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(), c = getComputedStyle(e); const ok = c.display !== 'none' && c.visibility !== 'hidden' && r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1; const h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { ok, hit: !!h && (h === e || e.contains(h)), text: (e.innerText || '').trim().replace(/\s+/g, ' '), r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] }; };

(async () => {
    const srv = await serve(); const url = `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    const fails = [], log = (v, ok, what, d) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${v} ${what}${d ? ' ' + JSON.stringify(d) : ''}`); if (!ok) fails.push(v + ' ' + what); };
    if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
    const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
    for (const v of arg('views', 'c375,c390,cpad,wse,w13,wpad').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } : {});
        const dev = typeof dd === 'string' ? Object.assign({}, pw.devices[dd]) : Object.assign({}, dd);
        const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }, eng === 'chromium' ? { permissions: ['camera'] } : {}));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        await ctx.addInitScript(FAST);
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(url + '?tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('o8') && document.querySelector('[data-orbit="scan"]') && window.LowiFastStop, null, { timeout: 90000 });
            await sleep(4500);
            const start = await page.evaluate(() => JSON.parse(localStorage.getItem('lowi_fast_v1')).last);
            const sc = await page.evaluate(() => { const r = document.querySelector('[data-orbit="scan"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
            for (let i = 0; i < 3; i++) { await page.touchscreen.tap(sc[0], sc[1]); if (await page.waitForFunction(() => document.getElementById('b3Cam'), null, { timeout: 8000 }).then(() => true, () => false)) break; }
            await sleep(2500);
            const acts = await page.evaluate(() => [...document.querySelectorAll('#b3Cam [data-b3="camact"]')].map(b => b.dataset.act));
            const meal = await page.evaluate(visible, '#b3Cam [data-act="meal"]'), bc = await page.evaluate(visible, '#b3Cam [data-act="scan"]');
            await shot(page, `1-scan-${v}`);
            log(v, JSON.stringify(acts) === '["scan","meal"]', 'Scan shows Barcode and Log meal only', acts);
            log(v, meal && meal.ok && meal.hit && bc && bc.ok && bc.hit, 'both on screen and tappable', { meal, bc });
            await page.locator('#b3Cam [data-act="meal"]').tap();
            await page.waitForSelector('.sp-slots', { timeout: 8000 });
            await sleep(900);
            const note = await page.evaluate(visible, '.sp-fast-note');
            await shot(page, `2-logmeal-${v}`);
            log(v, note && note.ok && /^Saving this ends your 16 h.* fast · \+\d+ XP$/.test(note.text), 'Log meal says saving ends the 16 h fast, with the points', note);
            const slot = await page.evaluate(() => (document.querySelector('.sp-slot.now') || document.querySelector('.sp-slot-snack') || document.querySelector('.sp-slot')).dataset.slot);
            await page.locator(`.sp-slot[data-slot="${slot}"]`).tap();
            await page.waitForSelector('#spMeal input[name="title"]', { timeout: 8000 });
            await sleep(700);
            const note2 = await page.evaluate(visible, '.sp-fast-note'), ways = await page.evaluate(() => document.querySelectorAll('.sp-slot-how button, .sp-how button, [data-sp="slotWrite"], [data-sp="slotSnap"]').length);
            await shot(page, `3-slot-${v}`);
            log(v, note2 && note2.ok && /ends your 16 h/.test(note2.text), 'the Write / Scan / Snap sheet shows the same line', note2);
            await page.locator('#spMeal input[name="title"]').fill('Chicken salad');
            await page.locator('#spMeal button[type="submit"]').first().tap();
            await sleep(2200);
            const after = await page.evaluate(() => JSON.parse(localStorage.getItem('lowi_fast_v1')));
            const rw = await page.evaluate(() => { const d = document.querySelector('.fst-rw, #fstRw, [class*="fst-rw"]'); return d ? (d.innerText || '').replace(/\s+/g, ' ').trim() : ''; });
            await shot(page, `4-reward-${v}`);
            log(v, after.hist.length === 1 && after.hist[0].s === start && after.awarded === start && after.last > Date.now() - 5 * 60e3, 'saving the meal ended the fast once, the clock runs from the meal', { hist: after.hist.length, awarded: after.awarded === start });
            log(v, /Your meal ended the fast/.test(rw) && /\+\s*\d+\s*XP/.test(rw), 'the reward says the meal ended the fast, with the points', rw.slice(0, 200));
            /* close the reward, then "I just ate" right after: nothing changes */
            await page.evaluate(() => { const b = document.querySelector('[class*="fst-rw"] button'); if (b) b.click(); });
            await sleep(600);
            const r = await page.evaluate(() => { const x = window.LowiFastStop.end(Date.now(), { chain: true }); return { already: !!(x && x.already), f: JSON.parse(localStorage.getItem('lowi_fast_v1')) }; });
            log(v, r.already && r.f.hist.length === 1 && r.f.last === after.last, '"I just ate" right after the logged meal changes nothing', { already: r.already, hist: r.f.hist.length });
            await sleep(400);
            await shot(page, `5-already-${v}`);
        } catch (e) { log(v, false, 'run: ' + e.message.split('\n')[0]); try { await shot(page, `x-error-${v}`); } catch (_) {} }
        log(v, errs.length === 0, 'no page errors', errs);
        await browser.close();
    }
    srv.close();
    console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
    process.exit(fails.length ? 1 : 0);
})();
