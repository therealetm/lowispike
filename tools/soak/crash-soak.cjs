#!/usr/bin/env node
/* LOWiSPIKE crash soak (crash squad, Oct 19 2026. Emmanuel: "even though I try to fly around and I fly out, the app crashes. Have
   agents play the game, fly around, put it on auto, try to crash it, keep playing until the app completely works.")
   Plays long sessions the way he does and logs what makes iOS Safari kill a tab or a game freeze (tools/soak/crash-probe.js):
   live WebGL objects, three.js geometries / textures / programs, scene objects, graphics contexts, lost contexts, frame loops,
   timers, listeners, DOM nodes, JS heap (Chromium, after a forced GC), long tasks, frame gaps, errors, reloads and renderer crashes.
   Usage:
     node tools/soak/crash-soak.cjs [--root DIR | --url URL] [--engine chromium|webkit] [--plan cycles:30,auto:15,fly:5,life:1]
                                    [--seed 7] [--out FILE.jsonl] [--check]
   Plan steps (run in order, comma separated):
     galaxy:N  N times: push on her bubble's edge until it gives, roam the spirit world 30-60 s (strings, other bubbles), let go
               until she is home
     cycles:N  enter a world and leave it N times (worlds in turn; ways out in turn: steering out with the joystick, World map trip,
               weak trip that the rings pull back, then out). Inside, she is flown around with the joystick for a few seconds.
     auto:M    autopilot (three taps on the joystick) for M minutes: excursions, spirit world, strings, Ant-Man camera
     fly:M     M minutes of real joystick flying on Home: drags in every direction, holds, releases, fly out of her bubble
     life:N    N rounds of: tab hidden / shown, rotate to landscape and back, resize
   --check exits 2 when anything grows across the run (see verdict()) or the page crashed, reloaded or threw.
   Desktop engines are NOT an iPhone: WebKit here is the closest stand-in (iPhone 13 profile), its GL is software and slow. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..')));
const URL0 = arg('url', ''), ENGINE = arg('engine', 'chromium'), OUT = arg('out', ''), CHECK = !!arg('check', false), QUIET = !!arg('quiet', false);
const PLAN = String(arg('plan', 'cycles:30')).split(',').map(s => { const [k, v] = s.split(':'); return { k, v: +(v || 1) }; });
let seed = +arg('seed', 7);
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
let pw; for (const p of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), '/tmp/pw/node_modules/playwright', 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const PROBE = fs.readFileSync(path.join(__dirname, 'crash-probe.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const t0 = Date.now(), el = () => ((Date.now() - t0) / 1000).toFixed(0).padStart(5) + 's';
const log = (...a) => { if (!QUIET) console.log(el(), ...a); };
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(b); });
        });
        s.listen(0, '127.0.0.1', () => r(s));
    });
}
const INIT = () => {
    try {
        const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
        if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Soak', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [], settings: { lang: 'en' } }));
    } catch (e) { }
};

(async () => {
    let srv = null, url = URL0;
    if (!url) { srv = await serve(); url = `http://127.0.0.1:${srv.address().port}/index.html`; }
    const host = new URL(url).host;
    const browser = await pw[ENGINE].launch({ args: ENGINE === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] : [] });
    const dev = ENGINE === 'webkit' ? Object.assign({}, pw.devices['iPhone 13']) : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
    const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    await ctx.addInitScript(INIT);
    await ctx.addInitScript({ content: PROBE });
    const page = await ctx.newPage();
    const errs = [], warns = new Map(); let loads = 0, crashed = false, closed = false;
    page.on('pageerror', e => errs.push({ at: el(), m: (e.message || '').slice(0, 300), st: String(e.stack || '').split('\n').slice(1, 4).join(' | ').slice(0, 400) }));
    page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load resource|ERR_FAILED|net::|blocked|CORS|supabase|Fetch API/i.test(t)) errs.push({ at: el(), m: 'console: ' + t.slice(0, 300) });
        else if (m.type() === 'warning' || /3D world unavailable|context/i.test(t)) { const k = t.slice(0, 200); const w = warns.get(k); if (w) w.n++; else warns.set(k, { n: 1, at: el() }); } });
    page.on('load', () => { loads++; if (loads > 1) log('RELOAD #' + loads); });
    page.on('crash', () => { crashed = true; log('RENDERER CRASHED'); });
    page.on('close', () => { closed = true; });
    const cdp = ENGINE === 'chromium' ? await ctx.newCDPSession(page) : null;
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'soak=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.LowiWorld3D && window.LowiWorld3D.ready && window.LowiMistyFlight && window.LowiWorldRegions && document.getElementById('whPad'), null, { timeout: 180000 }).catch(() => log('never ready'));
    await sleep(6000);
    const build = await page.evaluate(() => fetch('version.json?tb=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => '?'));
    log('engine', ENGINE, 'build', build, 'url', URL0 || 'local ' + ROOT);
    const rows = [];
    /* a main thread that does not answer for 45 s is a frozen game: say so (the page keeps going, we keep waiting) */
    let hung = 0;
    const ev = (fn, a) => { let tm; const t = Date.now(); const p = page.evaluate(fn, a).catch(e => ({ evalErr: String(e.message).slice(0, 200) }));
        return Promise.race([p, new Promise(r => { tm = setTimeout(() => r('__slow'), 45000); })]).then(v => { clearTimeout(tm); if (v !== '__slow') return v; hung++; log('PAGE NOT ANSWERING for 45 s (#' + hung + ')'); return p.then(x => { log('page answered again after ' + Math.round((Date.now() - t) / 1000) + ' s'); return x; }); }); };
    const state = () => ev(() => { const s = window.LowiMistyFlight.state(), R = window.LowiWorldRegions; return { st: s.st, flew: s.flew, cur: R.current(), busy: !!R.state.busy, pad: (window.LowiPad && window.LowiPad.state().pad) || '', lost: !!(window.LowiWorld3D && window.LowiWorld3D.lost), w3: window.LowiWorld3D && window.LowiWorld3D.state }; });
    async function sample(tag, extra) {
        if (crashed || closed) return null;
        let heapGC = null;
        if (cdp) { try { await cdp.send('HeapProfiler.collectGarbage'); const h = await cdp.send('Runtime.getHeapUsage'); heapGC = +(h.usedSize / 1048576).toFixed(1); } catch (e) { } }
        const s = await ev(() => window.__cs.snap());
        const st = await state();
        const row = Object.assign({ at: +((Date.now() - t0) / 1000).toFixed(0), tag, heapGC, loads, errs: errs.length }, s, { state: st }, extra || {});
        rows.push(row); if (OUT) fs.appendFileSync(OUT, JSON.stringify(row) + '\n');
        const th = row.three || {};
        log(tag.padEnd(22), `geo ${th.geo} tex ${th.tex} prog ${th.progs} objs ${th.objs} | glLive ${row.live && Object.values(row.live).join('/')} ctx ${row.ctxGL}/${row.ctxMade} lost ${row.lost} | raf ${row.raf} iv ${row.iv} to ${row.to} lis ${row.lis} nodes ${row.nodes} | heap ${heapGC != null ? heapGC : row.heap} | gap ${row.maxGap} long ${row.long} | ${st.st}/${st.cur}${st.busy ? '*' : ''} ${st.pad} | err ${errs.length} loads ${loads}${row.glCopies && row.glCopies.length ? ' | glCopy ' + row.glCopies.map(c => c.ms + 'ms@' + c.w + 'x' + c.h).join(',') : ''} canvMB ${row.canvMB}`);
        return row;
    }
    const pad = () => ev(() => { const b = document.getElementById('whPad'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 }; });
    /* one joystick gesture: press, drag to (dx, dy) in steps, hold, let go */
    async function drag(dx, dy, holdMs) {
        const p = await pad(); if (!p || p.evalErr) return;
        await page.mouse.move(p.x, p.y); await page.mouse.down();
        for (let i = 1; i <= 4; i++) { await page.mouse.move(p.x + dx * i / 4, p.y + dy * i / 4); await sleep(40); }
        const end = Date.now() + holdMs;
        while (Date.now() < end && !crashed && !closed) { await sleep(Math.min(700, end - Date.now())); const j = (rnd() - 0.5) * 14; await page.mouse.move(p.x + dx + j, p.y + dy - j).catch(() => { }); }
        await page.mouse.up().catch(() => { });
    }
    async function hold(ms) { const p = await pad(); if (!p || p.evalErr) return; await page.mouse.move(p.x, p.y); await page.mouse.down(); await sleep(ms); await page.mouse.up().catch(() => { }); }
    async function taps(n) { const p = await pad(); if (!p || p.evalErr) return; for (let i = 0; i < n; i++) { await page.mouse.click(p.x, p.y); await sleep(120); } }
    async function waitFor(fn, a, ms) { const end = Date.now() + ms; while (Date.now() < end && !crashed && !closed) { const v = await ev(fn, a); if (v === true) return true; await sleep(400); } return false; }
    const outside = () => waitFor(() => { const s = window.LowiMistyFlight.state(), R = window.LowiWorldRegions; return R.current() === 'hub' && !R.state.busy && s.st !== 'warp' && s.st !== 'out' && s.st !== 'inside'; }, null, 240000);
    async function randomFly(ms) {
        const end = Date.now() + ms;
        while (Date.now() < end && !crashed && !closed) {
            const a = rnd() * Math.PI * 2, m = 20 + rnd() * 45, r = rnd();
            if (r < 0.12) await hold(600 + rnd() * 1800); else if (r < 0.18) await taps(2); else await drag(Math.cos(a) * m, Math.sin(a) * m, 400 + rnd() * 2600);
            await sleep(100 + rnd() * 500);
        }
    }
    const ROUTE = await ev(() => window.LowiWorldRegions.ROUTE.slice());
    await sample('start');
    let cyc = 0;
    for (const step of PLAN) {
        if (crashed || closed) break;
        if (step.k === 'cycles') {
            for (let i = 0; i < step.v && !crashed && !closed; i++, cyc++) {
                const w = ROUTE[cyc % ROUTE.length], how = ['steer', 'map', 'weak'][cyc % 3];
                const ts = Date.now();
                await ev(w => window.LowiWorldRegions.travel(w), w);
                const inOk = await waitFor(w => { try { return window.LowiWorldRegions.current() === w && window.LowiMistyFlight.state().st === 'inside'; } catch (e) { return false; } }, w, 240000);
                if (!inOk) { log('cycle', cyc, w, 'never got inside', JSON.stringify(await state())); await sample('stuck-in ' + w); await ev(() => window.LowiWorldRegions.travel('hub')); await outside(); continue; }
                const tIn = Date.now() - ts; log(`  in ${w} after ${Math.round(tIn / 1000)} s, flying, then out by ${how}`);
                await randomFly(3000 + rnd() * 3000);
                const te = Date.now();
                if (how === 'steer') {
                    /* fly out the way he does: push the joystick one way and hold until she is out (or 90 s) */
                    /* he looks for a clear gap in the cloud wall: try one way for a while, then turn */
                    let a = rnd() * Math.PI * 2, out = false; const end = Date.now() + 150000;
                    while (!out && Date.now() < end && !crashed && !closed) { await drag(Math.cos(a) * 60, Math.sin(a) * 60, 6000); const s = await state(); out = s.st !== 'inside' || s.cur !== w; a += 1.1; }
                    if (!out) { log('cycle', cyc, w, 'steering never got her out, using the map'); await ev(() => window.LowiWorldRegions.travel('hub')); }
                } else if (how === 'weak') {
                    await ev(() => { window.__csSun = window.LowiSun && window.LowiSun.energyNow; window.LowiSun = window.LowiSun || {}; window.LowiSun.energyNow = () => ({ value: 0.2 }); window.LowiWorldRegions.travel('hub', false, 0, { weak: true }); });
                    await waitFor(w => { const R = window.LowiWorldRegions; return !R.state.busy && R.current() === w && window.LowiMistyFlight.state().st === 'inside'; }, w, 240000);
                    await ev(() => { if (window.__csSun) window.LowiSun.energyNow = window.__csSun; });
                    await sleep(1500); await ev(() => window.LowiWorldRegions.travel('hub'));
                } else await ev(() => window.LowiWorldRegions.travel('hub', false, 0, { wide: true }));
                log('  out request done', JSON.stringify(await state()));
                const outOk = await outside();
                if (!outOk) log('cycle', cyc, w, 'never got back out', JSON.stringify(await state()));
                await sleep(1500);
                await sample(`cycle ${cyc} ${w} ${how}`, { tIn, tOut: Date.now() - te });
            }
        } else if (step.k === 'auto') {
            await taps(3); await sleep(800);
            const s0 = await state(); if (s0.pad !== 'auto') { log('autopilot did not start, pad=' + s0.pad + '; trying Enter'); await ev(() => { const b = document.getElementById('whPad'); b.focus(); b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }); }
            await ev(() => { try { window.LowiMistyExplore.X.FIRST = 4; window.LowiMistyExplore.X.EVERY = 8; } catch (e) { } });
            const end = Date.now() + step.v * 60000; let k = 0;
            while (Date.now() < end && !crashed && !closed) {
                await sleep(15000);
                const x = await ev(() => { try { const e = window.LowiMistyExplore.state(); return { ex: e.step || e.st || e.mode, pov: window.LowiStringPov && window.LowiStringPov.cam ? !!window.LowiStringPov.cam() : null }; } catch (er) { return null; } });
                await sample(`auto ${++k}`, { ex: x });
            }
            await taps(3); await sleep(1000);
            await sample('auto off');
        } else if (step.k === 'fly') {
            const end = Date.now() + step.v * 60000; let k = 0;
            while (Date.now() < end && !crashed && !closed) { await randomFly(20000); await sample(`fly ${++k}`); }
        } else if (step.k === 'galaxy') {
            /* fly out of her own bubble into the spirit world (push on the edge until it gives), roam, get carried by strings,
               push into other bubbles, then let go and she comes home by herself */
            for (let i = 0; i < step.v && !crashed && !closed; i++) {
                await outside();
                let a = rnd() * Math.PI * 2, on = false; const end = Date.now() + 120000;
                while (!on && Date.now() < end && !crashed && !closed) {
                    await ev(() => window.LowiMistyGalaxy && window.LowiMistyGalaxy._probe(0.97));
                    await drag(Math.cos(a) * 60, Math.sin(a) * 60, 8000);
                    on = await ev(() => !!(window.LowiMistyGalaxy && window.LowiMistyGalaxy.state().on));
                    if (!on) a += 0.7;
                }
                if (!on) { log('galaxy', i, 'never broke out'); await sample(`galaxy ${i} no-breakout`); continue; }
                await randomFly(30000 + rnd() * 30000);
                const gs = await ev(() => window.LowiMistyGalaxy.state());
                await waitFor(() => !window.LowiMistyGalaxy.state().on && window.LowiMistyFlight.state().st !== 'warp', null, 150000);
                await sleep(1500);
                await sample(`galaxy ${i}`, { gs });
            }
        } else if (step.k === 'life') {
            for (let i = 0; i < step.v && !crashed && !closed; i++) {
                await ev(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });
                await sleep(3000);
                await ev(() => { delete document.visibilityState; delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pageshow')); });
                await sleep(2000);
                const vp = page.viewportSize();
                await page.setViewportSize({ width: vp.height, height: vp.width }); await sleep(2500);
                await randomFly(4000);
                await page.setViewportSize(vp); await sleep(2500);
                for (let j = 0; j < 4; j++) { await page.setViewportSize({ width: vp.width - 20 * j, height: vp.height - 30 * j }); await sleep(300); }
                await page.setViewportSize(vp); await sleep(2000);
                await sample(`life ${i}`);
            }
        }
    }
    await sample('end');
    const v = verdict(rows);
    const summary = { engine: ENGINE, build, hung, url: URL0 || 'local', plan: arg('plan', 'cycles:30'), seed: +arg('seed', 7), seconds: Math.round((Date.now() - t0) / 1000), loads, crashed, errors: errs.slice(0, 20), warnings: [...warns].map(([k, w]) => w.n + 'x ' + k).slice(0, 15), verdict: v };
    console.log('SUMMARY ' + JSON.stringify(summary, null, 1));
    if (OUT) fs.writeFileSync(OUT.replace(/\.jsonl$/, '') + '.summary.json', JSON.stringify(summary, null, 1));
    await browser.close().catch(() => { }); if (srv) srv.close();
    process.exit(CHECK && (v.problems.length || crashed || loads > 1 || errs.length) ? 2 : 0);
})().catch(e => { console.error('SOAK FAILED', e); process.exit(1); });

