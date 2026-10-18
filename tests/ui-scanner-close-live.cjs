#!/usr/bin/env node
'use strict';
/* Browser proof for tests/ui-scanner-close.test.cjs (Oct 18 2026, Emmanuel: "Scanner: X bottom right. Keep barcode, snap, flash
   and manual barcode entry."). Opens the real app, taps the Scan bubble on the ring Home and checks, per view:
   - the close X sits at the bottom right of the capture panel and is what a tap there hits
   - it overlaps no other control: hint, barcode field, Go, Scan / Photo / Meal, Deep analyze, torch, shopping pill
   - the torch (shown as when the camera reports one) stays at the top right, the barcode field types and Go submits,
     Scan / Photo / Meal and Deep analyze are each what a tap at their centre hits
   - typing a code (keyboard layout) keeps the X, clear of the field and Go
   - shopping mode puts the X at the right end of the name / cart row, clear of both
   - tapping the X closes the scanner
   Views: Chromium 390x844, 375x667 and iPad 820x1180 (plus reduced motion at 390x844), then Playwright WebKit iPhone 13,
   iPhone SE and iPad (gen 7). Emulation, not a real iPhone.
   Run: node tests/ui-scanner-close-live.cjs [--views c390,c375,cpad,c390rm,w13,wse,wpad] [--shots DIR] [--root DIR]
   Needs Playwright (PLAYWRIGHT_MODULE or /tmp/pw/node_modules/playwright). Network is blocked except the local server. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), SHOTS = arg('shots', '');
const pw = require(process.env.PLAYWRIGHT_MODULE || '/tmp/pw/node_modules/playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
/* the same signed-in, onboarded, ring-Home profile the Home live tests use */
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];
const VIEWS = {
    c390: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
    c375: ['chromium', { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
    cpad: ['chromium', { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
    c390rm: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }],
    w13: ['webkit', 'iPhone 13'], wse: ['webkit', 'iPhone SE'], wpad: ['webkit', 'iPad (gen 7)']
};

/* runs in the page: rects of the X and every other control in the scanner, overlaps, and what a tap at each centre hits */
function measure() {
    const cam = document.getElementById('b3Cam'); if (!cam) return null;
    const vis = e => { if (!e) return false; const c = getComputedStyle(e), r = e.getBoundingClientRect(); return c.display !== 'none' && c.visibility !== 'hidden' && r.width > 0 && r.height > 0 && !e.closest('[hidden]'); };
    const rect = e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom) }; };
    const hits = e => { const r = e.getBoundingClientRect(), h = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!h && (h === e || e.contains(h)); };
    const x = cam.querySelector('.b3-cx'), bot = cam.querySelector('.b3-cbot');
    const named = { hint: '#b3Hint', field: '#b3Bc', go: '.b3-go', scan: '[data-act="scan"]', photo: '[data-act="photo"]', meal: '[data-act="meal"]', deep: '.b3-deep', torch: '.b3-torch', pill: '.ss-pill', ssrow: '.ss-row' };
    const others = {};
    for (const k in named) { const e = cam.querySelector(named[k]); if (vis(e)) others[k] = e; }
    cam.querySelectorAll('button, a, input, [role="button"]').forEach((e, i) => { if (e !== x && !x.contains(e) && vis(e) && !Object.values(others).includes(e)) others['ctl' + i] = e; });
    const xr = x && x.getBoundingClientRect(), overlaps = [];
    if (xr) for (const k in others) { if (others[k].contains(x) || k === 'ssrow') continue; /* the name/cart row is a container: its chips are checked as controls */ const o = others[k].getBoundingClientRect(); if (xr.left < o.right && o.left < xr.right && xr.top < o.bottom && o.top < xr.bottom) overlaps.push(k); }
    const out = { vw: innerWidth, vh: innerHeight, st: cam.dataset.st, cls: cam.className, xVisible: vis(x), xInPanel: !!(x && bot && bot.contains(x)), x: x && rect(x), bot: bot && rect(bot), overlaps, xHit: !!x && vis(x) && hits(x), rects: {}, hit: {} };
    for (const k in others) { out.rects[k] = rect(others[k]); out.hit[k] = hits(others[k]); }
    /* the lowest, right-most control: nothing else in the panel sits lower or further right than the X */
    if (xr) { out.belowX = Object.keys(others).filter(k => k !== 'ssrow' && bot.contains(others[k]) && others[k].getBoundingClientRect().top >= xr.bottom - 1); out.rightOfX = Object.keys(others).filter(k => bot.contains(others[k]) && others[k].getBoundingClientRect().left >= xr.right - 1); }
    return out;
}

