'use strict';
/* Browser check for tests/today-bubbles-no-legacy.test.cjs (Oct 18): the Today bubbles show only the new 3D glass, with no old
   ring arcs, tier ticks, stage dashes or CSS rims inside them. Runs Chromium 390x844, WebKit iPhone 13 and WebKit iPad landscape.
   Production Supabase and every non-GET request are blocked; no account is created (a local fixture session only).
     node tests/today-bubbles-no-legacy-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--tag after]
   Needs playwright (PLAYWRIGHT_PATH or require('playwright')). Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/today-bubbles-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = { iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13_webkit: ['webkit', 'iPhone 13'], ipad_landscape_webkit: ['webkit', IPAD] };

/* a fast running 10 h 53 min of 16 h, 6 cups of water, like E-man's screenshot */
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
  if (!sessionStorage.getItem('tb.fx')) { sessionStorage.setItem('tb.fx', '1'); const w = {}; w[k] = 6; localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: Date.now() - (10 * 60 + 53) * 60e3, target: 16, water: w })); }
} catch (e) { }`;

const PROBE = () => {
    const eff = e => { let n = e; while (n && n.nodeType === 1) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; n = n.parentElement; } return true; };
    const H = document.documentElement, out = { cls: { live: H.classList.contains('wh-world-live'), lb3d: H.classList.contains('lb3d'), home: H.classList.contains('wh-home') }, bubbles: {}, legacy: [] };
    const sels = { misty: '#spBubble', fast: '#spFast', water: '#whHud .wh-water', move: '#whHud .wh-move', meals: '#whHud .wh-meals' };
    for (const k in sels) {
        const b = document.querySelector(sels[k]); if (!b) { out.bubbles[k] = null; continue; }
        const r = b.getBoundingClientRect();
        out.bubbles[k] = { r: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vis: eff(b), lb: b.classList.contains('lb-bub'), text: (b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60) };
        /* old-design pieces: ring/tick/dash elements, any visible straight line or ring stroke outside Misty's own body sprite */
        b.querySelectorAll('.ms-ring, .ms-tick, .fb-marks, .fb-tick, .fb-lab, line, polyline').forEach(e => { if (e.closest('.tmg-plant, .cw-cell, .sp-home-herb')) return; if (eff(e)) out.legacy.push(k + ': ' + e.tagName + '.' + (e.getAttribute('class') || '')); });
        b.querySelectorAll(':scope > svg').forEach(e => { if (eff(e)) out.legacy.push(k + ': svg overlay .' + (e.getAttribute('class') || '')); });
        const pe = getComputedStyle(b, '::after');
        if (out.cls.live && pe.content !== 'none' && pe.display !== 'none' && (pe.borderTopStyle !== 'none' && parseFloat(pe.borderTopWidth) > 0 || pe.boxShadow !== 'none')) out.legacy.push(k + ': ::after rim ' + pe.borderTopWidth + ' ' + pe.boxShadow.slice(0, 40));
    }
    const fs = window.LowiFastBubble && LowiFastBubble.state(); out.fast = fs;
    const nm = document.querySelector('#spBubble .sp-bubble-name'); out.mistyTag = nm ? (nm.textContent + getComputedStyle(nm, '::after').content).replace(/\s+/g, ' ') : null;
    return out;
};

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0;
    for (const v of arg('views', Object.keys(VIEWS).join(',')).split(',')) {
        const [eng, d] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = typeof d === 'string' ? Object.assign({}, pw.devices[d]) : d;
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        let blocked = 0;
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); blocked++; return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
        await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live') && document.querySelector('#spFast.lb-bub'), null, { timeout: 90000 }).catch(() => { });
        await sleep(+arg('wait', 8000));
        const r = await page.evaluate(PROBE);
        const shot = `${OUT}/${TAG}-${v}.png`;
        await page.screenshot({ path: shot });
        const problems = [];
        if (!r.cls.live || !r.cls.lb3d) problems.push('3D living bubbles not on (wh-world-live ' + r.cls.live + ', lb3d ' + r.cls.lb3d + ')');
        for (const k of ['misty', 'fast', 'water']) if (!r.bubbles[k] || !r.bubbles[k].vis) problems.push(k + ' bubble missing');
        if (r.legacy.length) problems.push('old-design pieces: ' + r.legacy.join(', '));
        if (!r.fast || !r.fast.on || r.fast.marks || r.fast.labels) problems.push('fast bubble ticks/labels: ' + JSON.stringify(r.fast));
        if (!/\d+%/.test(r.mistyTag || '')) problems.push('Misty % missing from name tag: ' + r.mistyTag);
        if (errs.length) problems.push('page errors: ' + errs.slice(0, 3).join(' | '));
        console.log(JSON.stringify({ view: v, ok: !problems.length, problems, shot, bubbles: r.bubbles, fast: r.fast && { level: r.fast.level, running: r.fast.running, marks: r.fast.marks, labels: r.fast.labels, sr: r.fast.sr }, mistyTag: r.mistyTag, blockedRequests: blocked }));
        if (problems.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    console.log(fail ? 'FAIL' : 'PASS');
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
