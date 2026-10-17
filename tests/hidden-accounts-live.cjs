/* Browser check for hidden-accounts.js (Oct 18, 2026): the real app on a local server, every Supabase / outside request
   aborted and the service worker blocked, so nothing reaches or writes to the live database. The cloud roster is stubbed
   with fixture rows that use the live account ids from Emmanuel's 01:16 galaxy screenshot. Checks the Community galaxy and
   the Care board at 390x844 show no test account and keep the real people and the three bots.
   Not part of the offline suite. Usage: ENG=webkit|chromium [SHOT=/tmp/hide] node tests/hidden-accounts-live.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..'), ENG = process.env.ENG || 'webkit';
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const HIDDEN = ['Emma', 'Gatey', 'Guesty', 'Test', 'QA'];
const KEPT = ['Joseph Castellar', 'Q', 'Manuuii', 'Emmy', 'Emmanuel', 'Mateo', 'Jonas', 'Samir'];
srv.listen(0, async () => {
  const port = srv.address().port; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const browser = await pw[ENG].launch(ENG === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
  const dev = ENG === 'webkit' ? pw.devices['iPhone 13'] : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const ctx = await browser.newContext(Object.assign({}, dev, { viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }));
  let blocked = 0;
  await ctx.route(/supabase|googleapis|gstatic|openfoodfacts|salling|r2\.dev|workers\.dev/, r => { blocked++; r.abort(); });
  await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => { blocked++; r.abort(); });
  await ctx.addInitScript(() => { try { localStorage.setItem('lowi.gate', 'done'); if (!localStorage.getItem('lowispike.v2')) { const d = 864e5, L = []; const day0 = new Date(); day0.setHours(9, 0, 0, 0);
    for (let i = 0; i < 4; i++) { const t = day0.getTime() - i * d; ['meal', 'meal', 'move', 'water', 'scan'].forEach((s, j) => L.push({ ts: t + j * 6e4, src: s, amt: 10 })); }
    localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 2311, ledger: L, user: { name: 'eman', bday: '1990-01-01' } })); } } catch (e) {} });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await page.goto('http://localhost:' + port + '/index.html', { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(8000);
  const stub = await page.evaluate(() => {
    const now = new Date(), mk = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
    const w = window.LowiCareBoard ? LowiCareBoard.periodKey('w', Date.now()) : '', m = window.LowiCareBoard ? LowiCareBoard.periodKey('m', Date.now()) : mk;
    const c = (full, pts) => ({ wk: 'care1:' + w + ':' + full, xpw: pts, mo: 'care1:' + m + ':' + full, xpm: pts });
    const rows = [
      ['Samir'], ['Jonas'], ['Mateo'],
      ['Gatey', '0767e8ef-17e3-43d7-8c5d-9c9207822b48', 1, 0, 6], ['Guesty', '0161e683-5580-4a2b-aac7-2d56662db48a', 1, 0, 6],
      ['Emma', '0653ab46-7894-4b07-8601-86db5d2d2cc6', 1, 0, 9], ['Emma', 'f78c98d9-f19c-42fb-bcfd-276f9020bf74', 1, 0, 8],
      ['Test', 'e3cce12d-b025-4385-89f7-704595a8c06c', 1, 0, 5], ['QA', 'bb1788fa-a11e-4ee9-ac28-4beef63248ae', 1, 0, 4],
      ['eman', 'ca2b5daf-5d17-4866-b7ca-33bbad10d5b2', 4, 6, 72], ['eman', '01aa50e7-9078-4fda-97db-0accac597947', 4, 6, 72],
      ['Q', 'f4f8fbf8-3a18-4317-96d3-9dd778066136', 1, 0, 5], ['Joseph Castellar', '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad', 3, 2, 30],
      ['Manuuii', '4add63ec-61d6-4187-9c62-bd78c427be24', 1, 0, 7], ['Emmy', 'd813675e-16b6-40e3-bedb-d6fe8b01af91', 1, 0, 3],
      ['Emmanuel', 'e81217a0-6658-4c00-bce2-bfe56de897a5', 1, 0, 2]
    ].filter(r => r[1]).map(([n, uid, lv, full, pts]) => Object.assign({ n, uid, lv, xp: pts, s: '', t: '', avatar: '', bio: '' }, c(full, pts)));
    if (!window.LOWI_CLOUD) return 'no LOWI_CLOUD';
    LOWI_CLOUD.live = () => true; LOWI_CLOUD.people = () => rows.slice();
    return 'stubbed ' + rows.length;
  });
  ok(/stubbed/.test(stub), ENG + ' cloud roster ' + stub + ' (Supabase blocked)');
  /* Community galaxy */
  await page.evaluate(() => { try { goTab('foryou'); } catch (e) {} try { cmSeg('chat'); } catch (e) {} try { LowiCommunity.refresh(); } catch (e) {} });
  await page.waitForTimeout(2500);
  const names = await page.evaluate(() => [...document.querySelectorAll('#cgField .cg-name')].map(e => e.textContent.trim()));
  console.log('     galaxy names: ' + names.join(', '));
  ok(names.length > 0, ENG + ' 390x844 galaxy rendered ' + names.length + ' bodies');
  for (const n of HIDDEN) ok(!names.includes(n), ENG + ' galaxy has no ' + n);
  for (const n of KEPT) ok(names.filter(x => x === n).length === 1, ENG + ' galaxy shows ' + n + ' once');
  ok(names.filter(x => x.toLowerCase() === 'eman').length === 0, ENG + ' galaxy shows no other "eman" (you are "You")');
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + ENG + '-galaxy.png' });
  /* Care board, both periods */
  for (const k of ['w', 'm']) {
    await page.evaluate(() => { try { LowiR3.board(); } catch (e) {} }); await page.waitForTimeout(1200);
    await page.evaluate(k => { const b = document.querySelector('[data-r3lb=' + k + ']'); if (b) b.click(); }, k); await page.waitForTimeout(1200);
    const rows = await page.evaluate(() => { const ls = document.querySelectorAll('.r3-lbl'); const l = ls[ls.length - 1]; return l ? [...l.querySelectorAll('.r3-lbrow')].map(r => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)) : []; });
    console.log('     care board ' + k + ': ' + rows.join(' | '));
    ok(rows.length > 0, ENG + ' care board ' + k + ' has rows');
    for (const n of HIDDEN) ok(!rows.some(r => new RegExp('\\b' + n + '\\b').test(r)), ENG + ' care board ' + k + ' has no ' + n);
    ok(rows.some(r => /Joseph Castellar/.test(r)), ENG + ' care board ' + k + ' keeps Joseph Castellar');
    ok(rows.filter(r => /\beman\b/i.test(r)).length <= 1, ENG + ' care board ' + k + ' shows eman at most once (you)');
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + ENG + '-board-' + k + '.png' });
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  }
  ok(errs.length === 0, ENG + ' no page errors' + (errs.length ? ': ' + errs.join(' / ') : ''));
  console.log('     outside requests blocked: ' + blocked);
  await browser.close(); srv.close();
  console.log(fail ? 'FAILED ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
});
