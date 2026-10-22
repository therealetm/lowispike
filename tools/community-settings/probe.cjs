'use strict';
/* Probe for the Community bubble / long-press Settings / Community profile (21 Oct 2026).
   node tools/community-settings/probe.cjs [--root DIR | --url URL] [--views se,i13,ipad] [--out DIR] [--script FILE.js] [--wait MS]
   Boots the app with a local fixture session (production Supabase and every non-GET blocked, service workers off), waits for
   Home, then runs --script: the body of an async function with (page, shot, sleep, view, fail, ctx) in scope.
   shot(name) saves OUT/<view>-<name>.png; fail(msg) records a failure. Exit 0 = no failures and no page errors. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), OUT = arg('out', '/tmp/cs-shots');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 820, height: 1180 }, screen: { width: 820, height: 1180 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { se: ['webkit', 'iPhone SE'], i13: ['webkit', 'iPhone 13'], i15: ['webkit', 'iPhone 15'], px7: ['chromium', 'Pixel 7'], ipad: ['webkit', IPAD], se_c: ['chromium', { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], i13_c: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }] };
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01', tags: [] }, xp: 900, ledger: [], logs: [], saved: [] }));

  if (!sessionStorage.getItem('cs.keepTour')) localStorage.setItem('lowi.tutorial.v1', JSON.stringify({ v: 999, at: Date.now(), done: true }));
} catch (e) { }`;
(async () => {
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || ('http://127.0.0.1:' + srv.address().port + '/');
    const host = new URL(url).host;
    const body = arg('script', '') ? fs.readFileSync(arg('script'), 'utf8') : 'await shot("home");';
    const run = new (Object.getPrototypeOf(async function () { }).constructor)('page', 'shot', 'sleep', 'view', 'fail', 'ctx', body);
    fs.mkdirSync(OUT, { recursive: true });
    const fails = [];
    for (const v of arg('views', 'i13').split(',')) {
        const [eng, d] = VIEWS[v]; const dev = typeof d === 'string' ? pw.devices[d] : d;
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
        page.on('console', m => { if (m.text().startsWith('[cs]')) console.log(v, m.text()); });
        const fail = m => fails.push(v + ': ' + m);
        const shot = n => page.screenshot({ path: path.join(OUT, v + '-' + n + '.png') });
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => typeof window.goTab === 'function' && document.documentElement.classList.contains('wh-home') && document.getElementById('spBubble'), null, { timeout: 90000 });
            await sleep(+arg('wait', 5000));
            await run(page, shot, sleep, v, fail, ctx);
        } catch (e) { fail('threw ' + String(e && e.stack || e).slice(0, 400)); }
        errs.forEach(e => fail('page error ' + e));
        await browser.close();
    }
    if (srv) srv.close();
    console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
    process.exit(fails.length ? 1 : 0);
})();
