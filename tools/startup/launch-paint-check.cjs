/* LOWiSPIKE launch paint check (21 Oct 2026, "remove the launch splash" + "it's white for 1 second").
   Opens the app in a fresh browser (nothing cached, the way a first launch or an evicted cache looks) at phone and iPad sizes,
   in dark mode, and holds the page download after the first HEAD bytes for STALL ms, the way a slow network does at launch.
   It screenshots (1) during that stall, (2) while the app is still getting ready (html.lw-boot), (3) the finished app,
   and fails when any of them is white/bright, when a launch-screen element is ever added, or on page errors.

   node tools/startup/launch-paint-check.cjs [--root DIR] [--engines webkit,chromium] [--devices "iPhone SE,iPhone 13,iPad (gen 7)"]
                                             [--head 1500] [--stall 1500] [--shots DIR]
   Simulated browser only: it is not a physical iPhone, and it cannot show iOS's own startup image (only a home-screen app does). */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib');
let pw; for (const p of [process.env.PW, '/tmp/pw/node_modules/playwright', path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..')));
const ENGINES = arg('engines', 'webkit,chromium').split(','), DEVICES = arg('devices', 'iPhone SE,iPhone 13,iPad (gen 7)').split(',');
const HEAD = +arg('head', 1500), STALL = +arg('stall', 1500), SHOTS = arg('shots', '');
/* apple-ui.js (which loads the companion files) is held back HOLD ms, so the app stays in its getting-ready state long
   enough to be screenshotted while the page is idle (a busy main thread delays screenshots past the reveal) */
const HOLD = +arg('hold', 2500);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE = '/lowispike/';

function serve() {
    return new Promise(r => {
        const s = http.createServer(async (q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]);
            if (!u.startsWith(BASE)) { res.writeHead(404); res.end(); return; }
            u = u.slice(BASE.length - 1); const page = u === '/' || u === '/index.html'; if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            let b; try { b = fs.readFileSync(f); } catch (e) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
            if (page && q.headers['sec-fetch-dest'] !== 'serviceworker' && !/lowi-sw/.test(q.headers['service-worker'] || '')) {
                res.write(b.subarray(0, HEAD)); await sleep(STALL);
                for (let i = HEAD; i < b.length; i += 65536) { if (!res.write(b.subarray(i, i + 65536))) await new Promise(r2 => res.once('drain', r2)); }
                res.end(); return;
            }
            if (HOLD && /^\/apple-ui\.js$/.test(u)) await sleep(HOLD);
            res.end(b);
        });
        s.listen(0, '127.0.0.1', () => r({ s, url: `http://127.0.0.1:${s.address().port}${BASE}` }));
    });
}

/* the returning-user setup and backend stubs from measure.cjs, so the check opens the real Home */
const msrc = fs.readFileSync(path.join(__dirname, 'measure.cjs'), 'utf8');
const INIT_SRC = msrc.slice(msrc.indexOf('const INIT = () => {') + 'const INIT = '.length, msrc.indexOf('\n};\n', msrc.indexOf('const INIT = () => {')) + 2);
const PROBE = `(() => {
  const P = window.__paint = { splash: [], gateSeen: false, gateBg: [] };
  const bad = n => n && n.nodeType === 1 && (n.id === 'lwBoot' || /(^|\\s)lwb-/.test(typeof n.className === 'string' ? n.className : '') || (n.parentNode === document.documentElement && n.tagName !== 'BODY' && n.tagName !== 'HEAD' && /LOW\\s*i\\s*SPIKE/i.test(n.textContent || '')));
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (bad(n)) P.splash.push((n.id || n.className || n.tagName) + '@' + Math.round(performance.now())); })
    .observe(document, { childList: true, subtree: true });
  const attach = () => { if (P.att || !document.documentElement) return; P.att = 1;
    new MutationObserver(() => { const on = document.documentElement.classList.contains('lw-boot'); if (on) P.gateSeen = true; else if (P.gateSeen && !P.revealExact) P.revealExact = Date.now(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] }); };
  attach(); new MutationObserver(attach).observe(document, { childList: true });
  (function f(){ const H = document.documentElement; if (H && H.classList.contains('lw-boot')) { P.gateSeen = true; const c = getComputedStyle(H).backgroundColor; if (P.gateBg.indexOf(c) < 0) P.gateBg.push(c);
      const b = document.body; if (b) { P.gateFrames = (P.gateFrames || 0) + 1; if (getComputedStyle(b).opacity !== '0') P.gateBodyShown = (P.gateBodyShown || 0) + 1; } }
    else if (P.gateSeen && !P.revealAt) P.revealAt = Date.now();
    if (!P.revealAt) requestAnimationFrame(f); })();
})();`;

