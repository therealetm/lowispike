/* LOWiSPIKE launch frame capture (28 Oct 2026, "only the animation, no white blink").
   Records the real compositor frames (Playwright video, about 25 per second) of the app opening, from the moment the page
   is asked for until Home has settled, and sorts every frame: white, plain dark, launch scene, or Home. Runs a fresh open
   (nothing cached, no service worker) and a reopen (service worker installed, the page comes from its cache).

   node tools/startup/launch-frames.cjs [--root DIR] [--engine webkit|chromium] [--device "iPhone 13"] [--scheme dark|light]
                                        [--theme dark|light] [--net none|4g] [--out /tmp/lf] [--keep]

   What a desktop browser cannot show: iOS's own startup picture (apple-touch-startup-image) before the page commits, and
   the exact moment iOS takes it away. What it does show: WebKit's own rule that a new page's layers stay frozen until the
   page is "visually non-empty" (see LocalFrameView::qualifiesAsVisuallyNonEmpty / WebPage::didStartPageTransition): the
   frames between the request and the first real paint show the previous page, here a white about:blank, exactly the
   empty web view an iPhone shows once its startup picture is gone. A white frame after the request = a white blink. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), crypto = require('crypto'), cp = require('child_process');
let pw; for (const p of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), '/tmp/pw/node_modules/playwright', 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), ENGINE = arg('engine', 'webkit'), DEVICE = arg('device', 'iPhone 13');
const SCHEME = arg('scheme', 'dark'), THEME = arg('theme', 'dark'), OUT = arg('out', '/tmp/launch-frames'), KEEP = A.includes('--keep');
const NET = { none: null, '4g': { rtt: 60, kbps: 9000 } }[arg('net', 'none')];
const FFMPEG = process.env.FFMPEG || (() => { try { return cp.execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim(); } catch (e) { return 'ffmpeg'; } })();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.m4a': 'audio/mp4', '.woff2': 'font/woff2' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = '/lowispike/';

function serve() {
    const cache = new Map();
    function body(f) {
        const st = fs.statSync(f), k = f + ':' + st.mtimeMs; let c = cache.get(k);
        if (!c) { const raw = fs.readFileSync(f), gz = /^(text|application\/(javascript|json|manifest))|svg/.test(TYPES[path.extname(f)] || '') ? zlib.gzipSync(raw, { level: 6 }) : null; c = { raw, gz, etag: '"' + crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16) + '"' }; cache.set(k, c); }
        return c;
    }
    return new Promise(r => {
        const s = http.createServer(async (q, res) => {
            if (NET) await sleep(NET.rtt);
            let u = decodeURIComponent(q.url.split('?')[0]);
            if (!u.startsWith(BASE)) { res.writeHead(404); res.end(); return; }
            u = u.slice(BASE.length - 1); if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            let c; try { c = body(f); } catch (e) { res.writeHead(404); res.end(); return; }
            const h = { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'max-age=600', ETag: c.etag };
            if (q.headers['if-none-match'] === c.etag) { res.writeHead(304, h); res.end(); return; }
            const gz = c.gz && /gzip/.test(q.headers['accept-encoding'] || ''); if (gz) h['Content-Encoding'] = 'gzip';
            const b = gz ? c.gz : c.raw; h['Content-Length'] = b.length; res.writeHead(200, h);
            if (!NET) { res.end(b); return; }
            const Bps = NET.kbps * 125; for (let i = 0; i < b.length; i += 16384) { res.write(b.subarray(i, i + 16384)); await sleep(16384 / Bps * 1000); } res.end();
        });
        s.listen(0, '127.0.0.1', () => r({ s, url: `http://127.0.0.1:${s.address().port}${BASE}` }));
    });
}

const INIT = (theme) => {
    try {
        const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
        if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Emmanuel', bday: '1990-08-01', tags: [] }, xp: 2400, ledger: [], logs: [], saved: [], settings: { lang: 'de' } }));
        localStorage.setItem('lowi.tutorial.done', '1'); localStorage.setItem('lowi.theme', theme);
    } catch (e) { }
    const b64 = o => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'), exp = Math.floor(Date.now() / 1000) + 30 * 86400, uid = '00000001-0000-4000-8000-000000000001';
    const user = { id: uid, aud: 'authenticated', role: 'authenticated', email: 'startup@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-09-01T00:00:00Z', is_anonymous: false };
    const session = { access_token: b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: uid, role: 'authenticated', aud: 'authenticated', exp, iat: exp - 3600, email: user.email }) + '.c2lt', refresh_token: 'x', token_type: 'bearer', expires_in: 30 * 86400, expires_at: exp, user };
    try { if (!localStorage.getItem('lowi.auth')) localStorage.setItem('lowi.auth', JSON.stringify(session)); } catch (e) { }
    try {
        const of = window.fetch; window.fetch = function (u, o) { const s = String(u && u.url || u); if (/supabase\.(co|in)|open(food|beauty)facts|api\.open-meteo|googleapis|gstatic/.test(s)) { const b = /\/auth\/v1\/user/.test(s) ? user : /\/auth\/v1\//.test(s) ? session : []; return Promise.resolve(new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } })); } return of.apply(this, arguments); };
        const OW = window.WebSocket; window.WebSocket = function (u) { if (/supabase/.test(String(u))) { return { readyState: 0, send() { }, close() { }, addEventListener() { }, removeEventListener() { } }; } return new OW(...arguments); };
    } catch (e) { }
    /* marks: when the boot class went away (Home shown) */
    const T = window.__lf = { bootOff: null, t0: performance.timeOrigin };
    (function tick() { const H = document.documentElement; if (H && document.body && T.bootOff == null && window.__LOWI_BOOT_T != null && !H.classList.contains('lw-boot')) T.bootOff = performance.now(); if (T.bootOff == null) setTimeout(tick, 16); })();
};

