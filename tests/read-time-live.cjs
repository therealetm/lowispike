'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/read-time-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD], ipad_chromium: ['chromium', IPAD] };
/* the same local fixture session the Home ring check uses (no account, no network) */
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];

/* Browser check: text bubbles stay up long enough to read (Oct 18 2026, Emmanuel: "the bubbles are too fast, actually all bubbles
   are too fast. I can barely read what it says"). Per view:
     - the app toast ("Saved") is still up at 2.6 s (it used to go at 2.2 s) and gone again by 4.5 s
     - Misty's line (LowiPraise.say) is still up at 3.5 s (it used to go at 1.7 s) and goes after its reading time
     - inside a world (default liver) the cell guide talks; every line it says on its own stays up at least its reading time
       (read-time-core.js) before the next one replaces it or it goes quiet. Watched for --watch ms (default 30000).
   Screenshot of the guide's bubble: OUT/TAG-<view>-guide.png. Production Supabase and every non-GET request are blocked.
     node tests/read-time-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--tag after]
       [--views iphone_chromium,iphone13_webkit,ipad_landscape_webkit] [--world liver] [--watch 30000]
   Exit 0 = pass. */
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host, WORLD = arg('world', 'liver');
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        const writes = [];
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (q.method() !== 'GET') writes.push(q.method() + ' ' + u.host); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [], P = [], steps = {};
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight && window.LowiPraise, null, { timeout: 90000 }).catch(() => { });
            await sleep(+arg('wait', 6000));
            steps.build = await page.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
            steps.rt = await page.evaluate(() => !!(window.LowiReadTime && window.LowiReadTime.ms));
            if (!steps.rt) { P.push('read-time-core.js not loaded'); await page.addScriptTag({ path: path.join(__dirname, '..', 'read-time-core.js') }); } /* still measure old code against the rule */
            /* 1. the app toast */
            await page.evaluate(() => window.toast('Saved'));
            await sleep(2600);
            const t1 = await page.evaluate(() => document.getElementById('toast').classList.contains('show'));
            await sleep(1900);
            const t2 = await page.evaluate(() => document.getElementById('toast').classList.contains('show'));
            steps.toast = { at2600: t1, at4500: t2 };
            if (!t1) P.push('toast gone before 2.6 s');
            if (t2) P.push('toast still up at 4.5 s (should go after its reading time)');
            /* 2. Misty's line */
            const line = 'Tap the joystick and steer me into a cell world. We will find sugar crumbs together.';
            const need = await page.evaluate(l => window.LowiReadTime.ms(l), line);
            await page.evaluate(l => window.LowiPraise.say(l), line);
            await sleep(3500);
            const p1 = await page.evaluate(() => { const e = document.getElementById('lpPraise'); return !!(e && e.classList.contains('on')); });
            await sleep(Math.max(0, need - 3500 + 1200));
            const p2 = await page.evaluate(() => { const e = document.getElementById('lpPraise'); return !!(e && e.classList.contains('on')); });
            steps.praise = { need, at3500: p1, after: p2 };
            if (!p1) P.push('Misty\'s line gone before 3.5 s');
            if (p2) P.push('Misty\'s line still up after its reading time');
            /* 3. the cell guide inside a world */
            await page.evaluate(() => { window.__rp = []; window.addEventListener('lowi:region-pal', e => window.__rp.push({ t: performance.now(), text: e.detail.text, user: e.detail.user, kind: e.detail.kind, prio: e.detail.prio || 0 })); });
            steps.travel = await page.evaluate(w => { try { return !!window.LowiWorldRegions.travel(w); } catch (e) { return 'threw ' + e.message; } }, WORLD);
            await page.waitForFunction(w => { try { return window.LowiWorldRegions.current() === w && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, WORLD, { timeout: 60000 });
            await page.waitForFunction(() => window.__rp.length > 0, null, { timeout: 30000 }).catch(() => { });
            await sleep(1200);
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-guide.png` });
            /* watch: sample whether the bubble is up every 250 ms */
            const watch = +arg('watch', 30000);
            await page.evaluate(() => { window.__rpOn = []; window.__rpI = setInterval(() => { const e = document.querySelector('.rp-pal'); window.__rpOn.push({ t: performance.now(), on: !!(e && e.classList.contains('rp-talk')), text: e && e.querySelector('.rp-tx') ? e.querySelector('.rp-tx').textContent : '' }); }, 250); });
            await sleep(watch);
            const R = await page.evaluate(() => { clearInterval(window.__rpI); return { ev: window.__rp, on: window.__rpOn, ms: window.__rp.map(x => window.LowiReadTime.ms(x.text)), hold: window.__rp.map((x, i, a) => i ? window.LowiRegionPalsCore.minRead(a[i - 1].text, a[i - 1].prio, x.prio) : 0) }; });
            const lines = [];
            for (let i = 0; i < R.ev.length; i++) {
                const e = R.ev[i], next = R.ev[i + 1];
                /* how long it really stayed: until the next line, or until the samples show the bubble quiet */
                const off = R.on.find(s => s.t > e.t + 300 && (!s.on || s.text !== e.text));
                const end = Math.min(next ? next.t : Infinity, off ? off.t : Infinity);
                if (!isFinite(end)) { lines.push({ text: e.text.slice(0, 40), need: R.ms[i], stayed: 'still up' }); continue; }
                const stayed = Math.round(end - e.t);
                lines.push({ text: e.text.slice(0, 40), need: R.ms[i], stayed });
                /* a replacing line may come after the guide's hold time (only a level-up / clean world cuts in early); a quiet bubble must have had the full reading time */
                const min = next && next.t <= end + 1 ? Math.min(R.ms[i], R.hold[i + 1] || R.ms[i]) : R.ms[i];
                if (!e.user && stayed < min - 400) P.push('guide line up only ' + stayed + ' ms, needs ' + min + ': ' + e.text.slice(0, 60));
            }
            steps.guide = { lines: lines.length, sample: lines.slice(0, 8) };
            if (!R.ev.length) P.push('the guide said nothing inside ' + WORLD);
        } catch (e) { P.push('threw ' + e.message.slice(0, 200)); }
        if (errs.length) P.push('page errors: ' + errs.slice(0, 3).join(' | '));
        console.log(JSON.stringify({ view: v, ok: !P.length, problems: P, steps, blockedWrites: writes.length }));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    console.log(fail ? 'FAIL' : 'PASS');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
