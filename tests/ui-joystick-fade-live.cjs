'use strict';
/* Browser check: the joystick fades while you steer, keeps working, and comes back afterwards (Oct 18 2026, Emmanuel's Home handoff,
   "Joystick: fades while you steer but keeps working, comes back afterwards"). Real pointer input (page.mouse) on #whPad.
   Per view:
     1. Home at rest: the joystick is fully there (computed opacity ~1).
     2. Drag it: it turns see-through (opacity well under 1, never under .25), it is still the element under the finger, it
        steers (data-mode drive), and with the 3D world its membrane (LowiBubbles kind 'joy') fades with it. Lift: fully back.
     3. Hold it still (forward): it fades once the hold runs (mp-fwd). Lift: back.
     4. A plain tap: never fades.
     5. Mid-drag a pointercancel, and mid-drag the window losing focus: back at once.
     6. Inside a world (LowiWorldRegions.travel, as the World map does): a drag fades it, Misty moves, lift: back.
     7. (first view only) reduced motion: same fade; more contrast: a lighter fade (~.7).
   Screenshots: OUT/TAG-<view>-steer.png (faded, mid-drag), -rest.png, -world-steer.png.
   Production Supabase and every non-GET request are blocked; a local fixture session only.
     node tests/ui-joystick-fade-live.cjs [--root DIR | --url URL] [--out DIR] [--tag after] [--views a,b] [--world liver] [--noworld 1]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/joy-fade-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u);
            if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res);
        }).listen(0, '127.0.0.1', () => r(s));
    });
}
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD], ipad_chromium: ['chromium', IPAD] };
const INIT = fs.readFileSync(path.join(__dirname, 'home-orbit-v2-live.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;/)[1];

/* in the page: the joystick as a finger and an eye meet it */
function look() {
    const e = document.getElementById('whPad'); if (!e) return { missing: true };
    const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    let mem = null; try { const l = (window.LowiBubbles && window.LowiBubbles.look()) || []; const j = l.find(x => x.kind === 'joy'); if (j) mem = j.opacity; } catch (er) { }
    let mf = null; try { const s = window.LowiMistyFlight.state(); mf = s.p; } catch (er) { }
    return { op: +(+cs.opacity).toFixed(2), pe: cs.pointerEvents, top: !!(t && (t === e || e.contains(t))), cls: e.className, mode: e.dataset.mode, faded: !!(window.LowiPad && window.LowiPad.state().faded),
        mem, lb3d: document.documentElement.classList.contains('lb3d'), r: [r.left, r.top, r.width, r.height].map(Math.round), mf,
        html: document.documentElement.className.split(/\s+/).filter(c => /^(wh-away|mf-in|lw-clean|wh-home|o8)/.test(c)).join(' ') };
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host, WORLD = arg('world', 'liver');
    let fail = 0, first = true;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit,ipad_landscape_webkit,ipad_chromium').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        const writes = [];
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (q.method() !== 'GET') writes.push(q.method() + ' ' + u.host); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [], P = [], S = {};
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiPad && document.getElementById('whPad'), null, { timeout: 90000 }).catch(() => { });
            await page.waitForFunction(() => document.documentElement.classList.contains('o8'), null, { timeout: 60000 }).catch(() => { });
            await sleep(+arg('wait', 7000));
            const L = () => page.evaluate(look);
            /* the software-rendered test browsers can run a frame or two behind: give a fade up to 5 s to land, and log how long */
            const dim = () => page.waitForFunction(() => +getComputedStyle(document.getElementById('whPad')).opacity < 0.6, null, { timeout: 5000, polling: 100 }).catch(() => { });
            const back = async (k) => { const t = Date.now(); await page.waitForFunction(() => +getComputedStyle(document.getElementById('whPad')).opacity > 0.95, null, { timeout: 5000, polling: 100 }).catch(() => { }); S[k] = await L(); S[k].ms = Date.now() - t; return S[k]; };
            /* 1. at rest */
            S.rest = await L();
            if (S.rest.missing) throw new Error('no #whPad');
            if (!(S.rest.op > 0.95) || !S.rest.top) P.push('Home at rest: joystick not fully there ' + JSON.stringify(S.rest));
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-rest.png` });
            const box = () => { const r = S.rest.r; return [r[0] + r[2] / 2, r[1] + r[3] / 2]; };
            const [cx, cy] = box();
            /* 2. drag */
            await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(60);
            for (let i = 1; i <= 6; i++) { await page.mouse.move(cx + i * 4, cy - i * 3); await sleep(40); }
            await sleep(300); await dim();
            S.drag = await L();
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-steer.png` });
            await page.mouse.move(cx + 30, cy - 10); await sleep(60);
            S.drag2 = await L();
            await page.mouse.up(); await sleep(300);
            await back('after');
            if (!S.drag.faded || !(S.drag.op < 0.6) || !(S.drag.op >= 0.25)) P.push('drag: not see-through (want .25 to .6) ' + JSON.stringify(S.drag));
            if (!S.drag.top || S.drag.pe === 'none') P.push('drag: faded joystick no longer under the finger ' + JSON.stringify(S.drag));
            if (S.drag.mode !== 'drive') P.push('drag: did not steer, mode ' + S.drag.mode);
            if (!S.drag2.faded) P.push('drag: fade dropped while still steering');
            if (S.drag.lb3d && S.drag.mem != null && S.rest.mem != null && !(S.drag.mem < S.rest.mem - 0.2)) P.push(`drag: 3D membrane did not fade with it (${S.rest.mem} -> ${S.drag.mem})`);
            if (S.after.faded || !(S.after.op > 0.95)) P.push('lift: did not come back ' + JSON.stringify(S.after));
            /* 3. forward hold */
            await page.mouse.move(cx, cy); await page.mouse.down();
            await page.waitForFunction(() => document.getElementById('whPad').classList.contains('mp-fwd'), null, { timeout: 8000, polling: 50 }).catch(() => { });
            await sleep(300); await dim();
            S.hold = await L();
            await page.mouse.up(); await sleep(300);
            await back('holdAfter');
            if (!/mp-fwd/.test(S.hold.cls) || !S.hold.faded || !(S.hold.op < 0.6)) P.push('forward hold: not faded ' + JSON.stringify(S.hold));
            if (S.holdAfter.faded || !(S.holdAfter.op > 0.95)) P.push('forward hold lift: not back ' + JSON.stringify(S.holdAfter));
            /* 4. a plain tap (then wait out the tap window) */
            await sleep(500);
            await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(60);
            S.tap = await L();
            await page.mouse.up(); await sleep(200);
            S.tap2 = await L();
            if (S.tap.faded || S.tap2.faded || !(S.tap2.op > 0.9)) P.push('tap: faded ' + JSON.stringify([S.tap, S.tap2]));
            await sleep(900);
            /* 5a. pointercancel mid-drag */
            await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(60);
            for (let i = 1; i <= 5; i++) { await page.mouse.move(cx - i * 4, cy - i * 3); await sleep(40); }
            const fc = (await L()).faded;
            await page.evaluate(() => { const p = document.getElementById('whPad'); p.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, pointerType: 'mouse', bubbles: true })); });
            await sleep(300);
            await back('cancel');
            await page.mouse.up(); await sleep(400);
            if (!fc) P.push('cancel check: the drag did not fade first');
            if (S.cancel.faded || !(S.cancel.op > 0.95)) P.push('pointercancel: not back ' + JSON.stringify(S.cancel));
            /* 5b. the window losing focus mid-drag */
            await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(60);
            for (let i = 1; i <= 5; i++) { await page.mouse.move(cx + i * 4, cy + i * 2); await sleep(40); }
            const fb = (await L()).faded;
            await page.evaluate(() => window.dispatchEvent(new Event('blur')));
            await sleep(300);
            await back('blur');
            await page.mouse.up(); await sleep(500);
            if (!fb) P.push('blur check: the drag did not fade first');
            if (S.blur.faded || !(S.blur.op > 0.95)) P.push('window blur: not back ' + JSON.stringify(S.blur));
            /* 7. reduced motion / more contrast (first view) */
            if (first) {
                await page.emulateMedia({ reducedMotion: 'reduce' });
                await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(60);
                for (let i = 1; i <= 6; i++) { await page.mouse.move(cx + i * 4, cy - i * 3); await sleep(40); }
                await sleep(500); S.rm = await L(); await page.mouse.up(); await sleep(300); await back('rmAfter');
                if (!S.rm.faded || !(S.rm.op < 0.6) || S.rmAfter.faded || !(S.rmAfter.op > 0.95)) P.push('reduced motion: ' + JSON.stringify([S.rm.op, S.rmAfter.op]));
                await page.emulateMedia({ reducedMotion: 'no-preference', contrast: 'more' });
                await sleep(400);
                await page.mouse.move(cx, cy); await page.mouse.down(); await sleep(60);
                for (let i = 1; i <= 6; i++) { await page.mouse.move(cx + i * 4, cy - i * 3); await sleep(40); }
                await sleep(600); S.hc = await L(); await page.mouse.up(); await sleep(600);
                if (!(S.hc.op > 0.6 && S.hc.op < 0.8)) P.push('more contrast: want a lighter fade (~.7), got ' + S.hc.op);
                await page.emulateMedia({ contrast: 'no-preference' });
                await sleep(1500);
            }
            /* 6. inside a world */
            if (!arg('noworld', '')) {
                /* fresh load: the Home steering above may have flown Misty out of her bubble, and the World map waits for her */
                await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
                await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiPad && document.getElementById('whPad') && window.LowiWorldRegions, null, { timeout: 90000 }).catch(() => { });
                await sleep(+arg('wait', 7000));
                const ok = await page.evaluate(w => { try { return !!window.LowiWorldRegions.travel(w); } catch (e) { return false; } }, WORLD);
                await page.waitForFunction(w => { try { return window.LowiWorldRegions.current() === w && document.documentElement.classList.contains('wh-away') && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, WORLD, { timeout: +arg('enter', 150000), polling: 500 }).catch(() => { });
                await sleep(2500);
                S.wRest = await L();
                if (!ok || !/wh-away/.test(S.wRest.html)) P.push('never got inside ' + WORLD + ': travel=' + ok + ' ' + JSON.stringify(await page.evaluate(() => { try { return { cur: window.LowiWorldRegions.current(), st: window.LowiMistyFlight.state().st, html: document.documentElement.className.split(/\s+/).filter(c => /^(wh-|mf-|lw-)/.test(c)).join(' ') }; } catch (e) { return e.message; } })));
                else {
                    if (!(S.wRest.op > 0.95) || !S.wRest.top) P.push('in world at rest: joystick not fully there ' + JSON.stringify(S.wRest));
                    const r = S.wRest.r, wx = r[0] + r[2] / 2, wy = r[1] + r[3] / 2, p0 = S.wRest.mf;
                    await page.mouse.move(wx, wy); await page.mouse.down();
                    for (let i = 1; i <= 8; i++) { await page.mouse.move(wx + 3 * i, wy - 3 * i); await sleep(60); }
                    await sleep(400); await dim(); /* read before misty-pad.js VANISH_MS (Oct 19: then it is gone, tests/ui-joystick-vanish-live.cjs) */
                    S.wDrag = await L();
                    await page.screenshot({ path: `${OUT}/${TAG}-${v}-world-steer.png` });
                    await page.mouse.up(); await sleep(300);
                    await back('wAfter');
                    const d = p0 && S.wDrag.mf ? Math.hypot(S.wDrag.mf[0] - p0[0], S.wDrag.mf[1] - p0[1], S.wDrag.mf[2] - p0[2]) : 0;
                    S.wMoved = +d.toFixed(3);
                    if (!S.wDrag.faded || !(S.wDrag.op < 0.6) || !(S.wDrag.op >= 0.25)) P.push('in world drag: not see-through ' + JSON.stringify(S.wDrag));
                    if (!S.wDrag.top || S.wDrag.pe === 'none') P.push('in world drag: not under the finger ' + JSON.stringify(S.wDrag));
                    if (!(d > 0.02)) P.push('in world drag: Misty did not move (' + d + ')');
                    if (S.wAfter.faded || !(S.wAfter.op > 0.95)) P.push('in world lift: not back ' + JSON.stringify(S.wAfter));
                }
            }
        } catch (e) { P.push('threw: ' + e.message.slice(0, 200)); }
        errs.forEach(e => P.push('page error: ' + e));
        const o = k => S[k] ? S[k].op : '-';
        console.log(`${P.length ? 'FAIL' : 'PASS'} ${v} (${eng}) lb3d=${S.rest && S.rest.lb3d} opacity rest=${o('rest')} drag=${o('drag')} lift=${o('after')}(${S.after && S.after.ms}ms) hold=${o('hold')} holdLift=${o('holdAfter')} tap=${o('tap2')} cancel=${o('cancel')}(${S.cancel && S.cancel.ms}ms) blur=${o('blur')}(${S.blur && S.blur.ms}ms) holdLiftMs=${S.holdAfter && S.holdAfter.ms}` +
            ` membrane rest=${S.rest && S.rest.mem} drag=${S.drag && S.drag.mem}` + (S.rm ? ` reducedMotion drag=${S.rm.op} lift=${S.rmAfter.op} moreContrast drag=${S.hc && S.hc.op}` : '') +
            (S.wDrag ? ` | world rest=${o('wRest')} drag=${o('wDrag')} lift=${o('wAfter')} mistyMoved=${S.wMoved}` : '') + ` blocked writes=${writes.length}`);
        P.slice(0, 30).forEach(p => console.log('   - ' + p));
        if (P.length) fail++;
        first = false;
        await browser.close();
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