/* growth between the first settled sample of a kind and the last one: a leak is a count that keeps rising with every cycle */
function verdict(rows) {
    const problems = [], growth = {};
    const good = rows.filter(r => r && r.three && !r.three.err);
    const cyc = good.filter(r => /^cycle /.test(r.tag));
    const pick = (a, f) => a.map(f).filter(x => x != null && !isNaN(x));
    function trend(name, f, slack) {
        if (cyc.length < 6) return;
        const base = cyc.slice(2, 4), last = cyc.slice(-2);
        const b = Math.max(...pick(base, f)), l = Math.min(...pick(last, f));
        growth[name] = [b, l];
        if (l - b > slack) problems.push(`${name} grew ${b} -> ${l} over ${cyc.length - 3} world cycles`);
    }
    trend('geometries', r => r.three.geo, 2); trend('textures', r => r.three.tex, 2); trend('programs', r => r.three.progs, 1); trend('sceneObjects', r => r.three.objs, 4);
    trend('glTextures', r => r.live.tex, 2); trend('glBuffers', r => r.live.buf, 6); trend('glPrograms', r => r.live.prog, 1); trend('glFramebuffers', r => r.live.fb, 1);
    trend('intervals', r => r.iv, 1); trend('listeners', r => r.lis, 3); trend('rafPerSec', r => r.raf, 25); trend('domNodes', r => r.nodes, 40); trend('heapMB', r => r.heapGC, 6);
    const maxCtx = Math.max(0, ...good.map(r => r.ctxGL)); if (maxCtx > 2) problems.push('live WebGL contexts reached ' + maxCtx);
    const lost = Math.max(0, ...good.map(r => r.lost)); if (lost) problems.push('webglcontextlost fired ' + lost + ' times on the live canvas');
    const last = good[good.length - 1]; if (last) growth.ctxBy = last.ctxBy;
    const gaps = good.flatMap(r => r.gaps || []); if (gaps.length) growth.frameGaps = gaps.slice(-10);
    return { problems, growth, samples: rows.length };
}
