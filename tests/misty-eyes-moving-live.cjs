'use strict';
/* Browser check: Misty's face stays readable while she flies (Oct 18 2026, E-man on iPad: "when it move we don't see its eyes bc
   it's transparent"). Chromium 390x844, WebKit iPhone 13, WebKit + Chromium iPad 1180x820.
   The world is tinted dark gold with soft gold bokeh (like his screenshot). Her energy is low (the fixture's tired Misty, the
   case that made her most see-through). Phases: autopilot tour, driving with the joystick, her timed adventure (exploration) if
   her energy allows it. Every animation frame records her body (wand) opacity, her face plane's opacity / visibility, how much of
   her face points at you, and (every 6th frame) any visible transparent layer drawn after her face. Then:
     - her body is fully opaque (1) in the frames she is settled out in the world (only fade in / out may dim her, <= 12% of frames)
     - whenever any of her face points at you, the face's opacity equals her body's: 1 when she is there, never a ghost
     - nothing translucent is drawn over her face (render order + depth test off), the inner layer behind her face is >= 85% opaque
     - her face is actually shown in a fair share of frames (she looks where she flies, and looks back now and then)
   Production Supabase and every non-GET request are blocked; a local fixture session only.
     node tests/misty-eyes-moving-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--tag after] [--views a,b]
       [--auto ms] [--explore ms] [--wait ms] [--dpr 1]  (slow software-GL WebKit: longer phases)
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/misty-eyes-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD], ipad_chromium: ['chromium', IPAD] };
/* the same local fixture session the Home ring check uses (no account, no network) */
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];

/* in the page: a dark-gold world and a per-frame recorder (test only) */
function setup() {
    const A = window.LowiWorld3D, THREE = A && A.THREE; if (!A || !THREE) return 'no 3d';
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d');
    const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,214,120,.9)'); g.addColorStop(0.5, 'rgba(240,170,60,.35)'); g.addColorStop(1, 'rgba(240,170,60,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv), bok = [];
    for (let i = 0; i < 26; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.35 + 0.4 * ((i * 37) % 10) / 10, depthWrite: false, depthTest: false, fog: false })); s.name = 'test-bokeh'; s.renderOrder = 1; s.userData.lwKeep = true; s.userData.o = [((i * 53) % 21 - 10) / 10, ((i * 29) % 17 - 8) / 8, 0.6 + ((i * 7) % 5) / 5, 0.03 + ((i * 11) % 6) / 60]; A.scene.add(s); bok.push(s); }
    const gold = new THREE.Color(0x1d1307);
    const keep = () => {
        const sc = A.scene, cam = A.camera; if (!sc || !cam) return;
        if (!sc.background || !sc.background.equals || !sc.background.equals(gold)) sc.background = gold.clone();
        if (sc.fog && sc.fog.color) sc.fog.color.copy(gold);
        cam.updateMatrixWorld(); const e = cam.matrixWorld.elements, far = 14;
        bok.forEach(s => { const o = s.userData.o, d = far * o[2]; s.position.set(e[12] - e[8] * d + (e[0] * o[0] + e[4] * o[1]) * d * 0.9, e[13] - e[9] * d + (e[1] * o[0] + e[5] * o[1]) * d * 0.9, e[14] - e[10] * d + (e[2] * o[0] + e[6] * o[1]) * d * 0.9); s.scale.setScalar(d * o[3] * 3); if (s.layers.mask !== cam.layers.mask) s.layers.mask = cam.layers.mask; });
    };
    keep(); window.__eyesKeep = setInterval(keep, 120);
    const R = window.__eyes = { f: [], phase: 'rest', on: true };
    let n = 0, wand = null, face = null;
    const find = () => { wand = face = null; A.scene.traverse(o => { if (o.name === 'wh-misty-out') wand = o; if (o.name === 'mf-misty-face') face = o; }); };
    const tick = () => {
        if (!R.on) return; requestAnimationFrame(tick);
        if (!wand || !wand.parent || !face || !face.parent) { if (n++ % 15 === 0) find(); if (!wand) return; }
        const F = window.LowiMistyFlight, MF = window.LowiMistyFace, fs = F && F.state ? F.state() : {}, m = MF && MF.state ? MF.state() : {};
        const r = { p: R.phase, st: fs.st, dk: fs.dk || 0, wv: !!wand.visible, wo: +wand.material.opacity.toFixed(3), fv: !!(face && face.visible), fo: face ? +face.material.opacity.toFixed(3) : null, seen: m.faceSeen, fd: m.faceD, why: m.why, on: !!m.on };
        if (face && (n++ % 6 === 0)) {
            const ro = face.renderOrder, over = [];
            A.scene.traverseVisible(o => { const mt = o.material; if (o === face || !mt || !mt.transparent || o.name === 'test-bokeh') return; if ((o.renderOrder || 0) > ro && (mt.opacity || 0) > 0.02) over.push(o.name || o.type); });
            r.over = over; r.ro = [wand.renderOrder, ro]; r.dt = face.material.depthTest;
        }
        R.f.push(r); if (R.f.length > 6000) R.f.shift();
    };
    requestAnimationFrame(tick);
    return 'ok';
}

