'use strict';
/* WebKit iPhone 13 repro for tests/spirit-paint-missing-today.test.cjs (26 Oct 2026, "null is not an object (evaluating
   'nb.dataset')"): remove world-home.js's Today sheet, switch tabs, resize, and Home must keep painting with no error.
   Not in the *.test.cjs suite because GitHub's checks have no Playwright (a skipped test there lowers the pass count).
   node --test tests/spirit-paint-missing-today-live.cjs            (serves this checkout)
   LIVE_URL=https://therealetm.github.io/lowispike/ node --test tests/spirit-paint-missing-today-live.cjs   (the live site)
   ISOLATED: only GET requests to the app's own host pass; Supabase and every other host are aborted; local fixture sign-in. */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pw = null; for (const m of ['playwright', '/tmp/pw/node_modules/playwright']) { try { pw = require(m); break; } catch (e) {} }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.webmanifest': 'application/json' };
function serve() { return new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; } fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); }); }

test('WebKit iPhone 13: Home keeps painting with no error after the Today sheet is removed, and the sheet comes back', { skip: !pw && 'Playwright is not installed', timeout: 300000 }, async () => {
  const srv = process.env.LIVE_URL ? null : await serve(), url = process.env.LIVE_URL || 'http://127.0.0.1:' + srv.address().port + '/';
  const browser = await pw.webkit.launch();
  try {
    const ctx = await browser.newContext(Object.assign({}, pw.devices['iPhone 13'], { serviceWorkers: 'block' }));
    const host = new URL(url).host;
    await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (u.protocol === 'data:' || u.protocol === 'blob:' || (u.host === host && q.method() === 'GET')) return r.continue(); return r.abort(); });
    await ctx.addInitScript(() => { try {
      const t = new Date(); localStorage.setItem('lowi.daily.seen', t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'));
      sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
      localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-000000000001', email: 'fixture@example.com' } }));
      if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name: 'Fixture', bday: '1990-01-01' }, xp: 900, ledger: [], logs: [], saved: [] }));
      localStorage.setItem('lowispike.lang', 'en');
    } catch (e) { } });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(url, { waitUntil: 'load', timeout: 120000 });
    await page.waitForFunction(() => typeof window.goTab === 'function' && document.querySelector('#whToday .sp-next'), null, { timeout: 90000 });
    await sleep(2000);
    await page.evaluate(() => document.getElementById('whToday').remove());
    await page.evaluate(() => goTab('shelf')); await sleep(1500);
    await page.evaluate(() => goTab('home')); await sleep(2000);
    await page.setViewportSize({ width: 391, height: 844 }); await sleep(1500);
    const r = await page.evaluate(() => ({ next: !!document.querySelector('#spHome .sp-next'), status: (document.querySelector('#spHome .sp-status b') || {}).textContent || '', rows: document.querySelectorAll('#spHome .sp-log-rows .sp-log-row').length }));
    await ctx.close();
    assert.deepEqual(errs.filter(m => /dataset|null is not an object|innerHTML/.test(m)), [], 'Home paint threw');
    assert.equal(r.next, true, 'the next-step button is back on Home');
    assert.ok(r.status.length > 0, 'the status line is painted again');
    assert.equal(r.rows, 4, 'the four Today log rows are painted again');
  } finally { await browser.close(); if (srv) srv.close(); }
});
