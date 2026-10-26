#!/usr/bin/env node
/* LOWiSPIKE "open Community, then the chat" memory probe (20 Oct 2026, item 29: Emmanuel's real iPhone showed Safari's
   "A problem repeatedly occurred" right after opening Community and then the chat). Opens the app, measures, opens
   Community, measures, opens the chat room, measures, scrolls the chat, measures. Counts what makes iOS kill a tab:
   DOM / SVG nodes, decoded image pixels (and inline data: photo bytes), canvas backing stores, live WebGL contexts and
   GPU objects, compositing-layer makers (backdrop-filter, filter, will-change, running animations) and frame loops.
   Usage: node tools/soak/chat-open-probe.cjs [--url URL | --root DIR] [--engine webkit|chromium] [--net 1] [--out f.json] [--lowpower 1] */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), URL0 = arg('url', ''), ENGINE = arg('engine', 'webkit');
let pw; for (const p of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), '/tmp/pw/node_modules/playwright', 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const PROBE = fs.readFileSync(path.join(__dirname, 'crash-probe.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const { execSync } = require('child_process');
let ROOTPID = 0;
function rss() { try { const rows = execSync('ps -eo pid=,ppid=,rss=').toString().trim().split('\n').map(l => l.trim().split(/\s+/).map(Number)); const kids = new Map(); for (const [p, pp] of rows) { if (!kids.has(pp)) kids.set(pp, []); kids.get(pp).push(p); }
    const by = new Map(rows.map(r => [r[0], r[2]])); let sum = 0; const st = [ROOTPID]; while (st.length) { const p = st.pop(); sum += by.get(p) || 0; for (const k of kids.get(p) || []) st.push(k); } return sum / 1024 | 0; } catch (e) { return -1; } }
const sleep = ms => new Promise(r => setTimeout(r, ms)), t0 = Date.now(), log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(0).padStart(4) + 's', ...a);
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = () => { try { const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.auto', 'done');
    if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Probe', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [], settings: { lang: 'en' } })); } catch (e) { } };
const MEASURE = () => {
    const q = s => document.querySelectorAll(s), cs = window.__cs || {}, out = {};
    out.dom = q('*').length; out.svg = q('svg *').length; out.list = q('#cmList *').length; out.listSvg = q('#cmList svg *').length; out.field = q('#cgField *').length;
    out.msgs = q('#cmList [id^="cm-"]').length; out.listHtmlKB = Math.round(((document.getElementById('cmList') || {}).innerHTML || '').length / 1024);
    let px = 0, n = 0, dataKB = 0, big = 0; for (const im of q('img')) { if (im.complete && im.naturalWidth) { n++; px += im.naturalWidth * im.naturalHeight; if (im.naturalWidth * im.naturalHeight > 1e6) big++; } const s = im.getAttribute('src') || ''; if (s.startsWith('data:')) dataKB += s.length / 1024; }
    out.imgs = q('img').length; out.imgsDecoded = n; out.imgMB = +(px * 4 / 1048576).toFixed(1); out.imgBig = big; out.imgDataKB = Math.round(dataKB);
    let cpx = 0, gl = 0; const cv = q('canvas'); for (const c of cv) { cpx += c.width * c.height; } out.canvases = cv.length; out.canvasMB = +(cpx * 4 / 1048576).toFixed(1);
    out.glAlive = (cs.ctx || []).filter(c => c && !c.dead && /webgl/i.test(c.kind || c.type || '')).length; out.ctxList = (cs.ctx || []).map(c => (c.kind || c.type || '?') + (c.w ? ':' + c.w + 'x' + c.h : '')).slice(0, 12); out.gpu = cs.live;
    let bf = 0, fl = 0, wc = 0, anim = 0; for (const e of q('*')) { const s = getComputedStyle(e); if ((s.backdropFilter && s.backdropFilter !== 'none') || (s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none')) bf++; if (s.filter && s.filter !== 'none') fl++; if (s.willChange && s.willChange !== 'auto') wc++; }
    try { anim = document.getAnimations().filter(a => a.playState === 'running').length; } catch (e) { }
    out.backdrop = bf; out.filter = fl; out.willChange = wc; out.anims = anim;
    out.rafBy = Object.entries(cs.rafBy || {}).sort((a, b) => b[1] - a[1]).slice(0, 8); if (cs.rafBy) cs.rafBy = Object.create(null); out.raf = cs.raf; cs.raf = 0;
    out.timers = cs.iv ? cs.iv.size : -1; out.maxGap = Math.round(cs.maxGap || 0); cs.maxGap = 0;
    if (performance.memory) out.heapMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
    out.dpr = devicePixelRatio; out.people = (window.__lgGx && window.__lgGx.spots ? window.__lgGx.spots.length : (q('#cgField .cg-mate, #cgField [data-uid]').length));
    return out;
};
(async () => {
    let srv = null, url = URL0; if (!url) { srv = await serve(); url = `http://127.0.0.1:${srv.address().port}/index.html`; }
    const host = new URL(url).host;
    const browser = await pw[ENGINE].launch({ args: ENGINE === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] : [] });
    try { ROOTPID = browser.process().pid; } catch (e) { }
    const dev = ENGINE === 'webkit' ? Object.assign({}, pw.devices['iPhone 13']) : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true };
    const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
    if (arg('net', false)) await ctx.route(/\/rest\/v1\/(messages|posts|reactions|post_likes|profiles|energy)/, r => r.request().method() === 'GET' ? r.continue() : r.abort());
    else await ctx.route('**/*', r => { const qq = r.request(), u = new URL(qq.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && qq.method() === 'GET')) return r.continue(); return r.abort(); });
    await ctx.addInitScript(INIT); await ctx.addInitScript({ content: PROBE });
    if (arg('lowpower', false)) await ctx.addInitScript(() => { try { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 2 }); } catch (e) { } });
    if (arg('css', '')) { const css = fs.readFileSync(arg('css'), 'utf8'); await ctx.addInitScript(c => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = c; document.head.appendChild(st); }); }, css); }
    const page = await ctx.newPage(); const errs = []; let crashed = false;
    page.on('pageerror', e => errs.push((e.message || '').slice(0, 200))); page.on('crash', () => { crashed = true; log('RENDERER CRASHED'); });
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'probe=' + Date.now(), { waitUntil: 'load', timeout: 180000 });
    await page.waitForFunction(() => window.goTab && document.getElementById('whPad'), null, { timeout: 180000 }).catch(() => log('never ready'));
    await sleep(6000); const R = {};
    R.home = await page.evaluate(MEASURE); R.home.rssMB = rss(); log('home', JSON.stringify(R.home));
    await page.evaluate(() => window.goTab('foryou')); await sleep(9000);
    R.community = await page.evaluate(MEASURE); R.community.rssMB = rss(); log('community', JSON.stringify(R.community));
    await page.evaluate(() => { const b = document.querySelector('[data-chat="history"]'); if (b) b.click(); else if (window.LowiCommunity) window.LowiCommunity.thread(true); }); await sleep(8000);
    R.chat = await page.evaluate(MEASURE); R.chat.rssMB = rss(); log('chat', JSON.stringify(R.chat));
    for (let i = 0; i < 12; i++) { await page.evaluate(k => { const l = document.getElementById('cmList'); if (l) l.scrollTop = k % 2 ? l.scrollHeight : 0; }, i); await sleep(700); }
    await sleep(3000); R.scrolled = await page.evaluate(MEASURE); R.scrolled.rssMB = rss(); log('scrolled', JSON.stringify(R.scrolled));
    R.detail = await page.evaluate(() => { const g = {}, add = (k, e) => { const c = (e.closest('#cmList') ? 'LIST ' : e.closest('#cgField') ? 'FIELD ' : e.closest('#tab-foryou') ? 'CMTY ' : 'OTHER ') + k + ' ' + (e.tagName.toLowerCase() + '.' + String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className).split(' ')[0]); g[c] = (g[c] || 0) + 1; };
        for (const e of document.querySelectorAll('*')) { const s = getComputedStyle(e); if (s.filter && s.filter !== 'none') add('filter', e); if ((s.backdropFilter && s.backdropFilter !== 'none') || (s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none')) add('backdrop', e); if (s.willChange && s.willChange !== 'auto') add('will', e); }
        try { for (const a of document.getAnimations()) if (a.playState === 'running' && a.effect && a.effect.target) add('anim', a.effect.target); } catch (e) { }
        const m = document.querySelector('#cmList [id^="cm-"]'); return { groups: Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 40), oneMsg: m ? m.outerHTML.slice(0, 3000) : '', mainCanvas: [...document.querySelectorAll('canvas')].map(c => c.id + ':' + c.width + 'x' + c.height + ':' + (c.offsetParent ? 'shown' : 'hidden')) }; });
    R.errs = errs.slice(0, 10); R.crashed = crashed; log('errors', errs.length, JSON.stringify(errs.slice(0, 5)));
    if (arg('out', '')) fs.writeFileSync(arg('out'), JSON.stringify(R, null, 1));
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
