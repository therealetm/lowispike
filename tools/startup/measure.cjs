/* LOWiSPIKE startup timer (21 Oct 2026, "make the app open instantly").
   Times a cold open (nothing cached) and a warm open (service worker installed, files cached) of the real app, served from a
   local folder the way GitHub Pages serves it (gzip, ETag, max-age=600, under /lowispike/), optionally over a throttled line
   (round trip + shared bandwidth, done in the server so WebKit is throttled too) and a throttled CPU (Chromium only).

   node tools/startup/measure.cjs [--root DIR] [--engine webkit|chromium] [--device "iPhone 13"] [--net none|4g|slow4g]
                                  [--cpu 1|4] [--runs 3] [--json out.json]

   "Usable Home" = the launch screen is gone, Home's ring controls are on screen, they have stopped moving (250 ms still)
   and the camera is not in a zoom animation. Nothing goes to the real backend: *.supabase.co is answered with an empty 200
   by the page itself (fetch/WebSocket stubs), every other foreign host is not used at boot. No page.route (it turns off the
   HTTP cache, which a warm open needs). */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), crypto = require('crypto');
let pw; for (const p of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), '/tmp/pw/node_modules/playwright', 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), ENGINE = arg('engine', 'webkit'), DEVICE = arg('device', 'iPhone 13');
const NET = { none: null, '4g': { rtt: 60, kbps: 9000 }, slow4g: { rtt: 150, kbps: 1600 } }[arg('net', 'none')];
const CPU = +arg('cpu', 1), RUNS = +arg('runs', 3), OUT = arg('json', '');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.m4a': 'audio/mp4', '.woff2': 'font/woff2' };
const dbg = (...a) => { if (process.env.DBG) console.log('[dbg]', ...a); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = '/lowispike/';

function serve() {
    let free = 0; const stats = { reqs: 0, bytes: 0, n304: 0, paths: [] };
    const cache = new Map();
    function body(f) {
        const st = fs.statSync(f), k = f + ':' + st.mtimeMs; let c = cache.get(k);
        if (!c) { const raw = fs.readFileSync(f), gz = /^(text|application\/(javascript|json|manifest))|svg/.test(TYPES[path.extname(f)] || '') ? zlib.gzipSync(raw, { level: 6 }) : null; c = { raw, gz, etag: '"' + crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16) + '"' }; cache.set(k, c); }
        return c;
    }
    async function send(res, buf) {
        if (!NET) { res.end(buf); return; }
        const CH = 16384, Bps = NET.kbps * 1000 / 8;
        for (let i = 0; i < buf.length; i += CH) {
            const n = Math.min(CH, buf.length - i), now = Date.now(), at = Math.max(now, free); free = at + n / Bps * 1000;
            if (free - now > 1) await sleep(free - now);
            if (!res.write(buf.subarray(i, i + n))) await new Promise(r => res.once('drain', r));
        }
        res.end();
    }
    return new Promise(r => {
        const s = http.createServer(async (q, res) => {
            stats.reqs++; stats.paths.push(q.url.split('?')[0].replace(BASE, '') + (/[?&]v=/.test(q.url) ? '?v' : ''));
            if (NET) await sleep(NET.rtt);
            let u = decodeURIComponent(q.url.split('?')[0]);
            if (!u.startsWith(BASE)) { res.writeHead(404); res.end(); return; }
            u = u.slice(BASE.length - 1); if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            let c; try { c = body(f); } catch (e) { res.writeHead(404); res.end(); return; }
            const h = { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ETag: c.etag };
            if (q.headers['if-none-match'] === c.etag) { stats.n304++; res.writeHead(304, h); res.end(); return; }
            const gz = c.gz && /gzip/.test(q.headers['accept-encoding'] || ''); if (gz) h['Content-Encoding'] = 'gzip';
            const b = gz ? c.gz : c.raw; h['Content-Length'] = b.length; stats.bytes += b.length;
            res.writeHead(200, h); await send(res, b);
        });
        s.listen(0, '127.0.0.1', () => r({ s, stats, url: `http://127.0.0.1:${s.address().port}${BASE}` }));
    });
}

