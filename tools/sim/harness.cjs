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
            let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
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
        if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name, bday: '1990-08-01' }, xp: 2400, ledger: [], logs: [], saved: [], settings: { lang } }));
        localStorage.setItem('lowi.tutorial.done', '1');
    } catch (e) { }
};
/* An iOS-like on-screen keyboard for an engine that has none: when a text field gets focus the visual viewport shrinks by the
   keyboard height over ~300 ms with a resize event every frame (as Safari does), and grows back on blur. Also counts what the
   page does in response (window.__kb). Only the visual viewport changes; the layout viewport stays, like on the phone. */
const KEYBOARD = ([KB]) => {
    const real = window.visualViewport; if (!real) return;
    const et = new EventTarget(); let h = null, top = 0, anim = 0;
    const vv = { get width() { return real.width; }, get height() { return h == null ? real.height : h; }, get offsetTop() { return top; }, get offsetLeft() { return 0; }, get pageTop() { return real.pageTop + top; }, get pageLeft() { return real.pageLeft; }, get scale() { return 1; },
        addEventListener: (...a) => et.addEventListener(...a), removeEventListener: (...a) => et.removeEventListener(...a), dispatchEvent: e => et.dispatchEvent(e), onresize: null, onscroll: null };
    try { Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => vv }); } catch (e) { return; }
    window.__kb = { opens: 0, closes: 0, resizes: 0, mut: 0, canvasSets: 0, open: false };
    new MutationObserver(l => { window.__kb.mut += l.length; }).observe(document, { subtree: true, childList: true, attributes: true, characterData: false });
    const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
    if (d && d.set) Object.defineProperty(HTMLCanvasElement.prototype, 'width', { configurable: true, get: d.get, set(v) { if (+v !== this.width) window.__kb.canvasSets++; d.set.call(this, v); } });
    const go = (to) => { cancelAnimationFrame(anim); const from = vv.height, t0 = performance.now(); const step = () => { const k = Math.min(1, (performance.now() - t0) / 300); h = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); window.__kb.resizes++; const e = new Event('resize'); et.dispatchEvent(e); if (vv.onresize) vv.onresize(e); if (k < 1) anim = requestAnimationFrame(step); else if (to === real.height) h = null; }; anim = requestAnimationFrame(step); };
    const isText = el => el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !/^(button|checkbox|radio|range|file|submit|color)$/i.test(el.type)) || el.isContentEditable);
    document.addEventListener('focusin', e => { if (isText(e.target) && !window.__kb.open) { window.__kb.open = true; window.__kb.opens++; go(real.height - KB); } }, true);
    document.addEventListener('focusout', e => { setTimeout(() => { if (!isText(document.activeElement) && window.__kb.open) { window.__kb.open = false; window.__kb.closes++; go(real.height); } }, 30); }, true);
};
async function open(o) {
    o = Object.assign({ engine: 'webkit', root: path.join(__dirname, '..', '..'), url: '', lang: 'en', name: 'Emmanuel', members: 45, messages: 300, probe: true, fresh: false, device: 'iPhone 13' }, o || {});
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
    if (o.keyboard) await ctx.addInitScript(KEYBOARD, [o.kbHeight || 291]);
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
    /* memory of this run's own browser processes (the web content process is the one iOS kills), from ps, in MB */
    R.rss = () => { try { const rows = require('child_process').execSync('ps -eo pid,ppid,rss,comm --no-headers').toString().trim().split('\n').map(l => l.trim().split(/\s+/)); const kids = new Set([String(process.pid)]); let grew = true; while (grew) { grew = false; for (const r of rows) if (kids.has(r[1]) && !kids.has(r[0])) { kids.add(r[0]); grew = true; } } const out = {}; for (const r of rows) if (kids.has(r[0]) && r[0] !== String(process.pid)) { const k = /WebProcess|renderer|chrome/.test(r[3]) ? r[3].slice(0, 15) : r[3].slice(0, 15); out[k] = Math.max(out[k] || 0, Math.round(+r[2] / 1024)); } return out; } catch (e) { return { err: e.message }; } };
    R.close = async () => { try { await browser.close(); } catch (e) { } if (srv) srv.close(); };
    R.shot = (f) => page.screenshot({ path: f }).catch(() => { });
    /* a finger tap at the element's middle (the bubbles float, so Playwright's "stable" wait never settles) */
    R.tapEl = async (l) => { let b = await l.boundingBox({ timeout: 20000 }).catch(() => null); if (!b) b = await l.evaluate(e => { const r = e.getBoundingClientRect(); return r.width ? { x: r.x, y: r.y, width: r.width, height: r.height } : null; }, null, { timeout: 20000 }); if (!b) throw new Error('no box'); await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); };
    R.tap = async (sel) => R.tapEl(page.locator(sel).first());
    R.tapText = async (re) => R.tapEl(page.getByText(re).first());
    R.vis = () => page.evaluate(() => { const out = []; document.querySelectorAll('button,[role=button],[data-cl],[data-act],[data-tr],input,textarea,a[href]').forEach(b => { const r = b.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return; const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); if (!top || !(top === b || b.contains(top) || top.contains(b))) return; out.push((b.id ? '#' + b.id + ' ' : '') + '.' + String(b.className).split(' ')[0] + ' "' + (b.getAttribute('aria-label') || b.textContent || b.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '" @' + Math.round(x) + ',' + Math.round(y) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }); return out; });
    R.visibleButtons = () => page.evaluate(() => [...document.querySelectorAll('button,[role=button],a[href],[data-cl],[data-act],[data-tr]')].filter(b => { const r = b.getBoundingClientRect(), s = getComputedStyle(b); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && s.visibility !== 'hidden' && +s.opacity > .05; }).map(b => { const r = b.getBoundingClientRect(); return { id: b.id, cls: String(b.className).slice(0, 60), txt: (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }));
    return R;
}
module.exports = { open, sleep, pw };