function readPng(b) {
    let o = 8, w, h, type; const idat = [];
    while (o < b.length) { const len = b.readUInt32BE(o), t = b.slice(o + 4, o + 8).toString(), d = b.slice(o + 8, o + 8 + len); if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); type = d[9]; } if (t === 'IDAT') idat.push(d); if (t === 'IEND') break; o += 12 + len; }
    const bpp = type === 6 ? 4 : 3, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(stride * h);
    for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], L = y * (stride + 1) + 1;
        for (let x = 0; x < stride; x++) { const a = x >= bpp ? px[y * stride + x - bpp] : 0, up = y ? px[(y - 1) * stride + x] : 0, c = (x >= bpp && y) ? px[(y - 1) * stride + x - bpp] : 0; let v = raw[L + x];
            if (f === 1) v += a; else if (f === 2) v += up; else if (f === 3) v += (a + up) >> 1; else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : pb <= pc ? up : c; }
            px[y * stride + x] = v & 255; } }
    return { w, h, bpp, px };
}
/* share of pixels that are bright (avg channel > 200, i.e. white-ish) and that are not dark (avg > 40), plus the mean colour */
function stats(buf) {
    const { px, bpp } = readPng(buf); let n = 0, bright = 0, lit = 0, R = 0, G = 0, B = 0;
    for (let i = 0; i < px.length; i += bpp) { const r = px[i], g = px[i + 1], b = px[i + 2], m = (r + g + b) / 3; n++; R += r; G += g; B += b; if (m > 200) bright++; if (m > 40) lit++; }
    return { bright: +(bright / n * 100).toFixed(2), lit: +(lit / n * 100).toFixed(2), mean: [Math.round(R / n), Math.round(G / n), Math.round(B / n)] };
}

async function one(browser, engine, srv, name) {
    const dev = Object.assign({}, pw.devices[name]); if (engine !== 'webkit') delete dev.defaultBrowserType;
    const ctx = await browser.newContext(Object.assign(dev, { colorScheme: 'dark', serviceWorkers: 'allow' }));
    await ctx.addInitScript({ content: '(' + INIT_SRC + ')();' + PROBE });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
    const tag = (engine + '-' + name).replace(/[^\w-]+/g, '_'), out = { engine, device: name };
    const shot = async (k) => { const b = await page.screenshot({ timeout: 20000 }); if (SHOTS) fs.writeFileSync(path.join(SHOTS, tag + '-' + k + '.png'), b); return stats(b); };
    await page.goto(srv.url, { waitUntil: 'commit', timeout: 60000 });
    await sleep(Math.min(700, STALL / 2));
    out.stall = await shot('1-stall');
    /* while the app is still getting ready: screenshot every ~200 ms until the app is up (the page's main thread is busy
       then, so this is taken from outside); frames taken before the reveal must be plain dark */
    const frames = [];
    for (let i = 0; i < 40; i++) {
        let st; try { st = await shot('2-gate-' + i); } catch (e) { break; } const t = Date.now();
        frames.push({ t, st });
        const done = await page.evaluate(() => window.__paint && window.__paint.revealAt).catch(() => null);
        if (done) break; await sleep(150);
    }
    await page.waitForFunction(() => window.__LOWI_BOOT_T != null && document.querySelectorAll('[data-orbit]').length >= 3, null, { timeout: 60000, polling: 200 }).catch(() => { out.timeout = true; });
    await sleep(800);
    out.app = await shot('3-app');
    out.probe = await page.evaluate(() => Object.assign({ build: (document.querySelector('meta[name="lowi-build"]') || {}).content, why: window.__LOWI_BOOT_DONE, bootMs: window.__LOWI_BOOT_T, lwBootNow: !!document.getElementById('lwBoot') }, window.__paint));
    out.errs = errs;
    const pre = frames.filter(f => (out.probe.revealExact || out.probe.revealAt) && f.t < (out.probe.revealExact || out.probe.revealAt));
    out.gate = { frames: pre.length, maxBright: Math.max(0, ...pre.map(f => f.st.bright)), maxLit: Math.max(0, ...pre.map(f => f.st.lit)), means: pre.slice(0, 4).map(f => f.st.mean) };
    await ctx.close();
    out.gateBgDark = out.probe.gateBg.every(c => { const m = (c.match(/\d+/g) || []).slice(0, 3).map(Number); return m.length === 3 && Math.max(...m) < 40; });
    out.ok = out.gateBgDark && !out.probe.gateBodyShown && !out.timeout && out.stall.bright < 1 && out.gate.maxBright < 1 && out.gate.maxLit < 1 && !out.probe.splash.length && !out.probe.lwBootNow && !errs.length;
    return out;
}

(async () => {
    if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
    const srv = await serve(); const all = [];
    for (const engine of ENGINES) {
        const browser = await pw[engine].launch({ args: engine === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
        for (const d of DEVICES) {
            const r = await one(browser, engine, srv, d.trim()).catch(e => ({ engine, device: d, ok: false, error: String(e.message).slice(0, 200) }));
            all.push(r); console.log(JSON.stringify(r));
        }
        await browser.close();
    }
    srv.s.close();
    const pass = all.filter(r => r.ok).length;
    console.log(`launch paint: ${pass}/${all.length} passed (root ${ROOT}, first ${HEAD} bytes then a ${STALL} ms stall, apple-ui.js held ${HOLD} ms)`);
    process.exit(pass === all.length ? 0 : 1);
})();