function judge(fr, info) {
    const P = [], out = fr.filter(f => f.wv && f.p !== 'rest' && f.st && f.st !== 'idle');
    if (out.length < 60) P.push('too few frames of her flying: ' + out.length);
    const settled = out.filter(f => f.wo >= 0.999).length, ghostBody = out.filter(f => f.wo > 0.02 && f.wo < 0.999);
    if (out.length && settled / out.length < 0.85) P.push('body see-through in ' + ghostBody.length + '/' + out.length + ' frames, e.g. opacity ' + (ghostBody[0] && ghostBody[0].wo));
    /* judged against faceD: her look toward you exactly as the face was last drawn (same render as its opacity). state().faceSeen
       is only an estimate from the camera's forward axis, which differs when she is off the middle of the screen. Any part of her
       face toward you = faceD > -0.3 (where faceVis reaches 0). */
    const showing = out.filter(f => f.fv && (f.fd != null ? f.fd > -0.3 : f.seen >= 0.05));
    const realGhost = out.filter(f => f.fv && f.fo > 0.002 && f.fo < f.wo - 0.002);
    if (realGhost.length) P.push('face drawn half see-through (between gone and her body) in ' + realGhost.length + ' frames');
    const ghost = showing.filter(f => Math.abs(f.fo - f.wo) > 0.002);
    if (ghost.length) P.push('face not as solid as her body in ' + ghost.length + '/' + showing.length + ' frames, e.g. ' + JSON.stringify(ghost[0]));
    const solid = showing.filter(f => f.wo >= 0.999 && f.fo >= 0.999).length;
    if (showing.length < 20) P.push('her face was shown in only ' + showing.length + ' frames');
    const covered = out.filter(f => f.over && f.over.length && !(f.dk > 0.05));
    if (covered.length) P.push('a translucent layer is drawn over her face: ' + [...new Set(covered.flatMap(f => f.over))].join(','));
    const ro = out.find(f => f.ro); if (ro && !(ro.ro[1] > ro.ro[0] && ro.dt === false)) P.push('face not on top of her body: ' + JSON.stringify(ro));
    if (!(info.backA >= 0.85)) P.push('the body behind her face is only ' + info.backA + ' opaque');
    const by = {}; out.forEach(f => { const k = f.p + ':' + f.st; by[k] = (by[k] || 0) + 1; });
    return { problems: P, frames: out.length, bodySolidPct: out.length ? +(100 * settled / out.length).toFixed(1) : 0, faceShown: showing.length, faceSolid: solid, ghostFace: ghost.length, states: by };
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit,ipad_landscape_webkit').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
        if (arg('dpr', '')) dev.deviceScaleFactor = +arg('dpr', ''); /* a loaded test machine renders 1x faster; layout (CSS px) is the same */
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        const writes = [];
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (q.method() !== 'GET') writes.push(q.method() + ' ' + u.host); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
        await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiWorld3D && window.LowiWorld3D.scene, null, { timeout: 90000 }).catch(() => { });
        await sleep(+arg('wait', 7000));
        const P = [];
        const su = await page.evaluate(setup).catch(e => 'setup threw ' + e.message);
        if (su !== 'ok') P.push('setup: ' + su);
        await sleep(600);
        await page.screenshot({ path: `${OUT}/${TAG}-${v}-rest.png` });
        const shots = []; let snapWhy = '';
        const snap = async (name) => {
            const s = await page.evaluate(() => ({ spot: window.LowiMistyFlight.touchSpot(), m: window.LowiMistyFace.state() }));
            if (!s.spot || !(s.m.faceSeen > 0.6) || !(s.m.on || s.m.faceOp >= 0.99)) { snapWhy = JSON.stringify({ spot: !!s.spot, seen: s.m.faceSeen, on: s.m.on }); return false; }
            const vw = dev.viewport.width, vh = dev.viewport.height, h = Math.max(70, s.spot.h * 1.5), cl = (q, a, b) => Math.max(a, Math.min(b, q));
            const m = s.spot.h * 0.35; if (!(s.spot.x > -m && s.spot.x < vw + m && s.spot.y > -m && s.spot.y < vh + m)) { snapWhy = 'off screen ' + Math.round(s.spot.x) + ',' + Math.round(s.spot.y); return false; }
            const x0 = cl(s.spot.x - h, 0, vw - 40), y0 = cl(s.spot.y - h, 0, vh - 40);
            const clip = { x: x0, y: y0, width: Math.min(2 * h, vw - x0), height: Math.min(2 * h, vh - y0) };
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-${name}-face.png`, clip });
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-${name}.png` });
            shots.push({ name, face: s.m.faceSeen, faceOp: s.m.faceOp, bodyOp: s.m.bodyOp, h: Math.round(s.spot.h) }); return true;
        };
        /* 1. autopilot */
        await page.evaluate(() => { window.__eyes.phase = 'auto'; window.LowiPad.mode('auto'); });
        let got = false;
        for (let t = 0; t < +arg('auto', 22000); t += 700) { await sleep(700); if (!got && t > 2500) got = await snap('autopilot'); }
        /* 2. driving: the joystick's steering, then a straight push */
        await page.evaluate(() => { window.__eyes.phase = 'drive'; window.LowiPad.mode('drive'); });
        got = false;
        for (let i = 0; i < 14; i++) { await page.evaluate(i => window.LowiPad.steer(Math.sin(i / 2) * 0.8, -0.6), i); await sleep(450); if (!got && i > 3) got = await snap('drive'); }
        await page.evaluate(() => window.LowiPad.steer(0, 0));
        /* 3. her timed adventure (exploration), when her energy allows it */
        const adv = await page.evaluate(() => { window.__eyes.phase = 'adventure'; try { return window.LowiAdventure && window.LowiAdventure.start ? !!window.LowiAdventure.start() : 'none'; } catch (e) { return 'threw ' + e.message; } });
        if (adv === true) { got = false; for (let t = 0; t < 12000; t += 700) { await sleep(700); if (!got && t > 2000) got = await snap('adventure'); } }
        /* 4. exploring inside a world on autopilot (the liver, as from the World map): she comes in and roams round in there */
        const tr = await page.evaluate(() => { window.__eyes.phase = 'explore'; try { const A = window.LowiAdventure; if (A && A.on) A.stop('abort'); } catch (e) { } window.LowiPad.mode('auto'); try { return !!window.LowiWorldRegions.travel('liver'); } catch (e) { return 'threw ' + e.message; } });
        got = false;
        for (let t = 0; t < +arg('explore', 30000); t += 700) { await sleep(700); if (!got && t > 4000) got = await page.evaluate(() => window.LowiMistyFlight.state().st === 'inside') && await snap('explore'); }
        const info = await page.evaluate(() => { window.__eyes.on = false; clearInterval(window.__eyesKeep); return window.LowiMistyFace.state(); });
        const fr = await page.evaluate(() => window.__eyes.f);
        const j = judge(fr, info);
        P.push(...j.problems);
        if (process.env.EYES_DEBUG) { const c = {}; fr.filter(f => f.p === 'explore').forEach(f => { const k = f.st + ':' + f.wv + ':' + f.why; c[k] = (c[k] || 0) + 1; }); console.log('explore', JSON.stringify(c), JSON.stringify(await page.evaluate(() => ({ cur: window.LowiWorldRegions.current(), mf: window.LowiMistyFlight.state(), pad: window.LowiPad.state() })))); }
        const inside = fr.filter(f => f.p === 'explore' && f.st === 'inside' && f.wv).length;
        if (inside < 15) P.push('exploring inside a world: only ' + inside + ' frames (travel ' + tr + ')');
        if (!shots.length) P.push('no screenshot with her face toward you: ' + snapWhy);
        /* non-GET requests never leave the browser (aborted above); reported, not a failure */
        if (errs.length) P.push('page errors: ' + errs.slice(0, 3).join(' | '));
        console.log(JSON.stringify({ view: v, ok: !P.length, problems: P, frames: j.frames, bodySolidPct: j.bodySolidPct, faceShown: j.faceShown, faceSolid: j.faceSolid, ghostFace: j.ghostFace, adventure: adv, travel: tr, states: j.states, blockedWrites: writes.length, backA: info.backA, shots }));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    console.log(fail ? 'FAIL' : 'PASS');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
