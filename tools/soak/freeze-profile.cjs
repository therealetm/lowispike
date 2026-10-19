#!/usr/bin/env node
/* LOWiSPIKE crash squad: profile one world trip in Chromium and name the functions that hold the main thread (a freeze).
   node tools/soak/freeze-profile.cjs [--root DIR | --url URL] [--world brain] [--how map|steer|weak] [--top 40]
   Prints the longest frame gaps during the trip and the self time per function (url:line) inside them. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), WORLD = arg('world', 'brain'), HOW = arg('how', 'map'), TOP = +arg('top', 40);
let pw; for (const p of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), '/tmp/pw/node_modules/playwright', 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    let url = arg('url', ''), srv;
    if (!url) { srv = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(u)] || 'application/octet-stream' }); res.end(b); }); }); await new Promise(r => srv.listen(0, '127.0.0.1', r)); url = `http://127.0.0.1:${srv.address().port}/index.html`; }
    const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
    const host = new URL(url).host;
    await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || u.host === host) return r.continue(); return r.abort(); });
    await ctx.addInitScript(() => { try { const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Soak', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [], settings: { lang: 'en' } })); } catch (e) { }
        window.__gaps = []; let last = 0; (function b() { requestAnimationFrame(t => { if (last && t - last > 300) window.__gaps.push([Math.round(last), Math.round(t - last)]); last = t; b(); }); })(); });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('PAGEERROR', e.message));
    await page.goto(url, { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.LowiWorld3D && window.LowiWorld3D.ready && window.LowiMistyFlight && window.LowiWorldRegions, null, { timeout: 180000 });
    await sleep(6000);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 2000 });
    const prof = async (label, fn) => {
        await page.evaluate(() => { window.__gaps = []; window.__p0 = performance.now(); });
        await cdp.send('Profiler.start');
        await fn();
        const { profile } = await cdp.send('Profiler.stop');
        const gaps = await page.evaluate(() => window.__gaps.slice());
        const p0 = await page.evaluate(() => window.__p0);
        console.log(`\n== ${label}: frame gaps > 300 ms (start ms after trip start, length ms):`, JSON.stringify(gaps.map(g => [g[0] - Math.round(p0), g[1]]).sort((a, b) => b[1] - a[1]).slice(0, 8)));
        /* self time per node, only samples that fell inside a gap > 1 s */
        const byId = new Map(profile.nodes.map(n => [n.id, n]));
        const parent = new Map(); profile.nodes.forEach(n => (n.children || []).forEach(c => parent.set(c, n.id)));
        const big = gaps.filter(g => g[1] > 1000).map(g => [g[0], g[0] + g[1]]);
        const self = new Map(), incl = new Map();
        let t = profile.startTime; // microseconds, performance.now()*1000 timebase? CDP uses monotonic us; compare relatively
        const tsList = []; for (let i = 0; i < profile.samples.length; i++) { t += profile.timeDeltas[i]; tsList.push(t); }
        const pStart = profile.startTime / 1000; // ms
        for (let i = 0; i < profile.samples.length; i++) {
            const tm = tsList[i] / 1000, rel = tm - pStart; const dt = (profile.timeDeltas[i + 1] || 2000) / 1000;
            const inGap = !big.length || big.some(([a, b]) => { const ra = a - p0, rb = b - p0; return rel >= ra - 50 && rel <= rb + 50; });
            if (!inGap) continue;
            const n = byId.get(profile.samples[i]); const cf = n.callFrame; const k = (cf.functionName || '(anon)') + ' ' + (cf.url || '').split('/').pop() + ':' + (cf.lineNumber + 1);
            self.set(k, (self.get(k) || 0) + dt);
            const seen = new Set(); let id = n.id; while (id != null) { const m = byId.get(id); const c = m.callFrame; const kk = (c.functionName || '(anon)') + ' ' + (c.url || '').split('/').pop() + ':' + (c.lineNumber + 1); if (!seen.has(kk)) { seen.add(kk); incl.set(kk, (incl.get(kk) || 0) + dt); } id = parent.get(id); }
        }
        console.log('-- self ms (inside gaps > 1 s)'); [...self].sort((a, b) => b[1] - a[1]).slice(0, TOP).forEach(([k, v]) => console.log(String(Math.round(v)).padStart(7), k));
        console.log('-- inclusive ms'); [...incl].sort((a, b) => b[1] - a[1]).slice(0, TOP).forEach(([k, v]) => console.log(String(Math.round(v)).padStart(7), k));
    };
    await prof('enter ' + WORLD, async () => {
        await page.evaluate(w => window.LowiWorldRegions.travel(w), WORLD);
        await page.waitForFunction(w => window.LowiWorldRegions.current() === w && window.LowiMistyFlight.state().st === 'inside' && !window.LowiWorldRegions.state.busy, WORLD, { timeout: 300000, polling: 500 }).catch(() => console.log('enter timeout'));
        await sleep(3000);
    });
    await prof('leave ' + WORLD + ' (' + HOW + ')', async () => {
        await page.evaluate(how => how === 'weak' ? window.LowiWorldRegions.travel('hub', false, 0, { weak: true }) : window.LowiWorldRegions.travel('hub'), HOW);
        await page.waitForFunction(() => window.LowiWorldRegions.current() === 'hub' && !window.LowiWorldRegions.state.busy && window.LowiMistyFlight.state().st !== 'out', null, { timeout: 300000, polling: 500 }).catch(() => console.log('leave timeout'));
        await sleep(3000);
    });
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
