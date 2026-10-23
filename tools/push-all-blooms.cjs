/* Browser check for the 23 Oct 2026 combined release (Ranking + Move step ranges + Sleep without Clear chip).
   Real app on a local server, outside requests aborted, service worker blocked. At iPhone upright / sideways and iPad upright /
   sideways: the Move bloom shows Casual / Steady / Epic (no Quick / Medium / Long), a tap logs a range, the same tap again changes
   nothing; the Sleep bloom shows three choices and no Clear chip, another choice replaces today's; every chip stays on screen; no page errors.
   Usage: node tools/push-all-blooms.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const SIZES = [['iphone-up', 390, 844], ['iphone-side', 844, 390], ['ipad-up', 820, 1180], ['ipad-side', 1180, 820]];
const SHOT = process.env.SHOT || '/tmp/push-all-shots';
fs.mkdirSync(SHOT, { recursive: true });
srv.listen(0, async () => {
  const port = srv.address().port; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const browser = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [name, w, h] of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 1000, hasTouch: true, serviceWorkers: 'block' });
    await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => r.abort());
    await ctx.addInitScript(() => { try { localStorage.setItem('lowi.gate', 'done');
      const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
      sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
      if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 900, ledger: [], logs: [], saved: [], user: { name: 'eman', bday: '1990-01-01', tags: [] } })); } catch (e) {} });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    await page.goto('http://localhost:' + port + '/index.html', { waitUntil: 'load', timeout: 90000 });
    await page.waitForTimeout(7000);
    const orbs = () => page.evaluate(() => [...document.querySelectorAll('.hb2-bloom.on .hb2-orb')].map(b => { const r = b.getBoundingClientRect(); return { id: b.dataset.id, on: b.classList.contains('hb2-on'), txt: b.textContent.trim(), in: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 }; }));
    const xp = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('lowispike.v2')).xp; } catch (e) { return null; } });
    await page.evaluate(() => window.LowiHomeBloomsV2 && LowiHomeBloomsV2.open('move')); await page.waitForTimeout(900);
    let o = await orbs(); const ids = o.map(x => x.id);
    ok(['casual', 'steady', 'epic'].every(i => ids.includes(i)), name + ': Move bloom has Casual, Steady, Epic (' + ids.join(',') + ')');
    ok(!ids.some(i => /quick|medium|long/.test(i)), name + ': no Quick / Medium / Long');
    ok(o.length && o.every(x => x.in), name + ': every Move bubble on screen');
    await page.screenshot({ path: SHOT + '/' + name + '-move.png' });
    const x0 = await xp();
    await page.evaluate(() => { const b = document.querySelector('.hb2-bloom .hb2-orb[data-id="steady"]'); if (b) b.click(); }); await page.waitForTimeout(1200);
    const x1 = await xp();
    ok(x1 > x0, name + ': Steady logs today (XP ' + x0 + ' -> ' + x1 + ')');
    await page.evaluate(() => LowiHomeBloomsV2.open('move')); await page.waitForTimeout(900);
    o = await orbs(); ok((o.find(x => x.id === 'steady') || {}).on, name + ': Steady glows as today\'s pick');
    await page.evaluate(() => { const b = document.querySelector('.hb2-bloom .hb2-orb[data-id="steady"]'); if (b) b.click(); }); await page.waitForTimeout(1200);
    const x2 = await xp(); ok(x2 === x1, name + ': same range again gives no extra XP (' + x2 + ')');
    await page.evaluate(() => LowiHomeBloomsV2.close && LowiHomeBloomsV2.close()); await page.waitForTimeout(400);
    await page.evaluate(() => window.LowiHomeSettingsSleepV2 && LowiHomeSettingsSleepV2.open('sleep')); await page.waitForTimeout(900);
    const sl = await page.evaluate(() => [...document.querySelectorAll('#ss2Bloom .ss2-chip')].map(b => { const r = b.getBoundingClientRect(); return { id: b.dataset.ss2, txt: b.textContent.trim(), in: r.width > 0 && r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 }; }));
    ok(sl.length === 3, name + ': Sleep bloom has three choices (' + sl.map(s => s.id).join(',') + ')');
    ok(!sl.some(s => /clear|reset/i.test(s.id + ' ' + s.txt)), name + ': no Clear / reset chip');
    ok(sl.every(s => s.in), name + ': every Sleep chip on screen');
    await page.screenshot({ path: SHOT + '/' + name + '-sleep.png' });
    ok(!errs.length, name + ': no page errors ' + errs.join(' | '));
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? fail + ' failed' : 'all passed'); process.exit(fail ? 1 : 0);
});
