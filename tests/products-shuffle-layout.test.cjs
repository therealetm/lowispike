'use strict';
/* 26 Oct 2026 (Emmanuel's Products Shuffle screenshots): the old "Throw out" rows ran off both edges of a 390 px iPhone.
   WebKit check at 390x844, iPhone SE and iPad: nothing on the Products Shuffle screen or in the kept-out sheet sits
   outside the screen. Skips when Playwright is not installed (GitHub's checks); run locally before every release. */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http'), fs = require('fs'), path = require('path');
let pw = null; for (const m of ['playwright', '/tmp/pw/node_modules/playwright']) { try { pw = require(m); break; } catch (e) {} }
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const now = Date.now();
const R = (i, name, brand, facts, ingredients) => ({ barcode: String(4000000000000 + i), name, brand, facts, ingredients, verdict: 'spike', why: [['c_no']], rerated: true, ts: now - i * 3600e3 });
const ROWS = [
  R(1, 'S\u00fc\u00df & Salzig', '\u00dcltje', { c: 36, s: 29, p: 15, fat: 38 }, 'Erdn\u00fcsse, Zucker, Glukosesirup'),
  R(2, 'High Protein Porridge Chocolicious', 'SPORTYFEEL', { c: 47, s: 4, p: 30, fat: 7 }, 'Haferflocken, Milchprotein, S\u00fc\u00dfungsmittel Sucralose'),
  R(3, 'Eiwei\u00df Brot Ohne Zuckerzusatz Mit Extra Viel Ballaststoffen Und Sonnenblumenkernen', 'Lieken Urkorn Golden Toast', { c: 44, s: 4, p: 10, fat: 4 }, 'Weizenmehl, Wasser'),
  R(4, 'Frische Hamburger vom Rind', 'Bio', { c: 0, s: 0, p: 19, fat: 15 }, 'Rindfleisch, Speisesalz, Pfeffer'),
  Object.assign(R(5, 'Griechischer Joghurt Natur', 'Milbona', { c: 4, s: 4, p: 5, fat: 10 }, 'Milch, Rahm'), { verdict: 'ok', why: [], rerated: false }),
];
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }
async function check(browser, url, device, vp) {
  const d = pw.devices[device];
  const ctx = await browser.newContext(Object.assign({}, d, vp ? { viewport: vp } : {}, { serviceWorkers: 'block' }));
  const host = new URL(url).host;
  await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
  await ctx.addInitScript(rows => { try {
    const t = new Date(); localStorage.setItem('lowi.daily.seen', t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'));
    sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
    localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.com' } }));
    if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
    const mine = {}; rows.forEach(p => { mine['b' + p.barcode] = p; }); localStorage.setItem('lowi.dex.v1', JSON.stringify({ mine, comm: [], commTs: Date.now() }));
    localStorage.setItem('lowi.cook.src', 'products'); localStorage.setItem('lowi.cook.view', 'shuffle'); localStorage.setItem('lowispike.lang', 'en');
  } catch (e) { } }, ROWS);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiScanSort, null, { timeout: 90000 });
  await sleep(3000);
  await page.evaluate(() => { document.querySelectorAll('.r2-ov,.g2-ov,.tut-ov,[role=dialog]').forEach(n => { try { n.remove(); } catch (e) { } }); goTab('shelf'); });
  await sleep(2500);
  const out = (sel) => page.evaluate(sel => { const W = innerWidth, bad = []; document.querySelectorAll(sel).forEach(n => { const r = n.getBoundingClientRect(); if (!r.width || !r.height || getComputedStyle(n).visibility === 'hidden') return; if (r.left < -0.5 || r.right > W + 0.5) bad.push(String(n.className || n.tagName).slice(0, 40) + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); }); return bad; }, sel);
  const home = await page.evaluate(() => ({ row: (document.querySelector('#ckOut') || {}).textContent || '', list: !!document.querySelector('#ckToss, #tab-shelf .ck-out-l') }));
  const badHome = await out('#r5Shuf, #r5Shuf *');
  await page.evaluate(() => document.querySelector('#ckOut').click());
  await sleep(1200);
  const sheet = await page.evaluate(() => [...document.querySelectorAll('.ck-out-sh .ck-out-i b')].map(b => b.textContent));
  const badSheet = await out('.ck-out-sh, .ck-out-sh *');
  await ctx.close();
  return { home, badHome, sheet, badSheet, errs };
}
test('Products Shuffle: one calm row, nothing off either edge at 390x844, on iPhone SE and on iPad (WebKit)', { skip: !pw && 'Playwright is not installed', timeout: 600000 }, async () => {
  const srv = await serve(), url = 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await pw.webkit.launch();
  try {
    for (const [dev, vp] of [['iPhone 13', { width: 390, height: 844 }], ['iPhone SE', null], ['iPad (gen 7)', null]]) {
      const r = await check(browser, url, dev, vp);
      assert.equal(r.home.row, '3 scans kept out of Shuffle', dev);
      assert.equal(r.home.list, false, dev + ': no list on the Shuffle screen');
      assert.deepEqual(r.badHome, [], dev + ': Shuffle screen clipped');
      assert.equal(r.sheet.length, 3, dev);
      assert.ok(!r.sheet.includes('Frische Hamburger vom Rind'), dev + ': plain beef patties are not kept out');
      assert.deepEqual(r.badSheet, [], dev + ': sheet clipped');
      assert.deepEqual(r.errs, [], dev);
    }
  } finally { await browser.close(); srv.close(); }
});