/* runs in the page before anything else: a returning user (setup done, today's cards seen), the backend stubbed, and the probe */
const INIT = () => {
    try {
        const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
        if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Emmanuel', bday: '1990-08-01', tags: [] }, xp: 2400, ledger: [], logs: [], saved: [], settings: { lang: 'en' } }));
        localStorage.setItem('lowi.tutorial.done', '1');
    } catch (e) { }
    /* a signed-in account (the app has no guest mode): a fake session the stubbed backend below accepts */
    const b64 = o => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'), exp = Math.floor(Date.now() / 1000) + 30 * 86400, uid = '00000001-0000-4000-8000-000000000001';
    const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'startup@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-09-01T00:00:00Z', is_anonymous: false };
    const session = { access_token: b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: uid, role: 'authenticated', aud: 'authenticated', exp, iat: exp - 3600, email: user.email }) + '.c2lt', refresh_token: 'x', token_type: 'bearer', expires_in: 30 * 86400, expires_at: exp, user };
    try { if (!localStorage.getItem('lowi.auth')) localStorage.setItem('lowi.auth', JSON.stringify(session)); } catch (e) { }
    try {
        const of = window.fetch; window.fetch = function (u, o) { const s = String(u && u.url || u); if (/supabase\.(co|in)|open(food|beauty)facts|api\.open-meteo|googleapis|gstatic/.test(s)) { const b = /\/auth\/v1\/user/.test(s) ? user : /\/auth\/v1\//.test(s) ? session : []; return Promise.resolve(new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })); } return of.apply(this, arguments); };
        const OW = window.WebSocket; window.WebSocket = function (u) { if (/supabase/.test(String(u))) { const f = { readyState: 0, send() { }, close() { }, addEventListener() { }, removeEventListener() { } }; return f; } return new OW(...arguments); };
    } catch (e) { }
    const T = window.__startT = { boot: null, world: null, ringStable: null, camRest: null, introRan: false, firstRing: null };
    let last = '', stillSince = null;
    function tick() {
        const now = performance.now(), H = document.documentElement;
        if (!H || !document.body) { setTimeout(tick, 30); return; }
        if (T.boot == null && window.__LOWI_BOOT_T != null) T.boot = window.__LOWI_BOOT_T;
        if (T.world == null && H.classList.contains('wh-world-live')) T.world = now;
        try { const st = window.LowiWorldHome && window.LowiWorldHome.state; if (st && st.zoomAnim) T.introRan = true; } catch (e) { }
        const els = [...document.querySelectorAll('[data-orbit]')].filter(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > 0.5; });
        if (els.length >= 3 && T.firstRing == null) T.firstRing = now;
        const sig = els.length >= 3 ? els.map(e => { const r = e.getBoundingClientRect(); return Math.round(r.x) + ',' + Math.round(r.y); }).join(';') : '';
        let zooming = false; try { const st = window.LowiWorldHome && window.LowiWorldHome.state; zooming = !!(st && (st.zoomAnim || st.pull)); } catch (e) { }
        const ok = sig && !zooming && T.boot != null && !H.classList.contains('lw-boot');
        if (ok && sig === last) { if (stillSince == null) stillSince = now; } else stillSince = ok ? now : null;
        last = sig;
        if (T.ringStable == null && stillSince != null && now - stillSince >= 250) T.ringStable = stillSince;
        try { const r = window.LowiWorldHome && window.LowiWorldHome.rig && window.LowiWorldHome.rig(); const st = window.LowiWorldHome.state; if (T.camRest == null && r && r.homeRest && T.world != null && st && st.restIntro && Math.abs(r.dist - r.homeRest) < r.homeRest * 0.01 && !zooming && T.boot != null) T.camRest = now; } catch (e) { }
        if (T.ringStable == null || T.camRest == null) setTimeout(tick, 30);
    }
    setTimeout(tick, 0);
};

