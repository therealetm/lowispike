'use strict';
/* Browser check (bug hunt, Oct 19, 2026): fly into a world and sample every 250 ms; the guide's speech bubble must never overlap the
   joystick (#whPad). Before the fix it covered it for 2 to 3.5 s in the liver at 390x844.
   node tests/guide-bubble-joystick-live.cjs [--view chromium390|iphone13|ipadL|ipadP] [--world liver] [--ms 40000] [--url LIVE] */
/* LOWiSPIKE bug-hunt playtest library. Serves a repo folder (or uses --url), loads the app with the local fixture session,
   records page errors, console errors, unhandled rejections and rAF stalls per scenario step. Seeded (mulberry32) so runs replay. */
const http = require('http'), fs = require('fs'), path = require('path');
let pw; try { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); } catch (e) { pw = require('/tmp/pw/node_modules/playwright'); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve(ROOT) { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD_L = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const IPAD_P = Object.assign({}, IPAD_L, { viewport: { width: 820, height: 1180 }, screen: { width: 820, height: 1180 } });
const VIEWS = { chromium390: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13: ['webkit', 'iPhone 13'], ipadL: ['webkit', IPAD_L], ipadP: ['webkit', IPAD_P] };
function fixtureInit(lang) {
    return `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid' } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], settings: { lang: '${lang || 'en'}' } }));
} catch (e) { }`;
}
/* in-page monitor: errors, rejections, rAF stalls */
const MONITOR = `(() => { if (window.__bh) return; const B = window.__bh = { err: [], rej: [], stalls: [], frames: 0, last: 0 };
  addEventListener('error', e => B.err.push(String(e.message || e.error || e).slice(0, 200) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  addEventListener('unhandledrejection', e => B.rej.push(String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300)));
  const f = t => { if (B.last && t - B.last > 700 && document.visibilityState === 'visible') B.stalls.push(Math.round(t - B.last)); B.last = t; B.frames++; requestAnimationFrame(f); }; requestAnimationFrame(f); })();`;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
async function open(opts) {
    const [eng, dd] = VIEWS[opts.view];
    const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
    const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
    const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }, opts.reducedMotion ? { reducedMotion: 'reduce' } : {}));
    const host = new URL(opts.url).host;
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    if (!opts.noFixture) await ctx.addInitScript(fixtureInit(opts.lang));
    if (opts.preInit) await ctx.addInitScript(opts.preInit);
    await ctx.addInitScript(MONITOR);
    const page = await ctx.newPage(); const log = { pageerror: [], console: [] };
    page.on('pageerror', e => log.pageerror.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 400)));
    page.on('console', m => { if (m.type() === 'error') log.console.push(m.text().slice(0, 300)); });
    page.on('crash', () => log.pageerror.push('PAGE CRASH'));
    await page.goto(opts.url + (opts.url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }).catch(() => log.pageerror.push('goTab never defined'));
    await sleep(opts.settle || 5000);
    return { browser, ctx, page, dev, log, touch: !!dev.hasTouch };
}
async function tap(h, x, y) { if (h.touch) await h.page.touchscreen.tap(x, y); else await h.page.mouse.click(x, y); }
async function center(h, sel) { return h.page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); if (!r.width) return null; return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel); }
async function snap(h) { return h.page.evaluate(() => { const B = window.__bh || {}; const o = { err: B.err.splice(0), rej: B.rej.splice(0), stalls: B.stalls.splice(0) }; return o; }); }
const L = { pw, serve, sleep, open, tap, center, snap, mulberry32, VIEWS };

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', path.join(__dirname, '..'))));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const h = await L.open({ url, view: arg('view', 'chromium390'), settle: 5000 }); const P = h.page;
  const S = () => P.evaluate(() => {
    const R = e => { if (!e) return null; const q = e.getBoundingClientRect(); const c = getComputedStyle(e); return q.width > 2 ? [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom), +(+c.opacity).toFixed(2), c.visibility[0]] : null; };
    const ov = (a, b) => a && b ? Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])) : 0;
    const says = Array.from(document.querySelectorAll('.rp-talk .rp-say')).map(R).filter(Boolean);
    const joys = Array.from(document.querySelectorAll('#whPad, [data-orbit="joy"], .wh-pad, #hb2Joy')).map(e => { let op = 1, n = e; while (n && n.nodeType === 1) { op *= +getComputedStyle(n).opacity; n = n.parentElement; } return { k: e.id || e.getAttribute('data-orbit') || e.className.slice(0, 20), r: R(e), cv: e.checkVisibility ? e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : null, op: +op.toFixed(2), clean: document.documentElement.classList.contains('lw-clean') }; }).filter(x => x.r);
    const m = window.LowiMistyFlight && LowiMistyFlight.screen ? LowiMistyFlight.screen() : null;
    let hit = 0; for (const s of says) for (const j of joys) hit = Math.max(hit, ov(s, j.r));
    let diag = null;
    if (hit > 0 && window.LowiRegionPalsCore) { const C = LowiRegionPalsCore; const orb = document.querySelector('.rp-talk .rp-orb'); const say = document.querySelector('.rp-talk .rp-say');
      if (orb && say) { const o = orb.getBoundingClientRect(); const pal = { x: o.left + o.width / 2, y: o.top + o.height / 2 }; const b = { w: say.offsetWidth, h: say.offsetHeight };
        const AV = '#f3Board, #hcLine.on, #hqSlot.arr-on, #tab-home .sp-top, #whHud button, #whHud .wh-water, #spFast, #whPad, #tabbar, .wh-hint.wh-say, #lpPraise.on, .bw3-full button, [data-guide-avoid]';
        const obs = []; document.querySelectorAll(AV).forEach(e => { if (say.contains(e)) return; const q = e.getBoundingClientRect(); if (q.width < 4 || q.height < 4 || q.bottom < 0 || q.top > innerHeight) return; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity <= 0.05) return; obs.push({ l: q.left - 6, t: q.top - 6, r: q.right + 6, b: q.bottom + 6, w: C.QUEST_IDS.indexOf(e.id) >= 0 ? C.QUEST_W : 2, k: e.id || e.className.slice(0, 14) }); });
        if (m) obs.push({ l: m.x - 46, t: m.y - 46, r: m.x + 46, b: m.y + 46, w: 4, k: 'misty' });
        const view = { w: innerWidth, h: innerHeight, top: 6, bottom: 6 }; const gap = C.gapFor(o.width / 2);
        diag = { pal: [Math.round(pal.x), Math.round(pal.y)], b, obs: obs.map(x => x.k + ':' + [x.l, x.t, x.r, x.b].map(Math.round).join(',')), spots: C.SPOTS.map(sp => { const q = C.spotRect(sp, pal, b, view, gap); const per = obs.map(x => x.k + '=' + Math.round(C.overlap(q, x) * (x.w || 1))).filter(t => !/=0$/.test(t)); const out = Math.max(0, 6 - q.t) + Math.max(0, q.b - view.h + 6); return sp + ' ' + per.join(' ') + (out ? ' out=' + Math.round(out) : ''); }) }; } }
    return { diag, cur: (() => { try { return LowiWorldRegions.current(); } catch (e) { return null; } })(), says, joys, m: m && [Math.round(m.x), Math.round(m.y)], hit, html: document.documentElement.className.split(' ').filter(c => /lw-clean|rp-|wh-away|bwr/.test(c)).join(' ') };
  });
  await P.evaluate(() => { const C = window.LowiRegionPalsCore, o = C.place; window.__pl = []; C.place = function (pal, b, obs, view, prev, gap) { const r = o.apply(this, arguments); const pad = document.getElementById('whPad'); if (pad && r) { const q = pad.getBoundingClientRect(); const ov = C.overlap({ l: r.l, t: r.t, r: r.l + b.w, b: r.t + b.h }, { l: q.left, t: q.top, r: q.right, b: q.bottom }); if (ov > 0 && window.__pl.length < 6) window.__pl.push({ ov, r: [r.l, r.t, r.spot, r.score].map(x => typeof x === 'number' ? Math.round(x) : x), prev, pal: [pal.x, pal.y].map(Math.round), b, obs: obs.map(x => (x.k || 'w' + x.w) + ':' + [x.l, x.t, x.r, x.b].map(Math.round).join(',')) }); } return r; }; });
  const target = arg('world', 'liver');
  await P.evaluate(t => LowiWorldRegions.travel(t), target);
  const t0 = Date.now(); let worst = 0, overlapMs = 0, last = null, firstTalk = null;
  while (Date.now() - t0 < +arg('ms', 40000)) {
    const s = await S(); const t = Date.now() - t0;
    if (s.says.length && firstTalk == null) firstTalk = t;
    if (s.hit > 0) { overlapMs += last == null ? 0 : t - last; worst = Math.max(worst, s.hit); console.log((t / 1000).toFixed(1), 'OVERLAP', s.hit, JSON.stringify(s)); if (!process.env.NOSHOT && worst === s.hit) await P.screenshot({ path: `/tmp/guide-joy-${arg('view', 'chromium390')}.png` }); }
    else if (s.says.length && arg('v', '')) console.log((t / 1000).toFixed(1), 'ok', JSON.stringify(s));
    last = s.hit > 0 ? t : null;
    await L.sleep(250);
  }
  console.log('PLACE', JSON.stringify(await P.evaluate(() => window.__pl), null, 0));
  const ok = firstTalk != null && worst === 0 && !h.log.pageerror.length;
  console.log('SUMMARY', JSON.stringify({ view: arg('view', 'chromium390'), firstTalk, worst, overlapMs, errs: h.log.pageerror }));
  console.log(ok ? 'PASS' : 'FAIL'); process.exitCode = ok ? 0 : 1;
  await h.browser.close(); if (srv) srv.close();
})();
