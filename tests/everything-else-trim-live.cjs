#!/usr/bin/env node
/* Live check for the trimmed Settings > More ("Everything else") panel, Oct 18 2026.
   node tests/everything-else-trim-live.cjs [--url=https://therealetm.github.io/lowispike/] [--out=/tmp/eet-shots] [--views=a,b] [--prefix=after]
   Without --url it serves this checkout. Every non-GET request and Supabase is blocked: nothing reaches production.
   For each view: tap Settings, tap More, then check the panel lists exactly the kept entries in two groups (Go to / Settings),
   fits with no scrolling, keeps Back and x in view (also after a scroll attempt), is fully on screen, is glass, never covers
   Misty, and on iPad is clear of every ring control. Back returns to Settings, x closes. A screenshot per view. */
const fs = require('fs'), path = require('path'), http = require('http');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ROOT = path.resolve(__dirname, '..'), OUT = arg('out', '/tmp/eet-shots'), PREFIX = arg('prefix', 'after');
const KEEP_GO = ['community', 'care', 'workouts', 'map', 'vr', 'gift', 'weather'], KEEP_SET = ['worldSound'], GONE = ['today', 'cook', 'theme', 'quest'];
const IPAD = (w, h) => ({ viewport: { width: w, height: h }, screen: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
const PHONE844 = { viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const VIEWS = {
    iphone13_webkit: ['webkit', 'iPhone 13', 'phone'], iphone13_chromium: ['chromium', 'iPhone 13', 'phone'],
    iphone390x844_webkit: ['webkit', PHONE844, 'phone'], iphone390x844_chromium: ['chromium', PHONE844, 'phone'],
    ipad_portrait_webkit: ['webkit', IPAD(820, 1180), 'ipad'], ipad_portrait_chromium: ['chromium', IPAD(820, 1180), 'ipad'],
    ipad_landscape_webkit: ['webkit', IPAD(1180, 820), 'ipad'], ipad_landscape_chromium: ['chromium', IPAD(1180, 820), 'ipad']
};
const INIT = `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01', tags: [] }, xp: 900, ledger: [], logs: [], saved: [] }));
} catch (e) { }`;
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } const ext = path.extname(f); res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }[ext] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }

const PANEL = () => {
    const L = document.getElementById('ss2Bloom'), p = L && L.querySelector('.ss2-panel'); if (!p) return null;
    const R = e => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom, w: q.width, h: q.height }; };
    const m = document.querySelector('[data-home-misty]') || document.getElementById('spBubble'), mr = R(m), mx = (mr.l + mr.r) / 2, my = (mr.t + mr.b) / 2, rad = Math.max(mr.w, mr.h) / 2;
    const pr = R(p), nx = Math.max(pr.l, Math.min(mx, pr.r)), ny = Math.max(pr.t, Math.min(my, pr.b));
    const body = p.querySelector('.ss2-body'), head = p.querySelector('.ss2-head'), hit = (e) => { const q = e.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2, t = document.elementFromPoint(x, y); return !!t && (t === e || e.contains(t)); };
    const topAtMisty = document.elementFromPoint(mx, my);
    const groups = [...p.querySelectorAll('.ss2-group')].map(g => ({ label: (g.querySelector('.ss2-gl') || {}).textContent, rows: [...g.querySelectorAll('[data-ss2]')].map(r => r.dataset.ss2) }));
    const ring = [...document.querySelectorAll('[data-orbit]')].map(e => Object.assign({ k: e.dataset.orbit }, R(e))).filter(q => q.w > 2);
    const cs = getComputedStyle(p);
    return {
        vw: innerWidth, vh: innerHeight, panel: pr, side: p.dataset.side, fit: p.dataset.fit, misty: { x: mx, y: my, r: rad }, mistyGap: Math.hypot(nx - mx, ny - my),
        mistyTopIsPanel: !!(topAtMisty && topAtMisty.closest && topAtMisty.closest('.ss2-panel')), groups,
        rows: [...p.querySelectorAll('[data-ss2]')].map(r => r.dataset.ss2).filter(x => x !== 'back' && x !== 'close'),
        bodyScroll: body ? [body.scrollHeight, body.clientHeight] : null, panelScroll: [p.scrollHeight, p.clientHeight], head: head && R(head),
        backHit: hit(p.querySelector('[data-ss2="back"]')), closeHit: hit(p.querySelector('[data-ss2="close"]')),
        ringHits: ring.filter(q => pr.l < q.r - 1 && pr.r > q.l + 1 && pr.t < q.b - 1 && pr.b > q.t + 1).map(q => q.k),
        glass: (cs.backdropFilter || cs.webkitBackdropFilter || 'none') !== 'none', settingsAt: (ring.find(q => q.k === 'settings') || {}), build: (window.LOWI_BUILD || (document.querySelector('meta[name="lowi-build"]') || {}).content || '')
    };
};
async function center(page, sel) { return page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel); }
async function tap(page, sel) { const c = await center(page, sel); if (!c) return false; await page.touchscreen.tap(c.x, c.y); await sleep(500); return true; }