(async () => {
    const srv = await serve(); const url = `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    const fails = [], log = (v, ok, what, d) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${v} ${what}${d ? ' ' + JSON.stringify(d) : ''}`); if (!ok) fails.push(v + ' ' + what); };
    for (const v of arg('views', 'c390,c375,cpad,c390rm,w13,wse,wpad').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] } : {});
        const dev = typeof dd === 'string' ? Object.assign({}, pw.devices[dd]) : Object.assign({}, dd);
        const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }, eng === 'chromium' ? { permissions: ['camera'] } : {}));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(url + '?tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('o8') && document.querySelector('[data-orbit="scan"]'), null, { timeout: 90000 });
            await sleep(4500);
            const open = async () => {
                const sc = await page.evaluate(() => { const r = document.querySelector('[data-orbit="scan"]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
                /* the bubble is the Home's own Scan bubble; a tap during Misty's flight can be eaten, so up to three taps */
                for (let i = 0; i < 3; i++) {
                    await page.touchscreen.tap(sc[0], sc[1]);
                    if (await page.waitForFunction(() => document.getElementById('b3Cam'), null, { timeout: 8000 }).then(() => true, () => false)) break;
                }
                await page.waitForFunction(() => document.getElementById('b3Cam'), null, { timeout: 2000 });
                await sleep(2500);
            };
            await open();
            /* as when the camera reports a torch (the fake camera has none): the app un-hides it */
            await page.evaluate(() => { const t = document.querySelector('#b3Cam .b3-torch'); if (t) { t.hidden = false; t.style.setProperty('visibility', 'visible', 'important'); t.style.setProperty('pointer-events', 'auto', 'important'); } });
            await sleep(300);
            let m = await page.evaluate(measure);
            if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `scanner-${v}.png`) });
            log(v, m && m.xVisible && m.xInPanel, 'X visible inside the capture panel', m && { x: m.x, st: m.st });
            log(v, m && m.x.l >= m.bot.r - 80 && m.x.t >= m.bot.b - 80 && m.belowX.length === 0 && m.rightOfX.length === 0, 'X at the bottom right of the panel', m && { x: m.x, bot: m.bot, below: m.belowX, right: m.rightOfX });
            log(v, m && m.x.b <= m.vh && m.x.r <= m.vw && m.x.r - m.x.l >= 42 && m.x.b - m.x.t >= 42, 'X on screen, at least 42px target', m && m.x);
            log(v, m && m.overlaps.length === 0, 'X overlaps no other control', m && m.overlaps);
            log(v, m && m.xHit, 'a tap at the X centre hits the X');
            log(v, m && m.rects.torch && m.rects.torch.t < 120 && m.rects.torch.r >= m.vw - 60 && m.hit.torch, 'torch stays top right and tappable', m && m.rects.torch);
            log(v, m && ['field', 'go', 'scan', 'photo', 'meal', 'deep'].every(k => m.rects[k] && m.hit[k]), 'barcode field, Go, Scan, Photo, Meal, Deep analyze visible and tappable', m && m.hit);
            /* manual barcode entry: type, Go submits */
            const sub = await page.evaluate(() => new Promise(res => { const f = document.getElementById('b3BcF'); let n = 0; f.addEventListener('submit', e => { n++; }, { capture: true, once: true }); window.__sgSub = () => n; res(true); }));
            await page.locator('#b3Bc').tap(); await sleep(400);
            await page.locator('#b3Bc').fill('4006381333931');
            await sleep(300);
            m = await page.evaluate(measure);
            if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `scanner-${v}-typing.png`) });
            log(v, m && /\bkb\b/.test(m.cls) && m.xVisible && m.overlaps.length === 0 && m.hit.field && m.hit.go, 'typing a code: X stays, clear of field and Go', m && { cls: m.cls, overlaps: m.overlaps, x: m.x, go: m.rects.go });
            const val = await page.inputValue('#b3Bc');
            await page.locator('.b3-go').tap(); await sleep(600);
            log(v, sub && val === '4006381333931' && await page.evaluate(() => window.__sgSub()) === 1, 'barcode typed and Go submits', { val });
            /* Go started a lookup; start clean for shopping mode: reload, back on the ring Home */
            await page.goto(url + '?tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('o8') && document.querySelector('[data-orbit="scan"]'), null, { timeout: 90000 });
            await sleep(4500);
            await open();
            const pill = await page.$('#b3Cam .ss-pill');
            if (pill) {
                await pill.tap(); await sleep(900);
                m = await page.evaluate(measure);
                if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `scanner-${v}-shop.png`) });
                log(v, m && /b3-shop/.test(m.cls) && m.xVisible && m.overlaps.length === 0 && m.xHit && m.hit.field && m.hit.go, 'shopping mode: X visible, clear of field, Go and the name/cart row', m && { overlaps: m.overlaps, x: m.x, ssrow: m.rects.ssrow });
                log(v, m && m.belowX.length === 0 && m.rightOfX.length === 0, 'shopping mode: X still the bottom-right control', m && { below: m.belowX, right: m.rightOfX });
                await pill.tap(); await sleep(600);
            } else log(v, true, 'shopping mode not offered in this build (no pill), skipped');
            /* tapping the X closes the scanner */
            const xc = await page.evaluate(() => { const r = document.querySelector('#b3Cam .b3-cx').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
            await page.touchscreen.tap(xc[0], xc[1]);
            await page.waitForFunction(() => !document.documentElement.classList.contains('b3-camon'), null, { timeout: 8000 }).catch(() => {});
            await sleep(600);
            log(v, await page.evaluate(() => !document.documentElement.classList.contains('b3-camon') && !document.querySelector('#b3Cam.on')), 'tapping the X closes the scanner');
        } catch (e) { log(v, false, 'run: ' + e.message.split('\n')[0]); }
        log(v, errs.length === 0, 'no page errors', errs);
        await browser.close();
    }
    srv.close();
    console.log(fails.length ? `\n${fails.length} FAILED` : '\nALL PASS');
    process.exit(fails.length ? 1 : 0);
})();
