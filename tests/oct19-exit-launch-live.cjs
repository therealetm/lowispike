'use strict';
/* Browser check: the way out of a world is a launch (Oct 19 2026, Emmanuel: "like a rocket trying to exit a world, like that
   perspective from Interstellar", "it was still coming out real fast"), and weak Misty is pulled back in at the rings.
   Enter a world, then leave it while sampling every frame:
     launch (default): the camera turns off its aim at the world during the burn (looks up / shakes, > 0.1 rad), swings over the top
       to look back down at it after breaking free (rig pitch > 0.6), spends most of the trip in the ring band and ends level
       (< 0.01 rad off) on the outside view (> 4.5), back outside afterwards.
     --weak 1: below half energy (LowiSun.energyNow stubbed to 0.2): it climbs to the rings (0.62 .. 1.6 from the core), never
       further, falls back to the core, and the world comes back with Misty inside; heldSay gives a line in the page.
   Screenshots: OUT/TAG-<view>-<mode>-<n>.png, -after.png.
     node tests/oct19-exit-launch-live.cjs [--root DIR | --url URL] [--out DIR] [--tag t] [--views iphone_chromium,iphone13_webkit,ipad_landscape_webkit] [--world liver] [--weak 1]
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


/* sampled every animation frame while she leaves: camera distance from the world, how far the view is turned off its aim at the
   world (the rocket camera's tilt / roll / shake), the rig's pitch, Misty's state */
