'use strict';
/* Browser check (bug hunt BH-004, Oct 19, 2026): a mid-session language switch must leave every ring bubble reading exactly as
   after a reload in that language. Live 20261019-110810 before the fix: FAIL, 20 mismatches. */
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

/* BH-004 probe: after a mid-session language switch, every ring bubble (visible text + aria-label) must read exactly as it
   does after a reload in that language. Digits are normalised (timers, counts). Two switch paths: LowiLang.set (API, what
   Settings uses) and a tap on a [data-lang] picker button (the capture-phase click handler).
   Usage: node tests/lang-switch-live.cjs [--root DIR | --url URL] [--view chromium390|iphone13|ipadP|ipadL] [--via api|click]
   Exit 1 on any mismatch. */
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', path.join(__dirname, '..'))));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const view = arg('view', 'chromium390'), via = arg('via', 'api');
  const read = P => P.evaluate(() => {
    const n = s => String(s || '').replace(/\s+/g, ' ').trim().replace(/\d+([.,:]\d+)*/g, '#');
    const o = {};
    document.querySelectorAll('[data-orbit]').forEach(e => { const k = e.getAttribute('data-orbit'); o[k] = { text: n(e.innerText), aria: n(e.getAttribute('aria-label')) }; });
    const m = document.getElementById('spBubble'); if (m) o.misty = { text: n(m.querySelector('.sp-bubble-name') && m.querySelector('.sp-bubble-name').innerText), aria: n(m.getAttribute('aria-label')) };
    return o;
  });
  const sw = async (P, l) => {
    if (via === 'click') await P.evaluate(l => { const b = document.createElement('button'); b.setAttribute('data-lang', l); b.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px'; document.body.appendChild(b); b.click(); b.remove(); }, l);
    else await P.evaluate(l => window.LowiLang.set(l), l);
  };
  let bad = 0; const errs = [];
  for (const l of ['de', 'es']) {
    const h = await L.open({ url, view, settle: 8000, lang: 'en' }); const P = h.page;
    await P.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('lowispike.v2')); s.settings = Object.assign({}, s.settings, { lang: 'en' }); localStorage.setItem('lowispike.v2', JSON.stringify(s)); localStorage.setItem('lowispike.lang', 'en'); } catch (e) { } });
    await sw(P, l);
    await L.sleep(4000);
    const mid = await read(P);
    await P.reload({ waitUntil: 'load' }); await P.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }); await L.sleep(9000);
    const ref = await read(P);
    const lg = await P.evaluate(() => document.documentElement.lang);
    if (lg.slice(0, 2) !== l) { console.log(`[${l}] reload is in ${lg}, cannot compare`); bad++; }
    for (const k of Object.keys(ref)) {
      const a = mid[k] || {}, b = ref[k];
      ['text', 'aria'].forEach(f => { if ((a[f] || '') !== (b[f] || '')) { bad++; console.log(`[${l}] ${k}.${f}: mid-session "${a[f]}"  vs reload "${b[f]}"`); } });
    }
    errs.push(...h.log.pageerror, ...(await L.snap(h)).err);
    await h.browser.close();
  }
  console.log(`${view} via=${via}: ${bad ? 'FAIL ' + bad + ' mismatches' : 'PASS'}; js errors: ${errs.length ? errs.join(' || ') : 'none'}`);
  if (srv) srv.close();
  process.exit(bad || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