/* frames -> classes. Reads raw RGB frames from ffmpeg at a small size. */
function frames(webm, w, h) {
    const W = 60, H = Math.round(h / w * 60);
    const raw = cp.execFileSync(FFMPEG, ['-v', 'error', '-i', webm, '-vf', `scale=${W}:${H}:flags=area`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 30 });
    const n = Math.floor(raw.length / (W * H * 3)), out = [];
    const info = cp.spawnSync(FFMPEG, ['-i', webm], { encoding: 'utf8' }).stderr; const fps = +((info.match(/([\d.]+) fps/) || [])[1] || 25);
    for (let i = 0; i < n; i++) {
        let sum = 0, bright = 0, blue = 0, maxL = 0, mag = 0; const o = i * W * H * 3;
        for (let p = 0; p < W * H; p++) { const r = raw[o + p * 3], g = raw[o + p * 3 + 1], b = raw[o + p * 3 + 2], L = 0.2126 * r + 0.7152 * g + 0.0722 * b; sum += L; if (L > 200) bright++; if (b > r + 25 && b > 60) blue++; if (L > maxL) maxL = L; if (r > 200 && b > 200 && g < 60) mag++; }
        out.push({ i, t: Math.round(i / fps * 1000), mean: +(sum / (W * H)).toFixed(1), brightPct: +(bright / (W * H) * 100).toFixed(1), bluePct: +(blue / (W * H) * 100).toFixed(1), magPct: +(mag / (W * H) * 100).toFixed(1), maxL: Math.round(maxL) });
    }
    return { list: out, fps };
}

