/* Browser check (28 Oct 2026, Emmanuel: "When I open Rangliste ... I would like it to open at week because it always opens at Gesamt"):
   the real app on a local server, every outside request aborted, service worker blocked, people stubbed. An old build's saved
   Gesamt is planted; the Ranking must open on Woche, switch to Gesamt/Monat, and open on Woche again after another tab, after Home,
   and after a reload. Misty's rank pill (setPeriod) still opens its board. Usage: [ENGINE=webkit] node tests/ranking-opens-week-live.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
srv.listen(0, async () => {
  const port = srv.address().port; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const eng = process.env.ENGINE === 'webkit' ? pw.webkit : pw.chromium;
  const browser = await eng.launch(process.env.ENGINE === 'webkit' ? {} : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const dev = process.env.ENGINE === 'webkit' ? pw.devices['iPhone 13'] : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const ctx = await browser.newContext(Object.assign({}, dev, { serviceWorkers: 'block', locale: 'de-DE' }));
  await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => r.abort());
  await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('rkw.planted')) { localStorage.setItem('lowispike.ranking.period', 'all'); localStorage.setItem('lowispike.lang', 'de'); sessionStorage.setItem('rkw.planted', '1'); } } catch (e) {} });
  await ctx.addInitScript(() => { try { localStorage.setItem('lowi.gate', 'done');
      const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
      sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999');
      localStorage.setItem('lowi.auth', JSON.stringify({ access_token: 'local.fixture.token', refresh_token: 'local-fixture', token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400 * 30, user: { id: '00000000-0000-4000-8000-00000000c0c0', aud: 'authenticated', role: 'authenticated', email: 'fixture@example.invalid', is_anonymous: false } })); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
      const d = 864e5, L = [], day0 = new Date(); day0.setHours(9, 0, 0, 0);
      for (let i = 0; i < 3; i++) { const t = day0.getTime() - i * d; ['meal', 'move', 'water'].forEach((s, j) => L.push({ ts: t + j * 6e4, src: s, amt: 10 })); }
      localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 2311, ledger: L, user: { name: 'eman', bday: '1990-01-01' } })); } catch (e) {} });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  const boot = async () => { await page.waitForTimeout(7000);
    const stub = await page.evaluate(() => {
      if (!window.LowiR3 || !window.LowiCareBoard || !window.LowiRanking) return 'missing ' + [!window.LowiR3 && 'R3', !window.LowiCareBoard && 'CB', !window.LowiRanking && 'Ranking'].filter(Boolean).join(',');
      const wk = LowiCareBoard.tag(LowiCareBoard.periodKey('w', Date.now()), 1), mo = LowiCareBoard.tag(LowiCareBoard.periodKey('m', Date.now()), 1);
      const P = [['Joseph Castellar', 30], ['Manuuii', 26], ['Emmy', 18], ['Samira', 12], ['Jonas', 9], ['Mateo', 5]].map(([n, p], i) => ({ n, uid: 'u' + i, xpw: p, wk, xpm: p * 2, mo, xp: 400 * (6 - i) }));
      const orig = LowiR3.everyone.bind(LowiR3); LowiR3.everyone = () => P.concat((orig() || []).filter(p => p && p.me));
      return 'ok';
    });
    ok(stub === 'ok', 'scripts loaded and people stubbed (' + stub + ')'); };
  const sel = () => page.evaluate(() => { const b = document.querySelector('#cmPaneChat .rm-rank:not([hidden]) .rk > .rk-top .rk-segb[aria-selected="true"]'); return b ? b.dataset.k + ' "' + b.textContent + '"' : 'none'; });
  const click = s => page.evaluate(s => { const t = document.querySelector(s); if (t) t.click(); return !!t; }, s);
  await page.goto('http://localhost:' + port + '/index.html', { waitUntil: 'load', timeout: 90000 }); await boot();
  await page.evaluate(() => LowiRanking.open()); await page.waitForTimeout(1500);
  let s = await sel(); ok(s.startsWith('w '), '1 opens on the week although an old build saved Gesamt: ' + s);
  ok(await page.evaluate(() => localStorage.getItem('lowispike.ranking.period') === null), '1 old saved choice cleared');
  await click('#cmPaneChat .rk-segb[data-k="all"]'); await page.waitForTimeout(800); s = await sel(); ok(s.startsWith('all '), '2 Gesamt still switches: ' + s);
  await click('#cmPaneChat .rk-segb[data-k="m"]'); await page.waitForTimeout(800); s = await sel(); ok(s.startsWith('m '), '2 Monat still switches: ' + s);
  await click('#cmPaneChat .rk-segb[data-k="all"]'); await page.waitForTimeout(800);
  await click('#cmPaneChat .rm-tab[data-rm="chat"]'); await page.waitForTimeout(800); await click('#cmPaneChat .rm-tab[data-rm="rank"]'); await page.waitForTimeout(1200);
  s = await sel(); ok(s.startsWith('w '), '3 Ranking tab again after Gesamt + Chat tab: ' + s);
  await click('#cmPaneChat .rk-segb[data-k="all"]'); await page.waitForTimeout(800);
  await page.evaluate(() => goTab('home')); await page.waitForTimeout(1500); await page.evaluate(() => goTab('foryou')); await page.waitForTimeout(2000);
  const v = await page.evaluate(() => window.LowiRoomsUI && LowiRoomsUI.view()); if (v !== 'rank') { await click('#cmPaneChat .rm-tab[data-rm="rank"]'); await page.waitForTimeout(1200); }
  s = await sel(); ok(s.startsWith('w '), '4 back to Community after Gesamt + Home (view was ' + v + '): ' + s);
  await page.evaluate(() => goTab('home')); await page.waitForTimeout(1000);
  await page.evaluate(() => { LowiRanking.setPeriod('all'); LowiRanking.open(); }); await page.waitForTimeout(1500);
  s = await sel(); ok(s.startsWith('all '), "5 Misty's pill path (setPeriod all + open) still opens Gesamt: " + s);
  await click('#cmPaneChat .rk-segb[data-k="all"]'); await page.waitForTimeout(500);
  await page.reload({ waitUntil: 'load' }); await boot(); await page.evaluate(() => LowiRanking.open()); await page.waitForTimeout(1500);
  s = await sel(); ok(s.startsWith('w '), '6 after a reload: ' + s);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  ok(!errs.length, 'no page errors ' + errs.join(' | '));
  await browser.close(); srv.close(); console.log(fail ? fail + ' FAILED' : 'ALL OK'); process.exit(fail ? 1 : 0);
});