function watchExit() {
    const out = [], R = window.LowiWorldRegions, a = window.LowiWorld3D, t0 = performance.now();
    window.__exitLog = out; window.__exitLast = null;
    (function f() {
        const ps = R.pullState(), c = a && a.camera;
        if (ps && ps.B && c) {
            const B = ps.B, cp = c.position, s = window.LowiMistyFlight.state();
            const e = c.matrixWorld.elements, fwd = [-e[8], -e[9], -e[10]], to = [B[0] - cp.x, B[1] - cp.y, B[2] - cp.z];
            const n = Math.hypot(to[0], to[1], to[2]) || 1, fl = Math.hypot(fwd[0], fwd[1], fwd[2]) || 1;
            const off = Math.acos(Math.max(-1, Math.min(1, (fwd[0] * to[0] + fwd[1] * to[1] + fwd[2] * to[2]) / n / fl)));

            out.push({ t: Math.round(performance.now() - t0), ph: ps.phase, k: ps.k, pk: ps.pk, weak: ps.weak, dB: +n.toFixed(3), off: +off.toFixed(4), pitch: +a.rig.pitch.toFixed(3), st: s.st, cur: R.current(), snap: !!document.querySelector('.bwr-snap') });
        } else if (out.length) { const s = window.LowiMistyFlight.state(); out.push({ t: Math.round(performance.now() - t0), done: true, st: s.st, cur: R.current() }); window.__exitLast = out[out.length - 1]; return; }
        if (performance.now() - t0 < 400000) requestAnimationFrame(f);
    })();
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host, WORLD = arg('world', 'liver'), WEAK = !!arg('weak', ''), MODE = WEAK ? 'weak' : 'launch';
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [], P = [], steps = {};
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight, null, { timeout: 150000 }).catch(() => { });
            await sleep(+arg('wait', 6000));
            steps.build = await page.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
            await page.evaluate(w => window.LowiWorldRegions.travel(w), WORLD);
            await page.waitForFunction(w => { try { return window.LowiWorldRegions.current() === w && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, WORLD, { timeout: +arg('enter', 240000), polling: 500 }).catch(() => { });
            await sleep(2500);
            const inside = await page.evaluate(() => ({ cur: window.LowiWorldRegions.current(), st: window.LowiMistyFlight.state().st }));
            if (inside.cur !== WORLD || inside.st !== 'inside') { P.push('never got inside: ' + JSON.stringify(inside)); throw new Error('no inside'); }
            if (WEAK) await page.evaluate(() => { window.LowiSun = window.LowiSun || {}; window.LowiSun.energyNow = () => ({ value: 0.2 }); });
            await page.evaluate(watchExit);
            await page.evaluate(weak => weak ? window.LowiWorldRegions.travel('hub', false, 0, { weak: true }) : window.LowiWorldRegions.travel('hub'), WEAK);
            /* screenshots at points of the trip (by the trip's own progress k, not wall time: this machine is slow) */
            const marks = WEAK ? [0.05, 0.3, 0.52, 0.8] : [0.05, 0.3, 0.55, 0.7, 0.9];
            for (let i = 0; i < marks.length; i++) {
                await page.waitForFunction(m => { const l = window.__exitLog || []; const x = l[l.length - 1]; return !!window.__exitLast || (x && x.k >= m); }, marks[i], { timeout: 400000, polling: 100 }).catch(() => { });
                if (await page.evaluate(() => !!window.__exitLast)) break;
                await page.screenshot({ path: `${OUT}/${TAG}-${v}-${MODE}-${i}.png` });
            }
            await page.waitForFunction(() => !!window.__exitLast, null, { timeout: 400000, polling: 500 }).catch(() => { });
            await sleep(2500);
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-${MODE}-after.png` });
            const L = await page.evaluate(() => window.__exitLog || []);
            const after = await page.evaluate(() => { const s = window.LowiMistyFlight.state(); return { st: s.st, cur: window.LowiWorldRegions.current(), away: document.documentElement.classList.contains('wh-away') }; });
            fs.writeFileSync(`${OUT}/${TAG}-${v}-${MODE}-log.json`, JSON.stringify({ L, after }));
            const pull = L.filter(x => x.ph === 'pull' && x.dB != null);
            steps.frames = pull.length; steps.after = after;
            if (pull.length < 10) P.push('hardly any frames of the way out: ' + pull.length);
            else {
                const free = 0.62, burn = pull.filter(x => x.k > 0.1 && x.k < (WEAK ? 0.5 : free - 0.04));
                steps.burnOff = +Math.max(0, ...burn.map(x => x.off)).toFixed(3);
                steps.offs = new Set(burn.map(x => Math.round(x.off * 1000))).size;
                steps.maxD = +Math.max(...pull.map(x => x.dB)).toFixed(3);
                steps.maxPitch = Math.max(...pull.map(x => x.pitch));
                if (pull[0].dB > 0.7) P.push('does not start at the world: ' + JSON.stringify(pull[0]));
                if (!(steps.burnOff > 0.1)) P.push('the camera never turned off its aim during the burn (no rocket POV): ' + steps.burnOff);
                if (steps.offs < 4) P.push('no shaking (the turn hardly changed): ' + steps.offs);
                if (pull.some(x => x.cur !== 'hub')) P.push('the place is still mounted during the way out');
                const last = pull[pull.length - 1];
                if (!WEAK) {
                    let back = 0; for (let i = 1; i < pull.length; i++) if (pull[i].dB - pull[i - 1].dB < -0.02) back++;
                    if (back) P.push('camera went back in ' + back + ' times');
                    if (!(steps.maxPitch > 0.6)) P.push('never swung over to look back down at the world: ' + steps.maxPitch);
                    if (!(last.dB > 4.5)) P.push('does not end on the outside view: ' + JSON.stringify(last));
                    if (!(last.k > 0.97 && last.off < 0.02)) P.push('does not end level: ' + JSON.stringify(last));
                    const band = pull.filter(x => x.dB < 1.6); steps.bandShare = +(band.length / pull.length).toFixed(2);
                    if (steps.bandShare < 0.35) P.push('hardly any of the trip in the ring band: ' + steps.bandShare);
                    if (after.cur !== 'hub' || after.away) P.push('not back outside: ' + JSON.stringify(after));
                    if (after.st === 'inside' || after.st === 'warp') P.push('Misty went back in: ' + after.st);
                } else {
                    if (!(steps.maxD > 0.62 && steps.maxD < 1.6)) P.push('did not get to the rings (or got past them): ' + steps.maxD);
                    if (!(last.dB < 0.62)) P.push('not pulled back down to the core: ' + JSON.stringify(last));
                    if (after.cur !== WORLD) P.push('not back inside the world: ' + JSON.stringify(after));
                    if (after.st !== 'inside') P.push('Misty not inside: ' + after.st);
                    steps.line = await page.evaluate(() => window.LowiMistyHunt && window.LowiMistyHunt.heldSay && window.LowiMistyHunt.heldSay());
                    if (!steps.line) P.push('no line from Misty');
                }
            }
        } catch (e) { if (e.message !== 'no inside') P.push('threw ' + e.message.slice(0, 200)); }
        if (errs.length) P.push('page errors: ' + errs.join(' / '));
        console.log(JSON.stringify({ view: v, mode: MODE, build: steps.build, frames: steps.frames, burnOff: steps.burnOff, offs: steps.offs, maxD: steps.maxD, maxPitch: steps.maxPitch, bandShare: steps.bandShare, line: steps.line, after: steps.after, problems: P }));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})();
