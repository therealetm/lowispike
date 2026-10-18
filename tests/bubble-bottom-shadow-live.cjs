'use strict';
/* Live check: no bottom shadow on the ring Home bubbles or Misty's Home bubble (Oct 18 2026, Emmanuel on iPad:
   "All bubbles have a shadow bottom. Remove that weird bottom.").
   For the eight ring controls (+ the joystick #whPad) and #spBubble, every visible element and its ::before / ::after:
   no non-inset box-shadow pushed down (y > 0), no inset shade coming up from the bottom (inset, y < 0), no filter
   drop-shadow deeper than a 1px label outline, no shadow / reflection shape (Misty's .lh-reflection ellipse).
   Checked twice per view: with the 3D membranes (html.lb3d) and without them (the flat fallback). Top highlight and labels must stay.
   Views: Chromium 390x844, WebKit devices['iPhone 13'], iPad 820x1180 and 1180x820 in WebKit and Chromium.
   Production Supabase and every non-GET request are blocked; a local fixture session only.
     node tests/bubble-bottom-shadow-live.cjs [--root DIR | --url https://therealetm.github.io/lowispike/] [--out DIR] [--tag after] [--views a,b]
   Exit 0 = pass. */
const http = require('http'), fs = require('fs'), path = require('path');
const { bottomLayers, dropShadowsBelow } = require('./fixtures/shadow-layers.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..'))), OUT = arg('out', '/tmp/bubble-shadow-shots'), TAG = arg('tag', 'run');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid' } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], settings: { lang: 'en' } }));
  if (!sessionStorage.getItem('o8.fx')) { sessionStorage.setItem('o8.fx', '1'); const w = {}; w[k] = 3; localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: Date.now() - (10 * 60 + 53) * 60e3, target: 16, water: w })); localStorage.removeItem('lowi.home.menubar'); localStorage.removeItem('lowi.sleep.v1'); }
} catch (e) { }`;
const PORTRAIT = Object.assign({}, IPAD, { viewport: { width: 820, height: 1180 }, screen: { width: 820, height: 1180 } });
const VIEWS = {
    iphone_chromium: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
    iphone13_webkit: ['webkit', 'iPhone 13'],
    ipad_portrait_webkit: ['webkit', PORTRAIT], ipad_landscape_webkit: ['webkit', IPAD],
    ipad_portrait_chromium: ['chromium', PORTRAIT], ipad_landscape_chromium: ['chromium', IPAD],
};

/* runs in the page: every visible element (and its ::before / ::after) of the eight ring controls and of Misty's Home bubble */
const PROBE = () => {
    const vis = e => { let n = e; while (n && n.nodeType === 1) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.03) return false; n = n.parentElement; } return true; };
    const roots = [...document.querySelectorAll('[data-orbit]')];
    const pad = document.getElementById('whPad'); if (pad && !roots.includes(pad)) roots.push(pad);
    const misty = document.getElementById('spBubble'); if (misty) roots.push(misty);
    const name = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ((typeof e.className === 'string' ? e.className : (e.className && e.className.baseVal) || '').trim() ? '.' + (typeof e.className === 'string' ? e.className : e.className.baseVal).trim().split(/\s+/).slice(0, 3).join('.') : '');
    const items = [], ellipses = [];
    for (const root of roots) {
        const key = root.dataset.orbit || root.id;
        for (const e of [root, ...root.querySelectorAll('*')]) {
            if (!vis(e)) continue;
            const cls = (typeof e.className === 'string' ? e.className : (e.className && e.className.baseVal) || '');
            if (/(^|[\s-])(shadow|reflection)([\s-]|$)/i.test(cls)) { const r = e.getBoundingClientRect(); if (r.width > 2 && r.height > 1) ellipses.push(key + ' ' + name(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
            if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
            for (const pe of [null, '::before', '::after']) {
                const c = getComputedStyle(e, pe);
                if (pe && (c.content === 'none' || c.content === 'normal')) continue;
                items.push({ key, el: name(e) + (pe || ''), bs: c.boxShadow, filter: c.filter });
            }
        }
    }
    /* the glass top highlight: Misty's glint oval (::before, a white fill) or a white radial highlight high in the shell's background */
    const white = v => /rgba?\(255, 255, 255(, (0?\.[1-9]\d*|1))?\)/.test(v);
    const topGlint = bg => { const m = /radial-gradient\(circle at \d+% (\d+)%, (rgba?\([^)]*\))/.exec(bg); return !!m && +m[1] <= 40 && white(m[2]); };
    const hi = roots.filter(r => r.dataset.orbit && !/joy/.test(r.dataset.orbit)).map(r => { const els = [r, ...r.querySelectorAll('*')].filter(vis); const ok = els.some(e => { const b = getComputedStyle(e, '::before'); return topGlint(getComputedStyle(e).backgroundImage) || (b.content !== 'none' && b.display !== 'none' && (white(b.backgroundColor) || topGlint(b.backgroundImage))); }); return { k: r.dataset.orbit, glint: ok || !!(window.LowiLivingBubbles && document.documentElement.classList.contains('lb3d') && r.classList.contains('lb-bub')) }; });
    const labels = roots.filter(r => r.dataset.orbit && !/joy/.test(r.dataset.orbit)).map(r => ({ k: r.dataset.orbit, txt: (r.innerText || r.getAttribute('aria-label') || '').trim().length > 0 }));
    return { o8: document.documentElement.classList.contains('o8'), lb3d: document.documentElement.classList.contains('lb3d'), n: roots.length, items, ellipses, hi, labels, reflection: [...document.querySelectorAll('#spBubble .lh-reflection')].map(e => getComputedStyle(e).display) };
};
function judge(r, mode) {
    const P = [];
    if (!r.o8) P.push('ring Home (html.o8) did not engage');
    if (r.n < 9) P.push('only ' + r.n + ' bubbles found');
    for (const it of r.items) {
        const b = bottomLayers(it.bs); if (b.length) P.push(`${mode} ${it.key} ${it.el}: bottom box-shadow ${b.map(l => l.raw).join(' | ')}`);
        const d = dropShadowsBelow(it.filter, 1); if (d.length) P.push(`${mode} ${it.key} ${it.el}: drop-shadow below ${d.join(' ')}`);
    }
    for (const e of r.ellipses) P.push(`${mode} shadow/reflection shape still drawn: ${e}`);
    if (r.reflection.some(d => d !== 'none')) P.push(mode + ' .lh-reflection under Misty is displayed');
    return P;
}

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0;
    for (const v of arg('views', 'iphone_chromium,iphone13_webkit,ipad_portrait_webkit,ipad_landscape_webkit,ipad_portrait_chromium,ipad_landscape_chromium').split(',')) {
        const [eng, dd] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = typeof dd === 'string' ? Object.assign({}, pw.devices[dd]) : dd;
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        const writes = [];
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (q.method() !== 'GET') writes.push(q.method() + ' ' + u.host); return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 });
        await page.waitForFunction(() => document.documentElement.classList.contains('wh-world-live'), null, { timeout: 90000 }).catch(() => { });
        await page.waitForFunction(() => document.documentElement.classList.contains('o8') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 60000 }).catch(() => { });
        await sleep(+arg('wait', 9000));
        const a = await page.evaluate(PROBE);
        await page.screenshot({ path: `${OUT}/${TAG}-${v}.png` });
        /* the same Home without the 3D membranes (html.lb3d off): what a device shows when the 3D world is not running */
        await page.evaluate(() => document.documentElement.classList.remove('lb3d'));
        await sleep(600);
        const b = await page.evaluate(PROBE);
        await page.screenshot({ path: `${OUT}/${TAG}-${v}-flat.png` });
        const P = [...judge(a, a.lb3d ? '3d' : 'flat'), ...judge(b, 'flat')];
        a.hi.forEach(h => { if (!h.glint) P.push(h.k + ': top highlight missing'); });
        a.labels.forEach(l => { if (!l.txt) P.push(l.k + ': label missing'); });
        errs.forEach(e => P.push('page error: ' + e));
        const uniq = [...new Set(P)];
        console.log(`${uniq.length ? 'FAIL' : 'PASS'} ${v} (${eng}) lb3d=${a.lb3d} checked=${a.items.length}+${b.items.length} layers, blocked writes=${writes.length}`);
        uniq.slice(0, 40).forEach(p => console.log('   - ' + p));
        if (uniq.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