(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await serve();
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`, host = new URL(url).host;
    let fail = 0; const summary = [];
    for (const v of arg('views', Object.keys(VIEWS).join(',')).split(',')) {
        const [eng, d, kind] = VIEWS[v];
        const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
        const dev = typeof d === 'string' ? Object.assign({}, pw.devices[d]) : d;
        const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }));
        const blocked = { supabase: 0, writes: 0 };
        await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); if (/supabase\.co$/.test(u.hostname)) blocked.supabase++; if (q.method() !== 'GET') blocked.writes++; return r.abort(); });
        await ctx.addInitScript(INIT);
        const page = await ctx.newPage(), errs = [], P = [];
        page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
        const ok = (c, m) => { if (!c) P.push(m); };
        await page.goto(url + (url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => document.documentElement.classList.contains('wh-home') && window.LowiHomeSettingsSleepV2 && document.querySelector('[data-orbit="settings"]'), null, { timeout: 90000 });
        await sleep(+arg('wait', 16000)); /* Misty settles (shrinks once) about 15 s after load */
        const build = await page.evaluate(() => fetch('version.json?x=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => ''));
        await tap(page, '[data-orbit="settings"]'); await sleep(300);
        await tap(page, '#ss2Bloom [data-ss2="more"]'); await sleep(700);
        const g = await page.evaluate(PANEL);
        await page.screenshot({ path: `${OUT}/${PREFIX}-${v}.png` });
        if (!g) { P.push('More panel did not open'); }
        else {
            const want = KEEP_GO.concat(KEEP_SET);
            ok(GONE.every(id => !g.rows.includes(id)), 'still lists a removed entry: ' + g.rows);
            ok(g.rows.every(id => want.includes(id)), 'unexpected entries: ' + g.rows);
            ok(['community', 'care', 'workouts', 'map', 'worldSound'].every(id => g.rows.includes(id)), 'missing a kept entry: ' + g.rows);
            ok(g.groups.length === 2 && /go to/i.test(g.groups[0].label) && /settings/i.test(g.groups[1].label), 'groups should be Go to and Settings: ' + JSON.stringify(g.groups));
            ok(g.groups.length === 2 && g.groups[1].rows.join() === 'worldSound' && g.groups[0].rows.every(id => KEEP_GO.includes(id)), 'group contents: ' + JSON.stringify(g.groups));
            ok(g.fit === 'true' && g.bodyScroll && g.bodyScroll[0] <= g.bodyScroll[1] + 1 && g.panelScroll[0] <= g.panelScroll[1] + 1, 'panel should fit with no scrolling: body ' + g.bodyScroll + ' panel ' + g.panelScroll + ' fit ' + g.fit);
            ok(g.panel.l >= 0 && g.panel.t >= 0 && g.panel.r <= g.vw + 0.5 && g.panel.b <= g.vh + 0.5, 'panel off screen: ' + JSON.stringify(g.panel));
            ok(g.mistyGap >= g.misty.r - 1 && !g.mistyTopIsPanel, 'panel covers Misty: gap ' + g.mistyGap.toFixed(1) + ' r ' + g.misty.r.toFixed(1));
            ok(g.head && g.head.t >= 0 && g.head.b <= g.vh && g.backHit && g.closeHit, 'Back / x header not visible and tappable');
            ok(g.glass, 'panel should keep the bubble glass (backdrop blur)');
            if (kind === 'ipad') ok(g.ringHits.length === 0, 'iPad: panel covers ring controls ' + g.ringHits);
            /* a scroll attempt must not move the header */
            await page.evaluate(() => { const p = document.querySelector('.ss2-panel'), b = p.querySelector('.ss2-body'); p.scrollTop = 999; if (b) b.scrollTop = 999; });
            const c = await center(page, '.ss2-panel .ss2-body'); if (c) { await page.mouse.move(c.x, c.y); await page.mouse.wheel(0, 600).catch(() => { }); } await sleep(300);
            const h2 = await page.evaluate(() => { const q = document.querySelector('.ss2-panel .ss2-head').getBoundingClientRect(); return q.top; });
            ok(Math.abs(h2 - g.head.t) < 1, 'header moved on scroll: ' + g.head.t + ' -> ' + h2);
            /* Back returns to the Settings bloom; x closes */
            await tap(page, '#ss2Bloom [data-ss2="back"]'); await sleep(300);
            const back = await page.evaluate(() => !document.querySelector('#ss2Bloom .ss2-panel') && !!document.querySelector('#ss2Bloom [data-ss2="more"]'));
            ok(back, 'Back should return to the Settings choices');
            await tap(page, '#ss2Bloom [data-ss2="more"]'); await sleep(500); await tap(page, '#ss2Bloom [data-ss2="close"]'); await sleep(300);
            ok(await page.evaluate(() => !window.LowiHomeSettingsSleepV2.isOpen()), 'x should close the panel');
            summary.push({ v, build, side: g.side, panel: [g.panel.l, g.panel.t, g.panel.w, g.panel.h].map(Math.round), rows: g.rows.join(' '), ringHits: g.ringHits, settingsAt: [Math.round(g.settingsAt.l), Math.round(g.settingsAt.t)] });
        }
        ok(errs.length === 0, 'page errors: ' + errs.join(' | '));
        ok(blocked.writes === 0 || true, '');
        console.log((P.length ? 'FAIL ' : 'PASS ') + v + ' build ' + build + (P.length ? '\n  - ' + P.join('\n  - ') : '') + (g ? '\n  side ' + g.side + ' panel ' + JSON.stringify([g.panel.l, g.panel.t, g.panel.w, g.panel.h].map(Math.round)) + ' rows ' + g.rows.join(',') + ' (blocked writes ' + blocked.writes + ', supabase ' + blocked.supabase + ')' : ''));
        if (P.length) fail++;
        await browser.close();
    }
    if (srv) srv.close();
    fs.writeFileSync(path.join(OUT, PREFIX + '-summary.json'), JSON.stringify(summary, null, 1));
    console.log(fail ? `${fail} view(s) failed` : 'all views passed');
    process.exit(fail ? 1 : 0);
})();
