/* Copied 20 Oct 2026 09:30 from tools/sim (task f26091fa, branch chat-sim-20261020) for the parallel regression workers; keep in sync. */
/* Shared launcher for the item 31 simulation runs: the real app from a local folder (or a URL), an iPhone 13 WebKit or a
   mobile Chromium, the fake Supabase (mock-cloud.cjs), the crash probe (tools/soak/crash-probe.js) and an error log.
   Nothing leaves this machine: only same-host GETs and the fake *.supabase.co answers go through. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const cloud = require('./mock-cloud.cjs');
let pw; for (const p of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), '/tmp/pw/node_modules/playwright', 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.m4a': 'audio/mp4' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve(ROOT) {
    return new Promise(r => {
        const s = http.createServer((q, res) => {
            let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
            const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
            fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(b); });
        });
        s.listen(0, '127.0.0.1', () => r(s));
    });
}
const INIT = ([lang, name, fresh]) => {
    try {
        const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (fresh) return;
        localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
        if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name, bday: '1990-08-01', tags: [] }, xp: 2400, ledger: [], logs: [], saved: [], settings: { lang } }));
        localStorage.setItem('lowi.tutorial.done', '1');
    } catch (e) { }
};
async function open(o) {
    o = Object.assign({ engine: 'webkit', root: process.env.REGRESS_ROOT || path.join(__dirname, '..', '..'), url: '', lang: 'en', name: 'Emmanuel', members: 45, messages: 300, probe: true, fresh: false, device: 'iPhone 13' }, o || {});
    let srv = null, url = o.url;
    if (!url) { srv = await serve(path.resolve(o.root)); url = `http://127.0.0.1:${srv.address().port}/index.html`; }
    const host = new URL(url).host;
    const browser = await pw[o.engine].launch({ args: o.engine === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] : [] });
    const dev = o.engine === 'webkit' ? Object.assign({}, pw.devices[o.device]) : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true };
    const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
    await ctx.route(u => { try { const x = new URL(u); return !(x.protocol === 'data:' || x.protocol === 'blob:' || x.host === host || x.host.endsWith('.supabase.co')); } catch (e) { return true; } }, r => r.abort());
    await ctx.route(u => { try { return new URL(u).host === host; } catch (e) { return false; } }, r => r.request().method() === 'GET' ? r.continue() : r.abort());
    const sim = o.cloud === false ? null : await cloud.install(ctx, o);
    await ctx.addInitScript(INIT, [o.lang, o.name, o.fresh]);
    if (o.probe) await ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, '..', 'soak', 'crash-probe.js'), 'utf8') });
    const page = await ctx.newPage();
    const t0 = Date.now(), el = () => ((Date.now() - t0) / 1000).toFixed(1) + 's';
    const R = { errs: [], loads: 0, crashed: false, el, page, ctx, browser, sim, url, srv };
    page.on('pageerror', e => R.errs.push({ at: el(), step: R.step, m: (e.message || '').slice(0, 300), st: String(e.stack || '').split('\n').slice(0, 5).join(' | ').slice(0, 600) }));
    page.on('console', m => { const t = m.text(); if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::|blocked|access control|aborted/i.test(t)) R.errs.push({ at: el(), step: R.step, m: 'console: ' + t.slice(0, 300) }); });
    page.on('load', () => { R.loads++; });
    page.on('crash', () => { R.crashed = true; console.log(el(), 'RENDERER CRASHED at step', R.step); });
    R.goto = async (q) => { await page.goto(url + '?sim=' + Date.now() + (q || ''), { waitUntil: 'load', timeout: 180000 }); await page.waitForFunction(() => window.goTab && document.getElementById('whPad'), null, { timeout: 180000 }).catch(() => console.log('never ready')); };
    R.snap = () => page.evaluate(() => { const c = window.__cs && window.__cs.snap ? window.__cs.snap() : {}; return { nodes: document.getElementsByTagName('*').length, canv: document.querySelectorAll('canvas').length, imgs: document.images.length, lis: c.lis, raf: c.raf, iv: c.iv, to: c.to, ctxAll: c.ctxAll, ctxGL: c.ctxGL, gpuMB: c.gpuMB, three: c.three, lost: c.lost, long: c.long, gap: c.maxGap, heap: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null }; }).catch(e => ({ evalErr: String(e.message).slice(0, 200) }));
    R.close = async () => { try { await browser.close(); } catch (e) { } if (srv) srv.close(); };
    R.shot = (f) => page.screenshot({ path: f }).catch(() => { });
    R.tap = async (sel, opt) => { const l = page.locator(sel).first(); await l.tap(Object.assign({ timeout: 5000 }, opt || {})); };
    R.visibleButtons = () => page.evaluate(() => [...document.querySelectorAll('button,[role=button],a[href],[data-cl],[data-act],[data-tr]')].filter(b => { const r = b.getBoundingClientRect(), s = getComputedStyle(b); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && s.visibility !== 'hidden' && +s.opacity > .05; }).map(b => { const r = b.getBoundingClientRect(); return { id: b.id, cls: String(b.className).slice(0, 60), txt: (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }));
    return R;
}
module.exports = { open, sleep, pw };
