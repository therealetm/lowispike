'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/guide-intro-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD], ipad_chromium: ['chromium', IPAD] };
/* the same local fixture session the Home ring check uses (no account, no network) */
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];

/* Browser check: a cell guide introduces itself only the first time (Oct 18 2026, Emmanuel: "They introduce themselves once,
   obviously, the first time seeing them. But the rest of the time it's 'Oh, you're back'..."). Per view, in one fresh browser profile:
     visit 1: steer into the world (default liver): the guide's first line is its hello, and lowi.guides.v1 remembers the meeting
     visit 2 (page reloaded, a new session): no hello; the first line starts with a welcome-back line from the pool
     visit 3 (reloaded again): again no hello, and a different welcome-back line than visit 2
   Screenshot of visit 2: OUT/TAG-<view>-back.png. Production Supabase and every non-GET request are blocked.
     node tests/guide-intro-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--tag after]
       [--views iphone_chromium,iphone13_webkit,ipad_landscape_webkit] [--world liver]
   Exit 0 = pass. */
const C = require('../region-pals-core.js');
const HELLO = /^(Hi, I\u2019m|Hallo, ich bin|Hola, soy) /;
const backOf = t => { for (const L of C.BACK) for (let i = 0; i < L.length; i++) if (t.indexOf(L[i]) === 0) return i; return -1; };
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
        await ctx.addInitScript(() => { window.__rp = []; window.addEventListener('lowi:region-pal', e => window.__rp.push({ t: performance.now(), text: e.detail.text, user: e.detail.user })); });
        const page = await ctx.newPage(), errs = [], P = [], steps = { visits: [] };
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        async function visit(n) {
            if (n === 1) await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            else await page.reload({ waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight && window.LowiRegionPals, null, { timeout: 90000 }).catch(() => { });
            await sleep(+arg('wait', 5000));
            await page.evaluate(w => window.LowiWorldRegions.travel(w), WORLD);
            await page.waitForFunction(w => { try { return window.LowiWorldRegions.current() === w && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, WORLD, { timeout: 60000 });
            await page.waitForFunction(() => window.__rp.length > 0, null, { timeout: 30000 }).catch(() => { });
            await sleep(1500);
            if (n === 2) await page.screenshot({ path: `${OUT}/${TAG}-${v}-back.png` });
            const r = await page.evaluate(() => ({ first: (window.__rp[0] || {}).text || '', all: window.__rp.map(x => x.text), mem: localStorage.getItem('lowi.guides.v1') }));
            r.back = backOf(r.first); r.hello = HELLO.test(r.first);
            r.hellos = r.all.filter(t => HELLO.test(t)).length;
            steps.visits.push({ n, first: r.first.slice(0, 90), back: r.back, hellos: r.hellos, mem: r.mem });
            return r;
        }
        try {
            const v1 = await visit(1);
            steps.build = await page.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
            if (!v1.hello) P.push('visit 1: the first line is not the hello: ' + v1.first);
            let m = null; try { m = JSON.parse(v1.mem || 'null'); } catch (e) { }
            if (!(m && m.met && m.met[WORLD])) P.push('visit 1: the meeting was not remembered (lowi.guides.v1 = ' + v1.mem + ')');
            const v2 = await visit(2);
            if (v2.hellos) P.push('visit 2: said hello again: ' + v2.first);
            if (v2.back < 0) P.push('visit 2: did not open with a welcome-back line: ' + v2.first);
            const v3 = await visit(3);
            if (v3.hellos) P.push('visit 3: said hello again: ' + v3.first);
            if (v3.back < 0) P.push('visit 3: did not open with a welcome-back line: ' + v3.first);
            else if (v3.back === v2.back) P.push('visit 3: same welcome-back line twice in a row: ' + v3.first);
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
