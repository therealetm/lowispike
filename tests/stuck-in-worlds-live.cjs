'use strict';
/* Browser check: never stuck inside a world (Oct 18 2026, ~19:40 CEST, Emmanuel on his iPhone, live 20261018-191027:
   "When I enter a world, the steering wheel disappears", then "literally stuck").
   Per view: Home shows the joystick; enter a world the way the World map does (LowiWorldRegions.travel, Misty joins you inside);
   once Misty is inside:
     - the joystick (#whPad) is on screen, opaque, takes touches (it is the top element at its centre)
     - dragging it (real pointer input) moves Misty
     - the World map stick (#whHud .wh-zoom) is on screen and takes touches; tapping it leaves the world (back in Home's own
       world, html no longer wh-away), tapping it again brings you back to Misty: the ring Home with the joystick and Scan
   Screenshot of the joystick inside the world: OUT/TAG-<view>-inside.png. Production Supabase and every non-GET request are blocked.
     node tests/stuck-in-worlds-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--tag after]
       [--views iphone_chromium,iphone13_webkit] [--world liver] [--dpr 1]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/stuck-worlds-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD], ipad_chromium: ['chromium', IPAD] };
/* the same local fixture session the Home ring check uses (no account, no network) */
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];

/* in the page: is this control really there for a finger? */
function usable(sel) {
    const e = document.querySelector(sel); if (!e) return { ok: false, why: 'missing' };
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    const o = { op: +cs.opacity, pe: cs.pointerEvents, disp: cs.display, vis: cs.visibility, r: [r.left, r.top, r.width, r.height].map(Math.round) };
    let p = e.parentElement, dim = 1; while (p && p !== document.documentElement) { const c = getComputedStyle(p); if (c.display === 'none' || c.visibility === 'hidden') dim = 0; dim *= +c.opacity; p = p.parentElement; }
    o.dim = +dim.toFixed(2);
    const on = r.width > 10 && r.height > 10 && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight;
    let top = null; if (on) { const t = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))); top = t ? (t.id || String(t.className || t.tagName)).slice(0, 40) : null; o.topIs = !!(t && (t === e || e.contains(t))); }
    o.top = top; o.ok = on && o.op > 0.9 && o.dim > 0.9 && o.pe !== 'none' && o.disp !== 'none' && o.vis !== 'hidden' && !!o.topIs;
    return o;
}
const snap = () => ({ cls: document.documentElement.className.split(/\s+/).filter(c => /^(o8|wh-away|wh-mapview|mf-|bwr-|lw-clean|lw-|wh-padfly)/.test(c)).join(' '), cur: (() => { try { return window.LowiWorldRegions.current(); } catch (e) { return '?'; } })(), mf: (() => { try { const s = window.LowiMistyFlight.state(); return { st: s.st, p: s.p }; } catch (e) { return null; } })(), pad: (() => { try { return document.getElementById('whPad').dataset.mode; } catch (e) { return null; } })() });

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host, WORLD = arg('world', 'liver');
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
        if (arg('dpr', '')) dev.deviceScaleFactor = +arg('dpr', '');
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        const writes = [];
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (q.method() !== 'GET') writes.push(q.method() + ' ' + u.host); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [], P = [], steps = {};
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight, null, { timeout: 90000 }).catch(() => { });
            await sleep(+arg('wait', 6000));
            steps.build = await page.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
            /* 1. Home: the joystick is there */
            steps.home = await page.evaluate(usable, '#whPad');
            if (!steps.home.ok) P.push('Home: joystick not usable ' + JSON.stringify(steps.home));
            /* 2. into a world, as from the World map: Misty joins you inside */
            steps.travel = await page.evaluate(w => { try { return !!window.LowiWorldRegions.travel(w); } catch (e) { return 'threw ' + e.message; } }, WORLD);
            await page.waitForFunction(w => { try { return window.LowiWorldRegions.current() === w && document.documentElement.classList.contains('wh-away') && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, WORLD, { timeout: +arg('enter', 150000), polling: 500 }).catch(() => { });
            await sleep(2500);
            steps.inside = await page.evaluate(snap);
            if (steps.inside.cur !== WORLD || steps.inside.mf.st !== 'inside') P.push('never got inside ' + WORLD + ': ' + JSON.stringify(steps.inside));
            /* 3. the joystick inside the world */
            steps.padIn = await page.evaluate(usable, '#whPad');
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-inside.png` });
            if (!steps.padIn.ok) P.push('inside the world: joystick not usable ' + JSON.stringify(steps.padIn));
            /* 4. steer with it: a real drag on the joystick moves Misty */
            if (steps.padIn.ok) {
                const r = steps.padIn.r, cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
                const p0 = (await page.evaluate(snap)).mf.p;
                await page.mouse.move(cx, cy); await page.mouse.down();
                for (let i = 1; i <= 8; i++) { await page.mouse.move(cx + 3 * i, cy - 3 * i); await sleep(60); }
                await sleep(2200);
                const mid = await page.evaluate(snap);
                await page.mouse.up();
                const d = p0 && mid.mf && mid.mf.p ? Math.hypot(mid.mf.p[0] - p0[0], mid.mf.p[1] - p0[1], mid.mf.p[2] - p0[2]) : 0;
                steps.steer = { mode: mid.pad, moved: +d.toFixed(3), st: mid.mf && mid.mf.st };
                if (mid.pad !== 'drive') P.push('dragging the joystick did not take control: mode ' + mid.pad);
                if (!(d > 0.02)) P.push('dragging the joystick did not move Misty: ' + JSON.stringify(steps.steer));
                await sleep(800);
            }
            /* 5. the way back out: the World map stick. Steering fades it with the clean flight view by design (clean-view-core.js),
               and one tap on empty space brings it back; that reveal tap is part of the path. */
            steps.stick = await page.evaluate(usable, '#whHud .wh-zoom');
            if (!steps.stick.ok && /lw-clean/.test((await page.evaluate(snap)).cls)) {
                const vp = page.viewportSize(); await page.mouse.click(Math.round(vp.width * 0.12), Math.round(vp.height * 0.3));
                await sleep(1500);
                steps.revealTap = true;
                steps.stick = await page.evaluate(usable, '#whHud .wh-zoom');
            }
            if (!steps.stick.ok) P.push('inside the world: World map stick (way back out) not usable ' + JSON.stringify(steps.stick));
            else {
                const r = steps.stick.r; await page.mouse.click(r[0] + r[2] / 2, r[1] + r[3] / 2);
                await page.waitForFunction(() => { try { return window.LowiWorldRegions.current() === 'hub' && !document.documentElement.classList.contains('wh-away') && !document.documentElement.classList.contains('bwr-warping'); } catch (e) { return false; } }, null, { timeout: +arg('leave', 150000), polling: 500 }).catch(() => { });
                await sleep(2500);
                steps.left = await page.evaluate(snap);
                if (steps.left.cur !== 'hub' || /wh-away/.test(steps.left.cls)) P.push('tapping World map did not leave the world: ' + JSON.stringify(steps.left));
                /* back to Misty: the stick again (now "Misty"), until the ring Home is back */
                for (let i = 0; i < 3; i++) {
                    const home = await page.evaluate(() => ({ scan: (function (s) { const e = document.querySelector(s); if (!e) return 0; const c = getComputedStyle(e); return +c.opacity; })('[data-orbit="scan"]'), stick: (function () { const e = document.querySelector('#whHud .wh-zoom'); if (!e) return null; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return c.display !== 'none' && r.width > 10 ? [r.left + r.width / 2, r.top + r.height / 2] : null; })() }));
                    if (home.scan > 0.9 && !home.stick) break;
                    if (home.stick) await page.mouse.click(home.stick[0], home.stick[1]);
                    await sleep(6000);
                }
                await sleep(1500);
                /* leaving a world keeps the clean flight view (Oct 17 rule): one tap on Home brings the ring back */
                if (/lw-clean/.test((await page.evaluate(snap)).cls)) {
                    const vp = page.viewportSize(); await page.mouse.click(Math.round(vp.width * 0.12), Math.round(vp.height * 0.3));
                    await sleep(1500); steps.homeRevealTap = true;
                }
                steps.home2 = { pad: await page.evaluate(usable, '#whPad'), scan: await page.evaluate(usable, '[data-orbit="scan"]'), s: await page.evaluate(snap) };
                await page.screenshot({ path: `${OUT}/${TAG}-${v}-back-home.png` });
                if (!steps.home2.pad.ok) P.push('back on Home: joystick not usable ' + JSON.stringify(steps.home2.pad));
                if (!steps.home2.scan.ok) P.push('back on Home: ring (Scan) not usable ' + JSON.stringify(steps.home2.scan));
            }
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
