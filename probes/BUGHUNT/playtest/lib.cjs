'use strict';
/* LOWiSPIKE bug-hunt playtest library. Serves a repo folder (or uses --url), loads the app with the local fixture session,
   records page errors, console errors, unhandled rejections and rAF stalls per scenario step. Seeded (mulberry32) so runs replay. */
const http = require('http'), fs = require('fs'), path = require('path');
const pw = require(process.env.PLAYWRIGHT_PATH || '/tmp/pw/node_modules/playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function serve(ROOT) { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(res); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const IPAD_L = { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
const IPAD_P = Object.assign({}, IPAD_L, { viewport: { width: 820, height: 1180 }, screen: { width: 820, height: 1180 } });
const VIEWS = { chromium390: ['chromium', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }], iphone13: ['webkit', 'iPhone 13'], ipadL: ['webkit', IPAD_L], ipadP: ['webkit', IPAD_P] };
function fixtureInit(lang, claimPrompt) {
    return `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.invalid' } }));
  /* Oct 19 (OWNCOMP): the fixture account only has the standard Misty, so the app would ask it once to claim its own
     companion. Playtests skip that prompt unless open({claimPrompt:true}). */
  ${claimPrompt ? '' : "if (!localStorage.getItem('lowispike.claimprompt.v1')) localStorage.setItem('lowispike.claimprompt.v1', '{\"at\":1,\"from\":\"fixture\"}');"}
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
    let h0 = null;
    const [eng, dd] = VIEWS[opts.view];
    const browser = await pw[eng].launch(eng === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'].concat(opts.args || []) } : {});
    const dev = Object.assign({}, typeof dd === 'string' ? pw.devices[dd] : dd);
    const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block' }, opts.reducedMotion ? { reducedMotion: 'reduce' } : {}));
    const host = new URL(opts.url).host;
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    if (!opts.noFixture) await ctx.addInitScript(fixtureInit(opts.lang, opts.claimPrompt));
    if (opts.preInit) await ctx.addInitScript(opts.preInit);
    await ctx.addInitScript(MONITOR);
    if (opts.ctxHook) h0 = await opts.ctxHook(ctx);
    const page = await ctx.newPage(); const log = { pageerror: [], console: [] };
    page.on('pageerror', e => log.pageerror.push((e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 400)));
    page.on('console', m => { if (m.type() === 'error') log.console.push(m.text().slice(0, 300)); });
    page.on('crash', () => log.pageerror.push('PAGE CRASH'));
    await page.goto(opts.url + (opts.url.includes('?') ? '&' : '?') + 'tb=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }).catch(() => log.pageerror.push('goTab never defined'));
    await sleep(opts.settle || 5000);
    return { browser, ctx, page, dev, log, touch: !!dev.hasTouch, hook: h0 };
}
async function tap(h, x, y) { if (h.touch) await h.page.touchscreen.tap(x, y); else await h.page.mouse.click(x, y); }
async function center(h, sel) { return h.page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); if (!r.width) return null; return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel); }
async function snap(h) { return h.page.evaluate(() => { const B = window.__bh || {}; const o = { err: B.err.splice(0), rej: B.rej.splice(0), stalls: B.stalls.splice(0) }; return o; }); }
module.exports = { pw, serve, sleep, open, tap, center, snap, mulberry32, VIEWS };
