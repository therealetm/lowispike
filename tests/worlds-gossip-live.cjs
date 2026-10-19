'use strict';
/* Browser check (Oct 19, 2026, worlds playtest W-004): a cell guide gossips about another guide once a visit, after a lesson,
   in a readable bubble on screen and off the joystick, and a language switch re-says the same gossip in the new language.
   Seeded returning visitor whose liver lessons are all told and confirmed: the arrival says welcome back + today's line, and the
   next teaching slot has nothing new left, so it is gossip.
     node tests/worlds-gossip-live.cjs [--root DIR | --url URL] [--views iphone13_webkit,iphone_chromium]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/worlds-gossip-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD], ipad_chromium: ['chromium', IPAD] };
/* the same local fixture session the Home ring check uses (no account, no network) */
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];


const SEED = JSON.stringify({ v: 1, met: { liver: 1, heart: 1, lung: 1, brain: 1, pancreas: 1, gut: 1, muscle: 1 }, lastBack: -1, told: { liver: [1, 2, 3, 4, 5] }, ok: { liver: [1, 2, 3, 4, 5] }, since: { liver: 0 } });
const C = require('../region-pals-core.js');
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host, WORLD = 'liver';
    let fail = 0;
    for (const v of arg('views', 'iphone13_webkit').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        await ctx.addInitScript(seed => { try { localStorage.setItem('lowi.guides.v1', seed); } catch (e) { } window.__rp = []; window.addEventListener('lowi:region-pal', e => window.__rp.push({ t: Math.round(performance.now()), line: e.detail.line, kind: e.detail.kind, text: e.detail.text })); }, SEED);
        const page = await ctx.newPage(), errs = [], P = [], steps = { view: v };
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight && window.LowiRegionPals, null, { timeout: 150000 }).catch(() => { });
            await sleep(+arg('wait', 5000));
            steps.build = await page.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
            await page.evaluate(w => window.LowiWorldRegions.travel(w), WORLD);
            await page.waitForFunction(() => window.__rp.some(x => x.kind === 'gossip'), null, { timeout: +arg('gossipMs', 300000), polling: 250 }).catch(() => { });
            const all = await page.evaluate(() => window.__rp.slice());
            steps.lines = all.map(x => x.kind + ' ' + x.line + ' ' + x.text.slice(0, 60));
            const g = all.filter(x => x.kind === 'gossip');
            if (!g.length) { P.push('no gossip in the visit'); throw new Error('skip'); }
            if (g.length > 1) P.push('more than one gossip in a visit');
            const row = C.GOSSIP.liver.find(r => r[0] === g[0].text);
            if (!row) P.push('gossip text is not a liver gossip line: ' + g[0].text);
            const iBefore = all.indexOf(g[0]);
            if (!all.slice(0, iBefore).some(x => x.kind === 'fact')) P.push('gossip came before any lesson in the visit');
            if (iBefore > 0 && all[iBefore - 1].kind === 'ask') P.push('gossip right after a question');
            await sleep(1000);
            const geo = await page.evaluate(() => { const p = document.getElementById('rpPal'), b = p && p.querySelector('.rp-say'), pad = document.getElementById('whPad'); const R = e => { if (!e) return null; const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom }; }; const s = R(b), j = R(pad); const ov = s && j && pad && +getComputedStyle(pad).opacity > 0.05 ? Math.max(0, Math.min(s.r, j.r) - Math.max(s.l, j.l)) * Math.max(0, Math.min(s.b, j.b) - Math.max(s.t, j.t)) : 0; return { s, ov, w: innerWidth, h: innerHeight, talk: !!(p && p.classList.contains('rp-talk')), fs: b ? parseFloat(getComputedStyle(b.querySelector('.rp-tx')).fontSize) : 0 }; });
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-gossip.png` });
            steps.geo = geo;
            if (!geo.talk || !geo.s) P.push('gossip bubble not showing a second later');
            else {
                if (geo.s.l < 0 || geo.s.t < 0 || geo.s.r > geo.w || geo.s.b > geo.h) P.push('gossip bubble off screen ' + JSON.stringify(geo.s));
                if (geo.ov > 0) P.push('gossip bubble on the joystick ' + geo.ov);
                if (geo.fs < 13) P.push('gossip text too small ' + geo.fs);
            }
            const n0 = await page.evaluate(() => window.__rp.length);
            await page.evaluate(() => window.LowiLang.set('es'));
            await sleep(2000);
            const es = await page.evaluate(() => { const t = document.querySelector('#rpPal .rp-tx'); return t ? t.textContent : ''; });
            const after = await page.evaluate(n => window.__rp.slice(n), n0);
            steps.es = es.slice(0, 80);
            if (row && es !== row[2]) P.push('after switching to Spanish it is not the same gossip in Spanish: ' + es.slice(0, 80));
            if (after.some(x => x.kind !== 'gossip')) P.push('other lines after the switch: ' + JSON.stringify(after.map(x => x.kind)));
            const mem = await page.evaluate(() => JSON.parse(localStorage.getItem('lowi.guides.v1') || '{}'));
            if (!(mem.gos && mem.gos.liver && mem.gos.liver.length)) P.push('gossip not remembered on the device');
        } catch (e) { if (e.message !== 'skip') P.push('threw ' + e.message.slice(0, 200)); }
        if (errs.length) P.push('page errors: ' + errs.join(' / '));
        console.log(JSON.stringify(Object.assign(steps, { problems: P })));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})();
