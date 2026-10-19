'use strict';
/* Browser check: leaving a world plays the fly-in in reverse (Oct 18 2026, Emmanuel: "when it exits the world ... all of a sudden
   she just spawns out with the camera being zoomed out. I want to see the same animation but the reverse").
   Enter a world (LowiWorldRegions.travel, Misty joins you inside), then leave it the Back / X way while sampling every frame:
     - the pull-back starts at the world she left (camera < 0.7 from its core: its colour fills the screen)
     - the camera only ever backs away, no jump, spends time in the ring band (< 1.3), and ends on the outside view (> 4.5)
     - the place is gone for the whole pull-back; Misty comes out with it and ends > 2 from the world (out of its pull)
     - afterwards: outside (not wh-away), Misty not back inside
   Screenshots during the way out: OUT/TAG-<view>-exit-<n>.png, and -after.png.
     node tests/world-exit-reverse-live.cjs [--root DIR | --url URL] [--out DIR] [--tag t] [--views iphone_chromium,iphone13_webkit,ipad_landscape_webkit] [--world liver] [--wide 1 (the World map way out)]
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


/* sampled every animation frame in the page while she leaves: the camera's distance from the world she left, her own */
function watchExit() {
    const out = [], R = window.LowiWorldRegions, a = window.LowiWorld3D, t0 = performance.now();
    window.__exitLog = out;
    (function f() {
        const ps = R.pullState(), c = a && a.camera;
        if (ps && ps.B && c) {
            const B = ps.B, cp = c.position, s = window.LowiMistyFlight.state();
            const p = s.p;
            out.push({ t: Math.round(performance.now() - t0), ph: ps.phase, pk: ps.pk, dB: +Math.hypot(cp.x - B[0], cp.y - B[1], cp.z - B[2]).toFixed(3), st: s.st, outPh: s.outPh, mB: p ? +Math.hypot(p[0] - B[0], p[1] - B[1], p[2] - B[2]).toFixed(3) : null, snap: !!document.querySelector('.bwr-snap'), cur: R.current() });
        } else if (out.length) { const s = window.LowiMistyFlight.state(); out.push({ t: Math.round(performance.now() - t0), done: true, st: s.st, cur: R.current() }); window.__exitLast = out[out.length - 1]; return; }
        if (performance.now() - t0 < 90000) requestAnimationFrame(f);
    })();
}

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
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [], P = [], steps = {};
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight, null, { timeout: 90000 }).catch(() => { });
            await sleep(+arg('wait', 6000));
            steps.build = await page.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
            await page.evaluate(w => window.LowiWorldRegions.travel(w), WORLD);
            await page.waitForFunction(w => { try { return window.LowiWorldRegions.current() === w && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, WORLD, { timeout: +arg('enter', 150000), polling: 500 }).catch(() => { });
            await sleep(2500);
            const inside = await page.evaluate(() => ({ cur: window.LowiWorldRegions.current(), st: window.LowiMistyFlight.state().st }));
            if (inside.cur !== WORLD || inside.st !== 'inside') { P.push('never got inside: ' + JSON.stringify(inside)); throw new Error('no inside'); }
            /* leave: the Back / X way (the same way out her own flight through the cloud wall takes now) */
            await page.evaluate(watchExit);
            await page.evaluate(wide => wide ? window.LowiWorldRegions.travel('hub', false, 0, { wide: true }) : window.LowiWorldRegions.travel('hub'), !!arg('wide', ''));
            const shots = +arg('shots', 6), every = +arg('every', 380);
            const shotAt = [];
            for (let i = 0; i < shots; i++) { await sleep(i ? every : 60); const lp = await page.evaluate(() => { const l = window.__exitLog || []; return l.length ? l[l.length - 1] : null; }); shotAt.push(lp); await page.screenshot({ path: `${OUT}/${TAG}-${v}-exit-${i}.png` }); }
            await page.waitForFunction(() => !!window.__exitLast, null, { timeout: 100000, polling: 500 }).catch(() => { });
            await sleep(1500);
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-after.png` });
            const L = await page.evaluate(() => window.__exitLog || []);
            const after = await page.evaluate(() => { const s = window.LowiMistyFlight.state(); const B = window.__exitLog && window.__exitLog.find(x => x.dB != null); return { st: s.st, cur: window.LowiWorldRegions.current(), away: document.documentElement.classList.contains('wh-away'), p: s.p, pad: (() => { const e = document.getElementById('whPad'); if (!e) return null; const r = e.getBoundingClientRect(); return { op: +getComputedStyle(e).opacity, r: [r.left, r.top, r.width, r.height].map(Math.round) }; })() }; });
            fs.writeFileSync(`${OUT}/${TAG}-${v}-log.json`, JSON.stringify({ shotAt, L }, null, 0));
            const pts = L.filter(x => x.dB != null);
            steps.frames = pts.length; steps.first = pts[0]; steps.last = pts[pts.length - 1]; steps.after = after;
            steps.ms = L.length ? L[L.length - 1].t - (pts[0] ? pts[0].t : 0) : 0;
            if (!pts.length) P.push('no pull-back frames seen');
            else {
                const pull = pts.filter(x => x.ph === 'pull');
                if (!pull.length || pull[0].dB > 0.7) P.push('does not start at the world: ' + JSON.stringify(pull[0]));
                let jumps = 0, back = 0, maxStep = 0;
                for (let i = 1; i < pull.length; i++) { const d = pull[i].dB - pull[i - 1].dB; maxStep = Math.max(maxStep, d); if (d < -0.02) back++; if (d > 1.2) jumps++; }
                steps.maxStep = +maxStep.toFixed(3);
                if (back) P.push('camera went back in ' + back + ' times');
                if (jumps) P.push('camera jumped ' + jumps + ' times');
                const end = pull[pull.length - 1];
                if (!(end.dB > (arg('wide', '') ? 15 : 4.5))) P.push('does not end on the outside view of the world: ' + JSON.stringify(end));
                const band = pull.filter(x => x.dB < 1.3);
                steps.ringBandMs = band.length ? band[band.length - 1].t - band[0].t : 0;
                if (steps.ringBandMs < 300) P.push('hardly any time in the ring band: ' + steps.ringBandMs);
                const mEnd = pull.filter(x => x.mB != null).pop();
                steps.mistyEnd = mEnd;
                if (mEnd && mEnd.mB < 2.0) P.push('Misty ends too close to the world (could fall back in): ' + mEnd.mB);
                if (pull.some(x => x.cur !== 'hub')) P.push('pull-back while the place is still mounted');
            }
            if (after.cur !== 'hub' || after.away) P.push('not back outside: ' + JSON.stringify(after));
            if (after.st === 'inside' || after.st === 'warp') P.push('Misty went back in: ' + after.st);
        } catch (e) { if (e.message !== 'no inside') P.push('threw ' + e.message.slice(0, 200)); }
        if (errs.length) P.push('page errors: ' + errs.join(' / '));
        console.log(JSON.stringify({ view: v, build: steps.build, frames: steps.frames, ms: steps.ms, ringBandMs: steps.ringBandMs, maxStep: steps.maxStep, first: steps.first, last: steps.last, mistyEnd: steps.mistyEnd, after: steps.after, problems: P }));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})();
