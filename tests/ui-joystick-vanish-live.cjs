'use strict';
/* Browser check (Oct 19 2026, Emmanuel: "I can still see that the joystick is the old design ... And also with it disappearing"):
   the joystick is the simple white-icon bubble (no inner glass knob or rim) and, after a couple of seconds of steering, it is
   gone completely, still steering, and back the moment the finger lifts. Real pointer input (page.mouse) on #whPad. Per view:
     1. Home at rest: fully there; the knob has no fill, no rim and no ring, the icon is white and about the size of Scan's icon.
     2. Drag: see-through first (.25 to .6, not gone), then after VANISH_MS fully gone (opacity < .03, its 3D membrane too),
        still the element under the finger, still steering (Misty keeps moving while it is invisible). Lift: the vanish ends at once (state and classes), opacity back over the .25 s cross-fade
        (the lift time is logged; software-rendered test browsers run frames late, so it is not a phone timing).
     3. Forward hold past VANISH_MS: gone. Lift: back.
     4. Inside a world (LowiWorldRegions.travel): the same look, a long drag makes it vanish, Misty moves, lift: back.
   Screenshots: OUT/TAG-<view>-rest.png, -knob.png (close-up), -gone.png, -world-gone.png.
   Production Supabase and every non-GET request are blocked; a local fixture session only.
     node tests/ui-joystick-vanish-live.cjs [--root DIR | --url URL] [--out DIR] [--tag after] [--views a,b] [--world liver] [--noworld 1]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/joy-vanish-shots'), TAG = arg('tag', 'run');
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
    let mem = null; try { const l = (window.LowiBubbles && window.LowiBubbles.look()) || []; const j = l.find(x => x.kind === 'joy'); if (j) mem = j.visible === false ? 0 : j.opacity; } catch (er) { }
    let mf = null; try { mf = window.LowiMistyFlight.state().p; } catch (er) { }
    const k = e.querySelector('.mp-knob'), kc = k ? getComputedStyle(k) : null, sv = k && k.querySelector('svg'), sc = sv ? getComputedStyle(sv) : null;
    const ico = document.querySelector('#whHud .o8-cell[data-orbit="scan"] .o8-ico') || document.querySelector('#whHud .o8-cell .o8-ico');
    return { op: +(+cs.opacity).toFixed(2), pe: cs.pointerEvents, top: !!(t && (t === e || e.contains(t))), cls: e.className, mode: e.dataset.mode,
        st: window.LowiPad ? window.LowiPad.state() : {}, mem, lb3d: document.documentElement.classList.contains('lb3d'), r: [r.left, r.top, r.width, r.height].map(Math.round), mf,
        knob: kc ? { bg: kc.backgroundImage, bgc: kc.backgroundColor, border: kc.borderTopStyle + ' ' + kc.borderTopWidth, shadow: kc.boxShadow, color: kc.color, svgW: sv ? Math.round(sv.getBoundingClientRect().width) : 0, stroke: sc ? sc.stroke : '' } : null,
        icoW: ico ? Math.round(ico.getBoundingClientRect().width) : 0,
        html: document.documentElement.className.split(/\s+/).filter(c => /^(wh-away|mf-in|lw-clean|wh-home|o8)/.test(c)).join(' ') };
}
const clear = c => /^rgba\(\d+, \d+, \d+, 0\)$|^transparent$/.test(c);
function knobProblems(s, where) {
    const P = [], k = s.knob;
    if (!k) return [where + ': no knob'];
    if (k.bg !== 'none') P.push(where + ': knob still has a glass fill ' + k.bg.slice(0, 80));
    if (!clear(k.bgc)) P.push(where + ': knob still has a colour fill ' + k.bgc);
    if (!/^none|^hidden| 0px$/.test(k.border)) P.push(where + ': knob still has a rim ' + k.border);
    if (k.shadow !== 'none') P.push(where + ': knob still has a ring / glow ' + k.shadow);
    if (where.indexOf('rest') >= 0 && k.color !== 'rgb(255, 255, 255)') P.push(where + ': icon not white ' + k.color);
    if (s.icoW && Math.abs(k.svgW - s.icoW) > s.icoW * 0.35) P.push(`${where}: icon ${k.svgW}px vs Scan icon ${s.icoW}px`);
    return P;
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host, WORLD = arg('world', 'liver');
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit,ipad_landscape_webkit').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        const writes = [];
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (q.method() !== 'GET') writes.push(q.method() + ' ' + u.host); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [], P = [], S = {};
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        const L = () => page.evaluate(look);
        const back = async (k) => { const t = Date.now(); await page.waitForFunction(() => +getComputedStyle(document.getElementById('whPad')).opacity > 0.95, null, { timeout: 5000, polling: 50 }).catch(() => { }); S[k] = await L(); S[k].ms = Date.now() - t; return S[k]; };
        /* a long drag in small steps: reads the see-through phase at ~0.6 s and the gone phase at ~2.4 s, then keeps steering 1 s while gone */
        /* an in-page sampler (every 40 ms): proves it passes through see-through before it is gone, and how fast it comes back */
        const sample = on => page.evaluate(on => {
            if (!on) { clearInterval(window.__jvT); return window.__jv || []; }
            window.__jv = []; const t0 = performance.now(); const e = document.getElementById('whPad');
            if (window.__jvMo) window.__jvMo.disconnect(); window.__jvM = []; window.__jvMo = new MutationObserver(() => window.__jvM.push(Math.round(performance.now() - t0) + ':' + (e.classList.contains('mp-steer') ? 'S' : '-') + (e.classList.contains('mp-gone') ? 'G' : '-'))); window.__jvMo.observe(e, { attributes: true, attributeFilter: ['class'] });
            const st0 = setTimeout(() => window.__jvM.push('timer500@' + Math.round(performance.now() - t0)), 500);
            window.__jvT = setInterval(() => { const s = window.LowiPad.state(); window.__jv.push({ t: Math.round(performance.now() - t0), op: +(+getComputedStyle(e).opacity).toFixed(2), faded: s.faded, gone: s.gone, held: s.held }); }, 40);
            return true;
        }, on);
        /* a long drag in small steps for ~2.4 s, then 1 s more of steering while it is gone, then lift */
        const longDrag = async (x, y, pre, shot) => {
            await page.mouse.move(x, y); await page.mouse.down(); await sleep(60);
            await sample(true);
            const t0 = Date.now(); let i = 0;
            while (Date.now() - t0 < 2400) { i++; await page.mouse.move(x + 14 + 6 * Math.sin(i / 3), y - 12 + 6 * Math.cos(i / 3)); await sleep(50); }
            await page.waitForFunction(() => +getComputedStyle(document.getElementById('whPad')).opacity < 0.03, null, { timeout: 4000, polling: 50 }).catch(() => { });
            const gone = await L();
            if (shot) await page.screenshot({ path: shot });
            const t1 = Date.now(); while (Date.now() - t1 < 1000) { i++; await page.mouse.move(x - 14, y - 14 + 4 * Math.sin(i / 2)); await sleep(50); }
            /* the 3D membrane eases out per drawn frame; software-rendered worlds draw few frames, so give it up to 4 s, finger still down */
            const tm = Date.now();
            await page.waitForFunction(() => { try { const j = (window.LowiBubbles.look() || []).find(x => x.kind === 'joy'); return !j || !j.visible || j.opacity < 0.05; } catch (e) { return true; } }, null, { timeout: 4000, polling: 50 }).catch(() => { });
            const gone2 = await L(); gone2.memMs = Date.now() - tm;
            await page.mouse.up();
            const upState = await page.evaluate(() => ({ st: window.LowiPad.state(), cls: document.getElementById('whPad').className }));
            const after = await back(pre + 'After');
            const trace = await sample(false);
            const d = gone.mf && gone2.mf ? Math.hypot(gone2.mf[0] - gone.mf[0], gone2.mf[1] - gone.mf[1], gone2.mf[2] - gone.mf[2]) : 0;
            const see = trace.filter(q => q.held && q.faded && !q.gone && q.op < 0.6 && q.op >= 0.25);
            const firstGone = trace.find(q => q.gone);
            if (process.env.JV_TRACE) { console.log(pre, 'classes', JSON.stringify(await page.evaluate(() => window.__jvM))); let last = ''; console.log(pre, trace.filter(q => { const k = q.faded + '/' + q.gone + '/' + q.held; const ch = k !== last; last = k; return ch; }).map(q => q.t + ':' + q.op + ':' + (q.faded ? 'F' : '-') + (q.gone ? 'G' : '-') + (q.held ? 'H' : '-')).join(' ')); }
            S[pre + 'See'] = see.length ? see[0].op : null; S[pre + 'GoneAt'] = firstGone ? firstGone.t : null;
            S[pre + 'Gone'] = gone; S[pre + 'Gone2'] = gone2; S[pre + 'Moved'] = +d.toFixed(3);
            if (!see.length) P.push(pre + ': never see-through (.25 to .6) before it was gone ' + JSON.stringify(trace.slice(0, 40).map(q => q.op)));
            /* VANISH_MS is 1.5 s from the first steering move. Measured from the first see-through sample to the first gone sample;
               the software-rendered test browsers run timers and the sampler late under load (Chromium: a 0.5 s timer fired 0.26 s late with nothing else going on, and up to ~1 s late mid-drag), so 1 to 3.5 s */
            const firstFade = trace.find(q => q.faded), gap = firstGone && firstFade ? firstGone.t - firstFade.t : null;
            S[pre + 'Gap'] = gap;
            if (gap == null || gap < 1000 || gap > 3500) P.push(pre + ': gone ' + gap + ' ms after it went see-through, want ~1.5 s');
            if (!gone.st.gone || !(gone.op < 0.03)) P.push(pre + ': not gone after a couple of seconds ' + JSON.stringify({ op: gone.op, cls: gone.cls }));
            if (!gone.top || gone.pe === 'none') P.push(pre + ': gone joystick no longer under the finger');
            if (gone.mode !== 'drive') P.push(pre + ': not steering while gone, mode ' + gone.mode);
            if (!gone2.st.gone || !(gone2.op < 0.03)) P.push(pre + ': came back while still steering ' + gone2.op);
            if (gone2.lb3d && gone2.mem != null && !(gone2.mem < 0.05)) P.push(pre + ': 3D membrane still drawn while gone ' + gone2.mem);
            if (!(d > 0.02)) P.push(pre + ': Misty did not move while the joystick was gone (' + d + ')');
            if (upState.st.gone || upState.st.faded || /mp-gone|mp-steer/.test(upState.cls)) P.push(pre + ': lift did not end the vanish at once ' + JSON.stringify(upState));
            if (after.st.gone || !(after.op > 0.95)) P.push(pre + ': not back after lifting ' + JSON.stringify({ op: after.op, ms: after.ms }));
        };
        try {
            await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
            await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiPad && document.getElementById('whPad') && document.documentElement.classList.contains('o8'), null, { timeout: 90000 }).catch(() => { });
            await sleep(+arg('wait', 7000));
            S.rest = await L();
            if (S.rest.missing) throw new Error('no #whPad');
            if (!(S.rest.op > 0.95) || !S.rest.top) P.push('Home at rest: not fully there ' + JSON.stringify(S.rest));
            P.push(...knobProblems(S.rest, 'Home rest'));
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-rest.png` });
            const r = S.rest.r, cx = r[0] + r[2] / 2, cy = r[1] + r[3] / 2;
            await page.screenshot({ path: `${OUT}/${TAG}-${v}-knob.png`, clip: { x: Math.max(0, r[0] - 12), y: Math.max(0, r[1] - 12), width: r[2] + 24, height: r[3] + 24 } });
            await longDrag(cx, cy, 'home', `${OUT}/${TAG}-${v}-gone.png`);
            /* forward hold, finger still */
            await sleep(500);
            await page.mouse.move(cx, cy); await page.mouse.down();
            await page.waitForFunction(() => document.getElementById('whPad').classList.contains('mp-fwd'), null, { timeout: 8000, polling: 50 }).catch(() => { });
            S.holdFwd = await L();
            P.push(...knobProblems(S.holdFwd, 'forward hold'));
            await sleep(2600);
            S.hold = await L();
            await page.mouse.up();
            S.holdUp = await page.evaluate(() => window.LowiPad.state());
            await back('holdAfter');
            if (!/mp-fwd/.test(S.hold.cls) || !S.hold.st.gone || !(S.hold.op < 0.03)) P.push('forward hold: not gone ' + JSON.stringify({ op: S.hold.op, cls: S.hold.cls }));
            if (S.holdUp.gone || S.holdUp.faded || S.holdAfter.st.gone || !(S.holdAfter.op > 0.95)) P.push('forward hold lift: not back ' + JSON.stringify({ op: S.holdAfter.op, ms: S.holdAfter.ms }));
            if (!arg('noworld', '')) {
                await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
                await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && window.LowiPad && document.getElementById('whPad') && window.LowiWorldRegions, null, { timeout: 90000 }).catch(() => { });
                await sleep(+arg('wait', 7000));
                const ok = await page.evaluate(w => { try { return !!window.LowiWorldRegions.travel(w); } catch (e) { return false; } }, WORLD);
                await page.waitForFunction(w => { try { return window.LowiWorldRegions.current() === w && document.documentElement.classList.contains('wh-away') && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, WORLD, { timeout: +arg('enter', 150000), polling: 500 }).catch(() => { });
                await sleep(2500);
                S.wRest = await L();
                if (!ok || !/wh-away/.test(S.wRest.html)) P.push('never got inside ' + WORLD + ': travel=' + ok + ' ' + S.wRest.html);
                else {
                    if (!(S.wRest.op > 0.95) || !S.wRest.top) P.push('in world at rest: not fully there ' + JSON.stringify({ op: S.wRest.op, top: S.wRest.top }));
                    P.push(...knobProblems(S.wRest, 'world rest'));
                    const w = S.wRest.r;
                    await longDrag(w[0] + w[2] / 2, w[1] + w[3] / 2, 'world', `${OUT}/${TAG}-${v}-world-gone.png`);
                }
            }
        } catch (e) { P.push('threw: ' + e.message.slice(0, 200)); }
        errs.forEach(e => P.push('page error: ' + e));
        const o = k => S[k] ? S[k].op : '-';
        console.log(`${P.length ? 'FAIL' : 'PASS'} ${v} (${eng}) lb3d=${S.rest && S.rest.lb3d} knob=${S.rest && S.rest.knob ? JSON.stringify({ bg: S.rest.knob.bg.slice(0, 20), border: S.rest.knob.border, shadow: S.rest.knob.shadow, color: S.rest.knob.color, svgW: S.rest.knob.svgW, scanIcoW: S.rest.icoW }) : '-'}` +
            ` | home rest=${o('rest')} seeThrough=${S.homeSee} goneAfterSeeThrough=${S.homeGap}ms gone=${o('homeGone')} membrane=${S.homeGone2 && S.homeGone2.mem}(+${S.homeGone2 && S.homeGone2.memMs}ms) movedWhileGone=${S.homeMoved} lift=${o('homeAfter')}(${S.homeAfter && S.homeAfter.ms}ms)` +
            ` | hold gone=${o('hold')} lift=${o('holdAfter')}(${S.holdAfter && S.holdAfter.ms}ms)` +
            (S.worldGone ? ` | world rest=${o('wRest')} seeThrough=${S.worldSee} goneAfterSeeThrough=${S.worldGap}ms gone=${o('worldGone')} membrane=${S.worldGone2 && S.worldGone2.mem}(+${S.worldGone2 && S.worldGone2.memMs}ms) movedWhileGone=${S.worldMoved} lift=${o('worldAfter')}(${S.worldAfter && S.worldAfter.ms}ms)` : '') + ` blocked writes=${writes.length}`);
        P.slice(0, 30).forEach(p => console.log('   - ' + p));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
