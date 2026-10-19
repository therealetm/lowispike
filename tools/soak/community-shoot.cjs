#!/usr/bin/env node
/* LOWiSPIKE Community shooting soak (Oct 19 2026. Emmanuel: "We were both playing, shooting each other, and then it crashed ...
   in the community section"). Opens the Community galaxy and plays two people shooting each other as fast as the app allows:
   my own shots through the energy joystick (real pointer drags) and LowiEnergy.fire, and a friend's shots at me arriving as
   lowi:energy-shot events (the same path the shared realtime channel uses). Logs JS errors, DOM nodes, listeners, frame loops,
   timers, canvases and GL objects (crash-probe.js), the energy table (balls, effects) and frame gaps.
   Usage: node tools/soak/community-shoot.cjs [--root DIR | --url URL] [--engine webkit|chromium] [--minutes 3] [--check] */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), URL0 = arg('url', ''), ENGINE = arg('engine', 'webkit'), MIN = +arg('minutes', 3), CHECK = !!arg('check', false);
let pw; for (const p of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), '/tmp/pw/node_modules/playwright', 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const PROBE = fs.readFileSync(path.join(__dirname, 'crash-probe.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
let window_hang = null; const sleep = ms => new Promise(r => setTimeout(r, ms)), t0 = Date.now(), el = () => ((Date.now() - t0) / 1000).toFixed(0).padStart(4) + 's', log = (...a) => console.log(el(), ...a);
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = () => { try { const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.auto', 'done');
    if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Soak', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [], settings: { lang: 'en' } })); } catch (e) { } };
(async () => {
    let srv = null, url = URL0; if (!url) { srv = await serve(); url = `http://127.0.0.1:${srv.address().port}/index.html`; }
    const host = new URL(url).host;
    const browser = await pw[ENGINE].launch({ args: ENGINE === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] : [] });
    const dev = ENGINE === 'webkit' ? Object.assign({}, pw.devices['iPhone 13']) : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
    const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
    /* --net 1: the real Supabase is let through so the live crowd shows, but writes to the room are blocked, so the soak
       never posts in Emmanuel's community (19 Oct, 10 PM: a --net soak's energy shots posted '@name sent you energy' lines as 'Soak'). */
    if (arg('net', false)) await ctx.route(/\/rest\/v1\/(messages|posts|reactions|post_likes)/, r => r.request().method() === 'GET' ? r.continue() : r.abort());
    else await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    await ctx.addInitScript(INIT); await ctx.addInitScript({ content: PROBE });
    const page = await ctx.newPage(); const errs = []; let loads = 0, crashed = false;
    page.on('pageerror', e => errs.push({ at: el(), m: (e.message || '').slice(0, 300), st: String(e.stack || '').split('\n').slice(0, 4).join(' | ').slice(0, 500) }));
    page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/404|Failed to load resource|ERR_FAILED|net::|blocked|CORS|supabase|Fetch API|access control/i.test(t)) errs.push({ at: el(), m: 'console: ' + t.slice(0, 300) }); });
    page.on('load', () => { loads++; if (loads > 1) log('RELOAD #' + loads); }); page.on('crash', () => { crashed = true; log('RENDERER CRASHED'); });
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'shoot=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.goTab && document.getElementById('whPad'), null, { timeout: 180000 }).catch(() => log('never ready'));
    await sleep(4000);
    await page.evaluate(() => { (window.goTab)('foryou'); });
    await page.waitForFunction(() => document.getElementById('ceJoy') && window.LowiCgMap && window.LowiCgMap.geom(), null, { timeout: 60000 }).catch(() => log('energy joystick never mounted'));
    await sleep(2500);
    const info = await page.evaluate(() => { const g = window.LowiCgMap.geom(); return { spots: g ? g.spots.length : 0, me: g && (g.spots.find(s => s.me) || {}).uid, friend: g && (g.spots.find(s => !s.me) || {}).uid }; });
    log('engine', ENGINE, 'url', URL0 || 'local', 'galaxy', JSON.stringify(info));
    const snap = async tag => { if (crashed) return null; const s = await page.evaluate(() => { const c = window.__cs && window.__cs.snap ? window.__cs.snap() : {}; const E = window.LowiEnergy, st = E && E.state && E.state();
        return { nodes: document.getElementsByTagName('*').length, lis: c.lis, raf: c.raf, iv: c.iv, to: c.to, canv: document.querySelectorAll('canvas').length, ceFx: document.querySelectorAll('.ce-fx').length, ceJoy: document.querySelectorAll('.ce-joy').length, plus: document.querySelectorAll('.ce-plus').length,
          heap: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, balls: st && st.balls, mode: st && st.mode, fx: E && E.stats ? E.stats() : null, gap: window.__shootGap || 0, frames: window.__shootFrames || 0, place: window.__pl ? { n: window.__pl.n, avg: +(window.__pl.ms / Math.max(1, window.__pl.n)).toFixed(2), max: +window.__pl.max.toFixed(1) } : null, three: c.three, gpuMB: c.gpuMB, ctxAll: c.ctxAll, ctxGL: c.ctxGL, lost: c.lost, long: c.long, wb: document.documentElement.classList.contains('wb-on') }; }).catch(e => ({ evalErr: String(e.message).slice(0, 200) }));
        log(tag.padEnd(10), JSON.stringify(Object.assign(s, { fx: s.fx ? { sent: s.fx.sent, got: s.fx.got, shown: s.fx.shown, dropped: s.fx.dropped } : null }), null, 0), 'errs', errs.length); return s; };
    /* hang watchdog (Chromium): if the page stops answering for 8 s, pause it in the debugger and print where it is stuck */
    if (ENGINE === 'chromium') { const cdp = await ctx.newCDPSession(page); await cdp.send('Debugger.enable'); let hangs = 0;
        cdp.on('Debugger.paused', async ev => { const fr = (ev.callFrames || []).slice(0, 12).map(f => (f.functionName || '(anon)') + ' ' + (f.url || '').split('/').pop() + ':' + (f.location.lineNumber + 1) + ':' + (f.location.columnNumber + 1));
            log('HANG STACK', JSON.stringify(fr)); window_hang = fr; for (const f of (ev.callFrames || []).slice(0, 3)) { try { const sc = f.scopeChain.find(x => x.type === 'local'); if (sc) { const pr = await cdp.send('Runtime.getProperties', { objectId: sc.object.objectId, ownProperties: true }); log('  locals', f.functionName, JSON.stringify(pr.result.slice(0, 25).map(x => x.name + '=' + (x.value && (x.value.value !== undefined ? x.value.value : x.value.description)))).slice(0, 1500)); } } catch (e) { } }
            await cdp.send('Debugger.resume').catch(() => { }); });
        (async () => { while (!crashed) { await sleep(3000); const ok = await Promise.race([page.evaluate(() => 1).then(() => true).catch(() => true), sleep(8000).then(() => false)]); if (!ok && hangs < 3) { hangs++; log('PAGE NOT ANSWERING for 8 s, pausing'); await cdp.send('Debugger.pause').catch(e => log('pause err', e.message)); } } })(); }
    await page.evaluate(() => { let last = 0; window.__shootGap = 0; window.__shootFrames = 0; const f = t => { if (last) window.__shootGap = Math.max(window.__shootGap, t - last); last = t; window.__shootFrames++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await page.evaluate(() => { const m = window.LowiCgMap; window.__pl = { n: 0, ms: 0, max: 0 }; if (m && m.place) { const o = m.place; m.place = function () { const t = performance.now(); try { return o.apply(this, arguments); } finally { const d = performance.now() - t; window.__pl.n++; window.__pl.ms += d; window.__pl.max = Math.max(window.__pl.max, d); } }; } });
    const first = await snap('start'); const rows = [first];
    /* the friend: shoots at me from their spot every 140 ms (the receive cap lets 6 per 2 s through) */
    await page.evaluate(friend => { let n = 0; window.__friendIv = setInterval(() => { const g = window.LowiCgMap.geom(); if (!g) return; const me = g.spots.find(s => s.me), f = g.spots.find(s => s.uid === friend) || g.spots.find(s => !s.me); if (!me || !f) return;
        const a = Math.atan2(me.y - f.y, me.x - f.x) + (Math.random() - .5) * .3; document.dispatchEvent(new CustomEvent('lowi:energy-shot', { detail: { v: 1, id: 'f' + (n++) + Math.random().toString(36).slice(2, 7), by: f.uid, a: +a.toFixed(3), p: .6 + Math.random() * .4, to: Math.random() < .8 ? me.uid : '', ht: 250 + Math.round(Math.random() * 300), t: Date.now() - Math.round(Math.random() * 200) } })); }, 140); }, info.friend);
    const end = Date.now() + MIN * 60000; let k = 0, lastSnap = Date.now();
    while (Date.now() < end && !crashed) {
        k++;
        if (k % 3 === 0) { /* a real drag on the energy joystick, aimed at the friend or anywhere, let go */
            const j = await page.evaluate(() => { const b = document.getElementById('ceJoy'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }).catch(() => null);
            if (j) { const a = Math.random() * 6.283, d = 30 + Math.random() * 30; await page.mouse.move(j.x, j.y); await page.mouse.down(); for (let i = 1; i <= 3; i++) { await page.mouse.move(j.x + Math.cos(a) * d * i / 3, j.y + Math.sin(a) * d * i / 3); await sleep(25); } await page.mouse.up(); }
        } else await page.evaluate(friend => { const g = window.LowiCgMap.geom(); if (!g) return; const me = g.spots.find(s => s.me), f = g.spots.find(s => s.uid === friend); const a = me && f && Math.random() < .7 ? Math.atan2(f.y - me.y, f.x - me.x) : Math.random() * 6.283; window.LowiEnergy.fire(a, .5 + Math.random() * .5); }, info.friend).catch(e => log('fire err', e.message));
        await sleep(120);
        if (Date.now() - lastSnap > 20000) { lastSnap = Date.now(); rows.push(await snap('play')); }
    }
    await page.evaluate(() => clearInterval(window.__friendIv)).catch(() => { });
    await sleep(6000); const last = await snap('settled'); rows.push(last);
    const bad = [];
    if (crashed) bad.push('renderer crashed'); if (window_hang) bad.push('page hung (main thread stuck)'); if (loads > 1) bad.push('page reloaded'); if (errs.length) bad.push(errs.length + ' JS errors');
    if (first && last && !last.evalErr) { if (last.nodes > first.nodes + 60) bad.push('DOM nodes grew ' + first.nodes + ' -> ' + last.nodes); if ((last.lis || 0) > (first.lis || 0) + 40) bad.push('listeners grew ' + first.lis + ' -> ' + last.lis);
        if (last.ceFx > 1 || last.ceJoy > 1) bad.push('energy canvas/joystick duplicated: fx ' + last.ceFx + ' joy ' + last.ceJoy); if (last.canv > first.canv) bad.push('canvases grew ' + first.canv + ' -> ' + last.canv); if (last.balls) bad.push('balls still flying after settle: ' + last.balls); }
    log('ERRORS', JSON.stringify(errs.slice(0, 8), null, 1));
    log('VERDICT', bad.length ? bad.join('; ') : 'clean');
    await browser.close(); if (srv) srv.close(); process.exit(CHECK && bad.length ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });
