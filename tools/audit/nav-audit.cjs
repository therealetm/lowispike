#!/usr/bin/env node
/* LOWiSPIKE audit: repeats the flows the user crashed on (Move > Care board week/month, Cook, Community zoom, hide/resume)
   for many laps and reports what keeps growing per lap: DOM nodes, live intervals, net listeners, live observers, canvases,
   contexts made, JS heap, errors. Growth that never levels off is how a long iPhone session ends in
   "A problem repeatedly occurred" (WebKit kills the tab when memory runs out).

   ISOLATION (built in, not optional): the page may only load from the local static server (or, with --url, GET the
   live Pages assets). Every other request is aborted and logged, including all of *.supabase.co, so no profile, message
   or row can reach production. Non-GET requests are always aborted. Service workers are blocked.

   Usage: node tools/audit/nav-audit.cjs [--engine chromium|webkit] [--laps 12] [--url https://therealetm.github.io/lowispike/] [--out f.json]
   Desktop engines only: NOT an iPhone; heat and real iOS memory limits need the phone. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..')));
const URL0 = arg('url', ''), ENGINE = arg('engine', 'chromium'), LAPS = +arg('laps', 12), OUT = arg('out', '');
const PW = process.env.PW || '/tmp/pw/node_modules/playwright';
const pw = require(PW);
const PROBE = fs.readFileSync(path.join(__dirname, 'probe.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg' };
function serve() {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
        });
        s.listen(0, '127.0.0.1', () => r(s));
    });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    let srv = null, url = URL0;
    if (!url) { srv = await serve(); url = `http://127.0.0.1:${srv.address().port}/index.html`; }
    const allowHost = new URL(url).host;
    const args = ENGINE === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] : [];
    const browser = await pw[ENGINE].launch({ args });
    const dev = ENGINE === 'webkit' ? Object.assign({}, pw.devices['iPhone 13']) : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true };
    const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
    const blocked = {};
    await ctx.route('**/*', r => {
        const q = r.request(), u = new URL(q.url());
        const ok = (u.protocol === 'data:' || u.protocol === 'blob:') || (u.host === allowHost && q.method() === 'GET');
        if (ok) return r.continue();
        const k = q.method() + ' ' + u.host + (/supabase/.test(u.host) ? u.pathname.split('/').slice(0, 4).join('/') : '');
        blocked[k] = (blocked[k] || 0) + 1; return r.abort();
    });
    await ctx.addInitScript(() => {
        try {
            localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
            if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Audit', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
        } catch (e) { }
    });
    await ctx.addInitScript({ content: PROBE });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 220)));
    page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load resource|ERR_FAILED|net::|blocked|aborted|Load failed|Failed to fetch|NetworkError/i.test(t)) errs.push('CONSOLE ' + t.slice(0, 220)); });
    page.on('crash', () => errs.push('PAGE CRASHED'));
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
    await sleep(8000);
    const ev = (fn, a) => page.evaluate(fn, a).catch(e => 'ERR ' + e.message.slice(0, 160));
    const snap = async () => { await ev(() => { if (window.gc) window.gc(); }); return page.evaluate(() => window.__audit.snap()); };
    const tap = async sel => { const h = await page.$(sel); if (!h) return false; try { await h.click({ timeout: 2500 }); return true; } catch (e) { return 'click failed: ' + e.message.split('\n')[0].slice(0, 120); } };
    const notes = {};
    const note = (k, v) => { if (v !== true && v !== undefined) notes[k] = notes[k] || v; };
    async function lap(i) {
        note('home', await ev(() => goTab('home'))); await sleep(900);
        /* Move > Care board, week then month a few times (the user's crash path) */
        note('move', await ev(() => goTab('move'))); await sleep(900);
        note('careOpen', await ev(() => { if (!window.LowiNavMoves) return 'no LowiNavMoves'; LowiNavMoves.open('lb'); return true; })); await sleep(900);
        for (let k = 0; k < 4; k++) { note('careToggle', await tap(`[data-r3lb="${k % 2 ? 'w' : 'm'}"]`)); await sleep(350); }
        await sleep(600);
        note('careClose', await ev(() => { try { LowiNavMoves.show('lb', false); return true; } catch (e) { return 'close ' + e.message; } })); await sleep(500);
        /* Cook */
        note('cook', await ev(() => goTab('shelf'))); await sleep(1200);
        /* Community galaxy zoom in/out */
        note('community', await ev(() => goTab('foryou'))); await sleep(1500);
        const box = await page.evaluate(() => { const f = document.getElementById('cgField') || document.querySelector('#tab-foryou'); const r = f.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }).catch(() => null);
        if (box && ENGINE !== 'webkit') { await page.mouse.move(box.x, box.y); for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, k % 2 ? 300 : -300); await sleep(200); } }
        else if (box) { for (let k = 0; k < 6; k++) { await ev(([x, y, d]) => { const el = document.elementFromPoint(x, y); if (el) el.dispatchEvent(new WheelEvent('wheel', { deltaY: d, clientX: x, clientY: y, bubbles: true, cancelable: true })); }, [box.x, box.y, k % 2 ? 300 : -300]); await sleep(200); } }
        await sleep(800);
        /* hide and resume once per lap */
        await ev(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide')); });
        await sleep(600);
        await ev(() => { delete document.visibilityState; delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); });
        await sleep(600);
        note('homeEnd', await ev(() => goTab('home'))); await sleep(1500);
    }
    const samples = [await snap()];
    for (let i = 0; i < LAPS; i++) { await lap(i); samples.push(await snap()); const s = samples[samples.length - 1]; console.log(`lap ${String(i + 1).padStart(2)} nodes ${s.nodes} intervals ${s.intervalsLive} listenersNet ${s.listenersNet} obs ${JSON.stringify(s.observersLive)} canv ${s.canvases} ctxMade ${s.ctxMade} styles ${s.styleTags} heap ${s.heapMB} errs ${s.errors.length}+${s.rejections.length}`); }
    /* growth per lap after a 2-lap warm-up, and whether it is still rising in the last third */
    const W = Math.min(2, LAPS - 1), a = samples[W], z = samples[samples.length - 1], n = samples.length - 1 - W;
    const keys = ['nodes', 'intervalsLive', 'listenersNet', 'canvases', 'ctxMade', 'heapMB', 'styleTags', 'imgs'];
    const per = {}; keys.forEach(k => { if (z[k] != null && a[k] != null) per[k] = +((z[k] - a[k]) / n).toFixed(2); });
    const obsPer = {}; Object.keys(z.observersLive).forEach(k => obsPer[k] = +((z.observersLive[k] - a.observersLive[k]) / n).toFixed(2));
    const third = samples[Math.max(W, samples.length - 1 - Math.ceil(n / 3))], lateKeys = {};
    keys.forEach(k => { if (z[k] != null && third[k] != null) lateKeys[k] = z[k] - third[k]; });
    const lisGrow = {}; Object.keys(z.listenersTop).forEach(k => { const d = z.listenersTop[k] - (a.listenersTop[k] || 0); if (d > 0) lisGrow[k] = d; });
    const intGrow = {}; Object.keys(z.intervalsBy).forEach(k => { const d = z.intervalsBy[k] - (a.intervalsBy[k] || 0); if (d > 0) intGrow[k] = d; });
    const ctxGrow = {}; Object.keys(z.ctxBy).forEach(k => { const d = z.ctxBy[k] - (a.ctxBy[k] || 0); if (d > 0) ctxGrow[k] = d; });
    const result = { engine: ENGINE, url: URL0 || 'local ' + ROOT, laps: LAPS, when: new Date().toISOString(), perLapAfterWarmup: per, observersPerLap: obsPer, riseInLastThird: lateKeys, windowListenerGrowth: lisGrow, intervalGrowth: intGrow, contextGrowth: ctxGrow, notes, blockedRequests: blocked, pageErrors: [...new Set(errs)].slice(0, 25), probeErrors: [...new Set(z.errors)].slice(0, 15), rejections: [...new Set(z.rejections)].slice(0, 15), first: samples[0], last: Object.assign({}, z, { listenersTop: undefined }) };
    console.log(JSON.stringify({ perLapAfterWarmup: per, observersPerLap: obsPer, riseInLastThird: lateKeys, windowListenerGrowth: lisGrow, intervalGrowth: intGrow, contextGrowth: ctxGrow, notes, blockedRequests: blocked, pageErrors: result.pageErrors, rejections: result.rejections }, null, 1));
    if (OUT) fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error('AUDIT FAILED', e); process.exit(1); });