async function recordProfile(label, warm, srv, dev) {
    /* a persistent profile so the reopen really has the installed service worker and its cache */
    const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'lf-prof-'));
    const vdir = path.join(OUT, `${ENGINE}-${SCHEME}-${THEME}-${label}`); fs.rmSync(vdir, { recursive: true, force: true }); fs.mkdirSync(vdir, { recursive: true });
    const size = { width: dev.viewport.width, height: dev.viewport.height };
    const opts = Object.assign({}, dev, { colorScheme: SCHEME, serviceWorkers: 'allow' });
    if (ENGINE === 'chromium') opts.args = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
    if (warm) {
        const c0 = await pw[ENGINE].launchPersistentContext(prof, opts);
        await c0.addInitScript(INIT, THEME);
        const p0 = c0.pages()[0] || await c0.newPage();
        await p0.goto(srv.url, { waitUntil: 'load', timeout: 120000 });
        await p0.evaluate(() => Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 15000))])).catch(() => { });
        await p0.evaluate(async () => { for (let i = 0; i < 80; i++) { const ks = await caches.keys(); if (ks.length) { const c = await caches.open(ks.find(k => /updates/.test(k)) || ks[0]); if ((await c.keys()).length > 50) return; } await new Promise(r => setTimeout(r, 250)); } }).catch(() => { });
        await sleep(2500); await c0.close();
    }
    const ctx = await pw[ENGINE].launchPersistentContext(prof, Object.assign({}, opts, { recordVideo: { dir: vdir, size } }));
    await ctx.addInitScript(INIT, THEME);
    const page = ctx.pages()[0] || await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
    /* the page before ours is painted magenta: a frame that is still magenta after the request means WebKit has not shown
       anything of ours yet (its layers are frozen), which on an iPhone is the empty web view once the startup picture is gone */
    await page.setContent('<html style="background:#ff00ff;height:100%"><body></body></html>'); await sleep(700);
    const tGo = Date.now();
    await page.goto(srv.url, { waitUntil: 'commit', timeout: 120000 });
    const tCommit = Date.now();
    await page.waitForFunction(() => window.__lf && window.__lf.bootOff != null, null, { timeout: 60000, polling: 50 }).catch(() => { });
    const lf = await page.evaluate(() => Object.assign({}, window.__lf, { sw: !!navigator.serviceWorker.controller, nav: (n => ({ resp: Math.round(n.responseStart || 0), dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0) }))(performance.getEntriesByType('navigation')[0] || {}) })).catch(() => ({}));
    await sleep(1500);
    const vid = page.video(); await ctx.close(); const file = await vid.path();
    fs.rmSync(prof, { recursive: true, force: true });
    return { file, tGo, tCommit, lf, errs, size, vdir };
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = await serve();
    const dev = Object.assign({}, pw.devices[DEVICE]); delete dev.defaultBrowserType;
    const report = [];
    for (const [label, warm] of [['fresh', false], ['reopen', true]]) {
        const r = await recordProfile(label, warm, srv, dev);
        const { list, fps } = frames(r.file, r.size.width, r.size.height);
        /* the request moment = the first magenta frame (the marker page went up 700 ms before the request) */
        const firstMag = list.findIndex(f => f.magPct > 90); const goIdx = Math.max(0, firstMag);
        const after = list.slice(goIdx);
        const isMag = f => f.magPct > 50, isWhite = f => !isMag(f) && (f.brightPct > 20 || f.mean > 150);
        const firstOurs = after.findIndex(f => !isMag(f));
        /* drop the marker's own 700 ms before the request: frames are frozen-marker only once the request is out */
        const lead = Math.round(0.7 * fps), tail = after.slice(lead);
        const frozen = tail.filter(isMag), white = tail.filter(isWhite);
        const cls = f => isMag(f) ? 'M' : isWhite(f) ? 'W' : f.maxL < 30 ? 'k' : 'g';
        const strip = tail.map(cls).join('');
        report.push({ label, engine: ENGINE, scheme: SCHEME, theme: THEME, frames: tail.length, fps, frozenFrames: frozen.length, frozenMs: Math.round(frozen.length / fps * 1000), whiteFrames: white.length, strip, nav: r.lf.nav, homeShownAtMs: r.lf.bootOff != null ? Math.round(r.lf.bootOff) : null, sw: r.lf.sw, errs: r.errs.slice(0, 3), video: r.file });
        const R = report[report.length - 1];
        console.log(`${ENGINE} ${SCHEME}/${THEME} ${label}: frozen (nothing shown) ${R.frozenMs} ms, ${R.whiteFrames} white frames; strip ${strip}  (M nothing of ours yet, W white, k black, g launch/Home) home at ${R.homeShownAtMs} ms, nav ${JSON.stringify(R.nav)} sw ${R.sw} ${R.errs.join(' | ')}`);
        if (KEEP) { cp.execFileSync(FFMPEG, ['-v', 'error', '-y', '-i', r.file, '-vf', `fps=${Math.round(fps)},scale=78:-1,tile=16x8`, '-frames:v', '1', path.join(r.vdir, 'sheet.png')]); }
    }
    fs.writeFileSync(path.join(OUT, `report-${ENGINE}-${SCHEME}-${THEME}.json`), JSON.stringify(report, null, 1));
    srv.s.close();
    if (report.some(r => r.whiteFrames || r.frozenMs > 200)) process.exitCode = 2;
})().catch(e => { console.error(e); process.exit(1); });
