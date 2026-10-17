#!/usr/bin/env node
/* LOWiSPIKE game soak: drives the real app through the moves that crash or heat the phone and measures each one.
   Usage:  node tools/soak/game-soak.cjs [--root DIR | --url URL] [--engine chromium|webkit] [--out FILE.json] [--quick] [--check]
   --check exits 2 when a budget in tools/soak/budget.cjs is broken.
   Default: serves this repository folder on localhost (service worker blocked, cloud calls blocked) in Chromium.
   Needs Playwright: set PW=/path/to/node_modules/playwright (default ~/.pw/node_modules/playwright).
   Desktop engines only: this is NOT an iPhone. Chromium's software WebGL (SwiftShader) is slow, so absolute frame rates mean
   little; the counts that matter are per-second rates and things that should be zero (loops while hidden, rising live
   GPU objects, DOM rewrites every frame, extra WebGL contexts). See GAME_PERFORMANCE.md for the budgets. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..')));
const URL0 = arg('url', '');
const ENGINE = arg('engine', 'chromium');
const QUICK = !!arg('quick', false);
const OUT = arg('out', '');
const CHECK = !!arg('check', false);
const PW = process.env.PW || path.join(os.homedir(), '.pw/node_modules/playwright');
const pw = require(PW);
const PROBE = fs.readFileSync(path.join(__dirname, 'probe.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.wasm': 'application/wasm' };
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
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n || 5);
function diff(a, b) {
    const sec = Math.max(0.001, (b.t - a.t) / 1000), per = (x, y) => +(((y || 0) - (x || 0)) / sec).toFixed(1);
    const by = (A, B) => { const o = {}; Object.keys(B).forEach(k => { const d = (B[k] || 0) - (A[k] || 0); if (d > 0) o[k] = +(d / sec).toFixed(1); }); return o; };
    const gl = by(a.gl, b.gl), draws = (gl.drawArrays || 0) + (gl.drawElements || 0) + (gl.drawArraysInstanced || 0) + (gl.drawElementsInstanced || 0);
    return {
        seconds: +sec.toFixed(1), rafPerSec: per(a.raf, b.raf), rafBy: top(by(a.rafBy, b.rafBy), 8), hiddenRafPerSec: per(a.hiddenRaf, b.hiddenRaf),
        mutPerSec: per(a.mut, b.mut), mutTextPerSec: per(a.mutText, b.mutText), mutBy: top(by(a.mutBy, b.mutBy), 12),
        glDrawsPerSec: +draws.toFixed(1), glCallsPerSec: gl, glRedundantPerSec: per(a.glRedundant, b.glRedundant),
        texUploadsPerSec: +(((gl.texImage2D || 0) + (gl.texSubImage2D || 0))).toFixed(1), canvasTexUploadsPerSec: gl.texUploadCanvas || 0,
        liveDelta: Object.fromEntries(Object.keys(b.live).map(k => [k, b.live[k] - a.live[k]])), liveNow: b.live,
        ctxMade: b.ctxMade - a.ctxMade, ctxMadeGL: b.ctxMadeGL - a.ctxMadeGL, ctxAliveGL: b.ctxAliveGL, ctxAlive: b.ctxAlive, glBy: b.glBy,
        canvases: b.canvases, nodesDelta: b.nodes - a.nodes, nodes: b.nodes, heapMB: b.heapMB, heapDeltaMB: (b.heapMB != null && a.heapMB != null) ? b.heapMB - a.heapMB : null,
        longTasks: b.longTasks - a.longTasks, longMs: b.longMs - a.longMs,
        writesPerSec: per(a.writes, b.writes), unchangedWritesPerSec: per(a.writeSame, b.writeSame), writers: top(by(a.write || {}, b.write || {}), 12),
        rafByAll: top(by(a.rafBy, b.rafBy), 40)
    };
}
(async () => {
    let srv = null, url = URL0;
    if (!url) { srv = await serve(); url = `http://127.0.0.1:${srv.address().port}/index.html`; }
    const args = ENGINE === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] : [];
    const browser = await pw[ENGINE].launch({ args });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: ENGINE === 'webkit' ? 3 : 1, hasTouch: true, isMobile: ENGINE !== 'webkit' ? true : undefined, serviceWorkers: 'block' });
    await ctx.addInitScript(() => {
        try {
            localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
            if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Soak', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
        } catch (e) { }
    });
    await ctx.addInitScript({ content: PROBE });
    await ctx.route(/supabase\.co|googleapis|gstatic|open-meteo|openfoodfacts/, r => r.abort());
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push('PAGEERR ' + e.message.slice(0, 200)));
    page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load resource|ERR_FAILED|net::/.test(t)) errs.push(t.slice(0, 200)); });
    page.on('crash', () => errs.push('PAGE CRASHED'));
    await page.goto(url, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 60000 });
    await sleep(QUICK ? 5000 : 9000);
    const snap = () => page.evaluate(() => window.__soak.snap());
    const ev = (fn, a) => page.evaluate(fn, a).catch(e => 'ERR ' + e.message.slice(0, 160));
    const results = { engine: ENGINE, url: URL0 || ('local ' + ROOT), when: new Date().toISOString(), scenarios: {} };
    async function measure(name, act, holdMs) {
        const a = await snap();
        const note = act ? await act() : undefined;
        if (holdMs) await sleep(holdMs);
        const b = await snap();
        results.scenarios[name] = Object.assign(diff(a, b), note !== undefined ? { note } : {});
        const r = results.scenarios[name];
        console.log(`${name.padEnd(26)} raf/s ${String(r.rafPerSec).padStart(6)}  mut/s ${String(r.mutPerSec).padStart(7)}  draws/s ${String(r.glDrawsPerSec).padStart(7)}  redundant/s ${String(r.glRedundantPerSec).padStart(6)}  texUp/s ${String(r.texUploadsPerSec).padStart(5)}  liveGL ${JSON.stringify(r.liveDelta)}  glCtx ${r.ctxAliveGL} (+${r.ctxMadeGL})  canv ${r.canvases}  heapΔ ${r.heapDeltaMB}  long ${r.longTasks}`);
    }
    const HOLD = QUICK ? 4000 : 10000;
    await measure('home-idle', null, HOLD);
    await measure('care-board-week', () => ev(() => { if (!window.LowiNavMoves) return 'no LowiNavMoves'; LowiNavMoves.open('lb'); return !!document.getElementById('cmPaneBoard'); }), HOLD);
    await measure('care-board-month', () => ev(() => { const b = document.querySelector('#cmPaneBoard [data-r3lb="m"]') || document.querySelector('[data-r3lb="m"]'); if (!b) return 'no month button'; b.click(); return (b.closest('.r2-seg') || b).innerText.replace(/\s+/g, ' '); }), QUICK ? 6000 : 20000);
    await measure('care-board-month-toggle', async () => { for (let i = 0; i < 10; i++) { await ev(k => { const b = document.querySelector('[data-r3lb="' + k + '"]'); if (b) b.click(); }, i % 2 ? 'm' : 'w'); await sleep(300); } }, 2000);
    await measure('cook-home-nav-x8', async () => { for (let i = 0; i < 8; i++) { await ev(() => goTab('shelf')); await sleep(700); await ev(() => goTab('home')); await sleep(700); } }, 2000);
    await measure('community-open', () => ev(() => goTab('foryou')), HOLD);
    await measure('community-galaxy-zoom-x20', async () => {
        const box = await page.evaluate(() => { const f = document.getElementById('cgField') || document.querySelector('.tab.active'); const r = f.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: f.id }; });
        await page.mouse.move(box.x, box.y);
        for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, i % 2 ? 260 : -260); await sleep(220); }
        return box.id;
    }, 2000);
    await measure('home-community-x6', async () => { for (let i = 0; i < 6; i++) { await ev(() => goTab('home')); await sleep(1100); await ev(() => goTab('foryou')); await sleep(1100); } }, 1000);
    await measure('back-home-idle', () => ev(() => goTab('home')), HOLD);
    await measure('hidden-tab', () => ev(() => {
        window.__soak.fakeHidden = true;
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide'));
    }), QUICK ? 4000 : 8000);
    await ev(() => { window.__soak.fakeHidden = false; delete document.visibilityState; delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pageshow')); });
    await measure('visible-again', null, 4000);
    results.errors = errs.slice(0, 20);
    results.final = await snap().then(s => ({ ctxMadeGL: s.ctxMadeGL, ctxAliveGL: s.ctxAliveGL, glBy: s.glBy, live: s.live, canvases: s.canvases, nodes: s.nodes, heapMB: s.heapMB }));
    console.log('final', JSON.stringify(results.final));
    console.log('errors', JSON.stringify(results.errors));
    if (OUT) fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
    await browser.close(); if (srv) srv.close();
    const broken = require('./budget.cjs').check(results);
    console.log(broken.length ? 'BUDGET BROKEN:\n  - ' + broken.join('\n  - ') : 'budgets: all met');
    if (CHECK && broken.length) process.exit(2);
})().catch(e => { console.error('SOAK FAILED', e); process.exit(1); });
