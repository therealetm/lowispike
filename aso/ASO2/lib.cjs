'use strict';
/* Food audit harness (20 Oct 2026). Serves a worktree on 127.0.0.1, opens it in a simulated phone, blocks every other host
   (Supabase, Open Food Facts, AI) so nothing real is read or written. Local fixture account only. */
const http = require('http'), fs = require('fs'), path = require('path');
const pw = require('/tmp/pw/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.webmanifest': 'application/json', '.mp3': 'audio/mpeg', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };
function serve(ROOT) { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
const INIT = (lang) => `try {
  const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowi.tutorial.v1', JSON.stringify({done:true}));
  localStorage.setItem('lowispike.claimprompt.v1', '{"at":1,"from":"fixture"}');
  localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000f00d', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
  ${lang ? `localStorage.setItem('lowispike.lang','${lang}');localStorage.setItem('lowi.lang','${lang}');` : ''}
} catch (e) { }`;

async function open(opts) {
  opts = opts || {};
  const ROOT = opts.root || '/home/sprite/wt-food-audit';
  const srv = await serve(ROOT); const url = 'http://127.0.0.1:' + srv.address().port + '/'; const host = new URL(url).host;
  const eng = opts.engine || 'webkit';
  const launch = eng === 'chromium' ? { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] } : {};
  const browser = await pw[eng].launch(launch);
  const dev = Object.assign({}, pw.devices[opts.device || 'iPhone 13']);
  if (eng === 'chromium') { delete dev.defaultBrowserType; }
  const ctx = await browser.newContext(Object.assign(dev, { serviceWorkers: 'block', timezoneId: opts.tz || 'Europe/Berlin', locale: opts.locale || 'en-US' }, eng === 'chromium' ? { permissions: ['camera'] } : {}));
  const blocked = {};
  await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); const k = u.host + ' ' + q.method() + ' ' + u.pathname.slice(0, 40); blocked[k] = (blocked[k] || 0) + 1; if (opts.route) { const h = opts.route(q, u); if (h) return r.fulfill(h); } return r.abort(); });
  await ctx.addInitScript(INIT(opts.lang));
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  if (opts.clock) await page.clock.install({ time: new Date(opts.clock) });
  const errs = []; page.on('pageerror', e => errs.push(String(e && e.message || e).slice(0, 240)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(url + '?x=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => !!(window.LowiHomeBloomsV2 && window.LowiSpirit && window.LowiDex && document.querySelector('[data-orbit="fuel"]')), null, { timeout: 120000 });
  await sleep(3000);
  const H = {
    page, ctx, browser, errs, blocked, url,
    async close() { await browser.close(); srv.close(); },
    shot: n => page.screenshot({ path: path.join(opts.out || '/home/sprite/FOODAUDIT/shots', (opts.tag || 'x') + '-' + n + '.png') }).catch(() => { }),
    /* visible, tappable controls with their text (what a person can see and press) */
    dump: (max) => page.evaluate(m => {
      const vis = x => { const r = x.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return false; const cs = getComputedStyle(x); if (cs.visibility === 'hidden' || +cs.opacity === 0) return false; let e = x; while (e) { const c = getComputedStyle(e); if (c.display === 'none' || +c.opacity === 0) return false; e = e.parentElement; } return true; };
      const top = x => { const r = x.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!el && (el === x || x.contains(el) || el.contains(x)); };
      return [...document.querySelectorAll('button, a[href], input, textarea, select, [role=button], [data-b3], [data-sp]')].filter(vis).slice(0, m || 80).map(x => { const r = x.getBoundingClientRect(); return (top(x) ? '' : '(covered) ') + x.tagName.toLowerCase() + (x.id ? '#' + x.id : '') + (x.className && typeof x.className === 'string' ? '.' + x.className.split(' ').slice(0, 2).join('.') : '') + [...x.attributes].filter(a => a.name.startsWith('data-')).map(a => '[' + a.name + '=' + a.value.slice(0, 20) + ']').join('') + ' "' + ((x.innerText || x.value || x.placeholder || x.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60)) + '" @' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); });
    }, max),
    text: () => page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 3000)),
    vis: sel => page.evaluate(s => [...document.querySelectorAll(s)].some(x => { if (x.closest('.r2-ov.off')) return false; const r = x.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false; let e = x; while (e) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; e = e.parentElement; } return true; }), sel),
    state: () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('lowispike.v2')); } catch (e) { return null; } }),
    /* tap the visible control whose text matches */
    async tapText(re, sel) {
      const h = await page.evaluateHandle(([src, fl, s]) => { const R = new RegExp(src, fl); const vis = x => { const r = x.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) return false; let e = x; while (e) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity === 0) return false; e = e.parentElement; } return true; }; const all = [...document.querySelectorAll(s || 'button, a, [role=button], [data-b3], [data-sp], label')].filter(vis).filter(x => R.test((x.innerText || x.getAttribute('aria-label') || '').replace(/\s+/g, ' '))); return all[all.length - 1] || null; }, [re.source, re.flags, sel || '']);
      const el = h.asElement(); if (!el) return false; await el.tap({ timeout: 4000 }).catch(async () => { await el.click({ timeout: 4000, force: true }).catch(() => { }); }); return true;
    },
    sleep,
    /* a finger tap at the element's centre (the bubbles float, so Playwright's 'stable' wait can time out) */
    async tap(sel) { for (let i = 0; i < 30; i++) { const el = await page.$(sel); const r = el && await el.boundingBox().catch(() => null); if (r && r.width > 1) { await sleep(250); const r2 = await el.boundingBox().catch(() => null) || r; await page.touchscreen.tap(r2.x + r2.width / 2, r2.y + r2.height / 2); return true; } await sleep(300); } throw new Error('tap: not visible ' + sel); },
    async reload() { await page.reload({ waitUntil: 'load', timeout: 120000 }); await page.waitForFunction(() => !!(window.LowiHomeBloomsV2 && window.LowiSpirit && window.LowiDex && document.querySelector('[data-orbit="fuel"]')), null, { timeout: 120000 }); await sleep(3000); },
    sheets: () => page.evaluate(() => [...document.querySelectorAll('.r2-ov')].filter(o => !o.classList.contains('off')).map(o => (o.querySelector('h2,h3') || {}).innerText || o.className).slice(0, 8)),
  };
  return H;
}
module.exports = { open, sleep };
