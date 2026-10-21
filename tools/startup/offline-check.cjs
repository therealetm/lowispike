/* LOWiSPIKE: does a warm open still work with no network, and with a network that never answers? (21 Oct 2026)
   node tools/startup/offline-check.cjs [--root DIR] [--engine chromium|webkit]
   1. first open online (service worker installs, files cached)
   2. server gone (connection refused): the app must open from the phone's copy
   3. server hangs (accepts, never answers): the app must still open, from the saved page, in about PAGE_WAIT + boot */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), '/tmp/pw/node_modules/playwright', 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), ENGINE = arg('engine', 'chromium');
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
let MODE = 'up';
const srv = http.createServer((q, res) => {
    if (MODE === 'hang') return; /* never answer */
    let u = decodeURIComponent(q.url.split('?')[0]).replace(/^\/lowispike/, ''); if (u === '/') u = '/index.html';
    fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(u)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' }); res.end(b); });
});
const INIT = () => {
    try {
        const b64 = o => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'), exp = Math.floor(Date.now() / 1000) + 30 * 86400, uid = '00000001-0000-4000-8000-000000000001';
        const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'offline@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, is_anonymous: false };
        if (!localStorage.getItem('lowi.auth')) localStorage.setItem('lowi.auth', JSON.stringify({ access_token: b64({ alg: 'HS256' }) + '.' + b64({ sub: uid, exp }) + '.c2lt', refresh_token: 'x', token_type: 'bearer', expires_in: 9e5, expires_at: exp, user }));
        localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1'); sessionStorage.setItem('lowi.a2hs.x', '1');
        const d = new Date(); localStorage.setItem('lowi.daily.seen', d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'));
        if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Emmanuel', bday: '1990-08-01', tags: [] }, xp: 2400, ledger: [], logs: [], saved: [], settings: { lang: 'en' } }));
        const of = window.fetch; window.fetch = function (u) { if (/supabase/.test(String(u && u.url || u))) return Promise.resolve(new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })); return of.apply(this, arguments); };
    } catch (e) { }
};
(async () => {
    await new Promise(r => srv.listen(0, '127.0.0.1', r));
    const url = `http://127.0.0.1:${srv.address().port}/lowispike/`;
    const b = await pw[ENGINE].launch({ args: ENGINE === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
    const dev = Object.assign({}, pw.devices['iPhone 13']); if (ENGINE !== 'webkit') delete dev.defaultBrowserType;
    const ctx = await b.newContext(Object.assign(dev, { serviceWorkers: 'allow' })); await ctx.addInitScript(INIT);
    const p = await ctx.newPage();
    const opened = async label => {
        const t0 = Date.now();
        const ok = await p.waitForFunction(() => window.__LOWI_BOOT_T != null && document.querySelectorAll('[data-orbit]').length >= 3 && !!(document.querySelector('meta[name="lowi-build"]') || {}).content, null, { timeout: 60000, polling: 200 }).then(() => true).catch(() => false);
        const info = await p.evaluate(() => ({ build: (document.querySelector('meta[name="lowi-build"]') || {}).content, sw: !!navigator.serviceWorker.controller, boot: window.__LOWI_BOOT_T, why: window.__LOWI_BOOT_DONE, ring: document.querySelectorAll('[data-orbit]').length })).catch(e => ({ err: String(e.message).slice(0, 120) }));
        console.log(label, ok ? 'OPENED' : 'FAILED', 'in', Date.now() - t0, 'ms', JSON.stringify(info));
        return ok;
    };
    await p.goto(url, { waitUntil: 'commit' }); await opened('online first open');
    await p.evaluate(async () => { await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 15000))]); for (let i = 0; i < 80; i++) { const ks = await caches.keys(); const k = ks.find(x => /updates/.test(x)); if (k && (await (await caches.open(k)).keys()).length > 200) return; await new Promise(r => setTimeout(r, 250)); } });
    await p.waitForTimeout(1500);
    let pass = true;
    MODE = 'down'; srv.closeAllConnections(); await new Promise(r => srv.close(r));
    await p.goto(url, { waitUntil: 'commit', timeout: 30000 }).catch(e => console.log('goto offline:', e.message.slice(0, 100)));
    pass = (await opened('server gone (offline)')) && pass;
    /* a server that takes the connection and never answers */
    MODE = 'hang'; await new Promise(r => srv.listen(+url.split(':')[2].split('/')[0], '127.0.0.1', r));
    await p.goto('about:blank');
    await p.goto(url, { waitUntil: 'commit', timeout: 30000 }).catch(e => console.log('goto hang:', e.message.slice(0, 100)));
    pass = (await opened('server hangs (lie-fi)')) && pass;
    console.log(pass ? 'PASS' : 'FAIL');
    await b.close(); srv.closeAllConnections(); srv.close(); process.exit(pass ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