async function one(browser, srv, dev, warm) {
    const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'allow' }));
    await ctx.addInitScript(INIT);
    let page0 = null;
    const go = async (label) => {
        /* the warm open reuses the tab (a fresh tab after closing one kills some headless contexts): same profile, same caches */
        const page = page0 || (page0 = await ctx.newPage());
        if (!page.__cdp && ENGINE === 'chromium' && CPU > 1) { page.__cdp = await ctx.newCDPSession(page); await page.__cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU }); }
        const errs = []; const onErr = e => errs.push(String(e.message).slice(0, 160)); page.removeAllListeners('pageerror'); page.on('pageerror', onErr);
        const b0 = srv.stats.bytes, r0 = srv.stats.reqs, n0 = srv.stats.n304, p0 = srv.stats.paths.length;
        dbg(label, 'goto'); await page.goto(srv.url, { waitUntil: 'commit', timeout: 120000 }); dbg(label, 'committed');
        const t = await page.waitForFunction(() => { const T = window.__startT; return T && T.ringStable != null && T.camRest != null ? T : null; }, null, { timeout: 90000, polling: 200 }).then(h => h.jsonValue()).catch(async () => ({ timeout: true, partial: await page.evaluate(() => window.__startT).catch(() => null) }));
        const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0] || {}, p = performance.getEntriesByName('first-contentful-paint')[0]; return { resp: Math.round(n.responseStart || 0), html: Math.round(n.responseEnd || 0), dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0), fcp: p ? Math.round(p.startTime) : null, sw: !!navigator.serviceWorker.controller }; }).catch(() => ({}));
        const res = Object.assign({ label }, t, nav, { netBytes: srv.stats.bytes - b0, netReqs: srv.stats.reqs - r0, n304: srv.stats.n304 - n0, errs: errs.slice(0, 3) });
        if (label === 'warm') res.netPaths = srv.stats.paths.slice(p0, p0 + 40);
        if (!t.timeout) res.usable = Math.round(Math.max(t.boot, t.ringStable, t.camRest));
        return { page, res };
    };
    dbg('ctx ready'); const cold = await go('cold'); dbg('cold done', JSON.stringify(cold.res).slice(0, 300));
    if (!warm) { await ctx.close(); return cold.res; }
    /* let the service worker install and fill its cache, then open again in a new page of the same browser profile */
    await cold.page.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 15000))])).catch(() => { });
    await cold.page.evaluate(async () => { for (let i = 0; i < 80; i++) { const ks = await caches.keys(); if (ks.length) { const c = await caches.open(ks.find(k => /updates/.test(k)) || ks[0]); if ((await c.keys()).length > 50) return; } await new Promise(r => setTimeout(r, 250)); } }).catch(() => { });
    await sleep(1500);
    await cold.page.goto('about:blank').catch(() => { });
    await sleep(500);
    const w = await go('warm');
    await ctx.close();
    return [cold.res, w.res];
}

(async () => {
    const srv = await serve();
    const browser = await pw[ENGINE].launch({ args: ENGINE === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
    const dev = Object.assign({}, pw.devices[DEVICE]); if (ENGINE !== 'webkit') { delete dev.defaultBrowserType; }
    const all = { cold: [], warm: [] };
    for (let i = 0; i < RUNS; i++) {
        const [c, w] = await one(browser, srv, dev, true);
        all.cold.push(c); all.warm.push(w);
        console.log(`run ${i + 1}: cold usable ${c.usable}ms (boot ${c.boot && Math.round(c.boot)}, html ${c.html}, dcl ${c.dcl}, intro ${c.introRan}) ${c.netBytes}B/${c.netReqs}req | warm usable ${w.usable}ms (boot ${w.boot && Math.round(w.boot)}, html ${w.html}, sw ${w.sw}, intro ${w.introRan}) ${w.netBytes}B/${w.netReqs}req/${w.n304}x304 ${c.timeout || w.timeout ? 'TIMEOUT ' + JSON.stringify(c.partial || w.partial) : ''} ${(c.errs || []).concat(w.errs || []).join(' | ')}`);
        if (process.env.PATHS) console.log('  warm network requests:', (w.netPaths || []).join(' '));
    }
    const med = a => { const v = a.filter(x => x != null).sort((x, y) => x - y); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
    const sum = k => ({ usable: med(all[k].map(x => x.usable)), boot: med(all[k].map(x => x.boot && Math.round(x.boot))), html: med(all[k].map(x => x.html)), dcl: med(all[k].map(x => x.dcl)), bytes: med(all[k].map(x => x.netBytes)) });
    const out = { engine: ENGINE, device: DEVICE, net: arg('net', 'none'), cpu: CPU, root: ROOT, cold: sum('cold'), warm: sum('warm'), runs: all };
    console.log('MEDIAN', JSON.stringify({ engine: ENGINE, device: DEVICE, net: out.net, cpu: CPU, cold: out.cold, warm: out.warm }));
    if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
    await browser.close(); srv.s.close();
})().catch(e => { console.error(e); process.exit(1); });
