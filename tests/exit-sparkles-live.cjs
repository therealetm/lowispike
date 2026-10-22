'use strict';
/* Browser check: no white boxes when Misty leaves a world (Oct 22 2026, Emmanuel, iPhone screenshot 14:51: "When it's coming out
   of the world the animation is cool, but these white boxes are annoying. Fix it. That doesn't look cool.").
   Enter a world, leave it, and on every frame of the way out look at every visible Points / Sprite in the 3D scene:
     - each one must have a texture (a Points or Sprite with no map draws every particle as a solid square), and be transparent;
     - no sparkle may be bigger on screen than LowiWorldHomeCore.SPARK.MAX_PX (+1 px of slack).
   Screenshots of the way out: OUT/TAG-<view>-<theme>-<n>.png.
     node tests/exit-sparkles-live.cjs [--root DIR | --url URL] [--out DIR] [--tag t] [--views iphoneSE_webkit,iphone13_webkit,iphone15_webkit,pixel7_chromium] [--themes light,dark] [--world liver]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/exit-sparkles-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const VIEWS = { iphoneSE_webkit: ['webkit', 'iPhone SE'], iphone13_webkit: ['webkit', 'iPhone 13'], iphone15_webkit: ['webkit', 'iPhone 15'], pixel7_chromium: ['chromium', 'Pixel 7'], iphone13_chromium: ['chromium', 'iPhone 13'] };
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];

/* in the page, every frame of the way out: untextured / opaque particles and the biggest sparkle on screen */
function watchFx() {
    const a = window.LowiWorld3D, R = window.LowiWorldRegions, T = a.THREE, v = new T.Vector3(), t0 = performance.now();
    const out = { frames: 0, bad: {}, opaque: {}, maxPx: {}, names: {}, capped: {}, k: 0, done: false };
    window.__fx = out;
    (function f() {
        const ps = R.pullState();
        if (ps && ps.B) {
            out.frames++; out.k = ps.k || 0;
            const cv = a.renderer && a.renderer.domElement, halfH = ((cv && cv.clientHeight) || innerHeight) / 2;
            a.camera.updateMatrixWorld();
            a.scene.traverseVisible(o => {
                if (!(o.isPoints || o.isSprite)) return;
                const m = o.material; if (!m || m.isShaderMaterial || !(m.opacity > 0.01)) return;
                const nm = o.name || o.type;
                let live = true;
                if (o.isPoints) {
                    const pos = o.geometry && o.geometry.attributes && o.geometry.attributes.position; let n = 0, mx = 0;
                    if (pos) for (let i = 0; i < pos.count; i++) {
                        v.fromBufferAttribute(pos, i); if (v.x < -900) continue; n++;
                        if (m.sizeAttenuation === false) { mx = Math.max(mx, m.size); continue; }
                        o.localToWorld(v); v.applyMatrix4(a.camera.matrixWorldInverse); const z = -v.z; if (z <= 0.01) continue;
                        mx = Math.max(mx, m.size * halfH / z);
                    }
                    const ud = m.userData || {}; if (ud.capped && ud.maxPS) mx = Math.min(mx, ud.maxPS.value / ((a.renderer.getPixelRatio && a.renderer.getPixelRatio()) || 1)); /* the shader caps it */
                    if (ud.capped) out.capped[nm] = true;
                    live = n > 0; if (live) out.maxPx[nm] = Math.max(out.maxPx[nm] || 0, +mx.toFixed(1));
                }
                if (!live) return;
                out.names[nm] = (out.names[nm] || 0) + 1;
                if (!m.map) out.bad[nm] = (out.bad[nm] || 0) + 1;
                if (!m.transparent) out.opaque[nm] = (out.opaque[nm] || 0) + 1;
            });
        } else if (out.frames) { out.done = true; return; }
        if (performance.now() - t0 < 400000) requestAnimationFrame(f);
    })();
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host, WORLD = arg('world', 'liver');
    let fail = 0;
    for (const vw of arg('views', 'iphone13_webkit').split(',')) for (const theme of arg('themes', 'light,dark').split(',')) {
        const [eng, dd] = VIEWS[vw];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const ctx = await browser.newContext(Object.assign({}, pw.devices[dd], { serviceWorkers: 'block' }));
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
        await ctx.addInitScript(INIT);
        await ctx.addInitScript(t => { try { localStorage.setItem('lowi.theme', t); } catch (e) { } }, theme);
        const page = await ctx.newPage(), errs = [], P = [], st = {};
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'domcontentloaded', timeout: 600000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorldRegions && window.LowiMistyFlight, null, { timeout: 600000 }).catch(() => { });
            await sleep(+arg('wait', 5000));
            st.build = await page.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
            st.theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
            await page.evaluate(w => window.LowiWorldRegions.travel(w), WORLD);
            await page.waitForFunction(w => { try { return window.LowiWorldRegions.current() === w && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, WORLD, { timeout: +arg('enter', 240000), polling: 500 }).catch(() => { });
            await sleep(2500);
            const inside = await page.evaluate(() => ({ cur: window.LowiWorldRegions.current(), st: window.LowiMistyFlight.state().st }));
            if (inside.cur !== WORLD || inside.st !== 'inside') { P.push('never got inside: ' + JSON.stringify(inside)); throw new Error('no inside'); }
            await page.evaluate(watchFx);
            await page.evaluate(() => window.LowiWorldRegions.travel('hub'));
            const marks = [0.12, 0.3, 0.45, 0.6, 0.8];
            for (let i = 0; i < marks.length; i++) {
                await page.waitForFunction(m => { const x = window.__fx; return !x || x.done || x.k >= m; }, marks[i], { timeout: 400000, polling: 100 }).catch(() => { });
                if (await page.evaluate(() => !window.__fx || window.__fx.done)) break;
                await page.screenshot({ path: `${OUT}/${TAG}-${vw}-${theme}-${i}.png` });
            }
            await page.waitForFunction(() => window.__fx && window.__fx.done, null, { timeout: 400000, polling: 500 }).catch(() => { });
            const fx = await page.evaluate(() => window.__fx);
            const MAX = await page.evaluate(() => window.LowiWorldHomeCore && window.LowiWorldHomeCore.SPARK ? window.LowiWorldHomeCore.SPARK.MAX_PX : null);
            Object.assign(st, { frames: fx.frames, bad: fx.bad, opaque: fx.opaque, maxPx: fx.maxPx, capped: fx.capped, seen: fx.names, MAX });
            if (fx.frames < 10) P.push('hardly any frames of the way out: ' + fx.frames);
            if (Object.keys(fx.bad).length) P.push('untextured particles (drawn as squares): ' + JSON.stringify(fx.bad));
            if (Object.keys(fx.opaque).length) P.push('opaque particles: ' + JSON.stringify(fx.opaque));
            const lim = (MAX || 16) * 1.5 + 1, big = Object.entries(fx.maxPx).filter(([n, px]) => /sparkle|mt-|spark|trail|burst/i.test(n) && px > lim);
            if (big.length) P.push('sparkles too big on screen: ' + JSON.stringify(big));
        } catch (e) { if (e.message !== 'no inside') P.push('threw ' + e.message.slice(0, 200)); }
        if (errs.length) P.push('page errors: ' + errs.join(' / '));
        console.log(JSON.stringify(Object.assign({ view: vw, themeAsked: theme }, st, { problems: P })));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})();
